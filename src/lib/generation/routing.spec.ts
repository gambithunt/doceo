import { describe, expect, it } from 'vitest';
import { generatableContractFor } from './routing';

describe('generation contract routing', () => {
	it.each(['How do vaccines work?', 'What is immune memory?', 'Explain the immune response'])(
		'routes %s to the reviewed vaccine contract',
		(question) => expect(generatableContractFor(question)).toBe('health-vaccines')
	);

	it.each(['What came before the Big Bang?', 'How did cosmic inflation work?', 'early universe'])(
		'routes %s to the reviewed cosmology contract',
		(question) => expect(generatableContractFor(question)).toBe('space-before-big-bang')
	);

	it('does not invent a contract for an unsupported curiosity', () => {
		expect(generatableContractFor('Why do cats purr?')).toBeNull();
	});
});
