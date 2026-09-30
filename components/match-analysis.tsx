'use client';
import { analyze } from '../lib/game/trainer';
import { GameMode, Move } from '../lib/game/types';
export function MatchAnalysis({
  moves,
  seat,
  mode,
}: {
  moves: Move[];
  seat: number;
  mode: GameMode;
}) {
  const analysis = analyze(moves, seat, mode),
    size = mode === 'blitz' ? 7 : 10;
  const coord = (cell: number) =>
    `${String.fromCharCode(65 + (cell % size))}${Math.floor(cell / size) + 1}`;
  return (
    <div className="analysis-grid">
      <div className="panel">
        <span className="eyebrow">MATCH INTELLIGENCE</span>
        <h2 style={{ marginTop: 10 }}>Разбор твоей стратегии</h2>
        <p>
          <strong style={{ color: 'var(--accent)', fontSize: 25 }}>{analysis.accuracy}%</strong>{' '}
          точность · {analysis.hits} попаданий из {analysis.shots}
        </p>
        <p>
          Паттерн поиска: <strong>{analysis.searchPattern}</strong>
        </p>
        {analysis.best && (
          <p>
            Лучший информационный выбор: ход {analysis.best.turn}, {coord(analysis.best.cell)}.
            Вероятность этой клетки составляла {Math.round(analysis.best.score * 100)}% от
            максимальной на тот момент.
          </p>
        )}
        {analysis.missed && (
          <p>
            Упущенная возможность: на ходу {analysis.missed.turn} клетка{' '}
            {coord(analysis.missed.suggestion)} была информативнее, чем{' '}
            {coord(analysis.missed.cell)}.
          </p>
        )}
      </div>
      <div className="panel">
        <h2>На следующую партию</h2>
        {analysis.recommendations.map((r, i) => (
          <p key={r}>
            <span style={{ color: 'var(--accent)', marginRight: 8 }}>0{i + 1}</span>
            {r}
          </p>
        ))}
        <p style={{ fontSize: 10, marginTop: 20 }}>
          Анализ использует только информацию, доступную до каждого выстрела. Хороший выбор может
          оказаться промахом.
        </p>
      </div>
    </div>
  );
}
