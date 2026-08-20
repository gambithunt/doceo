<script lang="ts">
	import type { VisualNode } from '$lib/visuals/types';

	type Props = { nodes: VisualNode[]; activeStateIds: string[] };
	let { nodes, activeStateIds }: Props = $props();
	const orderedNodes = $derived([...nodes].sort((a, b) => a.sequenceIndex - b.sequenceIndex));
	const active = $derived(new Set(activeStateIds));

	function relationshipLabel(relationship: VisualNode['relationshipToPrevious']) {
		return relationship === 'same_event'
			? 'same moment'
			: relationship === 'earlier_to_later'
				? 'then'
				: relationship === 'causes'
					? 'leads to'
					: relationship === 'transforms_into'
						? 'becomes'
						: relationship === 'contrasts_with'
							? 'compared with'
							: relationship === 'contains'
								? 'contains'
								: relationship === 'part_of'
									? 'part of'
									: relationship === 'increases'
										? 'increases'
										: relationship === 'decreases'
											? 'decreases'
											: relationship === 'answers'
												? 'answer'
												: '';
	}
</script>

<div class="sequence" aria-label="The checked ideas in this lesson">
	<div class="orbit orbit--teal" aria-hidden="true"></div>
	<div class="orbit orbit--orange" aria-hidden="true"></div>
	<div class="states">
		{#each orderedNodes as node, index (node.id)}
			{#if index > 0}
				<div class:active={active.has(node.id)} class="connector" aria-hidden="true">
					<span>{relationshipLabel(node.relationshipToPrevious)}</span>
					<i>→</i>
				</div>
			{/if}
			<article class:active={active.has(node.id)} class:quiet={!active.has(node.id)}>
				<b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>
				<p>{node.label}</p>
			</article>
		{/each}
	</div>
</div>

<style>
	.sequence {
		position: relative;
		display: grid;
		min-height: clamp(22rem, 42vw, 31rem);
		place-items: center;
		overflow: hidden;
		border: 0.17rem solid var(--color-navy);
		border-radius: clamp(2.2rem, 6vw, 5rem) clamp(3rem, 8vw, 7rem) clamp(2rem, 5vw, 4rem);
		background:
			radial-gradient(circle, rgb(255 248 219 / 76%) 0 0.11rem, transparent 0.15rem),
			var(--color-teal);
		background-size:
			5rem 4.7rem,
			auto;
		box-shadow: 0.7rem 0.75rem 0 var(--color-orange);
	}
	.orbit {
		position: absolute;
		width: 72%;
		height: 38%;
		border: 0.18rem solid;
		border-radius: 50%;
		opacity: 0.48;
		transform: rotate(-6deg);
	}
	.orbit--teal {
		border-color: var(--color-navy);
	}
	.orbit--orange {
		width: 42%;
		height: 76%;
		border-color: var(--color-orange);
		transform: rotate(18deg);
	}
	.states {
		position: relative;
		z-index: 1;
		display: flex;
		width: min(88%, 62rem);
		align-items: center;
		justify-content: center;
		gap: clamp(0.6rem, 2vw, 1.25rem);
	}
	article {
		display: grid;
		width: min(19rem, 38vw);
		min-height: 12rem;
		align-content: center;
		gap: 0.65rem;
		padding: clamp(1rem, 3vw, 1.7rem);
		border: 0.17rem solid var(--color-navy);
		border-radius: 2.4rem 1.7rem 2.7rem 1.9rem;
		background: var(--color-cream);
		box-shadow: 0.45rem 0.52rem 0 var(--color-yellow);
		color: var(--color-navy);
		transition:
			opacity 250ms ease,
			transform 350ms ease,
			filter 250ms ease;
	}
	article:nth-of-type(even) {
		transform: rotate(1deg);
	}
	article.quiet {
		filter: saturate(0.2);
		opacity: 0.22;
		transform: scale(0.88);
	}
	article.active {
		animation: arrive 420ms ease both;
	}
	article b {
		color: var(--color-orange);
		font-size: 0.78rem;
		letter-spacing: 0.12em;
	}
	article p {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1rem, 2.2vw, 1.45rem);
		font-weight: 850;
		line-height: 1.12;
	}
	.connector {
		display: grid;
		min-width: 5rem;
		justify-items: center;
		color: var(--color-navy);
		opacity: 0.2;
		transition: opacity 260ms ease;
	}
	.connector.active {
		opacity: 1;
	}
	.connector span {
		padding: 0.3rem 0.55rem;
		border-radius: 999px;
		background: var(--color-yellow);
		font-size: 0.68rem;
		font-weight: 900;
		text-transform: uppercase;
	}
	.connector i {
		font-size: 2.3rem;
		font-style: normal;
	}
	@keyframes arrive {
		from {
			opacity: 0;
			transform: translateY(1rem) rotate(-1deg);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@media (max-width: 46rem) {
		.sequence {
			min-height: 33rem;
		}
		.states {
			flex-direction: column;
		}
		article {
			width: min(100%, 24rem);
			min-height: 8rem;
		}
		.connector {
			min-width: 0;
			min-height: 3rem;
		}
		.connector i {
			line-height: 1;
			transform: rotate(90deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		article.active {
			animation: none;
		}
	}
</style>
