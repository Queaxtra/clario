<script lang="ts">
	import { onMount } from 'svelte';
	import MoonIcon from '../components/icons/moon-linear.svelte';
	import SunIcon from '../components/icons/sun-linear.svelte';
	import { Button } from '../components/ui/button';
	import { resolveTheme, toggleTheme, type Theme } from './theme';

	let theme = $state<Theme>('light');

	// sync after hydration, the pre-paint script in app.html already applied the class
	onMount(() => {
		theme = resolveTheme();
	});

	function toggle() {
		theme = toggleTheme(theme);
	}
</script>

<Button
	variant="ghost"
	size="icon-sm"
	onclick={toggle}
	aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	class="text-muted-foreground hover:text-foreground max-sm:size-9"
>
	{#if theme === 'dark'}
		<SunIcon class="size-3.5" />
	{:else}
		<MoonIcon class="size-3.5" />
	{/if}
</Button>
