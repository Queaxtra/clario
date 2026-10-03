export type Device = 'webgpu' | 'wasm';
export type Dtype = 'fp32' | 'fp16' | 'q8';
export type MaskMode = 'minmax' | 'sigmoid';
export type OutputFormat = 'image/png' | 'image/webp' | 'image/jpeg';

export type Background =
	| { type: 'transparent' }
	| { type: 'color'; color: string }
	| { type: 'gradient'; from: string; to: string; angle: number }
	| { type: 'image'; url: string };

export interface RunOptions {
	/** how the raw logits are mapped to alpha values */
	maskMode?: MaskMode;
	/** alpha edge softening radius in output pixels, 0 disables it */
	feather?: number;
	format?: OutputFormat;
	/** encoder quality for lossy formats */
	quality?: number;
	background?: Background;
	/** run the model on overlapping tiles for large images, slower but sharper edges */
	tiled?: boolean;
	/** alpha black point 0..1, values below it become fully transparent */
	threshold?: number;
	/** alpha gamma curve, 1 is neutral, below 1 brightens the mask */
	gamma?: number;
	/** swap foreground and background in the mask */
	invert?: boolean;
	/** use an edge aware guided filter instead of a box blur when feathering */
	edgeRefine?: boolean;
	/** transparent margin added around the cutout, in pixels */
	padding?: number;
	/** drop shadow under the subject */
	shadow?: boolean;
	/** outline width around the subject, in pixels */
	border?: number;
	borderColor?: string;
	/** text watermark drawn in the bottom corner, empty disables it */
	watermark?: string;
}

export interface RunResult {
	blob: Blob;
	width: number;
	height: number;
	ms: number;
	/** true when the model output was reused and only rendering re-ran */
	cached: boolean;
	/** how many model calls produced this result, 1 means a single pass */
	tiles: number;
}

/**
 * Minimal shape of the model output tensor that we consume.
 * The values are contiguous in the last two dims (height, width).
 */
export interface LogitsTensor {
	dims: number[];
	data: ArrayLike<number> & { length: number };
}
