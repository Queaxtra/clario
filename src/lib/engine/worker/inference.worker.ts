/// <reference lib="webworker" />
import { RawImage } from '@huggingface/transformers';
import { detectCapabilities } from '../capabilities';
import { renderToBlob } from '../composite';
import { MODEL_INPUT_SIZE } from '../config';
import { disposeModel, loadModel, runModel, warmupModel, type ProgressEvent } from '../model';
import { adjustMask, featherMask, logitsToAlpha, refineMask } from '../postprocess';
import { buildTiledMask } from '../tiling';
import type { Device, Dtype, LogitsTensor, MaskMode } from '../types';
import type { EngineEvent, EngineRequest, RunRequest } from './protocol';

const scope = self as unknown as DedicatedWorkerGlobalScope;

/**
 * Keep the last model output so option changes on the same image only redraw.
 * Single entry on purpose, the worker handles one run at a time.
 */
let cacheSourceId: string | null = null;
let cacheTiled = false;
let cacheLogits: LogitsTensor | null = null;
let cacheMask: RawImage | null = null;
let cacheMaskMode: MaskMode | null = null;
let cacheTiles = 1;

function clearCache(): void {
	cacheSourceId = null;
	cacheTiled = false;
	cacheLogits = null;
	cacheMask = null;
	cacheMaskMode = null;
	cacheTiles = 1;
}

function emit(event: EngineEvent): void {
	scope.postMessage(event);
}

scope.onmessage = async (event: MessageEvent<EngineRequest>) => {
	const message = event.data;
	try {
		if (message.type === 'init') {
			await handleInit(message.device, message.dtype);
			return;
		}
		if (message.type === 'run') {
			await handleRun(message);
			return;
		}
		clearCache();
		await disposeModel();
	} catch (error) {
		emit({
			type: 'error',
			id: 'id' in message ? message.id : undefined,
			message: error instanceof Error ? error.message : String(error)
		});
	}
};

async function handleInit(device: Device, dtype: Dtype): Promise<void> {
	const capabilities = await detectCapabilities();

	clearCache();
	await disposeModel();
	await loadModel({
		device,
		dtype,
		capabilities,
		onProgress: (info: ProgressEvent) => {
			if (info.status === 'progress') {
				emit({ type: 'progress', phase: 'download', progress: info.progress, file: info.file });
				return;
			}
			if (info.status === 'done' && info.file) {
				emit({ type: 'progress', phase: 'download', progress: 100, file: info.file });
			}
		}
	});

	emit({ type: 'progress', phase: 'warmup' });
	await warmupModel();
	emit({ type: 'ready', device, dtype });
}

async function handleRun(message: RunRequest): Promise<void> {
	const { bitmap, options, id, sourceId } = message;
	const started = performance.now();

	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('unable to create 2d context');
	context.drawImage(bitmap, 0, 0);
	bitmap.close();

	const image = RawImage.fromCanvas(canvas);
	const { mask, cached, tiles } = await resolveMask(image, sourceId, options);

	emit({ type: 'progress', phase: 'postprocess' });
	const adjusted = adjustMask(mask, {
		threshold: options.threshold,
		gamma: options.gamma,
		invert: options.invert
	});
	const softened =
		options.feather > 0
			? options.edgeRefine
				? await refineMask(adjusted, image, options.feather)
				: featherMask(adjusted, options.feather)
			: adjusted;
	image.putAlpha(softened);

	const blob = await renderToBlob(image, options);

	emit({
		type: 'result',
		id,
		result: {
			blob,
			width: image.width,
			height: image.height,
			ms: performance.now() - started,
			cached,
			tiles
		}
	});
}

interface ResolvedMask {
	mask: RawImage;
	cached: boolean;
	tiles: number;
}

async function resolveMask(
	image: RawImage,
	sourceId: string,
	options: RunRequest['options']
): Promise<ResolvedMask> {
	const tiled = options.tiled && Math.max(image.width, image.height) > MODEL_INPUT_SIZE;
	const reusable =
		cacheSourceId === sourceId &&
		cacheTiled === tiled &&
		(tiled ? cacheMask !== null && cacheMaskMode === options.maskMode : cacheLogits !== null);

	if (reusable && tiled) {
		return {
			mask: await cacheMask!.resize(image.width, image.height),
			cached: true,
			tiles: cacheTiles
		};
	}
	if (reusable && cacheLogits) {
		return {
			mask: await logitsToAlpha(cacheLogits, options.maskMode).resize(image.width, image.height),
			cached: true,
			tiles: 1
		};
	}

	emit({ type: 'progress', phase: 'infer' });

	if (tiled) {
		const built = await buildTiledMask(image, runModel, options.maskMode);
		cacheMask = built.mask;
		cacheMaskMode = options.maskMode;
		cacheLogits = null;
		cacheTiles = built.tiles;
		cacheSourceId = sourceId;
		cacheTiled = true;
		return {
			mask: await built.mask.resize(image.width, image.height),
			cached: false,
			tiles: built.tiles
		};
	}

	const logits = await runModel(image);
	cacheLogits = logits;
	cacheMask = null;
	cacheMaskMode = null;
	cacheTiles = 1;
	cacheSourceId = sourceId;
	cacheTiled = false;
	return {
		mask: await logitsToAlpha(logits, options.maskMode).resize(image.width, image.height),
		cached: false,
		tiles: 1
	};
}
