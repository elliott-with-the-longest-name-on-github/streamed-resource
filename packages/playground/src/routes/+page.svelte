<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { LoaderCircleIcon } from '@lucide/svelte';

	let { data } = $props();

	let hide = $state(false);
</script>

<div class="flex flex-col items-center justify-center h-dvh w-dvw">
	{#if !hide}
		{#if data.test.status === 'loading'}
			Loading your data on initial render...
		{:else if data.test.status === 'error'}
			{data.test.error}
		{:else}
			{data.test.data}
		{/if}

		{#if data.test.revalidating}
			<LoaderCircleIcon class="animate-spin" />
		{/if}
	{/if}

	<div class="flex flex-row gap-2">
		<Button class="w-40" onclick={() => invalidateAll()}>invalidate</Button>
		<Button class="w-40" onclick={() => (hide = !hide)}>toggle</Button>
	</div>
</div>
