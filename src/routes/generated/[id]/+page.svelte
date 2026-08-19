<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ApprovedVisualLessonPlayer from '$lib/components/ApprovedVisualLessonPlayer.svelte';
	import HomeButton from '$lib/components/HomeButton.svelte';
	import type { VisualLessonFixture } from '$lib/visuals/types';
	import type { GenerationJobView } from '$lib/generation/types';
	import { adaptApprovedVisualArtifact } from '$lib/visuals/artifact-adapter';

	let { data } = $props();
	let lesson = $state<VisualLessonFixture>();
	let message = $state('Opening the approved lesson…');

	onMount(async () => {
		try {
			const response = await fetch(resolve('/api/generation/[id]', { id: data.id }));
			if (!response.ok) throw new Error('This generated lesson is no longer available.');
			const job = (await response.json()) as GenerationJobView;
			if (job.phase !== 'approved' || !job.artifact) {
				throw new Error('This lesson has not been approved.');
			}
			lesson = adaptApprovedVisualArtifact(job.artifact);
		} catch (error) {
			message = error instanceof Error ? error.message : 'This lesson could not be opened.';
		}
	});
</script>

<svelte:head>
	<title>{lesson ? `${lesson.title} — Doceo` : 'Opening your lesson — Doceo'}</title>
</svelte:head>

{#if lesson}
	<ApprovedVisualLessonPlayer {lesson} />
{:else}
	<main class="loading">
		<HomeButton onclick={() => goto(resolve('/'))} />
		<p>{message}</p>
		<a href={resolve('/')}>Back home</a>
	</main>
{/if}

<style>
	.loading {
		display: grid;
		min-height: 100svh;
		place-content: center;
		gap: 1rem;
		padding: var(--page-gutter);
		background: var(--color-butter);
		color: var(--color-navy);
		text-align: center;
	}
	.loading p {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 5vw, 3.4rem);
		font-weight: 900;
	}
	.loading a {
		color: var(--color-navy);
		font-weight: 900;
	}
</style>
