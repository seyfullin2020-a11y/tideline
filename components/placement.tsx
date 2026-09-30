'use client';
import { useEffect, useState } from 'react';
import { RotateCw, Shuffle, Trash2, ArrowRight } from 'lucide-react';
import { canPlace, randomFleet, shipCells, validateFleet } from '../lib/game/engine';
import { Fleet, GameMode, rules } from '../lib/game/types';
import { Board } from './board';
import { useApp } from './provider';
export function Placement({
  mode,
  onReady,
  busy = false,
  initial = [],
}: {
  mode: GameMode;
  onReady: (fleet: Fleet) => void;
  busy?: boolean;
  initial?: Fleet;
}) {
  const { size, lengths } = rules(mode),
    [fleet, setFleet] = useState<Fleet>(initial),
    [selected, setSelected] = useState(0),
    [vertical, setVertical] = useState(false),
    { notify } = useApp();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && !(e.target instanceof HTMLInputElement))
        setVertical((v) => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const place = (cell: number) => {
    const existing = fleet.find((s) => s.cells.includes(cell));
    if (existing) {
      setFleet((f) => f.filter((s) => s.id !== existing.id));
      setSelected(Number(existing.id.split('-')[1]));
      return;
    }
    const without = fleet.filter((s) => s.id !== `ship-${selected}`),
      cells = shipCells(cell, lengths[selected], vertical, size);
    if (!canPlace(cells, without, size)) {
      notify('Корабль выходит за границы или касается другого корабля.');
      return;
    }
    const updated = [...without, { id: `ship-${selected}`, cells }];
    setFleet(updated);
    const next = lengths.findIndex((_, i) => !updated.some((s) => s.id === `ship-${i}`));
    if (next >= 0) setSelected(next);
  };
  return (
    <div className="placement-layout">
      <Board
        size={size}
        fleet={fleet}
        title="Мой флот"
        subtitle="FLEET DEPLOYMENT"
        onCell={place}
        disabled={busy}
      />
      <div className="panel">
        <span className="eyebrow">ПОДГОТОВКА К БОЮ</span>
        <h2 style={{ marginTop: 12 }}>Расставь свой флот.</h2>
        <p>
          Выбери корабль и нажми на стартовую клетку. Корабли не могут касаться, даже по диагонали.
          Нажми на размещённый корабль, чтобы переместить его.
        </p>
        <div className="ship-picker">
          {lengths.map((length, i) => (
            <button
              key={i}
              className={`ship-option ${selected === i ? 'selected' : ''} ${fleet.some((s) => s.id === `ship-${i}`) ? 'placed' : ''}`}
              aria-label={`Выбрать корабль ${i + 1}, длина ${length}`}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
              disabled={busy}
            >
              {Array.from({ length }, (_, j) => (
                <span key={j} />
              ))}
            </button>
          ))}
        </div>
        <div className="fleet-status">
          {fleet.length} / {lengths.length}{' '}
          <small style={{ fontSize: 11, color: 'var(--muted)' }}>кораблей на позиции</small>
        </div>
        <div className="placement-controls">
          <button
            className="button secondary"
            onClick={() => setVertical(!vertical)}
            disabled={busy}
          >
            <RotateCw size={15} />
            {vertical ? 'Вертикально' : 'Горизонтально'} · R
          </button>
          <button
            className="button secondary"
            onClick={() => setFleet(randomFleet(mode))}
            disabled={busy}
          >
            <Shuffle size={15} />
            Случайно
          </button>
          <button
            className="button secondary"
            onClick={() => {
              setFleet([]);
              setSelected(0);
            }}
            disabled={busy}
            aria-label="Очистить поле"
          >
            <Trash2 size={15} />
          </button>
        </div>
        <button
          className="button primary"
          style={{ width: '100%' }}
          disabled={busy || !validateFleet(fleet, mode)}
          onClick={() => onReady(fleet)}
        >
          {busy ? <span className="spinner" /> : 'Флот готов'}
          <ArrowRight size={16} />
        </button>
        <p style={{ marginTop: 13, fontSize: 10 }}>
          Попадание сохраняет ход. Потопи весь флот соперника, чтобы победить.
        </p>
      </div>
    </div>
  );
}
