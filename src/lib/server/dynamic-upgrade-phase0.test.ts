import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('dynamic upgrade phase 0 audit', () => {
  it('documents the current lesson-start entry points and compatibility boundaries', () => {
    const audit = readWorkspaceFile('docs/workstreams/dynamic-upgrade-phase0-audit.md');

    expect(audit).toContain('Current Lesson-Start Entry Points');
    expect(audit).toContain('`appState.launchLesson(lessonId)`');
    expect(audit).toContain('`appState.startLessonFromShortlist(topic)`');
    expect(audit).toContain('`appState.startLessonFromSelection(subjectId, sectionName)`');
    expect(audit).toContain('Compatibility Matrix');
    expect(audit).toContain('Minimal Node Resolution Contract');
  });

  it('captures the current seeded lesson-launch code paths before refactor', () => {
    const appStateSource = readWorkspaceFile('src/lib/stores/app-state.ts');
    const curriculumProgramRoute = readWorkspaceFile('src/routes/api/curriculum/program/+server.ts');
    const lessonPlanRoute = readWorkspaceFile('src/routes/api/ai/lesson-plan/+server.ts');

    expect(appStateSource).toContain("fetch('/api/curriculum/program'");
    expect(appStateSource).toContain('launchLesson: (lessonId: string) =>');
    expect(appStateSource).toContain('startLessonFromShortlist: async (topic: ShortlistedTopic) =>');
    expect(appStateSource).toContain('startLessonFromSelection: async (subjectId: string, sectionName: string) =>');
    expect(curriculumProgramRoute).toContain("import { loadLearningProgram } from '$lib/server/learning-program-repository';");
    expect(lessonPlanRoute).toContain('buildFallbackLessonPlan');
  });
});
