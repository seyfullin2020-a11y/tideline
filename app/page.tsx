import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Users,
  Zap,
  ShieldCheck,
  MoveUpRight,
  ScanLine,
  ChevronRight,
} from 'lucide-react';
import { Preview } from '../components/preview';
export default function Home() {
  return (
    <main className="home">
      <section className="hero shell">
        <div className="hero-copy">
          <div className="season-badge">
            <span className="live-dot" /> НОВЫЙ СЕЗОН. НОВАЯ СТРАТЕГИЯ.<span>2026</span>
          </div>
          <h1>
            Океан возможностей.
            <br />
            Один <em>точный ход.</em>
          </h1>
          <p className="hero-description">
            Знакомая игра. Новый уровень.
            <br />
            Собери флот, перехитри соперника и завоюй свои воды.
          </p>
          <div className="hero-buttons">
            <Link className="button primary" href="/play">
              Начать игру
              <ArrowRight size={18} />
            </Link>
            <Link className="button secondary" href="/play?kind=friend">
              <Users size={17} />
              Играть с другом
            </Link>
          </div>
          <div className="hero-footnote">
            <ShieldCheck size={14} />
            <span>Бесплатно. В браузере. Без установки.</span>
          </div>
          <div className="hero-metrics">
            <div>
              <strong>10 × 10</strong>
              <span>классика стратегии</span>
            </div>
            <div>
              <strong>4 уровня</strong>
              <span>умного противника</span>
            </div>
            <div>
              <strong>~ 5 мин</strong>
              <span>на Blitz-матч</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-orbit" />
          <Preview />
          <span className="visual-caption">THINK AHEAD. STRIKE PRECISE.</span>
        </div>
      </section>
      <section className="mode-section shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ВЫБЕРИ СВОЙ КУРС</span>
            <h2>Три способа выйти в море.</h2>
          </div>
          <Link href="/play" className="text-link">
            Все режимы
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="mode-cards">
          <Link href="/play?kind=ai" className="mode-card">
            <div className="card-top">
              <span className="mode-icon">
                <BrainCircuit />
              </span>
              <span className="pill">SOLO</span>
            </div>
            <h3>Ты против алгоритма</h3>
            <p>От первого выстрела до экспертной тактики. Противник, который заставляет думать.</p>
            <span className="card-link">
              Играть против AI
              <ArrowUpRight size={18} />
            </span>
            <span className="card-number">01</span>
          </Link>
          <Link href="/play?kind=friend" className="mode-card">
            <div className="card-top">
              <span className="mode-icon">
                <Users />
              </span>
              <span className="pill">MULTIPLAYER</span>
            </div>
            <h3>Друг. Соперник. Легенда.</h3>
            <p>Отправь ссылку и реши, кто лучше читает поле. Где бы вы ни находились.</p>
            <span className="card-link">
              Пригласить друга
              <ArrowUpRight size={18} />
            </span>
            <span className="card-number">02</span>
          </Link>
          <Link href="/play?mode=blitz" className="mode-card blitz-card">
            <div className="card-top">
              <span className="mode-icon">
                <Zap />
              </span>
              <span className="pill cyan">SIGNATURE MODE</span>
            </div>
            <h3>Маленькое поле. Большая игра.</h3>
            <p>Blitz: поле 7 × 7 и компактный флот. Твоя стратегическая пауза между парами.</p>
            <span className="card-link">
              Попробовать Blitz
              <ArrowUpRight size={18} />
            </span>
            <span className="card-number">03</span>
          </Link>
        </div>
      </section>
      <section className="feature-strip shell">
        <div>
          <ScanLine />
          <span>
            <strong>Не просто удача</strong>
            <small>Вероятностный AI и честные правила</small>
          </span>
        </div>
        <div>
          <BrainCircuit />
          <span>
            <strong>Становись сильнее</strong>
            <small>Разбор твоих решений после матча</small>
          </span>
        </div>
        <div>
          <MoveUpRight />
          <span>
            <strong>Каждая победа важна</strong>
            <small>Рейтинг, достижения и история игр</small>
          </span>
        </div>
      </section>
      <section className="home-bottom shell">
        <div>
          <span className="eyebrow">ТВОЯ СЛЕДУЮЩАЯ ПОБЕДА</span>
          <h2>Стратегия начинается с тебя.</h2>
          <p>Создай профиль. Следи за прогрессом. Найди свой стиль.</p>
        </div>
        <Link href="/dashboard" className="button secondary">
          Открыть командный центр
          <ChevronRight size={18} />
        </Link>
        <Link href="/leaderboard" className="text-link">
          Рейтинг игроков
          <ArrowUpRight size={16} />
        </Link>
      </section>
    </main>
  );
}
