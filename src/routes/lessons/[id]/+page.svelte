<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import ApprovedVisualLessonPlayer from '$lib/components/ApprovedVisualLessonPlayer.svelte';
	import { loadVisualHistory } from '$lib/visuals/history';

	let { data } = $props();
	let savedLesson = $state<typeof data.lesson>();
	let unavailable = $state(false);
	const lesson = $derived(savedLesson ?? data.lesson);
	const ready = $derived(!data.requestedVersion || Boolean(savedLesson) || unavailable);

	onMount(() => {
		if (!data.requestedVersion) return;
		const saved = loadVisualHistory(window.localStorage).find(
			(entry) =>
				entry.lesson.id === data.lesson.id && entry.lesson.artifactVersion === data.requestedVersion
		);
		if (saved) savedLesson = saved.lesson;
		else if (data.lesson.artifactVersion === data.requestedVersion) savedLesson = data.lesson;
		else unavailable = true;
	});
</script>

<svelte:head>
	<title>{lesson.title} — Doceo</title>
	<meta name="description" content="A focused, independently reviewed visual lesson from Doceo." />
</svelte:head>

{#if !ready}
	<main class="loading"><p>Opening your saved lesson…</p></main>
{:else if unavailable}
	<main class="loading">
		<h1>That saved version is not on this device.</h1>
		<a href={resolve('/')}>Back home</a>
	</main>
{:else}
	<ApprovedVisualLessonPlayer {lesson} />
{/if}

<style>
	.loading {
		display: grid;
		min-height: 100svh;
		place-content: center;
		padding: var(--page-gutter);
		background: var(--color-butter);
		color: var(--color-navy);
		text-align: center;
	}
	.loading h1 {
		font-family: var(--font-display);
	}
	.loading a {
		color: var(--color-navy);
		font-weight: 900;
	}
</style>
