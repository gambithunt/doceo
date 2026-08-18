<script lang="ts">
	import { productName } from '$lib/app-meta';
	import type { StartingPoint } from '$lib/experience/types';

	type Props = {
		question: string;
		onback: () => void;
		onselect: (startingPoint: StartingPoint) => void;
		initialSelection?: StartingPoint | '';
	};

	let { question, onback, onselect, initialSelection = '' }: Props = $props();
	let selected = $derived(initialSelection);
	let historyOpen = $state(false);
	let heading: HTMLHeadingElement;

	const choices: Array<{ label: StartingPoint; icon: 'sun' | 'star' | 'spiral' }> = [
		{ label: 'From the beginning', icon: 'sun' },
		{ label: 'I know the basics', icon: 'star' },
		{ label: 'Take me deeper', icon: 'spiral' }
	];

	$effect(() => {
		heading?.focus();
	});

	function select(startingPoint: StartingPoint) {
		onselect(startingPoint);
	}
</script>

<main class="orientation-shell">
	<header class="orientation-header">
		<button class="brand-button" type="button" onclick={onback} aria-label="Return to Doceo home">
			{productName}
		</button>
		<div class="history-wrap">
			<button
				class="history-button"
				type="button"
				aria-expanded={historyOpen}
				aria-controls="orientation-history-note"
				onclick={() => (historyOpen = !historyOpen)}>History</button
			>
			{#if historyOpen}
				<div class="history-note" id="orientation-history-note">
					<strong>No lessons yet.</strong>
					<span>Finish this one and it will appear here.</span>
				</div>
			{/if}
		</div>
	</header>

	<section class="orientation-intro">
		<button class="back-button" type="button" onclick={onback} aria-label="Change your curiosity">
			<svg viewBox="0 0 32 32" role="presentation">
				<path d="M25 16H7m8-8-8 8 8 8" />
			</svg>
		</button>
		<p class="topic-pill"><span aria-hidden="true">?</span>{question}</p>
		<h1 bind:this={heading} tabindex="-1">Where should we begin?</h1>
	</section>

	<div class="space-world" aria-hidden="true">
		<div class="star star--one"></div>
		<div class="star star--two"></div>
		<div class="star star--three"></div>
		<div class="gravity-line gravity-line--one"></div>
		<div class="gravity-line gravity-line--two"></div>
		<div class="gravity-line gravity-line--three"></div>
		<div class="black-hole">
			<span class="ring ring--one"></span>
			<span class="ring ring--two"></span>
			<span class="ring ring--three"></span>
			<span class="void"></span>
		</div>
	</div>

	<section class="starting-points" aria-label="Choose your starting point">
		{#each choices as choice (choice.label)}
			<button
				class:choice--selected={selected === choice.label}
				class="starting-choice starting-choice--{choice.icon}"
				type="button"
				aria-pressed={selected === choice.label}
				onclick={() => select(choice.label)}
			>
				<span class="choice-icon" aria-hidden="true">
					{#if choice.icon === 'sun'}
						<svg viewBox="0 0 64 64" role="presentation">
							<circle cx="32" cy="32" r="11" />
							<path d="M32 7v9m0 32v9M7 32h9m32 0h9M14 14l7 7m22 22 7 7m0-36-7 7M21 43l-7 7" />
						</svg>
					{:else if choice.icon === 'star'}
						<svg viewBox="0 0 64 64" role="presentation">
							<path class="filled" d="m32 6 6 18 19 8-19 7-6 19-7-19-19-7 19-8 7-18Z" />
						</svg>
					{:else}
						<svg viewBox="0 0 64 64" role="presentation">
							<path
								d="M34 32c0 6-9 6-9-1 0-9 16-12 22-4 9 13-4 28-19 25C7 48 7 18 27 11c25-9 43 21 29 41"
							/>
						</svg>
					{/if}
				</span>
				<span>{choice.label}</span>
			</button>
		{/each}
		<p class="selection-status" aria-live="polite">
			{#if selected}Starting point selected: {selected}.{/if}
		</p>
	</section>
</main>

<style>
	.orientation-shell {
		position: relative;
		isolation: isolate;
		min-height: 100svh;
		overflow: hidden;
		padding: clamp(1.5rem, 5vw, 4rem) var(--page-gutter) clamp(3rem, 8vw, 6rem);
		background: var(--color-butter);
	}

	.orientation-shell::after {
		position: absolute;
		z-index: -3;
		inset: 34% 0 0;
		background:
			radial-gradient(circle at 18% 22%, var(--color-yellow) 0 0.15rem, transparent 0.2rem),
			radial-gradient(circle at 76% 18%, var(--color-cyan) 0 0.12rem, transparent 0.17rem),
			radial-gradient(circle at 44% 64%, rgb(255 241 189 / 85%) 0 0.09rem, transparent 0.14rem),
			var(--color-space);
		background-size:
			4.8rem 5.3rem,
			6.7rem 7.1rem,
			3.7rem 4.2rem,
			auto;
		clip-path: ellipse(92% 74% at 50% 74%);
		content: '';
		animation: space-arrives 700ms cubic-bezier(0.18, 0.85, 0.25, 1) both;
	}

	.orientation-header {
		position: relative;
		z-index: 8;
		display: flex;
		width: min(100%, var(--content-width));
		align-items: flex-start;
		justify-content: space-between;
		margin: 0 auto;
	}

	.brand-button,
	.history-button {
		position: relative;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--color-navy);
		cursor: pointer;
		font-family: var(--font-display);
		font-weight: 800;
	}

	.brand-button {
		font-size: clamp(2.4rem, 7vw, 4rem);
		letter-spacing: -0.065em;
	}

	.brand-button::after,
	.history-button::after {
		display: block;
		height: 0.28rem;
		border-radius: 999px;
		content: '';
		transform: rotate(-1deg);
	}

	.brand-button::after {
		width: 75%;
		margin-top: 0.25rem;
		background: var(--color-yellow);
	}

	.history-wrap {
		position: relative;
	}

	.history-button {
		font-size: clamp(1.05rem, 3vw, 1.45rem);
	}

	.history-button::after {
		width: 70%;
		margin: 0.35rem auto 0;
		background: var(--color-teal);
	}

	.history-note {
		position: absolute;
		top: calc(100% + 0.8rem);
		right: 0;
		display: grid;
		width: min(75vw, 18rem);
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

	.orientation-intro {
		position: relative;
		z-index: 4;
		width: min(100%, 58rem);
		margin: clamp(2.5rem, 7vw, 5rem) auto 0;
		text-align: center;
	}

	.back-button {
		position: absolute;
		top: 0.35rem;
		left: 0;
		display: grid;
		width: clamp(2.7rem, 8vw, 3.5rem);
		aspect-ratio: 1;
		place-items: center;
		border: 0.14rem solid var(--color-navy);
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-cream) 70%, transparent);
		color: var(--color-navy);
		cursor: pointer;
	}

	.back-button svg {
		width: 60%;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.7;
	}

	.topic-pill {
		display: grid;
		width: min(82%, 38rem);
		min-height: 4.2rem;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 0.9rem;
		margin: 0 auto;
		padding: 0.55rem 1.2rem 0.55rem 0.6rem;
		border: 0.18rem solid var(--color-navy);
		border-radius: 2rem 2.5rem 2.1rem 2.35rem;
		background: color-mix(in srgb, var(--color-cream) 83%, transparent);
		font-family: var(--font-display);
		font-size: clamp(1rem, 3.4vw, 1.4rem);
		font-weight: 800;
		line-height: 1.15;
		text-align: left;
	}

	.topic-pill span {
		display: grid;
		width: 3rem;
		aspect-ratio: 1;
		place-items: center;
		border-radius: 50%;
		background: var(--color-teal);
		font-size: 2rem;
	}

	h1 {
		max-width: 13ch;
		margin: clamp(2.2rem, 6vw, 4rem) auto 0;
		font-family: var(--font-display);
		font-size: clamp(3.2rem, 9vw, 6.4rem);
		font-weight: 850;
		letter-spacing: -0.065em;
		line-height: 0.92;
		text-wrap: balance;
	}

	h1:focus {
		outline: none;
	}

	h1::after {
		display: block;
		width: 48%;
		height: 0.48rem;
		margin: 1.3rem auto 0;
		border-radius: 50%;
		background: var(--color-orange);
		content: '';
		transform: rotate(-1deg);
	}

	.space-world {
		position: relative;
		z-index: 1;
		width: min(100%, 44rem);
		height: clamp(15rem, 45vw, 24rem);
		margin: clamp(1rem, 4vw, 2rem) auto -2.5rem;
	}

	.black-hole {
		position: absolute;
		top: 50%;
		left: 50%;
		width: clamp(12rem, 40vw, 21rem);
		aspect-ratio: 1.35;
		transform: translate(-50%, -50%);
	}

	.void,
	.ring {
		position: absolute;
		inset: 50% auto auto 50%;
		border-radius: 50%;
		transform: translate(-50%, -50%);
	}

	.void {
		z-index: 4;
		width: 43%;
		aspect-ratio: 1;
		background: #000716;
		box-shadow: 0 0 1.5rem rgb(0 7 22 / 75%);
	}

	.ring {
		border-style: solid;
	}

	.ring--one {
		z-index: 3;
		width: 58%;
		aspect-ratio: 1.12;
		border-width: 0.45rem 0.8rem;
		border-color: var(--color-orange) var(--color-yellow);
		transform: translate(-50%, -50%) rotate(-7deg);
	}

	.ring--two {
		z-index: 2;
		width: 78%;
		aspect-ratio: 1.8;
		border-width: 0.18rem 1.3rem;
		border-color: var(--color-teal) var(--color-orange);
		transform: translate(-50%, -50%) rotate(8deg);
	}

	.ring--three {
		z-index: 1;
		width: 100%;
		aspect-ratio: 2.35;
		border-width: 0.1rem 0.45rem;
		border-color: var(--color-yellow) var(--color-cyan);
		transform: translate(-50%, -50%) rotate(-4deg);
	}

	.gravity-line {
		position: absolute;
		left: 50%;
		width: 90%;
		height: 55%;
		border: 0.13rem solid var(--color-teal);
		border-color: var(--color-teal) transparent transparent;
		border-radius: 50%;
		transform: translateX(-50%);
	}

	.gravity-line--one {
		top: 16%;
		transform: translateX(-50%) rotate(5deg);
	}

	.gravity-line--two {
		top: 26%;
		width: 104%;
		border-color: var(--color-orange) transparent transparent;
		transform: translateX(-50%) rotate(-5deg);
	}

	.gravity-line--three {
		top: 36%;
		width: 118%;
		transform: translateX(-50%) rotate(2deg);
	}

	.star {
		position: absolute;
		width: 0.65rem;
		aspect-ratio: 1;
		background: var(--color-yellow);
		clip-path: polygon(50% 0, 58% 39%, 100% 50%, 58% 60%, 50% 100%, 42% 60%, 0 50%, 42% 39%);
	}

	.star--one {
		top: 20%;
		left: 10%;
	}

	.star--two {
		top: 12%;
		right: 14%;
		width: 1rem;
		background: var(--color-orange);
	}

	.star--three {
		right: 8%;
		bottom: 17%;
		background: var(--color-cyan);
	}

	.starting-points {
		position: relative;
		z-index: 3;
		display: grid;
		width: min(100%, 46rem);
		gap: clamp(0.65rem, 2vw, 1rem);
		margin: 0 auto;
	}

	.starting-choice {
		display: grid;
		width: min(86%, 38rem);
		min-height: clamp(6.2rem, 19vw, 8rem);
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 1rem;
		padding: 0.65rem clamp(1rem, 3vw, 1.6rem);
		border: 0.2rem solid var(--color-butter);
		border-radius: 4rem 4.8rem 3.7rem 4.3rem;
		background: var(--color-yellow);
		color: var(--color-navy);
		cursor: pointer;
		font-family: var(--font-display);
		font-size: clamp(1.35rem, 4.5vw, 2.15rem);
		font-weight: 800;
		line-height: 1.05;
		text-align: left;
		transition:
			transform 180ms cubic-bezier(0.2, 0.85, 0.25, 1),
			box-shadow 180ms ease;
	}

	.starting-choice:nth-child(1) {
		justify-self: start;
		transform: rotate(-1.2deg);
	}

	.starting-choice:nth-child(2) {
		justify-self: end;
		background: color-mix(in srgb, var(--color-cyan) 42%, var(--color-cream));
		transform: rotate(1deg);
	}

	.starting-choice:nth-child(3) {
		justify-self: center;
		background: color-mix(in srgb, var(--color-teal) 78%, white);
		transform: rotate(-0.7deg);
	}

	.starting-choice:hover,
	.choice--selected {
		box-shadow: 0.45rem 0.6rem 0 color-mix(in srgb, var(--color-orange) 66%, transparent);
		transform: translateY(-0.2rem) rotate(0deg);
	}

	.choice--selected {
		outline: 0.2rem solid var(--color-orange);
		outline-offset: 0.18rem;
	}

	.choice-icon {
		display: grid;
		width: clamp(4.2rem, 15vw, 5.8rem);
		aspect-ratio: 1;
		place-items: center;
		border-radius: 50%;
		background: var(--color-orange);
	}

	.starting-choice--star .choice-icon {
		background: var(--color-teal);
	}

	.starting-choice--spiral .choice-icon {
		background: var(--color-navy);
		color: var(--color-butter);
	}

	.choice-icon svg {
		width: 72%;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 3;
	}

	.choice-icon .filled {
		fill: var(--color-butter);
		stroke: none;
	}

	.selection-status {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
		clip-path: inset(50%);
	}

	@keyframes space-arrives {
		from {
			clip-path: ellipse(26% 12% at 50% 78%);
		}
	}

	@media (min-width: 64rem) {
		.orientation-shell {
			display: grid;
			grid-template-columns: minmax(28rem, 0.9fr) minmax(32rem, 1.1fr);
			grid-template-rows: auto 1fr;
			gap: 0 clamp(3rem, 6vw, 7rem);
		}

		.orientation-shell::after {
			inset: 0 0 0 42%;
			clip-path: ellipse(80% 86% at 79% 50%);
		}

		.orientation-header {
			grid-column: 1 / -1;
		}

		.orientation-intro {
			align-self: center;
			margin-top: 3rem;
		}

		.space-world {
			position: absolute;
			top: 18%;
			right: 0;
			width: 55%;
			height: 38%;
		}

		.starting-points {
			grid-column: 2;
			align-self: end;
			margin-bottom: 3vh;
		}
	}

	@media (max-width: 32rem) {
		.orientation-shell {
			padding-inline: 1rem;
		}

		.orientation-intro {
			margin-top: 2.2rem;
		}

		.back-button {
			position: relative;
			top: auto;
			left: auto;
			margin-bottom: 0.8rem;
		}

		.topic-pill {
			width: 100%;
		}

		.starting-choice {
			width: 94%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.orientation-shell::after {
			animation: none;
		}

		.starting-choice {
			transition: none;
		}
	}
</style>
