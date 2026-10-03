import { env } from '@huggingface/transformers';
import type { Capabilities } from './capabilities';

interface OnnxWasmFlags {
	numThreads?: number;
	simd?: boolean;
}

const MAX_THREADS = 4;

/**
 * Configure the transformers.js runtime before any model is loaded.
 * Caching is enabled so the model is only downloaded once.
 */
export function configureRuntime(capabilities: Capabilities): void {
	env.allowLocalModels = false;
	env.useBrowserCache = true;

	const onnx = env.backends.onnx as { wasm?: OnnxWasmFlags };
	if (onnx.wasm) {
		onnx.wasm.numThreads = Math.min(Math.max(capabilities.hardwareConcurrency, 1), MAX_THREADS);
		onnx.wasm.simd = capabilities.simd;
	}
}
