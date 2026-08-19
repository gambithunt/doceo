import { describe, expect, it } from 'vitest';
import { cosmologyFixture, vaccineFixture } from './fixtures';

describe('canonical visual fixtures', () => {
	it('keeps cosmology in canonical temporal order', () => {
		expect(
			[...cosmologyFixture.nodes]
				.sort((a, b) => a.sequenceIndex - b.sequenceIndex)
				.map((node) => node.id)
		).toEqual(['unknown-before', 'inflation', 'observed-evidence']);
		expect(cosmologyFixture.evidenceLinks).toEqual([
			{ from: 'observed-evidence', to: 'inflation' }
		]);
	});

	it('describes vaccine protection without a barrier state', () => {
		const serialized = JSON.stringify(vaccineFixture.nodes).toLowerCase();
		expect(serialized).not.toMatch(/shield|barrier|blocks.entry|force field/);
		expect(vaccineFixture.nodes.map((node) => node.id)).toEqual(
			expect.arrayContaining([
				'vaccination',
				'memory',
				'reexposure',
				'rapid-response',
				'possible-infection'
			])
		);
	});
});
