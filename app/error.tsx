'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page">
      <div className="empty">
        <strong>Не удалось загрузить страницу.</strong>
        <p>Попробуй ещё раз. Сохранённые партии останутся на месте.</p>
        <button className="button primary" onClick={reset}>
          Повторить
        </button>
      </div>
    </main>
  );
}
