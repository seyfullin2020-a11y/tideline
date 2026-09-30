import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="page">
      <div className="empty">
        <strong>Этот курс не найден.</strong>
        <p>Страница не существует. Вернись в командный центр.</p>
        <Link className="button primary" href="/">
          На главную
        </Link>
      </div>
    </main>
  );
}
