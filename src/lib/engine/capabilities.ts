export interface Capabilities {
	webgpu: boolean;
	simd: boolean;
	threads: boolean;
	hardwareConcurrency: number;
}

interface GpuAdapter {
	info?: { isFallbackAdapter?: boolean };
}

interface NavigatorGpu {
	requestAdapter(options?: {
		powerPreference?: 'low-power' | 'high-performance';
	}): Promise<GpuAdapter | null>;
}

type NavigatorWithGpu = Navigator & { gpu?: NavigatorGpu };

const SIMD_TEST = new Uint8Array([
	0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15,
	253, 98, 11
]);

export async function detectCapabilities(): Promise<Capabilities> {
	return {
		webgpu: await detectWebGPU(),
		simd: detectSIMD(),
		threads: typeof SharedArrayBuffer !== 'undefined',
		hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1
	};
}

async function detectWebGPU(): Promise<boolean> {
	if (typeof navigator === 'undefined') return false;

	const gpu = (navigator as NavigatorWithGpu).gpu;
	if (!gpu) return false;

	try {
		const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
		return Boolean(adapter) && !adapter?.info?.isFallbackAdapter;
	} catch {
		return false;
	}
}

function detectSIMD(): boolean {
	if (typeof WebAssembly === 'undefined' || typeof WebAssembly.validate !== 'function')
		return false;
	return WebAssembly.validate(SIMD_TEST);
}
