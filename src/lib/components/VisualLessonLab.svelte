<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CosmologyTimeline from './CosmologyTimeline.svelte';
	import HomeButton from './HomeButton.svelte';
	import ImmuneResponseSequence from './ImmuneResponseSequence.svelte';
	import { visualFixtures } from '$lib/visuals/fixtures';

	type Topic = keyof typeof visualFixtures;

	let topic = $state<Topic>('cosmology');
	let frameIndex = $state(0);
	const lesson = $derived(visualFixtures[topic]);
	const frame = $derived(lesson.frames[frameIndex]);
	const atEnd = $derived(frameIndex === lesson.frames.length - 1);

	function selectTopic(nextTopic: Topic) {
		topic = nextTopic;
		frameIndex = 0;
	}

	function advance() {
		frameIndex = atEnd ? 0 : frameIndex + 1;
	}
</script>

<main class="lab-shell">
	<HomeButton onclick={() => goto(resolve('/'))} />

	<header>
		<a class="wordmark" href={resolve('/')}>Doceo</a>
		<div class="topic-switch" aria-label="Choose visual lesson">
			<button
				class:active={topic === 'cosmology'}
				type="button"
				onclick={() => selectTopic('cosmology')}>Cosmos</button
			>
			<button
				class:active={topic === 'vaccines'}
				type="button"
				onclick={() => selectTopic('vaccines')}>Immune memory</button
			>
		</div>
	</header>

	<section class="intro">
		<p>{frame.kicker}</p>
		<h1>{frame.title}</h1>
	</section>

	<section class="visual-stage">
		{#if lesson.kind === 'timeline'}
			<CosmologyTimeline nodes={lesson.nodes} activeStateIds={frame.activeStateIds} />
		{:else}
			<ImmuneResponseSequence nodes={lesson.nodes} activeStateIds={frame.activeStateIds} />
		{/if}
	</section>

	<footer>
		<div class="progress" aria-label={`Step ${frameIndex + 1} of ${lesson.frames.length}`}>
			{#each lesson.frames.keys() as index (index)}
				<span class:active={index === frameIndex}></span>
			{/each}
		</div>
		<p>{frame.caption}</p>
		<button class="next-button" type="button" onclick={advance}>
			<span>{atEnd ? 'See it again' : 'Next'}</span>
			<svg viewBox="0 0 32 32" role="presentation"><path d="M6 16h20m-8-8 8 8-8 8" /></svg>
		</button>
	</footer>
</main>

<style>
	.lab-shell {
		position: relative;
		isolation: isolate;
		min-height: 100svh;
		overflow: hidden;
		padding: clamp(1.1rem, 3vw, 2rem) var(--page-gutter) clamp(2rem, 5vw, 4rem);
		background:
			radial-gradient(circle at 12% 16%, rgb(255 201 40 / 78%) 0 0.12rem, transparent 0.16rem),
			radial-gradient(circle at 74% 42%, rgb(21 157 172 / 60%) 0 0.1rem, transparent 0.14rem),
			var(--color-butter);
		background-size:
			6rem 5rem,
			7rem 6.2rem,
			auto;
		color: var(--color-navy);
	}

	.lab-shell::before {
		position: absolute;
		z-index: -1;
		top: -12rem;
		left: 28%;
		width: 68%;
		height: 18rem;
		border: 0.24rem solid var(--color-orange);
		border-radius: 50%;
		content: '';
		transform: rotate(-4deg);
	}

	header {
		display: flex;
		width: min(100%, var(--content-width));
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 auto;
		padding-right: clamp(4.5rem, 11vw, 7rem);
	}

	.wordmark {
		color: var(--color-navy);
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, 3.4rem);
		font-weight: 900;
		letter-spacing: -0.07em;
		text-decoration: none;
	}

	.topic-switch {
		display: flex;
		gap: 0.4rem;
		padding: 0.32rem;
		border: 0.13rem solid var(--color-navy);
		border-radius: 999px;
		background: var(--color-cream);
	}

	.topic-switch button {
		min-height: 2.35rem;
		padding: 0.35rem 0.85rem;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--color-navy);
		cursor: pointer;
		font-size: 0.78rem;
		font-weight: 850;
	}

	.topic-switch button.active {
		background: var(--color-teal);
		color: var(--color-cream);
	}

	.intro {
		width: min(100%, 64rem);
		margin: clamp(2.5rem, 6vw, 5rem) auto clamp(1.4rem, 3vw, 2.2rem);
		text-align: center;
	}

	.intro p {
		margin: 0 0 0.45rem;
		color: var(--color-teal);
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.intro h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2.7rem, 7vw, 6rem);
		font-weight: 900;
		letter-spacing: -0.065em;
		line-height: 0.92;
		text-wrap: balance;
	}

	.visual-stage {
		width: min(100%, 72rem);
		margin: 0 auto;
	}

	footer {
		display: grid;
		width: min(100%, 58rem);
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 0.8rem 1.4rem;
		margin: clamp(1.5rem, 4vw, 2.5rem) auto 0;
	}

	footer > p {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1rem, 2.2vw, 1.35rem);
		font-weight: 750;
		line-height: 1.25;
	}

	.progress {
		display: flex;
		grid-column: 1 / -1;
		justify-content: center;
		gap: 0.42rem;
	}

	.progress span {
		width: 0.65rem;
		height: 0.65rem;
		border: 0.12rem solid var(--color-navy);
		border-radius: 50%;
		background: transparent;
		transition:
			width 220ms ease,
			background 220ms ease;
	}

	.progress span.active {
		width: 2rem;
		border-radius: 999px;
		background: var(--color-orange);
	}

	.next-button {
		display: flex;
		min-height: 3.4rem;
		align-items: center;
		gap: 0.75rem;
		padding: 0.65rem 0.75rem 0.65rem 1.2rem;
		border: 0.15rem solid var(--color-navy);
		border-radius: 999px;
		background: var(--color-yellow);
		box-shadow: 0.28rem 0.34rem 0 var(--color-orange);
		color: var(--color-navy);
		cursor: pointer;
		font-weight: 900;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.next-button:hover {
		box-shadow: 0.4rem 0.46rem 0 var(--color-orange);
		transform: translateY(-0.08rem);
	}
	.next-button:active {
		box-shadow: 0.12rem 0.14rem 0 var(--color-orange);
		transform: translateY(0.12rem);
	}
	.next-button svg {
		width: 2rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-width: 2.5;
	}

	@media (max-width: 42rem) {
		header {
			align-items: flex-start;
			padding-right: 3.8rem;
		}
		.topic-switch {
			flex-direction: column;
			border-radius: 1.3rem;
		}
		.intro {
			margin-top: 2rem;
		}
		footer {
			grid-template-columns: 1fr;
		}
		.next-button {
			justify-self: center;
		}
	}
</style>
