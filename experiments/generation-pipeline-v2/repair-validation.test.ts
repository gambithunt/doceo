import { describe, expect, it } from 'vitest';
import { toV2Contract } from './contracts.ts';
import { RepairCandidateArtifactSchema } from './repair-validation.ts';
import type { LessonDraftV2 } from './schema.ts';

const contract = toV2Contract('everyday-airplane-lift');
const claimId = contract.sources[0].claims[0].id;

const draft: LessonDraftV2 = {
	title: 'Repair fixture',
	focusedIdea: contract.focusedIdea,
	learnerOutcome: contract.learnerOutcome,
	scenes: Array.from({ length: 5 }, (_, index) => ({
		role: index === 4 ? 'synthesis' : 'explanatory move',
		title: `Scene ${index + 1}`,
		durationSeconds: 20,
		narration: `Narration ${index + 1}`,
		captions: [`Caption ${index + 1}`],
		visualDirection: `Visual ${index + 1}`,
		visualModelStateIds: [],
		visualAssertions: [{ statement: `Assertion ${index + 1}`, sourceClaimIds: [claimId] }],
		motionRationale: `Motion ${index + 1}`,
		sourceClaimIds: [claimId]
	})),
	constraintCoverage: contract.visualConstraints.map((_, constraintIndex) => ({
		constraintIndex,
		sceneNumbers: [1]
	})),
	check: {
		invitation: 'Try it?',
		interactionType: 'choice',
		action: 'Choose.',
		prompt: 'Which one?',
		choices: [
			{ id: 'a', label: 'A' },
			{ id: 'b', label: 'B' },
			{ id: 'c', label: 'C' }
		],
		supportedResponseIds: ['a'],
		successEvidence: 'Supported.',
		misconceptionEvidence: 'Not supported.',
		feedbackWhenSupported: 'Yes.',
		feedbackWhenNotYet: 'Try again.'
	}
};

function artifact(severity: 'major' | 'minor' = 'major') {
	return {
		status: 'rejected',
		preflightPath: '/tmp/preflight.json',
		contract,
		draft,
		review: {
			decision: 'reject',
			summary: 'Needs repair.',
			findings: [{ severity, sceneNumber: 1, sourceClaimIds: [claimId], explanation: 'Issue.' }]
		}
	};
}

describe('RepairCandidateArtifactSchema', () => {
	it('accepts a rejected artifact with a major finding', () => {
		expect(RepairCandidateArtifactSchema.safeParse(artifact()).success).toBe(true);
	});

	it('rejects approved artifacts and minor-only reviews', () => {
		expect(
			RepairCandidateArtifactSchema.safeParse({ ...artifact(), status: 'approved' }).success
		).toBe(false);
		expect(RepairCandidateArtifactSchema.safeParse(artifact('minor')).success).toBe(false);
	});

	it('rejects a repair of a repair', () => {
		expect(
			RepairCandidateArtifactSchema.safeParse({
				...artifact(),
				parentCandidatePath: '/tmp/original.json'
			}).success
		).toBe(false);
	});
});
