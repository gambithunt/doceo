import { describe, expect, it } from 'vitest';
import { zodTextFormat } from 'openai/helpers/zod';
import { ResearchBasedPlanSchema } from './planner-schema.ts';

describe('OpenAI structured-output schemas', () => {
	it('uses an object root for research-based plan composition', () => {
		expect(() => zodTextFormat(ResearchBasedPlanSchema, 'research_based_plan')).not.toThrow();
	});
});
