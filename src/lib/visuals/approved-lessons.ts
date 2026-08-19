import { everydaySoapArtifact } from './approved-artifacts/everyday-soap';
import { healthVaccinesArtifact } from './approved-artifacts/health-vaccines';
import { spaceBeforeBigBangArtifact } from './approved-artifacts/space-before-big-bang';
import { adaptApprovedVisualArtifact } from './artifact-adapter';
import type { VisualLessonFixture } from './types';

export const everydaySoapLesson = adaptApprovedVisualArtifact(everydaySoapArtifact);
export const healthVaccinesLesson = adaptApprovedVisualArtifact(healthVaccinesArtifact);
export const spaceBeforeBigBangLesson = adaptApprovedVisualArtifact(spaceBeforeBigBangArtifact);

const lessons = new Map<string, VisualLessonFixture>([
	[everydaySoapLesson.id, everydaySoapLesson],
	[healthVaccinesLesson.id, healthVaccinesLesson],
	[spaceBeforeBigBangLesson.id, spaceBeforeBigBangLesson]
]);

export function getApprovedLesson(id: string) {
	return lessons.get(id);
}
