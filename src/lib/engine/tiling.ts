import { RawImage } from '@huggingface/transformers';
import { MODEL_INPUT_SIZE } from './config';
import { logitsToAlpha } from './postprocess';
import type { LogitsTensor, MaskMode } from './types';

const TILE = MODEL_INPUT_SIZE;
const OVERLAP = 128;
const MAX_GRID = 3;
const STEP = TILE - OVERLAP;
const MAX_SIDE = TILE + (MAX_GRID - 1) * STEP;

interface Tile {
	x: number;
	y: number;
	width: number;
	height: number;
	dims: number[];
	data: Float32Array;
}

/**
 * Run the model on overlapping tiles so large images keep edge detail.
 * The source is capped to a 3x3 grid to bound memory and compute, then a
 * global min/max keeps the alpha mapping consistent across tile seams.
 */
export async function buildTiledMask(
	image: RawImage,
	infer: (tile: RawImage) => Promise<LogitsTensor>,
	mode: MaskMode
): Promise<{ mask: RawImage; tiles: number }> {
	const longest = Math.max(image.width, image.height);
	const source =
		longest > MAX_SIDE
			? await image.resize(
					Math.max(1, Math.round((image.width / longest) * MAX_SIDE)),
					Math.max(1, Math.round((image.height / longest) * MAX_SIDE))
				)
			: image;

	const cols = Math.max(1, Math.ceil((source.width - TILE) / STEP) + 1);
	const rows = Math.max(1, Math.ceil((source.height - TILE) / STEP) + 1);

	const tiles: Tile[] = [];
	let min = Infinity;
	let max = -Infinity;

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const x = col * STEP;
			const y = row * STEP;
			const xMax = Math.min(x + TILE - 1, source.width - 1);
			const yMax = Math.min(y + TILE - 1, source.height - 1);
			const logits = await infer(await source.crop([x, y, xMax, yMax]));

			// copy out, the runtime may reuse its output buffer between calls
			const data = new Float32Array(logits.data.length);
			data.set(logits.data as ArrayLike<number>);
			for (let i = 0; i < data.length; i++) {
				if (data[i] < min) min = data[i];
				if (data[i] > max) max = data[i];
			}

			tiles.push({ x, y, width: xMax - x + 1, height: yMax - y + 1, dims: logits.dims, data });
		}
	}

	const width = source.width;
	const height = source.height;
	const sum = new Float32Array(width * height);
	const weight = new Float32Array(width * height);

	for (const tile of tiles) {
		const alpha = logitsToAlpha({ dims: tile.dims, data: tile.data }, mode, { min, max });
		const scaled = await alpha.resize(tile.width, tile.height);
		const pixels = scaled.data;
		const left = tile.x > 0;
		const top = tile.y > 0;
		const right = tile.x + tile.width < width;
		const bottom = tile.y + tile.height < height;

		for (let ty = 0; ty < tile.height; ty++) {
			const wy = edgeWeight(ty, tile.height, top, bottom);
			const rowOffset = (tile.y + ty) * width + tile.x;
			for (let tx = 0; tx < tile.width; tx++) {
				const w = edgeWeight(tx, tile.width, left, right) * wy;
				const index = rowOffset + tx;
				sum[index] += pixels[ty * tile.width + tx] * w;
				weight[index] += w;
			}
		}
	}

	const out = new Uint8ClampedArray(width * height);
	for (let i = 0; i < out.length; i++) {
		out[i] = weight[i] > 0 ? sum[i] / weight[i] : 0;
	}

	return { mask: new RawImage(out, width, height, 1), tiles: tiles.length };
}

function edgeWeight(pos: number, size: number, overlapLow: boolean, overlapHigh: boolean): number {
	let weight = 1;
	if (overlapLow && pos < OVERLAP) weight *= (pos + 0.5) / OVERLAP;
	if (overlapHigh && pos >= size - OVERLAP) weight *= (size - pos - 0.5) / OVERLAP;
	return weight;
}
