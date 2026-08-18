import { describe, expect, it } from 'vitest';
import { isBlackHoleCuriosity } from './routing';

describe('prototype curiosity routing', () => {
	it.each(['How do black holes work?', 'Tell me about a black hole', 'blackhole physics'])(
		'routes %s to the authored fixture',
		(question) => {
			expect(isBlackHoleCuriosity(question)).toBe(true);
		}
	);

	it('does not pretend unsupported curiosities have generated lessons', () => {
		expect(isBlackHoleCuriosity('Why do cats purr?')).toBe(false);
	});
});
