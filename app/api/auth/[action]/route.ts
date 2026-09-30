import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { hash, compare } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '../../../../server/db';
import { currentUser, publicUser, setSession } from '../../../../server/auth';
import { failure, HttpError, limit, sameOrigin } from '../../../../server/http';
export async function GET() {
  try {
    const user = await currentUser();
    return NextResponse.json({
      user: user ? publicUser(user) : null,
      configured: !!process.env.DATABASE_URL,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    sameOrigin(req);
    limit(`auth:${req.headers.get('x-forwarded-for') ?? 'local'}`, 15);
    const { action } = await params;
    if (action === 'logout') {
      (await cookies()).delete('tideline_session');
      return NextResponse.json({ ok: true });
    }
    const data = await req.json();
    if (action === 'register' || action === 'login') {
      const input = z
        .object({
          email: z
            .string()
            .email()
            .max(254)
            .transform((s) => s.toLowerCase().trim()),
          password: z.string().min(8).max(72),
          username: z
            .string()
            .regex(/^[a-zA-Z0-9_]{3,20}$/)
            .optional(),
        })
        .parse(data);
      let user = await db.user.findUnique({ where: { email: input.email } });
      if (action === 'register') {
        if (!input.username)
          throw new HttpError(400, 'Укажите имя: 3–20 латинских букв, цифр или _.');
        if (user || (await db.user.findUnique({ where: { username: input.username } })))
          throw new HttpError(409, 'Email или имя уже заняты.');
        user = await db.user.create({
          data: {
            email: input.email,
            username: input.username,
            passwordHash: await hash(input.password, 12),
          },
        });
      } else if (!user || !(await compare(input.password, user.passwordHash)))
        throw new HttpError(401, 'Неверный email или пароль.');
      if (!user) throw new HttpError(401, 'Не удалось войти.');
      await setSession(user.id);
      return NextResponse.json({ user: publicUser(user) });
    }
    if (action === 'forgot') {
      if (!process.env.RESEND_API_KEY)
        throw new HttpError(503, 'Восстановление пароля требует подключения email-сервиса.');
      const { email } = z.object({ email: z.string().email() }).parse(data),
        user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
      if (user) {
        const token = randomBytes(32).toString('hex'),
          tokenHash = createHash('sha256').update(token).digest('hex');
        await db.passwordReset.create({
          data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 3600000) },
        });
        const url = new URL('/reset-password', process.env.APP_URL);
        url.searchParams.set('token', token);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'TIDELINE · Reset password',
            html: `<p>Ссылка действует 1 час.</p><a href="${url.toString()}">Восстановить пароль</a>`,
          }),
        });
        if (!response.ok) throw new HttpError(503, 'Не удалось отправить письмо. Повторите позже.');
      }
      return NextResponse.json({
        message: 'Если аккаунт существует, письмо для восстановления отправлено.',
      });
    }
    if (action === 'reset') {
      const { token, password } = z
          .object({ token: z.string().length(64), password: z.string().min(8).max(72) })
          .parse(data),
        tokenHash = createHash('sha256').update(token).digest('hex');
      await db.$transaction(async (tx) => {
        const reset = await tx.passwordReset.findUnique({ where: { tokenHash } });
        if (!reset || reset.expiresAt.getTime() < Date.now())
          throw new HttpError(400, 'Ссылка истекла или уже использована.');
        await tx.passwordReset.delete({ where: { id: reset.id } });
        await tx.user.update({
          where: { id: reset.userId },
          data: { passwordHash: await hash(password, 12), sessionVersion: { increment: 1 } },
        });
      });
      return NextResponse.json({ message: 'Пароль обновлён. Войдите с новым паролем.' });
    }
    throw new HttpError(404, 'Операция не найдена.');
  } catch (e) {
    return failure(e);
  }
}
