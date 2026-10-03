import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers';
import type { Capabilities } from './capabilities';
import { MODEL_ID, MODEL_INPUT_SIZE } from './config';
import { configureRuntime } from './runtime';
import type { Device, Dtype, LogitsTensor } from './types';

export interface ProgressEvent {
	status: string;
	name?: string;
	file?: string;
	progress?: number;
	loaded?: number;
	total?: number;
}

interface ProcessorLike {
	(image: RawImage): Promise<Record<string, unknown>>;
}

interface Session {
	inputNames: string[];
	outputNames: string[];
}

type Model = Awaited<ReturnType<typeof AutoModel.from_pretrained>>;

let model: Model | null = null;
let processor: ProcessorLike | null = null;
let inputName = 'pixel_values';
let outputName = 'output';

export interface LoadOptions {
	device: Device;
	dtype: Dtype;
	capabilities: Capabilities;
	onProgress?: (event: ProgressEvent) => void;
}

export async function loadModel({
	device,
	dtype,
	capabilities,
	onProgress
}: LoadOptions): Promise<void> {
	configureRuntime(capabilities);

	processor ??= (await AutoProcessor.from_pretrained(MODEL_ID)) as unknown as ProcessorLike;

	model = await AutoModel.from_pretrained(MODEL_ID, {
		device,
		dtype,
		progress_callback: onProgress
	});

	resolveIO();
}

export function getModelIO(): { inputName: string; outputName: string } {
	return { inputName, outputName };
}

export async function runModel(image: RawImage): Promise<LogitsTensor> {
	if (!model || !processor) throw new Error('model is not loaded');

	const inputs = (await processor(image)) as Record<string, unknown>;
	if (!(inputName in inputs)) {
		inputs[inputName] = inputs.pixel_values;
	}

	const output = await model(inputs);
	return output[outputName] as LogitsTensor;
}

export async function warmupModel(): Promise<void> {
	const pixels = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
	const blank = new RawImage(
		new Uint8ClampedArray(pixels * 4),
		MODEL_INPUT_SIZE,
		MODEL_INPUT_SIZE,
		4
	);
	await runModel(blank);
}

export async function disposeModel(): Promise<void> {
	if (model) await model.dispose();
	model = null;
	processor = null;
}

function resolveIO(): void {
	if (!model) throw new Error('model is not loaded');

	const session = model.sessions['model'] as Session | undefined;
	if (!session) throw new Error('model session not found');

	// background-removal models often expose a single non standard input name
	inputName = session.inputNames.includes('pixel_values') ? 'pixel_values' : session.inputNames[0];
	outputName = session.outputNames[0];
}
