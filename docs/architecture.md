# Architecture Plan

TIDELINE is a Next.js App Router application. The plan was established before implementation in an empty workspace. The original Narxoz document was not supplied; the checklist is based on the written requirements in this conversation.

## Frontend

React + strict TypeScript, custom CSS design tokens, Lucide icons. Server page shells and focused client components: mode selection, placement, board, game screen, trainer, account panels. Three themes use CSS variables. Mobile gameplay switches between defense and attack boards. Native buttons support keyboard navigation, labelled coordinates and visible focus; reduced motion is respected. No UI template was borrowed.

## Backend and database

Next.js Route Handlers with Zod input validation and Prisma/PostgreSQL. Game mutations take a PostgreSQL row lock inside a transaction, validate the participant and rules, then atomically save state and events. Completion locks user rows in sorted order before applying Elo and streaks. This prevents duplicate result settlement and competing games from overwriting streaks.

The private state is stored as a versioned JSON aggregate in Game. Ships and shots are embedded in that aggregate to make state transitions atomic. GamePlayer and GameEvent are relational. User includes profile, rating and subscription fields rather than creating unnecessary one-to-one tables. Foreign keys, unique constraints and indexes are in the migration.

## Authentication

Bcrypt hashes, signed HS256 session cookie (HttpOnly, SameSite=Lax, Secure under production HTTPS), 7-day expiry, mandatory 32+ character SESSION_SECRET. Password recovery uses random one-use hashed tokens with a 1-hour expiry and an optional Resend adapter. Reset increments a session version to invalidate previous tokens. No public shared demo password is seeded by default.

## Realtime

Client writes use authenticated HTTP POST. SSE pushes participant-specific public snapshots. Each stream checks PostgreSQL every second and sends only new versions plus periodic presence refreshes. EventSource reconnects automatically. Database persistence makes reconnect work across server restarts and devices with the same account. This small deployment architecture trades query volume for a simple, auditable implementation. Upgrade to PostgreSQL LISTEN/NOTIFY or Redis pub/sub before large-scale usage.

## Game, AI and trainer

Pure TypeScript engine has no React or database dependencies. Four AI levels receive only Knowledge (shot outcomes and ship lengths). Trainer reconstructs knowledge before each move; replay uses the ordered event history. Guest AI runs locally and is unranked. Authenticated AI runs on the server and hides its fleet from API responses.

## Matchmaking, social and tournaments

Quick Match uses a PostgreSQL advisory transaction lock to pair real waiting users. Old waiting rooms are excluded after 10 minutes. Friends require a recipient's acceptance. Presence uses lastSeen heartbeats and a 90-second threshold. Four-player single-elimination tournaments create actual games; the organizer starts rounds after all current games finish. A surrender settles a game as a loss.

## Monetization and state

Demo PRO stores the plan in PostgreSQL for signed-in players or localStorage for guests. Server checks Expert entitlement; replay and advanced analytics unlock in the interface. It never charges money. Ocean/Tactical/Arctic themes are available to everyone so appearance remains accessible. React state is enough for this scope; localStorage stores only casual guest games, preferences and guest demo entitlement.

## Security and operations

Same-origin checks on mutations, parameterized database queries, restricted DTO projection, server-owned results, in-process rate limiting, no frontend secrets. The production baseline assumes HTTPS. Distributed rate limiting, email verification, stronger abuse protection and observability remain launch-hardening work.

## Testing and deployment

Vitest verifies engine invariants, AI legality and simulations. Playwright exercises a full guest match, responsive layout, real multiplayer, auth/social/PRO and complete tournament advancement. PostgreSQL migrations are reproducible. Next.js standalone Docker build is the primary deployment path because it supports long-lived SSE; Vercel is possible with duration limits and reconnection. See deployment.md.
