<script lang="ts">
	import type { VisualNode } from '$lib/visuals/types';

	type Props = { nodes: VisualNode[]; activeStateIds: string[] };
	let { nodes, activeStateIds }: Props = $props();
	const answers = $derived(nodes.filter((node) => node.relationshipToPrevious !== 'start'));
	const active = $derived(new Set(activeStateIds));
</script>

<div class="fact-stage" aria-label="The checked answer">
	<div class="answer-tiles">
		{#each answers as answer, index (answer.id)}
			<article class:revealed={active.has(answer.id)} style={`--tile-index: ${index}`}>
				<span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
				<strong>{active.has(answer.id) ? answer.label : '?'}</strong>
			</article>
		{/each}
	</div>
</div>

<style>
	.fact-stage {
		display: grid;
		min-height: clamp(17rem, 31vw, 23rem);
		place-items: center;
		overflow: hidden;
		padding: clamp(1.4rem, 4vw, 3rem);
		border: 0.17rem solid var(--color-navy);
		border-radius: clamp(2rem, 5vw, 4rem);
		background:
			radial-gradient(circle, rgb(255 248 219 / 70%) 0 0.1rem, transparent 0.14rem),
			var(--color-teal);
		background-size:
			5rem 4.7rem,
			auto;
		box-shadow: 0.6rem 0.65rem 0 var(--color-orange);
	}
	.answer-tiles {
		display: grid;
		width: min(100%, 58rem);
		grid-template-columns: repeat(auto-fit, minmax(min(12rem, 100%), 1fr));
		gap: clamp(0.8rem, 2vw, 1.2rem);
	}
	article {
		display: grid;
		min-height: 10rem;
		align-content: center;
		gap: 0.65rem;
		padding: clamp(1rem, 3vw, 1.5rem);
		border: 0.16rem solid var(--color-navy);
		border-radius: 1.8rem 1.4rem 2rem 1.5rem;
		background: color-mix(in srgb, var(--color-cream) 76%, var(--color-teal));
		box-shadow: 0.35rem 0.4rem 0 var(--color-yellow);
		color: var(--color-navy);
		text-align: center;
	}
	article.revealed {
		background: var(--color-cream);
		animation: reveal 420ms calc(var(--tile-index) * 100ms) ease both;
	}
	article span {
		color: var(--color-orange);
		font-size: 0.75rem;
		font-weight: 950;
		letter-spacing: 0.12em;
	}
	article strong {
		font-family: var(--font-display);
		font-size: clamp(1.25rem, 3vw, 2rem);
		line-height: 1.05;
	}
	article:not(.revealed) strong {
		font-size: 3rem;
	}
	@keyframes reveal {
		from {
			opacity: 0;
			transform: translateY(0.75rem) rotate(-1deg);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (max-width: 42rem) {
		.fact-stage {
			min-height: 25rem;
		}
		.answer-tiles {
			grid-template-columns: 1fr;
		}
		article {
			min-height: 6rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		article.revealed {
			animation: none;
		}
	}
</style>
