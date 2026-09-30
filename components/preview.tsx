'use client';
import { Crosshair, Radio, ShieldCheck } from 'lucide-react';
export function Preview() {
  const ships = [
      { cells: [20, 21, 22, 23], type: 'carrier' },
      { cells: [47, 57, 67], type: 'frigate' },
      { cells: [73, 74], type: 'destroyer' },
      { cells: [15], type: 'scout' },
    ],
    hits = [47, 57, 35],
    misses = [4, 12, 32, 55, 83, 91];
  return (
    <div className="preview-wrap">
      <div className="preview-top">
        <span className="live-dot" /> GAMEPLAY PREVIEW{' '}
        <span className="preview-match">CLASSIC / 10 × 10</span>
        <Radio size={15} />
      </div>
      <div className="preview-title">
        <div>
          <span className="eyebrow">TACTICAL OVERVIEW</span>
          <h3>Каждый ход имеет значение.</h3>
        </div>
        <Crosshair size={23} />
      </div>
      <div className="preview-coordinate">
        <span />
        {'ABCDEFGHIJ'.split('').map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <div className="preview-main">
        <div className="preview-rows">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <div className="preview-grid">
          {Array.from({ length: 100 }, (_, i) => (
            <div
              key={i}
              className={`preview-cell ${ships.some((s) => s.cells.includes(i)) ? 'vessel' : ''} ${hits.includes(i) ? 'hit' : ''} ${misses.includes(i) ? 'miss' : ''}`}
            >
              {hits.includes(i) ? '×' : misses.includes(i) ? '•' : ''}
            </div>
          ))}
          <div className="target-ring" />
        </div>
      </div>
      <div className="preview-bottom">
        <div>
          <ShieldCheck size={17} />
          <span>FLEET IN POSITION</span>
        </div>
        <span>
          07 / 10 <small>SHIPS</small>
        </span>
      </div>
      <div className="floating-signal">
        <div className="signal-icon">
          <Crosshair size={22} />
        </div>
        <div>
          <strong>Прямое попадание</strong>
          <span>Координаты H6 · цель обнаружена</span>
        </div>
        <span className="signal-plus">+ HIT</span>
      </div>
    </div>
  );
}
