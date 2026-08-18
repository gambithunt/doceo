<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		exampleReturningHomeSuggestions,
		homePrompt,
		homeSuggestions,
		productName,
		returningHomeSuggestions
	} from '$lib/app-meta';
	import type { LearningAngle } from '$lib/experience/types';
	import SparkIllustration from './SparkIllustration.svelte';

	type Props = {
		onexplore?: (question: string) => void;
		onreopenlesson?: (angle: LearningAngle) => void;
		notice?: string;
		completedLesson?: boolean;
		completedExampleLesson?: boolean;
		lastCompletedAngle?: LearningAngle | '';
	};

	let {
		onexplore,
		onreopenlesson,
		notice = '',
		completedLesson = false,
		completedExampleLesson = false,
		lastCompletedAngle = ''
	}: Props = $props();

	let curiosity = $state('');
	let submittedCuriosity = $state('');
	let suggestionReadyToReplace = $state(false);
	let historyOpen = $state(false);
	let curiosityInput: HTMLInputElement;

	const canExplore = $derived(curiosity.trim().length >= 3);
	const suggestions = $derived(
		lastCompletedAngle === 'Show me a real example'
			? exampleReturningHomeSuggestions
			: completedLesson
				? returningHomeSuggestions
				: homeSuggestions
	);

	function chooseSuggestion(question: string) {
		curiosity = question;
		submittedCuriosity = '';
		suggestionReadyToReplace = true;
		requestAnimationFrame(() => {
			curiosityInput.focus();
			curiosityInput.select();
		});
	}

	function selectSuggestedQuestion() {
		if (suggestionReadyToReplace) curiosityInput.select();
	}

	function selectSuggestedQuestionOnMousedown(event: MouseEvent) {
		if (!suggestionReadyToReplace) return;
		// Prevent the browser's native click-to-place-caret behavior, which
		// would otherwise collapse the selection right after this handler runs.
		event.preventDefault();
		curiosityInput.focus();
		curiosityInput.select();
	}

	function handleQuestionKeydown(event: KeyboardEvent) {
		if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
			suggestionReadyToReplace = false;
		}
	}

	function handleQuestionInput() {
		suggestionReadyToReplace = false;
		submittedCuriosity = '';
	}

	function explore(event: SubmitEvent) {
		event.preventDefault();

		if (!canExplore) {
			curiosityInput.focus();
			return;
		}

		submittedCuriosity = curiosity.trim();
		onexplore?.(submittedCuriosity);
	}
</script>

<main class:question-ready={submittedCuriosity} class="home-shell">
	<div class="ambient ambient--yellow" aria-hidden="true"></div>
	<div class="ambient ambient--teal" aria-hidden="true"></div>
	<svg class="motion-path motion-path--top" viewBox="0 0 500 360" aria-hidden="true">
		<path d="M355-16c-76 58-25 125 54 158 110 47 99 144 30 226" />
	</svg>
	<svg class="motion-path motion-path--bottom" viewBox="0 0 500 320" aria-hidden="true">
		<path d="M-20 70c85-57 136-13 143 54 8 84 92 71 164 41 92-37 173 20 236 123" />
	</svg>

	<header class="site-header">
		<a class="wordmark" href={resolve('/')} aria-label="Doceo home">{productName}</a>
		<div class="history-wrap">
			<button
				class="history-button"
				type="button"
				aria-expanded={historyOpen}
				aria-controls="history-note"
				onclick={() => (historyOpen = !historyOpen)}>History</button
			>
			{#if historyOpen}
				<div class="history-note" id="history-note">
					{#if completedLesson || completedExampleLesson}
						{#if completedLesson}
							<button
								class="history-entry"
								type="button"
								onclick={() => onreopenlesson?.('What would falling in feel like?')}
							>
								<strong>Falling into a black hole</strong>
								<span>Event horizons from two viewpoints · 2 min</span>
							</button>
						{/if}
						{#if completedExampleLesson}
							<button
								class="history-entry"
								type="button"
								onclick={() => onreopenlesson?.('Show me a real example')}
							>
								<strong>How we found a black hole</strong>
								<span>Finding the invisible by its effects · 2 min</span>
							</button>
						{/if}
					{:else}
						<strong>No lessons yet.</strong>
						<span>The ones you finish will live here.</span>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<section class="invitation" aria-labelledby="home-heading">
		<div class="heading-wrap">
			<span class="heading-spark" aria-hidden="true">✦</span>
			<h1 id="home-heading">{homePrompt}</h1>
		</div>

		<form class="curiosity-form" onsubmit={explore}>
			<label for="curiosity">Your curiosity</label>
			<div class="question-field">
				<input
					bind:this={curiosityInput}
					bind:value={curiosity}
					id="curiosity"
					name="curiosity"
					type="text"
					autocomplete="off"
					placeholder="Type a question, idea, or wonder…"
					onmousedown={selectSuggestedQuestionOnMousedown}
					onfocus={selectSuggestedQuestion}
					onkeydown={handleQuestionKeydown}
					oninput={handleQuestionInput}
				/>
				<button class="explore-button" type="submit" aria-label="Explore this curiosity">
					<svg viewBox="0 0 32 32" role="presentation">
						<path d="M5 16h21M18 8l8 8-8 8" />
					</svg>
				</button>
			</div>
		</form>

		<p class="submission-status" aria-live="polite">
			{#if submittedCuriosity}Curiosity captured: {submittedCuriosity}.{/if}
		</p>
		{#if notice}
			<p class="prototype-notice" role="status">{notice}</p>
		{/if}
	</section>

	<section class="sparks" aria-labelledby="sparks-heading">
		<div class="section-title">
			<span aria-hidden="true"></span>
			<h2 id="sparks-heading">Follow a spark</h2>
			<span aria-hidden="true"></span>
		</div>

		<div class="suggestion-list">
			{#each suggestions as suggestion, index (suggestion.question)}
				<button
					class:suggestion--teal={index === 1}
					class="suggestion"
					type="button"
					onclick={() => chooseSuggestion(suggestion.question)}
				>
					<SparkIllustration variant={suggestion.illustration} />
					<span>{suggestion.question}</span>
					<i aria-hidden="true"></i>
				</button>
			{/each}
		</div>
	</section>
</main>

<style>
	.home-shell {
		position: relative;
		isolation: isolate;
		min-height: 100svh;
		overflow: hidden;
		padding: clamp(1.5rem, 5vw, 4rem) var(--page-gutter) clamp(5rem, 10vw, 8rem);
		background:
			radial-gradient(circle at 24% 24%, rgb(255 255 255 / 35%) 0 0.12rem, transparent 0.15rem),
			var(--color-butter);
		background-size:
			1.25rem 1.25rem,
			auto;
	}

	.home-shell::before {
		position: absolute;
		z-index: -1;
		right: -14rem;
		bottom: -16rem;
		width: min(60vw, 38rem);
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-yellow);
		content: '';
	}

	.site-header {
		position: relative;
		z-index: 5;
		display: flex;
		width: min(100%, var(--content-width));
		align-items: flex-start;
		justify-content: space-between;
		margin: 0 auto;
	}

	.wordmark,
	.history-button {
		position: relative;
		color: var(--color-navy);
		font-family: var(--font-display);
		font-weight: 800;
		text-decoration: none;
	}

	.wordmark {
		font-size: clamp(2.4rem, 7vw, 4rem);
		letter-spacing: -0.065em;
	}

	.wordmark::after,
	.history-button::after {
		display: block;
		height: 0.28rem;
		border-radius: 999px;
		background: var(--color-yellow);
		content: '';
		transform: rotate(-1deg);
	}

	.wordmark::after {
		width: 75%;
		margin-top: 0.25rem;
	}

	.history-wrap {
		position: relative;
	}

	.history-button {
		border: 0;
		background: transparent;
		cursor: pointer;
		font-size: clamp(1.05rem, 3vw, 1.45rem);
	}

	.history-button::after {
		width: 70%;
		margin: 0.35rem auto 0;
		background: var(--color-teal);
		transition: width 180ms ease;
	}

	.history-button:hover::after,
	.history-button[aria-expanded='true']::after {
		width: 100%;
	}

	.history-note {
		position: absolute;
		top: calc(100% + 0.8rem);
		right: 0;
		display: grid;
		width: min(75vw, 17rem);
		gap: 0.2rem;
		padding: 1rem 1.1rem;
		border: 0.14rem solid var(--color-navy);
		border-radius: 1.3rem 0.85rem 1.35rem 0.95rem;
		background: var(--color-cream);
		box-shadow: 0.4rem 0.5rem 0 var(--color-yellow);
		font-size: 0.92rem;
		line-height: 1.35;
	}

	.history-note span {
		color: color-mix(in srgb, var(--color-navy) 72%, transparent);
	}

	.history-entry {
		display: grid;
		gap: 0.25rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--color-navy);
		cursor: pointer;
		text-align: left;
	}

	.history-entry strong {
		font-family: var(--font-display);
		font-size: 1rem;
	}

	.history-entry:hover strong {
		text-decoration: underline;
		text-decoration-color: var(--color-teal);
		text-decoration-thickness: 0.16rem;
		text-underline-offset: 0.22rem;
	}

	.invitation {
		position: relative;
		z-index: 2;
		width: min(100%, 58rem);
		margin: clamp(4.5rem, 10vh, 8rem) auto 0;
	}

	.heading-wrap {
		position: relative;
		width: fit-content;
		margin: 0 auto;
		text-align: center;
	}

	h1 {
		max-width: 13ch;
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(3.35rem, 9.5vw, 7.2rem);
		font-weight: 850;
		letter-spacing: -0.067em;
		line-height: 0.94;
		text-wrap: balance;
	}

	h1::after {
		display: block;
		width: 48%;
		height: clamp(0.35rem, 1vw, 0.6rem);
		margin: clamp(1.1rem, 3vw, 1.8rem) auto 0;
		border-radius: 54% 46% 60% 40%;
		background: var(--color-orange);
		clip-path: polygon(
			0 40%,
			9% 8%,
			20% 46%,
			31% 20%,
			43% 57%,
			54% 21%,
			67% 55%,
			78% 25%,
			89% 60%,
			100% 36%,
			100% 67%,
			89% 88%,
			78% 58%,
			67% 90%,
			54% 55%,
			43% 88%,
			31% 54%,
			20% 81%,
			9% 43%,
			0 74%
		);
		content: '';
	}

	.heading-spark {
		position: absolute;
		top: -2.2rem;
		left: -0.7rem;
		color: var(--color-orange);
		font-size: clamp(2.4rem, 6vw, 4rem);
		transform: rotate(-12deg);
	}

	.curiosity-form {
		margin-top: clamp(2.5rem, 6vw, 4rem);
	}

	.curiosity-form label,
	.submission-status {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
		clip-path: inset(50%);
	}

	.prototype-notice {
		width: fit-content;
		max-width: 42rem;
		margin: 1rem auto 0;
		padding: 0.75rem 1rem;
		border-left: 0.3rem solid var(--color-orange);
		border-radius: 0.3rem 1rem 1rem 0.3rem;
		background: color-mix(in srgb, var(--color-cream) 78%, transparent);
		font-size: 0.95rem;
		font-weight: 650;
		line-height: 1.4;
	}

	.question-field {
		display: grid;
		min-height: clamp(5rem, 13vw, 7.4rem);
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: clamp(0.75rem, 2vw, 1.35rem);
		padding: 0.65rem clamp(0.7rem, 2vw, 1.1rem) 0.65rem clamp(1.1rem, 3vw, 2rem);
		border: clamp(0.16rem, 0.45vw, 0.27rem) solid var(--color-navy);
		border-radius: 2.3rem 2.8rem 2.1rem 2.6rem;
		background: color-mix(in srgb, var(--color-cream) 88%, white);
		box-shadow: 0 0.8rem 2.5rem rgb(7 27 59 / 7%);
		transition:
			box-shadow 180ms ease,
			transform 180ms ease;
	}

	.question-field:focus-within {
		box-shadow: 0 0 0 0.28rem color-mix(in srgb, var(--color-cyan) 42%, transparent);
		transform: translateY(-0.12rem);
	}

	input {
		width: 100%;
		min-width: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--color-navy);
		font-size: clamp(1rem, 3.2vw, 1.45rem);
		font-weight: 650;
	}

	input::placeholder {
		color: rgb(7 27 59 / 52%);
		font-weight: 500;
	}

	.explore-button {
		display: grid;
		width: clamp(3.7rem, 11vw, 5.3rem);
		aspect-ratio: 1;
		place-items: center;
		border: 0;
		border-radius: 50%;
		background: var(--color-yellow);
		color: var(--color-navy);
		cursor: pointer;
		transition:
			transform 150ms ease,
			background 180ms ease;
	}

	.explore-button:hover {
		background: color-mix(in srgb, var(--color-yellow) 78%, white);
		transform: rotate(-4deg) scale(1.04);
	}

	.explore-button:active {
		transform: scale(0.94);
	}

	.explore-button svg {
		width: 58%;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 3.2;
	}

	.question-ready .explore-button {
		background: var(--color-teal);
		animation: ready-pulse 500ms ease both;
	}

	.sparks {
		position: relative;
		z-index: 2;
		width: min(100%, 50rem);
		margin: clamp(2.5rem, 7vw, 4.5rem) auto 0;
	}

	.section-title {
		display: grid;
		grid-template-columns: 2.2rem auto 2.2rem;
		align-items: center;
		justify-content: center;
		gap: 0.8rem;
	}

	.section-title h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.25rem, 4vw, 1.75rem);
		letter-spacing: -0.035em;
	}

	.section-title span {
		height: 0.18rem;
		border-radius: 999px;
		background: var(--color-yellow);
	}

	.suggestion-list {
		display: grid;
		gap: clamp(0.3rem, 1.5vw, 0.75rem);
		margin-top: 1.8rem;
	}

	.suggestion {
		position: relative;
		display: grid;
		width: min(92%, 43rem);
		min-height: clamp(6.2rem, 20vw, 8.5rem);
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: clamp(0.9rem, 3vw, 1.5rem);
		padding: 0.7rem clamp(1rem, 3vw, 1.8rem);
		border: 0.18rem solid color-mix(in srgb, white 82%, var(--color-butter));
		border-radius: 3.8rem 4.6rem 3.5rem 4.2rem;
		background: color-mix(in srgb, var(--color-cream) 86%, transparent);
		color: var(--color-navy);
		cursor: pointer;
		font-family: var(--font-display);
		font-size: clamp(1.25rem, 4.2vw, 2rem);
		font-weight: 800;
		line-height: 1.05;
		text-align: left;
		transition:
			transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
			box-shadow 180ms ease;
	}

	.suggestion:nth-child(1) {
		justify-self: start;
		transform: rotate(-1.5deg);
	}

	.suggestion:nth-child(2) {
		justify-self: end;
		background: color-mix(in srgb, var(--color-cyan) 31%, var(--color-cream));
		transform: rotate(1.7deg);
	}

	.suggestion:nth-child(3) {
		justify-self: center;
		transform: rotate(-0.8deg);
	}

	.suggestion:hover {
		box-shadow: 0.5rem 0.65rem 0 color-mix(in srgb, var(--color-teal) 34%, transparent);
		transform: translateY(-0.25rem) rotate(0deg);
	}

	.suggestion:active {
		box-shadow: 0.2rem 0.25rem 0 color-mix(in srgb, var(--color-teal) 24%, transparent);
		transform: translateY(0.08rem) scale(0.985);
	}

	.suggestion i {
		width: 1.2rem;
		height: 1.8rem;
		border-right: 0.2rem solid var(--color-orange);
		border-radius: 50%;
		transform: rotate(-14deg);
	}

	.suggestion--teal i {
		border-color: var(--color-teal);
	}

	.ambient,
	.motion-path {
		position: absolute;
		z-index: -1;
		pointer-events: none;
	}

	.ambient--yellow {
		top: 8rem;
		left: -6rem;
		width: 11rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-yellow);
	}

	.ambient--teal {
		bottom: -12rem;
		left: -8rem;
		width: min(70vw, 32rem);
		aspect-ratio: 1.2;
		border-radius: 48% 52% 0 0 / 70% 75% 0 0;
		background: var(--color-teal);
		transform: rotate(12deg);
	}

	.motion-path {
		width: min(48vw, 32rem);
		fill: none;
		stroke: rgb(255 255 255 / 92%);
		stroke-dasharray: 9 12;
		stroke-linecap: round;
		stroke-width: 3;
	}

	.motion-path--top {
		top: -1rem;
		right: -1rem;
	}

	.motion-path--bottom {
		bottom: 8rem;
		left: -1rem;
	}

	@keyframes ready-pulse {
		50% {
			transform: scale(0.91) rotate(-6deg);
		}
	}

	@media (min-width: 62rem) {
		.home-shell {
			display: grid;
			grid-template-columns: minmax(0, 1.05fr) minmax(26rem, 0.95fr);
			grid-template-rows: auto 1fr;
			column-gap: clamp(3rem, 7vw, 8rem);
		}

		.site-header {
			grid-column: 1 / -1;
		}

		.invitation {
			align-self: center;
			margin-top: clamp(3rem, 8vh, 6rem);
		}

		.heading-wrap {
			margin-left: 0;
			text-align: left;
		}

		h1::after {
			margin-left: 8%;
		}

		.sparks {
			align-self: center;
			margin-top: 4rem;
		}
	}

	@media (max-width: 31rem) {
		.home-shell {
			padding-inline: 1rem;
		}

		.invitation {
			margin-top: 4rem;
		}

		.question-field {
			border-radius: 1.7rem 2rem 1.6rem 1.9rem;
		}

		.suggestion {
			width: 96%;
			padding-inline: 0.8rem;
			font-size: 1.18rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.question-ready .explore-button {
			animation: none;
		}

		.suggestion,
		.question-field,
		.explore-button {
			transition: none;
		}
	}
</style>
