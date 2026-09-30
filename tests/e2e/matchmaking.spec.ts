import { test, expect } from '@playwright/test';
test.skip(process.env.TEST_DATABASE !== '1', 'Requires disposable PostgreSQL database.');
test('quick match pairs real users and rejects invalid fleet', async ({ playwright }) => {
  const a = await playwright.request.newContext({ baseURL: 'http://localhost:3000' }),
    b = await playwright.request.newContext({ baseURL: 'http://localhost:3000' }),
    origin = { Origin: 'http://localhost:3000' },
    suffix = Date.now().toString(36);
  for (const [i, ctx] of [a, b].entries())
    expect(
      (
        await ctx.post('/api/auth/register', {
          headers: origin,
          data: {
            email: `q${i}_${suffix}@example.test`,
            username: `q${i}_${suffix}`,
            password: 'Only-test-password-2026',
          },
        })
      ).ok(),
    ).toBe(true);
  const first = await (
    await a.post('/api/games', { headers: origin, data: { kind: 'quick' } })
  ).json();
  const second = await (
    await b.post('/api/games', { headers: origin, data: { kind: 'quick' } })
  ).json();
  expect(second.id).toBe(first.id);
  expect(second.players).toHaveLength(2);
  const invalid = await a.post(`/api/games/${first.id}`, {
    headers: origin,
    data: { type: 'ready', fleet: [{ id: 'x', cells: [0, 1, 11] }] },
  });
  expect(invalid.status()).toBe(400);
  const rejected = await a.post('/api/community', {
    headers: { Origin: 'https://foreign.test' },
    data: { type: 'upgrade' },
  });
  expect(rejected.status()).toBe(403);
  await a.dispose();
  await b.dispose();
});
