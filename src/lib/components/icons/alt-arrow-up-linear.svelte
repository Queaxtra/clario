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
	<path
		fill="none"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
		d="M19 15L12 9L5 15"
	/>
</svg>
