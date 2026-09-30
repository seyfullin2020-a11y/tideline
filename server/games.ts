import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { chooseShot } from '../lib/game/ai';
import { elo, randomFleet, takeTurn, validateFleet } from '../lib/game/engine';
import { Difficulty, Fleet, GameMode, MatchState, rules } from '../lib/game/types';
import { db } from './db';
import { HttpError } from './http';
import { publicUser } from './auth';
export const gameInclude = { players: { include: { user: true } } } as const;
type StoredGame = Prisma.GameGetPayload<{ include: typeof gameInclude }>;
export function initialState(mode: GameMode, difficulty: Difficulty): MatchState {
  return {
    id: randomUUID(),
    mode,
    difficulty,
    size: rules(mode).size,
    fleets: [[], []],
    shots: [[], []],
    moves: [],
    turn: 0,
    status: 'placement',
    winner: null,
    startedAt: Date.now(),
  };
}
export function view(game: StoredGame, userId: string) {
  const player = game.players.find((p) => p.userId === userId);
  if (!player) throw new HttpError(403, 'Вы не участник этой комнаты.');
  const s = game.state as unknown as MatchState,
    seat = player.seat;
  return {
    id: game.id,
    kind: game.kind,
    mode: game.mode,
    difficulty: game.difficulty,
    version: game.version,
    seat,
    status: s.status,
    size: s.size,
    turn: s.turn,
    winner: s.winner,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    myFleet: s.fleets[seat],
    myShots: s.shots[seat],
    enemyShots: s.shots[1 - seat],
    moves: s.moves,
    players: game.players.map((p) => ({
      seat: p.seat,
      ready: p.ready,
      ratingChange: p.ratingChange,
      ...publicUser(p.user),
    })),
  };
}
export async function readGame(id: string, userId: string) {
  const game = await db.game.findUnique({ where: { id }, include: gameInclude });
  if (!game) throw new HttpError(404, 'Комната не найдена. Проверьте ссылку.');
  return view(game, userId);
}
export async function createGame(
  userId: string,
  kind: string,
  mode: GameMode,
  difficulty: Difficulty,
) {
  const s = initialState(mode, difficulty);
  if (kind === 'ai') s.fleets[1] = randomFleet(mode);
  const game = await db.game.create({
    data: {
      kind,
      mode,
      difficulty,
      state: s as unknown as Prisma.InputJsonValue,
      players: { create: { userId, seat: 0 } },
    },
    include: gameInclude,
  });
  return view(game, userId);
}
export async function joinGame(id: string, userId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Game" WHERE id = ${id} FOR UPDATE`;
    const game = await tx.game.findUnique({ where: { id }, include: gameInclude });
    if (!game) throw new HttpError(404, 'Комната не найдена.');
    if (game.players.some((p) => p.userId === userId)) return view(game, userId);
    if (game.kind !== 'friend' && game.kind !== 'quick')
      throw new HttpError(403, 'Присоединиться к этому матчу нельзя.');
    if (game.players.length !== 1 || game.status !== 'placement')
      throw new HttpError(409, 'Комната уже занята.');
    await tx.gamePlayer.create({ data: { gameId: id, userId, seat: 1 } });
    const updated = await tx.game.update({
      where: { id },
      data: { version: { increment: 1 } },
      include: gameInclude,
    });
    return view(updated, userId);
  });
}
export async function mutateGame(
  id: string,
  userId: string,
  action: { type: 'ready'; fleet: Fleet } | { type: 'shoot'; cell: number } | { type: 'resign' },
) {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Game" WHERE id = ${id} FOR UPDATE`;
      const game = await tx.game.findUnique({ where: { id }, include: gameInclude });
      if (!game) throw new HttpError(404, 'Комната не найдена.');
      const p = game.players.find((p) => p.userId === userId);
      if (!p) throw new HttpError(403, 'Вы не участник матча.');
      let s = game.state as unknown as MatchState;
      const oldMoves = s.moves.length;
      if (action.type === 'ready') {
        if (s.status !== 'placement' || p.ready) throw new HttpError(409, 'Флот уже подтверждён.');
        if (!validateFleet(action.fleet, s.mode))
          throw new HttpError(400, 'Расстановка не соответствует правилам.');
        s.fleets[p.seat] = action.fleet;
        await tx.gamePlayer.update({ where: { id: p.id }, data: { ready: true } });
        if (
          game.kind === 'ai' ||
          (game.players.length === 2 &&
            game.players.every((other) => other.id === p.id || other.ready))
        ) {
          s.status = 'active';
          s.startedAt = Date.now();
        }
      } else if (action.type === 'resign') {
        if (s.status !== 'active')
          throw new HttpError(409, 'Матч ещё не начался или уже завершён.');
        s = { ...s, status: 'finished', winner: 1 - p.seat, finishedAt: Date.now() };
      } else {
        try {
          s = takeTurn(s, p.seat, action.cell);
        } catch (error) {
          throw new HttpError(400, error instanceof Error ? error.message : 'Недопустимый ход.');
        }
        if (game.kind === 'ai')
          while (s.status === 'active' && s.turn === 1) {
            const cell = chooseShot(
              { size: s.size, lengths: rules(s.mode).lengths, shots: s.shots[1] },
              s.difficulty,
            );
            s = takeTurn(s, 1, cell);
          }
      }
      if (s.status === 'finished') {
        const ids = game.players.map((gp) => gp.userId).sort();
        for (const uid of ids)
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${uid} FOR UPDATE`;
        const users = await tx.user.findMany({ where: { id: { in: ids } } });
        for (const gp of game.players) {
          const current = users.find((u) => u.id === gp.userId)!;
          const win = s.winner === gp.seat,
            opponent = game.players.find((o) => o.seat !== gp.seat),
            opponentUser = users.find((u) => u.id === opponent?.userId),
            change = opponentUser ? elo(current.rating, opponentUser.rating, win) : 0;
          await tx.gamePlayer.update({ where: { id: gp.id }, data: { ratingChange: change } });
          const streak = win ? current.streak + 1 : 0;
          const updated = await tx.user.update({
            where: { id: gp.userId },
            data: {
              rating: { increment: change },
              wins: { increment: win ? 1 : 0 },
              losses: { increment: win ? 0 : 1 },
              streak,
              bestStreak: Math.max(streak, current.bestStreak),
            },
          });
          const shots = s.shots[gp.seat],
            accuracy = shots.filter((h) => h.result !== 'miss').length / Math.max(1, shots.length);
          const codes = [
            ...(win ? ['first-victory'] : []),
            ...(updated.wins >= 10 ? ['ten-wins'] : []),
            ...(streak >= 3 ? ['win-streak'] : []),
            ...(win && accuracy >= 0.6 ? ['sharpshooter'] : []),
            ...(win && accuracy === 1 && shots.length ? ['perfect-game'] : []),
            ...(win && s.mode === 'blitz' ? ['blitz-champion'] : []),
          ];
          for (const code of codes)
            await tx.userAchievement.upsert({
              where: { userId_code: { userId: gp.userId, code } },
              create: { userId: gp.userId, code },
              update: {},
            });
        }
        if (game.tournamentId) {
          const loser = game.players.find((gp) => gp.seat !== s.winner);
          if (loser)
            await tx.tournamentParticipant.update({
              where: {
                tournamentId_userId: { tournamentId: game.tournamentId, userId: loser.userId },
              },
              data: { eliminated: true },
            });
        }
      }
      for (let i = oldMoves; i < s.moves.length; i++)
        await tx.gameEvent.create({
          data: {
            gameId: id,
            sequence: i,
            payload: s.moves[i] as unknown as Prisma.InputJsonValue,
          },
        });
      const updated = await tx.game.update({
        where: { id },
        data: {
          state: s as unknown as Prisma.InputJsonValue,
          status: s.status,
          version: { increment: 1 },
          finishedAt: s.finishedAt ? new Date(s.finishedAt) : null,
        },
        include: gameInclude,
      });
      return view(updated, userId);
    },
    { timeout: 15000 },
  );
}
export async function quickMatch(userId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(418729)::text`;
    const existing = await tx.game.findFirst({
      where: {
        kind: 'quick',
        status: 'placement',
        createdAt: { gte: new Date(Date.now() - 600000) },
        players: { some: { userId } },
      },
      include: gameInclude,
    });
    if (existing) return view(existing, userId);
    const rooms = await tx.game.findMany({
      where: {
        kind: 'quick',
        status: 'placement',
        createdAt: { gte: new Date(Date.now() - 600000) },
        players: { none: { userId } },
      },
      include: gameInclude,
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    const room = rooms.find((r) => r.players.length === 1);
    if (room) {
      await tx.gamePlayer.create({ data: { gameId: room.id, userId, seat: 1 } });
      return view(
        await tx.game.update({
          where: { id: room.id },
          data: { version: { increment: 1 } },
          include: gameInclude,
        }),
        userId,
      );
    }
    return view(
      await tx.game.create({
        data: {
          kind: 'quick',
          mode: 'classic',
          state: initialState('classic', 'normal') as unknown as Prisma.InputJsonValue,
          players: { create: { userId, seat: 0 } },
        },
        include: gameInclude,
      }),
      userId,
    );
  });
}
