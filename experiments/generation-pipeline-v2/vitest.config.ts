import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['experiments/generation-pipeline-v2/**/*.test.ts']
	}
});
