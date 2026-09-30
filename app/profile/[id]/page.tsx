'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, User } from '../../../lib/client';
import { useApp } from '../../../components/provider';
export default function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params),
    [profile, setProfile] = useState<{ user: User; achievements: { code: string }[] } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    { user, notify } = useApp();
  useEffect(() => {
    api<{ user: User; achievements: { code: string }[] }>(`/api/profile/${id}`)
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <main className="page">
      {error ? (
        <div className="notice error">{error}</div>
      ) : profile ? (
        <>
          <div className="page-heading">
            <div className="identity">
              <div className="avatar">{profile.user.username.slice(0, 2).toUpperCase()}</div>
              <div>
                <span className="eyebrow">CAPTAIN PROFILE</span>
                <h1 className="page-title">{profile.user.username}</h1>
                <p className="muted">
                  В команде с {new Date(profile.user.createdAt).toLocaleDateString('ru-RU')} ·{' '}
                  {profile.user.online ? 'В сети' : 'Не в сети'}
                </p>
              </div>
            </div>
            {user && user.id !== id ? (
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api('/api/community', {
                      type: 'friend',
                      username: profile.user.username,
                    });
                    notify('Запрос дружбы отправлен.');
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Ошибка.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Добавить в друзья
              </button>
            ) : (
              <Link className="button secondary" href="/login">
                Войти
              </Link>
            )}
          </div>
          <div className="stat-grid">
            {[
              ['РЕЙТИНГ', profile.user.rating],
              ['ПОБЕДЫ', profile.user.wins],
              ['ПОРАЖЕНИЯ', profile.user.losses],
              ['ЛУЧШАЯ СЕРИЯ', profile.user.bestStreak],
            ].map(([label, value]) => (
              <div className="stat" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="panel">
            <h2>Достижения</h2>
            <div className="achievement-list">
              {profile.achievements.length ? (
                profile.achievements.map((a) => (
                  <span className="achievement" key={a.code}>
                    {a.code.replaceAll('-', ' ').toUpperCase()}
                  </span>
                ))
              ) : (
                <p>Ещё нет достижений.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="skeleton" />
      )}
    </main>
  );
}
