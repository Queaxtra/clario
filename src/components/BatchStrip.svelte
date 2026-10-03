<script lang="ts">
	import DangerTriangleIcon from '../lib/components/icons/danger-triangle-linear.svelte';
	import { Spinner } from '../lib/components/ui/spinner';
	import { cn } from '../lib/utils.js';

	interface Item {
		id: string;
		originalUrl: string;
		resultUrl: string;
		status: string;
	}

	let {
		items,
		activeIndex,
		onSelect
	}: { items: Item[]; activeIndex: number; onSelect: (index: number) => void } = $props();
</script>

<div class="flex gap-2 overflow-x-auto pb-1" aria-label="Selected images">
	{#each items as item, i (item.id)}
		<button
			type="button"
			onclick={() => onSelect(i)}
			aria-current={i === activeIndex}
			aria-label={`Image ${i + 1}`}
			class={cn(
				'relative size-16 shrink-0 overflow-hidden rounded-md border bg-muted/30 transition-colors',
				i === activeIndex ? 'border-foreground/50' : 'border-border hover:border-foreground/25'
			)}
		>
			<img src={item.resultUrl || item.originalUrl} alt="" class="size-full object-cover" />
			{#if item.status === 'processing'}
				<span class="absolute inset-0 grid place-items-center bg-background/60">
					<Spinner class="size-4" />
				</span>
			{:else if item.status === 'error'}
				<span class="absolute inset-0 grid place-items-center bg-background/70 text-destructive">
					<DangerTriangleIcon class="size-4" />
				</span>
			{/if}
		</button>
	{/each}
</div>
