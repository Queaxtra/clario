<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	let {
		size = 24,
		class: className,
		...rest
	}: SVGAttributes<SVGSVGElement> & { size?: number } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	class={className}
	{...rest}
>
	<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
		<circle cx="12" cy="12" r="10" />
		<path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" />
	</g>
</svg>
