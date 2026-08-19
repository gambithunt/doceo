<script lang="ts">
	import type { VisualNode } from '$lib/visuals/types';

	type Props = {
		nodes: VisualNode[];
		activeStateIds: string[];
	};

	let { nodes, activeStateIds }: Props = $props();
	const orderedNodes = $derived([...nodes].sort((a, b) => a.sequenceIndex - b.sequenceIndex));
	const active = $derived(new Set(activeStateIds));
</script>

<div class="cosmos" aria-label="Timeline from unknown events before inflation to later evidence">
	<div class="stars" aria-hidden="true"></div>
	<div class="time-arrow" aria-hidden="true"><span>earlier</span><i></i><span>later</span></div>

	<div class="timeline">
		<div class="track" aria-hidden="true"></div>
		{#each orderedNodes as node, index (node.id)}
			<article
				class:active={active.has(node.id)}
				class:quiet={!active.has(node.id)}
				class="node node--{node.status}"
				style={`--node-index: ${index}`}
			>
				<div class="marker" aria-hidden="true">
					{#if node.status === 'unknown'}<span>?</span>
					{:else if node.status === 'inferred'}<span>≈</span>
					{:else}<span>●</span>{/if}
				</div>
				<p>{node.status === 'observed' ? 'observed' : node.status}</p>
				<h3>{node.label}</h3>
			</article>
		{/each}

		<div
			class:visible={active.has('inflation') && active.has('observed-evidence')}
			class="evidence-link"
			aria-hidden="true"
		>
			<svg viewBox="0 0 400 120" preserveAspectRatio="none">
				<path d="M370 90 C300 4 185 4 120 86" />
				<path class="arrowhead" d="m120 86 18-2-10-15" />
			</svg>
			<span>evidence supports</span>
		</div>
	</div>
</div>

<style>
	.cosmos {
		position: relative;
		min-height: clamp(22rem, 48vw, 34rem);
		overflow: hidden;
		border: 0.16rem solid var(--color-cream);
		border-radius: clamp(2rem, 5vw, 4.5rem) clamp(2.7rem, 7vw, 6rem) clamp(2.2rem, 6vw, 5rem)
			clamp(3rem, 8vw, 7rem);
		background: var(--color-space);
		box-shadow: 0.65rem 0.75rem 0 var(--color-orange);
	}

	.stars,
	.stars::before {
		position: absolute;
		inset: 0;
		background-image:
			radial-gradient(circle, var(--color-yellow) 0 0.1rem, transparent 0.13rem),
			radial-gradient(circle, var(--color-cyan) 0 0.08rem, transparent 0.11rem);
		background-position:
			0 0,
			2.4rem 2rem;
		background-size:
			5rem 4.5rem,
			6.3rem 5.2rem;
		content: '';
		opacity: 0.7;
	}

	.stars::before {
		animation: drift-stars 18s linear infinite;
		opacity: 0.28;
	}

	.time-arrow {
		position: absolute;
		top: clamp(1.3rem, 4vw, 2.4rem);
		left: 8%;
		display: grid;
		width: 84%;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.8rem;
		color: var(--color-cream);
		font-size: 0.7rem;
		font-weight: 850;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.time-arrow i {
		position: relative;
		height: 0.14rem;
		background: var(--color-cream);
	}

	.time-arrow i::after {
		position: absolute;
		top: -0.3rem;
		right: -0.05rem;
		width: 0.55rem;
		height: 0.55rem;
		border-top: 0.14rem solid var(--color-cream);
		border-right: 0.14rem solid var(--color-cream);
		content: '';
		transform: rotate(45deg);
	}

	.timeline {
		position: absolute;
		inset: 20% 6% 7%;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		align-items: center;
	}

	.track {
		position: absolute;
		z-index: 0;
		top: 46%;
		left: 10%;
		width: 80%;
		height: 0.22rem;
		background: var(--color-cream);
		transform: rotate(-1deg);
	}

	.node {
		position: relative;
		z-index: 2;
		display: grid;
		justify-items: center;
		padding: 1rem 0.45rem;
		text-align: center;
		transition:
			opacity 350ms ease,
			transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1),
			filter 350ms ease;
	}

	.node.quiet {
		filter: saturate(0.35);
		opacity: 0.24;
		transform: scale(0.86);
	}

	.node.active {
		animation: node-arrives 500ms calc(var(--node-index) * 90ms) both;
	}

	.marker {
		display: grid;
		width: clamp(4.5rem, 11vw, 7.8rem);
		aspect-ratio: 1;
		place-items: center;
		border: 0.32rem solid var(--color-cream);
		border-radius: 46% 54% 50% 44%;
		background: var(--node-color, var(--color-teal));
		box-shadow: 0.42rem 0.5rem 0 var(--node-shadow, var(--color-yellow));
		color: var(--color-space);
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, 3.5rem);
		font-weight: 900;
	}

	.node--unknown {
		--node-color: var(--color-cream);
		--node-shadow: var(--color-teal);
	}
	.node--inferred {
		--node-color: var(--color-orange);
		--node-shadow: var(--color-yellow);
	}
	.node--observed {
		--node-color: var(--color-teal);
		--node-shadow: var(--color-cyan);
	}

	.node p {
		margin: 1rem 0 0.35rem;
		color: var(--node-color, var(--color-cyan));
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	.node h3 {
		max-width: 12rem;
		margin: 0;
		color: var(--color-cream);
		font-family: var(--font-display);
		font-size: clamp(0.88rem, 2vw, 1.25rem);
		line-height: 1.08;
	}

	.evidence-link {
		position: absolute;
		z-index: 1;
		top: 2%;
		right: 3%;
		width: 58%;
		height: 42%;
		opacity: 0;
		transition: opacity 300ms ease;
	}

	.evidence-link.visible {
		opacity: 1;
	}

	.evidence-link svg {
		width: 100%;
		height: 100%;
		overflow: visible;
		fill: none;
		stroke: var(--color-yellow);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 5;
	}

	.evidence-link path:first-child {
		stroke-dasharray: 12 12;
		animation: evidence-travels 1.8s linear infinite;
	}

	.evidence-link span {
		position: absolute;
		top: 0;
		left: 42%;
		padding: 0.25rem 0.55rem;
		border-radius: 999px;
		background: var(--color-yellow);
		color: var(--color-navy);
		font-size: 0.68rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	@keyframes node-arrives {
		from {
			opacity: 0;
			transform: translateY(1rem) rotate(-2deg);
		}
		to {
			opacity: 1;
			transform: translateY(0) rotate(0);
		}
	}

	@keyframes evidence-travels {
		to {
			stroke-dashoffset: 48;
		}
	}
	@keyframes drift-stars {
		to {
			transform: translate3d(5rem, 4.5rem, 0);
		}
	}

	@media (max-width: 42rem) {
		.cosmos {
			min-height: 31rem;
		}
		.timeline {
			inset: 17% 8% 4%;
			grid-template-columns: 1fr;
			grid-template-rows: repeat(3, 1fr);
		}
		.track {
			top: 8%;
			left: 50%;
			width: 0.2rem;
			height: 82%;
			transform: none;
		}
		.node {
			display: grid;
			grid-template-columns: auto 1fr;
			grid-template-rows: auto auto;
			justify-items: start;
			column-gap: 1rem;
			padding: 0.4rem 0;
			text-align: left;
		}
		.marker {
			grid-row: 1 / 3;
			width: 4.3rem;
		}
		.node p {
			margin-top: 0.7rem;
		}
		.node h3 {
			max-width: none;
		}
		.evidence-link {
			display: none;
		}
	}
</style>
