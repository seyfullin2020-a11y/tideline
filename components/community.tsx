'use client';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BrainCircuit,
  Users,
  Radio,
  Trophy,
  BarChart3,
  UserRound,
  Anchor,
  History,
  Medal,
  Check,
  Plus,
  LogOut,
} from 'lucide-react';
import { api, User } from '../lib/client';
import { useApp } from './provider';
import { VisibleGame } from './game-screen';
import { MatchState } from '../lib/game/types';
import { analyze } from '../lib/game/trainer';
type Friend = { id: string; status: string; incoming: boolean; user: User };
type Tournament = {
  id: string;
  name: string;
  creatorId: string;
  status: string;
  capacity: number;
  participants: { user: User; eliminated: boolean }[];
  games: {
    id: string;
    status: string;
    round: number;
    winner: number | null;
    players: { seat: number; user: User }[];
  }[];
};
type Data = {
  user: User;
  games: VisibleGame[];
  friends: Friend[];
  achievements: { code: string; unlockedAt: string }[];
  tournaments: Tournament[];
};
const achievementNames: Record<string, string> = {
  'first-victory': 'First Victory',
  'ten-wins': '10 Wins',
  'win-streak': 'Win Streak',
  sharpshooter: 'Sharpshooter',
  'perfect-game': 'Perfect Game',
  'blitz-champion': 'Blitz Champion',
};
export function Community({
  section,
}: {
  section: 'dashboard' | 'profile' | 'statistics' | 'history' | 'friends' | 'tournaments';
}) {
  const { user, authLoading, setUser, theme, setTheme, pro, notify } = useApp(),
    router = useRouter(),
    [data, setData] = useState<Data | null>(null),
    [localGames, setLocalGames] = useState<MatchState[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const previous = useRef<Data | null>(null);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const d = await api<Data>('/api/community');
      if (previous.current) {
        if (
          d.friends.filter((f) => f.incoming && f.status === 'pending').length >
          previous.current.friends.filter((f) => f.incoming && f.status === 'pending').length
        )
          notify('Новый запрос дружбы.');
        if (d.achievements.length > previous.current.achievements.length)
          notify('Открыто новое достижение!');
      }
      previous.current = d;
      setData(d);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка.');
    } finally {
      setLoading(false);
    }
  }, [user, notify]);
  useEffect(() => {
    void load();
    if (!user) {
      try {
        setLocalGames(JSON.parse(localStorage.getItem('tideline-history') ?? '[]'));
      } catch {}
    }
  }, [load, user]);
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, [load, user]);
  const mutate = async (path: string, body: unknown) => {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ user?: User }>(path, body);
      if (result.user) setUser(result.user);
      notify('Изменения сохранены.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка.');
    } finally {
      setBusy(false);
    }
  };
  if (authLoading) return <main className="page"><div className="loading-page"><span className="spinner"/>Восстанавливаем профиль…</div></main>;
  const account = data?.user ?? user;
  const games = data?.games ?? [],
    finished = games.filter((g) => g.status === 'finished'),
    wins = account?.wins ?? localGames.filter((g) => g.winner === 0).length,
    losses = account?.losses ?? localGames.filter((g) => g.winner !== 0).length,
    total = wins + losses,
    rate = total ? Math.round((wins / total) * 100) : 0;
  const titles = {
    dashboard: 'Твой командный центр.',
    profile: 'Твой профиль.',
    statistics: 'Каждый ход в цифрах.',
    history: 'История твоих сражений.',
    friends: 'Вместе в одном море.',
    tournaments: 'Путь к чемпионству.',
  };
  const stats = (
    <div className="stat-grid">
      <div className="stat">
        <span>СЫГРАНО МАТЧЕЙ</span>
        <strong>{total}</strong>
        <small>
          {wins} побед · {losses} поражений
        </small>
      </div>
      <div className="stat">
        <span>ПРОЦЕНТ ПОБЕД</span>
        <strong>{rate}%</strong>
        <small>Результат завершённых партий</small>
      </div>
      <div className="stat">
        <span>РЕЙТИНГ ELO</span>
        <strong>{account?.rating ?? '—'}</strong>
        <small>{user ? 'Стартовый рейтинг: 1000' : 'Доступен после регистрации'}</small>
      </div>
      <div className="stat">
        <span>ТЕКУЩАЯ СЕРИЯ</span>
        <strong>{account?.streak ?? '—'}</strong>
        <small>Лучшая серия: {account?.bestStreak ?? '—'}</small>
      </div>
    </div>
  );
  const historyList = finished.length ? (
    <>
      {finished.slice(0, section === 'dashboard' ? 5 : 100).map((g) => {
        const a = analyze(g.moves, g.seat, g.mode),
          delta = g.players.find((p) => p.seat === g.seat)?.ratingChange ?? 0;
        return (
          <Link key={g.id} href={`/game/${g.id}`} className="match-row">
            <span className={`result-symbol ${g.winner === g.seat ? '' : 'loss'}`}>
              {g.winner === g.seat ? 'W' : 'L'}
            </span>
            <div>
              <strong>
                {g.kind === 'ai'
                  ? `${g.difficulty.toUpperCase()} AI`
                  : (g.players.find((p) => p.seat !== g.seat)?.username ?? 'Игрок')}
              </strong>
              <small>
                {g.mode.toUpperCase()} ·{' '}
                {new Date(g.finishedAt ?? g.startedAt).toLocaleDateString('ru-RU')} · {a.shots}{' '}
                выстрелов · {a.accuracy}% ·{' '}
                {Math.round(((g.finishedAt ?? g.startedAt) - g.startedAt) / 1000)} сек
              </small>
            </div>
            <span>
              {delta >= 0 ? '+' : ''}
              {delta}
            </span>
          </Link>
        );
      })}
    </>
  ) : localGames.length ? (
    <>
      {localGames.slice(0, section === 'dashboard' ? 5 : 100).map((g) => (
        <button
          key={g.id}
          style={{
            width: '100%',
            background: 'none',
            color: 'var(--text)',
            border: 0,
            textAlign: 'left',
          }}
          className="match-row"
          onClick={() => {
            localStorage.setItem('tideline-match', JSON.stringify(g));
            router.push('/game/local');
          }}
        >
          <span className={`result-symbol ${g.winner === 0 ? '' : 'loss'}`}>
            {g.winner === 0 ? 'W' : 'L'}
          </span>
          <div>
            <strong>{g.difficulty.toUpperCase()} AI</strong>
            <small>
              {g.mode.toUpperCase()} · {analyze(g.moves, 0, g.mode).accuracy}% точности
            </small>
          </div>
          <span>
            <ArrowUpRight size={16} />
          </span>
        </button>
      ))}
    </>
  ) : (
    <div className="empty">
      <History size={26} />
      <strong>Твоя история начинается здесь.</strong>
      <p>Заверши первую партию — здесь появятся результат, точность и анализ.</p>
      <Link className="button primary" href="/play">
        Начать игру
      </Link>
    </div>
  );
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{section.toUpperCase()} / TIDELINE</span>
          <h1 className="page-title">{titles[section]}</h1>
          <p className="page-subtitle">
            {user
              ? `${user.username}, держи курс на следующую победу.`
              : 'Гостевой режим · твои локальные партии сохраняются на этом устройстве.'}
          </p>
        </div>
        {user ? (
          <div className="identity">
            <div className="avatar">{user.username.slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>{user.username}</strong>
              <p className="muted" style={{ fontSize: 10, marginTop: 5 }}>
                {user.plan.toUpperCase()} CAPTAIN
              </p>
            </div>
          </div>
        ) : (
          <Link className="button secondary" href="/register">
            Создать профиль
            <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button
            className="text-link"
            style={{ background: 'none', border: 0, marginLeft: 12 }}
            onClick={() => void load()}
          >
            Повторить
          </button>
        </div>
      )}
      {loading && !data && <div className="skeleton" aria-label="Загрузка данных" />}
      {(section === 'dashboard' || section === 'statistics' || section === 'profile') && stats}
      {section === 'dashboard' && (
        <>
          <div className="actions-grid">
            {[
              { url: '/play?kind=quick', title: 'Quick Match', icon: Radio },
              { url: '/play?kind=ai', title: 'Play vs AI', icon: BrainCircuit },
              { url: '/play?kind=friend', title: 'С другом', icon: Users },
              { url: '/tournaments', title: 'Турниры', icon: Trophy },
              { url: '/statistics', title: 'Статистика', icon: BarChart3 },
              { url: '/profile', title: 'Профиль', icon: UserRound },
            ].map((a) => (
              <Link key={a.url} href={a.url} className="action-tile">
                <a.icon />
                {a.title}
                <ArrowUpRight size={13} style={{ marginLeft: 'auto' }} />
              </Link>
            ))}
          </div>
          <div className="dashboard-grid">
            <div className="panel">
              <div className="section-heading">
                <h2 style={{ margin: 0 }}>Последние матчи</h2>
                <Link href="/history" className="text-link">
                  Вся история
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              {historyList}
            </div>
            <div className="panel">
              <h2>В твоей гавани</h2>
              <p>
                {data?.friends.filter((f) => f.status === 'accepted').length ?? 0} друзей ·{' '}
                {finished.filter((g) => g.kind === 'friend').length} матчей с друзьями
              </p>
              <div style={{ margin: '20px 0' }}>
                {data?.friends
                  .filter((f) => f.status === 'accepted')
                  .slice(0, 4)
                  .map((f) => (
                    <div key={f.id} className="friend-row">
                      <span
                        className="online-dot"
                        style={{ background: f.user.online ? 'var(--accent)' : 'var(--muted)' }}
                      />
                      <strong>{f.user.username}</strong>
                    </div>
                  ))}
              </div>
              <Link className="button secondary" href="/friends">
                <Users size={15} />
                Найти друзей
              </Link>
              <div style={{ marginTop: 28 }}>
                <h3>Продолжить матч</h3>
                {games
                  .filter((g) => g.status !== 'finished')
                  .slice(0, 3)
                  .map((g) => (
                    <Link className="match-row" key={g.id} href={`/game/${g.id}`}>
                      <Anchor size={17} color="var(--accent)" />
                      <strong>
                        {g.mode.toUpperCase()} · {g.status === 'active' ? 'В бою' : 'Расстановка'}
                      </strong>
                      <ArrowUpRight size={15} />
                    </Link>
                  ))}
                {!games.some((g) => g.status !== 'finished') && (
                  <p>Нет активных серверных матчей.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {section === 'history' && <div className="panel">{historyList}</div>}
      {section === 'statistics' && (
        <>
          <div className="panel">
            <h2>Точность последних матчей</h2>
            {finished.length || localGames.length ? (
              <div className="chart" role="img" aria-label="Точность последних матчей">
                {(finished.length
                  ? finished
                      .slice(0, 20)
                      .reverse()
                      .map((g) => ({
                        id: g.id,
                        accuracy: analyze(g.moves, g.seat, g.mode).accuracy,
                        win: g.winner === g.seat,
                      }))
                  : localGames
                      .slice(0, 20)
                      .reverse()
                      .map((g) => ({
                        id: g.id,
                        accuracy: analyze(g.moves, 0, g.mode).accuracy,
                        win: g.winner === 0,
                      }))
                ).map((g, i) => (
                  <div
                    key={g.id}
                    title={`Матч ${i + 1}: ${g.accuracy}%`}
                    className={`chart-bar ${g.win ? '' : 'loss'}`}
                    style={{ height: `${Math.max(3, g.accuracy)}%` }}
                  />
                ))}
              </div>
            ) : (
              <div className="empty">
                <BarChart3 />
                <p>График появится после первой завершённой партии.</p>
              </div>
            )}
            <p style={{ marginTop: 15 }}>
              Высота столбца — точность выстрелов. Мятный — победа, коралловый — поражение.
            </p>
          </div>
          {pro ? (
            <div className="analysis-grid">
              <div className="panel">
                <h2>Расширенная статистика</h2>
                <p>
                  Всего выстрелов:{' '}
                  {finished.reduce((sum, g) => sum + g.myShots.length, 0) +
                    (!user ? localGames.reduce((sum, g) => sum + g.shots[0].length, 0) : 0)}
                </p>
                <p>
                  Потоплено кораблей:{' '}
                  {finished.reduce(
                    (sum, g) => sum + g.myShots.filter((s) => s.result === 'sunk').length,
                    0,
                  ) +
                    (!user
                      ? localGames.reduce(
                          (sum, g) => sum + g.shots[0].filter((s) => s.result === 'sunk').length,
                          0,
                        )
                      : 0)}
                </p>
                <p>
                  Blitz-матчи:{' '}
                  {finished.filter((g) => g.mode === 'blitz').length +
                    (!user ? localGames.filter((g) => g.mode === 'blitz').length : 0)}
                </p>
              </div>
              <div className="panel">
                <h2>Среднее время партии</h2>
                <p>
                  {Math.round(
                    (finished.length
                      ? finished.reduce(
                          (sum, g) => sum + ((g.finishedAt ?? g.startedAt) - g.startedAt),
                          0,
                        ) / Math.max(1, finished.length)
                      : localGames.reduce(
                          (sum, g) => sum + ((g.finishedAt ?? g.startedAt) - g.startedAt),
                          0,
                        ) / Math.max(1, localGames.length)) / 60000,
                  )}{' '}
                  минут
                </p>
                <p>Серия побед помогает оценить стабильность, точность — эффективность поиска.</p>
              </div>
            </div>
          ) : (
            <div className="notice">
              Больше данных с Demo PRO.{' '}
              <Link className="text-link" href="/pro">
                Активировать бесплатно →
              </Link>
            </div>
          )}
        </>
      )}
      {section === 'profile' && (
        <div className="dashboard-grid">
          <div className="panel">
            <h2>Настройки капитана</h2>
            <p>
              В команде с {user ? new Date(user.createdAt).toLocaleDateString('ru-RU') : 'сегодня'}
            </p>
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                if (!user) {
                  notify('Тема сохранена на этом устройстве.');
                  return;
                }
                const f = new FormData(e.currentTarget);
                void mutate('/api/community', {
                  type: 'profile',
                  username: f.get('username'),
                  theme,
                });
              }}
            >
              {user && (
                <label className="field">
                  Имя игрока
                  <input
                    name="username"
                    defaultValue={user.username}
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]+"
                  />
                </label>
              )}
              <label className="field">
                Оформление
                <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="ocean">Ocean</option>
                  <option value="tactical">Tactical</option>
                  <option value="arctic">Arctic</option>
                </select>
              </label>
              <button className="button primary" disabled={busy}>
                {busy ? <span className="spinner" /> : 'Сохранить настройки'}
              </button>
            </form>
            {user && (
              <button
                className="button secondary"
                style={{ marginTop: 16 }}
                onClick={async () => {
                  try {
                    await api('/api/auth/logout', {});
                    setUser(null);
                    setData(null);
                    router.push('/');
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Ошибка.');
                  }
                }}
              >
                <LogOut size={15} />
                Выйти из аккаунта
              </button>
            )}
          </div>
          <div className="panel">
            <h2>Достижения</h2>
            {data?.achievements.length ? (
              <div className="achievement-list">
                {data.achievements.map((a) => (
                  <span key={a.code} className="achievement">
                    <Medal size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    {achievementNames[a.code] ?? a.code}
                  </span>
                ))}
              </div>
            ) : (
              <div className="empty">
                <Medal />
                <p>
                  Первая победа откроет первое достижение. Для серверных достижений играй из
                  аккаунта.
                </p>
              </div>
            )}
            <h3 style={{ marginTop: 28 }}>Следующие цели</h3>
            <p>10 побед · серия из 3 побед · точность 60%+ при победе · победа в Blitz.</p>
          </div>
        </div>
      )}
      {section === 'friends' &&
        (user ? (
          <div className="panel">
            <h2>Найди своего соперника</h2>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void mutate('/api/community', { type: 'friend', username: f.get('username') });
              }}
            >
              <input
                name="username"
                className="input"
                aria-label="Имя друга"
                placeholder="Имя игрока"
                required
                maxLength={20}
              />
              <button className="button primary" disabled={busy}>
                <Plus size={16} />
                Добавить
              </button>
            </form>
            {data?.friends.length ? (
              data.friends.map((f) => (
                <div className="friend-row" key={f.id}>
                  <div className="avatar">{f.user.username.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{f.user.username}</strong>
                    <p className="muted" style={{ fontSize: 10, marginTop: 5 }}>
                      {f.status === 'pending'
                        ? f.incoming
                          ? 'Входящий запрос'
                          : 'Запрос отправлен'
                        : f.user.online
                          ? 'В сети'
                          : 'Не в сети'}{' '}
                      · {f.user.rating} ELO
                    </p>
                  </div>
                  {f.incoming && f.status === 'pending' ? (
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() => void mutate('/api/community', { type: 'accept', id: f.id })}
                    >
                      <Check size={15} />
                      Принять
                    </button>
                  ) : f.status === 'accepted' ? (
                    <Link className="button secondary" href="/play?kind=friend">
                      Пригласить
                    </Link>
                  ) : null}
                  <button
                    className="icon-button"
                    aria-label="Удалить запрос или друга"
                    disabled={busy}
                    onClick={() => void mutate('/api/community', { type: 'remove', id: f.id })}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <div className="empty">
                <Users />
                <strong>Твоя гавань пока пуста.</strong>
                <p>Добавь друга по имени игрока. Он увидит запрос в своём аккаунте.</p>
              </div>
            )}
            <h3 style={{ marginTop: 25 }}>Недавние соперники</h3>
            <div className="achievement-list">
              {Array.from(
                new Map(
                  finished
                    .flatMap((g) => g.players.filter((p) => p.id !== user.id))
                    .map((p) => [p.id, p]),
                ).values(),
              )
                .slice(0, 8)
                .map((p) => (
                  <button
                    className="achievement"
                    key={p.id}
                    disabled={busy}
                    onClick={() =>
                      void mutate('/api/community', { type: 'friend', username: p.username })
                    }
                  >
                    {p.username} +
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <LoginEmpty text="Друзья и запросы доступны после входа в аккаунт." />
        ))}
      {section === 'tournaments' &&
        (user ? (
          <>
            <div className="panel" style={{ marginBottom: 20 }}>
              <h2>Четыре капитана. Один победитель.</h2>
              <p>
                Создай турнир, собери 4 участников и запусти полуфиналы. После завершения матчей
                организатор запускает следующий раунд.
              </p>
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void mutate('/api/tournaments', { type: 'create', name: f.get('name') });
                }}
              >
                <input
                  className="input"
                  name="name"
                  aria-label="Название турнира"
                  placeholder="Название турнира"
                  minLength={3}
                  maxLength={60}
                  required
                />
                <button className="button primary" disabled={busy}>
                  <Plus size={16} />
                  Создать турнир
                </button>
              </form>
            </div>
            <div className="tournament-grid">
              {data?.tournaments.length ? (
                data.tournaments.map((t) => (
                  <div className="panel" key={t.id}>
                    <span className="pill">{t.status.toUpperCase()}</span>
                    <h2 style={{ marginTop: 15 }}>
                      <Link href={`/tournaments/${t.id}`}>{t.name}</Link>
                    </h2>
                    <p>
                      {t.participants.length} / {t.capacity} участников
                    </p>
                    <div className="achievement-list" style={{ margin: '16px 0' }}>
                      {t.participants.map((p) => (
                        <span
                          className="achievement"
                          key={p.user.id}
                          style={{ opacity: p.eliminated ? 0.5 : 1 }}
                        >
                          {p.user.username}
                        </span>
                      ))}
                    </div>
                    {t.games.map((g) => (
                      <div className="bracket-match" key={g.id}>
                        <span className="eyebrow">{g.round === 1 ? 'ПОЛУФИНАЛ' : 'ФИНАЛ'}</span>
                        {g.players.map((p) => (
                          <p key={p.user.id}>
                            <span>{p.user.username}</span>
                            <span>
                              {g.status === 'finished' && g.winner === p.seat ? 'WIN' : ''}
                            </span>
                          </p>
                        ))}
                        {g.players.some((p) => p.user.id === user.id) && (
                          <Link
                            className="text-link"
                            style={{ color: 'var(--accent)', marginTop: 10 }}
                            href={`/game/${g.id}`}
                          >
                            {g.status === 'finished' ? 'Посмотреть матч' : 'Открыть матч'}
                            <ArrowUpRight size={13} />
                          </Link>
                        )}
                      </div>
                    ))}
                    {t.status === 'open' && !t.participants.some((p) => p.user.id === user.id) && (
                      <button
                        className="button primary"
                        disabled={busy || t.participants.length >= 4}
                        onClick={() => void mutate('/api/tournaments', { type: 'join', id: t.id })}
                      >
                        Участвовать
                      </button>
                    )}
                    {t.creatorId === user.id && t.status !== 'finished' && (
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() =>
                          void mutate('/api/tournaments', { type: 'advance', id: t.id })
                        }
                      >
                        {t.status === 'open' ? 'Начать турнир' : 'Следующий раунд / завершить'}
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty">
                  <Trophy />
                  <strong>Первый турнир — твой.</strong>
                  <p>Создай турнир и пригласи друзей зарегистрироваться в нём.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <LoginEmpty text="Войди, чтобы участвовать в турнирах с реальными игроками." />
        ))}
    </main>
  );
}
function LoginEmpty({ text }: { text: string }) {
  return (
    <div className="empty">
      <UserRound />
      <strong>Нужен аккаунт капитана.</strong>
      <p>{text}</p>
      <Link className="button primary" href="/login">
        Войти
      </Link>
    </div>
  );
}
