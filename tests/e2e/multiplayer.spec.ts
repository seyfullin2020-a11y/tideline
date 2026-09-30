import { test, expect, APIRequestContext } from '@playwright/test';
import { randomFleet } from '../../lib/game/engine';
import { chooseShot } from '../../lib/game/ai';
import type { VisibleGame } from '../../components/game-screen';
test.skip(
  process.env.TEST_DATABASE !== '1',
  'Set TEST_DATABASE=1 with a migrated disposable PostgreSQL database.',
);
const origin = 'http://localhost:3000';
async function post(context: APIRequestContext, path: string, data: unknown) {
  return context.post(path, { headers: { Origin: origin }, data });
}
async function register(context: APIRequestContext, name: string) {
  const response = await post(context, '/api/auth/register', {
    email: `${name}@example.test`,
    username: name,
    password: 'Test-only-password-2026',
  });
  expect(response.ok()).toBe(true);
  return (await response.json()).user as { id: string; username: string };
}
test('two real accounts synchronize, protect hidden fleets, reconnect and finish a match', async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext(),
    c = await browser.newContext();
  const suffix = Date.now().toString(36);
  await register(a.request, `a_${suffix}`);
  await register(b.request, `b_${suffix}`);
  await register(c.request, `c_${suffix}`);
  const created = await post(a.request, '/api/games', {
    kind: 'friend',
    mode: 'blitz',
    difficulty: 'normal',
  });
  expect(created.ok()).toBe(true);
  let game = (await created.json()) as VisibleGame;
  const pageA = await a.newPage(),
    pageB = await b.newPage();
  await pageA.goto(`/game/${game.id}`);
  await pageB.goto(`/game/${game.id}`);
  await expect(pageA.getByText(`b_${suffix}`, { exact: true })).toBeVisible();
  await expect(pageB.getByRole('button', { name: 'Случайно', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await pageA.getByRole('button', { name: 'Случайно', exact: true }).click();
  await pageB.getByRole('button', { name: 'Случайно', exact: true }).click();
  await pageA.getByRole('button', { name: 'Флот готов' }).click();
  await pageB.getByRole('button', { name: 'Флот готов' }).click();
  await expect(pageA.getByRole('status').filter({ hasText: 'Твой ход' })).toBeVisible();
  await expect(pageB.getByRole('status').filter({ hasText: 'Ход соперника' })).toBeVisible();
  game = await (await a.request.get(`/api/games/${game.id}`)).json();
  expect(game).not.toHaveProperty('fleets');
  expect(game).not.toHaveProperty('enemyFleet');
  expect(game.myFleet).toHaveLength(5);
  expect((await c.request.get(`/api/games/${game.id}`)).status()).toBe(403);
  expect(
    (await post(b.request, `/api/games/${game.id}`, { type: 'shoot', cell: 0 })).status(),
  ).toBe(400);
  expect(
    (await post(c.request, `/api/games/${game.id}`, { type: 'shoot', cell: 0 })).status(),
  ).toBe(403);
  await pageA
    .getByRole('group', { name: 'Воды соперника' })
    .locator('button:not(:disabled)')
    .first()
    .click();
  await expect
    .poll(
      async () =>
        ((await (await b.request.get(`/api/games/${game.id}`)).json()) as VisibleGame).enemyShots
          .length,
    )
    .toBe(1);
  await expect(pageB.getByRole('status').filter({ hasText: /Ты|Соперник/ })).toBeVisible();
  await pageA.reload();
  await expect(pageA.getByRole('heading', { name: 'Воды соперника' })).toBeVisible();
  expect(
    (await post(a.request, `/api/games/${game.id}`, { type: 'shoot', cell: 0 })).status(),
  ).toBe(400);
  for (let i = 0; i < 98; i++) {
    game = await (await a.request.get(`/api/games/${game.id}`)).json();
    if (game.status === 'finished') break;
    const shooter = game.turn === 0 ? a.request : b.request,
      state = (await (await shooter.get(`/api/games/${game.id}`)).json()) as VisibleGame;
    const cell = chooseShot({ size: 7, lengths: [3, 2, 2, 1, 1], shots: state.myShots }, 'expert');
    const response = await post(shooter, `/api/games/${game.id}`, { type: 'shoot', cell });
    expect(response.ok()).toBe(true);
  }
  await expect(pageA.getByRole('heading', { name: /Твои воды|Новый курс/ })).toBeVisible();
  await expect(pageB.getByRole('heading', { name: /Твои воды|Новый курс/ })).toBeVisible();
  const community = await (await a.request.get('/api/community')).json();
  expect(community.user.wins + community.user.losses).toBe(1);
  expect(community.games[0].status).toBe('finished');
  await pageA.goto('/dashboard');
  await expect(pageA.locator('.stat strong').first()).toHaveText('1');
  const ratings = await (await a.request.get('/api/community?section=leaderboard')).json();
  expect(ratings.users.some((u: { username: string }) => u.username === `a_${suffix}`)).toBe(true);
  expect(
    (await post(a.request, `/api/games/${game.id}`, { type: 'shoot', cell: 3 })).status(),
  ).toBe(400);
  await a.close();
  await b.close();
  await c.close();
});
test('auth, social, PRO, profiles and real tournament progression', async ({ playwright }) => {
  const contexts: APIRequestContext[] = [];
  const suffix = Date.now().toString(36);
  const users: { id: string; username: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const ctx = await playwright.request.newContext({ baseURL: origin });
    contexts.push(ctx);
    users.push(await register(ctx, `t${i}_${suffix}`));
  }
  const [a, b] = contexts;
  expect(
    (await post(a, '/api/community', { type: 'friend', username: users[1].username })).ok(),
  ).toBe(true);
  const social = await (await b.get('/api/community')).json();
  expect((await post(b, '/api/community', { type: 'accept', id: social.friends[0].id })).ok()).toBe(
    true,
  );
  expect((await post(a, '/api/games', { kind: 'ai', difficulty: 'expert' })).status()).toBe(403);
  expect((await post(a, '/api/community', { type: 'upgrade' })).ok()).toBe(true);
  const ai = await post(a, '/api/games', { kind: 'ai', mode: 'blitz', difficulty: 'expert' });
  expect(ai.ok()).toBe(true);
  const aiGame = await ai.json();
  expect(
    (await post(a, `/api/games/${aiGame.id}`, { type: 'ready', fleet: randomFleet('blitz') })).ok(),
  ).toBe(true);
  expect(
    (
      await post(a, '/api/community', {
        type: 'profile',
        username: users[0].username,
        theme: 'arctic',
      })
    ).ok(),
  ).toBe(true);
  const tournament = await (
    await post(a, '/api/tournaments', { type: 'create', name: 'Integration Cup' })
  ).json();
  for (const ctx of contexts.slice(1))
    expect((await post(ctx, '/api/tournaments', { type: 'join', id: tournament.id })).ok()).toBe(
      true,
    );
  expect((await post(b, '/api/tournaments', { type: 'advance', id: tournament.id })).status()).toBe(
    403,
  );
  expect((await post(a, '/api/tournaments', { type: 'advance', id: tournament.id })).ok()).toBe(
    true,
  );
  for (let round = 1; round <= 2; round++) {
    const d = await (await a.get('/api/community')).json();
    const t = d.tournaments.find((t: { id: string }) => t.id === tournament.id);
    const games = t.games.filter((g: { round: number }) => g.round === round);
    expect(games).toHaveLength(round === 1 ? 2 : 1);
    for (const game of games) {
      const participants = game.players.map(
        (p: { id?: string; user: { id: string } }) =>
          contexts[users.findIndex((u) => u.id === p.user.id)],
      );
      for (const ctx of participants)
        expect(
          (
            await post(ctx, `/api/games/${game.id}`, {
              type: 'ready',
              fleet: randomFleet('classic'),
            })
          ).ok(),
        ).toBe(true);
      expect((await post(participants[1], `/api/games/${game.id}`, { type: 'resign' })).ok()).toBe(
        true,
      );
    }
    expect((await post(a, '/api/tournaments', { type: 'advance', id: tournament.id })).ok()).toBe(
      true,
    );
  }
  const final = await (await a.get('/api/community')).json();
  expect(final.tournaments.find((t: { id: string }) => t.id === tournament.id).status).toBe(
    'finished',
  );
  await expect(await post(a, '/api/auth/logout', {})).toBeOK();
  expect((await a.get('/api/community')).status()).toBe(401);
  expect(
    (
      await post(a, '/api/auth/login', {
        email: `${users[0].username}@example.test`,
        password: 'Test-only-password-2026',
      })
    ).ok(),
  ).toBe(true);
  for (const ctx of contexts) await ctx.dispose();
});
