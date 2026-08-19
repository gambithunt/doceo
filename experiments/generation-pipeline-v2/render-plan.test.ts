import { describe, expect, it } from 'vitest';
import { toV2Contract } from './contracts.ts';
import { buildRenderPlan } from './render-plan.ts';
import type { LessonDraftV2 } from './schema.ts';

function oneSceneDraft(stateIds: string[]) {
	return {
		scenes: [{ visualModelStateIds: stateIds }]
	} as LessonDraftV2;
}

describe('buildRenderPlan', () => {
	it('renders cosmology states in canonical time order even when references are reversed', () => {
		const plan = buildRenderPlan(
			toV2Contract('space-before-big-bang'),
			oneSceneDraft(['observed-evidence', 'inflation', 'unknown-before'])
		);
		expect(plan[0].states.map((state) => state.id)).toEqual([
			'unknown-before',
			'inflation',
			'observed-evidence'
		]);
	});

	it('uses human-owned vaccine labels and order', () => {
		const plan = buildRenderPlan(
			toV2Contract('health-vaccines'),
			oneSceneDraft(['rapid-response', 'reexposure'])
		);
		expect(plan[0].states).toEqual([
			expect.objectContaining({ id: 'reexposure', label: 'Later antigen exposure' }),
			expect.objectContaining({ id: 'rapid-response', label: 'Rapid antibody production' })
		]);
	});
});
