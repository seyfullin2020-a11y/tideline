'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Anchor, ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from './provider';
export function Nav() {
  const { user, theme, setTheme } = useApp(),
    path = usePathname(),
    [open, setOpen] = useState(false);
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="logo">
          <span className="logo-icon">
            <Anchor size={21} />
          </span>
          TIDELINE<span className="logo-dot">®</span>
        </Link>
        <nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Основная навигация">
          {[
            ['/play', 'Играть'],
            ['/leaderboard', 'Рейтинг'],
            ['/tournaments', 'Турниры'],
            ['/pro', 'TIDELINE PRO'],
          ].map(([url, label]) => (
            <Link
              key={url}
              className={path === url ? 'active' : ''}
              href={url}
              onClick={() => setOpen(false)}
            >
              {label}
              {url === '/pro' && <span className="tiny-tag">NEW</span>}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <label className="theme-picker">
            <span className="sr-only">Тема</span>
            <select
              aria-label="Тема оформления"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="ocean">Ocean</option>
              <option value="tactical">Tactical</option>
              <option value="arctic">Arctic</option>
            </select>
            <ChevronDown size={12} />
          </label>
          <Link href={user ? '/dashboard' : '/login'} className="nav-login">
            {user ? user.username : 'Войти'}
            <ArrowUpRight size={15} />
          </Link>
          <button
            className="mobile-menu icon-button"
            onClick={() => setOpen(!open)}
            aria-label="Открыть меню"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
