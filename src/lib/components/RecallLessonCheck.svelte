<script lang="ts">
	import type { VisualRecallLessonCheck } from '$lib/visuals/types';

	type Props = { check: VisualRecallLessonCheck; onrevealed?: () => void; onback?: () => void };
	let { check, onrevealed, onback }: Props = $props();
	let revealed = $state(false);

	function reveal() {
		revealed = true;
		onrevealed?.();
	}
</script>

<section class="check-shell" aria-labelledby="recall-heading">
	<div>
		<p class="eyebrow">10-second check</p>
		<h1 id="recall-heading">{check.prompt}</h1>
		<p>{check.invitation}</p>
	</div>
	{#if revealed}
		<div class="answer" aria-live="polite">
			<span>Checked answer</span>
			<strong>{check.answer}</strong>
		</div>
	{:else}
		<button class="reveal" type="button" onclick={reveal}>Reveal the answer</button>
	{/if}
	<button class="back" type="button" onclick={onback}>Back to the lesson</button>
</section>

<style>
	.check-shell {
		display: grid;
		width: min(100%, 52rem);
		min-height: calc(100svh - 7rem);
		align-content: center;
		justify-items: center;
		gap: 2rem;
		margin: 0 auto;
		padding: 6rem 0 2rem;
		text-align: center;
	}
	.eyebrow {
		margin: 0 0 0.7rem;
		color: var(--color-teal);
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 7vw, 5rem);
		letter-spacing: -0.055em;
		line-height: 0.98;
		text-wrap: balance;
	}
	.check-shell p:not(.eyebrow) {
		font-weight: 750;
	}
	.reveal {
		padding: 1rem 1.5rem;
		border: 0.16rem solid var(--color-navy);
		border-radius: 999px;
		background: var(--color-yellow);
		box-shadow: 0.35rem 0.42rem 0 var(--color-orange);
		color: var(--color-navy);
		cursor: pointer;
		font-weight: 900;
	}
	.answer {
		display: grid;
		width: min(100%, 38rem);
		gap: 0.7rem;
		padding: 1.4rem;
		border: 0.17rem solid var(--color-navy);
		border-radius: 2rem;
		background: var(--color-teal);
		box-shadow: 0.45rem 0.5rem 0 var(--color-orange);
	}
	.answer span {
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.answer strong {
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 4vw, 2.5rem);
		line-height: 1.08;
	}
	.back {
		padding: 0.4rem 0;
		border: 0;
		border-bottom: 0.15rem solid var(--color-teal);
		background: transparent;
		color: var(--color-navy);
		cursor: pointer;
		font-weight: 900;
	}
</style>
