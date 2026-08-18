<script lang="ts">
	import { onMount } from 'svelte';
	import HomeButton from './HomeButton.svelte';
	import {
		createRealExampleScenes,
		getRealExampleScene,
		realExampleLessonDuration
	} from '$lib/experience/real-example-lesson';
	import type { StartingPoint } from '$lib/experience/types';

	type Props = {
		startingPoint: StartingPoint;
		onexit: () => void;
		onhome: () => void;
		oncomplete: () => void;
	};

	let { startingPoint, onexit, onhome, oncomplete }: Props = $props();
	let elapsed = $state(0);
	let paused = $state(false);
	let captionsVisible = $state(true);
	let heading = $state<HTMLHeadingElement>();

	const scenes = $derived(createRealExampleScenes(startingPoint));
	const currentScene = $derived(getRealExampleScene(scenes, elapsed));
	const progress = $derived((elapsed / realExampleLessonDuration) * 100);
	const complete = $derived(elapsed >= realExampleLessonDuration);

	onMount(() => {
		let previous = performance.now();
		const timer = window.setInterval(() => {
			const now = performance.now();
			const delta = (now - previous) / 1000;
			previous = now;
			if (paused || complete) return;
			elapsed = Math.min(realExampleLessonDuration, elapsed + delta);
			if (elapsed >= realExampleLessonDuration) paused = true;
		}, 100);
		return () => window.clearInterval(timer);
	});

	$effect(() => heading?.focus());

	$effect(() => {
		if (!complete) return;
		const handoff = window.setTimeout(oncomplete, 1400);
		return () => window.clearTimeout(handoff);
	});

	function togglePlayback() {
		if (complete) elapsed = 0;
		paused = !paused;
	}

	function seek(value: number) {
		elapsed = Math.min(realExampleLessonDuration, Math.max(0, value));
	}

	function formatTime(value: number) {
		const rounded = Math.floor(value);
		return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
	}
</script>

<main
	class:paused
	class:complete
	class="example-shell scene-{currentScene.id}"
	style={`--lesson-progress: ${progress}%`}
>
	<HomeButton onclick={onhome} />
	<button class="exit-button" type="button" onclick={onexit} aria-label="Change how to explore">
		<svg viewBox="0 0 32 32" role="presentation"><path d="M25 16H7m8-8-8 8 8 8" /></svg>
		<span>Change direction</span>
	</button>

	{#key currentScene.id}
		<section class="lesson-copy" aria-live="polite">
			<p>{currentScene.kicker}</p>
			<h1 bind:this={heading} tabindex="-1">{currentScene.title}</h1>
			<h2>{currentScene.subtitle}</h2>
		</section>
	{/key}

	<section
		class="evidence-stage"
		aria-label="Animated explanation of how astronomers detect black holes"
	>
		<div class="star-field" aria-hidden="true"></div>
		<div class="dark-focus" aria-hidden="true"><span></span></div>

		{#if currentScene.id === 'problem'}
			<div class="telescope" aria-hidden="true">
				<span class="scope"></span><span class="tripod"></span><i></i>
			</div>
			<div class="focus-ring" aria-hidden="true"></div>
		{/if}

		{#if ['orbits', 'mass', 'evidence'].includes(currentScene.id)}
			<div class="orbit-system" aria-hidden="true">
				<div class="star-orbit star-orbit--one"><span></span></div>
				<div class="star-orbit star-orbit--two"><span></span></div>
				<div class="star-orbit star-orbit--three"><span></span></div>
			</div>
		{/if}

		{#if currentScene.id === 'orbits'}
			<div class="year-strip" aria-hidden="true">
				<span>1995</span><span>2002</span><span>2012</span><span>2020</span>
			</div>
		{/if}

		{#if ['mass', 'evidence'].includes(currentScene.id)}
			<div class="mass-reading" aria-hidden="true">
				<strong>≈ 4,000,000</strong><span>times the mass of our Sun</span><small
					>inside a solar-system-sized region</small
				>
			</div>
		{/if}

		{#if currentScene.id === 'alternatives'}
			<div class="candidates" aria-hidden="true">
				<div class="candidate">
					<span class="star-swarm">✦ ✦ ✦</span><strong>ordinary-star swarm</strong><i></i>
				</div>
				<div class="candidate">
					<span class="giant-star">✹</span><strong>one colossal star</strong><i></i>
				</div>
			</div>
		{/if}

		{#if ['image', 'evidence'].includes(currentScene.id)}
			<div class="earth-array" aria-hidden="true">
				<div class="earth"><span></span></div>
				{#each [0, 1, 2, 3, 4] as dish (dish)}<i style={`--dish: ${dish}`}>⌁</i>{/each}
			</div>
			<div class="eht-ring" aria-hidden="true"><span></span></div>
		{/if}

		{#if currentScene.id === 'evidence'}
			<div class="evidence-labels" aria-hidden="true">
				<span>orbit</span><span>mass</span><span>shadow</span>
			</div>
		{/if}
	</section>

	<footer class="lesson-controls">
		{#if captionsVisible}<p class="caption" aria-live="polite">{currentScene.caption}</p>{/if}
		{#if complete}<p class="ended-note" role="status">The lesson ends here.</p>{/if}
		<div class="control-row">
			<button
				class="play-button"
				type="button"
				onclick={togglePlayback}
				aria-label={complete ? 'Replay lesson' : paused ? 'Play lesson' : 'Pause lesson'}
				aria-pressed={paused}
			>
				{#if paused && !complete}
					<svg viewBox="0 0 32 32" role="presentation"><path d="m10 6 16 10-16 10V6Z" /></svg>
				{:else if complete}
					<svg viewBox="0 0 32 32" role="presentation"
						><path d="M24 10a10 10 0 1 0 1 10M24 10V4m0 6h-6" /></svg
					>
				{:else}
					<svg viewBox="0 0 32 32" role="presentation"><path d="M9 6v20M23 6v20" /></svg>
				{/if}
			</button>
			<span class="time">{formatTime(elapsed)}</span>
			<input
				class="timeline"
				type="range"
				min="0"
				max={realExampleLessonDuration}
				step="0.1"
				value={elapsed}
				oninput={(event) => seek(Number(event.currentTarget.value))}
				aria-label="Lesson position"
				aria-valuetext={`${formatTime(elapsed)} of ${formatTime(realExampleLessonDuration)}`}
			/>
			<span class="time">{formatTime(realExampleLessonDuration)}</span>
			<button
				class:captions-off={!captionsVisible}
				class="caption-button"
				type="button"
				onclick={() => (captionsVisible = !captionsVisible)}
				aria-pressed={captionsVisible}
				>CC<span>{captionsVisible ? 'Captions on' : 'Captions off'}</span></button
			>
		</div>
	</footer>
</main>

<style>
	.example-shell {
		position: relative;
		isolation: isolate;
		display: grid;
		min-height: 100svh;
		grid-template-rows: auto auto minmax(16rem, 1fr) auto;
		overflow: hidden;
		padding: clamp(1rem, 2.5vw, 1.8rem) var(--page-gutter) clamp(1rem, 2.5vw, 2rem);
		background: linear-gradient(145deg, #0b3157 0%, var(--color-space) 52%, #020b1d 100%);
		color: var(--color-cream);
		animation: world-arrives 620ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}

	.example-shell::before {
		position: absolute;
		z-index: -1;
		top: -9rem;
		right: -5rem;
		width: clamp(12rem, 28vw, 22rem);
		aspect-ratio: 1;
		border: 0.18rem solid var(--color-yellow);
		border-radius: 50%;
		box-shadow: 0 0 0 2.3rem var(--color-orange);
		content: '';
		opacity: 0.85;
	}

	.exit-button {
		position: relative;
		z-index: 12;
		display: flex;
		width: fit-content;
		align-items: center;
		gap: 0.55rem;
		padding: 0.4rem 0.75rem 0.4rem 0.4rem;
		border: 0.12rem solid rgb(255 249 223 / 48%);
		border-radius: 999px;
		background: rgb(3 20 47 / 72%);
		color: var(--color-cream);
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 750;
	}

	.exit-button svg {
		width: 1.6rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.4;
	}
	.lesson-copy {
		position: relative;
		z-index: 8;
		width: min(100%, 64rem);
		margin: clamp(0.4rem, 2vh, 1.2rem) auto 0;
		text-align: center;
		animation: copy-arrives 430ms ease both;
	}
	.lesson-copy p {
		margin: 0 0 0.45rem;
		color: var(--color-yellow);
		font-size: clamp(0.72rem, 1.6vw, 0.92rem);
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		color: var(--color-butter);
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 6.5vw, 5.6rem);
		font-weight: 850;
		letter-spacing: -0.06em;
		line-height: 0.92;
		text-wrap: balance;
	}
	h1:focus {
		outline: none;
	}
	h2 {
		margin: clamp(0.55rem, 1.5vw, 0.9rem) 0 0;
		color: color-mix(in srgb, var(--color-cyan) 46%, var(--color-cream));
		font-size: clamp(0.9rem, 2vw, 1.3rem);
		font-weight: 570;
		text-wrap: balance;
	}

	.evidence-stage {
		position: relative;
		z-index: 2;
		width: min(100%, 72rem);
		min-height: clamp(17rem, 44vh, 32rem);
		margin: -0.6rem auto 0;
	}
	.star-field {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle, var(--color-yellow) 0 0.09rem, transparent 0.14rem) 0 0 / 4.5rem
				4.8rem,
			radial-gradient(circle, var(--color-cyan) 0 0.07rem, transparent 0.12rem) 2rem 2.3rem / 6rem
				5.5rem;
		opacity: 0.62;
	}
	.dark-focus {
		position: absolute;
		z-index: 4;
		top: 49%;
		left: 54%;
		display: grid;
		width: clamp(3.2rem, 8vw, 5rem);
		aspect-ratio: 1;
		place-items: center;
		border: 0.12rem dashed rgb(255 201 40 / 58%);
		border-radius: 50%;
		transform: translate(-50%, -50%);
	}
	.dark-focus span {
		width: 46%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: #00030a;
		box-shadow: 0 0 1.2rem rgb(0 0 0 / 80%);
	}

	.telescope {
		position: absolute;
		z-index: 6;
		bottom: 12%;
		left: 15%;
		width: clamp(8rem, 20vw, 14rem);
		height: 10rem;
	}
	.scope {
		position: absolute;
		top: 0;
		left: 0;
		display: block;
		width: 8rem;
		height: 2.3rem;
		border: 0.16rem solid var(--color-butter);
		background: var(--color-teal);
		transform: rotate(-28deg);
	}
	.scope::after {
		position: absolute;
		top: -0.35rem;
		right: -1.1rem;
		width: 1.2rem;
		height: 2.7rem;
		border: 0.15rem solid var(--color-butter);
		background: var(--color-orange);
		content: '';
	}
	.tripod {
		position: absolute;
		top: 3.4rem;
		left: 3.4rem;
		width: 0.25rem;
		height: 6rem;
		background: var(--color-butter);
		transform: rotate(18deg);
	}
	.telescope i {
		position: absolute;
		top: 3.4rem;
		left: 4.2rem;
		width: 0.25rem;
		height: 6rem;
		background: var(--color-butter);
		transform: rotate(-18deg);
	}
	.focus-ring {
		position: absolute;
		z-index: 5;
		top: 49%;
		left: 54%;
		width: clamp(7rem, 17vw, 11rem);
		aspect-ratio: 1;
		border: 0.18rem solid var(--color-orange);
		border-radius: 50%;
		transform: translate(-50%, -50%);
		animation: focus-breathes 2.5s ease-in-out infinite alternate;
	}

	.orbit-system {
		position: absolute;
		z-index: 5;
		inset: 4% 8%;
	}
	.star-orbit {
		position: absolute;
		top: 50%;
		left: 54%;
		width: clamp(11rem, 28vw, 21rem);
		aspect-ratio: 1.8;
		border: 0.13rem solid var(--color-cyan);
		border-radius: 50%;
		transform: translate(-50%, -50%) rotate(-16deg);
	}
	.star-orbit span {
		position: absolute;
		top: 8%;
		left: 12%;
		width: 0.8rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-yellow);
		box-shadow: 0 0 1rem var(--color-yellow);
		animation: star-pulses 1.4s ease-in-out infinite alternate;
	}
	.star-orbit--two {
		width: clamp(16rem, 40vw, 31rem);
		border-color: var(--color-orange);
		transform: translate(-50%, -50%) rotate(21deg);
	}
	.star-orbit--two span {
		top: 73%;
		left: 72%;
		background: var(--color-orange);
	}
	.star-orbit--three {
		width: clamp(8rem, 20vw, 15rem);
		border-color: var(--color-yellow);
		transform: translate(-50%, -50%) rotate(72deg);
	}
	.star-orbit--three span {
		top: 17%;
		left: 76%;
		background: var(--color-cyan);
	}
	.year-strip {
		position: absolute;
		z-index: 7;
		bottom: 5%;
		left: 50%;
		display: flex;
		width: min(88%, 38rem);
		justify-content: space-between;
		color: var(--color-butter);
		font-size: 0.72rem;
		font-weight: 760;
		transform: translateX(-50%);
	}
	.year-strip::before {
		position: absolute;
		top: -0.55rem;
		left: 0;
		width: 100%;
		height: 0.12rem;
		background: var(--color-teal);
		content: '';
	}

	.mass-reading {
		position: absolute;
		z-index: 8;
		top: 20%;
		right: 2%;
		display: grid;
		width: min(36%, 17rem);
		gap: 0.25rem;
		padding: 1rem;
		border: 0.14rem solid var(--color-butter);
		border-radius: 1.2rem 1.6rem 1.1rem 1.4rem;
		background: rgb(3 20 47 / 82%);
		text-align: center;
	}
	.mass-reading strong {
		color: var(--color-yellow);
		font-family: var(--font-display);
		font-size: clamp(1.2rem, 3.5vw, 2rem);
	}
	.mass-reading span {
		font-size: 0.85rem;
		font-weight: 720;
	}
	.mass-reading small {
		color: var(--color-cyan);
		font-size: 0.68rem;
		line-height: 1.25;
	}

	.candidates {
		position: absolute;
		z-index: 6;
		inset: 8% 7%;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: clamp(1rem, 4vw, 3rem);
		align-items: center;
	}
	.candidate {
		position: relative;
		display: grid;
		min-height: 12rem;
		place-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border: 0.14rem solid var(--color-butter);
		border-radius: 2rem 2.5rem 1.8rem 2.3rem;
		background: rgb(3 20 47 / 80%);
		text-align: center;
	}
	.candidate > span {
		color: var(--color-yellow);
		font-size: clamp(2.5rem, 8vw, 5rem);
	}
	.candidate strong {
		font-size: 0.9rem;
	}
	.candidate i {
		position: absolute;
		top: 50%;
		left: 8%;
		width: 84%;
		height: 0.28rem;
		border-radius: 99px;
		background: var(--color-orange);
		transform: rotate(-16deg);
		animation: strike-arrives 600ms 500ms ease both;
	}

	.earth-array {
		position: absolute;
		z-index: 5;
		bottom: 8%;
		left: 8%;
		width: clamp(10rem, 28vw, 20rem);
		aspect-ratio: 1;
	}
	.earth {
		position: absolute;
		inset: 11%;
		overflow: hidden;
		border: 0.18rem solid var(--color-butter);
		border-radius: 50%;
		background: var(--color-teal);
	}
	.earth span {
		position: absolute;
		top: 17%;
		left: 19%;
		width: 48%;
		height: 60%;
		border-radius: 60% 40% 55% 45%;
		background: var(--color-yellow);
		transform: rotate(-14deg);
	}
	.earth-array > i {
		position: absolute;
		top: calc(10% + var(--dish) * 15%);
		left: calc(2% + var(--dish) * 21%);
		color: var(--color-butter);
		font-size: 1.5rem;
		font-style: normal;
		transform: rotate(calc(-28deg + var(--dish) * 13deg));
	}
	.eht-ring {
		position: absolute;
		z-index: 6;
		top: 48%;
		right: 8%;
		display: grid;
		width: clamp(10rem, 27vw, 20rem);
		aspect-ratio: 1;
		place-items: center;
		border: clamp(0.9rem, 2.7vw, 2rem) solid var(--color-orange);
		border-top-color: var(--color-yellow);
		border-bottom-color: #b8461c;
		border-radius: 50%;
		box-shadow: 0 0 2rem rgb(244 119 33 / 58%);
		transform: translateY(-50%) rotate(-8deg);
	}
	.eht-ring span {
		width: 66%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: #00030a;
		box-shadow: inset 0 0 1.4rem #020817;
	}
	.evidence-labels {
		position: absolute;
		z-index: 9;
		right: 2%;
		bottom: 4%;
		display: flex;
		gap: 0.55rem;
	}
	.evidence-labels span {
		padding: 0.4rem 0.75rem;
		border: 0.1rem solid var(--color-butter);
		border-radius: 999px;
		background: var(--color-space);
		color: var(--color-butter);
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.scene-evidence .orbit-system {
		left: -21%;
		transform: scale(0.72);
	}
	.scene-evidence .mass-reading {
		top: 32%;
		left: 43%;
		right: auto;
		width: min(29%, 14rem);
	}
	.scene-evidence .earth-array {
		display: none;
	}
	.scene-evidence .eht-ring {
		right: 6%;
		width: clamp(8rem, 20vw, 14rem);
	}
	.scene-image .dark-focus,
	.scene-image .star-field,
	.scene-evidence .dark-focus {
		opacity: 0.45;
	}

	.lesson-controls {
		position: relative;
		z-index: 12;
		width: min(100%, 58rem);
		margin: -0.2rem auto 0;
	}
	.caption {
		min-height: 4.4rem;
		margin: 0;
		padding: clamp(0.7rem, 1.8vw, 1rem) clamp(1rem, 4vw, 2.1rem);
		border: 0.11rem solid var(--color-butter);
		border-radius: 1.6rem 2rem 1.5rem 1.9rem;
		background: rgb(1 12 31 / 88%);
		color: var(--color-butter);
		font-size: clamp(0.88rem, 2.1vw, 1.12rem);
		font-weight: 610;
		line-height: 1.35;
		text-align: center;
		text-wrap: balance;
	}
	.ended-note {
		margin: 0.5rem 0;
		color: var(--color-butter);
		font-size: 0.85rem;
		font-weight: 720;
		text-align: center;
	}
	.control-row {
		display: grid;
		grid-template-columns: auto auto minmax(5rem, 1fr) auto auto;
		align-items: center;
		gap: clamp(0.5rem, 1.7vw, 1rem);
		margin-top: 0.75rem;
	}
	.play-button,
	.caption-button {
		border: 0;
		background: transparent;
		color: var(--color-butter);
		cursor: pointer;
	}
	.play-button {
		display: grid;
		width: 2.7rem;
		aspect-ratio: 1;
		place-items: center;
		border: 0.1rem solid rgb(255 249 223 / 55%);
		border-radius: 50%;
	}
	.play-button svg {
		width: 58%;
		fill: currentColor;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.8;
	}
	.time {
		color: rgb(255 249 223 / 72%);
		font-size: 0.7rem;
		font-variant-numeric: tabular-nums;
	}
	.timeline {
		width: 100%;
		height: 1.8rem;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}
	.timeline::-webkit-slider-runnable-track {
		height: 0.28rem;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			var(--color-yellow) 0 var(--lesson-progress),
			rgb(255 249 223 / 36%) var(--lesson-progress)
		);
	}
	.timeline::-webkit-slider-thumb {
		width: 1rem;
		height: 1rem;
		margin-top: -0.36rem;
		appearance: none;
		border: 0.12rem solid var(--color-butter);
		border-radius: 50%;
		background: var(--color-yellow);
	}
	.timeline::-moz-range-track {
		height: 0.28rem;
		border-radius: 999px;
		background: rgb(255 249 223 / 36%);
	}
	.timeline::-moz-range-progress {
		height: 0.28rem;
		border-radius: 999px;
		background: var(--color-yellow);
	}
	.timeline::-moz-range-thumb {
		width: 0.8rem;
		height: 0.8rem;
		border: 0.12rem solid var(--color-butter);
		border-radius: 50%;
		background: var(--color-yellow);
	}
	.caption-button {
		display: grid;
		min-width: 2.8rem;
		place-items: center;
		padding: 0.3rem;
		border: 0.1rem solid currentColor;
		border-radius: 0.5rem;
		font-weight: 850;
		line-height: 1;
	}
	.caption-button span {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
		clip-path: inset(50%);
	}
	.caption-button.captions-off {
		opacity: 0.5;
	}
	.paused .focus-ring,
	.paused .star-orbit span {
		animation-play-state: paused;
	}

	@keyframes world-arrives {
		from {
			opacity: 0;
			clip-path: circle(10% at 55% 60%);
		}
		to {
			opacity: 1;
			clip-path: circle(145% at 55% 60%);
		}
	}
	@keyframes copy-arrives {
		from {
			opacity: 0;
			transform: translateY(0.6rem);
		}
	}
	@keyframes focus-breathes {
		to {
			transform: translate(-50%, -50%) scale(1.15);
			opacity: 0.55;
		}
	}
	@keyframes star-pulses {
		to {
			transform: scale(1.35);
		}
	}
	@keyframes strike-arrives {
		from {
			width: 0;
		}
	}

	@media (max-width: 40rem) {
		.exit-button span {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
			clip-path: inset(50%);
		}
		.exit-button {
			padding: 0.4rem;
		}
		.evidence-stage {
			min-height: 18rem;
		}
		.telescope {
			left: 3%;
			transform: scale(0.78);
			transform-origin: bottom left;
		}
		.mass-reading {
			top: 6%;
			right: 0;
			width: 43%;
		}
		.candidates {
			inset-inline: 0;
			gap: 0.5rem;
		}
		.candidate {
			min-height: 9rem;
		}
		.earth-array {
			left: -3%;
		}
		.eht-ring {
			right: 0;
		}
		.control-row {
			grid-template-columns: auto minmax(4rem, 1fr) auto;
		}
		.time {
			display: none;
		}
		.evidence-labels {
			right: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.example-shell,
		.lesson-copy,
		.focus-ring,
		.star-orbit span,
		.candidate i {
			animation: none;
		}
	}
</style>
