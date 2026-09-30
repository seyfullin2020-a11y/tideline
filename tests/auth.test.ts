import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { authFailure, assertAuthConfiguration } from '../server/auth-errors';
import { currentUser } from '../server/auth';

const mocks = vi.hoisted(() => ({ token: '', findUnique: vi.fn() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (mocks.token ? { value: mocks.token } : undefined) }),
}));
vi.mock('../server/db', () => ({ db: { user: { findUnique: mocks.findUnique } } }));

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-only-session-secret-for-auth-tests-2026');
  vi.stubEnv('DATABASE_URL', 'postgresql://unused.invalid/test');
  mocks.token = '';
  mocks.findUnique.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('safe authentication diagnostics', () => {
  it.each([
    ['P1000', 'AUTH_DATABASE_CREDENTIALS'],
    ['P1001', 'AUTH_DATABASE_UNREACHABLE'],
    ['P1012', 'AUTH_DATABASE_CONFIGURATION'],
    ['P2021', 'AUTH_DATABASE_MIGRATIONS'],
    ['P2022', 'AUTH_DATABASE_MIGRATIONS'],
  ])('reports %s without leaking error messages or metadata', async (code, diagnostic) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('private connection credentials'), {
      code,
      meta: { connection: 'private connection credentials' },
    });
    const response = authFailure(error);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: diagnostic });
    expect(JSON.stringify(log.mock.calls)).not.toContain('private connection credentials');
    expect(log).toHaveBeenCalledWith({ event: 'auth_failure', diagnostic, prismaCode: code });
  });
  it('handles Prisma initialization errorCode as well as query code', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = authFailure(Object.assign(new Error('private'), { errorCode: 'P1001' }));
    expect(await response.json()).toMatchObject({ code: 'AUTH_DATABASE_UNREACHABLE' });
  });
  it('preserves duplicate-account errors', async () => {
    expect(authFailure({ code: 'P2002' }).status).toBe(409);
  });
  it('rejects missing database configuration before creating an account', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('DATABASE_URL', '');
    expect(assertAuthConfiguration).toThrow('DATABASE_URL');
  });
  it('rejects a placeholder signing secret before creating an account', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('SESSION_SECRET', 'replace-with-a-random-secret-of-at-least-32-characters');
    expect(assertAuthConfiguration).toThrow('SESSION_SECRET');
  });
});

describe('session recovery', () => {
  async function session(version = 0) {
    mocks.token = await new SignJWT({ sub: 'test-user', version })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  }
  it('restores a valid signed session', async () => {
    await session();
    const user = { id: 'test-user', sessionVersion: 0 };
    mocks.findUnique.mockResolvedValue(user);
    expect(await currentUser()).toBe(user);
  });
  it('rejects invalid tokens without querying the database', async () => {
    mocks.token = 'invalid-session';
    expect(await currentUser()).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it('rejects revoked sessions', async () => {
    await session();
    mocks.findUnique.mockResolvedValue({ id: 'test-user', sessionVersion: 1 });
    expect(await currentUser()).toBeNull();
  });
  it('propagates database outages instead of silently signing the user out', async () => {
    await session();
    const error = Object.assign(new Error('private'), { code: 'P1001' });
    mocks.findUnique.mockRejectedValue(error);
    await expect(currentUser()).rejects.toBe(error);
  });
  it('reports invalid signing configuration instead of silently rejecting a session', async () => {
    await session();
    vi.stubEnv('SESSION_SECRET', '');
    await expect(currentUser()).rejects.toThrow('SESSION_SECRET');
  });
});
