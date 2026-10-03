import type { Capabilities } from './capabilities';
import type { Device, Dtype, RunOptions } from './types';

export const MODEL_ID = 'briaai/RMBG-1.4';
export const MODEL_INPUT_SIZE = 1024;
export const MODEL_LICENSE = {
	name: 'BRIA RMBG-1.4 (source-available, non-commercial)',
	url: 'https://huggingface.co/briaai/RMBG-1.4'
};

export const DEFAULT_RUN_OPTIONS: Required<RunOptions> = {
	maskMode: 'minmax',
	feather: 0,
	format: 'image/png',
	quality: 0.92,
	background: { type: 'transparent' },
	tiled: false,
	threshold: 0,
	gamma: 1,
	invert: false,
	edgeRefine: false,
	padding: 0,
	shadow: false,
	border: 0,
	borderColor: '#ffffff',
	watermark: ''
};

export function resolveDevice(capabilities: Capabilities): Device {
	return capabilities.webgpu ? 'webgpu' : 'wasm';
}

export function resolveDtype(device: Device): Dtype {
	// int8 is unstable on the webgpu path, prefer quality there, size on cpu
	return device === 'webgpu' ? 'fp16' : 'q8';
}

const MODEL_PREF_KEY = 'clario.model-preference';

export function loadModelPreference(capabilities: Capabilities): { device: Device; dtype: Dtype } {
	const device = resolveDevice(capabilities);
	const fallback = { device, dtype: resolveDtype(device) };

	let raw: string | null;
	try {
		raw = localStorage.getItem(MODEL_PREF_KEY);
	} catch {
		return fallback;
	}
	if (!raw) return fallback;

	try {
		const saved = JSON.parse(raw) as { device?: unknown; dtype?: unknown };
		const savedDevice =
			isDevice(saved.device) && (saved.device !== 'webgpu' || capabilities.webgpu)
				? saved.device
				: device;
		const dtype = isDtype(saved.dtype) ? saved.dtype : resolveDtype(savedDevice);
		return { device: savedDevice, dtype };
	} catch {
		return fallback;
	}
}

export function saveModelPreference(device: Device, dtype: Dtype): void {
	try {
		localStorage.setItem(MODEL_PREF_KEY, JSON.stringify({ device, dtype }));
	} catch {
		// storage is unavailable in private mode or when the quota is full
	}
}

function isDevice(value: unknown): value is Device {
	return value === 'webgpu' || value === 'wasm';
}

function isDtype(value: unknown): value is Dtype {
	return value === 'fp32' || value === 'fp16' || value === 'q8';
}
