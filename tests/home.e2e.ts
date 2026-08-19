import { expect, test } from '@playwright/test';

test('renders the Doceo foundation', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/Doceo/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'What are you curious about today?'
	);
	await expect(page.getByRole('button', { name: 'Why do cats purr?' })).toBeVisible();
});

test('moves a suggested curiosity into the question field', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'What came before the Big Bang?' }).click();

	await expect(page.getByLabel('Your curiosity')).toHaveValue('What came before the Big Bang?');
});

test('replaces a suggested curiosity when the learner starts typing', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'What came before the Big Bang?' }).click();
	await page.getByLabel('Your curiosity').click();
	await page.getByLabel('Your curiosity').pressSequentially('How do black holes work?');

	await expect(page.getByLabel('Your curiosity')).toHaveValue('How do black holes work?');
});

test('transforms a black-hole curiosity into orientation', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Your curiosity').fill('Tell me about black holes');
	await page.getByRole('button', { name: 'Explore this curiosity' }).click();

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where should we begin?');
	await expect(page.getByText('Tell me about black holes')).toBeVisible();
});

test('moves through both orientation questions and remembers the starting point', async ({
	page
}) => {
	await page.goto('/');
	await page.getByLabel('Your curiosity').fill('How do black holes work?');
	await page.getByRole('button', { name: 'Explore this curiosity' }).click();
	await page.getByRole('button', { name: 'From the beginning' }).click();

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('How should we explore it?');
	await expect(page.getByRole('button', { name: /Show me a real example/ })).toBeVisible();

	await page.getByRole('button', { name: 'Change your starting point' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where should we begin?');
	await expect(page.getByRole('button', { name: 'From the beginning' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('opens the falling-in lesson immediately from the second choice', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Your curiosity').fill('How do black holes work?');
	await page.getByRole('button', { name: 'Explore this curiosity' }).click();
	await page.getByRole('button', { name: 'From the beginning' }).click();
	await page.getByRole('button', { name: 'What would falling in feel like?' }).click();

	await expect(page.getByRole('heading', { level: 1 })).toContainText('Falling into');
	await expect(page.getByText('Two people. Two very different views.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Pause lesson' })).toBeVisible();

	await page.getByRole('slider', { name: 'Lesson position' }).fill('116');
	await expect(page.getByText('The lesson ends here.')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Want a 10-second check?' })).toBeVisible();

	await page.getByRole('button', { name: 'Not now' }).click();
	await expect(
		page.getByRole('heading', { name: 'What are you curious about today?' })
	).toBeVisible();
	await page.getByRole('button', { name: 'History' }).click();
	await expect(page.getByRole('button', { name: /Falling into a black hole/ })).toBeVisible();
});

test('can return home from orientation, lessons, and checks', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Your curiosity').fill('How do black holes work?');
	await page.getByRole('button', { name: 'Explore this curiosity' }).click();

	await expect(page.getByRole('button', { name: 'Return to Doceo home' })).toBeVisible();
	await page.getByRole('button', { name: 'From the beginning' }).click();
	await expect(page.getByRole('button', { name: 'Return to Doceo home' })).toBeVisible();

	await page.getByRole('button', { name: 'What would falling in feel like?' }).click();
	await expect(page.getByRole('button', { name: 'Return to Doceo home' })).toBeVisible();
	await page.getByRole('slider', { name: 'Lesson position' }).fill('116');
	await expect(page.getByRole('button', { name: 'Return to Doceo home' })).toBeVisible();

	await page.getByRole('button', { name: 'Return to Doceo home' }).click();
	await expect(
		page.getByRole('heading', { name: 'What are you curious about today?' })
	).toBeVisible();
});

test('reconstructs both viewpoints in the optional check', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Your curiosity').fill('How do black holes work?');
	await page.getByRole('button', { name: 'Explore this curiosity' }).click();
	await page.getByRole('button', { name: 'From the beginning' }).click();
	await page.getByRole('button', { name: 'What would falling in feel like?' }).click();
	await page.getByRole('slider', { name: 'Lesson position' }).fill('116');
	await page.getByRole('button', { name: /Yes, let me try/ }).click();
	await page.getByRole('button', { name: /The distant observer/ }).click();
	await page.getByRole('button', { name: /The traveler/ }).click();
	await page.getByRole('button', { name: 'Reveal the two views' }).click();

	await expect(page.getByRole('heading', { name: 'Exactly—both views fit.' })).toBeVisible();
	await expect(page.getByText('This lesson has been saved to History.')).toBeVisible();
});

test('delivers a distinct evidence lesson and orbit check', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Your curiosity').fill('How do black holes work?');
	await page.getByRole('button', { name: 'Explore this curiosity' }).click();
	await page.getByRole('button', { name: 'From the beginning' }).click();
	await page.getByRole('button', { name: /Show me a real example/ }).click();

	await expect(page.getByRole('heading', { name: 'How we found a black hole' })).toBeVisible();
	await page.getByRole('slider', { name: 'Lesson position' }).fill('110');
	await page.getByRole('button', { name: /Yes, let me try/ }).click();
	await page.getByRole('button', { name: /B.*orbiting an empty point/ }).click();
	await page.getByRole('button', { name: 'Reveal the evidence' }).click();

	await expect(page.getByRole('heading', { name: 'Yes—motion is the evidence.' })).toBeVisible();
});

test('is honest about an unsupported curiosity', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Your curiosity').fill('Why do cats purr?');
	await page.getByRole('button', { name: 'Explore this curiosity' }).click();

	await expect(page.getByRole('status')).toContainText(
		'black holes, soap, vaccines, or the early universe'
	);
});

test('saves and replays the approved soap lesson without generating again', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Your curiosity').fill('Why does soap remove grease?');
	await page.getByRole('button', { name: 'Explore this curiosity' }).click();

	await expect(page).toHaveURL(/\/lessons\/everyday-soap$/);
	await expect(page.getByRole('heading', { name: 'Grease stays on water alone' })).toBeVisible();

	const visualPositions: number[] = [];
	const buttonPositions: number[] = [];
	for (let step = 0; step < 3; step += 1) {
		visualPositions.push((await page.getByTestId('visual-stage').boundingBox())?.y ?? -1);
		buttonPositions.push((await page.getByTestId('next-button').boundingBox())?.y ?? -1);
		await page.getByRole('button', { name: 'Next' }).click();
	}
	visualPositions.push((await page.getByTestId('visual-stage').boundingBox())?.y ?? -1);
	buttonPositions.push((await page.getByTestId('next-button').boundingBox())?.y ?? -1);
	expect(Math.max(...visualPositions) - Math.min(...visualPositions)).toBeLessThan(1);
	expect(Math.max(...buttonPositions) - Math.min(...buttonPositions)).toBeLessThan(1);
	await expect(page.getByText('Saved to your History.')).toBeVisible();
	await page.getByRole('button', { name: 'Try a 10-second check' }).click();
	await page.getByRole('button', { name: /Soap surrounds the grease, helps loosen it/ }).click();
	await expect(page.getByText('That’s it.')).toBeVisible();
	await expect(page.getByText(/soap helps lift greasy dirt into water/)).toBeVisible();

	await page.getByRole('button', { name: 'Return to Doceo home' }).click();
	await expect(page.getByRole('heading', { name: 'Keep following the thread' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'How do micelles trap grease?' })).toBeVisible();
	await page.getByRole('button', { name: 'History' }).click();
	await page.getByRole('link', { name: /How soap helps water carry away grease/ }).click();

	await expect(page).toHaveURL(/\/lessons\/everyday-soap\?version=/);
	await expect(page.getByRole('heading', { name: 'Grease stays on water alone' })).toBeVisible();
});
