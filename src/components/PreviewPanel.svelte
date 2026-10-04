<script lang="ts">
	import { onMount } from 'svelte';
	import AddIcon from '../lib/components/icons/add-linear.svelte';
	import AltArrowDownIcon from '../lib/components/icons/alt-arrow-down-linear.svelte';
	import CopyIcon from '../lib/components/icons/copy-linear.svelte';
	import DangerTriangleIcon from '../lib/components/icons/danger-triangle-linear.svelte';
	import DownloadIcon from '../lib/components/icons/download-minimalistic-linear.svelte';
	import MinusIcon from '../lib/components/icons/minus-linear.svelte';
	import RefreshIcon from '../lib/components/icons/refresh-linear.svelte';
	import RestartIcon from '../lib/components/icons/restart-linear.svelte';
	import ShareIcon from '../lib/components/icons/share-linear.svelte';
	import * as Alert from '../lib/components/ui/alert';
	import { Button } from '../lib/components/ui/button';
	import * as Card from '../lib/components/ui/card';
	import { Spinner } from '../lib/components/ui/spinner';
	import { t } from '../lib/i18n';
	import { cn } from '../lib/utils.js';

	let {
		originalUrl,
		resultUrl,
		resultBlob,
		resultName,
		processing,
		error = '',
		index = 0,
		count = 1,
		canDownloadAll = false,
		onDownload,
		onDownloadAll,
		onReset
	}: {
		originalUrl: string;
		resultUrl: string;
		resultBlob: Blob | null;
		resultName: string;
		processing: boolean;
		error?: string;
		index?: number;
		count?: number;
		canDownloadAll?: boolean;
		onDownload: () => void;
		onDownloadAll: () => void;
		onReset: () => void;
	} = $props();

	const MIN_ZOOM = 1;
	const MAX_ZOOM = 4;
	const ZOOM_STEP = 0.25;

	let frame = $state<HTMLDivElement | null>(null);
	let stage = $state<HTMLDivElement | null>(null);
	let position = $state(50);
	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let mode = $state<'divider' | 'pan' | null>(null);
	let notice = $state('');
	let shareSupported = $state(false);

	let pointer = { x: 0, y: 0, panX: 0, panY: 0 };
	let noticeTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		shareSupported =
			typeof navigator !== 'undefined' &&
			'share' in navigator &&
			typeof navigator.canShare === 'function';
		return () => clearTimeout(noticeTimer);
	});

	// each new image starts centered and at fit zoom
	$effect(() => {
		void originalUrl;
		resetView();
	});

	function flash(key: string) {
		notice = key;
		clearTimeout(noticeTimer);
		noticeTimer = setTimeout(() => (notice = ''), 2400);
	}

	function setFromClientX(clientX: number) {
		if (!stage) return;
		const rect = stage.getBoundingClientRect();
		if (rect.width === 0) return;
		position = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
	}

	function onFramePointerDown(event: PointerEvent) {
		if (!resultUrl) return;
		frame?.setPointerCapture(event.pointerId);
		if (zoom > MIN_ZOOM) {
			mode = 'pan';
			pointer = { x: event.clientX, y: event.clientY, panX, panY };
			return;
		}
		mode = 'divider';
		setFromClientX(event.clientX);
	}

	function onHandlePointerDown(event: PointerEvent) {
		if (!resultUrl) return;
		event.stopPropagation();
		frame?.setPointerCapture(event.pointerId);
		mode = 'divider';
		setFromClientX(event.clientX);
	}

	function onFramePointerMove(event: PointerEvent) {
		if (mode === 'divider') {
			setFromClientX(event.clientX);
			return;
		}
		if (mode !== 'pan') return;
		panX = pointer.panX + (event.clientX - pointer.x);
		panY = pointer.panY + (event.clientY - pointer.y);
		clampPan();
	}

	function onFramePointerUp(event: PointerEvent) {
		if (!mode) return;
		mode = null;
		frame?.releasePointerCapture(event.pointerId);
	}

	function onKeyDown(event: KeyboardEvent) {
		const step = event.shiftKey ? 10 : 2;
		if (event.key === 'ArrowLeft') position = Math.max(0, position - step);
		else if (event.key === 'ArrowRight') position = Math.min(100, position + step);
		else return;
		event.preventDefault();
	}

	function clampPan() {
		if (!stage) return;
		const maxX = ((zoom - 1) * stage.offsetWidth) / 2;
		const maxY = ((zoom - 1) * stage.offsetHeight) / 2;
		panX = Math.min(maxX, Math.max(-maxX, panX));
		panY = Math.min(maxY, Math.max(-maxY, panY));
	}

	function zoomBy(delta: number) {
		zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
		if (zoom === MIN_ZOOM) {
			panX = 0;
			panY = 0;
			return;
		}
		clampPan();
	}

	function resetView() {
		zoom = 1;
		panX = 0;
		panY = 0;
		position = 50;
	}

	async function copyResult() {
		if (!resultBlob) return;
		try {
			if (!('ClipboardItem' in window)) throw new Error('unsupported');
			await navigator.clipboard.write([
				new ClipboardItem({ 'image/png': await toPng(resultBlob) })
			]);
			flash('preview.notices.copied');
		} catch {
			flash('preview.notices.copyUnsupported');
		}
	}

	async function shareResult() {
		if (!resultBlob) return;
		try {
			const file = new File([resultBlob], resultName, { type: resultBlob.type });
			if (navigator.canShare?.({ files: [file] })) {
				await navigator.share({ files: [file] });
				return;
			}
			flash('preview.notices.shareUnsupported');
		} catch {
			// the user cancelled the share sheet
		}
	}

	async function toPng(blob: Blob): Promise<Blob> {
		if (blob.type === 'image/png') return blob;
		const bitmap = await createImageBitmap(blob);
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('unable to create 2d context');
		context.drawImage(bitmap, 0, 0);
		bitmap.close();
		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(out) => (out ? resolve(out) : reject(new Error('encode failed'))),
				'image/png'
			);
		});
	}
</script>

<Card.Root>
	<Card.Content class="gap-3">
		{#if error}
			<Alert.Root variant="destructive">
				<DangerTriangleIcon />
				<Alert.Title>{t('preview.errorTitle')}</Alert.Title>
				<Alert.Description>{error}</Alert.Description>
			</Alert.Root>
		{/if}

		<div class="flex items-center justify-center">
			<div
				bind:this={frame}
				role="group"
				aria-label={t('preview.frameLabel')}
				class={cn(
					'checkerboard relative overflow-hidden rounded-lg border border-border',
					resultUrl && (zoom > 1 || mode === 'pan' ? 'cursor-grab' : 'cursor-ew-resize'),
					mode === 'pan' && 'cursor-grabbing'
				)}
				onpointerdown={onFramePointerDown}
				onpointermove={onFramePointerMove}
				onpointerup={onFramePointerUp}
				onpointercancel={onFramePointerUp}
			>
				<div
					bind:this={stage}
					class="relative will-change-transform"
					style:transform={`translate(${panX}px, ${panY}px) scale(${zoom})`}
				>
					{#if resultUrl}
						<img
							src={resultUrl}
							alt={t('preview.compareAlt')}
							class="block max-h-[60vh] w-auto max-w-full"
							draggable="false"
						/>
						<img
							src={originalUrl}
							alt={t('preview.originalAlt')}
							class="absolute inset-0 h-full w-full object-contain"
							style:clip-path={`inset(0 0 0 ${position}%)`}
							draggable="false"
						/>
						<div
							class="pointer-events-none absolute inset-y-0 w-px bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.18)]"
							style:left={`${position}%`}
						></div>
						<div
							role="slider"
							tabindex="0"
							aria-label={t('preview.handleLabel')}
							aria-valuemin="0"
							aria-valuemax="100"
							aria-valuenow={Math.round(position)}
							onkeydown={onKeyDown}
							onpointerdown={onHandlePointerDown}
							class="absolute top-1/2 flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none max-sm:size-10"
							style:left={`${position}%`}
							style:transform={`translate(-50%, -50%) scale(${1 / zoom})`}
						>
							<AltArrowDownIcon class="size-3.5 rotate-90" />
							<AltArrowDownIcon class="size-3.5 -rotate-90" />
						</div>
					{:else}
						<img
							src={originalUrl}
							alt={t('preview.originalAlt')}
							class="block max-h-[60vh] w-auto max-w-full"
							draggable="false"
						/>
					{/if}
				</div>

				{#if resultUrl}
					<div
						role="group"
						aria-label={t('preview.zoomLabel')}
						class="absolute top-2 right-2 flex items-center gap-0.5 rounded-md border border-border bg-background/90 px-0.5 py-0.5 backdrop-blur"
						onpointerdown={(event) => event.stopPropagation()}
					>
						<Button
							variant="ghost"
							size="icon-sm"
							class="max-sm:size-9"
							aria-label={t('preview.zoomOut')}
							disabled={zoom <= MIN_ZOOM}
							onclick={() => zoomBy(-ZOOM_STEP)}
						>
							<MinusIcon />
						</Button>
						<span class="w-9 text-center text-xs text-muted-foreground tabular-nums">
							{Math.round(zoom * 100)}%
						</span>
						<Button
							variant="ghost"
							size="icon-sm"
							class="max-sm:size-9"
							aria-label={t('preview.zoomIn')}
							disabled={zoom >= MAX_ZOOM}
							onclick={() => zoomBy(ZOOM_STEP)}
						>
							<AddIcon />
						</Button>
						{#if zoom > MIN_ZOOM}
							<Button
								variant="ghost"
								size="icon-sm"
								class="max-sm:size-9"
								aria-label={t('preview.resetZoom')}
								onclick={resetView}
							>
								<RefreshIcon />
							</Button>
						{/if}
					</div>
				{/if}

				{#if processing}
					<div
						class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm"
					>
						<Spinner class="size-5" />
						<p class="text-sm font-medium text-foreground">{t('preview.processing')}</p>
					</div>
				{/if}
			</div>
		</div>
	</Card.Content>

	<Card.Footer class="border-t">
		<div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<p class="text-xs text-muted-foreground" aria-live="polite">
				{#if notice}
					{t(notice)}
				{:else if count > 1}
					{t('preview.counter', { index: index + 1, count })}
				{:else}
					{t('preview.dragHint')}
				{/if}
			</p>

			<div
				class="flex flex-wrap items-center justify-end gap-2 max-sm:grid max-sm:w-full max-sm:grid-cols-2"
			>
				{#if resultBlob}
					<Button
						variant="outline"
						size="icon-sm"
						class="max-sm:order-1 max-sm:size-10 max-sm:justify-self-start"
						aria-label={t('preview.copy')}
						onclick={copyResult}
					>
						<CopyIcon />
					</Button>
					{#if shareSupported}
						<Button
							variant="outline"
							size="icon-sm"
							class="max-sm:order-2 max-sm:size-10 max-sm:justify-self-start"
							aria-label={t('preview.share')}
							onclick={shareResult}
						>
							<ShareIcon />
						</Button>
					{/if}
				{/if}
				{#if canDownloadAll}
					<Button
						variant="outline"
						size="sm"
						class="max-sm:order-5 max-sm:col-span-2 max-sm:h-10"
						onclick={onDownloadAll}
						disabled={processing}
					>
						{t('preview.downloadAll')}
					</Button>
				{/if}
				<Button
					variant="outline"
					size="sm"
					class="max-sm:order-3 max-sm:h-10"
					onclick={onReset}
					disabled={processing}
				>
					<RestartIcon data-icon="inline-start" />
					{t('preview.newImage')}
				</Button>
				<Button
					size="sm"
					class="max-sm:order-4 max-sm:h-10"
					onclick={onDownload}
					disabled={!resultUrl || processing}
				>
					<DownloadIcon data-icon="inline-start" />
					{t('preview.download')}
				</Button>
			</div>
		</div>
	</Card.Footer>
</Card.Root>

<style>
	.checkerboard {
		background-color: var(--background);
		background-image:
			linear-gradient(
				45deg,
				color-mix(in oklch, var(--foreground) 7%, transparent) 25%,
				transparent 25%
			),
			linear-gradient(
				-45deg,
				color-mix(in oklch, var(--foreground) 7%, transparent) 25%,
				transparent 25%
			),
			linear-gradient(
				45deg,
				transparent 75%,
				color-mix(in oklch, var(--foreground) 7%, transparent) 75%
			),
			linear-gradient(
				-45deg,
				transparent 75%,
				color-mix(in oklch, var(--foreground) 7%, transparent) 75%
			);
		background-size: 20px 20px;
		background-position:
			0 0,
			0 10px,
			10px -10px,
			-10px 0;
	}
</style>
