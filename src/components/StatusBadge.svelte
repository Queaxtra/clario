<script lang="ts">
	import DangerTriangleIcon from '../lib/components/icons/danger-triangle-linear.svelte';
	import * as Alert from '../lib/components/ui/alert';
	import { Progress } from '../lib/components/ui/progress';
	import { Spinner } from '../lib/components/ui/spinner';
	import { t, tError } from '../lib/i18n';

	type Status = 'idle' | 'loading' | 'ready' | 'running' | 'error';

	let {
		status,
		progress = 0,
		message = '',
		file = ''
	}: { status: Status; progress?: number; message?: string; file?: string } = $props();
</script>

{#if status === 'loading'}
	<div
		class="flex w-full items-start gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-3"
	>
		<Spinner class="mt-0.5 size-4 text-muted-foreground" />
		<div class="flex min-w-0 flex-1 flex-col gap-2">
			<div class="flex items-baseline justify-between gap-3">
				<span class="text-sm font-medium text-foreground">{t('status.preparing')}</span>
				<span class="text-xs text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
			</div>
			<Progress value={progress} class="h-1" />
			{#if file}
				<p class="truncate text-xs text-muted-foreground">{file}</p>
			{/if}
		</div>
	</div>
{:else if status === 'error'}
	<Alert.Root variant="destructive">
		<DangerTriangleIcon />
		<Alert.Title>{t('status.errorTitle')}</Alert.Title>
		<Alert.Description>{message ? tError(message) : t('status.errorFallback')}</Alert.Description>
	</Alert.Root>
{/if}
