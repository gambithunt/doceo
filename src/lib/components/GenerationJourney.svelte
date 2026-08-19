<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { GenerationJobView, GenerationPhase } from '$lib/generation/types';
	import HomeButton from './HomeButton.svelte';

	let { id }: { id: string } = $props();
	let job = $state<GenerationJobView>();
	let unavailable = $state(false);
	let thoughtIndex = $state(0);

	const thoughts = [
		'Finding the clearest shape…',
		'Making every step earn its place…',
		'Checking the picture against the evidence…',
		'Looking for anything that could mislead you…'
	];
	const phaseOrder: GenerationPhase[] = [
		'queued',
		'preflight',
		'drafting',
		'reviewing',
		'approved'
	];
	const activeIndex = $derived(job ? phaseOrder.indexOf(job.phase) : 0);
	const terminal = $derived(job?.phase === 'rejected' || job?.phase === 'failed');

	onMount(() => {
		let stopped = false;
		const thoughtTimer = window.setInterval(() => {
			thoughtIndex = (thoughtIndex + 1) % thoughts.length;
		}, 3600);

		async function poll() {
			try {
				const response = await fetch(resolve('/api/generation/[id]', { id }));
				if (!response.ok) throw new Error('Job unavailable');
				job = (await response.json()) as GenerationJobView;
				if (job.phase === 'approved') {
					await goto(resolve('/generated/[id]', { id }));
					return;
				}
				if (!stopped && job.phase !== 'rejected' && job.phase !== 'failed') {
					window.setTimeout(poll, 1400);
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
	<title>Making your lesson — Doceo</title>
</svelte:head>

<main>
	<HomeButton onclick={() => goto(resolve('/'))} />
	<a class="wordmark" href={resolve('/')}>Doceo</a>

	<section class="making" aria-live="polite">
		<p class="eyebrow">MAKING SOMETHING YOU CAN PLAY</p>
		<h1>{terminal || unavailable ? 'This one needs another try' : 'A lesson is taking shape'}</h1>

		<div class="workbench" aria-hidden="true">
			<div class="orbit one"></div>
			<div class="orbit two"></div>
			<div class="core"></div>
			{#each phaseOrder.slice(0, 4) as phase, index (phase)}
				<span
					class:lit={index <= activeIndex}
					style={`--x:${8 + index * 27}%; --y:${10 + (index % 2) * 65}%`}
				></span>
			{/each}
		</div>

		{#if unavailable}
			<p class="message">
				The local maker lost track of this lesson. Nothing unreviewed was shown.
			</p>
		{:else if terminal}
			<p class="message">{job?.message}</p>
		{:else}
			<p class="message">{job?.message ?? 'Gathering the pieces…'}</p>
			<p class="aside">{thoughts[thoughtIndex]}</p>
		{/if}

		{#if terminal || unavailable}
			<a class="try-again" href={resolve('/')}>Try a different curiosity</a>
		{:else}
			<p class="promise">You will only see it if it passes review.</p>
		{/if}
	</section>
</main>

<style>
	main {
		position: relative;
		isolation: isolate;
		display: grid;
		min-height: 100svh;
		place-items: center;
		overflow: hidden;
		padding: clamp(5rem, 10vw, 7rem) var(--page-gutter) 3rem;
		background:
			radial-gradient(circle at 11% 18%, rgb(255 196 38 / 90%) 0 0.13rem, transparent 0.17rem),
			radial-gradient(circle at 78% 62%, rgb(86 196 211 / 78%) 0 0.11rem, transparent 0.15rem),
			var(--color-navy);
		background-size:
			6.4rem 5.3rem,
			7.2rem 6.1rem,
			auto;
		color: var(--color-cream);
	}

	main::before,
	main::after {
		position: absolute;
		z-index: -1;
		width: 74vw;
		height: 24vw;
		border: 0.22rem solid var(--color-orange);
		border-radius: 50%;
		content: '';
		transform: rotate(-8deg);
	}
	main::before {
		top: -12vw;
		left: -12vw;
	}
	main::after {
		right: -20vw;
		bottom: -15vw;
		border-color: var(--color-teal);
	}

	.wordmark {
		position: absolute;
		top: clamp(1rem, 2.5vw, 1.8rem);
		left: var(--page-gutter);
		color: var(--color-cream);
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, 3.4rem);
		font-weight: 900;
		letter-spacing: -0.07em;
		text-decoration: none;
	}

	.making {
		width: min(100%, 48rem);
		text-align: center;
	}
	.eyebrow {
		margin: 0 0 0.8rem;
		color: var(--color-teal-light);
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.14em;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2.8rem, 8vw, 6.4rem);
		letter-spacing: -0.06em;
		line-height: 0.92;
		text-wrap: balance;
	}

	.workbench {
		position: relative;
		width: min(76vw, 25rem);
		aspect-ratio: 1.45;
		margin: clamp(2rem, 6vw, 4rem) auto 2rem;
	}
	.orbit {
		position: absolute;
		inset: 15% 2%;
		border: 0.22rem solid var(--color-teal);
		border-radius: 50%;
		animation: wander 5s ease-in-out infinite alternate;
	}
	.orbit.two {
		inset: 3% 18%;
		border-color: var(--color-orange);
		transform: rotate(64deg);
		animation-delay: -2s;
	}
	.core {
		position: absolute;
		inset: 30% 35%;
		border: 0.25rem solid var(--color-cream);
		border-radius: 50%;
		background: var(--color-yellow);
		box-shadow: 0.55rem 0.55rem 0 var(--color-orange);
		animation: breathe 2.2s ease-in-out infinite;
	}
	.workbench span {
		position: absolute;
		left: var(--x);
		bottom: var(--y);
		width: 1rem;
		aspect-ratio: 1;
		border: 0.16rem solid var(--color-cream);
		border-radius: 50%;
		background: transparent;
		transition:
			background 400ms ease,
			transform 400ms ease;
	}
	.workbench span.lit {
		background: var(--color-yellow);
		transform: scale(1.45);
	}

	.message {
		min-height: 1.7em;
		margin: 0;
		color: var(--color-cream);
		font-size: clamp(1.1rem, 2.5vw, 1.45rem);
		font-weight: 850;
		text-wrap: balance;
	}
	.aside,
	.promise {
		margin: 0.75rem 0 0;
		color: var(--color-teal-light);
		font-size: 0.9rem;
		font-weight: 700;
	}
	.promise {
		color: var(--color-yellow);
	}
	.try-again {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.85rem 1.15rem;
		border: 0.14rem solid var(--color-cream);
		border-radius: 999px;
		background: var(--color-yellow);
		box-shadow: 0.3rem 0.35rem 0 var(--color-orange);
		color: var(--color-navy);
		font-weight: 900;
		text-decoration: none;
	}

	@keyframes wander {
		to {
			transform: rotate(12deg) scale(1.04);
		}
	}
	@keyframes breathe {
		50% {
			transform: scale(1.08) rotate(4deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.orbit,
		.core {
			animation: none;
		}
	}
</style>
