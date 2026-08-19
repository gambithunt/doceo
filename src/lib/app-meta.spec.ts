import { describe, expect, it } from 'vitest';
import {
	exampleReturningHomeSuggestions,
	homePrompt,
	homeSuggestions,
	productName,
	returningHomeSuggestions
} from './app-meta';

describe('app metadata', () => {
	it('keeps the product anchored in curiosity', () => {
		expect(productName).toBe('Doceo');
		expect(homePrompt).toBe('What are you curious about today?');
		expect(homeSuggestions).toHaveLength(3);
		expect(homeSuggestions.map(({ question }) => question)).toContain(
			'What came before the Big Bang?'
		);
		expect(returningHomeSuggestions).toHaveLength(3);
		expect(returningHomeSuggestions.map(({ question }) => question)).toContain(
			'Why does gravity change time?'
		);
		expect(exampleReturningHomeSuggestions).toHaveLength(3);
	});
});
