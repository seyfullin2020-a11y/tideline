'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, User } from '../lib/client';
type Context = {
  user: User | null;
  authLoading: boolean;
  setUser: (user: User | null) => void;
  theme: string;
  setTheme: (theme: string) => void;
  pro: boolean;
  upgrade: () => Promise<void>;
  notify: (message: string) => void;
  sound: boolean;
  setSound: (value: boolean) => void;
  beep: (hit?: boolean) => void;
};
const AppContext = createContext<Context | null>(null);
export function Provider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null),
    [authLoading, setAuthLoading] = useState(true),
    [theme, setThemeState] = useState('ocean'),
    [demoPro, setDemoPro] = useState(false),
    [sound, setSound] = useState(false),
    [toast, setToast] = useState('');
  const authRevision = useRef(0);
  const setUser = useCallback((value: User | null) => { authRevision.current++; setUserState(value); }, []);
  useEffect(() => {
    setThemeState(localStorage.getItem('tideline-theme') ?? 'ocean');
    setDemoPro(localStorage.getItem('tideline-pro') === 'true');
    api<{ user: User | null }>('/api/auth/me')
      .then((d) => { if (authRevision.current === 0) setUserState(d.user); })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);
  useEffect(() => {
    if (user) setThemeState(user.theme);
  }, [user]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('tideline-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const notify = useCallback((message: string) => setToast(message), []);
  const upgrade = async () => {
    if (user) {
      const d = await api<{ user: User }>('/api/community', { type: 'upgrade' });
      setUser(d.user);
    } else {
      setDemoPro(true);
      localStorage.setItem('tideline-pro', 'true');
    }
    notify('PRO активирован в деморежиме. Без платежей.');
  };
  const beep = (hit = false) => {
    if (!sound) return;
    const ctx = new AudioContext(),
      o = ctx.createOscillator(),
      gain = ctx.createGain();
    o.frequency.value = hit ? 440 : 180;
    gain.gain.setValueAtTime(0.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(gain);
    gain.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.15);
    o.onended = () => void ctx.close();
  };
  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        setUser,
        theme,
        setTheme: setThemeState,
        pro: user ? user.plan === 'pro' : demoPro,
        upgrade,
        notify,
        sound,
        setSound,
        beep,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Закрыть уведомление" onClick={() => setToast('')}>
            ×
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('Provider required');
  return context;
}
