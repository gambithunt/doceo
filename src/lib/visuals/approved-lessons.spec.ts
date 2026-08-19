import { describe, expect, it } from 'vitest';
import {
	everydaySoapLesson,
	getApprovedLesson,
	healthVaccinesLesson,
	spaceBeforeBigBangLesson
} from './approved-lessons';

describe('approved lesson registry', () => {
	it('publishes the independently reviewed soap artifact with canonical order', () => {
		expect(everydaySoapLesson.artifactVersion).toBe('2026-08-18T15:19:49.124Z');
		expect(everydaySoapLesson.kind).toBe('containment-sequence');
		expect(everydaySoapLesson.nodes.map((node) => node.id)).toEqual([
			'surface-grease',
			'soap-interaction',
			'dispersed-micelles',
			'rinsed-away'
		]);
		expect(everydaySoapLesson.provenance?.approval).toBe('independently-reviewed');
		expect(everydaySoapLesson.check?.supportedResponseIds).toEqual(['a']);
		expect(getApprovedLesson('everyday-soap')).toBe(everydaySoapLesson);
	});

	it('publishes the reviewed compact vaccine lesson in canonical order', () => {
		expect(healthVaccinesLesson.artifactVersion).toBe('2026-08-18T18:34:15.505Z');
		expect(healthVaccinesLesson.kind).toBe('immune-response');
		expect(healthVaccinesLesson.nodes.map((node) => node.id)).toEqual([
			'vaccination',
			'memory',
			'reexposure',
			'rapid-response',
			'possible-infection',
			'reduced-severity'
		]);
		expect(healthVaccinesLesson.provenance?.approval).toBe('independently-reviewed');
		expect(healthVaccinesLesson.check?.supportedResponseIds).toEqual(['a']);
		expect(getApprovedLesson('health-vaccines')).toBe(healthVaccinesLesson);
	});

	it('publishes the reviewed compact early-universe lesson in canonical order', () => {
		expect(spaceBeforeBigBangLesson.artifactVersion).toBe('2026-08-18T18:31:12.502Z');
		expect(spaceBeforeBigBangLesson.kind).toBe('timeline');
		expect(spaceBeforeBigBangLesson.nodes.map((node) => node.id)).toEqual([
			'unknown-before',
			'inflation',
			'observed-evidence'
		]);
		expect(spaceBeforeBigBangLesson.provenance?.approval).toBe('independently-reviewed');
		expect(spaceBeforeBigBangLesson.check?.supportedResponseIds).toEqual(['b']);
		expect(getApprovedLesson('space-before-big-bang')).toBe(spaceBeforeBigBangLesson);
	});
});
