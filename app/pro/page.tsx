'use client';
import { Check, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useApp } from '../../components/provider';
export default function Pro() {
  const { pro, upgrade, authLoading } = useApp(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <main className="page">
      <div style={{ textAlign: 'center' }}>
        <span className="eyebrow">MORE INSIGHT. BETTER MOVES.</span>
        <h1 className="page-title">Играй глубже с TIDELINE PRO.</h1>
        <p className="page-subtitle">Демонстрация подписки. Без банковских карт и списаний.</p>
      </div>
      <div className="pro-grid">
        <div className="panel">
          <span className="pill">ТВОЙ ПЕРВЫЙ КУРС</span>
          <h2 style={{ marginTop: 20 }}>Free</h2>
          <div className="pro-price">
            0 ₸ <small>навсегда</small>
          </div>
          <ul>
            {[
              'Classic и Blitz',
              'Easy, Normal и Hard AI',
              'Друзья и multiplayer',
              'Рейтинг и базовая статистика',
              'Базовый анализ партии',
            ].map((f) => (
              <li key={f}>
                <Check />
                {f}
              </li>
            ))}
          </ul>
          <Link className="button secondary" href="/play">
            Начать игру
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="panel pro-panel">
          <span className="pill cyan">ДЕМО ПОДПИСКА</span>
          <h2 style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap color="var(--accent)" size={20} />
            PRO
          </h2>
          <div className="pro-price">
            990 ₸ <small>/ месяц · концепция цены</small>
          </div>
          <ul>
            {[
              'Всё из Free',
              'Вероятностный Expert AI',
              'Replay с каждым ходом',
              'Расширенная статистика',
              'Три темы: Ocean, Tactical, Arctic',
            ].map((f) => (
              <li key={f}>
                <Check />
                {f}
              </li>
            ))}
          </ul>
          <button
            className="button primary"
            disabled={busy || pro || authLoading}
            onClick={async () => {
              setBusy(true);
              try {
                await upgrade();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Ошибка.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <span className="spinner" /> : pro ? 'PRO активирован ✓' : 'Demo Upgrade'}
            {!pro && <ArrowRight size={16} />}
          </button>
          {error && <div className="notice error">{error}</div>}
        </div>
      </div>
      <p className="page-subtitle" style={{ textAlign: 'center' }}>
        Для гостя PRO сохраняется на этом устройстве. Для аккаунта — в базе данных.
      </p>
    </main>
  );
}
