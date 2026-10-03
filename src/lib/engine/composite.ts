import { RawImage } from '@huggingface/transformers';
import type { Background, RunOptions } from './types';

/**
 * Render the masked image to a blob.
 * Transparent backgrounds with no styling take the fast pixel path, everything
 * else is drawn on a canvas so background, padding, shadow, border and watermark apply.
 */
export async function renderToBlob(image: RawImage, options: Required<RunOptions>): Promise<Blob> {
	const { format, quality, padding } = options;
	const styled = padding > 0 || options.shadow || options.border > 0 || options.watermark !== '';
	const opaque = format === 'image/jpeg';

	if (options.background.type === 'transparent' && !opaque && !styled) {
		return image.toBlob(format, quality);
	}

	const width = image.width + padding * 2;
	const height = image.height + padding * 2;
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('unable to create 2d context');

	// a transparent background on an opaque format still needs a solid fill
	const background =
		opaque && options.background.type === 'transparent'
			? ({ type: 'color', color: '#ffffff' } as Background)
			: options.background;
	await drawBackground(context, background, width, height);

	const subject = image.toCanvas();

	if (options.shadow) {
		const blur = Math.max(4, Math.min(48, Math.round(Math.max(width, height) * 0.02)));
		context.save();
		context.shadowColor = 'rgba(0, 0, 0, 0.35)';
		context.shadowBlur = blur;
		context.shadowOffsetY = Math.round(blur / 2);
		context.drawImage(subject, padding, padding);
		context.restore();
	}

	if (options.border > 0) {
		const silhouette = silhouetteCanvas(subject, options.borderColor, image.width, image.height);
		for (const [dx, dy] of outlineOffsets(options.border)) {
			context.drawImage(silhouette, padding + dx, padding + dy);
		}
	}

	context.drawImage(subject, padding, padding);

	if (options.watermark !== '') drawWatermark(context, options.watermark, width, height);

	return canvas.convertToBlob({ type: format, quality });
}

async function drawBackground(
	context: OffscreenCanvasRenderingContext2D,
	background: Background,
	width: number,
	height: number
): Promise<void> {
	if (background.type === 'transparent') return;
	context.fillStyle = await backgroundStyle(context, background, width, height);
	context.fillRect(0, 0, width, height);
}

async function backgroundStyle(
	context: OffscreenCanvasRenderingContext2D,
	background: Background,
	width: number,
	height: number
): Promise<string | CanvasGradient | CanvasPattern> {
	if (background.type === 'color') return background.color;
	if (background.type === 'gradient') return gradient(context, background, width, height);
	if (background.type === 'image') return await imagePattern(background.url, width, height);
	return '#ffffff';
}

function gradient(
	context: OffscreenCanvasRenderingContext2D,
	{ from, to, angle }: { from: string; to: string; angle: number },
	width: number,
	height: number
): CanvasGradient {
	const radians = (angle * Math.PI) / 180;
	const dx = Math.sin(radians);
	const dy = -Math.cos(radians);
	const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
	const cx = width / 2;
	const cy = height / 2;

	const fill = context.createLinearGradient(
		cx - dx * half,
		cy - dy * half,
		cx + dx * half,
		cy + dy * half
	);
	fill.addColorStop(0, from);
	fill.addColorStop(1, to);
	return fill;
}

async function imagePattern(
	url: string,
	width: number,
	height: number
): Promise<string | CanvasPattern> {
	const response = await fetch(url);
	if (!response.ok) throw new Error('background image could not be loaded');

	const bitmap = await createImageBitmap(await response.blob());
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('unable to create 2d context');

	const scale = Math.max(width / bitmap.width, height / bitmap.height);
	const drawWidth = bitmap.width * scale;
	const drawHeight = bitmap.height * scale;
	context.drawImage(
		bitmap,
		(width - drawWidth) / 2,
		(height - drawHeight) / 2,
		drawWidth,
		drawHeight
	);
	bitmap.close();

	return context.createPattern(canvas, 'no-repeat') ?? '#ffffff';
}

function silhouetteCanvas(
	subject: CanvasImageSource,
	color: string,
	width: number,
	height: number
): OffscreenCanvas {
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext('2d');
	if (!context) throw new Error('unable to create 2d context');
	context.drawImage(subject, 0, 0);
	context.globalCompositeOperation = 'source-in';
	context.fillStyle = color;
	context.fillRect(0, 0, width, height);
	return canvas;
}

function outlineOffsets(border: number): [number, number][] {
	const offsets: [number, number][] = [];
	for (let i = 0; i < 8; i++) {
		const angle = (Math.PI * 2 * i) / 8;
		offsets.push([Math.round(Math.cos(angle) * border), Math.round(Math.sin(angle) * border)]);
	}
	return offsets;
}

function drawWatermark(
	context: OffscreenCanvasRenderingContext2D,
	text: string,
	width: number,
	height: number
): void {
	const fontSize = Math.max(12, Math.round(width / 40));
	context.font = `${fontSize}px system-ui, sans-serif`;
	context.textAlign = 'right';
	context.textBaseline = 'bottom';
	context.fillStyle = 'rgba(255, 255, 255, 0.85)';
	context.shadowColor = 'rgba(0, 0, 0, 0.35)';
	context.shadowBlur = Math.max(2, fontSize / 4);
	context.fillText(text, width - 16, height - 12);
	context.shadowBlur = 0;
}
