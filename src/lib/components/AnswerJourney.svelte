<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { AnswerJobView } from '$lib/answers/types';
	import HomeButton from './HomeButton.svelte';

	let { id }: { id: string } = $props();
	let job = $state<AnswerJobView>();
	let unavailable = $state(false);
	let thoughtIndex = $state(0);

	const thoughts = [
		'Looking past the first easy answer…',
		'Finding sources that disagree well…',
		'Keeping only the part we can support…'
	];

	onMount(() => {
		let stopped = false;
		const thoughtTimer = window.setInterval(() => {
			thoughtIndex = (thoughtIndex + 1) % thoughts.length;
		}, 2600);

		async function poll() {
			try {
				const response = await fetch(resolve('/api/answers/[id]', { id }));
				if (!response.ok) throw new Error('Answer unavailable');
				job = (await response.json()) as AnswerJobView;
				if (job.phase === 'answered') {
					await goto(resolve('/answers/[id]', { id }));
					return;
				}
				if (!stopped) window.setTimeout(poll, 650);
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
	<title>Following your curiosity — Doceo</title>
</svelte:head>

<main>
	<HomeButton onclick={() => goto(resolve('/'))} />
	<a class="wordmark" href={resolve('/')}>Doceo</a>
	<section aria-live="polite">
		<p class="eyebrow">A QUICK ANSWER FIRST</p>
		<h1>{unavailable ? 'Your question is still here' : 'Following the thread'}</h1>
		<div class="search-motion" aria-hidden="true">
			<span></span><span></span><span></span><span></span>
		</div>
		<p class="message">
			{unavailable
				? 'The local researcher lost its place. Nothing uncertain will be presented as fact.'
				: (job?.message ?? 'Finding a small set of trustworthy sources…')}
		</p>
		{#if !unavailable}<p class="aside">{thoughts[thoughtIndex]}</p>{/if}
		{#if unavailable}<a class="back" href={resolve('/')}>Back to your curiosities</a>{/if}
	</section>
</main>

<style>
	main {
		position: relative;
		display: grid;
		min-height: 100svh;
		place-items: center;
		overflow: hidden;
		padding: 6rem var(--page-gutter) 3rem;
		background:
			radial-gradient(circle at 15% 20%, var(--color-yellow) 0 0.12rem, transparent 0.16rem),
			radial-gradient(circle at 80% 70%, var(--color-teal) 0 0.11rem, transparent 0.15rem),
			var(--color-navy);
		background-size:
			6rem 5rem,
			7rem 6rem,
			auto;
		color: var(--color-cream);
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
	section {
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
		font-size: clamp(3rem, 9vw, 6.5rem);
		letter-spacing: -0.06em;
		line-height: 0.92;
	}
	.search-motion {
		display: flex;
		justify-content: center;
		gap: 0.8rem;
		margin: clamp(2.5rem, 8vw, 5rem) auto 2rem;
	}
	.search-motion span {
		width: clamp(1rem, 3vw, 1.8rem);
		aspect-ratio: 1;
		border: 0.16rem solid var(--color-cream);
		border-radius: 50%;
		background: var(--color-yellow);
		animation: bob 1.2s ease-in-out infinite alternate;
	}
	.search-motion span:nth-child(2) {
		background: var(--color-orange);
		animation-delay: -0.3s;
	}
	.search-motion span:nth-child(3) {
		background: var(--color-teal);
		animation-delay: -0.6s;
	}
	.search-motion span:nth-child(4) {
		animation-delay: -0.9s;
	}
	.message {
		margin: 0;
		font-size: clamp(1.1rem, 2.5vw, 1.45rem);
		font-weight: 850;
	}
	.aside {
		margin: 0.7rem 0 0;
		color: var(--color-teal-light);
		font-weight: 750;
	}
	.back {
		display: inline-block;
		margin-top: 1.5rem;
		color: var(--color-yellow);
		font-weight: 900;
	}
	@keyframes bob {
		to {
			transform: translateY(-1rem) rotate(10deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.search-motion span {
			animation: none;
		}
	}
</style>
