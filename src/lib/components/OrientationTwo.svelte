<script lang="ts">
	import { productName } from '$lib/app-meta';
	import type { LearningAngle } from '$lib/experience/types';

	type Props = {
		question: string;
		onhome: () => void;
		onback: () => void;
		onselect: (angle: LearningAngle) => void;
		initialSelection?: LearningAngle | '';
		notice?: string;
	};

	let { question, onhome, onback, onselect, initialSelection = '', notice = '' }: Props = $props();
	let selected = $derived(initialSelection);
	let historyOpen = $state(false);
	let heading: HTMLHeadingElement;

	const choices: Array<{
		label: LearningAngle;
		detail?: string;
		icon: 'falling' | 'telescope' | 'inside' | 'surprise';
	}> = [
		{ label: 'What would falling in feel like?', icon: 'falling' },
		{
			label: 'Show me a real example',
			detail: 'How astronomers found one',
			icon: 'telescope'
		},
		{ label: 'What is actually inside?', icon: 'inside' },
		{ label: 'Surprise me', icon: 'surprise' }
	];

	$effect(() => {
		heading?.focus();
	});

	function select(angle: LearningAngle) {
		onselect(angle);
	}
</script>

<main class="angle-shell">
	<header class="angle-header">
		<button class="brand-button" type="button" onclick={onhome} aria-label="Return to Doceo home">
			{productName}
		</button>
		<div class="history-wrap">
			<button
				class="history-button"
				type="button"
				aria-expanded={historyOpen}
				aria-controls="angle-history-note"
				onclick={() => (historyOpen = !historyOpen)}>History</button
			>
			{#if historyOpen}
				<div class="history-note" id="angle-history-note">
					<strong>No lessons yet.</strong>
					<span>Finish this one and it will appear here.</span>
				</div>
			{/if}
		</div>
	</header>

	<section class="angle-intro">
		<button
			class="back-button"
			type="button"
			onclick={onback}
			aria-label="Change your starting point"
		>
			<svg viewBox="0 0 32 32" role="presentation">
				<path d="M25 16H7m8-8-8 8 8 8" />
			</svg>
		</button>
		<p class="topic-pill"><span aria-hidden="true">?</span>{question}</p>
		<h1 bind:this={heading} tabindex="-1">How should we explore it?</h1>
	</section>

	<div class="space-bridge" aria-hidden="true">
		<div class="bridge-line bridge-line--one"></div>
		<div class="bridge-line bridge-line--two"></div>
		<div class="mini-hole"><span></span></div>
	</div>

	<section class="angle-choices" aria-label="Choose how to explore black holes">
		{#each choices as choice (choice.label)}
			<button
				class:angle-choice--selected={selected === choice.label}
				class="angle-choice angle-choice--{choice.icon}"
				type="button"
				aria-pressed={selected === choice.label}
				onclick={() => select(choice.label)}
			>
				<span class="choice-icon" aria-hidden="true">
					{#if choice.icon === 'falling'}
						<svg viewBox="0 0 64 64" role="presentation">
							<path class="dashed" d="M11 9c13 4 23 14 26 27" />
							<circle cx="40" cy="35" r="4" />
							<path d="m38 40-8 9m9-8 8 9m-9-9-9-4m10 3 8-5" />
						</svg>
					{:else if choice.icon === 'telescope'}
						<svg viewBox="0 0 64 64" role="presentation">
							<path d="m13 23 31-12 6 14-32 12-5-14Zm23 10-7 19m7-19 11 19M20 37l-7 15" />
							<circle class="filled" cx="52" cy="14" r="3" />
						</svg>
					{:else if choice.icon === 'inside'}
						<svg viewBox="0 0 64 64" role="presentation">
							<circle cx="32" cy="32" r="25" />
							<path d="M24 24c1-10 17-10 17 1 0 7-9 6-9 14m0 9h.1" />
						</svg>
					{:else}
						<svg viewBox="0 0 64 64" role="presentation">
							<path class="filled" d="m32 5 5 20 22 7-22 6-5 21-6-21-21-6 21-7 6-20Z" />
						</svg>
					{/if}
				</span>
				<span class="choice-copy">
					<strong>{choice.label}</strong>
					{#if choice.detail}<small>{choice.detail}</small>{/if}
				</span>
			</button>
		{/each}
		<p class="selection-status" aria-live="polite">
			{#if selected}Exploration selected: {selected}.{/if}
		</p>
		{#if notice}<p class="route-notice" role="status">{notice}</p>{/if}
	</section>
</main>

<style>
	.angle-shell {
		position: relative;
		isolation: isolate;
		min-height: 100svh;
		overflow: hidden;
		padding: clamp(1.5rem, 5vw, 4rem) var(--page-gutter) clamp(3rem, 8vw, 6rem);
		background:
			radial-gradient(circle at 18% 46%, var(--color-yellow) 0 0.11rem, transparent 0.16rem),
			radial-gradient(circle at 72% 62%, var(--color-cyan) 0 0.1rem, transparent 0.15rem),
			linear-gradient(var(--color-butter) 0 30%, var(--color-space) 42% 100%);
		background-size:
			5rem 5.6rem,
			6.5rem 7rem,
			auto;
		animation: settle-in 430ms ease both;
	}

	.angle-header {
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
		-webkit-text-stroke: 0.07rem var(--color-cream);
		paint-order: stroke fill;
		text-shadow:
			0.06rem 0 var(--color-cream),
			-0.06rem 0 var(--color-cream),
			0 0.06rem var(--color-cream),
			0 -0.06rem var(--color-cream);
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

	.angle-intro {
		position: relative;
		z-index: 5;
		width: min(100%, 58rem);
		margin: clamp(2.2rem, 6vw, 4.2rem) auto 0;
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

	.topic-pill > span {
		display: grid;
		width: 3rem;
		aspect-ratio: 1;
		place-items: center;
		border-radius: 50%;
		background: var(--color-teal);
		font-size: 2rem;
	}

	h1 {
		max-width: 14ch;
		margin: clamp(1.8rem, 5vw, 3.4rem) auto 0;
		font-family: var(--font-display);
		font-size: clamp(3.1rem, 8.7vw, 6rem);
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
		width: 44%;
		height: 0.45rem;
		margin: 1.1rem auto 0;
		border-radius: 50%;
		background: var(--color-orange);
		content: '';
		transform: rotate(-1deg);
	}

	.space-bridge {
		position: relative;
		z-index: 2;
		width: min(100%, 46rem);
		height: clamp(7rem, 22vw, 11rem);
		margin: 0 auto -1rem;
	}

	.mini-hole {
		position: absolute;
		top: 50%;
		left: 50%;
		display: grid;
		width: clamp(4rem, 13vw, 6.5rem);
		aspect-ratio: 1;
		place-items: center;
		border: 0.35rem solid var(--color-yellow);
		border-right-color: var(--color-orange);
		border-left-color: var(--color-teal);
		border-radius: 50%;
		box-shadow: 0 0 0 0.5rem rgb(21 157 172 / 18%);
		transform: translate(-50%, -50%);
	}

	.mini-hole span {
		width: 74%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: #000716;
	}

	.bridge-line {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 92%;
		height: 70%;
		border: 0.12rem solid var(--color-teal);
		border-color: var(--color-teal) transparent transparent;
		border-radius: 50%;
		transform: translate(-50%, -50%) rotate(3deg);
	}

	.bridge-line--two {
		width: 108%;
		border-color: var(--color-orange) transparent transparent;
		transform: translate(-50%, -50%) rotate(-5deg);
	}

	.angle-choices {
		position: relative;
		z-index: 4;
		display: grid;
		width: min(100%, 48rem);
		gap: clamp(0.55rem, 2vw, 0.9rem);
		margin: 0 auto;
	}

	.angle-choice {
		display: grid;
		width: min(91%, 42rem);
		min-height: clamp(5.8rem, 18vw, 7.6rem);
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: clamp(0.9rem, 3vw, 1.4rem);
		padding: 0.6rem clamp(1rem, 3vw, 1.7rem);
		border: 0.2rem solid var(--color-butter);
		border-radius: 4rem 4.8rem 3.7rem 4.3rem;
		background: var(--color-yellow);
		color: var(--color-navy);
		cursor: pointer;
		text-align: left;
		transition:
			transform 180ms cubic-bezier(0.2, 0.85, 0.25, 1),
			box-shadow 180ms ease;
	}

	.angle-choice:nth-child(1) {
		justify-self: start;
		transform: rotate(-1deg);
	}

	.angle-choice:nth-child(2) {
		justify-self: end;
		background: color-mix(in srgb, var(--color-cyan) 43%, var(--color-cream));
		transform: rotate(0.7deg);
	}

	.angle-choice:nth-child(3) {
		justify-self: start;
		background: color-mix(in srgb, var(--color-teal) 82%, white);
		transform: rotate(-0.6deg);
	}

	.angle-choice:nth-child(4) {
		justify-self: center;
		width: min(78%, 34rem);
		transform: rotate(0.5deg);
	}

	.angle-choice:hover,
	.angle-choice--selected {
		box-shadow: 0.45rem 0.6rem 0 color-mix(in srgb, var(--color-orange) 66%, transparent);
		transform: translateY(-0.2rem) rotate(0deg);
	}

	.angle-choice--selected {
		outline: 0.2rem solid var(--color-orange);
		outline-offset: 0.18rem;
	}

	.choice-icon {
		display: grid;
		width: clamp(4.1rem, 14vw, 5.6rem);
		aspect-ratio: 1;
		place-items: center;
		border-radius: 50%;
		background: var(--color-orange);
	}

	.angle-choice--telescope .choice-icon,
	.angle-choice--surprise .choice-icon {
		background: var(--color-teal);
	}

	.angle-choice--inside .choice-icon {
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

	.choice-icon .dashed {
		stroke-dasharray: 4 5;
	}

	.choice-copy {
		display: grid;
		gap: 0.25rem;
	}

	.choice-copy strong {
		font-family: var(--font-display);
		font-size: clamp(1.2rem, 4vw, 1.9rem);
		line-height: 1.02;
	}

	.choice-copy small {
		font-size: clamp(0.92rem, 2.7vw, 1.2rem);
		font-weight: 650;
		line-height: 1.2;
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

	.route-notice {
		width: min(92%, 38rem);
		margin: 0.4rem auto 0;
		padding: 0.75rem 1rem;
		border: 0.12rem solid var(--color-cyan);
		border-radius: 1.2rem 1.5rem 1.1rem 1.4rem;
		background: rgb(3 20 47 / 84%);
		color: var(--color-butter);
		font-size: 0.9rem;
		font-weight: 650;
		line-height: 1.35;
		text-align: center;
	}

	@keyframes settle-in {
		from {
			opacity: 0.3;
			transform: translateY(0.8rem);
		}
	}

	@media (min-width: 64rem) {
		.angle-shell {
			display: grid;
			grid-template-columns: minmax(28rem, 0.85fr) minmax(34rem, 1.15fr);
			grid-template-rows: auto 1fr;
			gap: 0 clamp(3rem, 6vw, 7rem);
			background:
				radial-gradient(circle at 76% 20%, var(--color-cyan) 0 0.12rem, transparent 0.17rem),
				linear-gradient(90deg, var(--color-butter) 0 42%, var(--color-space) 55% 100%);
		}

		.angle-header {
			grid-column: 1 / -1;
		}

		.angle-intro {
			align-self: center;
			margin-top: 3rem;
		}

		.space-bridge {
			position: absolute;
			top: 22%;
			right: 0;
			width: 55%;
		}

		.angle-choices {
			grid-column: 2;
			align-self: end;
			margin-bottom: 2vh;
		}
	}

	@media (max-width: 32rem) {
		.angle-shell {
			padding-inline: 1rem;
		}

		.angle-intro {
			margin-top: 2rem;
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

		.angle-choice {
			width: 96%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.angle-shell {
			animation: none;
		}

		.angle-choice {
			transition: none;
		}
	}
</style>
