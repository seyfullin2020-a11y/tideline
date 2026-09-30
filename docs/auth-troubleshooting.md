# Authentication on Vercel

Login and registration use PostgreSQL and signed, HttpOnly session cookies. A successful
Vercel build does not query the account database or apply migrations.

## Environment and migrations

1. In Vercel, open the TIDELINE project → Settings → Environment Variables.
2. Set `DATABASE_URL` for **Production** to your cloud PostgreSQL connection URL. Do not
   use the localhost URL from `.env.example`. Copy the provider's complete URL, including
   its SSL parameters, without additional quotation marks. Never send it in chat or logs.
3. Set `SESSION_SECRET` for Production to a stable, randomly generated secret of at least
   32 characters. The `replace-...` example is rejected. Changing this secret invalidates
   existing sessions. Keep the same value across production deployments.
4. Set `APP_URL` to the public HTTPS origin. This variable is used for password recovery;
   it is not a database connection or the JWT signing secret.
5. Apply the checked-in migrations to the **same production database**. For an automated
   release, set Settings → Build and Deployment → Build Command to:
   `npx prisma generate && npx prisma migrate deploy && npx next build`.
   The production database must be reachable from the build environment. Use a separate
   database for Preview deployments; do not point preview builds at production.
   If your provider's transaction pooler cannot run migrations, apply
   `npx prisma migrate deploy` from a secure release environment using its direct
   PostgreSQL connection as `DATABASE_URL`, then build normally with `npm run build`.
   Never use `migrate reset` on production.
6. Open Deployments → Redeploy after changing environment variables or the build command.
   Existing deployments do not receive changed environment variables automatically.
7. Verify login, refresh `/dashboard`, and check that `/api/auth/me` still returns the
   signed-in user. Logout must subsequently make `/api/community` return 401.

## Safe diagnostics

In Vercel → Logs, filter POST `/api/auth/login` and look for `auth_failure`.
The application logs only a fixed diagnostic identifier and a Prisma error code;
it never logs submitted credentials, JWTs, raw Prisma messages, SQL, or connection URLs.

| Diagnostic                                              | Required action                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| AUTH_DATABASE_URL_MISSING / AUTH_DATABASE_CONFIGURATION | Set `DATABASE_URL` in Production and redeploy                             |
| AUTH_SESSION_SECRET_INVALID                             | Set a valid `SESSION_SECRET` in Production and redeploy                   |
| AUTH_DATABASE_CREDENTIALS / P1000                       | Correct the database role credentials in `DATABASE_URL`                   |
| AUTH_DATABASE_UNREACHABLE / P1001                       | Check cloud database availability, connection endpoint and network access |
| AUTH_DATABASE_TIMEOUT / P1002                           | Check database availability and connection limits                         |
| AUTH_DATABASE_MIGRATIONS / P2021 / P2022                | Apply the migrations to the database actually used by this deployment     |

An incorrect password continues to return 401; database outages return 503. A database
outage while recovering an existing session is no longer silently treated as logout.

The production root cause must be confirmed with its API response and runtime logs.
Local test results cannot prove the production database configuration is correct.
