import { expect, test } from '@playwright/test';
import { createInitialState } from '../src/lib/data/platform';

test('dashboard URL wins over stale saved screen on refresh and menu navigation', async ({ page }) => {
  const initialState = createInitialState();
  const signedInState = {
    ...initialState,
    auth: {
      ...initialState.auth,
      status: 'signed_in' as const,
      error: null
    },
    onboarding: {
      ...initialState.onboarding,
      completed: true
    },
    ui: {
      ...initialState.ui,
      currentScreen: 'settings' as const
    }
  };

  await page.addInitScript((state) => {
    window.localStorage.setItem('doceo-app-state', JSON.stringify(state));
  }, signedInState);

  await page.route('**/api/state/bootstrap', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        state: signedInState,
        isConfigured: true
      })
    });
  });

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Your Path')).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Your Path')).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Academic profile' })).toBeVisible();

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Your Path')).toBeVisible();
});
