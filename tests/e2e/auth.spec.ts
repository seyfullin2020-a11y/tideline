import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'node:crypto';
test.skip(process.env.TEST_DATABASE !== '1', 'Requires disposable PostgreSQL.');

test('logout clears the session after credential requests hit the rate limit', async ({
  request,
}) => {
  const suffix = Date.now().toString(36);
  // Isolate the exhausted bucket from other scenarios sharing the test server.
  const headers = {
    Origin: 'http://localhost:3000',
    'X-Forwarded-For': `logout-regression-${suffix}`,
  };
  await expect(
    await request.post('/api/auth/register', {
      headers,
      data: {
        email: `logout_${suffix}@example.test`,
        username: `logout_${suffix}`,
        password: 'Test-only-password-2026',
      },
    }),
  ).toBeOK();
  expect((await request.get('/api/community')).status()).toBe(200);
  for (let i = 0; i < 14; i++) {
    expect((await request.post('/api/auth/login', { headers, data: {} })).status()).toBe(400);
  }
  const throttled = await request.post('/api/auth/login', { headers, data: {} });
  expect(throttled.status()).toBe(429);
  expect(await throttled.json()).toHaveProperty('error');
  // Exhaustion must not bypass CSRF protection or keep the user signed in.
  expect(
    (
      await request.post('/api/auth/logout', {
        headers: { ...headers, Origin: 'https://untrusted.example' },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect((await request.get('/api/community')).status()).toBe(200);
  const logout = await request.post('/api/auth/logout', { headers, data: {} });
  await expect(logout).toBeOK();
  expect(await logout.json()).toEqual({ ok: true });
  expect((await request.get('/api/community')).status()).toBe(401);
  expect((await (await request.get('/api/auth/me')).json()).user).toBeNull();
  await expect(await request.post('/api/auth/logout', { headers, data: {} })).toBeOK();
});
test('registration UI, password reset revocation, profile themes and logout', async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString(36),
    username = `ui_${suffix}`,
    email = `${username}@example.test`;
  await page.goto('/register');
  await page.getByLabel('Имя игрока').fill(username);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill('Test-only-old-password');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/profile');
  await page.getByLabel('Оформление').selectOption('arctic');
  await page.getByRole('button', { name: 'Сохранить настройки' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'arctic');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'arctic');
  await page.screenshot({ path: 'test-results/arctic-profile.png', fullPage: true });
  const login = await request.post('/api/auth/login', {
    headers: { Origin: 'http://localhost:3000' },
    data: { email, password: 'Test-only-old-password' },
  });
  expect(login.ok()).toBe(true);
  const user = (await login.json()).user;
  const db = new PrismaClient(),
    token = randomBytes(32).toString('hex');
  try {
    await db.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
  } finally {
    await db.$disconnect();
  }
  const reset = await request.post('/api/auth/reset', {
    headers: { Origin: 'http://localhost:3000' },
    data: { token, password: 'Test-only-new-password' },
  });
  expect(reset.ok()).toBe(true);
  expect((await request.get('/api/community')).status()).toBe(401);
  expect((await page.request.get('/api/community')).status()).toBe(401);
  expect(
    (
      await request.post('/api/auth/reset', {
        headers: { Origin: 'http://localhost:3000' },
        data: { token, password: 'Another-test-password' },
      })
    ).status(),
  ).toBe(400);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Пароль', { exact: true }).fill('Test-only-new-password');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.reload();
  await expect(page).toHaveURL(/dashboard/);
  const restored = await page.request.get('/api/auth/me');
  await expect(restored).toBeOK();
  expect((await restored.json()).user.id).toBe(user.id);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Выйти из аккаунта' }).click();
  await expect(page).toHaveURL('http://localhost:3000/');
});
