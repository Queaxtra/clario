<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

{@render children()}

<style>
	@import url('https://fonts.cdnfonts.com/css/sf-pro-display');

	:global(body) {
		font-family: 'SF Pro Display', sans-serif;
		margin: 0;
		padding: 0;
		justify-content: center;
		background-color: var(--background);
	}
</style>
