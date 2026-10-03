<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import BatchStrip from '../components/BatchStrip.svelte';
	import DeveloperPanel from '../components/DeveloperPanel.svelte';
	import Footer from '../components/Footer.svelte';
	import Header from '../components/Header.svelte';
	import Navbar from '../components/Navbar.svelte';
	import OptionsPanel from '../components/OptionsPanel.svelte';
	import PreviewPanel from '../components/PreviewPanel.svelte';
	import StatusBadge from '../components/StatusBadge.svelte';
	import UploadDropzone from '../components/UploadDropzone.svelte';
	import {
		BackgroundRemovalEngine,
		DEFAULT_RUN_OPTIONS,
		detectCapabilities,
		loadModelPreference,
		saveModelPreference,
		type Background,
		type Capabilities,
		type Device,
		type Dtype,
		type EngineEvent,
		type MaskMode,
		type OutputFormat,
		type RunOptions
	} from '../lib/engine';
	import { createZip, type ZipEntry } from '../lib/zip.js';

	type BackgroundKind = 'transparent' | 'white' | 'black' | 'custom' | 'gradient' | 'image';
	type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';
	type BadgeStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error';
	type ItemStatus = 'pending' | 'processing' | 'done' | 'error';

	interface ResultMeta {
		dimensions: string;
		size: string;
		time: string;
		cached: boolean;
		tiles: number;
	}

	interface Item {
		id: string;
		file: File;
		originalUrl: string;
		status: ItemStatus;
		resultUrl: string;
		blob: Blob | null;
		meta: ResultMeta | null;
		error: string;
		/** option revision the current result was rendered with */
		version: number;
	}

	const engine = new BackgroundRemovalEngine();
	let unsubscribe: (() => void) | null = null;

	let capabilities = $state<Capabilities | null>(null);
	let device = $state<Device>('wasm');
	let dtype = $state<Dtype>('q8');
	let modelStatus = $state<ModelStatus>('idle');
	let modelBusy = $state(false);
	let phase = $state('');
	let progress = $state(0);
	let progressFile = $state('');
	let modelError = $state('');
	let uploadError = $state('');

	let items = $state<Item[]>([]);
	let activeIndex = $state(0);
	let devMode = $state(false);

	let options = $state({
		backgroundKind: 'transparent' as BackgroundKind,
		customColor: '#ffcc00',
		gradientFrom: '#1f2937',
		gradientTo: '#4b5563',
		gradientAngle: 135,
		backgroundImageUrl: '',
		backgroundImageName: '',
		format: 'image/png' as OutputFormat,
		maskMode: 'minmax' as MaskMode,
		feather: 0,
		quality: 92,
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
	});

	// queue is intentionally not reactive, only modelBusy drives the UI
	let queue: number[] = [];
	let drainPromise: Promise<void> | null = null;
	let optionsVersion = 0;
	let generation = 0;
	let idSeq = 0;

	const active = $derived(items[activeIndex] ?? null);
	const badgeStatus = $derived<BadgeStatus>(
		modelStatus === 'ready' && modelBusy ? 'running' : modelStatus
	);

	onMount(async () => {
		unsubscribe = engine.on(handleEvent);
		capabilities = await detectCapabilities();
		const preference = loadModelPreference(capabilities);
		device = preference.device;
		dtype = preference.dtype;
		await applyModel(device, dtype);
	});

	onDestroy(() => {
		unsubscribe?.();
		engine.dispose();
		for (const item of items) {
			revoke(item.originalUrl);
			revoke(item.resultUrl);
		}
		revoke(options.backgroundImageUrl);
	});

	function handleEvent(event: EngineEvent) {
		if (event.type === 'progress') {
			phase = event.phase;
			if (typeof event.progress === 'number') progress = event.progress;
			if (event.file) progressFile = event.file;
			return;
		}

		if (event.type === 'ready') {
			modelStatus = 'ready';
			phase = '';
			progress = 100;
			progressFile = '';
			requestAll();
			return;
		}

		// run errors are surfaced per item, only model errors land here
		if (event.type === 'error' && !event.id) {
			modelStatus = 'error';
			modelError = event.message;
		}
	}

	async function applyModel(nextDevice: Device, nextDtype: Dtype) {
		device = nextDevice;
		dtype = nextDtype;
		saveModelPreference(nextDevice, nextDtype);
		modelStatus = 'loading';
		phase = 'download';
		progress = 0;
		progressFile = '';
		modelError = '';

		try {
			await engine.init(device, dtype);
		} catch (error) {
			modelStatus = 'error';
			modelError = error instanceof Error ? error.message : String(error);
		}
	}

	function addFiles(files: File[]) {
		const images = files.filter((file) => file.type.startsWith('image/'));
		if (!images.length) {
			uploadError = 'Choose an image file (PNG, JPEG, or WebP).';
			return;
		}

		uploadError = '';
		clearItems();
		items = images.map((file) => ({
			id: `img-${++idSeq}`,
			file,
			originalUrl: URL.createObjectURL(file),
			status: 'pending' as const,
			resultUrl: '',
			blob: null,
			meta: null,
			error: '',
			version: -1
		}));
		activeIndex = 0;
		requestAll();
	}

	function clearItems() {
		generation++;
		queue.length = 0;
		for (const item of items) {
			revoke(item.originalUrl);
			revoke(item.resultUrl);
		}
		items = [];
		activeIndex = 0;
	}

	function handleReset() {
		clearItems();
		uploadError = '';
		modelError = '';
	}

	function selectItem(index: number) {
		activeIndex = index;
		const item = items[index];
		if (item && item.status === 'done' && item.version !== optionsVersion) enqueue(index);
	}

	function commitOptions() {
		optionsVersion++;
		if (active) enqueue(activeIndex);
	}

	function requestAll() {
		for (let i = 0; i < items.length; i++) enqueue(i);
	}

	function enqueue(index: number) {
		if (index < 0 || index >= items.length) return;
		if (!queue.includes(index)) queue.push(index);
		void drain();
	}

	function drain(): Promise<void> {
		if (!drainPromise) {
			modelBusy = true;
			drainPromise = runQueue().finally(() => {
				drainPromise = null;
				modelBusy = false;
			});
		}
		return drainPromise;
	}

	async function runQueue() {
		while (queue.length) {
			await processItem(queue.shift()!);
		}
	}

	async function processItem(index: number) {
		const item = items[index];
		if (!item || modelStatus !== 'ready') return;

		const gen = generation;
		const version = optionsVersion;
		const runOptions = buildOptions();

		item.status = 'processing';
		item.error = '';

		try {
			const bitmap = await createImageBitmap(item.file);
			const result = await engine.run(bitmap, runOptions, item.id);
			if (gen !== generation || items[index] !== item) return;

			revoke(item.resultUrl);
			item.resultUrl = URL.createObjectURL(result.blob);
			item.blob = result.blob;
			item.meta = {
				dimensions: `${result.width} x ${result.height} px`,
				size: formatBytes(result.blob.size),
				time: `${Math.round(result.ms)} ms`,
				cached: result.cached,
				tiles: result.tiles
			};
			item.version = version;
			item.status = 'done';
		} catch (error) {
			if (gen !== generation || items[index] !== item) return;
			item.status = 'error';
			item.error = error instanceof Error ? error.message : String(error);
		}
	}

	async function syncAll() {
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.status !== 'done' || item.version !== optionsVersion) enqueue(i);
		}
		if (drainPromise) await drainPromise;
	}

	function buildOptions(): Required<RunOptions> {
		return {
			...DEFAULT_RUN_OPTIONS,
			background: resolveBackground(),
			format: options.format,
			maskMode: options.maskMode,
			feather: Number(options.feather),
			quality: options.quality / 100,
			tiled: options.tiled,
			threshold: Number(options.threshold),
			gamma: Number(options.gamma),
			invert: options.invert,
			edgeRefine: options.edgeRefine,
			padding: Number(options.padding),
			shadow: options.shadow,
			border: Number(options.border),
			borderColor: options.borderColor,
			watermark: options.watermark
		};
	}

	function resolveBackground(): Background {
		if (options.backgroundKind === 'white') return { type: 'color', color: '#ffffff' };
		if (options.backgroundKind === 'black') return { type: 'color', color: '#000000' };
		if (options.backgroundKind === 'custom') return { type: 'color', color: options.customColor };
		if (options.backgroundKind === 'gradient') {
			return {
				type: 'gradient',
				from: options.gradientFrom,
				to: options.gradientTo,
				angle: Number(options.gradientAngle)
			};
		}
		if (options.backgroundKind === 'image' && options.backgroundImageUrl) {
			return { type: 'image', url: options.backgroundImageUrl };
		}
		return { type: 'transparent' };
	}

	function extension(): string {
		if (options.format === 'image/webp') return 'webp';
		if (options.format === 'image/jpeg') return 'jpg';
		return 'png';
	}

	function outputName(file: File): string {
		const base = (file.name.replace(/\.[^.]+$/, '') || 'image').replace(/\s+/g, '-');
		return `${base}-no-background.${extension()}`;
	}

	function downloadItem(item: Item | null) {
		if (!item || !item.resultUrl) return;
		triggerDownload(item.resultUrl, outputName(item.file));
	}

	async function downloadAll() {
		if (!items.length) return;
		await syncAll();

		const completed = items.filter((item) => item.status === 'done' && item.resultUrl);
		if (completed.length <= 1) {
			downloadItem(completed[0] ?? null);
			return;
		}

		const used = new Set<string>();
		const entries: ZipEntry[] = [];
		for (const item of completed) {
			const response = await fetch(item.resultUrl);
			const data = new Uint8Array(await response.arrayBuffer());
			entries.push({ name: uniqueName(outputName(item.file), used), data });
		}

		triggerDownload(URL.createObjectURL(createZip(entries)), 'clario-cutouts.zip', true);
	}

	function uniqueName(name: string, used: Set<string>): string {
		if (!used.has(name)) {
			used.add(name);
			return name;
		}

		const dot = name.lastIndexOf('.');
		const base = dot === -1 ? name : name.slice(0, dot);
		const ext = dot === -1 ? '' : name.slice(dot);
		let n = 2;
		let candidate = `${base}-${n}${ext}`;
		while (used.has(candidate)) candidate = `${base}-${++n}${ext}`;
		used.add(candidate);
		return candidate;
	}

	function triggerDownload(url: string, filename: string, revokeAfter = false) {
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		link.remove();
		if (revokeAfter) setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}

	function formatBytes(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function revoke(url: string) {
		if (url) URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<meta
		name="description"
		content="Free AI background remover that runs in your browser. Remove image backgrounds and download transparent PNGs in seconds. No signup, no upload needed."
	/>
	<meta
		name="keywords"
		content="background remover, remove background, AI background remover, transparent PNG, image cutout, remove bg, free background eraser, bulk background removal, no upload background remover"
	/>
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<Navbar bind:devMode />

	<main
		class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 max-sm:gap-6 max-sm:py-8 sm:py-12"
	>
		<Header />

		<StatusBadge status={badgeStatus} {progress} message={modelError} file={progressFile} />

		<div class="flex flex-col gap-5">
			{#if active}
				<PreviewPanel
					originalUrl={active.originalUrl}
					resultUrl={active.resultUrl}
					resultBlob={active.blob}
					resultName={outputName(active.file)}
					processing={active.status === 'processing'}
					error={active.error}
					index={activeIndex}
					count={items.length}
					canDownloadAll={items.length > 1}
					onDownload={() => downloadItem(active)}
					onDownloadAll={downloadAll}
					onReset={handleReset}
				/>

				{#if items.length > 1}
					<BatchStrip {items} {activeIndex} onSelect={selectItem} />
				{/if}

				<OptionsPanel {options} onCommit={commitOptions} />
			{:else}
				<UploadDropzone onSelectFiles={addFiles} disabled={modelStatus === 'error'} />
				{#if uploadError}
					<p class="text-sm text-destructive" role="alert">{uploadError}</p>
				{/if}
			{/if}

			{#if devMode}
				<DeveloperPanel
					{options}
					onCommit={commitOptions}
					{capabilities}
					{device}
					{dtype}
					{modelStatus}
					processing={modelBusy}
					{phase}
					{progress}
					{progressFile}
					errorMessage={modelError}
					meta={active?.meta ?? null}
					onApplyModel={applyModel}
				/>
			{/if}
		</div>
	</main>

	<Footer />
</div>
