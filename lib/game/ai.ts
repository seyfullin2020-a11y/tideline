import { neighbors, shipCells } from './engine';
import { Difficulty, Knowledge } from './types';
export function probabilityMap(k: Knowledge): number[] {
  const scores = Array<number>(k.size * k.size).fill(0),
    fired = new Set(k.shots.map((s) => s.cell));
  const sunk = new Set(k.shots.flatMap((s) => s.sunkCells ?? []));
  const blocked = new Set(k.shots.filter((s) => s.result === 'miss').map((s) => s.cell));
  for (const c of sunk) for (const n of [c, ...neighbors(c, k.size, true)]) blocked.add(n);
  const hits = k.shots.filter((s) => s.result === 'hit' && !sunk.has(s.cell)).map((s) => s.cell);
  const remaining = [...k.lengths];
  for (const s of k.shots.filter((s) => s.result === 'sunk')) {
    const i = remaining.indexOf(s.shipLength ?? 0);
    if (i >= 0) remaining.splice(i, 1);
  }
  for (const length of remaining)
    for (let start = 0; start < k.size * k.size; start++)
      for (const vertical of [false, true]) {
        const cells = shipCells(start, length, vertical, k.size);
        if (!cells.length || cells.some((c) => blocked.has(c))) continue;
        if (hits.length && !hits.some((h) => cells.includes(h))) continue;
        const weight = 1 + cells.filter((c) => hits.includes(c)).length * 20;
        for (const c of cells) if (!fired.has(c)) scores[c] += weight;
      }
  return scores;
}
export function chooseShot(k: Knowledge, difficulty: Difficulty, rng = Math.random): number {
  const fired = new Set(k.shots.map((s) => s.cell));
  let available = Array.from({ length: k.size * k.size }, (_, i) => i).filter((c) => !fired.has(c));
  if (!available.length) throw new Error('Нет доступных клеток.');
  if (difficulty === 'easy') return available[Math.floor(rng() * available.length)];
  const sunk = new Set(k.shots.flatMap((s) => s.sunkCells ?? []));
  const forbidden = new Set([...sunk].flatMap((c) => neighbors(c, k.size, true)));
  available = available.filter((c) => !forbidden.has(c));
  if (!available.length)
    available = Array.from({ length: k.size * k.size }, (_, i) => i).filter((c) => !fired.has(c));
  const hits = k.shots.filter((s) => s.result === 'hit' && !sunk.has(s.cell)).map((s) => s.cell);
  const targets = available.filter((c) => hits.some((h) => neighbors(h, k.size).includes(c)));
  if (difficulty === 'normal')
    return (targets.length ? targets : available)[
      Math.floor(rng() * (targets.length || available.length))
    ];
  const scores = probabilityMap(k);
  const candidates = hits.length && targets.length ? targets : available;
  if (difficulty === 'hard' && !hits.length) {
    const parity = candidates.filter(
      (c) => ((c % k.size) + Math.floor(c / k.size)) % 2 === 0 && scores[c] > 0,
    );
    if (parity.length) return parity[Math.floor(rng() * parity.length)];
  }
  const best = Math.max(...candidates.map((c) => scores[c])),
    top = candidates.filter((c) => scores[c] === best);
  return top[Math.floor(rng() * top.length)];
}
