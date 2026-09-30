import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, errors } from 'jose';
import type { JWTPayload } from 'jose';
import { db } from './db';
import { HttpError } from './http';
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32 || value.startsWith('replace-'))
    throw new HttpError(503, 'Авторизация не настроена: требуется SESSION_SECRET.');
  return new TextEncoder().encode(value);
}
export async function setSession(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const token = await new SignJWT({ sub: userId, version: user.sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
  (await cookies()).set('tideline_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 604800,
  });
}
export async function currentUser() {
  const token = (await cookies()).get('tideline_session')?.value;
  if (!token) return null;
  const key = secret();
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, key, { algorithms: ['HS256'] }));
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }
  if (typeof payload.sub !== 'string' || typeof payload.version !== 'number') return null;
  // An unavailable database is a service error, not an invalid session.
  const user = await db.user.findUnique({ where: { id: payload.sub } });
  return user && user.sessionVersion === payload.version ? user : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Войдите в аккаунт, чтобы продолжить.');
  return user;
}
export function publicUser(user: {
  id: string;
  username: string;
  createdAt: Date;
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  theme: string;
  plan: string;
  lastSeen: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
    rating: user.rating,
    wins: user.wins,
    losses: user.losses,
    streak: user.streak,
    bestStreak: user.bestStreak,
    theme: user.theme,
    plan: user.plan,
    online: Date.now() - user.lastSeen.getTime() < 90000,
  };
}
