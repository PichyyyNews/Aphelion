# Docker Desktop / Registration incident runbook

**Date:** 2026-07-15  
**Scope:** Local development on Windows, `D:\Aphelion`

## Symptoms

- `docker version` showed only the Client and failed to connect to `//./pipe/dockerDesktopLinuxEngine`.
- `docker compose up -d postgres redis` could not pull or start containers.
- `/api/auth/register` returned `500`, then `503` after the API was made defensive.
- The register page attempted `response.json()` on an empty error response and raised `Unexpected end of JSON input`.

## Root cause

Docker Desktop's Linux backend had not started. `wsl -l -v` showed `docker-desktop` as `Stopped`, and its named pipe did not exist. Docker Desktop was also stuck during shutdown because `com.docker.build.exe` and several Docker Desktop frontend processes remained alive.

Without the backend, Postgres and Redis could not run. The auth API therefore had no reachable database.

## Fast diagnosis

Run from PowerShell:

```powershell
wsl -l -v
Test-Path '\\.\pipe\dockerDesktopLinuxEngine'
docker version
docker compose ps
```

Healthy expected state:

- `docker-desktop` is `Running` and version `2`.
- The named-pipe test returns `True`.
- `docker version` prints both Client and Server.

## Recovery procedure

Use an elevated PowerShell when service commands require it.

```powershell
# Stop only stuck Docker processes; this does not delete Docker volumes or images.
Get-Process -Name 'Docker Desktop','com.docker.build','com.docker.backend' -ErrorAction SilentlyContinue |
  Stop-Process -Force

wsl --shutdown
Start-Service com.docker.service
Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
```

Wait until this succeeds:

```powershell
Test-Path '\\.\pipe\dockerDesktopLinuxEngine'
docker version --format 'server={{.Server.Version}}'
```

Then start the application services:

```powershell
cd D:\Aphelion
docker compose up -d postgres redis
docker compose exec -T postgres pg_isready -U aphelion -d aphelion
docker compose run --rm --no-deps app ./node_modules/.bin/prisma db push
docker compose up -d app
docker compose ps
```

The database is ready only when `pg_isready` reports `accepting connections` and Compose reports Postgres as `healthy`.

## Why Prisma was run in the app container

Running `npm run db:push` on Windows returned a blank `Schema engine error`, despite Postgres being healthy. The same command inside the `app` container succeeded because it connected through the Compose hostname `postgres:5432`:

```powershell
docker compose run --rm --no-deps app ./node_modules/.bin/prisma db push
```

Use this container command for schema sync until the local Windows Prisma schema-engine issue is separately diagnosed.

## Docker build is slow and can look like an error

`docker compose build app` is expected to take longer than a normal frontend build on this machine. The successful rebuild on 2026-07-15 took about **153 seconds**. The slow stages were:

- `next build` compiles and type-checks the application.
- Docker exports and unpacks the final image layers.
- The final image copies `node_modules`, which is a large layer on Windows/WSL.

### Important: timeout is not always a failed build

The terminal runner can stop waiting after a short timeout and report exit code `124`. This only means the **caller stopped waiting**; it does not prove Docker or the build failed. Check the actual state before rebuilding again:

```powershell
docker images aphelion-app --format '{{.ID}} {{.CreatedSince}}'
docker compose ps
docker compose logs --tail 30 app
```

If the build output ends with `Image aphelion-app Built`, it succeeded. Recreate only the app container afterward:

```powershell
docker compose up -d --force-recreate app
```

### Known real Docker build failure

Docker Desktop previously got stuck on `com.docker.build.exe`. The UI showed a service error similar to:

```text
com.docker.build: exit status 0xffffffff
```

This is a Docker Desktop backend issue, not an application source error. Follow the **Recovery procedure** above: stop the stuck Docker processes, run `wsl --shutdown`, start `com.docker.service`, and reopen Docker Desktop. Confirm the named pipe exists before starting another build.

### Avoid unnecessary rebuilds

Do not rebuild to start only Postgres/Redis or after changing runtime database data:

```powershell
docker compose up -d postgres redis
```

Build/recreate `app` only after source code, `Dockerfile`, package dependencies, or build-time configuration has changed.

## Registration API hardening

The endpoint now returns JSON even when database access fails:

```json
{ "error": "Registration service unavailable. Check the database connection." }
```

The register page also safely handles malformed or empty error bodies. A database outage should now show an error message, not an unhandled JSON parsing exception.

## Verification

```powershell
docker compose ps
Invoke-WebRequest -UseBasicParsing http://localhost:3000/register
```

Expected: `app`, `postgres`, and `redis` are running; Postgres is healthy; `/register` returns HTTP `200`.

## Do not do first

Do **not** use Docker Desktop **Reset to factory defaults** as the first action. It can remove local images, containers, and volumes. Use the stuck-process/WSL restart procedure above first.
