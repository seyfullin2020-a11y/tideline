# Multiplayer

1. Register/login; create a friend room with POST `/api/games`.
2. Copy `/game/{id}` and send it to a friend.
3. The friend signs in and joins. Room row locking prevents a third player from taking a seat.
4. Each submits a validated private fleet. Only both-ready starts the match.
5. POST `/api/games/{id}` validates turns and atomically applies shots. SSE `/api/games/{id}/stream` sends updated participant-specific DTOs.
6. Completion updates statistics, Elo and achievements once inside the same transaction.

## Public/private boundary

`server/games.ts:view` is the single projection used by game GET, POST, SSE and private history. It includes own fleet, visible shot outcomes, revealed sunk cells, public player data, turn/status/winner and ordered moves. It omits both private fleet arrays and raw database user records. The opponent fleet stays private even after completion. Spectators and nonparticipants get 403.

## Reconnection

EventSource reconnects; a disconnected client disables shots and shows Reconnecting. A new stream sends the latest version. Reload joins idempotently. Logging into the same account on another device grants the same room seat. Browser storage is not required for server rooms. Presence is approximate (30-second heartbeat, 90-second timeout); turns do not disappear when a player disconnects.

Quick Match pairs authenticated real users under a PostgreSQL advisory lock. No AI is disguised as a human. An empty queue can wait indefinitely; old waiting rooms expire from matchmaking after 10 minutes. There is no automatic disconnected-player forfeiture yet.

SSE streams currently poll PostgreSQL once per second per participant. Run a Node server/proxy with buffering disabled; scale using pub/sub and shared rate limits. Vercel streams may close at function duration limits, after which EventSource reconnects.
