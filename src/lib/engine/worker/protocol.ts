import type { Device, Dtype, RunOptions, RunResult } from '../types';

export interface InitRequest {
	type: 'init';
	device: Device;
	dtype: Dtype;
}

export interface RunRequest {
	type: 'run';
	id: string;
	/** stable id of the source image, lets the worker reuse cached model output */
	sourceId: string;
	bitmap: ImageBitmap;
	options: Required<RunOptions>;
}

export interface DisposeRequest {
	type: 'dispose';
}

export type EngineRequest = InitRequest | RunRequest | DisposeRequest;

export type ProgressPhase = 'download' | 'compile' | 'warmup' | 'infer' | 'postprocess';

export type EngineEvent =
	| { type: 'progress'; phase: ProgressPhase; progress?: number; file?: string }
	| { type: 'ready'; device: Device; dtype: Dtype }
	| { type: 'result'; id: string; result: RunResult }
	| { type: 'error'; id?: string; message: string };
