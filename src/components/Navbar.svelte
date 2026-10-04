<script lang="ts">
	import CodeSquareIcon from '../lib/components/icons/code-square-linear.svelte';
	import GithubLogo from '../lib/components/icons/github-logo.svelte';
	import XLogo from '../lib/components/icons/x-logo.svelte';
	import { Button } from '../lib/components/ui/button';
	import { Toggle } from '../lib/components/ui/toggle';
	import { t } from '../lib/i18n';
	import ThemeToggle from './ThemeToggle.svelte';
	import Translate from './Translate.svelte';

	let { devMode = $bindable(false) }: { devMode?: boolean } = $props();
</script>

<header class="w-full">
	<div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
		<a href="/" class="text-base font-semibold tracking-tight text-foreground">Clario</a>

		<nav class="flex items-center gap-1" aria-label="Clario">
			<Button
				variant="ghost"
				size="icon-sm"
				href="https://github.com/queaxtra"
				target="_blank"
				rel="noreferrer"
				aria-label={t('navbar.github')}
				class="text-muted-foreground hover:text-foreground max-sm:size-9"
			>
				<GithubLogo class="size-3.5" />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				href="https://x.com/queaxtra"
				target="_blank"
				rel="noreferrer"
				aria-label={t('navbar.x')}
				class="text-muted-foreground hover:text-foreground max-sm:size-9"
			>
				<XLogo class="size-3.5" />
			</Button>
			<Translate />
			<ThemeToggle />
			<Toggle
				size="sm"
				bind:pressed={devMode}
				aria-label={t('navbar.devMode')}
				class="rounded-[min(var(--radius-md),10px)] px-0 text-muted-foreground aria-pressed:text-foreground max-sm:size-9"
			>
				<CodeSquareIcon class="size-3.5" />
			</Toggle>
		</nav>
	</div>
</header>
