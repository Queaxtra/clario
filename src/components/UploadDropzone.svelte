<script lang="ts">
	import { onMount } from 'svelte';
	import GalleryAddIcon from '../lib/components/icons/gallery-add-linear.svelte';
	import { Button } from '../lib/components/ui/button';
	import { Input } from '../lib/components/ui/input';
	import { t } from '../lib/i18n';
	import { cn } from '../lib/utils.js';
	import examplePicture from '../assets/example.png?enhanced';

	let {
		onSelectFiles,
		disabled = false
	}: { onSelectFiles: (files: File[]) => void; disabled?: boolean } = $props();

	let input = $state<HTMLInputElement | null>(null);
	let dragging = $state(false);
	let exampleBusy = $state(false);
	let url = $state('');
	let urlBusy = $state(false);
	let urlError = $state('');

	function handlePaste(event: ClipboardEvent) {
		if (disabled) return;
		const images = event.clipboardData?.files
			? Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'))
			: [];
		if (!images.length) return;
		event.preventDefault();
		onSelectFiles(images);
	}

	onMount(() => {
		window.addEventListener('paste', handlePaste);
		return () => window.removeEventListener('paste', handlePaste);
	});

	async function loadFromUrl(event: SubmitEvent) {
		event.preventDefault();
		if (disabled || urlBusy) return;

		let parsed: URL;
		try {
			parsed = new URL(url.trim());
		} catch {
			urlError = 'upload.errors.invalidUrl';
			return;
		}
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			urlError = 'upload.errors.unsupportedProtocol';
			return;
		}

		urlBusy = true;
		urlError = '';
		try {
			const blob = await fetchImage(parsed.href);
			const name = parsed.pathname.split('/').pop() || 'image.png';
			onSelectFiles([new File([blob], name, { type: blob.type || 'image/png' })]);
			url = '';
		} catch {
			urlError = 'upload.errors.loadFailed';
		} finally {
			urlBusy = false;
		}
	}

	// direct fetch keeps the request off our server when the host allows CORS
	// otherwise fall back to the same-origin proxy
	async function fetchImage(href: string): Promise<Blob> {
		try {
			const direct = await fetch(href, { mode: 'cors' });
			if (direct.ok) {
				const blob = await direct.blob();
				if (blob.type.startsWith('image/')) return blob;
			}
		} catch {
			// cross-origin or offline, try the proxy
		}

		const proxied = await fetch(`/api/image?url=${encodeURIComponent(href)}`);
		if (!proxied.ok) throw new Error('image unavailable');
		const blob = await proxied.blob();
		if (!blob.type.startsWith('image/')) throw new Error('not an image');
		return blob;
	}

	function handleChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const selected = target.files ? Array.from(target.files) : [];
		target.value = '';
		if (selected.length) onSelectFiles(selected);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (disabled) return;
		const dropped = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
		if (dropped.length) onSelectFiles(dropped);
	}

	async function tryExample() {
		if (disabled || exampleBusy) return;
		exampleBusy = true;
		try {
			const response = await fetch(examplePicture.img.src);
			const blob = await response.blob();
			onSelectFiles([new File([blob], 'example.png', { type: blob.type || 'image/png' })]);
		} finally {
			exampleBusy = false;
		}
	}
</script>

<div
	class={cn(
		'flex flex-col items-center gap-6 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center transition-colors max-sm:gap-5 max-sm:px-4 max-sm:py-12',
		dragging && 'border-foreground/30 bg-muted/40',
		disabled && 'opacity-60'
	)}
	role="region"
	aria-label={t('upload.region')}
	ondragover={(event) => {
		event.preventDefault();
		if (!disabled) dragging = true;
	}}
	ondragleave={() => (dragging = false)}
	ondrop={handleDrop}
>
	<span
		class="grid size-12 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-xs"
	>
		<GalleryAddIcon class="size-5" aria-hidden="true" />
	</span>

	<div class="flex flex-col gap-1">
		<p class="text-sm font-medium text-foreground">{t('upload.title')}</p>
		<p class="text-xs text-muted-foreground">{t('upload.hint')}</p>
	</div>

	<Button onclick={() => input?.click()} {disabled}>{t('upload.browse')}</Button>
	<input
		bind:this={input}
		class="sr-only"
		type="file"
		accept="image/*"
		multiple
		onchange={handleChange}
		{disabled}
	/>

	<form class="flex w-full max-w-xs items-center gap-2" onsubmit={loadFromUrl}>
		<Input
			bind:value={url}
			type="url"
			placeholder={t('upload.urlPlaceholder')}
			aria-label={t('upload.urlLabel')}
			class="h-8 text-sm"
			disabled={disabled || urlBusy}
		/>
		<Button type="submit" variant="outline" size="sm" disabled={disabled || urlBusy}
			>{t('upload.load')}</Button
		>
	</form>
	{#if urlError}
		<p class="-mt-4 text-xs text-destructive" role="alert">{t(urlError)}</p>
	{/if}

	<div class="flex w-full max-w-xs items-center gap-3">
		<span class="h-px flex-1 bg-border"></span>
		<span class="text-xs text-muted-foreground">{t('common.or')}</span>
		<span class="h-px flex-1 bg-border"></span>
	</div>

	<button
		type="button"
		class="inline-flex items-center gap-2 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
		onclick={tryExample}
		disabled={disabled || exampleBusy}
	>
		<enhanced:img
			src={examplePicture}
			alt=""
			class="size-6 rounded-md object-cover ring-1 ring-border"
		/>
		<span>{t('upload.example')}</span>
	</button>

	<p class="text-xs text-muted-foreground">{t('upload.paste')}</p>
</div>
