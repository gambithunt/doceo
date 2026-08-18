<script lang="ts">
	type Illustration = 'cat' | 'clock' | 'leaf' | 'telescope';

	let { variant }: { variant: Illustration } = $props();
</script>

<span
	class:clock={variant === 'clock'}
	class:leaf={variant === 'leaf'}
	class:telescope={variant === 'telescope'}
	class="illustration"
>
	{#if variant === 'cat'}
		<svg viewBox="0 0 96 96" role="presentation">
			<path
				d="M24 34 19 14l21 13a44 44 0 0 1 17 0l21-13-5 21c7 7 11 16 11 27 0 20-16 29-36 29S12 82 12 62c0-11 5-21 12-28Z"
			/>
			<path
				class="line"
				d="M31 59c6-2 10-1 17 4 7-5 11-6 17-4M48 63v7m0 0c-5 5-10 5-14 1m14-1c5 5 10 5 14 1M30 51h1m34 0h1M28 64 9 60m19 10-18 4m58-10 19-4m-19 10 18 4"
			/>
		</svg>
	{:else if variant === 'clock'}
		<svg viewBox="0 0 96 96" role="presentation">
			<circle cx="48" cy="48" r="34" />
			<path class="line" d="M48 28v22l17 9M48 14v7m0 54v7M14 48h7m54 0h7" />
			<path class="orbit" d="M18 66C3 52 11 26 29 15M68 16c22 11 25 44 7 62" />
		</svg>
	{:else if variant === 'leaf'}
		<svg viewBox="0 0 96 96" role="presentation">
			<path d="M78 13C42 15 20 34 18 70c29 8 56-10 60-57Z" />
			<path class="line" d="M15 86c13-24 29-39 51-60M31 63l1-20m12 7 18 1M50 39l2-13" />
		</svg>
	{:else}
		<svg viewBox="0 0 96 96" role="presentation">
			<path d="m18 31 48-18 10 25-49 18-9-25Z" />
			<path class="line" d="m55 48-12 35m12-35 22 35M31 55 17 83M66 20l13-5" />
			<circle class="line" cx="78" cy="16" r="6" />
		</svg>
	{/if}
</span>

<style>
	.illustration {
		display: grid;
		width: clamp(4.4rem, 18vw, 6rem);
		aspect-ratio: 1;
		place-items: center;
		flex: 0 0 auto;
		border-radius: 50%;
		background: var(--color-orange);
		color: var(--color-navy);
		transform: rotate(-4deg);
	}

	.illustration.clock {
		background: var(--color-teal);
		transform: rotate(5deg);
	}

	.illustration.leaf {
		background: var(--color-yellow);
		transform: rotate(-7deg);
	}

	.illustration.telescope {
		background: var(--color-cyan);
		transform: rotate(3deg);
	}

	svg {
		width: 82%;
		height: 82%;
		overflow: visible;
		fill: color-mix(in srgb, var(--color-butter) 70%, white);
	}

	.line,
	.orbit {
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 3.5;
	}

	.orbit {
		stroke-dasharray: 5 6;
		stroke-width: 2.5;
	}
</style>
