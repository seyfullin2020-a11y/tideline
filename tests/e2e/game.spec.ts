import { test, expect } from '@playwright/test';
test('plays a complete local game and restores it after reload', async ({ page }) => {
  await page.goto('/play?mode=blitz');
  await page.getByRole('button', { name: 'Расставить флот' }).click();
  await page.getByRole('button', { name: 'Случайно', exact: true }).click();
  await page.getByRole('button', { name: 'Флот готов' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Твой ход' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Воды соперника' })).toBeVisible();
  for (let i = 0; i < 98; i++) {
    if (await page.getByRole('heading', { name: /Твои воды|Новый курс/ }).isVisible()) break;
    const cells = page
      .getByRole('group', { name: 'Воды соперника' })
      .locator('button:not(:disabled)');
    await expect(page.getByRole('status').filter({ hasText: 'Твой ход' })).toBeVisible();
    await cells.first().click();
    await page.waitForTimeout(500);
  }
  await expect(page.getByRole('heading', { name: /Твои воды|Новый курс/ })).toBeVisible();
  await page.getByRole('button', { name: 'Анализ партии' }).click();
  await expect(page.getByRole('heading', { name: 'Разбор твоей стратегии' })).toBeVisible();
  await page.goto('/pro');
  await page.getByRole('button', { name: 'Demo Upgrade' }).click();
  await expect(page.getByRole('button', { name: 'PRO активирован ✓' })).toBeVisible();
  await page.goto('/game/local');
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await page.getByRole('button', { name: 'Следующий ход' }).click();
  await expect(page.getByLabel('Ход replay')).toHaveValue('1');
  await page.getByRole('button', { name: 'В конец', exact: true }).click();
  await page.getByRole('button', { name: 'В начало', exact: true }).click();
  await expect(page.getByLabel('Ход replay')).toHaveValue('0');
});
test('layouts fit 320, 375, 390, 414 and tablet widths', async ({ page }) => {
  for (const width of [320, 375, 390, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    const overflow = await page.evaluate(() =>
      Array.from(document.querySelectorAll('*'))
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
        .map((e) => `${e.tagName}.${e.className}: ${e.getBoundingClientRect().right}`)
        .slice(0, 20),
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `width ${width}: ${overflow.join(', ')}`,
    ).toBe(true);
    await page.goto('/game/local?new=1&mode=classic');
    await expect(page.getByRole('heading', { name: 'Мой флот' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
