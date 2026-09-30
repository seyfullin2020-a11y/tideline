import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: 'Проверьте введённые данные.', fields: error.flatten() },
      { status: 400 },
    );
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')
    return NextResponse.json(
      { error: 'Эта запись уже существует. Обновите страницу.' },
      { status: 409 },
    );
  console.error(error instanceof Error ? error.name : 'Server error');
  return NextResponse.json(
    { error: 'Сервис временно недоступен. Проверьте подключение базы данных и попробуйте снова.' },
    { status: 503 },
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    throw new HttpError(403, 'Недопустимый источник запроса.');
}
const buckets = new Map<string, { count: number; expires: number }>();
export function limit(key: string, max = 30) {
  const now = Date.now(),
    bucket = buckets.get(key);
  if (buckets.size > 10000) for (const [k, v] of buckets) if (v.expires < now) buckets.delete(k);
  if (!bucket || bucket.expires < now) {
    buckets.set(key, { count: 1, expires: now + 60000 });
    return;
  }
  if (++bucket.count > max) throw new HttpError(429, 'Слишком много запросов. Подождите минуту.');
}
