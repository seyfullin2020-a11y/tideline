import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../../../server/db';
import { requireUser } from '../../../server/auth';
import { failure, HttpError, sameOrigin, limit } from '../../../server/http';
import { initialState } from '../../../server/games';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser();
    limit(`tournament:${user.id}`, 10);
    const input = z
      .discriminatedUnion('type', [
        z.object({ type: z.literal('create'), name: z.string().trim().min(3).max(60) }),
        z.object({ type: z.literal('join'), id: z.string() }),
        z.object({ type: z.literal('advance'), id: z.string() }),
      ])
      .parse(await req.json());
    if (input.type === 'create')
      return NextResponse.json(
        await db.tournament.create({
          data: {
            name: input.name,
            creatorId: user.id,
            participants: { create: { userId: user.id } },
          },
        }),
      );
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Tournament" WHERE id = ${input.id} FOR UPDATE`;
      const t = await tx.tournament.findUnique({
        where: { id: input.id },
        include: { participants: true, games: { include: { players: true } } },
      });
      if (!t) throw new HttpError(404, 'Турнир не найден.');
      if (input.type === 'join') {
        if (t.status !== 'open' || t.participants.length >= t.capacity)
          throw new HttpError(409, 'Регистрация закрыта.');
        if (t.participants.some((p) => p.userId === user.id))
          throw new HttpError(409, 'Вы уже участвуете.');
        return tx.tournamentParticipant.create({ data: { tournamentId: t.id, userId: user.id } });
      }
      if (t.creatorId !== user.id)
        throw new HttpError(403, 'Следующий раунд запускает организатор.');
      if (t.status === 'finished') throw new HttpError(409, 'Турнир уже завершён.');
      let participants = t.participants.filter((p) => !p.eliminated).map((p) => p.userId);
      if (t.status === 'open' && participants.length !== 4)
        throw new HttpError(400, 'Нужны 4 участника.');
      if (t.games.some((g) => g.status !== 'finished'))
        throw new HttpError(409, 'Дождитесь завершения текущих матчей.');
      if (t.status === 'active') {
        const round = Math.max(...t.games.map((g) => g.round ?? 1));
        participants = t.games
          .filter((g) => g.round === round)
          .map((g) => {
            const winner = (g.state as unknown as { winner: number }).winner;
            const p = g.players.find((p) => p.seat === winner);
            if (!p) throw new HttpError(409, 'Нет победителя.');
            return p.userId;
          });
      }
      if (participants.length === 1)
        return tx.tournament.update({ where: { id: t.id }, data: { status: 'finished' } });
      const round = t.games.length ? Math.max(...t.games.map((g) => g.round ?? 1)) + 1 : 1;
      for (let i = 0; i < participants.length; i += 2)
        await tx.game.create({
          data: {
            kind: 'tournament',
            mode: 'classic',
            tournamentId: t.id,
            round,
            bracketIndex: i / 2,
            state: initialState('classic', 'normal') as unknown as Prisma.InputJsonValue,
            players: {
              create: [
                { userId: participants[i], seat: 0 },
                { userId: participants[i + 1], seat: 1 },
              ],
            },
          },
        });
      return tx.tournament.update({ where: { id: t.id }, data: { status: 'active' } });
    });
    return NextResponse.json(result);
  } catch (e) {
    return failure(e);
  }
}
