<script lang="ts">
	let { onclick }: { onclick: () => void } = $props();
</script>

<button class="home-button" type="button" {onclick} aria-label="Return to Doceo home">
	<svg viewBox="0 0 32 32" role="presentation">
		<path d="m5 15 11-9 11 9v12h-8v-8h-6v8H5V15Z" />
	</svg>
	<span>Home</span>
</button>

<style>
	.home-button {
		position: absolute;
		z-index: 30;
		top: clamp(1rem, 2.5vw, 1.8rem);
		right: var(--page-gutter);
		display: flex;
		min-height: 2.7rem;
		align-items: center;
		gap: 0.45rem;
		padding: 0.4rem 0.75rem 0.4rem 0.55rem;
		border: 0.13rem solid var(--color-navy);
		border-radius: 999px;
		background: var(--color-cream);
		box-shadow: 0.2rem 0.25rem 0 var(--color-yellow);
		color: var(--color-navy);
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 800;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease;
	}

	.home-button:hover {
		box-shadow: 0.3rem 0.38rem 0 var(--color-orange);
		transform: translateY(-0.1rem);
	}

	.home-button:active {
		box-shadow: 0.1rem 0.12rem 0 var(--color-yellow);
		transform: translateY(0.08rem);
	}

	svg {
		width: 1.35rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.2;
	}

	@media (max-width: 28rem) {
		.home-button span {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
			clip-path: inset(50%);
		}

		.home-button {
			aspect-ratio: 1;
			padding: 0.55rem;
		}
	}
</style>
