'use client';
import { CSSProperties } from 'react';
import { Fleet, Shot } from '../lib/game/types';
import { neighbors } from '../lib/game/engine';
export function Board({
  size,
  fleet = [],
  shots = [],
  onCell,
  disabled = false,
  title,
  subtitle,
  hidden = false,
  lastCell,
}: {
  size: number;
  fleet?: Fleet;
  shots?: Shot[];
  onCell?: (cell: number) => void;
  disabled?: boolean;
  title: string;
  subtitle?: string;
  hidden?: boolean;
  lastCell?: number;
}) {
  const sunk = new Set(shots.flatMap((s) => s.sunkCells ?? [])),
    inferred = new Set([...sunk].flatMap((c) => neighbors(c, size, true)));
  const byCell = new Map(shots.map((s) => [s.cell, s]));
  return (
    <section
      className={`board-container ${hidden ? 'mobile-hidden' : ''}`}
      style={{ '--size': size } as CSSProperties}
    >
      <div className="board-title">
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className="board-coordinates">
        <span />
        {Array.from({ length: size }, (_, i) => (
          <span key={i}>{String.fromCharCode(65 + i)}</span>
        ))}
      </div>
      <div className="board-body">
        <div className="board-rows">
          {Array.from({ length: size }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <div className="board-grid" role="group" aria-label={title}>
          {Array.from({ length: size * size }, (_, cell) => {
            const shot = byCell.get(cell),
              vessel = fleet.some((s) => s.cells.includes(cell)),
              isSunk = sunk.has(cell),
              isInferred = !shot && inferred.has(cell),
              label = `${String.fromCharCode(65 + (cell % size))}${Math.floor(cell / size) + 1}`;
            return (
              <button
                key={cell}
                aria-label={`${label}: ${isSunk ? 'потоплен' : shot?.result === 'hit' ? 'попадание' : shot ? 'промах' : vessel ? 'корабль' : isInferred ? 'пустая клетка' : 'неизвестно'}`}
                className={`cell ${vessel ? 'ship' : ''} ${isSunk ? 'sunk' : (shot?.result ?? '')} ${isInferred ? 'miss inferred' : ''} ${lastCell === cell ? 'last-shot' : ''}`}
                disabled={disabled || !onCell || !!shot || isInferred}
                onClick={() => onCell?.(cell)}
              >
                {isSunk || shot?.result === 'hit' ? (
                  '×'
                ) : shot || isInferred ? (
                  '•'
                ) : vessel ? (
                  <span
                    style={{
                      width: '45%',
                      height: '45%',
                      border: '1px solid var(--accent)',
                      borderRadius: 2,
                      opacity: 0.6,
                    }}
                  />
                ) : (
                  ''
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="board-legend">
        <span>
          <i className="legend-dot" />
          Флот
        </span>
        <span>
          <i className="legend-dot hit" />
          Попадание
        </span>
        <span>
          <i className="legend-dot miss" />
          Промах
        </span>
      </div>
    </section>
  );
}
