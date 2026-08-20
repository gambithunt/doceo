<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { lessonBoundaryMessage, lessonFailureMessage } from '$lib/lesson-plans/messages';
	import type { LessonPlanJobView, LessonPlanPhase } from '$lib/lesson-plans/types';
	import HomeButton from './HomeButton.svelte';
	import ApprovedVisualLessonPlayer from './ApprovedVisualLessonPlayer.svelte';

	let { id }: { id: string } = $props();
	let job = $state<LessonPlanJobView>();
	let unavailable = $state(false);
	let thoughtIndex = $state(0);

	const thoughts = [
		'Reading only the evidence already gathered…',
		'Making every visual step earn its place…',
		'Looking for unsupported leaps…',
		'Checking whether this can become something playable…'
	];
	const phases: LessonPlanPhase[] = ['queued', 'auditing', 'planning', 'reviewing', 'ready'];
	const activeIndex = $derived(job ? Math.max(0, phases.indexOf(job.phase)) : 0);
	const rejected = $derived(job?.phase === 'rejected');
	const failed = $derived(job?.phase === 'failed');
	const terminal = $derived(rejected || failed || job?.phase === 'ready');
	const backHref = $derived(job ? resolve('/answers/[id]', { id: job.answerId }) : resolve('/'));
	const terminalMessage = $derived(
		unavailable
			? 'This session lost track of the lesson maker. Your sourced answer is unchanged.'
			: rejected
				? lessonBoundaryMessage(job?.boundaryStage ?? 'evidence')
				: failed
					? lessonFailureMessage()
					: job?.message
	);

	onMount(() => {
		let stopped = false;
		const thoughtTimer = window.setInterval(() => {
			thoughtIndex = (thoughtIndex + 1) % thoughts.length;
		}, 3200);
		async function poll() {
			try {
				const response = await fetch(resolve('/api/lesson-plans/[id]', { id }));
				if (!response.ok) throw new Error('Lesson plan unavailable');
				job = (await response.json()) as LessonPlanJobView;
				if (!stopped && !['ready', 'rejected', 'failed'].includes(job.phase)) {
					window.setTimeout(poll, 850);
				}
			} catch {
				unavailable = true;
			}
		}
		void poll();
		return () => {
			stopped = true;
			window.clearInterval(thoughtTimer);
		};
	});
</script>

<svelte:head>
	<title>Turning it into a lesson — Doceo</title>
</svelte:head>

{#if job?.phase === 'ready' && job.lesson}
	<ApprovedVisualLessonPlayer lesson={job.lesson} />
{:else}
	<main>
		<HomeButton onclick={() => goto(resolve('/'))} />
		<a class="wordmark" href={resolve('/')}>Doceo</a>
		<section class:terminal-state={terminal || unavailable} aria-live="polite">
			<p class="eyebrow">FROM ANSWER TO EXPERIENCE</p>
			<h1>
				{#if job?.phase === 'ready'}
					The lesson blueprint passed
				{:else if rejected}
					The answer is ready. The lesson isn’t.
				{:else if failed || unavailable}
					The lesson maker stopped safely
				{:else}
					Shaping something you can play
				{/if}
			</h1>

			<div class:finished={terminal || unavailable} class="workbench" aria-hidden="true">
				<div class="loop teal"></div>
				<div class="loop orange"></div>
				<div class="core"></div>
				{#each phases.slice(0, 4) as phase, index (phase)}
					<span class:lit={index <= activeIndex}></span>
				{/each}
			</div>

			{#if terminal || unavailable}
				<div class="boundary-card">
					<p class="boundary-label">NOTHING WAS LOST</p>
					<p class="message">{terminalMessage}</p>
					<a class="back" href={backHref}>{job ? 'Back to the answer' : 'Back home'}</a>
				</div>
			{:else}
				<p class="message">{job?.message ?? 'Gathering the saved evidence…'}</p>
				<p class="aside">{thoughts[thoughtIndex]}</p>
				<p class="promise">No unsupported lesson will be shown.</p>
			{/if}
		</section>
	</main>
{/if}

<style>
	main {
		position: relative;
		isolation: isolate;
		display: grid;
		min-height: 100svh;
		place-items: center;
		overflow: hidden;
		padding: clamp(6rem, 11vw, 8rem) var(--page-gutter) 4rem;
		background:
			radial-gradient(circle at 13% 20%, rgb(255 196 38 / 90%) 0 0.13rem, transparent 0.17rem),
			radial-gradient(circle at 78% 68%, rgb(86 196 211 / 78%) 0 0.11rem, transparent 0.15rem),
			var(--color-navy);
		background-size:
			6.4rem 5.3rem,
			7.2rem 6.1rem,
			auto;
		color: var(--color-cream);
	}
	.wordmark {
		position: absolute;
		top: 1.4rem;
		left: var(--page-gutter);
		color: inherit;
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, 3.4rem);
		font-weight: 900;
		letter-spacing: -0.07em;
		text-decoration: none;
	}
	section {
		width: min(100%, 58rem);
		text-align: center;
	}
	.eyebrow {
		margin: 0 0 0.8rem;
		color: var(--color-teal-light);
		font-weight: 950;
		letter-spacing: 0.14em;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2.8rem, 8vw, 6.2rem);
		letter-spacing: -0.06em;
		line-height: 0.94;
		text-wrap: balance;
	}
	section.terminal-state h1 {
		max-width: 13ch;
		margin-inline: auto;
		font-size: clamp(2.6rem, 6vw, 5rem);
	}
	.workbench {
		position: relative;
		width: min(78vw, 26rem);
		aspect-ratio: 1.5;
		margin: 2.2rem auto 1.5rem;
	}
	.workbench.finished {
		width: min(58vw, 18rem);
		margin-block: 1.3rem;
	}
	.workbench.finished .loop {
		animation-play-state: paused;
	}
	.loop {
		position: absolute;
		inset: 18% 2%;
		border: 0.2rem solid;
		border-radius: 50%;
		animation: wander 5s ease-in-out infinite alternate;
	}
	.loop.teal {
		border-color: var(--color-teal);
	}
	.loop.orange {
		inset: 4% 20%;
		border-color: var(--color-orange);
		transform: rotate(58deg);
		animation-delay: -2s;
	}
	.core {
		position: absolute;
		inset: 32% 38%;
		border: 0.22rem solid var(--color-cream);
		border-radius: 50%;
		background: var(--color-yellow);
	}
	.workbench span {
		display: inline-block;
		position: relative;
		width: 0.8rem;
		height: 0.8rem;
		margin: 47% 0.5rem 0;
		border: 0.12rem solid var(--color-cream);
		border-radius: 50%;
		background: var(--color-navy);
	}
	.workbench span.lit {
		background: var(--color-orange);
		box-shadow: 0 0 0 0.32rem rgb(255 122 24 / 20%);
	}
	.message,
	.aside,
	.promise {
		max-width: 42rem;
		margin: 0.8rem auto;
		font-size: 1.15rem;
		font-weight: 750;
	}
	.boundary-card {
		width: min(100%, 38rem);
		margin: 0 auto;
		padding: clamp(1.25rem, 4vw, 2rem);
		border: 0.18rem solid var(--color-cream);
		border-radius: 1.8rem;
		background: var(--color-cream);
		box-shadow: 0.5rem 0.55rem 0 var(--color-orange);
		color: var(--color-navy);
	}
	.boundary-label {
		margin: 0;
		color: var(--color-teal-dark);
		font-size: 0.78rem;
		font-weight: 950;
		letter-spacing: 0.12em;
	}
	.boundary-card .message {
		max-width: 31rem;
		font-size: clamp(1.05rem, 2.5vw, 1.3rem);
		line-height: 1.45;
	}
	.aside {
		color: var(--color-teal-light);
	}
	.promise {
		font-size: 0.9rem;
		opacity: 0.8;
	}
	.back {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.85rem 1.1rem;
		border: 0.14rem solid var(--color-navy);
		border-radius: 999px;
		background: var(--color-yellow);
		color: var(--color-navy);
		font-weight: 900;
		text-decoration: none;
	}
	@keyframes wander {
		to {
			transform: rotate(10deg) scale(1.04);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.loop {
			animation: none;
		}
	}
</style>
