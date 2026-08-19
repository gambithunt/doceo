<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { VisualLessonFixture } from '$lib/visuals/types';
	import { saveApprovedVisualLesson, saveVisualCheckOutcome } from '$lib/visuals/history';
	import ApprovedLessonCheck from './ApprovedLessonCheck.svelte';
	import CosmologyTimeline from './CosmologyTimeline.svelte';
	import HomeButton from './HomeButton.svelte';
	import ImmuneResponseSequence from './ImmuneResponseSequence.svelte';
	import SoapContainmentSequence from './SoapContainmentSequence.svelte';

	type Props = { lesson: VisualLessonFixture };
	let { lesson }: Props = $props();
	let frameIndex = $state(0);
	let savedVersion = $state('');
	let showCheck = $state(false);
	const frame = $derived(lesson.frames[frameIndex]);
	const atEnd = $derived(frameIndex === lesson.frames.length - 1);

	$effect(() => {
		if (!browser || !atEnd || savedVersion === lesson.artifactVersion) return;
		saveApprovedVisualLesson(window.localStorage, lesson);
		savedVersion = lesson.artifactVersion;
	});

	function advance() {
		frameIndex = atEnd ? 0 : frameIndex + 1;
	}

	function recordCheckAnswer(responseId: string, supported: boolean) {
		if (!browser) return;
		saveVisualCheckOutcome(window.localStorage, lesson, responseId, supported);
	}
</script>

<main class="lesson-shell">
	<HomeButton onclick={() => goto(resolve('/'))} />

	<header>
		<a class="wordmark" href={resolve('/')}>Doceo</a>
		<span class="reviewed"><i aria-hidden="true">✓</i> Independently reviewed</span>
	</header>

	{#if showCheck && lesson.check}
		<ApprovedLessonCheck
			check={lesson.check}
			onanswer={recordCheckAnswer}
			onback={() => (showCheck = false)}
		/>
	{:else}
		<section class="intro">
			<p>{frame.kicker}</p>
			<h1>{frame.title}</h1>
		</section>

		<section class="visual-stage" data-testid="visual-stage">
			{#if lesson.kind === 'timeline'}
				<CosmologyTimeline nodes={lesson.nodes} activeStateIds={frame.activeStateIds} />
			{:else if lesson.kind === 'immune-response'}
				<ImmuneResponseSequence nodes={lesson.nodes} activeStateIds={frame.activeStateIds} />
			{:else}
				<SoapContainmentSequence nodes={lesson.nodes} activeStateIds={frame.activeStateIds} />
			{/if}
		</section>

		<footer>
			<div class="progress" aria-label={`Step ${frameIndex + 1} of ${lesson.frames.length}`}>
				{#each lesson.frames.keys() as index (index)}
					<span class:active={index === frameIndex}></span>
				{/each}
			</div>
			<p class="caption">{frame.caption}</p>
			<button class="next-button" type="button" onclick={advance} data-testid="next-button">
				<span>{atEnd ? 'See it again' : 'Next'}</span>
				<svg viewBox="0 0 32 32" role="presentation"><path d="M6 16h20m-8-8 8 8-8 8" /></svg>
			</button>
			{#if atEnd}
				<div class="ending">
					<p class="saved-note" aria-live="polite">Saved to your History.</p>
					{#if lesson.check}
						<button class="check-button" type="button" onclick={() => (showCheck = true)}
							>Try a 10-second check</button
						>
					{/if}
				</div>
			{/if}
			{#if lesson.provenance}
				<details class="provenance">
					<summary>How this lesson was checked</summary>
					<p>{lesson.provenance.reviewSummary}</p>
					{#if lesson.provenance.reviewNotes.length}
						<ul class="review-notes">
							{#each lesson.provenance.reviewNotes as note (note)}
								<li>{note}</li>
							{/each}
						</ul>
					{/if}
					<ul>
						{#each lesson.provenance.sources as source (source.url)}
							<li>
								<!-- External evidence URL; SvelteKit resolve() is only for app routes. -->
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								<a href={source.url} target="_blank" rel="noreferrer">{source.authority}</a>
							</li>
						{/each}
					</ul>
				</details>
			{/if}
		</footer>
	{/if}
</main>

<style>
	.lesson-shell {
		position: relative;
		isolation: isolate;
		min-height: 100svh;
		overflow: hidden;
		padding: clamp(1.1rem, 3vw, 2rem) var(--page-gutter) clamp(2.5rem, 6vw, 5rem);
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

	.lesson-shell::before {
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

	.reviewed {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.72rem;
		border: 0.13rem solid var(--color-navy);
		border-radius: 999px;
		background: var(--color-cream);
		font-size: 0.72rem;
		font-weight: 900;
	}

	.reviewed i {
		display: grid;
		width: 1.25rem;
		aspect-ratio: 1;
		place-items: center;
		border-radius: 50%;
		background: var(--color-teal);
		color: var(--color-cream);
		font-style: normal;
	}

	.intro {
		display: grid;
		width: min(100%, 64rem);
		height: clamp(12.5rem, 19vw, 14rem);
		grid-template-rows: 1.25rem minmax(0, 1fr);
		align-items: center;
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
		align-self: center;
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
		align-items: start;
		gap: 0.8rem 1.4rem;
		margin: clamp(1.5rem, 4vw, 2.5rem) auto 0;
	}

	.caption {
		height: 3.75em;
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
		width: 10rem;
		min-height: 3.4rem;
		align-items: center;
		justify-content: space-between;
		gap: 0.55rem;
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

	.ending {
		display: flex;
		grid-column: 1 / -1;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
	}

	.saved-note {
		grid-column: 1 / -1;
		margin: 0;
		color: var(--color-teal);
		font-size: 0.9rem;
		text-align: right;
	}

	.check-button {
		padding: 0.42rem 0;
		border: 0;
		border-bottom: 0.15rem solid var(--color-teal);
		background: transparent;
		color: var(--color-navy);
		cursor: pointer;
		font-weight: 900;
	}

	.provenance {
		grid-column: 1 / -1;
		margin-top: 0.8rem;
		padding-top: 0.8rem;
		border-top: 0.12rem solid rgb(7 27 59 / 18%);
		font-size: 0.82rem;
	}

	.provenance summary {
		cursor: pointer;
		font-weight: 850;
	}
	.provenance p {
		max-width: 48rem;
		margin: 0.65rem 0;
		color: rgb(7 27 59 / 78%);
	}
	.provenance ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.2rem;
		margin: 0;
		padding-left: 1.1rem;
	}
	.provenance .review-notes {
		display: grid;
		gap: 0.35rem;
		margin-bottom: 0.8rem;
	}
	.provenance a {
		color: var(--color-navy);
		font-weight: 800;
	}

	@media (max-width: 42rem) {
		header {
			align-items: flex-start;
			padding-right: 3.8rem;
		}
		.reviewed {
			max-width: 9rem;
			border-radius: 1rem;
		}
		.intro {
			height: clamp(10.5rem, 46vw, 12rem);
			margin-top: 2rem;
		}
		footer {
			grid-template-columns: 1fr;
		}
		.caption {
			height: 7.5em;
		}
		.next-button {
			justify-self: center;
		}
		.ending {
			flex-direction: column;
			justify-content: center;
		}
		.saved-note {
			text-align: center;
		}
	}
</style>
