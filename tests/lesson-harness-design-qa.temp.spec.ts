import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../src/lib/data/platform';
import type { AppState, Lesson, LessonMessage, LessonSession } from '../src/lib/types';

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

function createSession(overrides: Partial<LessonSession> = {}): LessonSession {
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
    currentStage: 'concepts',
    stagesCompleted: ['orientation'],
    messages: [],
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
      activeCheckpoint: 'loop_example',
      revisionAttemptCount: 0,
      remediationStep: 'none',
      labelBucket: 'concepts',
      skippedGaps: [],
      needsTeacherReview: false
    },
    ...overrides
  };
}

function createMessage(overrides: Partial<LessonMessage>): LessonMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    role: 'user',
    type: 'response',
    content: 'I think the rule is about competition.',
    stage: 'concepts',
    timestamp: '2026-04-16T05:00:00.000Z',
    metadata: null,
    ...overrides
  };
}

function buildState(theme: 'light' | 'dark', status: 'active' | 'complete' = 'active'): AppState {
  const initial = createInitialState();
  const lesson = createV2Lesson(initial.lessons[0]!);
  const messages =
    status === 'complete'
      ? [
          createMessage({ role: 'user', content: 'Here is my answer.' }),
          createMessage({
            role: 'assistant',
            type: 'summary',
            content: 'You completed the lesson and can explain the core rule.',
            metadata: {
              action: 'advance',
              next_stage: 'complete',
              reteach_style: null,
              reteach_count: 0,
              confidence_assessment: 0.82,
              profile_update: {}
            }
          })
        ]
      : [
          createMessage({
            role: 'assistant',
            type: 'teaching',
            content: 'Here is the first worked example.',
            v2Context: {
              checkpoint: 'loop_example',
              loopIndex: 0
            }
          })
        ];
  const session = createSession({
    status,
    currentStage: status === 'complete' ? 'complete' : 'concepts',
    completedAt: status === 'complete' ? '2026-04-16T05:20:00.000Z' : null,
    stagesCompleted: status === 'complete' ? ['orientation', 'concepts', 'practice', 'check', 'complete'] : ['orientation'],
    messages,
    lessonResidueSummary:
      status === 'complete'
        ? {
            takeaway: 'Competition changes pricing power.',
            rememberedConcepts: ['Core idea one'],
            nextRevisionHint: 'Review the pricing power example tomorrow.'
          }
        : undefined
  });

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

async function seedState(page: Page, state: AppState) {
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

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
}

test.describe('lesson harness design visual QA', () => {
  test('desktop active lesson passes interaction and framing checks', async ({ page }) => {
    const state = buildState('light');
    await seedState(page, state);
    await page.route('**/api/ai/lesson-evaluate', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          score: 0.72,
          mustHitConceptsMet: ['core idea one'],
          missingMustHitConcepts: [],
          criticalMisconceptions: [],
          feedback: 'Good answer: your feedback is now visible without leaving the lesson card.',
          mode: 'continue',
          provider: 'playwright',
          model: 'qa'
        })
      });
    });

    await page.setViewportSize({ width: 1440, height: 984 });
    await page.goto('/lesson/lesson-session-1');
    await expect(page.locator('.active-lesson-card')).toBeVisible();
    await page.waitForTimeout(300);
    await expectNoHorizontalOverflow(page);

    const card = page.locator('.active-lesson-card');
    const before = await card.boundingBox();
    await card.hover();
    const after = await card.boundingBox();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(1);

    const image = page.locator('.active-lesson-visual img');
    await expect(image).toBeVisible();
    await expect(page.locator('.active-lesson-visual figcaption')).toBeVisible();
    const imageBox = await image.boundingBox();
    expect(imageBox?.width ?? 0).toBeGreaterThan(180);
    expect(imageBox?.height ?? 0).toBeGreaterThan(140);

    await expect(page.locator('.active-lesson-card-tts-control')).toBeVisible();
    await page.getByRole('button', { name: 'Open notes' }).click();
    await expect(page.getByRole('region', { name: 'Session notes' })).toBeVisible();

    await page.getByRole('textbox').last().fill('I think pricing power depends on competition.');
    await page.getByRole('button', { name: 'Send response' }).click();
    await expect(page.getByText('I think pricing power depends on competition.')).toBeVisible();
    await expect(page.getByText(/Good answer: your feedback is now visible/)).toBeVisible();

    await page.screenshot({ path: '/tmp/doceo-design-qa/desktop-active-light-final.png', fullPage: false });
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`desktop ${theme} active layout stays bounded`, async ({ page }) => {
      const state = buildState(theme);
      await seedState(page, state);
      await page.setViewportSize({ width: 1440, height: 984 });
      await page.goto('/lesson/lesson-session-1');
      await expect(page.locator('.active-lesson-card')).toBeVisible();
      await page.waitForTimeout(300);
      await expect(page.locator('.chat-scroll-area')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: `/tmp/doceo-design-qa/desktop-active-${theme}-final.png`, fullPage: false });
    });

    test(`mobile ${theme} active layout stays bounded`, async ({ page }) => {
      const state = buildState(theme);
      await seedState(page, state);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/lesson/lesson-session-1');
      await expect(page.locator('.active-lesson-card')).toBeVisible();
      await page.waitForTimeout(300);
      await expect(page.locator('.active-lesson-visual img')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: `/tmp/doceo-design-qa/mobile-active-${theme}-final.png`, fullPage: false });
    });
  }

  test('desktop completion summary stays inside the lesson scroll lane', async ({ page }) => {
    const state = buildState('light', 'complete');
    await seedState(page, state);
    await page.setViewportSize({ width: 1440, height: 984 });
    await page.goto('/lesson/lesson-session-1');
    await expect(page.locator('.complete-payoff')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const bodyBox = await page.locator('.lesson-body').boundingBox();
    const chatBox = await page.locator('.chat-scroll-area').boundingBox();
    expect((chatBox?.height ?? 0)).toBeLessThanOrEqual((bodyBox?.height ?? 0) + 1);
    await page.screenshot({ path: '/tmp/doceo-design-qa/desktop-complete-light-final.png', fullPage: false });
  });
});
