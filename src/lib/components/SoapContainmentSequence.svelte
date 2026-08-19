<script lang="ts">
	import type { VisualNode } from '$lib/visuals/types';

	type Props = { nodes: VisualNode[]; activeStateIds: string[] };
	let { nodes, activeStateIds }: Props = $props();
	const orderedNodes = $derived([...nodes].sort((a, b) => a.sequenceIndex - b.sequenceIndex));
	const active = $derived(new Set(activeStateIds));
</script>

<div class="soap-world" aria-label="How soap helps water carry grease away">
	<div class="water-dots" aria-hidden="true"></div>
	<div class="sequence">
		{#each orderedNodes as node, index (node.id)}
			<article
				class:active={active.has(node.id)}
				class:quiet={!active.has(node.id)}
				style={`--stage: ${index}`}
			>
				<div class="picture picture--{node.status}" aria-hidden="true">
					{#if node.status === 'on-surface'}
						<span class="surface"></span><span class="grease"></span>
					{:else if node.status === 'soap-interacting'}
						<span class="surface"></span><span class="grease"></span>
						<i class="bubble bubble--one"></i><i class="bubble bubble--two"></i><i
							class="bubble bubble--three"
						></i>
					{:else if node.status === 'dispersed-in-water-inside-micelles'}
						<span class="micelle"><i></i></span><span class="micelle micelle--small"><i></i></span>
					{:else}
						<span class="flow flow--one"></span><span class="flow flow--two"></span><span
							class="carried-dot carried-dot--one"
						></span><span class="carried-dot carried-dot--two"></span>
					{/if}
				</div>
				<div class="label">
					<small>0{index + 1}</small>
					<h3>{node.label}</h3>
				</div>
				{#if index < orderedNodes.length - 1}<i class="connector" aria-hidden="true">→</i>{/if}
			</article>
		{/each}
	</div>
</div>

<style>
	.soap-world {
		position: relative;
		min-height: clamp(23rem, 46vw, 33rem);
		overflow: hidden;
		border: 0.18rem solid var(--color-navy);
		border-radius: clamp(2.2rem, 6vw, 5rem) clamp(3.5rem, 9vw, 8rem) clamp(2rem, 5vw, 4rem)
			clamp(3rem, 8vw, 7rem);
		background: var(--color-cyan);
		box-shadow: 0.68rem 0.76rem 0 var(--color-orange);
	}

	.water-dots,
	.water-dots::before {
		position: absolute;
		inset: 0;
		background-image:
			radial-gradient(circle, rgb(255 249 223 / 72%) 0 0.16rem, transparent 0.2rem),
			radial-gradient(circle, rgb(7 27 59 / 22%) 0 0.11rem, transparent 0.15rem);
		background-position:
			0 0,
			2.4rem 2rem;
		background-size:
			5.2rem 4.6rem,
			6rem 5.4rem;
		content: '';
	}

	.water-dots::before {
		animation: water-drifts 16s linear infinite;
		opacity: 0.38;
	}

	.sequence {
		position: relative;
		z-index: 1;
		display: grid;
		min-height: inherit;
		grid-template-columns: repeat(4, 1fr);
		align-items: center;
		gap: clamp(1rem, 3vw, 2.5rem);
		padding: clamp(2rem, 5vw, 4rem);
	}

	article {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 0.9rem;
		text-align: center;
		transition:
			opacity 280ms ease,
			filter 280ms ease,
			transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	article.active {
		animation: state-arrives 520ms both;
	}

	article.quiet {
		filter: saturate(0.45);
		opacity: 0.28;
		transform: scale(0.88);
	}

	.picture {
		position: relative;
		width: clamp(7rem, 14vw, 10rem);
		aspect-ratio: 1;
		overflow: hidden;
		border: 0.22rem solid var(--color-navy);
		border-radius: 47% 53% 44% 56%;
		background: var(--color-cream);
		box-shadow: 0.38rem 0.44rem 0 var(--color-yellow);
	}

	.surface {
		position: absolute;
		right: 12%;
		bottom: 23%;
		left: 12%;
		height: 0.65rem;
		border-radius: 999px;
		background: var(--color-navy);
		transform: rotate(-3deg);
	}

	.grease {
		position: absolute;
		bottom: 29%;
		left: 33%;
		width: 40%;
		height: 24%;
		border: 0.18rem solid var(--color-navy);
		border-radius: 58% 42% 46% 54%;
		background: var(--color-orange);
	}

	.picture--soap-interacting .grease {
		animation: grease-wobbles 1.8s ease-in-out infinite alternate;
	}

	.bubble {
		position: absolute;
		width: 1.7rem;
		aspect-ratio: 1;
		border: 0.18rem solid var(--color-teal);
		border-radius: 50%;
		animation: bubble-bobs 1.6s ease-in-out infinite alternate;
	}

	.bubble--one {
		top: 18%;
		left: 20%;
	}
	.bubble--two {
		top: 11%;
		right: 18%;
		width: 1.2rem;
		animation-delay: -0.5s;
	}
	.bubble--three {
		top: 39%;
		right: 12%;
		width: 1rem;
		animation-delay: -0.9s;
	}

	.micelle {
		position: absolute;
		top: 21%;
		left: 18%;
		display: grid;
		width: 4.8rem;
		aspect-ratio: 1;
		place-items: center;
		border: 0.45rem dotted var(--color-teal);
		border-radius: 50%;
		animation: micelle-turns 7s linear infinite;
	}

	.micelle i {
		width: 58%;
		aspect-ratio: 1;
		border: 0.17rem solid var(--color-navy);
		border-radius: 48% 52% 45% 55%;
		background: var(--color-orange);
	}

	.micelle--small {
		top: 54%;
		left: 58%;
		width: 2.8rem;
		animation-direction: reverse;
	}

	.flow {
		position: absolute;
		left: -12%;
		width: 124%;
		height: 1rem;
		border-top: 0.26rem solid var(--color-teal);
		border-radius: 50%;
		animation: rinse-flows 1.3s linear infinite;
	}

	.flow--one {
		top: 36%;
	}
	.flow--two {
		top: 58%;
		animation-delay: -0.65s;
	}

	.carried-dot {
		position: absolute;
		width: 1.4rem;
		aspect-ratio: 1;
		border: 0.15rem solid var(--color-navy);
		border-radius: 48%;
		background: var(--color-orange);
		animation: dirt-travels 2s linear infinite;
	}

	.carried-dot--one {
		top: 25%;
		left: 12%;
	}
	.carried-dot--two {
		top: 52%;
		left: 38%;
		animation-delay: -1s;
	}

	.label small {
		color: var(--color-orange);
		font-weight: 950;
		letter-spacing: 0.08em;
	}

	.label h3 {
		max-width: 12rem;
		margin: 0.18rem 0 0;
		color: var(--color-navy);
		font-family: var(--font-display);
		font-size: clamp(0.86rem, 1.7vw, 1.15rem);
		line-height: 1.08;
	}

	.connector {
		position: absolute;
		top: 36%;
		right: calc(clamp(1rem, 3vw, 2.5rem) * -0.78);
		color: var(--color-navy);
		font-size: 1.8rem;
		font-style: normal;
		font-weight: 900;
	}

	@keyframes state-arrives {
		from {
			opacity: 0;
			transform: translateY(1rem) rotate(-2deg);
		}
	}
	@keyframes water-drifts {
		to {
			transform: translate3d(5.2rem, 4.6rem, 0);
		}
	}
	@keyframes grease-wobbles {
		to {
			transform: translateY(-0.25rem) rotate(4deg);
		}
	}
	@keyframes bubble-bobs {
		to {
			transform: translateY(-0.45rem);
		}
	}
	@keyframes micelle-turns {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes rinse-flows {
		to {
			transform: translateX(1rem);
		}
	}
	@keyframes dirt-travels {
		to {
			transform: translateX(7rem) rotate(180deg);
		}
	}

	@media (max-width: 52rem) {
		.sequence {
			grid-template-columns: repeat(2, 1fr);
		}
		article:nth-child(even) .connector {
			top: auto;
			right: auto;
			bottom: -2rem;
			left: 50%;
			transform: rotate(90deg);
		}
	}

	@media (max-width: 31rem) {
		.soap-world {
			min-height: 40rem;
		}
		.sequence {
			grid-template-columns: 1fr;
			padding: 2rem 1.5rem;
		}
		article .connector,
		article:nth-child(even) .connector {
			top: auto;
			right: auto;
			bottom: -1.65rem;
			left: 50%;
			transform: rotate(90deg);
		}
	}
</style>
