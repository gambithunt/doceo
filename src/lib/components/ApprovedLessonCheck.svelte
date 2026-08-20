<script lang="ts">
	import type { VisualLessonCheck } from '$lib/visuals/types';

	type ChoiceCheck = Extract<VisualLessonCheck, { kind: 'choice' }>;
	type Props = {
		check: ChoiceCheck;
		onanswer?: (responseId: string, supported: boolean) => void;
		onback?: () => void;
	};

	let { check, onanswer, onback }: Props = $props();
	let selectedId = $state('');
	const supported = $derived(selectedId ? check.supportedResponseIds.includes(selectedId) : false);

	function choose(responseId: string) {
		if (supported) return;
		selectedId = responseId;
		onanswer?.(responseId, check.supportedResponseIds.includes(responseId));
	}
</script>

<section class="check-shell" aria-labelledby="check-heading">
	<div class="check-heading">
		<p>10-second check</p>
		<h1 id="check-heading">{check.prompt}</h1>
	</div>

	<div class="choices" aria-label="Choose one answer">
		{#each check.choices as choice, index (choice.id)}
			<button
				class:selected={selectedId === choice.id}
				class:supported={selectedId === choice.id && supported}
				class:not-yet={selectedId === choice.id && !supported}
				type="button"
				aria-pressed={selectedId === choice.id}
				disabled={supported && selectedId !== choice.id}
				onclick={() => choose(choice.id)}
			>
				<span>{String.fromCharCode(65 + index)}</span>
				<strong>{choice.label}</strong>
			</button>
		{/each}
	</div>

	<div class="response" aria-live="polite">
		{#if selectedId}
			<strong>{supported ? 'That’s it.' : 'Not quite yet.'}</strong>
			<p>{supported ? check.feedbackWhenSupported : check.feedbackWhenNotYet}</p>
		{:else}
			<p>{check.invitation}</p>
		{/if}
	</div>

	<button class="back-button" type="button" onclick={onback}>Back to the lesson</button>
</section>

<style>
	.check-shell {
		display: grid;
		width: min(100%, 64rem);
		min-height: calc(100svh - 8rem);
		align-content: center;
		gap: clamp(1.4rem, 3vw, 2.2rem);
		margin: 0 auto;
		padding: clamp(3rem, 8vw, 7rem) 0 2rem;
	}

	.check-heading {
		text-align: center;
	}

	.check-heading p {
		margin: 0 0 0.55rem;
		color: var(--color-teal);
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.check-heading h1 {
		max-width: 16ch;
		margin: 0 auto;
		font-family: var(--font-display);
		font-size: clamp(2.4rem, 6vw, 4.8rem);
		font-weight: 900;
		letter-spacing: -0.055em;
		line-height: 0.98;
		text-wrap: balance;
	}

	.choices {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: clamp(0.75rem, 2vw, 1.2rem);
	}

	.choices button {
		display: grid;
		min-height: 10rem;
		grid-template-rows: auto 1fr;
		gap: 0.8rem;
		padding: 1rem;
		border: 0.16rem solid var(--color-navy);
		border-radius: 2rem 1.4rem 2.2rem 1.6rem;
		background: var(--color-cream);
		box-shadow: 0.32rem 0.4rem 0 var(--color-yellow);
		color: var(--color-navy);
		cursor: pointer;
		text-align: left;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			background 150ms ease;
	}

	.choices button:nth-child(2) {
		background: color-mix(in srgb, var(--color-cyan) 42%, var(--color-cream));
	}

	.choices button:nth-child(3) {
		background: color-mix(in srgb, var(--color-yellow) 72%, var(--color-cream));
	}

	.choices button:hover:not(:disabled) {
		box-shadow: 0.46rem 0.55rem 0 var(--color-orange);
		transform: translateY(-0.12rem) rotate(-0.3deg);
	}

	.choices button.selected {
		box-shadow:
			0 0 0 0.25rem var(--color-teal),
			0.35rem 0.44rem 0 var(--color-orange);
	}

	.choices button.supported {
		background: var(--color-teal);
		color: var(--color-cream);
	}

	.choices button.not-yet {
		background: var(--color-orange);
	}

	.choices button:disabled {
		cursor: default;
		opacity: 0.46;
	}

	.choices span {
		display: grid;
		width: 2.35rem;
		aspect-ratio: 1;
		place-items: center;
		border: 0.13rem solid currentColor;
		border-radius: 50%;
		font-weight: 950;
	}

	.choices strong {
		align-self: end;
		font-family: var(--font-display);
		font-size: clamp(1rem, 2vw, 1.3rem);
		line-height: 1.15;
	}

	.response {
		min-height: 4.7rem;
		padding: 0.95rem 1.1rem;
		border-left: 0.3rem solid var(--color-teal);
		color: var(--color-navy);
	}

	.response strong {
		font-family: var(--font-display);
		font-size: 1.15rem;
	}

	.response p {
		margin: 0.2rem 0 0;
		font-weight: 700;
		line-height: 1.35;
	}

	.back-button {
		justify-self: start;
		padding: 0.45rem 0;
		border: 0;
		border-bottom: 0.16rem solid var(--color-teal);
		background: transparent;
		color: var(--color-navy);
		cursor: pointer;
		font-weight: 900;
	}

	@media (max-width: 42rem) {
		.check-shell {
			align-content: start;
			padding-top: 7rem;
		}
		.choices {
			grid-template-columns: 1fr;
		}
		.choices button {
			min-height: 0;
			grid-template-columns: auto 1fr;
			grid-template-rows: auto;
			align-items: center;
		}
		.choices strong {
			align-self: center;
		}
	}
</style>
