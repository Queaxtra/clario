export { BackgroundRemovalEngine } from './engine';
export { detectCapabilities, type Capabilities } from './capabilities';
export {
	DEFAULT_RUN_OPTIONS,
	MODEL_ID,
	MODEL_INPUT_SIZE,
	MODEL_LICENSE,
	loadModelPreference,
	resolveDevice,
	resolveDtype,
	saveModelPreference
} from './config';
export type {
	Background,
	Device,
	Dtype,
	LogitsTensor,
	MaskMode,
	OutputFormat,
	RunOptions,
	RunResult
} from './types';
export type { EngineEvent, ProgressPhase } from './worker/protocol';
