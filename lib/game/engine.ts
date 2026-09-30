import { Fleet, GameMode, MatchState, Ship, Shot, rules } from './types';
export function neighbors(cell: number, size: number, diagonal = false): number[] {
  const x = cell % size,
    y = Math.floor(cell / size),
    result: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (
        (dx || dy) &&
        (diagonal || !dx || !dy) &&
        x + dx >= 0 &&
        x + dx < size &&
        y + dy >= 0 &&
        y + dy < size
      )
        result.push((y + dy) * size + x + dx);
  return result;
}
export function shipCells(
  start: number,
  length: number,
  vertical: boolean,
  size: number,
): number[] {
  if (
    !Number.isInteger(start) ||
    start < 0 ||
    start >= size * size ||
    (vertical ? Math.floor(start / size) + length > size : (start % size) + length > size)
  )
    return [];
  return Array.from({ length }, (_, i) => start + i * (vertical ? size : 1));
}
export function canPlace(cells: number[], fleet: Fleet, size: number): boolean {
  if (
    !cells.length ||
    new Set(cells).size !== cells.length ||
    cells.some((c) => !Number.isInteger(c) || c < 0 || c >= size * size)
  )
    return false;
  const blocked = new Set(
    fleet.flatMap((s) => s.cells.flatMap((c) => [c, ...neighbors(c, size, true)])),
  );
  return cells.every((c) => !blocked.has(c));
}
export function validateFleet(fleet: Fleet, mode: GameMode): boolean {
  const { size, lengths } = rules(mode);
  if (
    fleet.length !== lengths.length ||
    new Set(fleet.map((s) => s.id)).size !== fleet.length ||
    [...fleet.map((s) => s.cells.length)].sort().join() !== [...lengths].sort().join()
  )
    return false;
  const placed: Fleet = [];
  for (const ship of fleet) {
    const cells = [...ship.cells].sort((a, b) => a - b),
      vertical = cells.length > 1 && cells[1] - cells[0] === size;
    if (
      shipCells(cells[0], cells.length, vertical, size).join() !== cells.join() ||
      !canPlace(cells, placed, size)
    )
      return false;
    placed.push(ship);
  }
  return true;
}
export function randomFleet(mode: GameMode, rng = Math.random): Fleet {
  const { size, lengths } = rules(mode);
  for (let retry = 0; retry < 1000; retry++) {
    const fleet: Fleet = [];
    for (let i = 0; i < lengths.length; i++) {
      let added = false;
      for (let attempt = 0; attempt < 300; attempt++) {
        const cells = shipCells(Math.floor(rng() * size * size), lengths[i], rng() < 0.5, size);
        if (canPlace(cells, fleet, size)) {
          fleet.push({ id: `ship-${i}`, cells });
          added = true;
          break;
        }
      }
      if (!added) break;
    }
    if (fleet.length === lengths.length) return fleet;
  }
  throw new Error('Не удалось расставить флот. Попробуйте ещё раз.');
}
export function fire(fleet: Fleet, shots: Shot[], cell: number, size: number): Shot {
  if (!Number.isInteger(cell) || cell < 0 || cell >= size * size)
    throw new Error('Клетка за границами поля.');
  if (shots.some((s) => s.cell === cell)) throw new Error('В эту клетку уже стреляли.');
  const ship = fleet.find((s) => s.cells.includes(cell));
  if (!ship) return { cell, result: 'miss' };
  const sunk = ship.cells.every(
    (c) => c === cell || shots.some((s) => s.cell === c && s.result !== 'miss'),
  );
  return sunk
    ? { cell, result: 'sunk', sunkCells: [...ship.cells], shipLength: ship.cells.length }
    : { cell, result: 'hit' };
}
export function isDefeated(fleet: Fleet, shots: Shot[]): boolean {
  return (
    fleet.length > 0 &&
    fleet.every((s) =>
      s.cells.every((c) => shots.some((shot) => shot.cell === c && shot.result !== 'miss')),
    )
  );
}
export function takeTurn(
  state: MatchState,
  player: number,
  cell: number,
  now = Date.now(),
): MatchState {
  if (state.status !== 'active' || state.turn !== player) throw new Error('Сейчас не ваш ход.');
  const shot = fire(state.fleets[1 - player], state.shots[player], cell, state.size);
  const shots = state.shots.map((s, i) => (i === player ? [...s, shot] : s));
  const won = isDefeated(state.fleets[1 - player], shots[player]);
  return {
    ...state,
    shots,
    moves: [...state.moves, { ...shot, player, time: now }],
    turn: shot.result === 'miss' ? 1 - player : player,
    status: won ? 'finished' : 'active',
    winner: won ? player : null,
    ...(won ? { finishedAt: now } : {}),
  };
}
export function sunkShips(fleet: Fleet, shots: Shot[]): Ship[] {
  return fleet.filter((s) =>
    s.cells.every((c) => shots.some((h) => h.cell === c && h.result !== 'miss')),
  );
}
export function elo(a: number, b: number, win: boolean): number {
  return Math.round(32 * ((win ? 1 : 0) - 1 / (1 + 10 ** ((b - a) / 400))));
}
