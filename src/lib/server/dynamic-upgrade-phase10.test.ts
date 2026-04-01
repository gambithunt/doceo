import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('dynamic upgrade phase 10 cleanup', () => {
  it('removes production lesson fallback code paths from lesson launch and chat entry points', () => {
    const lessonPlanRoute = readWorkspaceFile('src/routes/api/ai/lesson-plan/+server.ts');
    const lessonChatRoute = readWorkspaceFile('src/routes/api/ai/lesson-chat/+server.ts');
    const appStateSource = readWorkspaceFile('src/lib/stores/app-state.ts');
    const lessonLaunchService = readWorkspaceFile('src/lib/server/lesson-launch-service.ts');
    const graphRepository = readWorkspaceFile('src/lib/server/graph-repository.ts');
    const revisionEngine = readWorkspaceFile('src/lib/revision/engine.ts');

    expect(lessonPlanRoute).toContain('if (dev) {');
    expect(lessonPlanRoute).toContain('Lesson generation unavailable.');
    expect(lessonChatRoute).not.toContain("import { buildDynamicLessonFromTopic } from '$lib/lesson-system';");
    expect(appStateSource).not.toContain('function buildEmergencyLessonPlan(');
    expect(lessonLaunchService).not.toContain('export async function bridgeLegacySessionArtifacts');
    expect(graphRepository).not.toContain("import { buildLearningProgram } from '$lib/data/learning-content';");
    expect(revisionEngine).not.toContain('export function buildInterventionContent');
  });

  it('removes seeded coverage wording from the admin content surface', () => {
    const adminContentPage = readWorkspaceFile('src/routes/admin/content/+page.svelte');
    const adminContentServer = readWorkspaceFile('src/routes/admin/content/+page.server.ts');
    const executionDoc = readWorkspaceFile('docs/workstreams/dynamic-upgrade-ex04.md');

    expect(adminContentPage).not.toMatch(/fully seeded|dynamic lesson generator|dynamic only/i);
    expect(adminContentServer).not.toContain("status: 'seeded'");
    expect(executionDoc).toContain('Phase 10 Findings');
    expect(executionDoc).toContain('legacy migration-only snapshot fallback');
  });
});
