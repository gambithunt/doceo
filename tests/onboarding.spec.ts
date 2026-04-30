import { expect, test } from '@playwright/test';
import { createInitialState } from '../src/lib/data/platform';

test('student can complete onboarding, shortlist a topic, start a lesson, and reopen onboarding from settings', async ({ page, request }) => {
  const initialState = createInitialState();

  await request.post('/api/state/sync', {
    data: {
      state: initialState
    }
  });

  await request.post('/api/onboarding/progress', {
    data: {
      profileId: initialState.profile.id,
      countryId: initialState.onboarding.selectedCountryId,
      curriculumId: initialState.onboarding.selectedCurriculumId,
      gradeId: initialState.onboarding.selectedGradeId,
      schoolYear: initialState.onboarding.schoolYear,
      term: initialState.onboarding.term,
      selectedSubjectIds: initialState.onboarding.selectedSubjectIds,
      selectedSubjectNames: initialState.onboarding.selectedSubjectNames,
      customSubjects: [],
      isUnsure: false,
      educationType: initialState.onboarding.educationType,
      provider: initialState.onboarding.provider,
      programme: initialState.onboarding.programme,
      level: initialState.onboarding.level
    }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Structured learning for school students.' })).toBeVisible();

  const authPanel = page.locator('.auth');
  const email = `student-${Date.now()}@example.com`;

  await page.getByLabel('First name').fill('Delon');
  await page.getByLabel('Last name').fill('Student');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await authPanel.getByRole('button', { name: 'Create account' }).last().click();

  await expect(
    page.getByRole('heading', {
      name: 'Where are you learning?'
    })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /CAPS/i }).click();
  await page.getByRole('button', { name: 'Term 2' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Mathematics' }).click();
  await page.getByRole('button', { name: 'English Home Language' }).click();
  await page.getByLabel('Add a missing subject').fill('Coding Club');
  await page.getByRole('button', { name: 'Add subject' }).click();
  await expect(page.getByText('Coding Club').first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Mathematics' })).toBeVisible();
  await page.getByRole('button', { name: 'Save profile and continue' }).click();

  await expect(page.getByText('Assistant stage')).toBeVisible();
  const startSomethingNew = page.getByRole('button', { name: 'Start something new instead' });
  if (await startSomethingNew.isVisible()) {
    await startSomethingNew.click();
  }
  await expect(page.getByRole('button', { name: 'Find my section' }).first()).toBeVisible();

  await page.getByLabel('What do you want to work on?').fill('number patterns');
  await page.getByRole('button', { name: 'Find my section' }).first().click();
  await expect(page.getByText('Curriculum matches')).toBeVisible();
  await page.locator('.topic-card').first().click();

  await expect(page.getByPlaceholder('Type your response or ask a question...')).toBeVisible();
  await page.getByPlaceholder('Type your response or ask a question...').fill('I understand the big picture.');
  await page.getByRole('button', { name: '↑' }).click();
  await expect(page.getByText('Key Concepts')).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('Your progress is saved. You can resume anytime from the dashboard.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to dashboard' }).click();

  await page.getByRole('button', { name: 'Settings Academic profile and preferences' }).click();
  await expect(page.getByRole('heading', { name: 'Academic profile' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit onboarding' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Where are you learning?'
    })
  ).toBeVisible();
});

test('student can choose a non-South-African country and continue through the university onboarding path', async ({ page }) => {
  await page.goto('/');

  const authPanel = page.locator('.auth');
  const email = `student-global-${Date.now()}@example.com`;

  await page.getByLabel('First name').fill('Delon');
  await page.getByLabel('Last name').fill('Student');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await authPanel.getByRole('button', { name: 'Create account' }).last().click();

  await expect(
    page.getByRole('heading', {
      name: 'Where are you learning?'
    })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Choose a different country' }).click();
  await page.getByRole('button', { name: /United States/i }).click();
  await page.getByRole('button', { name: 'University' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Institution name').fill('Massachusetts Institute of Technology');
  await page.getByLabel('Programme').fill('Computer Science');
  await page.getByLabel('Year of study').selectOption('2nd Year');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Computer Science Fundamentals')).toBeVisible();
  await page.getByRole('button', { name: 'Computer Science Fundamentals' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Massachusetts Institute of Technology')).toBeVisible();
  await expect(page.getByText(/Computer Science · 2nd Year/i)).toBeVisible();
});
