import { test, expect } from '@playwright/test';
test.skip(!process.env.PRODUCTION_URL, 'Set PRODUCTION_URL to verify the built standalone server.');
test('production server serves assets and restores a playable match', async ({ page }) => {
  const origin = process.env.PRODUCTION_URL!;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Океан возможностей');
  await page.screenshot({ path: 'test-results/production-home.png', fullPage: true });
  await page.goto(`${origin}/play?mode=blitz`);
  await page.getByRole('button', { name: 'Расставить флот' }).click();
  await page.getByRole('button', { name: 'Случайно', exact: true }).click();
  await page.getByRole('button', { name: 'Флот готов' }).click();
  await page
    .getByRole('group', { name: 'Воды соперника' })
    .locator('button:not(:disabled)')
    .first()
    .click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Воды соперника' })).toBeVisible();
  await page.screenshot({ path: 'test-results/production-game.png', fullPage: true });
  expect(errors).toEqual([]);
});
