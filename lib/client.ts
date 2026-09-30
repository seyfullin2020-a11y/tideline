export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    ...(body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Не удалось выполнить запрос.');
  return data as T;
}
export type User = {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
  plan: string;
  theme: string;
  createdAt: string;
  online: boolean;
};
