<script lang="ts">
	import InfoCircleIcon from '#lib/components/icons/info-circle-linear.svelte';
	import { cn } from '#lib/utils.js';
	import Content from './tooltip-content.svelte';
	import Root from './tooltip.svelte';
	import Trigger from './tooltip-trigger.svelte';

	let { text, class: className }: { text: string; class?: string } = $props();
</script>

<Root>
	<Trigger
		aria-label={text}
		class={cn(
			'inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none',
			className
		)}
	>
		<InfoCircleIcon class="size-3.5" />
	</Trigger>
	<Content side="top" class="max-w-60 leading-relaxed text-pretty">{text}</Content>
</Root>
