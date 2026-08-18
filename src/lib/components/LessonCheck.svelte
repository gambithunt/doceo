<script lang="ts">
	import HomeButton from './HomeButton.svelte';
	import type { QuizOutcome } from '$lib/experience/types';

	type Props = {
		route: 'falling' | 'example';
		onhome: () => void;
		onfinish: (outcome: QuizOutcome) => void;
	};

	type CheckStage = 'offer' | 'question' | 'feedback';

	let { route, onhome, onfinish }: Props = $props();
	let stage = $state<CheckStage>('offer');
	let observerSelected = $state(false);
	let travelerSelected = $state(false);
	let outcome = $state<QuizOutcome>('neither');
	let exampleChoice = $state<'A' | 'B' | 'C' | ''>('');
	let heading = $state<HTMLHeadingElement>();

	const feedbackTitle = $derived(
		outcome === 'orbit-evidence'
			? 'Yes—motion is the evidence.'
			: outcome === 'darkness-misconception'
				? 'Darkness alone is not a detection.'
				: outcome === 'orbit-uncertain'
					? 'The curved, returning orbit is the clue.'
					: outcome === 'both'
						? 'Exactly—both views fit.'
						: outcome === 'observer-only'
							? 'The traveler crosses too.'
							: outcome === 'traveler-only'
								? 'The distant observer has a real view too.'
								: 'Both views fit.'
	);

	$effect(() => {
		heading?.focus();
	});

	$effect(() => {
		if (stage !== 'feedback') return;
		const ending = window.setTimeout(() => onfinish(outcome), 4200);
		return () => window.clearTimeout(ending);
	});

	function reveal() {
		if (route === 'example') {
			outcome =
				exampleChoice === 'B'
					? 'orbit-evidence'
					: exampleChoice === 'C'
						? 'darkness-misconception'
						: 'orbit-uncertain';
			stage = 'feedback';
			return;
		}

		outcome = observerSelected
			? travelerSelected
				? 'both'
				: 'observer-only'
			: travelerSelected
				? 'traveler-only'
				: 'neither';
		stage = 'feedback';
	}
</script>

<main class="check-shell check-shell--{stage}">
	<HomeButton onclick={onhome} />
	<div class="star-field" aria-hidden="true"></div>

	{#if stage === 'offer'}
		<section class="offer-panel">
			<div class="paired-clocks" aria-hidden="true"><span></span><i></i><span></span></div>
			<p class="eyebrow">The lesson has ended</p>
			<h1 bind:this={heading} tabindex="-1">Want a 10-second check?</h1>
			<p>One small question. No score.</p>
			<div class="offer-actions">
				<button class="accept-button" type="button" onclick={() => (stage = 'question')}>
					Yes, let me try <span aria-hidden="true">→</span>
				</button>
				<button class="decline-button" type="button" onclick={() => onfinish('declined')}
					>Not now</button
				>
			</div>
		</section>
	{:else if stage === 'question'}
		<section class="question-panel">
			<p class="eyebrow">
				{route === 'falling' ? 'Choose every view that fits' : 'Choose one patch'}
			</p>
			<h1 bind:this={heading} tabindex="-1">
				{route === 'falling'
					? 'Who experiences the traveler crossing the event horizon?'
					: 'Which patch suggests something massive and invisible?'}
			</h1>

			{#if route === 'falling'}
				<div class="view-choices">
					<button
						class:view-choice--selected={observerSelected}
						class="view-choice view-choice--observer"
						type="button"
						aria-pressed={observerSelected}
						onclick={() => (observerSelected = !observerSelected)}
					>
						<span class="choice-visual observer-visual" aria-hidden="true"
							><i class="tiny-clock"></i><i class="red-pulse"></i><i class="red-pulse"></i><i
								class="red-pulse"
							></i></span
						>
						<span
							><strong>The distant observer</strong><small
								>sees the traveler slow, redden, and fade.</small
							></span
						>
					</button>
					<button
						class:view-choice--selected={travelerSelected}
						class="view-choice view-choice--traveler"
						type="button"
						aria-pressed={travelerSelected}
						onclick={() => (travelerSelected = !travelerSelected)}
					>
						<span class="choice-visual traveler-visual" aria-hidden="true"
							><i class="tiny-clock"></i><i class="horizon-line"></i><i class="tiny-ship">➜</i
							></span
						>
						<span
							><strong>The traveler</strong><small
								>crosses the horizon in their own finite time.</small
							></span
						>
					</button>
				</div>
			{:else}
				<div class="sky-choices">
					<button
						class:sky-choice--selected={exampleChoice === 'A'}
						class="sky-choice"
						type="button"
						aria-pressed={exampleChoice === 'A'}
						onclick={() => (exampleChoice = 'A')}
					>
						<strong>A</strong><span class="sky-patch sky-patch--drift" aria-hidden="true"
							><i></i><i></i><i></i></span
						><small>stars drifting in straight paths</small>
					</button>
					<button
						class:sky-choice--selected={exampleChoice === 'B'}
						class="sky-choice"
						type="button"
						aria-pressed={exampleChoice === 'B'}
						onclick={() => (exampleChoice = 'B')}
					>
						<strong>B</strong><span class="sky-patch sky-patch--orbit" aria-hidden="true"
							><i></i><b></b></span
						><small>a star orbiting an empty point</small>
					</button>
					<button
						class:sky-choice--selected={exampleChoice === 'C'}
						class="sky-choice"
						type="button"
						aria-pressed={exampleChoice === 'C'}
						onclick={() => (exampleChoice = 'C')}
					>
						<strong>C</strong><span class="sky-patch sky-patch--dark" aria-hidden="true"
						></span><small>a patch with no visible stars</small>
					</button>
				</div>
			{/if}

			<button class="reveal-button" type="button" onclick={reveal}
				>{route === 'falling' ? 'Reveal the two views' : 'Reveal the evidence'}</button
			>
		</section>
	{:else}
		<section class="feedback-panel">
			<p class="eyebrow">
				{route === 'falling' ? 'Two viewpoints, reconstructed' : 'Evidence, reconstructed'}
			</p>
			<h1 bind:this={heading} tabindex="-1">{feedbackTitle}</h1>
			{#if route === 'falling'}
				<div
					class="feedback-world"
					aria-label="The observer sees fading signals while the traveler crosses the horizon"
				>
					<div class="feedback-side">
						<span class="feedback-clock feedback-clock--slow" aria-hidden="true"><i></i></span
						><strong>Far away</strong>
						<p>Signals arrive more slowly, redder, and weaker.</p>
					</div>
					<div class="feedback-hole" aria-hidden="true"><span></span></div>
					<div class="feedback-side">
						<span class="feedback-clock feedback-clock--normal" aria-hidden="true"><i></i></span
						><strong>With the traveler</strong>
						<p>Their clock feels normal as the horizon passes.</p>
					</div>
				</div>
			{:else}
				<div class="orbit-feedback" aria-label="A star loops around an invisible massive focus">
					<div class="answer-orbit" aria-hidden="true"><span></span><i></i></div>
					<div>
						<strong>The motion is measured.</strong>
						<p>The empty focus is inferred from the star’s curved, returning path.</p>
					</div>
				</div>
			{/if}
			<p class="closing-note">This lesson has been saved to History.</p>
		</section>
	{/if}
</main>

<style>
	.check-shell {
		position: relative;
		isolation: isolate;
		display: grid;
		min-height: 100svh;
		place-items: center;
		overflow-x: hidden;
		overflow-y: auto;
		padding: clamp(1.25rem, 4vw, 4rem) var(--page-gutter);
		background: linear-gradient(160deg, var(--color-butter) 0 38%, var(--color-space) 38% 100%);
		color: var(--color-navy);
		animation: check-arrives 420ms ease both;
	}

	.star-field {
		position: absolute;
		z-index: -1;
		inset: 35% 0 0;
		background:
			radial-gradient(circle, var(--color-yellow) 0 0.1rem, transparent 0.14rem) 0 0 / 5rem 5rem,
			radial-gradient(circle, var(--color-cyan) 0 0.08rem, transparent 0.13rem) 2.5rem 2.2rem / 6rem
				6rem;
	}

	.offer-panel,
	.question-panel,
	.feedback-panel {
		position: relative;
		z-index: 2;
		width: min(100%, 62rem);
		text-align: center;
	}

	.offer-panel,
	.feedback-panel {
		padding: clamp(2rem, 6vw, 4rem);
		border: 0.16rem solid var(--color-navy);
		border-radius: 3rem 3.8rem 2.7rem 3.4rem;
		background: var(--color-cream);
		box-shadow: 0.8rem 0.9rem 0 var(--color-yellow);
	}

	.eyebrow {
		margin: 0 0 0.7rem;
		color: var(--color-teal);
		font-size: clamp(0.76rem, 2vw, 0.95rem);
		font-weight: 820;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		max-width: 16ch;
		margin: 0 auto;
		font-family: var(--font-display);
		font-size: clamp(2.7rem, 8vw, 5.8rem);
		font-weight: 850;
		letter-spacing: -0.06em;
		line-height: 0.94;
		text-wrap: balance;
	}

	h1:focus {
		outline: none;
	}

	.offer-panel > p:not(.eyebrow) {
		margin: 1rem 0 0;
		font-size: 1rem;
		font-weight: 650;
	}

	.paired-clocks {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin: 0 auto 1.4rem;
	}

	.paired-clocks span {
		display: block;
		width: 2.7rem;
		aspect-ratio: 1;
		border: 0.18rem solid var(--color-navy);
		border-radius: 50%;
	}

	.paired-clocks i {
		width: 3rem;
		height: 0.16rem;
		background: var(--color-orange);
		transform: rotate(-3deg);
	}

	.offer-actions {
		display: grid;
		justify-items: center;
		gap: 1rem;
		margin-top: 2rem;
	}

	.accept-button,
	.reveal-button {
		min-height: 3.8rem;
		padding: 0.75rem 1.5rem;
		border: 0.16rem solid var(--color-navy);
		border-radius: 2rem 2.4rem 1.8rem 2.2rem;
		background: var(--color-yellow);
		color: var(--color-navy);
		cursor: pointer;
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 820;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.accept-button:hover,
	.reveal-button:hover {
		box-shadow: 0.35rem 0.45rem 0 var(--color-orange);
		transform: translateY(-0.15rem);
	}
	.accept-button span {
		margin-left: 0.6rem;
		font-size: 1.5rem;
	}

	.decline-button {
		padding: 0.4rem 0.7rem;
		border: 0;
		border-bottom: 0.12rem solid transparent;
		background: transparent;
		color: var(--color-navy);
		cursor: pointer;
		font-weight: 720;
	}

	.decline-button:hover {
		border-bottom-color: var(--color-teal);
	}

	.question-panel {
		padding: clamp(1.25rem, 3vw, 2.25rem);
		border: 0.12rem solid rgb(255 249 223 / 48%);
		border-radius: 2.6rem 3.2rem 2.4rem 2.9rem;
		background: color-mix(in srgb, var(--color-space) 96%, white);
		box-shadow: 0.5rem 0.6rem 0 rgb(21 157 172 / 24%);
		color: var(--color-butter);
	}

	.question-panel .eyebrow {
		width: fit-content;
		margin: 0 auto 1rem;
		padding: 0.4rem 0.75rem;
		border-radius: 999px;
		background: var(--color-cyan);
		color: var(--color-navy);
	}
	.question-panel h1 {
		max-width: 18ch;
		padding: clamp(1rem, 2.5vw, 1.7rem) clamp(1rem, 3vw, 2rem);
		border: 0.16rem solid var(--color-navy);
		border-radius: 1.8rem 2.2rem 1.6rem 2rem;
		background: var(--color-cream);
		box-shadow: 0.45rem 0.55rem 0 var(--color-orange);
		color: var(--color-navy);
		font-size: clamp(2.4rem, 6vw, 4.8rem);
	}

	.view-choices {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(0.8rem, 3vw, 1.5rem);
		margin-top: clamp(1.5rem, 4vw, 2.5rem);
	}

	.view-choice {
		display: grid;
		min-height: 15rem;
		grid-template-rows: 7rem auto;
		gap: 0.8rem;
		padding: 1rem;
		border: 0.16rem solid var(--color-butter);
		border-radius: 2.4rem 2.9rem 2.2rem 2.7rem;
		background: color-mix(in srgb, var(--color-teal) 38%, var(--color-cream));
		color: var(--color-navy);
		cursor: pointer;
		text-align: left;
		transition:
			transform 170ms ease,
			box-shadow 170ms ease;
	}

	.view-choice--traveler {
		background: var(--color-yellow);
		transform: rotate(0.8deg);
	}
	.view-choice--observer {
		transform: rotate(-0.8deg);
	}
	.view-choice:hover {
		transform: translateY(-0.2rem) rotate(0);
	}
	.view-choice--selected {
		box-shadow:
			0 0 0 0.25rem var(--color-orange),
			0.5rem 0.6rem 0 var(--color-orange);
		transform: translateY(-0.15rem) rotate(0);
	}

	.view-choice > span:last-child {
		display: grid;
		gap: 0.35rem;
	}
	.view-choice strong {
		font-family: var(--font-display);
		font-size: clamp(1.15rem, 3vw, 1.5rem);
		line-height: 1;
	}
	.view-choice small {
		font-size: 0.9rem;
		font-weight: 620;
		line-height: 1.3;
	}

	.sky-choices {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: clamp(0.7rem, 2vw, 1.2rem);
		margin-top: clamp(1.4rem, 4vw, 2.4rem);
	}

	.sky-choice {
		display: grid;
		min-height: 13rem;
		grid-template-rows: auto 7rem auto;
		gap: 0.55rem;
		padding: 0.8rem;
		border: 0.14rem solid var(--color-butter);
		border-radius: 2rem 2.4rem 1.8rem 2.2rem;
		background: var(--color-cream);
		color: var(--color-navy);
		cursor: pointer;
		transition:
			transform 170ms ease,
			box-shadow 170ms ease;
	}

	.sky-choice:nth-child(2) {
		background: color-mix(in srgb, var(--color-cyan) 38%, var(--color-cream));
		transform: rotate(0.7deg);
	}
	.sky-choice:nth-child(3) {
		background: var(--color-yellow);
		transform: rotate(-0.7deg);
	}
	.sky-choice:hover {
		transform: translateY(-0.2rem) rotate(0);
	}
	.sky-choice--selected {
		box-shadow:
			0 0 0 0.24rem var(--color-orange),
			0.45rem 0.55rem 0 var(--color-orange);
		transform: translateY(-0.15rem) rotate(0);
	}
	.sky-choice strong {
		justify-self: start;
		font-family: var(--font-display);
		font-size: 1.3rem;
	}
	.sky-choice small {
		font-size: 0.78rem;
		font-weight: 680;
		line-height: 1.2;
	}
	.sky-patch {
		position: relative;
		display: block;
		overflow: hidden;
		border-radius: 1.2rem;
		background: var(--color-space);
	}
	.sky-patch--drift i {
		position: absolute;
		left: 10%;
		width: 0.6rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-yellow);
		box-shadow:
			2.8rem 1rem 0 -0.1rem var(--color-cyan),
			5rem -0.6rem 0 -0.15rem var(--color-butter);
	}
	.sky-patch--drift i:nth-child(1) {
		top: 20%;
	}
	.sky-patch--drift i:nth-child(2) {
		top: 48%;
		left: 22%;
	}
	.sky-patch--drift i:nth-child(3) {
		top: 73%;
		left: 8%;
	}
	.sky-patch--orbit::before {
		position: absolute;
		inset: 13% 9%;
		border: 0.12rem solid var(--color-teal);
		border-radius: 50%;
		content: '';
		transform: rotate(-18deg);
	}
	.sky-patch--orbit i {
		position: absolute;
		top: 24%;
		left: 22%;
		width: 0.75rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-yellow);
		box-shadow: 0 0 0.8rem var(--color-yellow);
	}
	.sky-patch--orbit b {
		position: absolute;
		top: 50%;
		left: 54%;
		width: 0.9rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: #000;
		box-shadow: 0 0 0 0.12rem var(--color-orange);
	}
	.sky-patch--dark {
		background:
			radial-gradient(circle at 22% 24%, var(--color-cyan) 0 0.08rem, transparent 0.13rem),
			var(--color-space);
	}

	.choice-visual {
		position: relative;
		display: block;
		overflow: hidden;
		border-radius: 1.6rem;
		background: var(--color-space);
	}
	.tiny-clock {
		position: absolute;
		top: 1.2rem;
		left: 1.2rem;
		width: 3.2rem;
		aspect-ratio: 1;
		border: 0.16rem solid var(--color-butter);
		border-radius: 50%;
	}
	.tiny-clock::before,
	.tiny-clock::after {
		position: absolute;
		bottom: 50%;
		left: calc(50% - 0.06rem);
		width: 0.12rem;
		height: 27%;
		background: var(--color-butter);
		content: '';
		transform-origin: bottom;
	}
	.tiny-clock::after {
		height: 20%;
		transform: rotate(110deg);
	}
	.red-pulse {
		position: absolute;
		top: 3rem;
		width: 0.8rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-orange);
		box-shadow: 0 0 0.8rem var(--color-orange);
	}
	.red-pulse:nth-of-type(2) {
		left: 48%;
	}
	.red-pulse:nth-of-type(3) {
		left: 66%;
		width: 0.6rem;
		opacity: 0.68;
	}
	.red-pulse:nth-of-type(4) {
		left: 82%;
		width: 0.4rem;
		opacity: 0.38;
	}
	.horizon-line {
		position: absolute;
		top: 50%;
		right: -1rem;
		width: 7rem;
		aspect-ratio: 1;
		border: 0.18rem solid var(--color-yellow);
		border-radius: 50%;
		transform: translateY(-50%);
	}
	.tiny-ship {
		position: absolute;
		top: 43%;
		left: 42%;
		color: var(--color-butter);
		font-size: 2rem;
		font-style: normal;
		transform: rotate(8deg);
	}

	.reveal-button {
		margin-top: 1.5rem;
	}

	.feedback-panel h1 {
		font-size: clamp(2.7rem, 7vw, 5.2rem);
	}
	.feedback-world {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: clamp(0.8rem, 3vw, 2rem);
		margin-top: 2rem;
	}
	.feedback-side {
		display: grid;
		justify-items: center;
		gap: 0.55rem;
	}
	.feedback-side strong {
		font-family: var(--font-display);
		font-size: clamp(1rem, 2.5vw, 1.35rem);
	}
	.feedback-side p {
		max-width: 18ch;
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.3;
	}
	.feedback-clock {
		position: relative;
		display: block;
		width: clamp(3.7rem, 9vw, 5rem);
		aspect-ratio: 1;
		border: 0.2rem solid var(--color-navy);
		border-radius: 50%;
	}
	.feedback-clock i {
		position: absolute;
		bottom: 50%;
		left: calc(50% - 0.07rem);
		width: 0.14rem;
		height: 30%;
		background: var(--color-navy);
		transform-origin: bottom;
	}
	.feedback-clock--slow i {
		animation: slow-clock 4s linear infinite;
	}
	.feedback-clock--normal i {
		animation: normal-clock 1.5s linear infinite;
	}
	.feedback-hole {
		display: grid;
		width: clamp(4rem, 11vw, 7rem);
		aspect-ratio: 1;
		place-items: center;
		border: 0.25rem solid var(--color-yellow);
		border-right-color: var(--color-orange);
		border-left-color: var(--color-teal);
		border-radius: 50%;
	}
	.feedback-hole span {
		width: 68%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-space);
	}

	.orbit-feedback {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: clamp(1rem, 4vw, 2rem);
		width: min(100%, 38rem);
		margin: 2rem auto 0;
		text-align: left;
	}

	.answer-orbit {
		position: relative;
		width: clamp(8rem, 22vw, 12rem);
		aspect-ratio: 1.6;
		border: 0.18rem solid var(--color-teal);
		border-radius: 50%;
		transform: rotate(-16deg);
	}

	.answer-orbit span {
		position: absolute;
		top: 9%;
		left: 17%;
		width: 1rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-yellow);
		box-shadow: 0 0 0.8rem var(--color-yellow);
	}
	.answer-orbit i {
		position: absolute;
		top: 46%;
		left: 58%;
		width: 1.1rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-space);
		box-shadow: 0 0 0 0.15rem var(--color-orange);
	}
	.orbit-feedback strong {
		font-family: var(--font-display);
		font-size: clamp(1.05rem, 3vw, 1.4rem);
	}
	.orbit-feedback p {
		margin: 0.45rem 0 0;
		font-size: 0.9rem;
		line-height: 1.35;
	}
	.closing-note {
		margin: 1.7rem 0 0;
		color: color-mix(in srgb, var(--color-navy) 72%, transparent);
		font-size: 0.84rem;
		font-weight: 680;
	}

	@keyframes check-arrives {
		from {
			opacity: 0;
			transform: translateY(0.7rem);
		}
	}
	@keyframes slow-clock {
		to {
			transform: rotate(110deg);
		}
	}
	@keyframes normal-clock {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 40rem) {
		.check-shell {
			background: linear-gradient(var(--color-butter) 0 25%, var(--color-space) 38% 100%);
		}
		.view-choices {
			grid-template-columns: 1fr;
		}
		.view-choice {
			min-height: 10.5rem;
			grid-template-columns: 7rem 1fr;
			grid-template-rows: auto;
			align-items: center;
		}
		.sky-choices {
			grid-template-columns: 1fr;
		}
		.sky-choice {
			min-height: 8rem;
			grid-template-columns: auto 7rem 1fr;
			grid-template-rows: auto;
			align-items: center;
		}
		.feedback-world {
			gap: 0.45rem;
		}
		.feedback-side p {
			font-size: 0.72rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.check-shell,
		.feedback-clock i {
			animation: none;
		}
	}
</style>
