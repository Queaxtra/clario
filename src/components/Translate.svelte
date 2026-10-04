<script lang="ts">
	import { onMount } from 'svelte';
	import GlobalIcon from '../lib/components/icons/global-linear.svelte';
	import * as Select from '../lib/components/ui/select';
	import { getLocale, initLocale, LOCALES, setLocale, t, type Locale } from '../lib/i18n';

	const items = $derived(LOCALES.map((code) => ({ value: code, label: t(`language.${code}`) })));

	onMount(() => initLocale());

	function change(value: unknown) {
		if (value) setLocale(value as Locale);
	}
</script>

<Select.Root type="single" value={getLocale()} {items} onValueChange={change}>
	<Select.Trigger
		size="sm"
		aria-label={t('language.label')}
		title={t(`language.${getLocale()}`)}
		class="size-8 justify-center gap-0 rounded-[min(var(--radius-md),10px)] border-transparent px-0 text-muted-foreground shadow-none hover:bg-muted hover:text-foreground max-sm:size-9 dark:bg-transparent dark:hover:bg-muted/50 [&>svg:last-child]:hidden"
	>
		<GlobalIcon class="size-3.5" />
	</Select.Trigger>
	<Select.Content>
		{#each items as item (item.value)}
			<Select.Item value={item.value} label={item.label}>{item.label}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
