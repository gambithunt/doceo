<script lang="ts">
	import type { VisualNode } from '$lib/visuals/types';

	type Props = { nodes: VisualNode[]; activeStateIds: string[] };
	let { nodes, activeStateIds }: Props = $props();
	const orderedNodes = $derived([...nodes].sort((a, b) => a.sequenceIndex - b.sequenceIndex));
	const active = $derived(new Set(activeStateIds));
</script>

<div class="immune-world" aria-label="Immune response sequence from vaccination to later outcomes">
	<div class="floating-cells" aria-hidden="true"></div>
	<div class="sequence">
		{#each orderedNodes as node, index (node.id)}
			<article
				class:active={active.has(node.id)}
				class:quiet={!active.has(node.id)}
				style={`--stage: ${index}`}
			>
				<div class="symbol symbol--{node.status}" aria-hidden="true">
					{#if node.status === 'vaccination'}<span class="vial">+</span>
					{:else if node.status === 'immune-response'}<span class="response">✺</span>
					{:else if node.status === 'memory'}<span class="memory">B</span>
					{:else if node.status === 'reexposure'}<span class="antigen">✦</span>
					{:else if node.status === 'rapid-response'}<span class="antibodies">Y</span>
					{:else if node.status === 'possible-infection'}<span class="infection">•••</span>
					{:else}<span class="severity">↓</span>{/if}
				</div>
				<div class="label">
					<small>{index + 1}</small>
					<h3>{node.label}</h3>
				</div>
				{#if index < orderedNodes.length - 1}<i class="connector" aria-hidden="true">→</i>{/if}
			</article>
		{/each}
	</div>
</div>

<style>
	.immune-world {
		position: relative;
		min-height: clamp(24rem, 48vw, 34rem);
		overflow: hidden;
		border: 0.16rem solid var(--color-navy);
		border-radius: clamp(3rem, 8vw, 7rem) clamp(2rem, 5vw, 4rem) clamp(4rem, 9vw, 8rem)
			clamp(2rem, 6vw, 5rem);
		background: var(--color-cream);
		box-shadow: 0.7rem 0.78rem 0 var(--color-teal);
	}

	.floating-cells,
	.floating-cells::before {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle, rgb(85 200 216 / 45%) 0 0.35rem, transparent 0.4rem),
			radial-gradient(circle, rgb(255 201 40 / 38%) 0 0.22rem, transparent 0.28rem);
		background-position:
			0 0,
			2rem 2.2rem;
		background-size:
			6.2rem 5.4rem,
			5rem 6rem;
		content: '';
	}

	.floating-cells::before {
		animation: cells-float 20s linear infinite;
		opacity: 0.35;
	}

	.sequence {
		position: relative;
		z-index: 2;
		display: grid;
		min-height: inherit;
		grid-template-columns: repeat(3, 1fr);
		align-content: center;
		gap: clamp(1.2rem, 4vw, 3rem);
		padding: clamp(2rem, 6vw, 4.5rem);
	}

	article {
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 0.8rem;
		transition:
			opacity 300ms ease,
			filter 300ms ease,
			transform 400ms ease;
	}

	article.active {
		animation: stage-arrives 500ms calc(var(--stage) * 65ms) both;
	}
	article.quiet {
		filter: grayscale(0.7);
		opacity: 0.22;
		transform: scale(0.9);
	}

	.symbol {
		display: grid;
		width: clamp(4.4rem, 8vw, 6rem);
		aspect-ratio: 1;
		place-items: center;
		border: 0.22rem solid var(--color-navy);
		border-radius: 46% 54% 45% 55%;
		background: var(--symbol-color, var(--color-yellow));
		box-shadow: 0.3rem 0.35rem 0 var(--shadow-color, var(--color-orange));
		color: var(--color-navy);
		font-family: var(--font-display);
		font-size: clamp(1.7rem, 4vw, 2.7rem);
		font-weight: 900;
	}

	.symbol--vaccination,
	.symbol--rapid-response {
		--symbol-color: var(--color-yellow);
		--shadow-color: var(--color-orange);
	}
	.symbol--memory,
	.symbol--immune-response,
	.symbol--reduced-severity {
		--symbol-color: var(--color-teal);
		--shadow-color: var(--color-cyan);
	}
	.symbol--reexposure {
		--symbol-color: var(--color-orange);
		--shadow-color: var(--color-yellow);
	}
	.symbol--possible-infection {
		--symbol-color: var(--color-cream);
		--shadow-color: var(--color-orange);
	}

	.antibodies {
		transform: rotate(12deg);
	}
	.infection {
		font-size: 1.2rem;
		letter-spacing: 0.18rem;
	}
	.memory {
		display: grid;
		width: 70%;
		aspect-ratio: 1;
		place-items: center;
		border: 0.18rem dashed var(--color-navy);
		border-radius: 50%;
		animation: memory-turns 8s linear infinite;
	}

	.label small {
		display: block;
		color: var(--color-orange);
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.08em;
	}

	.label h3 {
		max-width: 12rem;
		margin: 0.15rem 0 0;
		color: var(--color-navy);
		font-family: var(--font-display);
		font-size: clamp(0.9rem, 1.6vw, 1.15rem);
		line-height: 1.05;
	}

	.connector {
		position: absolute;
		top: 50%;
		right: calc(clamp(1.2rem, 4vw, 3rem) * -0.78);
		color: var(--color-orange);
		font-size: 1.8rem;
		font-style: normal;
		font-weight: 900;
		transform: translateY(-50%);
	}

	article:nth-child(3) .connector {
		transform: translateY(-50%) rotate(90deg);
	}

	@keyframes stage-arrives {
		from {
			opacity: 0;
			transform: translateY(1rem) rotate(-2deg);
		}
		to {
			opacity: 1;
			transform: translateY(0) rotate(0);
		}
	}
	@keyframes memory-turns {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes cells-float {
		to {
			transform: translate3d(6.2rem, 5.4rem, 0);
		}
	}

	@media (max-width: 48rem) {
		.sequence {
			grid-template-columns: repeat(2, 1fr);
		}
		article:nth-child(3) .connector {
			transform: translateY(-50%);
		}
		article:nth-child(even) .connector {
			transform: translateY(-50%) rotate(90deg);
		}
	}

	@media (max-width: 31rem) {
		.sequence {
			grid-template-columns: 1fr;
			padding: 2rem 1.5rem;
		}
		article .connector,
		article:nth-child(3) .connector,
		article:nth-child(even) .connector {
			top: auto;
			right: auto;
			bottom: -1.5rem;
			left: 2rem;
			transform: rotate(90deg);
		}
		.label h3 {
			max-width: none;
		}
	}
</style>
