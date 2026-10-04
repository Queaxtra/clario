<script lang="ts">
	import { untrack } from 'svelte';
	import CloseCircleIcon from '../lib/components/icons/close-circle-linear.svelte';
	import GalleryAddIcon from '../lib/components/icons/gallery-add-linear.svelte';
	import { Button } from '../lib/components/ui/button';
	import * as Card from '../lib/components/ui/card';
	import { Input } from '../lib/components/ui/input';
	import { Separator } from '../lib/components/ui/separator';
	import { Slider } from '../lib/components/ui/slider';
	import { Switch } from '../lib/components/ui/switch';
	import { Toggle } from '../lib/components/ui/toggle';
	import { t } from '../lib/i18n';
	import { cn } from '../lib/utils.js';

	type BackgroundKind = 'transparent' | 'white' | 'black' | 'custom' | 'gradient' | 'image';

	interface Options {
		backgroundKind: BackgroundKind;
		customColor: string;
		gradientFrom: string;
		gradientTo: string;
		gradientAngle: number;
		backgroundImageUrl: string;
		backgroundImageName: string;
		padding: number;
		shadow: boolean;
		border: number;
		borderColor: string;
		watermark: string;
	}

	let { options, onCommit }: { options: Options; onCommit: () => void } = $props();

	let imageInput = $state<HTMLInputElement | null>(null);

	const kinds: { value: BackgroundKind; key: string }[] = [
		{ value: 'transparent', key: 'options.kinds.transparent' },
		{ value: 'white', key: 'options.kinds.white' },
		{ value: 'black', key: 'options.kinds.black' },
		{ value: 'custom', key: 'options.kinds.custom' },
		{ value: 'gradient', key: 'options.kinds.gradient' },
		{ value: 'image', key: 'options.kinds.image' }
	];

	const initialKind = untrack(() => options.backgroundKind);

	let pressed = $state<Record<BackgroundKind, boolean>>({
		transparent: initialKind === 'transparent',
		white: initialKind === 'white',
		black: initialKind === 'black',
		custom: initialKind === 'custom',
		gradient: initialKind === 'gradient',
		image: initialKind === 'image'
	});

	function syncPressed(kind: BackgroundKind) {
		for (const option of kinds) pressed[option.value] = option.value === kind;
	}

	function onPressed(kind: BackgroundKind, value: boolean) {
		if (!value) {
			// a radio cannot be deselected, re-assert the current selection
			pressed[kind] = true;
			return;
		}
		if (options.backgroundKind === kind) return;
		options.backgroundKind = kind;
		syncPressed(kind);
		if (kind === 'image' && !options.backgroundImageUrl) imageInput?.click();
		onCommit();
	}

	function swatchStyle(kind: BackgroundKind): string | undefined {
		if (kind === 'custom') return `background-color: ${options.customColor}`;
		if (kind === 'gradient') {
			return `background-image: linear-gradient(${options.gradientAngle}deg, ${options.gradientFrom}, ${options.gradientTo})`;
		}
		if (kind === 'image') {
			return `background-image: url("${options.backgroundImageUrl}"); background-size: cover`;
		}
		return undefined;
	}

	function pickImage(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		target.value = '';
		if (!file) return;

		if (options.backgroundImageUrl) URL.revokeObjectURL(options.backgroundImageUrl);
		options.backgroundImageUrl = URL.createObjectURL(file);
		options.backgroundImageName = file.name;
		onCommit();
	}
</script>

<Card.Root size="sm">
	<Card.Content class="gap-6">
		<div role="group" aria-labelledby="background-label" class="flex flex-col gap-3">
			<span id="background-label" class="text-sm font-medium text-foreground"
				>{t('options.background')}</span
			>

			<div class="flex flex-wrap gap-2">
				{#each kinds as kind (kind.value)}
					<Toggle
						variant="outline"
						size="sm"
						class="max-sm:h-9"
						bind:pressed={pressed[kind.value]}
						onPressedChange={(value) => onPressed(kind.value, value)}
					>
						{#if kind.value === 'image' && !options.backgroundImageUrl}
							<GalleryAddIcon class="size-3.5 shrink-0" />
						{:else}
							<span
								class={cn(
									'size-3.5 shrink-0 rounded-[4px] border border-border',
									kind.value === 'transparent' && 'swatch-transparent',
									kind.value === 'white' && 'bg-white',
									kind.value === 'black' && 'bg-black'
								)}
								style={swatchStyle(kind.value)}
							></span>
						{/if}
						{t(kind.key)}
					</Toggle>
				{/each}
			</div>

			{#if options.backgroundKind === 'custom'}
				<div class="flex items-center gap-2.5 border-t border-border pt-3">
					<input
						type="color"
						bind:value={options.customColor}
						onchange={onCommit}
						class="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
						aria-label={t('options.customColor')}
					/>
					<span class="font-mono text-xs text-muted-foreground uppercase">
						{options.customColor}
					</span>
				</div>
			{/if}

			{#if options.backgroundKind === 'gradient'}
				<div class="flex flex-col gap-3 border-t border-border pt-3">
					<div class="flex items-center gap-2.5">
						<input
							type="color"
							bind:value={options.gradientFrom}
							onchange={onCommit}
							class="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
							aria-label={t('options.gradientStart')}
						/>
						<input
							type="color"
							bind:value={options.gradientTo}
							onchange={onCommit}
							class="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
							aria-label={t('options.gradientEnd')}
						/>
						<span class="font-mono text-xs text-muted-foreground uppercase">
							{options.gradientFrom} / {options.gradientTo}
						</span>
					</div>

					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<span class="text-xs text-muted-foreground">{t('options.angle')}</span>
							<span class="text-xs text-muted-foreground tabular-nums">
								{options.gradientAngle}°
							</span>
						</div>
						<Slider
							type="single"
							value={options.gradientAngle}
							max={360}
							step={15}
							onValueChange={(value) => (options.gradientAngle = value)}
							onValueCommit={onCommit}
						/>
					</div>
				</div>
			{/if}

			{#if options.backgroundKind === 'image'}
				<div class="flex items-center gap-3 border-t border-border pt-3">
					{#if options.backgroundImageUrl}
						<img
							src={options.backgroundImageUrl}
							alt=""
							class="size-9 shrink-0 rounded-md border border-border object-cover"
						/>
						<span class="min-w-0 flex-1 truncate text-xs text-muted-foreground">
							{options.backgroundImageName}
						</span>
						<Button variant="outline" size="sm" onclick={() => imageInput?.click()}
							>{t('options.change')}</Button
						>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={t('options.removeImage')}
							onclick={() => {
								URL.revokeObjectURL(options.backgroundImageUrl);
								options.backgroundImageUrl = '';
								options.backgroundImageName = '';
								onCommit();
							}}
						>
							<CloseCircleIcon />
						</Button>
					{:else}
						<Button variant="outline" size="sm" onclick={() => imageInput?.click()}>
							<GalleryAddIcon data-icon="inline-start" />
							{t('options.chooseImage')}
						</Button>
					{/if}
				</div>
			{/if}

			<input
				bind:this={imageInput}
				type="file"
				accept="image/*"
				class="sr-only"
				onchange={pickImage}
			/>
		</div>

		<Separator />

		<div role="group" aria-labelledby="styling-label" class="flex flex-col gap-4">
			<span id="styling-label" class="text-sm font-medium text-foreground"
				>{t('options.styling')}</span
			>

			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-xs text-muted-foreground">{t('options.padding')}</span>
					<span class="text-xs text-muted-foreground tabular-nums">{options.padding} px</span>
				</div>
				<Slider
					type="single"
					value={options.padding}
					max={160}
					step={4}
					onValueChange={(value) => (options.padding = value)}
					onValueCommit={onCommit}
				/>
			</div>

			<div class="flex items-center justify-between gap-3">
				<div class="flex flex-col gap-0.5">
					<span class="text-xs text-muted-foreground">{t('options.shadow')}</span>
					<span class="text-xs text-muted-foreground/70">{t('options.shadowHint')}</span>
				</div>
				<Switch bind:checked={options.shadow} onCheckedChange={onCommit} />
			</div>

			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-xs text-muted-foreground">{t('options.outline')}</span>
					<span class="text-xs text-muted-foreground tabular-nums">{options.border} px</span>
				</div>
				<div class="flex items-center gap-2.5">
					{#if options.border > 0}
						<input
							type="color"
							bind:value={options.borderColor}
							onchange={onCommit}
							class="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
							aria-label={t('options.outlineColor')}
						/>
					{/if}
					<Slider
						class="flex-1"
						type="single"
						value={options.border}
						max={48}
						step={1}
						onValueChange={(value) => (options.border = value)}
						onValueCommit={onCommit}
					/>
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<span class="text-xs text-muted-foreground">{t('options.watermark')}</span>
				<Input
					bind:value={options.watermark}
					placeholder={t('options.watermarkPlaceholder')}
					class="h-8 text-sm"
					onchange={onCommit}
				/>
			</div>
		</div>
	</Card.Content>
</Card.Root>

<style>
	.swatch-transparent {
		background-color: var(--background);
		background-image:
			linear-gradient(45deg, var(--border) 25%, transparent 25%),
			linear-gradient(-45deg, var(--border) 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, var(--border) 75%),
			linear-gradient(-45deg, transparent 75%, var(--border) 75%);
		background-size: 6px 6px;
		background-position:
			0 0,
			0 3px,
			3px -3px,
			-3px 0;
	}
</style>
