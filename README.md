# Semestra

Monorepo layout — see `mdfile/semester-command-center.md` for the full product
plan, `mdfile/DESIGN.md` for the design system, and `mdfile/*.html` for
diagrams. Both apps below are skeletons only — no domain logic yet.

```text
frontend/   Next.js 16, TypeScript, Tailwind CSS 4 — consumes the API below,
            no direct database access.
backend/    Laravel 13, PostgreSQL, Sanctum SPA auth — JSON API only,
            no Blade views.
```

## Local dev — Docker (recommended)

```sh
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
# Edit backend/.env: DB_HOST=postgres, REDIS_HOST=redis (see comments in the file)
php -r "echo 'base64:'.base64_encode(random_bytes(32));"   # paste into backend/.env APP_KEY

docker compose up -d postgres redis
docker exec semestra-backend-1 php artisan migrate   # after backend is up once
docker compose up -d
```

Frontend: http://localhost:3000 · Backend: http://localhost:8000 · Postgres: `localhost:5432` · Redis: `localhost:6380` (host-mapped off the default 6379 to dodge local port collisions — internal container-to-container traffic still uses 6379).

`docker-compose.yml` is dev-only (hot reload, bind-mounted source). Production is `.do/app.yaml` on DigitalOcean App Platform, built from the same repo's `frontend/Dockerfile` / `backend/Dockerfile` (prod, multi-stage — not the compose dev images).

## Local dev — without Docker

```sh
cd frontend && cp .env.local.example .env.local && npm run dev
```

```sh
cd backend && cp .env.example .env && php artisan key:generate
# Point DB_* at a running Postgres instance (see .env.example), then:
php artisan migrate && php artisan serve
```

Requires your own running PostgreSQL and Redis instance — nothing is bundled.

## CI/CD

- **CI**: `.github/workflows/ci.yml` — lint/typecheck/vitest/build for the frontend, Pint + migrate + `php artisan test` (including the `app/Engine/` fixture suite) against a real Postgres service container for the backend. Runs on every PR and push to `main`.
- **CD**: `.do/app.yaml` — DigitalOcean App Platform spec. Auto-deploys `main` after CI passes (branch protection gates this); migrations run as a `PRE_DEPLOY` job before traffic shifts to the new release, never inline in the app boot. First-time setup: `doctl apps create --spec .do/app.yaml`, then fill in the `SECRET`-typed env vars (APP_KEY, DO Spaces keys, OpenAI key) via the DO dashboard or `doctl apps update` — never in the spec file itself.

## Notes

- Auth: Laravel Sanctum SPA token auth — frontend and API are on separate
  subdomains (`app.<domain>` / `api.<domain>`), see CORS + `SANCTUM_STATEFUL_DOMAINS`
  in `backend/.env.example`.
- Planning engine: `backend/app/Engine/` — framework-agnostic PHP, no
  Eloquent/DB access, fixture-tested from `backend/tests/Unit/Engine/`. See
  its README for the boundary rule.
- File storage: DigitalOcean Spaces (`spaces` disk in
  `backend/config/filesystems.php`), replacing Supabase Storage.
- Nothing beyond this skeleton has been implemented — no models, migrations,
  routes, or UI beyond framework defaults.
