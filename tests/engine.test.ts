import { describe, it, expect } from 'vitest';
import {
  canPlace,
  elo,
  fire,
  isDefeated,
  randomFleet,
  shipCells,
  takeTurn,
  validateFleet,
} from '../lib/game/engine';
import { chooseShot, probabilityMap } from '../lib/game/ai';
import { analyze } from '../lib/game/trainer';
import { Difficulty, MatchState, Shot, rules } from '../lib/game/types';
describe('placement', () => {
  it('prevents wrapping and out-of-range coordinates', () => {
    expect(shipCells(9, 2, false, 10)).toEqual([]);
    expect(shipCells(90, 2, true, 10)).toEqual([]);
    expect(shipCells(-1, 1, false, 10)).toEqual([]);
    expect(shipCells(8, 2, false, 10)).toEqual([8, 9]);
  });
  it('forbids overlap and diagonal touching', () => {
    const fleet = [{ id: 'a', cells: [22, 23] }];
    expect(canPlace([23], fleet, 10)).toBe(false);
    expect(canPlace([12], fleet, 10)).toBe(false);
    expect(canPlace([14], fleet, 10)).toBe(false);
    expect(canPlace([26], fleet, 10)).toBe(true);
  });
  it('generates complete valid fleets in both modes', () => {
    for (const mode of ['classic', 'blitz'] as const)
      for (let i = 0; i < 150; i++) expect(validateFleet(randomFleet(mode), mode)).toBe(true);
  });
  it('rejects duplicate ids, bent ships and wrong fleet composition', () => {
    const fleet = randomFleet('classic');
    expect(
      validateFleet([...fleet.slice(0, -1), { ...fleet.at(-1)!, id: fleet[0].id }], 'classic'),
    ).toBe(false);
    expect(validateFleet([{ id: 'a', cells: [0, 1, 11] }], 'classic')).toBe(false);
    expect(validateFleet([], 'classic')).toBe(false);
  });
});
describe('shots and turns', () => {
  const fleet = [{ id: 'a', cells: [0, 1] }];
  it('resolves miss, hit and sunk without mutating input', () => {
    const shots: Shot[] = [];
    expect(fire(fleet, shots, 5, 10).result).toBe('miss');
    const hit = fire(fleet, shots, 0, 10);
    expect(hit.result).toBe('hit');
    expect(fire(fleet, [hit], 1, 10)).toMatchObject({
      result: 'sunk',
      sunkCells: [0, 1],
      shipLength: 2,
    });
    expect(shots).toEqual([]);
  });
  it('rejects repeated shots and invalid coordinates', () => {
    expect(() => fire(fleet, [{ cell: 0, result: 'hit' }], 0, 10)).toThrow();
    expect(() => fire(fleet, [], 100, 10)).toThrow();
    expect(() => fire(fleet, [], 0.5, 10)).toThrow();
  });
  it('wins only after the entire fleet is destroyed', () => {
    expect(isDefeated(fleet, [{ cell: 0, result: 'hit' }])).toBe(false);
    expect(
      isDefeated(fleet, [
        { cell: 0, result: 'hit' },
        { cell: 1, result: 'sunk' },
      ]),
    ).toBe(true);
  });
  it('preserves turn on hit, changes on miss and rejects wrong turn', () => {
    const s: MatchState = {
      id: 't',
      mode: 'classic',
      difficulty: 'normal',
      size: 10,
      fleets: [fleet, fleet],
      shots: [[], []],
      moves: [],
      turn: 0,
      status: 'active',
      winner: null,
      startedAt: 0,
    };
    const hit = takeTurn(s, 0, 0, 1);
    expect(hit.turn).toBe(0);
    expect(takeTurn(hit, 0, 1, 2)).toMatchObject({ status: 'finished', winner: 0, finishedAt: 2 });
    const miss = takeTurn(s, 0, 5, 1);
    expect(miss.turn).toBe(1);
    expect(() => takeTurn(miss, 0, 6)).toThrow();
    expect(s.moves).toEqual([]);
  });
});
describe('honest AI', () => {
  it('uses only knowledge and never repeats a shot at any difficulty', () => {
    for (const difficulty of ['easy', 'normal', 'hard', 'expert'] as Difficulty[]) {
      const shots: Shot[] = [];
      for (let i = 0; i < 49; i++) {
        const cell = chooseShot({ size: 7, lengths: [3, 2, 2, 1, 1], shots }, difficulty);
        expect(shots.some((s) => s.cell === cell)).toBe(false);
        shots.push({ cell, result: 'miss' });
      }
    }
  });
  it('targets neighbors after a hit', () => {
    for (const difficulty of ['normal', 'hard', 'expert'] as Difficulty[])
      expect([34, 43, 45, 54]).toContain(
        chooseShot(
          { size: 10, lengths: [4, 3, 2, 1], shots: [{ cell: 44, result: 'hit' }] },
          difficulty,
        ),
      );
  });
  it('excludes sunk ships and their surroundings', () => {
    const k = {
      size: 10,
      lengths: [2, 1],
      shots: [{ cell: 44, result: 'sunk' as const, sunkCells: [44], shipLength: 1 }],
    };
    const scores = probabilityMap(k);
    for (const c of [33, 34, 35, 43, 44, 45, 53, 54, 55]) expect(scores[c]).toBe(0);
  });
  it('finishes a complete autonomous match without cheating', () => {
    for (const difficulty of ['easy', 'normal', 'hard', 'expert'] as Difficulty[]) {
      const s: MatchState = {
        id: 'sim',
        mode: 'blitz',
        difficulty,
        size: 7,
        fleets: [randomFleet('blitz'), randomFleet('blitz')],
        shots: [[], []],
        moves: [],
        turn: 0,
        status: 'active',
        winner: null,
        startedAt: 0,
      };
      let game = s;
      while (game.status === 'active') {
        const player = game.turn,
          cell = chooseShot(
            { size: 7, lengths: rules('blitz').lengths, shots: game.shots[player] },
            difficulty,
          );
        game = takeTurn(game, player, cell);
      }
      expect(game.moves.length).toBeLessThanOrEqual(98);
      expect(game.winner).not.toBeNull();
    }
  });
});
describe('rating and trainer', () => {
  it('calculates symmetric Elo changes', () => {
    expect(elo(1000, 1000, true)).toBe(16);
    expect(elo(1000, 1000, false)).toBe(-16);
    expect(elo(1200, 1000, true)).toBeLessThan(16);
    expect(elo(1000, 1200, true)).toBeGreaterThan(16);
  });
  it('derives accuracy and recommendations from actual moves', () => {
    const analysis = analyze(
      [
        { cell: 44, result: 'hit', player: 0, time: 0 },
        { cell: 80, result: 'miss', player: 0, time: 1 },
      ],
      0,
      'classic',
    );
    expect(analysis.accuracy).toBe(50);
    expect(analysis.recommendations[0]).toContain('После попадания');
    expect(analyze([], 0, 'blitz').shots).toBe(0);
  });
});
