import type { Metadata } from 'next';
import Link from 'next/link';
import { Provider } from '../components/provider';
import { Nav } from '../components/nav';
import './globals.css';
import './responsive.css';
export const metadata: Metadata = {
  title: { default: 'TIDELINE — Your next move matters.', template: '%s · TIDELINE' },
  description:
    'Морская стратегия нового поколения. Умный AI, игра с друзьями и быстрые Blitz-матчи.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <Provider>
          <Nav />
          {children}
          <footer>
            <Link href="/" className="footer-brand">
              TIDELINE
            </Link>
            <span>Меньше случайности. Больше стратегии.</span>
            <span>© 2026 TIDELINE · Narxoz Incubator</span>
          </footer>
        </Provider>
      </body>
    </html>
  );
}
