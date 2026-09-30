export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';
export type GameMode = 'classic' | 'blitz';
export type Ship = { id: string; cells: number[] };
export type Shot = {
  cell: number;
  result: 'miss' | 'hit' | 'sunk';
  sunkCells?: number[];
  shipLength?: number;
};
export type Move = Shot & { player: number; time: number };
export type Fleet = Ship[];
export type Knowledge = { size: number; shots: Shot[]; lengths: number[] };
export type MatchState = {
  id: string;
  mode: GameMode;
  difficulty: Difficulty;
  size: number;
  fleets: Fleet[];
  shots: Shot[][];
  moves: Move[];
  turn: number;
  status: 'placement' | 'active' | 'finished';
  winner: number | null;
  startedAt: number;
  finishedAt?: number;
};
export const rules = (mode: GameMode) =>
  mode === 'blitz'
    ? { size: 7, lengths: [3, 2, 2, 1, 1] }
    : { size: 10, lengths: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1] };
