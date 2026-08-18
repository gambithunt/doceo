<script lang="ts">
	import { onMount } from 'svelte';
	import BlackHoleLesson from './BlackHoleLesson.svelte';
	import HomeScene from './HomeScene.svelte';
	import LessonCheck from './LessonCheck.svelte';
	import OrientationOne from './OrientationOne.svelte';
	import OrientationTwo from './OrientationTwo.svelte';
	import RealExampleLesson from './RealExampleLesson.svelte';
	import { isBlackHoleCuriosity } from '$lib/experience/routing';
	import type { LearningAngle, QuizOutcome, StartingPoint } from '$lib/experience/types';

	type Stage = 'home' | 'orientation-one' | 'orientation-two' | 'lesson' | 'check';
	type StoredLesson = {
		startingPoint: StartingPoint;
		learningAngle?: LearningAngle;
		quizOutcome?: QuizOutcome;
		completedAt: string;
	};

	const fallingLessonStorageKey = 'doceo:falling-into-a-black-hole:v1';
	const exampleLessonStorageKey = 'doceo:how-we-found-a-black-hole:v1';

	let stage = $state<Stage>('home');
	let curiosity = $state('');
	let notice = $state('');
	let startingPoint = $state<StartingPoint | ''>('');
	let learningAngle = $state<LearningAngle | ''>('');
	let angleNotice = $state('');
	let completedLesson = $state(false);
	let completedExampleLesson = $state(false);
	let lastCompletedAngle = $state<LearningAngle | ''>('');
	let quizOutcome = $state<QuizOutcome | ''>('');

	onMount(() => {
		try {
			const fallingSaved = window.localStorage.getItem(fallingLessonStorageKey);
			const exampleSaved = window.localStorage.getItem(exampleLessonStorageKey);
			const savedLessons = [fallingSaved, exampleSaved]
				.filter((saved): saved is string => Boolean(saved))
				.map((saved) => JSON.parse(saved) as StoredLesson);

			completedLesson = Boolean(fallingSaved);
			completedExampleLesson = Boolean(exampleSaved);
			const latest = savedLessons.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
			if (!latest) return;
			startingPoint = latest.startingPoint;
			lastCompletedAngle = latest.learningAngle ?? 'What would falling in feel like?';
			quizOutcome = latest.quizOutcome ?? '';
		} catch {
			window.localStorage.removeItem(fallingLessonStorageKey);
			window.localStorage.removeItem(exampleLessonStorageKey);
		}
	});

	function explore(question: string) {
		if (!isBlackHoleCuriosity(question)) {
			notice = 'This prototype can explore black holes for now. Try “How do black holes work?”';
			return;
		}

		curiosity = question;
		notice = '';
		stage = 'orientation-one';
	}

	function returnHome() {
		stage = 'home';
		startingPoint = '';
		learningAngle = '';
		angleNotice = '';
	}

	function chooseStartingPoint(choice: StartingPoint) {
		startingPoint = choice;
		stage = 'orientation-two';
	}

	function returnToStartingPoint() {
		angleNotice = '';
		stage = 'orientation-one';
	}

	function chooseLearningAngle(angle: LearningAngle) {
		learningAngle = angle;

		if (angle === 'What would falling in feel like?' || angle === 'Show me a real example') {
			angleNotice = '';
			stage = 'lesson';
			return;
		}

		angleNotice =
			'That journey is not authored in this prototype yet. Choose falling-in or the real-example journey.';
	}

	function returnToLearningAngle() {
		stage = 'orientation-two';
	}

	function saveCompletedLesson(outcome?: QuizOutcome) {
		const completedAngle =
			learningAngle === 'Show me a real example'
				? 'Show me a real example'
				: 'What would falling in feel like?';
		const storageKey =
			completedAngle === 'Show me a real example'
				? exampleLessonStorageKey
				: fallingLessonStorageKey;

		if (completedAngle === 'Show me a real example') completedExampleLesson = true;
		else completedLesson = true;
		lastCompletedAngle = completedAngle;
		if (outcome) quizOutcome = outcome;

		const lesson: StoredLesson = {
			startingPoint: startingPoint || 'From the beginning',
			learningAngle: completedAngle,
			quizOutcome: outcome || quizOutcome || undefined,
			completedAt: new Date().toISOString()
		};
		window.localStorage.setItem(storageKey, JSON.stringify(lesson));
	}

	function offerCheck() {
		saveCompletedLesson();
		stage = 'check';
	}

	function finishJourney(outcome: QuizOutcome) {
		saveCompletedLesson(outcome);
		notice = '';
		stage = 'home';
	}

	function reopenLesson(angle: LearningAngle) {
		startingPoint ||= 'From the beginning';
		learningAngle = angle;
		stage = 'lesson';
	}
</script>

{#if stage === 'home'}
	<HomeScene
		onexplore={explore}
		onreopenlesson={reopenLesson}
		{notice}
		{completedLesson}
		{completedExampleLesson}
		{lastCompletedAngle}
	/>
{:else if stage === 'orientation-one'}
	<OrientationOne
		question={curiosity}
		onback={returnHome}
		onselect={chooseStartingPoint}
		initialSelection={startingPoint}
	/>
{:else if stage === 'orientation-two'}
	<OrientationTwo
		question={curiosity}
		onhome={returnHome}
		onback={returnToStartingPoint}
		onselect={chooseLearningAngle}
		initialSelection={learningAngle}
		notice={angleNotice}
	/>
{:else if stage === 'lesson'}
	{#if learningAngle === 'Show me a real example'}
		<RealExampleLesson
			startingPoint={startingPoint as StartingPoint}
			onexit={returnToLearningAngle}
			onhome={returnHome}
			oncomplete={offerCheck}
		/>
	{:else}
		<BlackHoleLesson
			startingPoint={startingPoint as StartingPoint}
			onexit={returnToLearningAngle}
			onhome={returnHome}
			oncomplete={offerCheck}
		/>
	{/if}
{:else}
	<LessonCheck
		route={learningAngle === 'Show me a real example' ? 'example' : 'falling'}
		onhome={returnHome}
		onfinish={finishJourney}
	/>
{/if}
