'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { api, User } from '../../lib/client';
export default function Leaderboard() {
  const [players, setPlayers] = useState<User[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ users: User[] }>('/api/community?section=leaderboard')
      .then((d) => setPlayers(d.users))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE CAPTAINS LEAGUE</span>
          <h1 className="page-title">Здесь побеждает стратегия.</h1>
          <p className="page-subtitle">
            Реальные капитаны. Реальные результаты. Рейтинг Elo меняется после multiplayer-матчей.
          </p>
        </div>
        <Trophy size={35} color="var(--accent)" />
      </div>
      {loading ? (
        <div className="skeleton" />
      ) : error ? (
        <div className="notice error" role="alert">
          {error} Рейтинг появится после подключения PostgreSQL.
        </div>
      ) : players.length ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                {['RANK', 'PLAYER', 'RATING', 'WINS', 'WIN RATE', 'STREAK'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: i < 3 ? 'var(--accent)' : 'var(--muted)' }}>#{i + 1}</td>
                  <td>
                    <Link href={`/profile/${p.id}`} style={{ fontWeight: 700 }}>
                      {p.username}
                    </Link>
                  </td>
                  <td style={{ fontFamily: 'Space Grotesk', color: 'var(--accent)' }}>
                    {p.rating}
                  </td>
                  <td>{p.wins}</td>
                  <td>{Math.round((p.wins / (p.wins + p.losses)) * 100)}%</td>
                  <td>{p.streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <Trophy />
          <strong>Первое место свободно.</strong>
          <p>Рейтинг наполняется после завершённых матчей. Здесь нет вымышленных игроков.</p>
          <Link className="button primary" href="/play">
            Начать игру
          </Link>
        </div>
      )}
    </main>
  );
}
