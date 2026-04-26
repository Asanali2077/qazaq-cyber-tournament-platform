# Qazaq Cyber Tournament Platform

A full-stack esports tournament management platform built as an npm workspaces monorepo. It includes a Next.js frontend (`apps/web`), an Express + Prisma API (`apps/api`), PostgreSQL persistence, role-based authentication with JWT in HTTP-only cookies, live tournament updates via Socket.IO, and an admin control surface for approvals, bracket generation, and match operations.

## Features

### Authentication & Access Control
- JWT-based auth with cookie sessions (`qazaq_token` by default)
- Register and login flows for `PLAYER` and `ORGANIZER`
- Seeded `ADMIN` account for local testing
- Route/session protection in frontend middleware for `/dashboard` and `/admin`
- Backend role guards for privileged admin/organizer actions

### Team Management
- Create team (captain-based ownership)
- Join team by invite code
- View current team, members, and tournament participation
- One-team membership constraint per user

### Tournament Management
- Public tournament listing and details
- Team registration to tournament by captain only
- Registration status workflow (`PENDING`, `APPROVED`, `REJECTED`)
- Tournament lifecycle states (`REGISTRATION`, `READY`, `LIVE`, `FINISHED`)

### Brackets & Match Flow
- Single elimination bracket generation
- Double elimination bracket generation (basic implementation)
- Automatic winner/loser propagation through bracket tree
- Match result recording and progression

### Admin Control Center
- Tournament overview and management
- Approve/reject participants
- Generate or reset brackets
- Enter results for live matches
- Edit locked completed matches with replay logic for downstream dependencies

### Realtime Updates
- Socket.IO room subscription per tournament
- Event-based bracket/participant/match refresh notifications
- Frontend polling fallback on tournament detail page when socket is unavailable

---

## Architecture Overview

### High-Level Flow
1. **Frontend (`apps/web`)** calls API endpoints using `fetch` with `credentials: "include"`.
2. **Backend (`apps/api`)** validates inputs (Zod), handles business logic, and persists data via Prisma.
3. **PostgreSQL** stores users, teams, tournaments, participants, and matches.
4. **Auth**: API sets JWT in HTTP-only cookie; protected endpoints read/verify cookie token.
5. **Realtime**: API emits tournament update events through Socket.IO; frontend listens and refreshes state.

### API Routing
- API base path: `/api`
- Main route modules:
  - `/api/auth`
  - `/api/teams`
  - `/api/tournaments`
  - `/api/dashboard`
  - `/api/admin`
  - `/api/health`

### Frontend-to-Backend Base URL
- Current frontend client uses `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000/api`).
- If you choose to use relative `/api` URLs in frontend, you must add a Next.js rewrite/proxy (`/api/:path* -> http://localhost:4000/api/:path*`).

---

## Tech Stack

### Frontend (`apps/web`)
- Next.js `^14.2.0`
- React `^18.3.1`
- TypeScript `^5.8.3`
- Tailwind CSS `^3.4.17`
- Framer Motion `^12.10.5`
- React Hook Form `^7.56.4` + Zod resolver `^3.10.0`
- Socket.IO Client `^4.8.1`
- Sonner `^2.0.3`
- Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-slot`)

### Backend (`apps/api`)
- Express `^4.21.2`
- Prisma ORM / Prisma Client `^6.7.0`
- PostgreSQL (via Prisma datasource)
- Socket.IO `^4.8.1`
- JWT (`jsonwebtoken` `^9.0.2`)
- bcryptjs `^3.0.2`
- Zod `^3.24.4`
- CORS, Helmet, Morgan, cookie-parser

### Tooling / Monorepo
- npm workspaces
- concurrently `^9.1.2`
- dotenv-cli `^8.0.0`
- tsx `^4.19.3`

### Containers
- PostgreSQL image: `postgres:16-alpine`
- Node runtime in Dockerfiles: `node:22-alpine`

---

## Project Structure

```text
.
├── apps
│   ├── api
│   │   ├── prisma
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src
│   │   │   ├── config
│   │   │   ├── lib
│   │   │   ├── middlewares
│   │   │   ├── modules
│   │   │   │   ├── auth
│   │   │   │   ├── teams
│   │   │   │   ├── tournaments
│   │   │   │   ├── dashboard
│   │   │   │   └── admin
│   │   │   ├── routes.ts
│   │   │   └── server.ts
│   │   └── Dockerfile
│   └── web
│       ├── src
│       │   ├── app
│       │   ├── components
│       │   ├── lib
│       │   └── middleware.ts
│       └── Dockerfile
├── docker-compose.yml
├── package.json
└── .env.example
```

---

## Environment Variables

Define these in root `.env` (used by root scripts and API runtime):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qazaq_cyber?schema=public"
JWT_SECRET="super-secret-jwt-key-change-me"
API_PORT=4000
WEB_PORT=3000
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
COOKIE_NAME="qazaq_token"
```

### Variable Reference
- `DATABASE_URL`: Prisma PostgreSQL connection string.
- `JWT_SECRET`: JWT signing/verification secret (minimum 16 chars enforced).
- `API_PORT`: Express + Socket.IO port.
- `WEB_PORT`: Used by backend CORS/socket origin allowlist (`http://localhost:${WEB_PORT}`).
- `NEXT_PUBLIC_API_URL`: Frontend API base URL.
- `NEXT_PUBLIC_SOCKET_URL`: Frontend socket server URL.
- `COOKIE_NAME`: Name of auth cookie (also used by frontend middleware).

---

## Local Setup

## 1) Prerequisites
- Node.js 18+ (Node 20/22 recommended)
- npm
- Docker Desktop
- Git

## 2) Clone repository
```bash
git clone <your-repo-url>
cd qazaq-cyber-tournament-platform
```

## 3) Create environment file
```bash
cp .env.example .env
```

On Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

## 4) Install dependencies
```bash
npm install
```

`postinstall` automatically runs Prisma client generation for API.

## 5) Start PostgreSQL
```bash
docker compose up -d db
```

## 6) Prepare database schema + seed data
```bash
npm run db:setup
```

This runs:
1. Prisma generate
2. Prisma db push
3. Prisma seed

## 7) Start development servers
```bash
npm run dev
```

This runs API and web concurrently from the monorepo root.

---

## Running the Project

After startup:

- Frontend: `http://localhost:3000`
- API base: `http://localhost:4000/api`
- Health check: `http://localhost:4000/api/health`

---

## Demo Credentials

Seed script creates these primary demo accounts:

- Admin: `admin@qazaq.gg` / `Demo12345`
- Organizer: `organizer@qazaq.gg` / `Demo12345`
- Player: `aruzhan@qazaq.gg` / `Demo12345`

---

## Scripts

## Root (`package.json`)
- `npm run dev` — start API and web in dev mode
- `npm run build` — build API then web
- `npm run lint` — TypeScript checks for both workspaces
- `npm run db:generate` — Prisma client generation
- `npm run db:push` — push Prisma schema to DB
- `npm run db:seed` — seed demo data
- `npm run db:setup` — generate + push + seed

## API (`@qazaq/api`)
- `npm run dev --workspace @qazaq/api` — watch mode (`tsx`)
- `npm run build --workspace @qazaq/api` — TypeScript build
- `npm run start --workspace @qazaq/api` — start compiled API
- `npm run lint --workspace @qazaq/api` — type check
- `npm run prisma:generate --workspace @qazaq/api`
- `npm run prisma:push --workspace @qazaq/api`
- `npm run prisma:seed --workspace @qazaq/api`

## Web (`@qazaq/web`)
- `npm run dev --workspace @qazaq/web` — Next dev server on 3000
- `npm run build --workspace @qazaq/web` — Next production build
- `npm run start --workspace @qazaq/web` — Next production server
- `npm run lint --workspace @qazaq/web` — type check

---

## Docker

## DB only (recommended for local development)
```bash
docker compose up -d db
```

## Full stack
```bash
docker compose up --build
```

Services:
- `db`: Postgres 16
- `api`: Express API on `4000`
- `web`: Next app on `3000`

---

## How It Works

### Auth session flow
1. User logs in/registers via `/api/auth/login` or `/api/auth/register`.
2. API signs JWT (`id`, `email`, `role`, `name`) and sets HTTP-only cookie.
3. Frontend loads session via `/api/auth/me` through `AuthProvider`.
4. Protected API endpoints use `requireAuth` middleware to validate cookie token.
5. Role-protected endpoints additionally use `requireRole`.

### Tournament flow
1. Organizer/Admin creates tournament.
2. Team captains register team during `REGISTRATION`.
3. Admin/Organizer approves participants.
4. Admin generates bracket when registration is closed and at least 2 teams approved.
5. Match results update bracket progression and realtime events.

### Team join flow
1. User creates team or joins existing team via invite code.
2. Team captain registers team to tournament from tournament detail page.
3. Registration creates a `PENDING` participant awaiting approval.

---

## Troubleshooting

## 1) Database connection errors
Symptoms:
- API fails on startup with Prisma connection errors.

Checks:
- Ensure DB container is running: `docker compose ps`
- Verify `DATABASE_URL` host/port/credentials in `.env`
- Confirm port `5432` is free and mapped.

## 2) Prisma client/schema issues
Symptoms:
- Runtime errors about missing Prisma client or schema mismatch.

Fix:
```bash
npm run db:generate
npm run db:push
```
If needed, reseed:
```bash
npm run db:seed
```

## 3) Cookie/auth not persisting
Symptoms:
- Login succeeds but `/auth/me` fails unauthenticated.

Checks:
- Frontend requests must include credentials (`apiFetch` already uses `credentials: "include"`).
- API CORS must allow `http://localhost:3000` with `credentials: true`.
- `COOKIE_NAME` must match both backend and frontend middleware expectations.
- Ensure frontend and backend are both on `localhost` (not mixed `127.0.0.1`/hostname).

## 4) `/api/...` returns 404 from frontend
Cause:
- Frontend currently uses `NEXT_PUBLIC_API_URL` (absolute URL by default).
- If you change frontend to relative `/api` calls, Next.js rewrite is required.

Fix option:
- Keep `NEXT_PUBLIC_API_URL="http://localhost:4000/api"`, or
- Add rewrite in `apps/web/next.config.mjs`:
  - `/api/:path* -> http://localhost:4000/api/:path*`

## 5) Port conflicts
Symptoms:
- `EADDRINUSE` on `3000` or `4000`.

Fix:
- Stop conflicting process, or
- Change `WEB_PORT` / `API_PORT` and adjust frontend env URLs accordingly.

## 6) Missing/invalid environment values
Symptoms:
- API crashes at boot due to zod env validation.

Checks:
- Ensure all required variables exist in `.env`.
- `JWT_SECRET` must be at least 16 characters.

## 7) “Register team”/join tournament blocked
Expected constraints:
- User must be authenticated.
- User must be captain of selected team.
- Tournament must be in `REGISTRATION`.
- Registration close date must not be past.
- Team cannot already be registered.

---

## Notes & Limitations

- Double elimination implementation is a **basic variant** supporting brackets up to 8 approved teams.
- Match draws are not allowed.
- Completed matches are locked by default; editing requires explicit force-edit flow in admin and can replay downstream bracket path.
- API uses `prisma db push` (schema sync) rather than migration files.
- Frontend route middleware checks cookie presence only (authorization logic is still enforced by backend).
