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

## Frontend

```sh
cd frontend
cp .env.local.example .env.local
npm run dev
```

## Backend

```sh
cd backend
cp .env.example .env
php artisan key:generate
# Point DB_* at a running Postgres instance (see .env.example), then:
php artisan migrate
php artisan serve
```

Requires a running PostgreSQL and Redis instance locally (no defaults are
bundled — DigitalOcean Managed Postgres / Managed Redis in production, see
"Hosting and domain" in the plan).

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
