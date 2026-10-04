<script lang="ts">
	import ArrowUpRightIcon from '../lib/components/icons/arrow-right-up-linear.svelte';
	import * as Card from '../lib/components/ui/card';
	import { Label } from '../lib/components/ui/label';
	import { Progress } from '../lib/components/ui/progress';
	import { Separator } from '../lib/components/ui/separator';
	import * as Select from '../lib/components/ui/select';
	import { Slider } from '../lib/components/ui/slider';
	import { Switch } from '../lib/components/ui/switch';
	import * as Tooltip from '../lib/components/ui/tooltip';
	import { t, tError } from '../lib/i18n';
	import {
		MODEL_LICENSE,
		type Capabilities,
		type Device,
		type Dtype,
		type MaskMode,
		type OutputFormat
	} from '../lib/engine';

	interface Options {
		format: OutputFormat;
		maskMode: MaskMode;
		feather: number;
		quality: number;
		tiled: boolean;
		threshold: number;
		gamma: number;
		invert: boolean;
		edgeRefine: boolean;
	}

	let {
		options,
		onCommit,
		capabilities,
		device,
		dtype,
		modelStatus,
		processing,
		phase,
		progress,
		progressFile,
		errorMessage,
		meta,
		onApplyModel
	}: {
		options: Options;
		onCommit: () => void;
		capabilities: Capabilities | null;
		device: Device;
		dtype: Dtype;
		modelStatus: string;
		processing: boolean;
		phase: string;
		progress: number;
		progressFile: string;
		errorMessage: string;
		meta: { dimensions: string; size: string; time: string; cached: boolean; tiles: number } | null;
		onApplyModel: (device: Device, dtype: Dtype) => void;
	} = $props();

	const yesNo = (value: boolean | undefined) => (value ? t('common.yes') : t('common.no'));
</script>

<Tooltip.Provider>
	<Card.Root>
		<Card.Header>
			<Card.Title>{t('developer.title')}</Card.Title>
			<Card.Description>{t('developer.description')}</Card.Description>
		</Card.Header>

		<Card.Content class="gap-6">
			<section class="flex flex-col gap-3">
				<h3 class="text-xs font-medium text-muted-foreground">{t('developer.session')}</h3>

				<dl class="grid grid-cols-2 gap-x-6 gap-y-3 max-sm:gap-x-4 sm:grid-cols-4">
					<div class="flex flex-col gap-0.5">
						<dt class="text-xs text-muted-foreground">{t('developer.model')}</dt>
						<dd class="text-sm font-medium">{t(`developer.status.${modelStatus}`)}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="text-xs text-muted-foreground">{t('developer.phase')}</dt>
						<dd class="text-sm font-medium">
							{phase ? t(`developer.phases.${phase}`) : t('common.idle')}
						</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="text-xs text-muted-foreground">{t('developer.processing')}</dt>
						<dd class="text-sm font-medium">{yesNo(processing)}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="text-xs text-muted-foreground">{t('developer.provider')}</dt>
						<dd class="font-mono text-sm font-medium">{device}</dd>
					</div>
				</dl>

				{#if modelStatus === 'loading'}
					<div class="flex flex-col gap-1.5">
						<div class="flex items-baseline justify-between gap-3">
							<span class="truncate text-xs text-muted-foreground"
								>{progressFile || t('developer.modelFiles')}</span
							>
							<span class="text-xs text-muted-foreground tabular-nums">{Math.round(progress)}%</span
							>
						</div>
						<Progress value={progress} class="h-1" />
					</div>
				{/if}

				{#if errorMessage}
					<p
						class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive"
					>
						{tError(errorMessage)}
					</p>
				{/if}
			</section>

			<Separator />

			<section class="flex flex-col gap-3">
				<h3 class="text-xs font-medium text-muted-foreground">{t('developer.hardware')}</h3>

				<dl class="grid grid-cols-2 gap-x-6 gap-y-3 max-sm:gap-x-4 sm:grid-cols-4">
					<div class="flex flex-col gap-0.5">
						<dt class="flex items-center gap-1 text-xs text-muted-foreground">
							{t('developer.webgpu')}
							<Tooltip.InfoHint text={t('developer.webgpuHint')} />
						</dt>
						<dd class="text-sm font-medium">{yesNo(capabilities?.webgpu)}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="flex items-center gap-1 text-xs text-muted-foreground">
							{t('developer.simd')}
							<Tooltip.InfoHint text={t('developer.simdHint')} />
						</dt>
						<dd class="text-sm font-medium">{yesNo(capabilities?.simd)}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="flex items-center gap-1 text-xs text-muted-foreground">
							{t('developer.threads')}
							<Tooltip.InfoHint text={t('developer.threadsHint')} />
						</dt>
						<dd class="text-sm font-medium">{yesNo(capabilities?.threads)}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="flex items-center gap-1 text-xs text-muted-foreground">
							{t('developer.cores')}
							<Tooltip.InfoHint text={t('developer.coresHint')} />
						</dt>
						<dd class="text-sm font-medium tabular-nums">
							{capabilities?.hardwareConcurrency ?? '?'}
						</dd>
					</div>
				</dl>
			</section>

			<Separator />

			<section class="flex flex-col gap-3">
				<h3 class="text-xs font-medium text-muted-foreground">{t('developer.model')}</h3>

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<span class="flex items-center gap-1.5">
							<Label for="dev-provider">{t('developer.executionProvider')}</Label>
							<Tooltip.InfoHint text={t('developer.executionProviderHint')} />
						</span>
						<Select.Root
							type="single"
							value={device}
							items={[
								{ value: 'webgpu', label: 'webgpu' },
								{ value: 'wasm', label: 'wasm' }
							]}
							onValueChange={(value) => onApplyModel(value as Device, dtype)}
						>
							<Select.Trigger id="dev-provider" class="w-full">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="webgpu" label="webgpu">webgpu</Select.Item>
								<Select.Item value="wasm" label="wasm">wasm</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-1.5">
						<span class="flex items-center gap-1.5">
							<Label for="dev-precision">{t('developer.precision')}</Label>
							<Tooltip.InfoHint text={t('developer.precisionHint')} />
						</span>
						<Select.Root
							type="single"
							value={dtype}
							items={[
								{ value: 'q8', label: 'q8 (44 MB)' },
								{ value: 'fp16', label: 'fp16 (88 MB)' },
								{ value: 'fp32', label: 'fp32 (176 MB)' }
							]}
							onValueChange={(value) => onApplyModel(device, value as Dtype)}
						>
							<Select.Trigger id="dev-precision" class="w-full">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="q8" label="q8 (44 MB)">q8 (44 MB)</Select.Item>
								<Select.Item value="fp16" label="fp16 (88 MB)">fp16 (88 MB)</Select.Item>
								<Select.Item value="fp32" label="fp32 (176 MB)">fp32 (176 MB)</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<a
					class="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
					href={MODEL_LICENSE.url}
					target="_blank"
					rel="noreferrer"
				>
					{MODEL_LICENSE.name}
					<ArrowUpRightIcon class="size-3" />
				</a>
			</section>

			<Separator />

			<section class="flex flex-col gap-4">
				<h3 class="text-xs font-medium text-muted-foreground">{t('developer.processing')}</h3>

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<span class="flex items-center gap-1.5">
							<Label for="dev-mask">{t('developer.maskMode')}</Label>
							<Tooltip.InfoHint text={t('developer.maskModeHint')} />
						</span>
						<Select.Root
							type="single"
							value={options.maskMode}
							items={[
								{ value: 'minmax', label: t('developer.maskModes.minmax') },
								{ value: 'sigmoid', label: t('developer.maskModes.sigmoid') }
							]}
							onValueChange={(value) => {
								options.maskMode = value as MaskMode;
								onCommit();
							}}
						>
							<Select.Trigger id="dev-mask" class="w-full">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="minmax" label={t('developer.maskModes.minmax')}
									>{t('developer.maskModes.minmax')}</Select.Item
								>
								<Select.Item value="sigmoid" label={t('developer.maskModes.sigmoid')}
									>{t('developer.maskModes.sigmoid')}</Select.Item
								>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-1.5">
						<span class="flex items-center gap-1.5">
							<Label for="dev-format">{t('developer.outputFormat')}</Label>
							<Tooltip.InfoHint text={t('developer.outputFormatHint')} />
						</span>
						<Select.Root
							type="single"
							value={options.format}
							items={[
								{ value: 'image/png', label: t('developer.formats.png') },
								{ value: 'image/webp', label: t('developer.formats.webp') },
								{ value: 'image/jpeg', label: t('developer.formats.jpeg') }
							]}
							onValueChange={(value) => {
								options.format = value as OutputFormat;
								onCommit();
							}}
						>
							<Select.Trigger id="dev-format" class="w-full">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="image/png" label={t('developer.formats.png')}
									>{t('developer.formats.png')}</Select.Item
								>
								<Select.Item value="image/webp" label={t('developer.formats.webp')}
									>{t('developer.formats.webp')}</Select.Item
								>
								<Select.Item value="image/jpeg" label={t('developer.formats.jpeg')}
									>{t('developer.formats.jpeg')}</Select.Item
								>
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-1.5">
							<Label>{t('developer.cutoff')}</Label>
							<Tooltip.InfoHint text={t('developer.cutoffHint')} />
						</span>
						<span class="text-xs text-muted-foreground tabular-nums">
							{Math.round(options.threshold * 100)}%
						</span>
					</div>
					<Slider
						type="single"
						value={options.threshold}
						max={1}
						step={0.01}
						onValueChange={(value) => (options.threshold = value)}
						onValueCommit={onCommit}
					/>
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-1.5">
							<Label>{t('developer.gamma')}</Label>
							<Tooltip.InfoHint text={t('developer.gammaHint')} />
						</span>
						<span class="text-xs text-muted-foreground tabular-nums">
							{options.gamma.toFixed(1)}
						</span>
					</div>
					<Slider
						type="single"
						value={options.gamma}
						min={0.2}
						max={3}
						step={0.1}
						onValueChange={(value) => (options.gamma = value)}
						onValueCommit={onCommit}
					/>
				</div>

				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
				>
					<span class="flex items-center gap-1.5">
						<Label for="dev-tiled">{t('developer.tiling')}</Label>
						<Tooltip.InfoHint text={t('developer.tilingHint')} />
					</span>
					<Switch id="dev-tiled" bind:checked={options.tiled} onCheckedChange={onCommit} />
				</div>

				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
				>
					<span class="flex items-center gap-1.5">
						<Label for="dev-invert">{t('developer.invert')}</Label>
						<Tooltip.InfoHint text={t('developer.invertHint')} />
					</span>
					<Switch id="dev-invert" bind:checked={options.invert} onCheckedChange={onCommit} />
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-1.5">
							<Label>{t('developer.feather')}</Label>
							<Tooltip.InfoHint text={t('developer.featherHint')} />
						</span>
						<span class="text-xs text-muted-foreground tabular-nums">{options.feather} px</span>
					</div>
					<Slider
						type="single"
						value={options.feather}
						max={8}
						step={1}
						onValueChange={(value) => (options.feather = value)}
						onValueCommit={onCommit}
					/>
				</div>

				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
				>
					<span class="flex items-center gap-1.5">
						<Label for="dev-edge">{t('developer.refine')}</Label>
						<Tooltip.InfoHint text={t('developer.refineHint')} />
					</span>
					<Switch
						id="dev-edge"
						disabled={options.feather === 0}
						bind:checked={options.edgeRefine}
						onCheckedChange={onCommit}
					/>
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-1.5">
							<Label>{t('developer.quality')}</Label>
							<Tooltip.InfoHint text={t('developer.qualityHint')} />
						</span>
						<span class="text-xs text-muted-foreground tabular-nums">{options.quality}%</span>
					</div>
					<Slider
						type="single"
						value={options.quality}
						max={100}
						step={1}
						onValueChange={(value) => (options.quality = value)}
						onValueCommit={onCommit}
					/>
				</div>
			</section>

			<Separator />

			<section class="flex flex-col gap-3">
				<h3 class="text-xs font-medium text-muted-foreground">{t('developer.lastResult')}</h3>

				{#if meta}
					<dl class="grid grid-cols-2 gap-x-6 gap-y-3 max-sm:gap-x-4 sm:grid-cols-3 lg:grid-cols-5">
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">{t('developer.time')}</dt>
							<dd class="font-mono text-sm font-medium tabular-nums">{meta.time}</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">{t('developer.resolution')}</dt>
							<dd class="font-mono text-sm font-medium tabular-nums">{meta.dimensions}</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">{t('developer.fileSize')}</dt>
							<dd class="font-mono text-sm font-medium tabular-nums">{meta.size}</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">{t('developer.inference')}</dt>
							<dd class="text-sm font-medium">
								{meta.cached ? t('developer.inferenceReused') : t('developer.inferenceFull')}
							</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">{t('developer.tiles')}</dt>
							<dd class="font-mono text-sm font-medium tabular-nums">{meta.tiles}</dd>
						</div>
					</dl>
				{:else}
					<p class="text-sm text-muted-foreground">{t('developer.noResult')}</p>
				{/if}
			</section>
		</Card.Content>
	</Card.Root>
</Tooltip.Provider>
