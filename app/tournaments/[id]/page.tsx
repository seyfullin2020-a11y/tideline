'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/client';
export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params),
    [t, setTournament] = useState<{
      name: string;
      status: string;
      participants: { user: { username: string } }[];
      games: {
        id: string;
        round: number;
        status: string;
        winner: number | null;
        players: { seat: number; user: { username: string } }[];
      }[];
    } | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    api<{ tournaments: NonNullable<typeof t>[] }>('/api/community')
      .then((data) => {
        const found = (data.tournaments as (NonNullable<typeof t> & { id: string })[]).find(
          (t) => t.id === id,
        );
        if (!found) throw new Error('Турнир не найден.');
        setTournament(found);
      })
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <main className="page">
      {error ? (
        <div className="notice error">{error}</div>
      ) : t ? (
        <>
          <span className="eyebrow">TOURNAMENT / {t.status.toUpperCase()}</span>
          <h1 className="page-title">{t.name}</h1>
          <p className="page-subtitle">
            Участники: {t.participants.map((p) => p.user.username).join(', ')}
          </p>
          <div className="tournament-grid" style={{ marginTop: 25 }}>
            {[1, 2].map((round) => (
              <section className="panel" key={round}>
                <h2>{round === 1 ? 'Полуфиналы' : 'Финал'}</h2>
                {t.games
                  .filter((g) => g.round === round)
                  .map((g) => (
                    <div className="bracket-match" key={g.id}>
                      {g.players.map((p) => (
                        <p key={p.seat}>
                          <span>{p.user.username}</span>
                          <strong>
                            {g.status === 'finished' && g.winner === p.seat ? 'WIN' : ''}
                          </strong>
                        </p>
                      ))}
                      <span className="pill" style={{ display: 'inline-block', marginTop: 10 }}>
                        {g.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                {!t.games.some((g) => g.round === round) && (
                  <p>Матчи появятся после запуска раунда организатором.</p>
                )}
              </section>
            ))}
          </div>
          <Link className="button secondary" style={{ marginTop: 20 }} href="/tournaments">
            Участие и управление турниром →
          </Link>
        </>
      ) : (
        <div className="skeleton" />
      )}
    </main>
  );
}
