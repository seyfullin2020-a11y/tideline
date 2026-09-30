'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  Share2,
  Volume2,
  VolumeX,
  Flag,
  Trophy,
  ArrowRight,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { api, User } from '../lib/client';
import { chooseShot } from '../lib/game/ai';
import { randomFleet, takeTurn } from '../lib/game/engine';
import { Difficulty, Fleet, GameMode, MatchState, Move, Shot, rules } from '../lib/game/types';
import { analyze } from '../lib/game/trainer';
import { useApp } from './provider';
import { Board } from './board';
import { Placement } from './placement';
import { MatchAnalysis } from './match-analysis';
export type VisibleGame = {
  id: string;
  kind: string;
  mode: GameMode;
  difficulty: Difficulty;
  version: number;
  seat: number;
  status: MatchState['status'];
  size: number;
  turn: number;
  winner: number | null;
  startedAt: number;
  finishedAt?: number;
  myFleet: Fleet;
  myShots: Shot[];
  enemyShots: Shot[];
  moves: Move[];
  players: (User & { seat: number; ready: boolean; ratingChange: number })[];
};
function localView(s: MatchState): VisibleGame {
  return {
    id: s.id,
    kind: 'ai',
    mode: s.mode,
    difficulty: s.difficulty,
    version: s.moves.length,
    seat: 0,
    status: s.status,
    size: s.size,
    turn: s.turn,
    winner: s.winner,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    myFleet: s.fleets[0],
    myShots: s.shots[0],
    enemyShots: s.shots[1],
    moves: s.moves,
    players: [],
  };
}
function saveMatch(s: MatchState) {
  localStorage.setItem('tideline-match', JSON.stringify(s));
  if (s.status === 'finished') {
    const history: MatchState[] = JSON.parse(localStorage.getItem('tideline-history') ?? '[]');
    localStorage.setItem(
      'tideline-history',
      JSON.stringify([s, ...history.filter((g) => g.id !== s.id)].slice(0, 100)),
    );
  }
}
export function GameScreen({ id }: { id: string }) {
  const local = id === 'local',
    { user, pro, notify, sound, setSound, beep } = useApp();
  const [game, setGame] = useState<VisibleGame | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [connection, setConnection] = useState('connecting'),
    [tab, setTab] = useState('enemy'),
    [showAnalysis, setShowAnalysis] = useState(false),
    [replay, setReplay] = useState<number | null>(null),
    [playing, setPlaying] = useState(false),
    [tick, setTick] = useState(() => Date.now());
  const localState = useRef<MatchState | null>(null),
    initializing = useRef(false),
    lastVersion = useRef(-1),
    previousPlayers = useRef(0),
    previousStatus = useRef(''),
    previousOpponentOnline = useRef<boolean | null>(null),
    connectionRef = useRef('connecting');
  const update = useCallback(
    (g: VisibleGame) => {
      if (g.version < lastVersion.current) return;
      lastVersion.current = g.version;
      setGame(g);
      const online = g.players.find((p) => p.seat !== g.seat)?.online;
      if (online === false && previousOpponentOnline.current === true)
        notify('Соперник отключился. Матч сохранён; ждём возвращения.');
      if (online === true && previousOpponentOnline.current === false)
        notify('Соперник снова в сети.');
      if (online !== undefined) previousOpponentOnline.current = online;
      if (previousPlayers.current === 1 && g.players.length === 2)
        notify('Соперник присоединился.');
      if (previousStatus.current === 'placement' && g.status === 'active')
        notify('Матч начался. Удачи, капитан.');
      if (previousStatus.current === 'active' && g.status === 'finished')
        notify(
          g.winner === g.seat ? 'Победа! Флот соперника уничтожен.' : 'Матч завершён. Сыграем ещё?',
        );
      previousPlayers.current = g.players.length;
      previousStatus.current = g.status;
    },
    [notify],
  );
  useEffect(() => {
    if (!local) return;
    const q = new URLSearchParams(window.location.search);
    try {
      let stored: MatchState | null = JSON.parse(localStorage.getItem('tideline-match') ?? 'null');
      if (q.get('new') === '1' || !stored) {
        const mode: GameMode = q.get('mode') === 'blitz' ? 'blitz' : 'classic',
          difficulty: Difficulty = ['easy', 'normal', 'hard', 'expert'].includes(
            q.get('difficulty') ?? '',
          )
            ? (q.get('difficulty') as Difficulty)
            : 'normal';
        stored = {
          id: crypto.randomUUID(),
          mode,
          difficulty,
          size: rules(mode).size,
          fleets: [[], randomFleet(mode)],
          shots: [[], []],
          moves: [],
          turn: 0,
          status: 'placement',
          winner: null,
          startedAt: Date.now(),
        };
        saveMatch(stored);
        window.history.replaceState(null, '', '/game/local');
      }
      while (stored.status === 'active' && stored.turn === 1) {
        stored = takeTurn(
          stored,
          1,
          chooseShot(
            { size: stored.size, lengths: rules(stored.mode).lengths, shots: stored.shots[1] },
            stored.difficulty,
          ),
        );
      }
      saveMatch(stored);
      localState.current = stored;
      update(localView(stored));
      setConnection('connected');
    } catch {
      localStorage.removeItem('tideline-match');
      setError('Сохранение повреждено. Создайте новую партию.');
    }
  }, [local, update]);
  useEffect(() => {
    if (local || initializing.current) return;
    initializing.current = true;
    let source: EventSource | undefined,
      cancelled = false;
    api<VisibleGame>(`/api/games/${id}`, { type: 'join' })
      .then((g) => {
        if (cancelled) return;
        update(g);
        setError('');
        source = new EventSource(`/api/games/${id}/stream`);
        source.onopen = () => {
          if (connectionRef.current === 'reconnecting')
            notify('Match restored. Партия восстановлена.');
          connectionRef.current = 'connected';
          setConnection('connected');
        };
        source.onmessage = (e) => {
          try {
            update(JSON.parse(e.data) as VisibleGame);
          } catch {}
        };
        source.onerror = () => {
          connectionRef.current = 'reconnecting';
          setConnection('reconnecting');
        };
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setConnection('error');
        }
      });
    return () => {
      cancelled = true;
      source?.close();
      initializing.current = false;
    };
  }, [id, local, update, notify]);
  useEffect(() => {
    if (!game || game.status !== 'active') return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [game]);
  useEffect(() => {
    if (!playing || replay === null || !game) return;
    const t = setInterval(
      () =>
        setReplay((r) => {
          if (r === null || r >= game.moves.length) {
            setPlaying(false);
            return r;
          }
          return r + 1;
        }),
      650,
    );
    return () => clearInterval(t);
  }, [playing, replay, game]);
  const commitLocal = (s: MatchState) => {
    localState.current = s;
    saveMatch(s);
    update(localView(s));
  };
  const ready = async (fleet: Fleet) => {
    setBusy(true);
    setError('');
    try {
      if (local && localState.current)
        commitLocal({
          ...localState.current,
          fleets: [fleet, localState.current.fleets[1]],
          status: 'active',
          startedAt: Date.now(),
        });
      else update(await api<VisibleGame>(`/api/games/${id}`, { type: 'ready', fleet }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка.');
    } finally {
      setBusy(false);
    }
  };
  const shoot = async (cell: number) => {
    if (busy || !game || game.turn !== game.seat) return;
    setBusy(true);
    setError('');
    try {
      if (local && localState.current) {
        let next = takeTurn(localState.current, 0, cell);
        commitLocal(next);
        beep(next.shots[0].at(-1)?.result !== 'miss');
        await new Promise((resolve) => setTimeout(resolve, 450));
        while (next.status === 'active' && next.turn === 1) {
          next = takeTurn(
            next,
            1,
            chooseShot(
              { size: next.size, lengths: rules(next.mode).lengths, shots: next.shots[1] },
              next.difficulty,
            ),
          );
        }
        commitLocal(next);
      } else {
        const next = await api<VisibleGame>(`/api/games/${id}`, { type: 'shoot', cell });
        update(next);
        beep(next.myShots.at(-1)?.result !== 'miss');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка.');
    } finally {
      setBusy(false);
    }
  };
  const resign = async () => {
    if (!confirm('Завершить матч поражением?')) return;
    setBusy(true);
    try {
      if (local && localState.current)
        commitLocal({
          ...localState.current,
          status: 'finished',
          winner: 1,
          finishedAt: Date.now(),
        });
      else update(await api<VisibleGame>(`/api/games/${id}`, { type: 'resign' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка.');
    } finally {
      setBusy(false);
    }
  };
  const invite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('Ссылка на комнату скопирована.');
    } catch {
      notify('Скопируйте адрес комнаты из строки браузера.');
    }
  };
  const share = async () => {
    try {
      const data = {
        title: 'TIDELINE',
        text:
          game?.status === 'finished'
            ? `Мой результат в TIDELINE: ${game.winner === game.seat ? 'победа' : 'поражение'}. Твой следующий ход?`
            : 'Присоединяйся к моему матчу в TIDELINE',
        url: local ? window.location.origin : window.location.href,
      };
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(`${data.text} ${data.url}`);
        notify('Ссылка скопирована.');
      }
    } catch {
      notify('Отправка отменена или недоступна.');
    }
  };
  if (!game)
    return (
      <main className="page">
        {error ? (
          <div className="empty">
            <strong>Не удалось открыть матч</strong>
            <p>{error}</p>
            <Link className="button primary" href={user ? '/play' : `/login?next=/game/${id}`}>
              {user ? 'Создать новую игру' : 'Войти и открыть комнату'}
            </Link>
          </div>
        ) : (
          <div className="loading-page">
            <span className="spinner" />
            Подключаемся к командному центру…
          </div>
        )}
      </main>
    );
  const readyPlayer = game.players.find((p) => p.seat === game.seat)?.ready,
    opponent = game.players.find((p) => p.seat !== game.seat),
    won = game.winner === game.seat,
    analysis = analyze(game.moves, game.seat, game.mode),
    elapsed = Math.max(0, Math.floor(((game.finishedAt ?? tick) - game.startedAt) / 1000)),
    last = game.moves.at(-1);
  const replayMoves = replay === null ? game.moves : game.moves.slice(0, replay),
    myShots = replay === null ? game.myShots : replayMoves.filter((m) => m.player === game.seat),
    enemyShots =
      replay === null ? game.enemyShots : replayMoves.filter((m) => m.player !== game.seat);
  const remaining =
    rules(game.mode).lengths.length - game.enemyShots.filter((s) => s.result === 'sunk').length;
  return (
    <main className="game-page">
      <div className="game-header">
        <div>
          <span className="eyebrow">
            {game.mode === 'blitz' ? 'BLITZ BATTLE' : 'CLASSIC BATTLE'} ·{' '}
            {local ? 'LOCAL' : 'CONNECTED'}
          </span>
          <h1>
            {game.kind === 'ai'
              ? `Ты vs ${game.difficulty.toUpperCase()} AI`
              : `${game.players.find((p) => p.seat === game.seat)?.username ?? 'Ты'} vs ${opponent?.username ?? 'Ожидание соперника'}`}
          </h1>
          <div className="game-meta">
            <span>
              {game.size} × {game.size} GRID
            </span>
            <span>{remaining} кораблей в строю</span>
            <span>
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
        <div className="game-toolbar">
          {!local && game.kind !== 'ai' && (
            <button
              className="icon-button"
              onClick={() => void invite()}
              aria-label="Copy Invite Link"
            >
              <Copy size={16} />
            </button>
          )}
          <button
            className="icon-button"
            onClick={() => setSound(!sound)}
            aria-label={sound ? 'Выключить звук' : 'Включить звук'}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {game.status === 'active' && (
            <button
              className="icon-button"
              onClick={() => void resign()}
              disabled={busy}
              aria-label="Сдаться"
            >
              <Flag size={16} />
            </button>
          )}
          <Link href="/play" className="button secondary">
            Выход
          </Link>
        </div>
      </div>
      {connection === 'reconnecting' && (
        <div className="notice" role="status">
          <span className="spinner" /> Reconnecting… Восстанавливаем соединение. Состояние сохранено
          на сервере.
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {game.status === 'placement' && !local && (
        <div className="panel" style={{ marginTop: 20 }}>
          <div className="lobby-players">
            {game.players.map((p) => (
              <div className="lobby-player" key={p.id}>
                <div className="avatar">{p.username.slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{p.username}</strong>
                  <p>
                    <span className={p.online ? 'online-dot' : ''} />
                    {p.ready ? 'Флот готов' : p.online ? 'На расстановке' : 'Не в сети'}
                  </p>
                </div>
              </div>
            ))}
            {game.players.length === 1 && (
              <div className="lobby-player">
                <Radio color="var(--accent)" />
                <div>
                  {game.kind === 'quick' ? 'Поиск соперника…' : 'Ждём второго игрока'}
                  <p>
                    {game.kind === 'quick'
                      ? 'Соперник должен войти в ту же очередь.'
                      : 'Отправь другу ссылку на комнату.'}
                  </p>
                </div>
              </div>
            )}
          </div>
          {game.kind === 'friend' && (
            <div style={{ display: 'flex', gap: 10, marginTop: 17 }}>
              <button className="button secondary" onClick={() => void invite()}>
                <Copy size={14} />
                Copy Invite Link
              </button>
              <button className="button secondary" onClick={() => void share()}>
                <Share2 size={14} />
                Share
              </button>
            </div>
          )}
        </div>
      )}
      {game.status === 'placement' && !readyPlayer ? (
        <Placement
          mode={game.mode}
          onReady={(f) => void ready(f)}
          busy={busy}
          initial={game.myFleet}
        />
      ) : game.status === 'placement' ? (
        <div className="empty" style={{ marginTop: 25 }}>
          <span className="spinner" />
          <strong>Fleet Ready</strong>
          <p>Твой флот сохранён. Ожидаем готовности соперника.</p>
        </div>
      ) : (
        <>
          {game.status === 'finished' && (
            <section className="result-panel">
              <Trophy size={36} />
              <span className="eyebrow" style={{ display: 'block', marginTop: 15 }}>
                MISSION {won ? 'ACCOMPLISHED' : 'COMPLETE'}
              </span>
              <h2>{won ? 'Твои воды. Твоя победа.' : 'Новый курс. Новая попытка.'}</h2>
              <p>
                {analysis.shots} выстрелов · {analysis.accuracy}% точности ·{' '}
                {Math.floor(elapsed / 60)} мин {elapsed % 60} сек · рейтинг{' '}
                {(game.players.find((p) => p.seat === game.seat)?.ratingChange ?? 0) >= 0
                  ? '+'
                  : ''}
                {game.players.find((p) => p.seat === game.seat)?.ratingChange ?? 0}
              </p>
              <div className="result-actions">
                <Link
                  className="button primary"
                  href={`/play?kind=${game.kind === 'ai' ? 'ai' : 'friend'}&mode=${game.mode}`}
                >
                  Сыграть ещё
                  <ArrowRight size={15} />
                </Link>
                <button className="button secondary" onClick={() => setShowAnalysis(!showAnalysis)}>
                  Анализ партии
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    if (!pro) {
                      notify('Replay доступен в Demo PRO. Активируйте его на странице PRO.');
                      return;
                    }
                    setReplay(replay === null ? 0 : null);
                    setPlaying(false);
                  }}
                >
                  Replay
                </button>
                <button
                  className="icon-button"
                  aria-label="Share Result"
                  onClick={() => void share()}
                >
                  <Share2 size={17} />
                </button>
              </div>
            </section>
          )}
          <div className="turn-bar" role="status">
            <strong>
              <span className="live-dot" />
              {replay !== null
                ? `REPLAY · Ход ${replay} / ${game.moves.length}`
                : game.status === 'finished'
                  ? 'Матч завершён'
                  : busy && game.kind === 'ai'
                    ? 'AI анализирует поле…'
                    : game.turn === game.seat
                      ? 'Твой ход. Выбери цель.'
                      : 'Ход соперника…'}
            </strong>
            <span>
              {last && replay === null
                ? `${last.player === game.seat ? 'Ты' : 'Соперник'} · ${last.result.toUpperCase()} · ${String.fromCharCode(65 + (last.cell % game.size))}${Math.floor(last.cell / game.size) + 1}`
                : 'Все корабли на позиции'}
            </span>
          </div>
          <div className="segmented game-mobile-tabs">
            <button className={tab === 'enemy' ? 'selected' : ''} onClick={() => setTab('enemy')}>
              Воды соперника · {myShots.length}
            </button>
            <button className={tab === 'my' ? 'selected' : ''} onClick={() => setTab('my')}>
              Мой флот · {remaining}
            </button>
          </div>
          <div className="boards">
            <Board
              size={game.size}
              fleet={game.myFleet}
              shots={enemyShots}
              title="Мой флот"
              subtitle="DEFENSE GRID"
              hidden={tab !== 'my'}
              lastCell={enemyShots.at(-1)?.cell}
            />
            <Board
              size={game.size}
              shots={myShots}
              title="Воды соперника"
              subtitle="TARGET GRID"
              onCell={(c) => void shoot(c)}
              disabled={
                busy ||
                game.status !== 'active' ||
                game.turn !== game.seat ||
                connection === 'reconnecting' ||
                replay !== null
              }
              hidden={tab !== 'enemy'}
              lastCell={myShots.at(-1)?.cell}
            />
          </div>
          {replay !== null && (
            <div className="panel">
              <div className="replay-controls">
                <button className="icon-button" aria-label="В начало" onClick={() => setReplay(0)}>
                  <SkipBack size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Предыдущий ход"
                  onClick={() => setReplay(Math.max(0, replay - 1))}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label={playing ? 'Остановить replay' : 'Запустить replay'}
                  onClick={() => setPlaying(!playing)}
                >
                  {playing ? <Pause size={17} /> : <Play size={17} />}
                </button>
                <button
                  className="icon-button"
                  aria-label="Следующий ход"
                  onClick={() => setReplay(Math.min(game.moves.length, replay + 1))}
                >
                  <ChevronRight size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label="В конец"
                  onClick={() => setReplay(game.moves.length)}
                >
                  <SkipForward size={17} />
                </button>
              </div>
              <input
                className="replay-slider"
                type="range"
                aria-label="Ход replay"
                min={0}
                max={game.moves.length}
                value={replay}
                onChange={(e) => {
                  setPlaying(false);
                  setReplay(Number(e.target.value));
                }}
              />
              <p style={{ textAlign: 'center' }}>
                Turn {replay} → Turn {Math.min(replay + 1, game.moves.length)}
              </p>
            </div>
          )}
          {showAnalysis && <MatchAnalysis moves={game.moves} seat={game.seat} mode={game.mode} />}
        </>
      )}
    </main>
  );
}
