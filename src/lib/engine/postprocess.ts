import { RawImage } from '@huggingface/transformers';
import type { LogitsTensor, MaskMode } from './types';

/**
 * Convert raw single channel logits into a grayscale alpha mask (0..255).
 * Mirrors the official RMBG postprocess that min-max normalizes the logits.
 */
export function logitsToAlpha(
	tensor: LogitsTensor,
	mode: MaskMode = 'minmax',
	bounds?: { min: number; max: number }
): RawImage {
	const dims = tensor.dims;
	const height = dims[dims.length - 2];
	const width = dims[dims.length - 1];
	const count = width * height;
	const source = tensor.data;
	const out = new Uint8ClampedArray(count);

	if (mode === 'sigmoid') {
		for (let i = 0; i < count; i++) {
			out[i] = (1 / (1 + Math.exp(-source[i]))) * 255;
		}
		return new RawImage(out, width, height, 1);
	}

	let min = bounds ? bounds.min : Infinity;
	let max = bounds ? bounds.max : -Infinity;
	if (!bounds) {
		for (let i = 0; i < count; i++) {
			const value = source[i];
			if (value < min) min = value;
			if (value > max) max = value;
		}
	}

	const range = max - min || 1;
	for (let i = 0; i < count; i++) {
		out[i] = ((source[i] - min) / range) * 255;
	}

	return new RawImage(out, width, height, 1);
}

/**
 * Separable box blur over the alpha mask to soften edges.
 * ponytail: box blur instead of gaussian, upgrade to guided filter if edges look flat
 */
export function featherMask(mask: RawImage, radius: number): RawImage {
	const r = Math.round(radius);
	if (r <= 0) return mask;

	const { width, height } = mask;
	const source = mask.data;
	const horizontal = new Float32Array(width * height);
	const out = new Uint8ClampedArray(width * height);
	const size = 2 * r + 1;

	for (let y = 0; y < height; y++) {
		const row = y * width;
		let sum = 0;
		for (let x = -r; x <= r; x++) sum += source[row + clamp(x, 0, width - 1)];
		for (let x = 0; x < width; x++) {
			horizontal[row + x] = sum / size;
			sum -= source[row + clamp(x - r, 0, width - 1)];
			sum += source[row + clamp(x + r + 1, 0, width - 1)];
		}
	}

	for (let x = 0; x < width; x++) {
		let sum = 0;
		for (let y = -r; y <= r; y++) sum += horizontal[clamp(y, 0, height - 1) * width + x];
		for (let y = 0; y < height; y++) {
			out[y * width + x] = sum / size;
			sum -= horizontal[clamp(y - r, 0, height - 1) * width + x];
			sum += horizontal[clamp(y + r + 1, 0, height - 1) * width + x];
		}
	}

	return new RawImage(out, width, height, 1);
}

export interface MaskAdjustments {
	threshold: number;
	gamma: number;
	invert: boolean;
}

/**
 * Apply a black point, gamma curve and optional inversion to the alpha mask.
 * Always returns a new image so a cached mask is never mutated.
 */
export function adjustMask(
	mask: RawImage,
	{ threshold, gamma, invert }: MaskAdjustments
): RawImage {
	const low = Math.max(0, Math.min(1, threshold)) * 255;
	const curve = gamma > 0 ? gamma : 1;
	if (low <= 0 && curve === 1 && !invert) return mask;

	const source = mask.data;
	const out = new Uint8ClampedArray(source.length);
	const span = 255 - low || 1;

	for (let i = 0; i < source.length; i++) {
		let value = source[i];
		if (low > 0) value = value <= low ? 0 : ((value - low) / span) * 255;
		if (curve !== 1) value = Math.pow(value / 255, curve) * 255;
		if (invert) value = 255 - value;
		out[i] = value;
	}

	return new RawImage(out, mask.width, mask.height, 1);
}

const REFINE_CAP = 1_000_000;

/**
 * Edge aware feather using a guided filter with the source image as guide.
 * Capped in resolution so memory stays bounded on very large images.
 */
export async function refineMask(
	mask: RawImage,
	guide: RawImage,
	radius: number
): Promise<RawImage> {
	const r = Math.round(radius);
	if (r <= 0) return mask;

	const pixels = mask.width * mask.height;
	if (pixels <= REFINE_CAP) return guidedFilter(mask, guide, r);

	const scale = Math.sqrt(REFINE_CAP / pixels);
	const width = Math.max(1, Math.round(mask.width * scale));
	const height = Math.max(1, Math.round(mask.height * scale));
	const smallMask = await mask.resize(width, height);
	const smallGuide = await guide.resize(width, height);
	const refined = guidedFilter(smallMask, smallGuide, Math.max(1, Math.round(r * scale)));
	return await refined.resize(mask.width, mask.height);
}

function guidedFilter(mask: RawImage, guide: RawImage, radius: number): RawImage {
	const width = mask.width;
	const height = mask.height;
	const count = width * height;
	const channels = guide.channels;
	const guideData = guide.data;
	const maskData = mask.data;

	const intensity = new Float32Array(count);
	const input = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		const offset = i * channels;
		intensity[i] =
			(0.2126 * guideData[offset] +
				0.7152 * guideData[offset + 1] +
				0.0722 * guideData[offset + 2]) /
			255;
		input[i] = maskData[i] / 255;
	}

	const meanI = boxFilter(intensity, width, height, radius);
	const meanP = boxFilter(input, width, height, radius);

	const squared = new Float32Array(count);
	const product = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		squared[i] = intensity[i] * intensity[i];
		product[i] = intensity[i] * input[i];
	}

	const corrI = boxFilter(squared, width, height, radius);
	const corrIP = boxFilter(product, width, height, radius);

	const a = new Float32Array(count);
	const b = new Float32Array(count);
	const eps = 0.02 * 0.02;
	for (let i = 0; i < count; i++) {
		const variance = corrI[i] - meanI[i] * meanI[i];
		const covariance = corrIP[i] - meanI[i] * meanP[i];
		const ai = covariance / (variance + eps);
		a[i] = ai;
		b[i] = meanP[i] - ai * meanI[i];
	}

	const meanA = boxFilter(a, width, height, radius);
	const meanB = boxFilter(b, width, height, radius);

	const out = new Uint8ClampedArray(count);
	for (let i = 0; i < count; i++) out[i] = (meanA[i] * intensity[i] + meanB[i]) * 255;
	return new RawImage(out, width, height, 1);
}

function boxFilter(
	source: Float32Array,
	width: number,
	height: number,
	radius: number
): Float32Array {
	const horizontal = new Float32Array(width * height);
	const out = new Float32Array(width * height);
	const size = 2 * radius + 1;

	for (let y = 0; y < height; y++) {
		const row = y * width;
		let sum = 0;
		for (let x = -radius; x <= radius; x++) sum += source[row + clamp(x, 0, width - 1)];
		for (let x = 0; x < width; x++) {
			horizontal[row + x] = sum / size;
			sum -= source[row + clamp(x - radius, 0, width - 1)];
			sum += source[row + clamp(x + radius + 1, 0, width - 1)];
		}
	}

	for (let x = 0; x < width; x++) {
		let sum = 0;
		for (let y = -radius; y <= radius; y++) sum += horizontal[clamp(y, 0, height - 1) * width + x];
		for (let y = 0; y < height; y++) {
			out[y * width + x] = sum / size;
			sum -= horizontal[clamp(y - radius, 0, height - 1) * width + x];
			sum += horizontal[clamp(y + radius + 1, 0, height - 1) * width + x];
		}
	}

	return out;
}

function clamp(value: number, min: number, max: number): number {
	return value < min ? min : value > max ? max : value;
}
