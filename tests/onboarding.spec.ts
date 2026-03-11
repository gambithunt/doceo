import { expect, test } from '@playwright/test';
import { createInitialState } from '../src/lib/data/platform';

test('student can complete onboarding, reach the dashboard, and reopen onboarding from settings', async ({ page, request }) => {
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
      isUnsure: false
    }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Structured learning, not chatbot drift.' })).toBeVisible();

  const authPanel = page.locator('.auth');
  const email = `student-${Date.now()}@example.com`;

  await page.getByLabel('Full name').fill('Delon Student');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await authPanel.getByRole('button', { name: 'Create account' }).last().click();

  await expect(
    page.getByRole('heading', {
      name: 'Build a student profile that keeps the app relevant from the first screen.'
    })
  ).toBeVisible();

  await page.getByRole('button', { name: /South Africa/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /CAPS/i }).click();
  await page.getByRole('button', { name: 'Term 2' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Mathematics' }).click();
  await page.getByRole('button', { name: 'English Home Language' }).click();
  await page.getByLabel('Add a missing subject').fill('Coding Club');
  await page.getByRole('button', { name: 'Add subject' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Coding Club').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mathematics' })).toBeVisible();
  await page.getByRole('button', { name: 'Start learning' }).click();

  await expect(page.getByRole('heading', { name: 'Learning, shaped around your actual school context.' })).toBeVisible();
  await expect(page.locator('.subject-pills').getByText('Coding Club')).toBeVisible();
  await page.screenshot({ path: 'test-results/onboarding-dashboard.png', fullPage: true });

  await page.getByRole('button', { name: 'Settings Academic profile' }).click();
  await expect(page.getByRole('heading', { name: 'Academic profile' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit onboarding' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Build a student profile that keeps the app relevant from the first screen.'
    })
  ).toBeVisible();
});
