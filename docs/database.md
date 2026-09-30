# Database

PostgreSQL + Prisma 6.12, pinned client/CLI versions. Initial migration: `prisma/migrations/20260930000000_initial/migration.sql`.

| Model                 | Purpose                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| User                  | Unique email/username, password hash, session version, profile, presence, plan, rating, wins/losses/streaks           |
| Game                  | Mode/kind/status, private JSON match aggregate including ships/shots, monotonic version, timestamps, tournament round |
| GamePlayer            | Membership, unique seat, ready, rating delta; FK to game and user                                                     |
| GameEvent             | Append-only shot events, unique sequence per game, FK to game                                                         |
| Friendship            | Sender/recipient, pending or accepted, FKs and pair uniqueness                                                        |
| UserAchievement       | Automatically unlocked code, unique user/code and timestamp                                                           |
| Tournament            | Four-player competition, organizer and status                                                                         |
| TournamentParticipant | Unique tournament/user membership and elimination                                                                     |
| PasswordReset         | SHA-256 token hash, expiry and user FK                                                                                |

Profile/Rating/Plan are intentionally columns of User. Ship/Shot are embedded in Game.state; duplicating them into separate tables would require synchronization between two sources of truth. Achievements are a finite code catalog in application code with relational unlock records. Tournament.creatorId is an organizer reference checked by the API; participant relations use foreign keys.

Create a PostgreSQL database and role, set DATABASE_URL, then run `npm run db:migrate`. `npm run db:dev -- --name change` creates future migrations. Never use development migration reset on production.

Development seed needs explicitly set DEMO_EMAIL and DEMO_PASSWORD (12+ characters). `npm run db:seed` adds an unplayed development account; it never manufactures leaderboard entries, matches or victories, and refuses NODE_ENV=production. No seed is necessary for the product to work.

The optional Windows helper (`npm run db:local`) starts embedded PostgreSQL on 54329, creates a private random session secret and .env only if absent, and puts its data in an ASCII temp path to avoid Windows Unicode binary problems. It refuses to overwrite an existing external DB configuration. Keep that process running; persistent data can still be removed by OS temp cleanup, so use a managed DB for deployment.
