<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { AnswerJobView } from '$lib/answers/types';
	import HomeButton from '$lib/components/HomeButton.svelte';

	let { data } = $props();
	let job = $state<AnswerJobView>();
	let message = $state('Opening your answer…');
	let startingLesson = $state(false);
	let lessonError = $state('');
	let retryingAnswer = $state(false);
	let retryError = $state('');

	async function retryAnswer() {
		if (!job || retryingAnswer) return;
		retryingAnswer = true;
		retryError = '';
		try {
			const response = await fetch(resolve('/api/answers'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ question: job.question })
			});
			const result = (await response.json()) as { id?: string; message?: string };
			if (!response.ok || !result.id) throw new Error(result.message ?? 'Retry could not start.');
			await goto(resolve('/answering/[id]', { id: result.id }));
		} catch (error) {
			retryError = error instanceof Error ? error.message : 'Retry could not start.';
			retryingAnswer = false;
		}
	}

	async function makeLesson() {
		if (!job || startingLesson) return;
		startingLesson = true;
		lessonError = '';
		try {
			const response = await fetch(resolve('/api/lesson-plans'), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ answerId: job.id })
			});
			const result = (await response.json()) as { id?: string; message?: string };
			if (!response.ok || !result.id)
				throw new Error(result.message ?? 'The lesson could not start.');
			await goto(resolve('/making-lesson/[id]', { id: result.id }));
		} catch (error) {
			lessonError = error instanceof Error ? error.message : 'The lesson could not start.';
			startingLesson = false;
		}
	}

	onMount(async () => {
		try {
			const response = await fetch(resolve('/api/answers/[id]', { id: data.id }));
			if (!response.ok) throw new Error('This answer is no longer available.');
			const result = (await response.json()) as AnswerJobView;
			if (result.phase !== 'answered' || !result.answer) {
				await goto(resolve('/answering/[id]', { id: data.id }));
				return;
			}
			job = result;
		} catch (error) {
			message = error instanceof Error ? error.message : 'This answer could not be opened.';
		}
	});
</script>

<svelte:head>
	<title>{job ? `${job.question} — Doceo` : 'Opening your answer — Doceo'}</title>
</svelte:head>

<main>
	<HomeButton onclick={() => goto(resolve('/'))} />
	<a class="wordmark" href={resolve('/')}>Doceo</a>
	{#if job?.answer}
		<article>
			<p class="eyebrow">
				{job.answer.sources.length ? 'A QUICK, SOURCED ANSWER' : 'THIS ATTEMPT MISSED'}
			</p>
			<h1>{job.question}</h1>
			<p class="answer">{job.answer.text}</p>
			{#if job.answer.sources.length}
				<div class="sources">
					<p>Checked against</p>
					{#each job.answer.sources as source (source.url)}
						<!-- External evidence URL; SvelteKit resolve() is only for app routes. -->
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a href={source.url} target="_blank" rel="noreferrer">
							<strong>{source.authority}</strong>
							<span>{source.title}</span>
						</a>
					{/each}
				</div>
			{:else}
				<p class="boundary">No source-backed answer was created from this attempt.</p>
			{/if}
			{#if job.answer.sources.length}
				<p class="promise">
					The lesson maker will continue only if both its evidence and visual plan pass review.
				</p>
			{/if}
			<div class="actions">
				{#if job.answer.sources.length}
					<button class="make" onclick={makeLesson} disabled={startingLesson}>
						{startingLesson ? 'Starting the lesson…' : 'Turn this into a lesson'}
						<span aria-hidden="true">→</span>
					</button>
				{:else}
					<button class="make" onclick={retryAnswer} disabled={retryingAnswer}>
						{retryingAnswer ? 'Trying again…' : 'Try this question again'}
						<span aria-hidden="true">→</span>
					</button>
				{/if}
				<a class="another" href={resolve('/')}>Follow another curiosity</a>
			</div>
			{#if lessonError}<p class="lesson-error" role="alert">{lessonError}</p>{/if}
			{#if retryError}<p class="lesson-error" role="alert">{retryError}</p>{/if}
		</article>
	{:else}
		<p class="loading">{message}</p>
	{/if}
</main>

<style>
	main {
		position: relative;
		min-height: 100svh;
		padding: clamp(6rem, 12vw, 9rem) var(--page-gutter) 5rem;
		background:
			radial-gradient(circle at 20% 20%, rgb(255 196 38 / 80%) 0 0.12rem, transparent 0.16rem),
			var(--color-butter);
		background-size:
			6rem 5rem,
			auto;
		color: var(--color-navy);
	}
	.wordmark {
		position: absolute;
		top: 1.4rem;
		left: var(--page-gutter);
		color: inherit;
		font-family: var(--font-display);
		font-size: clamp(2.2rem, 5vw, 3.5rem);
		font-weight: 900;
		letter-spacing: -0.07em;
		text-decoration: none;
	}
	article,
	.loading {
		width: min(100%, 62rem);
		margin: 0 auto;
	}
	.eyebrow {
		margin: 0 0 0.9rem;
		color: var(--color-teal-dark);
		font-weight: 950;
		letter-spacing: 0.13em;
	}
	h1 {
		max-width: 18ch;
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2.8rem, 8vw, 6.5rem);
		letter-spacing: -0.06em;
		line-height: 0.94;
		text-wrap: balance;
	}
	.answer {
		max-width: 44rem;
		margin: clamp(2rem, 5vw, 3.5rem) 0;
		font-size: clamp(1.35rem, 3vw, 2rem);
		font-weight: 750;
		line-height: 1.45;
	}
	.sources {
		display: grid;
		max-width: 44rem;
		gap: 0.7rem;
	}
	.sources > p {
		margin: 0 0 0.2rem;
		font-weight: 900;
	}
	.sources a {
		display: grid;
		padding: 0.8rem 1rem;
		border: 0.14rem solid var(--color-navy);
		border-radius: 1rem;
		background: var(--color-cream);
		color: inherit;
		text-decoration: none;
	}
	.sources span {
		font-size: 0.9rem;
	}
	.promise,
	.boundary {
		max-width: 44rem;
		margin: 2rem 0 0;
		padding-top: 1rem;
		border-top: 0.12rem solid rgb(5 31 68 / 25%);
		font-weight: 750;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		margin-top: 2rem;
	}
	.make,
	.another {
		display: inline-flex;
		gap: 0.7rem;
		align-items: center;
		padding: 0.9rem 1.2rem;
		border: 0.14rem solid var(--color-navy);
		border-radius: 999px;
		color: inherit;
		font: inherit;
		font-weight: 900;
		text-decoration: none;
	}
	.make {
		background: var(--color-yellow);
		box-shadow: 0.3rem 0.35rem 0 var(--color-orange);
		cursor: pointer;
	}
	.make span {
		font-size: 1.35rem;
	}
	.make:disabled {
		cursor: progress;
		opacity: 0.72;
	}
	.another {
		background: var(--color-cream);
	}
	.lesson-error {
		max-width: 44rem;
		color: #8b2a12;
		font-weight: 850;
	}
	.loading {
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 900;
	}
</style>
