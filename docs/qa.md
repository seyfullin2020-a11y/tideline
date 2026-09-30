# Final QA — 2026-09-30

Verified locally on Windows, Node 24.21, Next.js 16.3.7 and actual PostgreSQL 18 (embedded development instance). Browser tests used installed Chrome because the Playwright Chromium CDN download repeatedly reset. No tests were reported as passed merely because a browser was unavailable.

| Check                       | Result | Evidence                                                                                                                          |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| npm install                 | PASS   | Lockfile synchronized; postinstall generates Prisma 6.12 client                                                                   |
| npm run lint                | PASS   | ESLint, no errors/warnings                                                                                                        |
| npm run typecheck           | PASS   | Strict TypeScript                                                                                                                 |
| npm test                    | PASS   | 14 engine/AI/rating/trainer tests                                                                                                 |
| npm run build               | PASS   | 19 static pages generated, dynamic API/game/profile/tournament routes compiled, standalone assets prepared                        |
| npm audit --omit=dev        | PASS   | 0 production dependency vulnerabilities; full installation audit also reported 0                                                  |
| PostgreSQL migration        | PASS   | Initial migration applied using prisma migrate deploy                                                                             |
| Browser E2E                 | PASS   | 6 scenarios in the complete final run (2.3 minutes)                                                                               |
| Standalone production smoke | PASS   | Built server at localhost:3002 serves home/static assets, starts Blitz, accepts a shot and restores after refresh, no page errors |

## Browser scenarios

1. Registration through the UI, Arctic profile theme saved/restored, valid one-use reset fixture, old sessions rejected in both clients, new password login and logout.
2. Complete guest Blitz match, refresh, end result and actual move analysis, Demo PRO activation and replay stepping.
3. Home and placement fit 320, 375, 390, 414, 768 and 1440 pixels without horizontal overflow.
4. Two real registered users paired through Quick Match; invalid fleet and foreign-origin mutation rejected.
5. Two isolated browser contexts join a room, randomize and ready, synchronize shots through SSE, reload, reject repeated/wrong-player shots and outsider access, complete the match, update database statistics and dashboard. Responses contain own fleet but no hidden enemy fleet or raw private state.
6. Friend request/accept, server PRO check, Expert AI game, profile settings, four-person tournament with actual semifinal/final games and completion, organizer authorization, login/logout.

The extra production smoke scenario runs with PRODUCTION_URL and verifies the actual standalone build independently of the development server. Production cookies require HTTPS, so HTTP local production smoke does not claim to verify deployed authentication.

## Fixes discovered by QA

- Corrected JSX and trainer inference during initial compilation.
- Corrected 320px preview grid minimum width and decorative orbit overflow.
- Cast advisory-lock output to text to avoid unsupported PostgreSQL void deserialization in Prisma.
- Prevented local AI games from becoming stuck if refresh happens during the computer turn.
- Fixed auth/theme loading races and stale dashboard statistics after completed games.
- Fixed login form sending absent optional username as null.
- Added session version checks and reset revocation.
- Fixed standalone static/public asset packaging and Arctic primary-button contrast.

## Limits of this verification

No external production URL, GitHub remote or hosting credentials were provided. External deployment and post-deploy device/network tests were not performed. Docker was not installed, so the Docker image was prepared but not built in this environment. Email delivery requires Resend credentials and was not sent; reset semantics were exercised with a database fixture. Theme Ocean/Arctic were visually inspected; Tactical uses the same tested layout and its own CSS tokens. Sound/share/clipboard depend on user gestures and browser support and were not sent to third parties during QA. Scale, denial-of-service resistance and accessibility certification are outside this local test run.

Development test users and matches are stored only in the local test database. Deployment must start with its own database; seed does not create fabricated leaderboard entries.
