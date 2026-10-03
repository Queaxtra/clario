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
	<g
		fill="none"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	>
		<path d="M4 12.9L7.14286 16.5L15 7.5" />
		<path d="M20 7.5625L11.4283 16.5625L11 16" />
	</g>
</svg>
