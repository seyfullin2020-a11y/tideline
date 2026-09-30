import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '../../../server/auth';
import { createGame, quickMatch } from '../../../server/games';
import { failure, HttpError, limit, sameOrigin } from '../../../server/http';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser();
    limit(`create:${user.id}`, 10);
    const { kind, mode, difficulty } = z
      .object({
        kind: z.enum(['ai', 'friend', 'quick']),
        mode: z.enum(['classic', 'blitz']).default('classic'),
        difficulty: z.enum(['easy', 'normal', 'hard', 'expert']).default('normal'),
      })
      .parse(await req.json());
    if (kind === 'ai' && difficulty === 'expert' && user.plan !== 'pro')
      throw new HttpError(403, 'Expert AI доступен с PRO. Активируйте бесплатный Demo Upgrade.');
    return NextResponse.json(
      kind === 'quick'
        ? await quickMatch(user.id)
        : await createGame(user.id, kind, mode, difficulty),
    );
  } catch (e) {
    return failure(e);
  }
}
