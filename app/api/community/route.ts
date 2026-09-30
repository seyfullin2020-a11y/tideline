import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../server/db';
import { publicUser, requireUser } from '../../../server/auth';
import { failure, HttpError, sameOrigin, limit } from '../../../server/http';
import { gameInclude, view } from '../../../server/games';
export async function GET(req: Request) {
  try {
    const section = new URL(req.url).searchParams.get('section');
    if (section === 'leaderboard') {
      const users = await db.user.findMany({
        where: { OR: [{ wins: { gt: 0 } }, { losses: { gt: 0 } }] },
        orderBy: { rating: 'desc' },
        take: 50,
      });
      return NextResponse.json({ users: users.map(publicUser) });
    }
    const user = await requireUser();
    await db.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } });
    const [games, friends, achievements, tournaments] = await Promise.all([
      db.game.findMany({
        where: { players: { some: { userId: user.id } } },
        include: gameInclude,
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      db.friendship.findMany({
        where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
        include: { sender: true, recipient: true },
      }),
      db.userAchievement.findMany({ where: { userId: user.id } }),
      db.tournament.findMany({
        include: { participants: { include: { user: true } }, games: { include: gameInclude } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return NextResponse.json({
      user: publicUser(user),
      games: games.map((g) => view(g, user.id)),
      friends: friends.map((f) => ({
        id: f.id,
        status: f.status,
        incoming: f.recipientId === user.id,
        user: publicUser(f.senderId === user.id ? f.recipient : f.sender),
      })),
      achievements,
      tournaments: tournaments.map((t) => ({
        ...t,
        participants: t.participants.map((p) => ({ ...p, user: publicUser(p.user) })),
        games: t.games.map((g) => ({
          id: g.id,
          status: g.status,
          round: g.round,
          players: g.players.map((p) => ({ seat: p.seat, user: publicUser(p.user) })),
          winner: (g.state as { winner: number | null }).winner,
        })),
      })),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser();
    limit(`community:${user.id}`, 30);
    const input = z
      .discriminatedUnion('type', [
        z.object({ type: z.literal('upgrade') }),
        z.object({
          type: z.literal('profile'),
          username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
          theme: z.enum(['ocean', 'tactical', 'arctic']),
        }),
        z.object({ type: z.literal('friend'), username: z.string().max(20) }),
        z.object({ type: z.literal('accept'), id: z.string() }),
        z.object({ type: z.literal('remove'), id: z.string() }),
      ])
      .parse(await req.json());
    if (input.type === 'upgrade')
      return NextResponse.json({
        user: publicUser(await db.user.update({ where: { id: user.id }, data: { plan: 'pro' } })),
      });
    if (input.type === 'profile') {
      const duplicate = await db.user.findUnique({ where: { username: input.username } });
      if (duplicate && duplicate.id !== user.id) throw new HttpError(409, 'Имя уже занято.');
      return NextResponse.json({
        user: publicUser(
          await db.user.update({
            where: { id: user.id },
            data: { username: input.username, theme: input.theme },
          }),
        ),
      });
    }
    if (input.type === 'friend') {
      const target = await db.user.findUnique({ where: { username: input.username } });
      if (!target || target.id === user.id)
        throw new HttpError(400, 'Игрок не найден или это ваш аккаунт.');
      const existing = await db.friendship.findFirst({
        where: {
          OR: [
            { senderId: user.id, recipientId: target.id },
            { senderId: target.id, recipientId: user.id },
          ],
        },
      });
      if (existing) throw new HttpError(409, 'Запрос уже существует.');
      await db.friendship.create({ data: { senderId: user.id, recipientId: target.id } });
    } else {
      const f = await db.friendship.findUnique({ where: { id: input.id } });
      if (
        !f ||
        (input.type === 'accept'
          ? f.recipientId !== user.id
          : f.senderId !== user.id && f.recipientId !== user.id)
      )
        throw new HttpError(403, 'Недоступный запрос.');
      if (input.type === 'accept')
        await db.friendship.update({ where: { id: f.id }, data: { status: 'accepted' } });
      else await db.friendship.delete({ where: { id: f.id } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
