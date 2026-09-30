# Deployment

## Recommended: Docker Node service + managed PostgreSQL

1. Provision PostgreSQL 17+; obtain a TLS connection URL and least-privilege application role.
2. Set DATABASE_URL, SESSION_SECRET (random 32+ characters), APP_URL to the public HTTPS origin. Optional RESEND_API_KEY and EMAIL_FROM enable recovery emails.
3. Run `npm ci`, `npm run db:migrate`, `npm run build` in CI/release stage. Migrations must run with database access before web traffic is routed.
4. Build the supplied Dockerfile and deploy to a service supporting persistent Node HTTP connections (Railway, Render, Fly or your VPS). It runs the standalone server as non-root.
5. Terminate HTTPS, forward original Host, disable proxy buffering for `/api/games/*/stream`, set a suitable streaming timeout. SESSION cookies are Secure in production; production auth requires HTTPS.
6. Smoke-test registration/login, both clients' ready/shots, refresh, opponent concealment and all viewport widths. Configure backup/restore and centralized errors before a public launch.

Docker Compose is a local reference, not a managed production security configuration. Set POSTGRES_PASSWORD and SESSION_SECRET; `docker compose up -d db`, apply migrations against localhost PostgreSQL, then `docker compose up --build web`. The database port binds only localhost. Container build needs registry network access. The app container does not silently mutate the schema on each boot.

## Vercel alternative

Import the repository as Next.js; use `npm run build`; set env vars and use a managed PostgreSQL pool URL with appropriate connection limits. Apply migrations in release CI. SSE will reconnect when the function reaches its configured duration; verify current plan limits. For sustained high concurrency, put realtime into a persistent service or Supabase/Redis transport. Do not claim unlimited realtime on a short-lived serverless function.

No Supabase keys or auth redirects are needed: this implementation uses same-origin custom auth and PostgreSQL. Password email links use APP_URL. Do not add unused secrets.

## Current publication status

Local production build is verified. No hosting account, deployment token, GitHub repository or domain was supplied, so no external production URL or GitHub publication has been created. Do not invent a demo link or claim production smoke tests were performed. The generated files are ready for the release steps above.
