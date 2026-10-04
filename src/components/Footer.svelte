<script lang="ts">
	import GithubLogo from '../lib/components/icons/github-logo.svelte';
	import { Separator } from '../lib/components/ui/separator';
	import { t } from '../lib/i18n';
</script>

<footer class="w-full">
	<div class="mx-auto w-full max-w-6xl px-4 pb-12 max-sm:pb-8">
		<Separator />
		<div class="flex flex-col gap-2.5 pt-8 max-sm:pt-6">
			<p class="text-sm font-semibold tracking-tight text-foreground">Fatih Yılmaz</p>
			<p class="max-w-md text-sm leading-relaxed text-muted-foreground">
				{t('footer.description')}
			</p>
			<a
				href="https://github.com/queaxtra/clario"
				target="_blank"
				rel="noreferrer"
				class="mt-1 inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				<GithubLogo class="size-3.5" />
				{t('footer.source')}
			</a>
		</div>
	</div>
</footer>
