import { probabilityMap } from './ai';
import { neighbors } from './engine';
import { Move, rules, GameMode } from './types';
export function analyze(moves: Move[], player: number, mode: GameMode) {
  const own = moves.filter((m) => m.player === player),
    hits = own.filter((m) => m.result !== 'miss').length;
  const { size, lengths } = rules(mode);
  let best: { turn: number; cell: number; score: number } | null = null,
    missed: { turn: number; cell: number; suggestion: number } | null = null,
    followed = 0,
    opportunities = 0;
  for (let i = 0; i < own.length; i++) {
    const m = own[i];
    const previous = own.slice(0, i),
      scores = probabilityMap({ size, lengths, shots: previous }),
      max = Math.max(...scores);
    if (max > 0 && (!best || scores[m.cell] / max > best.score))
      best = { turn: moves.indexOf(m) + 1, cell: m.cell, score: scores[m.cell] / max };
    if (i > 3 && max > 0 && scores[m.cell] < max * 0.35 && !missed)
      missed = { turn: moves.indexOf(m) + 1, cell: m.cell, suggestion: scores.indexOf(max) };
    const last = previous.at(-1);
    if (last?.result === 'hit') {
      opportunities++;
      if (neighbors(last.cell, size).includes(m.cell)) followed++;
    }
  }
  const parity = own.filter((m) => ((m.cell % size) + Math.floor(m.cell / size)) % 2 === 0).length;
  const recommendations: string[] = [];
  if (opportunities && followed / opportunities < 0.7)
    recommendations.push(
      'После попадания проверяйте соседние клетки и продолжайте вдоль найденного корабля.',
    );
  if (missed)
    recommendations.push(
      'Вы выбирали клетки с низкой вероятностью. Учитывайте промахи и длины оставшихся кораблей.',
    );
  if (own.length > 15 && parity / own.length > 0.35 && parity / own.length < 0.65)
    recommendations.push(
      'В начале поиска используйте шахматный паттерн, затем проверьте оставшиеся одиночные корабли.',
    );
  if (!recommendations.length)
    recommendations.push(
      own.length
        ? 'Вы последовательно использовали доступную информацию. Сохраняйте этот подход в следующем матче.'
        : 'Завершите партию, чтобы получить персональные рекомендации.',
    );
  return {
    accuracy: own.length ? Math.round((hits / own.length) * 100) : 0,
    shots: own.length,
    hits,
    best,
    missed,
    searchPattern: parity / Math.max(1, own.length) > 0.7 ? 'Шахматный' : 'Свободный поиск',
    recommendations,
  };
}
