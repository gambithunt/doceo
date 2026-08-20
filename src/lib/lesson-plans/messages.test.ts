import { describe, expect, it } from 'vitest';
import { lessonBoundaryMessage, lessonFailureMessage } from './messages';

describe('learner-facing lesson messages', () => {
	it('does not expose evidence claim IDs or requirement IDs', () => {
		for (const message of [
			lessonBoundaryMessage('evidence'),
			lessonBoundaryMessage('visual'),
			lessonFailureMessage()
		]) {
			expect(message).not.toMatch(/\b(?:claim|requirement)\s+[a-z]\d+\b/i);
		}
	});

	it('makes clear that the sourced answer remains available', () => {
		expect(lessonBoundaryMessage('evidence')).toContain('answer is supported');
		expect(lessonBoundaryMessage('visual')).toContain('answer is still ready');
		expect(lessonFailureMessage()).toContain('answer is still safe');
	});
});
