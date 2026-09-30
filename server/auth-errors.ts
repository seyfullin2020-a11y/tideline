import { NextResponse } from 'next/server';
import { failure, HttpError } from './http';

// Never log Prisma messages/meta: they can include hosts, SQL or connection credentials.
export function authFailure(error: unknown) {
  const record = typeof error === 'object' && error !== null ? error : {};
  const rawCode =
    'code' in record ? record.code : 'errorCode' in record ? record.errorCode : undefined;
  const code = typeof rawCode === 'string' && /^P\d{4}$/.test(rawCode) ? rawCode : undefined;
  const name = error instanceof Error ? error.name : '';
  const databaseError = code || name.startsWith('PrismaClient');
  if (!databaseError) return failure(error);

  const reasons: Record<string, { diagnostic: string; message: string }> = {
    P1000: {
      diagnostic: 'AUTH_DATABASE_CREDENTIALS',
      message:
        'Не удалось подключиться к базе аккаунтов. Администратору необходимо проверить DATABASE_URL.',
    },
    P1001: {
      diagnostic: 'AUTH_DATABASE_UNREACHABLE',
      message: 'База аккаунтов недоступна. Повторите вход позже.',
    },
    P1002: {
      diagnostic: 'AUTH_DATABASE_TIMEOUT',
      message: 'База аккаунтов не ответила вовремя. Повторите вход позже.',
    },
    P1012: {
      diagnostic: 'AUTH_DATABASE_CONFIGURATION',
      message: 'База аккаунтов не настроена. Администратору необходимо проверить DATABASE_URL.',
    },
    P2021: {
      diagnostic: 'AUTH_DATABASE_MIGRATIONS',
      message: 'База аккаунтов не подготовлена. Администратору необходимо применить миграции.',
    },
    P2022: {
      diagnostic: 'AUTH_DATABASE_MIGRATIONS',
      message: 'Структура базы аккаунтов устарела. Администратору необходимо применить миграции.',
    },
  };
  // Preserve duplicate-account validation and other existing HTTP behavior.
  if (code === 'P2002') return failure(error);
  const reason = (code && reasons[code]) || {
    diagnostic: 'AUTH_DATABASE_ERROR',
    message: 'Не удалось обратиться к базе аккаунтов. Повторите вход позже.',
  };
  console.error({ event: 'auth_failure', diagnostic: reason.diagnostic, prismaCode: code ?? null });
  return NextResponse.json({ error: reason.message, code: reason.diagnostic }, { status: 503 });
}

export function assertAuthConfiguration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    console.error({ event: 'auth_failure', diagnostic: 'AUTH_DATABASE_URL_MISSING' });
    throw new HttpError(503, 'Авторизация не настроена: требуется DATABASE_URL.');
  }
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32 || sessionSecret.startsWith('replace-')) {
    console.error({ event: 'auth_failure', diagnostic: 'AUTH_SESSION_SECRET_INVALID' });
    throw new HttpError(
      503,
      'Авторизация не настроена: требуется SESSION_SECRET (не менее 32 символов).',
    );
  }
}
