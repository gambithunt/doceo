<script lang="ts">
	import { onMount } from 'svelte';
	import HomeButton from './HomeButton.svelte';
	import {
		blackHoleLessonDuration,
		createBlackHoleScenes,
		getBlackHoleScene
	} from '$lib/experience/black-hole-lesson';
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

	const scenes = $derived(createBlackHoleScenes(startingPoint));
	const currentScene = $derived(getBlackHoleScene(scenes, elapsed));
	const progress = $derived((elapsed / blackHoleLessonDuration) * 100);
	const complete = $derived(elapsed >= blackHoleLessonDuration);

	onMount(() => {
		let previous = performance.now();
		const timer = window.setInterval(() => {
			const now = performance.now();
			const delta = (now - previous) / 1000;
			previous = now;

			if (paused || elapsed >= blackHoleLessonDuration) return;
			elapsed = Math.min(blackHoleLessonDuration, elapsed + delta);
			if (elapsed >= blackHoleLessonDuration) paused = true;
		}, 100);

		return () => window.clearInterval(timer);
	});

	$effect(() => {
		heading?.focus();
	});

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
		elapsed = Math.min(blackHoleLessonDuration, Math.max(0, value));
	}

	function formatTime(value: number) {
		const rounded = Math.floor(value);
		return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
	}
</script>

<main
	class:paused
	class:complete
	class="lesson-shell scene-{currentScene.id}"
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

	<section class="space-scene" aria-label="Animated explanation of falling into a black hole">
		<div class="orbit orbit--outer" aria-hidden="true"></div>
		<div class="orbit orbit--middle" aria-hidden="true"></div>
		<div class="orbit orbit--inner" aria-hidden="true"></div>

		<div class="black-hole" aria-hidden="true">
			<div class="accretion accretion--teal"></div>
			<div class="accretion accretion--orange"></div>
			<div class="accretion accretion--yellow"></div>
			<div class="horizon"></div>
			<div class="dark-centre"></div>
		</div>

		{#if currentScene.id !== 'scale'}
			<div class="horizon-label" aria-hidden="true"><span></span>event horizon</div>
		{/if}

		{#if currentScene.id === 'scale'}
			<div class="scale-markers" aria-hidden="true">
				<div class="scale-marker scale-marker--star"><span></span><small>star</small></div>
				<div class="scale-marker scale-marker--stellar">
					<span></span><small>stellar-mass</small>
				</div>
				<div class="scale-marker scale-marker--super"><span></span><small>supermassive</small></div>
			</div>
		{/if}

		{#if ['viewpoints', 'observer', 'synthesis'].includes(currentScene.id)}
			<div class="observer" aria-hidden="true">
				<div class="observer-head"></div>
				<div class="observer-body"></div>
				<div class="telescope"><span></span></div>
				<strong>Far away</strong>
			</div>
			<div class="clock clock--observer" aria-hidden="true"><i></i><b></b></div>
		{/if}

		{#if ['viewpoints', 'traveler', 'synthesis'].includes(currentScene.id)}
			<div class="clock clock--traveler" aria-hidden="true"><i></i><b></b></div>
			<div class="traveler-label" aria-hidden="true">With the traveler</div>
		{/if}

		{#if currentScene.id === 'observer'}
			<div class="signal-pulses" aria-hidden="true">
				{#each [0, 1, 2, 3, 4, 5] as index (index)}<span style={`--pulse: ${index}`}></span>{/each}
			</div>
		{/if}

		{#if currentScene.id === 'tidal'}
			<div class="tidal-figure" aria-hidden="true">
				<span class="tidal-head"></span><span class="tidal-body"></span>
				<i class="tidal-arrow tidal-arrow--top">↑</i><i class="tidal-arrow tidal-arrow--bottom">↓</i
				>
			</div>
			<div class="tidal-name" aria-hidden="true">tidal stretching</div>
		{/if}

		{#if currentScene.id !== 'tidal'}
			<div class="flight-path" aria-hidden="true"></div>
			<div class="spacecraft" aria-hidden="true">
				<span class="ship-flame"></span><span class="ship-body"></span>
				<span class="ship-window"></span><span class="ship-fin ship-fin--top"></span>
				<span class="ship-fin ship-fin--bottom"></span>
			</div>
		{/if}
	</section>

	<footer class="lesson-controls">
		{#if captionsVisible}
			<p class="caption" aria-live="polite">{currentScene.caption}</p>
		{/if}

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
				max={blackHoleLessonDuration}
				step="0.1"
				value={elapsed}
				oninput={(event) => seek(Number(event.currentTarget.value))}
				aria-label="Lesson position"
				aria-valuetext={`${formatTime(elapsed)} of ${formatTime(blackHoleLessonDuration)}`}
			/>
			<span class="time">{formatTime(blackHoleLessonDuration)}</span>

			<button
				class:captions-off={!captionsVisible}
				class="caption-button"
				type="button"
				onclick={() => (captionsVisible = !captionsVisible)}
				aria-pressed={captionsVisible}
			>
				CC<span>{captionsVisible ? 'Captions on' : 'Captions off'}</span>
			</button>
		</div>
	</footer>
</main>

<style>
	.lesson-shell {
		position: relative;
		isolation: isolate;
		display: grid;
		min-height: 100svh;
		grid-template-rows: auto auto minmax(16rem, 1fr) auto;
		overflow: hidden;
		padding: clamp(1rem, 2.5vw, 1.8rem) var(--page-gutter) clamp(1rem, 2.5vw, 2rem);
		background:
			radial-gradient(circle at 14% 22%, var(--color-yellow) 0 0.1rem, transparent 0.15rem),
			radial-gradient(circle at 72% 48%, var(--color-cyan) 0 0.08rem, transparent 0.13rem),
			linear-gradient(150deg, #06214a 0%, var(--color-space) 52%, #020b1d 100%);
		background-size:
			5.4rem 5.9rem,
			7.2rem 6.7rem,
			auto;
		color: var(--color-cream);
		animation: world-arrives 650ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}

	.lesson-shell::before,
	.lesson-shell::after {
		position: absolute;
		z-index: -1;
		width: clamp(9rem, 24vw, 19rem);
		aspect-ratio: 1.3;
		border: 0.16rem solid var(--color-teal);
		border-radius: 48% 52% 42% 58%;
		content: '';
	}

	.lesson-shell::before {
		top: -8rem;
		right: -5rem;
		box-shadow: 0 0 0 2rem var(--color-butter);
		transform: rotate(18deg);
	}
	.lesson-shell::after {
		bottom: -8rem;
		left: -6rem;
		border-color: var(--color-orange);
		box-shadow: 0 0 0 2.2rem var(--color-butter);
		transform: rotate(-12deg);
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
		transition:
			border-color 160ms ease,
			transform 160ms ease;
	}

	.exit-button:hover {
		border-color: var(--color-cyan);
		transform: translateX(-0.15rem);
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
		width: min(100%, 62rem);
		margin: clamp(0.4rem, 2vh, 1.2rem) auto 0;
		text-align: center;
		animation: copy-arrives 450ms ease both;
	}

	.lesson-copy p {
		margin: 0 0 0.45rem;
		color: var(--color-cyan);
		font-size: clamp(0.72rem, 1.6vw, 0.92rem);
		font-weight: 780;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		color: var(--color-butter);
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 6.5vw, 5.7rem);
		font-weight: 850;
		letter-spacing: -0.06em;
		line-height: 0.92;
		text-wrap: balance;
		text-shadow: 0.08em 0.08em 0 rgb(244 119 33 / 16%);
	}
	h1:focus {
		outline: none;
	}
	h2 {
		margin: clamp(0.55rem, 1.5vw, 0.9rem) 0 0;
		color: color-mix(in srgb, var(--color-cyan) 42%, var(--color-cream));
		font-size: clamp(0.9rem, 2vw, 1.3rem);
		font-weight: 570;
		text-wrap: balance;
	}

	.space-scene {
		position: relative;
		z-index: 2;
		width: min(100%, 72rem);
		min-height: clamp(16rem, 43vh, 32rem);
		margin: -0.8rem auto 0;
	}
	.black-hole {
		position: absolute;
		right: 50%;
		bottom: -2%;
		width: clamp(12rem, 34vw, 27rem);
		aspect-ratio: 1;
		transform: translateX(50%);
		transition:
			transform 900ms ease,
			right 900ms ease,
			width 900ms ease;
	}
	.accretion,
	.horizon,
	.dark-centre {
		position: absolute;
		inset: 50% auto auto 50%;
		border-radius: 50%;
		transform: translate(-50%, -50%);
	}
	.accretion {
		width: 100%;
		aspect-ratio: 2.25;
		border: clamp(0.18rem, 0.48vw, 0.4rem) solid;
	}
	.accretion--teal {
		border-color: var(--color-cyan);
		transform: translate(-50%, -50%) rotate(-10deg);
		animation: orbit-breathe 5s ease-in-out infinite alternate;
	}
	.accretion--orange {
		width: 92%;
		border-color: var(--color-orange);
		transform: translate(-50%, -50%) rotate(12deg);
		animation: orbit-breathe 4s 400ms ease-in-out infinite alternate-reverse;
	}
	.accretion--yellow {
		width: 77%;
		border-color: var(--color-yellow);
		transform: translate(-50%, -50%) rotate(78deg);
	}
	.horizon {
		width: 57%;
		aspect-ratio: 1;
		border: 0.13rem solid var(--color-yellow);
		opacity: 0;
		transition: opacity 700ms ease;
	}
	.dark-centre {
		width: 50%;
		aspect-ratio: 1;
		background: #00040e;
		box-shadow:
			0 0 0 0.7rem rgb(0 4 14 / 58%),
			0 0 3rem rgb(255 201 40 / 14%);
	}

	.orbit {
		position: absolute;
		left: 50%;
		bottom: -13%;
		width: min(126vw, 82rem);
		aspect-ratio: 2.2;
		border: 0.12rem solid var(--color-teal);
		border-color: var(--color-teal) transparent transparent;
		border-radius: 50%;
		transform: translateX(-50%) rotate(-3deg);
		opacity: 0.68;
	}
	.orbit--middle {
		bottom: -5%;
		width: min(108vw, 70rem);
		border-color: var(--color-orange) transparent transparent;
		transform: translateX(-50%) rotate(6deg);
	}
	.orbit--inner {
		bottom: 3%;
		width: min(90vw, 58rem);
		border-color: var(--color-yellow) transparent transparent;
		transform: translateX(-50%) rotate(-7deg);
	}

	.horizon-label {
		position: absolute;
		z-index: 7;
		right: calc(50% - clamp(8rem, 20vw, 14rem));
		bottom: 37%;
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		color: var(--color-butter);
		font-size: clamp(0.75rem, 1.7vw, 1rem);
		font-weight: 740;
		animation: label-arrives 600ms ease both;
	}
	.horizon-label span {
		width: clamp(2.5rem, 8vw, 5rem);
		height: 1.5rem;
		border-top: 0.1rem solid var(--color-butter);
		transform: rotate(-24deg);
		transform-origin: right;
	}
	.lesson-shell:not(.scene-scale) > .space-scene .horizon {
		opacity: 1;
	}

	.scale-markers {
		position: absolute;
		top: 20%;
		left: 5%;
		display: flex;
		align-items: flex-end;
		gap: clamp(1.6rem, 6vw, 4.5rem);
		color: rgb(255 249 223 / 72%);
	}
	.scale-marker {
		display: grid;
		justify-items: center;
		gap: 0.3rem;
		font-size: 0.66rem;
		font-weight: 700;
	}
	.scale-marker span {
		display: block;
		width: 1.15rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-yellow);
		box-shadow: 0 0 1rem var(--color-yellow);
	}
	.scale-marker--stellar span {
		width: 0.5rem;
		background: #00040e;
		box-shadow: 0 0 0 0.15rem var(--color-orange);
	}
	.scale-marker--super span {
		width: 1.5rem;
		background: #00040e;
		box-shadow: 0 0 0 0.18rem var(--color-cyan);
	}

	.flight-path {
		position: absolute;
		top: 28%;
		left: 17%;
		width: 40%;
		height: 50%;
		border: 0.17rem dashed var(--color-yellow);
		border-color: var(--color-yellow) transparent transparent;
		border-radius: 55% 45% 0 0;
		transform: rotate(18deg);
		opacity: 0.86;
	}
	.spacecraft {
		position: absolute;
		top: 38%;
		left: 28%;
		z-index: 6;
		width: clamp(3.3rem, 8vw, 5.8rem);
		aspect-ratio: 1.7;
		transform: rotate(19deg);
		animation: spacecraft-drifts 7s ease-in-out infinite alternate;
		transition:
			inset 800ms ease,
			transform 800ms ease,
			opacity 800ms ease;
	}
	.ship-body {
		position: absolute;
		inset: 22% 9% 17% 13%;
		border: 0.15rem solid var(--color-space);
		border-radius: 48% 65% 55% 45%;
		background: var(--color-butter);
	}
	.ship-window {
		position: absolute;
		top: 34%;
		right: 26%;
		width: 14%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--color-navy);
	}
	.ship-flame {
		position: absolute;
		top: 40%;
		left: -5%;
		width: 23%;
		height: 23%;
		border-radius: 100% 0 0 100%;
		background: var(--color-orange);
		box-shadow: -0.45rem 0 0 -0.1rem var(--color-yellow);
	}
	.ship-fin {
		position: absolute;
		left: 20%;
		width: 28%;
		height: 30%;
		border: 0.13rem solid var(--color-space);
		background: var(--color-cyan);
	}
	.ship-fin--top {
		top: 2%;
		clip-path: polygon(0 100%, 100% 100%, 30% 0);
	}
	.ship-fin--bottom {
		bottom: 0;
		clip-path: polygon(0 0, 100% 0, 30% 100%);
	}

	.observer {
		position: absolute;
		z-index: 7;
		bottom: 25%;
		left: 4%;
		width: 5rem;
		height: 7rem;
		animation: visual-arrives 550ms ease both;
	}
	.observer-head {
		position: absolute;
		top: 0;
		left: 0.9rem;
		width: 1.35rem;
		aspect-ratio: 1;
		border: 0.15rem solid var(--color-butter);
		border-radius: 50%;
	}
	.observer-body {
		position: absolute;
		top: 1.4rem;
		left: 1.15rem;
		width: 0.75rem;
		height: 3.5rem;
		border-radius: 99px;
		background: var(--color-butter);
	}
	.telescope {
		position: absolute;
		top: 1.4rem;
		left: 2.2rem;
		width: 2.8rem;
		height: 0.8rem;
		border: 0.13rem solid var(--color-butter);
		background: var(--color-teal);
		transform: rotate(-18deg);
	}
	.telescope span {
		position: absolute;
		top: 0.6rem;
		left: 1.2rem;
		width: 0.15rem;
		height: 2.4rem;
		background: var(--color-butter);
		transform: rotate(15deg);
	}
	.observer strong {
		position: absolute;
		top: -1.6rem;
		left: 0;
		width: 8rem;
		color: var(--color-butter);
		font-size: 0.78rem;
	}

	.clock {
		position: absolute;
		z-index: 7;
		width: clamp(3rem, 7vw, 4.4rem);
		aspect-ratio: 1;
		border: 0.18rem solid var(--color-butter);
		border-radius: 50%;
		animation: visual-arrives 550ms ease both;
	}
	.clock::before {
		position: absolute;
		inset: 12%;
		border: 0.08rem dashed rgb(255 249 223 / 70%);
		border-radius: 50%;
		content: '';
	}
	.clock i,
	.clock b {
		position: absolute;
		bottom: 50%;
		left: calc(50% - 0.07rem);
		width: 0.14rem;
		height: 28%;
		border-radius: 99px;
		background: var(--color-butter);
		transform-origin: bottom;
	}
	.clock b {
		height: 20%;
		transform: rotate(115deg);
	}
	.clock--observer {
		top: 12%;
		left: 5%;
	}
	.clock--observer i {
		animation: clock-slow 8s linear infinite;
	}
	.clock--traveler {
		right: 5%;
		bottom: 22%;
	}
	.clock--traveler i {
		animation: clock-normal 2s linear infinite;
	}
	.traveler-label {
		position: absolute;
		z-index: 7;
		right: 3%;
		bottom: 15%;
		color: var(--color-butter);
		font-size: 0.78rem;
		font-weight: 760;
	}

	.signal-pulses {
		position: absolute;
		z-index: 8;
		top: 35%;
		left: 14%;
		display: flex;
		width: 46%;
		align-items: center;
		justify-content: space-between;
		transform: rotate(12deg);
	}
	.signal-pulses span {
		width: calc(1rem - var(--pulse) * 0.08rem);
		aspect-ratio: 1;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-yellow) calc(100% - var(--pulse) * 13%), #d94722);
		box-shadow: 0 0 0.8rem currentColor;
		opacity: calc(1 - var(--pulse) * 0.11);
		animation: pulse-fades 2.5s calc(var(--pulse) * 180ms) ease-in-out infinite alternate;
	}

	.tidal-figure {
		position: absolute;
		z-index: 7;
		top: 22%;
		left: 50%;
		width: 5rem;
		height: 12rem;
		transform: translateX(-50%);
		animation: stretch-figure 5s ease-in-out infinite alternate;
	}
	.tidal-head {
		position: absolute;
		top: 0;
		left: 50%;
		width: 2.2rem;
		aspect-ratio: 1;
		border: 0.18rem solid var(--color-butter);
		border-radius: 50%;
		transform: translateX(-50%);
	}
	.tidal-body {
		position: absolute;
		top: 2.1rem;
		bottom: 1rem;
		left: 50%;
		width: 0.55rem;
		border-radius: 99px;
		background: var(--color-cyan);
		transform: translateX(-50%);
	}
	.tidal-arrow {
		position: absolute;
		left: 50%;
		color: var(--color-orange);
		font-size: 2.2rem;
		font-style: normal;
		font-weight: 800;
		transform: translateX(-50%);
	}
	.tidal-arrow--top {
		top: -2.5rem;
	}
	.tidal-arrow--bottom {
		bottom: -2.5rem;
	}
	.tidal-name {
		position: absolute;
		z-index: 7;
		top: 50%;
		left: calc(50% + 4rem);
		color: var(--color-butter);
		font-size: clamp(0.8rem, 2vw, 1rem);
		font-weight: 760;
	}

	.scene-horizon .black-hole {
		width: clamp(16rem, 42vw, 33rem);
	}
	.scene-viewpoints .black-hole,
	.scene-observer .black-hole,
	.scene-synthesis .black-hole {
		right: 43%;
		width: clamp(13rem, 32vw, 25rem);
	}
	.scene-observer .spacecraft {
		top: 55%;
		left: 49%;
		opacity: 0.78;
		transform: rotate(32deg) scale(0.8);
	}
	.scene-traveler .black-hole {
		right: 68%;
		width: clamp(17rem, 46vw, 35rem);
	}
	.scene-traveler .spacecraft {
		top: 48%;
		left: 58%;
		transform: rotate(18deg) scale(1.1);
	}
	.scene-synthesis .spacecraft {
		top: 49%;
		left: 51%;
		transform: rotate(25deg) scale(0.82);
	}

	.lesson-controls {
		position: relative;
		z-index: 12;
		width: min(100%, 58rem);
		margin: -0.25rem auto 0;
	}
	.caption {
		min-height: 4.4rem;
		margin: 0;
		padding: clamp(0.7rem, 1.8vw, 1rem) clamp(1rem, 4vw, 2.1rem);
		border: 0.11rem solid var(--color-butter);
		border-radius: 1.6rem 2rem 1.5rem 1.9rem;
		background: rgb(1 12 31 / 86%);
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
		margin: 0;
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

	.paused .spacecraft,
	.paused .accretion,
	.paused .clock i,
	.paused .signal-pulses span,
	.paused .tidal-figure {
		animation-play-state: paused;
	}

	@keyframes world-arrives {
		from {
			opacity: 0;
			clip-path: circle(12% at 58% 75%);
		}
		to {
			opacity: 1;
			clip-path: circle(145% at 58% 75%);
		}
	}
	@keyframes copy-arrives {
		from {
			opacity: 0;
			transform: translateY(0.6rem);
		}
	}
	@keyframes visual-arrives {
		from {
			opacity: 0;
			transform: translateY(0.6rem) scale(0.94);
		}
	}
	@keyframes label-arrives {
		from {
			opacity: 0;
			transform: translateY(0.4rem);
		}
	}
	@keyframes spacecraft-drifts {
		to {
			transform: translate(3rem, 1.8rem) rotate(29deg) scale(0.9);
		}
	}
	@keyframes orbit-breathe {
		to {
			width: 108%;
		}
	}
	@keyframes clock-normal {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes clock-slow {
		to {
			transform: rotate(100deg);
		}
	}
	@keyframes pulse-fades {
		to {
			opacity: 0.22;
			transform: scale(0.55);
		}
	}
	@keyframes stretch-figure {
		to {
			height: 16rem;
			transform: translateX(-50%) scaleX(0.65);
		}
	}

	@media (min-width: 64rem) {
		.space-scene {
			min-height: clamp(17rem, 42vh, 31rem);
		}
		.black-hole {
			right: 36%;
		}
		.spacecraft {
			left: 37%;
		}
		.scale-markers {
			left: 16%;
		}
		.scene-viewpoints .black-hole,
		.scene-observer .black-hole,
		.scene-synthesis .black-hole {
			right: 44%;
		}
	}

	@media (max-width: 35rem) {
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
		.lesson-copy {
			margin-top: 0.1rem;
		}
		.space-scene {
			min-height: 17rem;
			margin-top: -0.4rem;
		}
		.scale-markers {
			top: 12%;
			gap: 1.1rem;
		}
		.scale-marker small {
			display: none;
		}
		.observer {
			left: 0;
			transform: scale(0.8);
			transform-origin: bottom left;
		}
		.clock--observer {
			left: 1%;
		}
		.clock--traveler {
			right: 1%;
		}
		.traveler-label,
		.tidal-name {
			display: none;
		}
		.caption {
			min-height: 5rem;
		}
		.control-row {
			grid-template-columns: auto minmax(4rem, 1fr) auto;
		}
		.time {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lesson-shell,
		.lesson-copy,
		.spacecraft,
		.accretion,
		.clock i,
		.signal-pulses span,
		.tidal-figure {
			animation: none;
		}
	}
</style>
