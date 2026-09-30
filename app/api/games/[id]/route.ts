import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '../../../../server/auth';
import { joinGame, mutateGame, readGame } from '../../../../server/games';
import { failure, limit, sameOrigin } from '../../../../server/http';
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    return NextResponse.json(await readGame((await params).id, user.id));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(req);
    const user = await requireUser();
    limit(`move:${user.id}`, 150);
    const id = (await params).id;
    const action = z
      .discriminatedUnion('type', [
        z.object({ type: z.literal('join') }),
        z.object({
          type: z.literal('ready'),
          fleet: z
            .array(
              z.object({ id: z.string().max(50), cells: z.array(z.number().int()).min(1).max(4) }),
            )
            .max(10),
        }),
        z.object({ type: z.literal('shoot'), cell: z.number().int() }),
        z.object({ type: z.literal('resign') }),
      ])
      .parse(await req.json());
    return NextResponse.json(
      action.type === 'join' ? await joinGame(id, user.id) : await mutateGame(id, user.id, action),
    );
  } catch (e) {
    return failure(e);
  }
}
