import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../src/lib/data/platform';
import type { AppState, Lesson, LessonFlowV2Checkpoint, LessonMessage, LessonSession, ResponseStage } from '../src/lib/types';

type AnswerCheckpoint = Extract<LessonFlowV2Checkpoint, 'loop_practice' | 'independent_attempt' | 'exit_check'>;
type ConceptProgressCheckpoint = Extract<LessonFlowV2Checkpoint, 'loop_teach' | 'loop_example' | 'synthesis'>;

function createV2Lesson(baseLesson: Lesson): Lesson {
  return {
    ...baseLesson,
    id: 'lesson-v2-workspace-1',
    lessonFlowVersion: 'v2',
    flowV2: {
      groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'],
      start: { title: 'Start', body: 'Start with the big picture.' },
      concepts: [
        {
          name: 'Core idea one',
          summary: 'The first rule to notice.',
          detail: 'This is the first core idea in detail.',
          example: 'Use the first example to see the rule in action.',
          oneLineDefinition: 'Core idea one names the first rule before you do anything else.',
          quickCheck: 'Which statement best matches core idea one?',
          conceptType: 'core_rule',
          whyItMatters: 'It keeps the learner from guessing the method.',
          commonMisconception: 'Jump straight to an answer without naming the rule.'
        }
      ],
      loops: [
        {
          id: 'lesson-v2-workspace-1-loop-1',
          title: 'Loop 1',
          teaching: { title: 'Teach Loop 1', body: 'Teach the first core idea.' },
          example: { title: 'Example Loop 1', body: 'Here is the first worked example.' },
          learnerTask: { title: 'Try Loop 1', body: 'Use the rule to try the first task on your own.' },
          retrievalCheck: { title: 'Check Loop 1', body: 'Explain the first idea in your own words.' },
          mustHitConcepts: ['core idea one'],
          criticalMisconceptionTags: ['core-idea-one-gap']
        }
      ],
      synthesis: { title: 'Synthesis', body: 'Bring the ideas together.' },
      independentAttempt: { title: 'Independent Attempt', body: 'Solve the new task on your own.' },
      exitCheck: { title: 'Exit Check', body: 'Summarize the main rule and apply it once.' }
    }
  };
}

function createThreeConceptV2Lesson(baseLesson: Lesson): Lesson {
  const lesson = createV2Lesson(baseLesson);

  return {
    ...lesson,
    flowV2: {
      ...lesson.flowV2!,
      concepts: [
        ...lesson.flowV2!.concepts!,
        {
          name: 'Core idea two',
          summary: 'The second rule to notice.',
          detail: 'This is the second core idea in detail.',
          example: 'Use the second example to extend the pattern.',
          oneLineDefinition: 'Core idea two checks that the same pattern still holds.'
        },
        {
          name: 'Core idea three',
          summary: 'The third rule to notice.',
          detail: 'This is the third core idea in detail.',
          example: 'Use the third example to finish the pattern.',
          oneLineDefinition: 'Core idea three checks the final part of the pattern.'
        }
      ],
      loops: [
        ...lesson.flowV2!.loops,
        {
          id: 'lesson-v2-workspace-1-loop-2',
          title: 'Loop 2',
          teaching: { title: 'Teach Loop 2', body: 'Teach the second core idea.' },
          example: { title: 'Example Loop 2', body: 'Here is the second worked example.' },
          learnerTask: { title: 'Try Loop 2', body: 'Try the second task on your own.' },
          retrievalCheck: { title: 'Check Loop 2', body: 'Explain the second idea in your own words.' },
          mustHitConcepts: ['core idea two'],
          criticalMisconceptionTags: ['core-idea-two-gap']
        },
        {
          id: 'lesson-v2-workspace-1-loop-3',
          title: 'Loop 3',
          teaching: { title: 'Teach Loop 3', body: 'Teach the third core idea.' },
          example: { title: 'Example Loop 3', body: 'Here is the third worked example.' },
          learnerTask: { title: 'Try Loop 3', body: 'Try the third task on your own.' },
          retrievalCheck: { title: 'Check Loop 3', body: 'Explain the third idea in your own words.' },
          mustHitConcepts: ['core idea three'],
          criticalMisconceptionTags: ['core-idea-three-gap']
        }
      ]
    }
  };
}

function stageForCheckpoint(checkpoint: AnswerCheckpoint): ResponseStage {
  if (checkpoint === 'exit_check') return 'check';
  if (checkpoint === 'independent_attempt') return 'practice';
  return 'concepts';
}

function ctaForCheckpoint(checkpoint: AnswerCheckpoint): string {
  if (checkpoint === 'loop_practice') return 'Submit my attempt';
  if (checkpoint === 'independent_attempt') return 'Final check';
  return 'Finish lesson';
}

function createSession(checkpoint: AnswerCheckpoint): LessonSession {
  const currentStage = stageForCheckpoint(checkpoint);

  return {
    id: 'lesson-session-1',
    studentId: 'student-1',
    lessonId: 'lesson-v2-workspace-1',
    subjectId: 'subject-1',
    subject: 'Economics',
    topicId: 'topic-1',
    topicTitle: 'market structures',
    topicDescription: 'Learn how firms compete in different market structures.',
    curriculumReference: 'CAPS Grade 11',
    matchedSection: 'Microeconomics',
    currentStage,
    stagesCompleted: ['orientation', 'concepts'],
    messages: [
      {
        id: 'prompt-1',
        role: 'assistant',
        type: 'teaching',
        content: 'Try this checkpoint in your own words.',
        stage: currentStage,
        timestamp: '2026-04-16T05:00:00.000Z',
        metadata: null,
        v2Context: { checkpoint, loopIndex: checkpoint === 'loop_practice' ? 0 : null }
      } satisfies LessonMessage
    ],
    questionCount: 0,
    reteachCount: 0,
    softStuckCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-04-16T05:00:00.000Z',
    lastActiveAt: '2026-04-16T05:00:00.000Z',
    completedAt: null,
    status: 'active',
    profileUpdates: [],
    lessonFlowVersion: 'v2',
    v2State: {
      totalLoops: 1,
      activeLoopIndex: 0,
      activeCheckpoint: checkpoint,
      revisionAttemptCount: 0,
      remediationStep: 'none',
      labelBucket: currentStage,
      skippedGaps: [],
      needsTeacherReview: false,
      concept1EarlyDiagnosticCompleted: true
    }
  };
}

function buildState(checkpoint: AnswerCheckpoint, theme: 'light' | 'dark'): AppState {
  const initial = createInitialState();
  const lesson = createV2Lesson(initial.lessons[0]!);
  const session = createSession(checkpoint);

  return {
    ...initial,
    auth: { ...initial.auth, status: 'signed_in', error: null },
    onboarding: { ...initial.onboarding, completed: true },
    lessons: [lesson],
    lessonSessions: [session],
    ui: {
      ...initial.ui,
      theme,
      currentScreen: 'lesson',
      activeLessonSessionId: session.id
    }
  };
}

function buildStateWithMessages(theme: 'light' | 'dark', messages: LessonMessage[]): AppState {
  const initial = createInitialState();
  const lesson = createV2Lesson(initial.lessons[0]!);
  const session = {
    ...createSession('loop_practice'),
    messages,
    v2State: {
      ...createSession('loop_practice').v2State,
      totalLoops: 2,
      activeLoopIndex: 1,
      activeCheckpoint: 'loop_practice' as const
    }
  } satisfies LessonSession;

  return {
    ...initial,
    auth: { ...initial.auth, status: 'signed_in', error: null },
    onboarding: { ...initial.onboarding, completed: true },
    lessons: [lesson],
    lessonSessions: [session],
    ui: {
      ...initial.ui,
      theme,
      currentScreen: 'lesson',
      activeLessonSessionId: session.id
    }
  };
}

function buildConceptProgressState(
  theme: 'light' | 'dark',
  checkpoint: ConceptProgressCheckpoint | 'complete',
  activeLoopIndex: number,
  status: LessonSession['status'] = 'active'
): AppState {
  const initial = createInitialState();
  const lesson = createThreeConceptV2Lesson(initial.lessons[0]!);
  const currentStage = status === 'complete' ? 'complete' : 'concepts';
  const session = {
    ...createSession('loop_practice'),
    currentStage,
    stagesCompleted: status === 'complete' ? ['orientation', 'concepts', 'practice', 'check'] : ['orientation'],
    status,
    messages: [],
    v2State: {
      totalLoops: 3,
      activeLoopIndex,
      activeCheckpoint: checkpoint,
      revisionAttemptCount: 0,
      remediationStep: 'none',
      labelBucket: currentStage,
      skippedGaps: [],
      needsTeacherReview: false,
      concept1EarlyDiagnosticCompleted: true
    },
    completedAt: status === 'complete' ? '2026-04-16T05:30:00.000Z' : null
  } satisfies LessonSession;

  return {
    ...initial,
    auth: { ...initial.auth, status: 'signed_in', error: null },
    onboarding: { ...initial.onboarding, completed: true },
    lessons: [lesson],
    lessonSessions: [session],
    ui: {
      ...initial.ui,
      theme,
      currentScreen: 'lesson',
      activeLessonSessionId: session.id
    }
  };
}

async function seedState(page: Page, state: AppState): Promise<void> {
  await page.addInitScript((savedState) => {
    window.localStorage.setItem('doceo-app-state', JSON.stringify(savedState));
    window.localStorage.setItem('doceo-theme', savedState.ui.theme);
  }, state);

  await page.route('**/api/state/bootstrap', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ state, isConfigured: true })
    });
  });

  await page.route('**/api/state/sync', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ persisted: true })
    });
  });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
}

async function verifyEmbeddedAnswerComposer(
  page: Page,
  checkpoint: AnswerCheckpoint,
  width: number,
  height: number,
  theme: 'light' | 'dark'
): Promise<void> {
  await seedState(page, buildState(checkpoint, theme));
  await page.setViewportSize({ width, height });
  await page.goto('/lesson/lesson-session-1');

  const activeCard = page.locator('.active-lesson-card');
  await expect(activeCard).toBeVisible();
  await expect(activeCard.locator('.embedded-answer-composer')).toHaveCount(1);
  await expect(activeCard.getByRole('textbox')).toBeVisible();
  await expect(activeCard.getByRole('button', { name: ctaForCheckpoint(checkpoint) })).toBeVisible();
  await expect(page.locator('.input-area .composer')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
}

async function verifyFocusedFeedbackState(
  page: Page,
  width: number,
  height: number,
  theme: 'light' | 'dark'
): Promise<void> {
  const messages: LessonMessage[] = [
    {
      id: 'old-answer',
      role: 'user',
      type: 'response',
      content: 'Old answer hidden behind review.',
      stage: 'concepts',
      timestamp: '2026-04-16T05:01:00.000Z',
      metadata: null,
      v2Context: { checkpoint: 'loop_practice', loopIndex: 0 }
    },
    {
      id: 'old-feedback',
      role: 'assistant',
      type: 'feedback',
      content: 'Old tutor feedback hidden behind review.',
      stage: 'concepts',
      timestamp: '2026-04-16T05:02:00.000Z',
      metadata: null,
      v2Context: { checkpoint: 'loop_practice', loopIndex: 0 }
    },
    {
      id: 'current-answer',
      role: 'user',
      type: 'response',
      content: 'Current answer stays visible.',
      stage: 'concepts',
      timestamp: '2026-04-16T05:03:00.000Z',
      metadata: null,
      v2Context: { checkpoint: 'loop_practice', loopIndex: 1 }
    },
    {
      id: 'current-feedback',
      role: 'assistant',
      type: 'feedback',
      content: 'Current tutor feedback stays visible.',
      stage: 'concepts',
      timestamp: '2026-04-16T05:04:00.000Z',
      metadata: null,
      v2Context: { checkpoint: 'loop_practice', loopIndex: 1 }
    }
  ];

  await seedState(page, buildStateWithMessages(theme, messages));
  await page.setViewportSize({ width, height });
  await page.goto('/lesson/lesson-session-1');

  const feedback = page.getByRole('region', { name: 'Lesson feedback' });
  await expect(feedback.getByText('Current answer stays visible.')).toBeVisible();
  await expect(feedback.getByText('Current tutor feedback stays visible.')).toBeVisible();
  await expect(feedback.getByText('Old answer hidden behind review.')).toHaveCount(0);
  await feedback.getByRole('button', { name: 'Review earlier steps (2)' }).click();
  await expect(feedback.getByText('Old answer hidden behind review.')).toBeVisible();
  await expect(feedback.getByText('Old tutor feedback hidden behind review.')).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function verifyCompactTransitionState(
  page: Page,
  width: number,
  height: number,
  theme: 'light' | 'dark'
): Promise<void> {
  await seedState(
    page,
    buildStateWithMessages(theme, [
      {
        id: 'transition-only',
        role: 'assistant',
        type: 'teaching',
        content: "Good. Let's move into Active Practice.",
        stage: 'concepts',
        timestamp: '2026-04-16T05:01:00.000Z',
        metadata: null,
        v2Context: { checkpoint: 'loop_example', loopIndex: 1 }
      }
    ])
  );
  await page.setViewportSize({ width, height });
  await page.goto('/lesson/lesson-session-1');

  const status = page.locator('.feedback-transition-status', {
    hasText: "Good. Let's move into Active Practice."
  });
  await expect(status).toBeVisible();
  await expect(page.locator('article.bubble', { hasText: "Good. Let's move into Active Practice." })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
}

async function verifyConceptProgressRail(
  page: Page,
  state: AppState,
  expectedStatuses: string[],
  expectedProgress: string | null
): Promise<void> {
  await seedState(page, state);
  await page.setViewportSize({ width: 1440, height: 984 });
  await page.goto('/lesson/lesson-session-1');

  const sidebar = page.getByRole('complementary', { name: 'Completed concepts' });
  await expect(sidebar).toBeVisible();
  const tiles = sidebar.locator('.concept-tile');
  await expect(tiles).toHaveCount(expectedStatuses.length);

  for (const [index, status] of expectedStatuses.entries()) {
    await expect(tiles.nth(index).locator('.concept-tile-status')).toHaveText(status);
  }

  if (expectedProgress) {
    await expect(sidebar.getByText(expectedProgress)).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
}

async function verifyCompleteSummary(page: Page): Promise<void> {
  await seedState(page, buildConceptProgressState('dark', 'complete', 2, 'complete'));
  await page.setViewportSize({ width: 1440, height: 984 });
  await page.goto('/lesson/lesson-session-1');

  await expect(page.getByText('What you learned')).toBeVisible();
  await expect(page.getByText('Completed concept 1')).toBeVisible();
  await expect(page.getByText('Completed concept 2')).toBeVisible();
  await expect(page.getByText('Completed concept 3')).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test.describe('lesson-flow-clarity-02 embedded answer composer browser QA', () => {
  for (const checkpoint of ['loop_practice', 'independent_attempt', 'exit_check'] as const) {
    test(`desktop dark ${checkpoint} has one active-card answer composer`, async ({ page }) => {
      await verifyEmbeddedAnswerComposer(page, checkpoint, 1440, 984, 'dark');
    });

    test(`mobile dark ${checkpoint} has one active-card answer composer`, async ({ page }) => {
      await verifyEmbeddedAnswerComposer(page, checkpoint, 390, 844, 'dark');
    });
  }
});

test.describe('lesson-flow-clarity-02 feedback cleanup browser QA', () => {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 984 },
    { name: 'mobile', width: 390, height: 844 }
  ] as const) {
    test(`${viewport.name} dark practice feedback keeps current feedback expanded`, async ({ page }) => {
      await verifyFocusedFeedbackState(page, viewport.width, viewport.height, 'dark');
    });

    test(`${viewport.name} dark transition status renders compactly`, async ({ page }) => {
      await verifyCompactTransitionState(page, viewport.width, viewport.height, 'dark');
    });
  }
});

test.describe('lesson-flow-clarity-02 concept progress browser QA', () => {
  test('desktop dark concept 1 teaching marks first concept in progress', async ({ page }) => {
    await verifyConceptProgressRail(
      page,
      buildConceptProgressState('dark', 'loop_teach', 0),
      ['In progress', 'Coming up', 'Coming up'],
      null
    );
  });

  test('desktop dark concept 2 example marks covered, current, and upcoming concepts', async ({ page }) => {
    await verifyConceptProgressRail(
      page,
      buildConceptProgressState('dark', 'loop_example', 1),
      ['Covered', 'In progress', 'Coming up'],
      '1 of 3 completed'
    );
  });

  test('desktop dark synthesis marks every concept covered', async ({ page }) => {
    await verifyConceptProgressRail(
      page,
      buildConceptProgressState('dark', 'synthesis', 2),
      ['Covered', 'Covered', 'Covered'],
      '3 of 3 completed'
    );
  });

  test('desktop dark complete summary keeps all completed concepts visible', async ({ page }) => {
    await verifyCompleteSummary(page);
  });
});
