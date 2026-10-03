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

	const yesNo = (value: boolean | undefined) => (value ? 'yes' : 'no');
</script>

<Tooltip.Provider>
	<Card.Root>
		<Card.Header>
			<Card.Title>Developer</Card.Title>
			<Card.Description>Runtime details, model controls, and the last run.</Card.Description>
		</Card.Header>

		<Card.Content class="gap-6">
			<section class="flex flex-col gap-3">
				<h3 class="text-xs font-medium text-muted-foreground">Session</h3>

				<dl class="grid grid-cols-2 gap-x-6 gap-y-3 max-sm:gap-x-4 sm:grid-cols-4">
					<div class="flex flex-col gap-0.5">
						<dt class="text-xs text-muted-foreground">Model</dt>
						<dd class="text-sm font-medium">{modelStatus}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="text-xs text-muted-foreground">Phase</dt>
						<dd class="text-sm font-medium">{phase || 'idle'}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="text-xs text-muted-foreground">Processing</dt>
						<dd class="text-sm font-medium">{yesNo(processing)}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="text-xs text-muted-foreground">Provider</dt>
						<dd class="font-mono text-sm font-medium">{device}</dd>
					</div>
				</dl>

				{#if modelStatus === 'loading'}
					<div class="flex flex-col gap-1.5">
						<div class="flex items-baseline justify-between gap-3">
							<span class="truncate text-xs text-muted-foreground"
								>{progressFile || 'model files'}</span
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
						{errorMessage}
					</p>
				{/if}
			</section>

			<Separator />

			<section class="flex flex-col gap-3">
				<h3 class="text-xs font-medium text-muted-foreground">Hardware</h3>

				<dl class="grid grid-cols-2 gap-x-6 gap-y-3 max-sm:gap-x-4 sm:grid-cols-4">
					<div class="flex flex-col gap-0.5">
						<dt class="flex items-center gap-1 text-xs text-muted-foreground">
							WebGPU
							<Tooltip.InfoHint
								text="Runs the model on the GPU for a large speed boost when the browser and hardware support it."
							/>
						</dt>
						<dd class="text-sm font-medium">{yesNo(capabilities?.webgpu)}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="flex items-center gap-1 text-xs text-muted-foreground">
							SIMD
							<Tooltip.InfoHint
								text="WebAssembly SIMD speeds up the CPU fallback used when WebGPU is not available."
							/>
						</dt>
						<dd class="text-sm font-medium">{yesNo(capabilities?.simd)}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="flex items-center gap-1 text-xs text-muted-foreground">
							Threads
							<Tooltip.InfoHint
								text="Shared memory threads let the CPU fallback use several cores in parallel."
							/>
						</dt>
						<dd class="text-sm font-medium">{yesNo(capabilities?.threads)}</dd>
					</div>
					<div class="flex flex-col gap-0.5">
						<dt class="flex items-center gap-1 text-xs text-muted-foreground">
							Cores
							<Tooltip.InfoHint
								text="Logical cores reported by the browser, used to size the Wasm thread pool."
							/>
						</dt>
						<dd class="text-sm font-medium tabular-nums">
							{capabilities?.hardwareConcurrency ?? '?'}
						</dd>
					</div>
				</dl>
			</section>

			<Separator />

			<section class="flex flex-col gap-3">
				<h3 class="text-xs font-medium text-muted-foreground">Model</h3>

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<span class="flex items-center gap-1.5">
							<Label for="dev-provider">Execution provider</Label>
							<Tooltip.InfoHint
								text="The backend that runs the model. webgpu is fastest, wasm is the compatible fallback on older devices."
							/>
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
							<Label for="dev-precision">Precision</Label>
							<Tooltip.InfoHint
								text="Weight precision. q8 is the smallest download, fp32 is the most accurate and the largest."
							/>
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
				<h3 class="text-xs font-medium text-muted-foreground">Processing</h3>

				<div class="grid gap-3 sm:grid-cols-2">
					<div class="flex flex-col gap-1.5">
						<span class="flex items-center gap-1.5">
							<Label for="dev-mask">Mask mode</Label>
							<Tooltip.InfoHint
								text="How model output becomes alpha. minmax matches the reference tool, sigmoid gives a softer, more contrasty mapping."
							/>
						</span>
						<Select.Root
							type="single"
							value={options.maskMode}
							items={[
								{ value: 'minmax', label: 'minmax (reference)' },
								{ value: 'sigmoid', label: 'sigmoid' }
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
								<Select.Item value="minmax" label="minmax (reference)"
									>minmax (reference)</Select.Item
								>
								<Select.Item value="sigmoid" label="sigmoid">sigmoid</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-1.5">
						<span class="flex items-center gap-1.5">
							<Label for="dev-format">Output format</Label>
							<Tooltip.InfoHint
								text="PNG keeps transparency, WebP is smaller, JPEG is the smallest but has no transparency."
							/>
						</span>
						<Select.Root
							type="single"
							value={options.format}
							items={[
								{ value: 'image/png', label: 'PNG (lossless)' },
								{ value: 'image/webp', label: 'WebP' },
								{ value: 'image/jpeg', label: 'JPEG' }
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
								<Select.Item value="image/png" label="PNG (lossless)">PNG (lossless)</Select.Item>
								<Select.Item value="image/webp" label="WebP">WebP</Select.Item>
								<Select.Item value="image/jpeg" label="JPEG">JPEG</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-1.5">
							<Label>Cutoff</Label>
							<Tooltip.InfoHint
								text="Makes everything below this alpha level fully transparent. Useful for trimming halos and stray pixels."
							/>
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
							<Label>Gamma</Label>
							<Tooltip.InfoHint
								text="Bends the alpha curve. Below 1 keeps more of the subject, above 1 tightens soft edges."
							/>
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
						<Label for="dev-tiled">High-resolution tiling</Label>
						<Tooltip.InfoHint
							text="Runs the model on overlapping tiles for large images so edges stay sharp. Slower to run."
						/>
					</span>
					<Switch id="dev-tiled" bind:checked={options.tiled} onCheckedChange={onCommit} />
				</div>

				<div
					class="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
				>
					<span class="flex items-center gap-1.5">
						<Label for="dev-invert">Invert mask</Label>
						<Tooltip.InfoHint text="Swaps the subject and the background." />
					</span>
					<Switch id="dev-invert" bind:checked={options.invert} onCheckedChange={onCommit} />
				</div>

				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<span class="flex items-center gap-1.5">
							<Label>Edge feather</Label>
							<Tooltip.InfoHint text="Softens the mask edge by a few pixels. 0 turns it off." />
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
						<Label for="dev-edge">Edge-aware refine</Label>
						<Tooltip.InfoHint
							text="Feathers with a guided filter that follows image edges instead of blurring across them. Needs feather above 0."
						/>
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
							<Label>Quality</Label>
							<Tooltip.InfoHint
								text="Encoder quality for the lossy formats WebP and JPEG. PNG is always lossless and ignores it."
							/>
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
				<h3 class="text-xs font-medium text-muted-foreground">Last result</h3>

				{#if meta}
					<dl class="grid grid-cols-2 gap-x-6 gap-y-3 max-sm:gap-x-4 sm:grid-cols-3 lg:grid-cols-5">
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">Time</dt>
							<dd class="font-mono text-sm font-medium tabular-nums">{meta.time}</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">Resolution</dt>
							<dd class="font-mono text-sm font-medium tabular-nums">{meta.dimensions}</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">File size</dt>
							<dd class="font-mono text-sm font-medium tabular-nums">{meta.size}</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">Inference</dt>
							<dd class="text-sm font-medium">{meta.cached ? 'reused' : 'full'}</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">Tiles</dt>
							<dd class="font-mono text-sm font-medium tabular-nums">{meta.tiles}</dd>
						</div>
					</dl>
				{:else}
					<p class="text-sm text-muted-foreground">No result yet.</p>
				{/if}
			</section>
		</Card.Content>
	</Card.Root>
</Tooltip.Provider>
