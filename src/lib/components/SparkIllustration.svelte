<script lang="ts">
	type Illustration = 'cat' | 'clock' | 'leaf' | 'telescope' | 'bubble' | 'droplet' | 'soap';

	let { variant }: { variant: Illustration } = $props();
</script>

<span
	class:clock={variant === 'clock'}
	class:leaf={variant === 'leaf'}
	class:telescope={variant === 'telescope'}
	class:bubble={variant === 'bubble'}
	class:droplet={variant === 'droplet'}
	class:soap={variant === 'soap'}
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
	{:else if variant === 'telescope'}
		<svg viewBox="0 0 96 96" role="presentation">
			<path d="m18 31 48-18 10 25-49 18-9-25Z" />
			<path class="line" d="m55 48-12 35m12-35 22 35M31 55 17 83M66 20l13-5" />
			<circle class="line" cx="78" cy="16" r="6" />
		</svg>
	{:else if variant === 'bubble'}
		<svg viewBox="0 0 96 96" role="presentation">
			<circle cx="45" cy="49" r="27" />
			<circle class="line" cx="70" cy="24" r="10" />
			<circle class="line" cx="22" cy="73" r="8" />
			<path class="line" d="M31 39c5-7 12-11 20-11" />
		</svg>
	{:else if variant === 'droplet'}
		<svg viewBox="0 0 96 96" role="presentation">
			<path d="M48 10C39 27 22 43 22 62a26 26 0 0 0 52 0c0-19-17-35-26-52Z" />
			<path class="line" d="M34 63c2 8 8 12 16 13" />
			<circle class="line" cx="50" cy="51" r="10" />
		</svg>
	{:else}
		<svg viewBox="0 0 96 96" role="presentation">
			<path d="M18 43c0-7 6-12 13-12h37c7 0 12 5 12 12v27H18V43Z" />
			<path class="line" d="M18 53h62M31 31c0-8 6-14 14-14m6 14c0-6 5-11 11-11" />
			<circle class="line" cx="72" cy="18" r="7" />
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

	.illustration.bubble {
		background: var(--color-cyan);
		transform: rotate(-3deg);
	}

	.illustration.droplet {
		background: var(--color-teal);
		transform: rotate(4deg);
	}

	.illustration.soap {
		background: var(--color-yellow);
		transform: rotate(-5deg);
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
