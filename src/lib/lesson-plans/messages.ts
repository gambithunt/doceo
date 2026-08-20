export function lessonBoundaryMessage(stage: 'evidence' | 'visual') {
	return stage === 'evidence'
		? 'Your answer is supported, but there is not enough checked detail to turn it into a good lesson yet.'
		: 'The facts held up, but the visual explanation did not. Your answer is still ready to explore.';
}

export function lessonFailureMessage() {
	return 'The lesson maker could not finish this time. Your sourced answer is still safe and ready.';
}
