'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { api, User } from '../lib/client';
import { useApp } from './provider';
export function AuthForm({ action }: { action: 'login' | 'register' | 'forgot' | 'reset' }) {
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    { setUser } = useApp(),
    router = useRouter();
  const titles = {
    login: 'С возвращением.',
    register: 'Твой флот ждёт.',
    forgot: 'Восстановить доступ',
    reset: 'Новый пароль',
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const data = await api<{ user?: User; message?: string }>(`/api/auth/${action}`, {
        email: form.get('email'),
        password: form.get('password'),
        username: form.get('username') ?? undefined,
        token: new URLSearchParams(window.location.search).get('token'),
      });
      if (data.user) {
        setUser(data.user);
        const next = new URLSearchParams(window.location.search).get('next');
        router.push(next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
      } else setMessage(data.message ?? 'Готово.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка подключения.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="panel">
        <ShieldCheck size={26} color="var(--accent)" />
        <h1 className="page-title">{titles[action]}</h1>
        <p>
          {action === 'register'
            ? 'Один аккаунт. Все твои победы.'
            : 'Продолжай с того места, где остановился.'}
        </p>
        <form onSubmit={submit}>
          {action === 'register' && (
            <label className="field">
              Имя игрока
              <input
                name="username"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                autoComplete="username"
                placeholder="captain_01"
              />
            </label>
          )}
          {action !== 'reset' && (
            <label className="field">
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
          )}
          {action !== 'forgot' && (
            <label className="field">
              Пароль
              <input
                type="password"
                name="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete={action === 'login' ? 'current-password' : 'new-password'}
                placeholder="Минимум 8 символов"
              />
            </label>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="notice" role="status">
              {message}
            </div>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? (
              <span className="spinner" />
            ) : action === 'login' ? (
              'Войти'
            ) : action === 'register' ? (
              'Создать аккаунт'
            ) : action === 'forgot' ? (
              'Отправить ссылку'
            ) : (
              'Обновить пароль'
            )}
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="auth-links">
          <Link href={action === 'login' ? '/register' : '/login'}>
            {action === 'login' ? 'Создать аккаунт' : 'Войти'}
          </Link>
          <Link href="/forgot-password">Забыли пароль?</Link>
        </div>
      </div>
      <p className="muted" style={{ textAlign: 'center', fontSize: 10, marginTop: 22 }}>
        Попробовать игру можно{' '}
        <Link style={{ color: 'var(--accent)' }} href="/play">
          без регистрации
        </Link>
        .
      </p>
    </main>
  );
}
