import type { LessonDraftV2 } from './schema.ts';

export type DurationAdjustment = {
	sceneNumber: number;
	fromSeconds: number;
	toSeconds: number;
};

export function normalizeDuration(
	draft: LessonDraftV2,
	targetSeconds = 100
): { draft: LessonDraftV2; adjustments: DurationAdjustment[] } {
	const copy = structuredClone(draft);
	const current = copy.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
	if (current >= 90 && current <= 120) return { draft: copy, adjustments: [] };

	let remaining = targetSeconds - current;
	const adjustments: DurationAdjustment[] = [];
	const direction = Math.sign(remaining);
	if (direction === 0) return { draft: copy, adjustments };

	for (let pass = 0; remaining !== 0 && pass < 30; pass += 1) {
		let changed = false;
		for (const [index, scene] of copy.scenes.entries()) {
			if (remaining === 0) break;
			const next = scene.durationSeconds + direction;
			if (next < 8 || next > 30) continue;
			const existing = adjustments.find((item) => item.sceneNumber === index + 1);
			if (existing) existing.toSeconds = next;
			else {
				adjustments.push({
					sceneNumber: index + 1,
					fromSeconds: scene.durationSeconds,
					toSeconds: next
				});
			}
			scene.durationSeconds = next;
			remaining -= direction;
			changed = true;
		}
		if (!changed) break;
	}

	return { draft: copy, adjustments };
}
