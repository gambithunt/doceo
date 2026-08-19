import { everydaySoapArtifact } from './everyday-soap';
import { healthVaccinesArtifact } from './health-vaccines';
import { spaceBeforeBigBangArtifact } from './space-before-big-bang';

const artifacts = new Map<string, unknown>([
	[everydaySoapArtifact.contract.id, everydaySoapArtifact],
	[healthVaccinesArtifact.contract.id, healthVaccinesArtifact],
	[spaceBeforeBigBangArtifact.contract.id, spaceBeforeBigBangArtifact]
]);

export function getApprovedArtifact(contractId: string) {
	return artifacts.get(contractId);
}
