import type { SourceResearch } from './research-schema.ts';

type Misconception = { text: string; sourceClaimIds: string[] };

const explicitMisconceptionLanguage =
	/\b(?:misconception|common myth|commonly (?:believed|mistaken|misunderstood)|people often (?:believe|think))\b/i;

export function removeUnsupportedMisconceptions<
	T extends { likelyMisconceptions: Misconception[] }
>(proposal: T, research: SourceResearch) {
	const claimText = new Map(
		research.sources.flatMap((source) =>
			source.claims.map((claim) => [claim.id, claim.text] as const)
		)
	);
	const likelyMisconceptions = proposal.likelyMisconceptions.filter((misconception) =>
		misconception.sourceClaimIds.some((claimId) =>
			explicitMisconceptionLanguage.test(claimText.get(claimId) ?? '')
		)
	);
	return {
		proposal: { ...proposal, likelyMisconceptions },
		removed: proposal.likelyMisconceptions.length - likelyMisconceptions.length
	};
}
