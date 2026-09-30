'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrainCircuit, Users, Radio, ArrowRight } from 'lucide-react';
import { useApp } from '../../components/provider';
import { api } from '../../lib/client';
import { Difficulty, GameMode } from '../../lib/game/types';
export default function Play() {
  const [kind, setKind] = useState('ai'),
    [mode, setMode] = useState<GameMode>('classic'),
    [difficulty, setDifficulty] = useState<Difficulty>('normal'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [resume, setResume] = useState(false),
    { user, pro, authLoading } = useApp(),
    router = useRouter();
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (['ai', 'friend', 'quick'].includes(q.get('kind') ?? '')) setKind(q.get('kind')!);
    if (q.get('mode') === 'blitz') setMode('blitz');
    try {
      const save = JSON.parse(localStorage.getItem('tideline-match') ?? 'null');
      setResume(save?.status === 'active');
    } catch {}
  }, []);
  const start = async () => {
    setBusy(true);
    setError('');
    try {
      if (kind === 'ai' && !user) {
        if (difficulty === 'expert' && !pro)
          throw new Error('Активируйте бесплатный Demo PRO, чтобы играть с Expert AI.');
        router.push(`/game/local?mode=${mode}&difficulty=${difficulty}&new=1`);
      } else {
        if (!user) {
          router.push('/login?next=' + encodeURIComponent(`/play?kind=${kind}`));
          return;
        }
        const match = await api<{ id: string }>('/api/games', { kind, mode, difficulty });
        router.push(`/game/${match.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page">
      <span className="eyebrow">MISSION CONTROL</span>
      <h1 className="page-title">Выбери свой следующий ход.</h1>
      <p className="page-subtitle">Твой флот. Твоя стратегия. Твои правила победы.</p>
      {resume && (
        <div className="notice">
          У тебя есть незавершённая локальная партия.{' '}
          <Link
            className="text-link"
            style={{ color: 'var(--accent)', marginLeft: 12 }}
            href="/game/local"
          >
            Продолжить →
          </Link>
        </div>
      )}
      <div className="mode-picker">
        {[
          {
            id: 'ai',
            icon: BrainCircuit,
            title: 'Против компьютера',
            description: 'Четыре уровня. Никакого подглядывания.',
          },
          {
            id: 'friend',
            icon: Users,
            title: 'С другом по ссылке',
            description: 'Приватная комната и синхронные ходы.',
          },
          {
            id: 'quick',
            icon: Radio,
            title: 'Быстрый поиск',
            description: 'Найди реального соперника в очереди.',
          },
        ].map((m) => (
          <button
            key={m.id}
            className={`choice ${kind === m.id ? 'selected' : ''}`}
            onClick={() => setKind(m.id)}
            aria-pressed={kind === m.id}
          >
            <m.icon size={25} />
            <strong>{m.title}</strong>
            <small>{m.description}</small>
          </button>
        ))}
      </div>
      <div className="play-options">
        <div className="panel">
          <h3>Формат матча</h3>
          <div className="segmented">
            {(['classic', 'blitz'] as const).map((m) => (
              <button
                key={m}
                className={mode === m ? 'selected' : ''}
                onClick={() => setMode(m)}
                disabled={kind === 'quick'}
              >
                {m === 'classic' ? 'Classic · 10 × 10' : 'Blitz · 7 × 7'}
              </button>
            ))}
          </div>
          <p style={{ marginTop: 12 }}>
            {kind === 'quick'
              ? 'Рейтинговый поиск использует классическое поле.'
              : mode === 'blitz'
                ? '5 кораблей, 9 палуб. Короткий матч между занятиями.'
                : '10 кораблей, 20 палуб. Классическая морская стратегия.'}
          </p>
        </div>
        <div className="panel">
          <h3>{kind === 'ai' ? 'Уровень AI' : 'Как это работает'}</h3>
          {kind === 'ai' ? (
            <>
              <div className="segmented">
                {(['easy', 'normal', 'hard', 'expert'] as const).map((d) => (
                  <button
                    key={d}
                    className={difficulty === d ? 'selected' : ''}
                    onClick={() => setDifficulty(d)}
                  >
                    {d.toUpperCase()}
                    {d === 'expert' ? ' · PRO' : ''}
                  </button>
                ))}
              </div>
              <p style={{ marginTop: 12 }}>
                {difficulty === 'easy'
                  ? 'Случайные выстрелы. Подойдёт для первой партии.'
                  : difficulty === 'normal'
                    ? 'Ищет соседние клетки после попадания.'
                    : difficulty === 'hard'
                      ? 'Шахматный поиск и вероятностное добивание.'
                      : 'Оценивает все допустимые положения оставшихся кораблей.'}
              </p>
            </>
          ) : (
            <p>
              Войди в аккаунт.{' '}
              {kind === 'friend'
                ? 'Создай комнату, скопируй ссылку и отправь другу.'
                : 'Начни поиск. Матч запустится, когда оба игрока расставят флот.'}{' '}
              Ходы и флот сохраняются на сервере.
            </p>
          )}
        </div>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <button className="button primary" disabled={busy || authLoading} onClick={() => void start()}>
        {busy ? (
          <span className="spinner" />
        ) : kind === 'ai' ? (
          'Расставить флот'
        ) : kind === 'friend' ? (
          'Создать комнату'
        ) : (
          'Найти соперника'
        )}
        <ArrowRight size={17} />
      </button>
      <Link href="/pro" className="text-link" style={{ marginLeft: 20 }}>
        Открыть Demo PRO
      </Link>
    </main>
  );
}
