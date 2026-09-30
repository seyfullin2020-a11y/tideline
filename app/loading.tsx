export default function Loading() {
  return (
    <main className="page">
      <div className="skeleton" aria-label="Загрузка страницы" />
      <div className="skeleton" style={{ marginTop: 20, height: 250 }} />
    </main>
  );
}
