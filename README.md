# Aphelion

Aphelion is a Next.js authentication application with email/password access, OAuth-ready provider settings, PostgreSQL, Redis, Prisma, and a 3D globe authentication experience.

## Stack

- Next.js 14, React 18, TypeScript, Tailwind CSS
- PostgreSQL + Prisma
- Redis
- Docker Compose
- Three.js / D3 Geo for the globe

## Prerequisites

- Docker Desktop with the WSL 2 backend running
- Node.js 20+ only when running without the application container

## Quick start with Docker

1. Create the local environment file.

   ```powershell
   Copy-Item .env.example .env
   ```

2. Change `AUTH_SECRET` and the initial admin password in `.env` before using outside local development.

3. Start the application and dependencies.

   ```powershell
   docker compose up -d --build
   ```

4. Open [http://localhost:3000](http://localhost:3000).

The container runs Prisma schema sync before it starts Next.js. Check status with:

```powershell
docker compose ps
docker compose logs --tail 50 app
```

Expected services:

- `app`: `http://localhost:3000`
- `postgres`: host port `5432`
- `redis`: host port `6379`

## Private admin panel

The admin panel is intentionally not linked from the application UI.

1. Sign in with the seeded admin account (`INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`).
2. Open `/$ADMIN_PANEL_PATH` directly. The local default is `/control-room`.
3. Enter `ADMIN_PANEL_PASSWORD` for a second, 30-minute admin access gate.

Both the middleware and every admin API verify the admin role. The server also checks the access-gate cookie, so knowing the URL alone does not grant access.

## Development without the app container

Start only the backing services:

```powershell
docker compose up -d postgres redis
```

For a locally started Next.js process, use host addresses instead of Compose service names:

```powershell
$env:DATABASE_URL = 'postgresql://aphelion:aphelion@localhost:5432/aphelion'
$env:REDIS_URL = 'redis://localhost:6379'
npm install
npm run dev
```

On this Windows environment, run Prisma schema sync inside the application container:

```powershell
docker compose run --rm --no-deps app ./node_modules/.bin/prisma db push
```

## Commands

```powershell
npm run dev        # Next.js development server
npm run build      # Prisma generate + production build
npm run start      # Run the production build
npm run lint       # Lint the project
npm run db:push    # Sync Prisma schema
npm run db:seed    # Seed the initial admin
```

## Authentication

- Register: `/register`
- Sign in: `/login`
- Dashboard: `/dashboard`
- Admin settings: `/admin/settings`

The registration endpoint returns a clear `503` JSON response if the database is unavailable, so the UI does not fail with an empty-response JSON parsing error.

## Troubleshooting

If `docker version` cannot find `dockerDesktopLinuxEngine`, Docker's Linux backend is not ready. Do not reset Docker Desktop first. See the recovery commands and build notes in [DOC/docker-registration-incident.md](DOC/docker-registration-incident.md).

## Documentation

- [Auth system plan](DOC/nextjs-auth-system-plan.md)
- [Docker Desktop and registration incident runbook](DOC/docker-registration-incident.md)
- [Project handoff](DOC/handoff-2026-07-15.md)

## Security notes

- Never commit `.env` or real OAuth secrets.
- Replace all default local credentials before deploying.
- Use a long, random `AUTH_SECRET` in every non-local environment.
