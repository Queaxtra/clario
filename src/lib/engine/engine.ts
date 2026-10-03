import type { Device, Dtype, RunOptions, RunResult } from './types';
import type { EngineEvent, EngineRequest } from './worker/protocol';

type Listener = (event: EngineEvent) => void;

interface PendingRun {
	resolve: (result: RunResult) => void;
	reject: (error: Error) => void;
}

interface PendingInit {
	resolve: () => void;
	reject: (error: Error) => void;
}

/**
 * Main thread client for the inference worker.
 * Keeps the model resident in the worker across runs so only the first run pays init cost.
 */
export class BackgroundRemovalEngine {
	#worker: Worker | null = null;
	#listeners = new Set<Listener>();
	#pending = new Map<string, PendingRun>();
	#sequence = 0;
	#init: PendingInit | null = null;

	on(listener: Listener): () => void {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	init(device: Device, dtype: Dtype): Promise<void> {
		const worker = this.#ensureWorker();
		return new Promise<void>((resolve, reject) => {
			this.#init = { resolve, reject };
			worker.postMessage({ type: 'init', device, dtype } satisfies EngineRequest);
		});
	}

	run(bitmap: ImageBitmap, options: Required<RunOptions>, sourceId: string): Promise<RunResult> {
		const worker = this.#ensureWorker();
		const id = `run-${++this.#sequence}`;
		return new Promise<RunResult>((resolve, reject) => {
			this.#pending.set(id, { resolve, reject });
			worker.postMessage({ type: 'run', id, sourceId, bitmap, options } satisfies EngineRequest, [
				bitmap
			]);
		});
	}

	dispose(): void {
		if (this.#worker) {
			this.#worker.postMessage({ type: 'dispose' } satisfies EngineRequest);
			this.#worker.terminate();
			this.#worker = null;
		}
		this.#pending.clear();
		this.#init = null;
	}

	#ensureWorker(): Worker {
		if (this.#worker) return this.#worker;

		const worker = new Worker(new URL('./worker/inference.worker.ts', import.meta.url), {
			type: 'module'
		});
		worker.onmessage = (event: MessageEvent<EngineEvent>) => this.#handle(event.data);
		worker.onerror = (event) => this.#fail(new Error(event.message));

		this.#worker = worker;
		return worker;
	}

	#handle(event: EngineEvent): void {
		this.#emit(event);

		if (event.type === 'ready') {
			this.#init?.resolve();
			this.#init = null;
			return;
		}

		if (event.type === 'result') {
			this.#pending.get(event.id)?.resolve(event.result);
			this.#pending.delete(event.id);
			return;
		}

		if (event.type === 'error') {
			this.#reject(new Error(event.message), event.id);
		}
	}

	#fail(error: Error): void {
		this.#emit({ type: 'error', message: error.message });
		this.#reject(error);
	}

	#reject(error: Error, id?: string): void {
		if (id) {
			this.#pending.get(id)?.reject(error);
			this.#pending.delete(id);
		}
		this.#init?.reject(error);
		this.#init = null;
	}

	#emit(event: EngineEvent): void {
		for (const listener of this.#listeners) listener(event);
	}
}
