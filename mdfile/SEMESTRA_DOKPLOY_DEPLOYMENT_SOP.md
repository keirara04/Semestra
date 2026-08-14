# Semestra Deployment SOP
## DigitalOcean + Dokploy: Production and Development on One Droplet

**Project:** Semestra  
**Hosting:** DigitalOcean  
**Deployment panel:** Dokploy  
**Production branch:** `main`  
**Development branch:** `development`  
**Architecture:** One Droplet, two isolated environments

---

# 1. Purpose

This SOP defines the standard deployment architecture and workflow for running **Semestra production and development environments on a single DigitalOcean Droplet using Dokploy**.

The objective is to maintain:

- a stable production environment for real users,
- a separate development/staging environment for testing,
- separate databases and environment variables,
- separate frontend/backend deployments,
- isolated object-storage paths,
- predictable Git-based deployments,
- a clear promotion and rollback process.

The core rule is:

> Development may share compute infrastructure with production, but must never share production state, identity, or side effects.

Side effects include things that are not database state but can still cause a production incident:

- emails,
- queue jobs,
- webhooks,
- file writes,
- payment events,
- notifications.

---

# 2. High-Level Architecture

```text
                         DIGITALOCEAN DROPLET
                                │
                             Dokploy
                                │
                             Traefik
                                │
               ┌────────────────┴────────────────┐
               │                                 │
        PRODUCTION STACK                  DEVELOPMENT STACK
               │                                 │
       ┌───────┴────────┐                ┌───────┴────────┐
       │                │                │                │
   Next.js PROD    Laravel PROD      Next.js DEV     Laravel DEV
       │                │                │                │
 semestra.com   api.semestra.com   dev.semestra.com  api-dev.semestra.com
       │                │                │                │
       └──── semestra_prod_db             └──── semestra_dev_db
```

Both environments may share:

- the same DigitalOcean Droplet,
- Dokploy,
- Traefik,
- the same PostgreSQL server/container.

They must not share:

- database names,
- database credentials,
- environment variables,
- production storage prefixes,
- production secrets,
- production URLs.

---

# 3. Domain Structure

Recommended hostnames:

```text
Production frontend
https://semestra.com

Production backend
https://api.semestra.com

Development frontend
https://dev.semestra.com

Development backend
https://api-dev.semestra.com
```

All four hostnames may point to the same Droplet IP. Dokploy/Traefik routes requests to the correct container based on hostname.

---

# 4. DNS Configuration

Create DNS records pointing to the DigitalOcean Droplet IP:

```text
A     @          → DROPLET_IP
A     api        → DROPLET_IP
A     dev        → DROPLET_IP
A     api-dev    → DROPLET_IP
```

Optional:

```text
CNAME www → semestra.com
```

Expected result:

```text
semestra.com            → production frontend
api.semestra.com        → production Laravel API
dev.semestra.com        → development frontend
api-dev.semestra.com    → development Laravel API
```

---

# 5. Git Branch Strategy

```text
main
└── production-ready code

development
└── development/staging code

feature/*
└── individual features
```

Standard flow:

```text
feature/notestra
      ↓
   development
      ↓
dev.semestra.com
      ↓
 testing
      ↓
     main
      ↓
semestra.com
```

Rules:

- `main` always represents production.
- `development` always represents development/staging.
- Feature branches merge into `development` first.
- Production changes should normally reach `main` only after testing on development.
- Emergency fixes may use `hotfix/*` branches.

Hotfix flow:

```text
hotfix/login-crash
      ↓
     main
      ↓
 production
      ↓
   development
```

---

# 6. Dokploy Project Structure

Recommended structure:

```text
Semestra
│
├── Production
│   ├── semestra-frontend-prod
│   ├── semestra-backend-prod
│   └── semestra-worker-prod
│
├── Development
│   ├── semestra-frontend-dev
│   ├── semestra-backend-dev
│   └── semestra-worker-dev
│
├── semestra-postgres
└── semestra-redis
```

The shared PostgreSQL instance may contain:

```text
semestra_prod
semestra_dev
```

Prefer separate database users for each environment.

---

# 7. Service Startup Order & Health Checks

Laravel (backend and workers) depends on PostgreSQL and Redis being ready. If Dokploy starts containers in parallel, the backend can boot before its dependencies are reachable and crash-loop.

Recommended:

- configure Dokploy health checks on `semestra-postgres` and `semestra-redis` so they report ready before dependents start,
- configure Dokploy service dependencies (or startup order) so `semestra-backend-*` and `semestra-worker-*` wait on `semestra-postgres` and `semestra-redis`,
- expose a lightweight health endpoint per backend (see Monitoring) so Dokploy/Traefik can detect a container that started but is not actually healthy,
- add basic retry/backoff in the Laravel DB/Redis connection config rather than assuming instant availability on cold start.

This mainly matters after a full Droplet restart or when the stack is brought up from cold, not on routine single-service redeploys.

---

# 8. Production Frontend

**Branch:**

```text
main
```

**Dokploy application name:**

```text
semestra-frontend-prod
```

**Domain:**

```text
https://semestra.com
```

Example environment variables:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_URL=https://api.semestra.com
NEXT_PUBLIC_APP_URL=https://semestra.com
```

Production secrets must be configured in Dokploy and must never be committed to Git.

---

# 9. Development Frontend

**Branch:**

```text
development
```

**Dokploy application name:**

```text
semestra-frontend-dev
```

**Domain:**

```text
https://dev.semestra.com
```

Example environment variables:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_URL=https://api-dev.semestra.com
NEXT_PUBLIC_APP_URL=https://dev.semestra.com
```

Even though this is the development/staging environment, deploy a production Next.js build:

```bash
npm run build
npm run start
```

Do not run the public staging deployment with:

```bash
npm run dev
```

---

# 10. Production Backend

**Branch:**

```text
main
```

**Application:**

```text
semestra-backend-prod
```

**Domain:**

```text
https://api.semestra.com
```

Typical Laravel variables:

```env
APP_NAME=Semestra
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.semestra.com

FRONTEND_URL=https://semestra.com

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=semestra_prod
DB_USERNAME=semestra_prod_user
DB_PASSWORD=<strong-production-password>

SANCTUM_STATEFUL_DOMAINS=semestra.com
MATERIALS_DISK=spaces

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-production-redis-password>
REDIS_DB=0
QUEUE_CONNECTION=redis
CACHE_STORE=redis
SESSION_DRIVER=redis

QUEUE_PREFIX=semestra-prod
CACHE_PREFIX=semestra-prod
SESSION_COOKIE=semestra_session

MAIL_MAILER=<production-mail-driver>
```

Exact session/CORS/Sanctum values should match the current application implementation.

---

# 11. Development Backend

**Branch:**

```text
development
```

**Application:**

```text
semestra-backend-dev
```

**Domain:**

```text
https://api-dev.semestra.com
```

Typical variables:

```env
APP_NAME=Semestra
APP_ENV=staging
APP_DEBUG=false
APP_URL=https://api-dev.semestra.com

FRONTEND_URL=https://dev.semestra.com

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=semestra_dev
DB_USERNAME=semestra_dev_user
DB_PASSWORD=<strong-development-password>

SANCTUM_STATEFUL_DOMAINS=dev.semestra.com
MATERIALS_DISK=spaces

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-development-redis-password>
REDIS_DB=1
QUEUE_CONNECTION=redis
CACHE_STORE=redis
SESSION_DRIVER=redis

QUEUE_PREFIX=semestra-dev
CACHE_PREFIX=semestra-dev
SESSION_COOKIE=semestra_dev_session

MAIL_MAILER=log
```

Keep `APP_DEBUG=false` on any publicly accessible staging environment.

Use a separate Redis `REDIS_DB` index (or separate Redis instance) per environment so cache/queue/session keys never collide between production and development.

Use a separate `SESSION_COOKIE` name per environment. Both hostnames sit under the same parent domain (`semestra.com`), so a shared cookie name risks a development login interfering with a production login in the same browser.

---

# 12. Queue Workers

Production and development must run separate Laravel queue workers, each pointed at its own environment's config. A shared or misrouted worker can let a development job execution touch production side effects, or vice versa.

Recommended Dokploy service names:

```text
semestra-worker-prod
semestra-worker-dev
```

Each worker inherits its environment's `.env` (own `REDIS_DB`, `QUEUE_PREFIX`, `DB_DATABASE`, mail settings). Do not run a single shared worker process against both environments.

```bash
php artisan queue:work --queue=default --tries=3
```

Restart workers after every deploy that changes queued job code, since `queue:work` holds old code in memory until restarted:

```bash
php artisan queue:restart
```

---

# 13. Laravel Scheduler

If Semestra adds scheduled jobs (`php artisan schedule:run` via cron), run exactly one scheduler per environment. Running the scheduler twice for the same environment (e.g. on two containers) causes duplicate job dispatch.

Recommended:

- one cron entry per environment, each calling its own container's `artisan schedule:run` every minute,
- production scheduler must only ever load production `.env`,
- development scheduler must only ever load development `.env`,
- if Dokploy replicas are ever used for a backend service, do not let more than one replica run the scheduler; isolate it to a dedicated worker/cron container instead.

```bash
* * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1
```

---

# 14. Database Isolation

Never connect development and production to the same database.

Incorrect:

```text
Production ─┐
            ├── semestra ❌
Development ┘
```

Correct:

```text
Production → semestra_prod
Development → semestra_dev
```

Recommended PostgreSQL setup:

```text
PostgreSQL
│
├── semestra_prod
└── semestra_dev
```

Prefer different credentials:

```text
semestra_prod_user
semestra_dev_user
```

Never reuse the production database password for development.

---

# 15. Database Migrations

Development first:

```bash
php artisan migrate --force
```

Then test the development deployment.

Only after successful validation should the same migration reach production.

Production flow:

```text
development branch
      ↓
development migration
      ↓
test
      ↓
merge main
      ↓
production deployment
      ↓
production migration
```

Before production migrations:

- review the migration,
- back up production,
- avoid destructive changes where possible,
- confirm rollback implications,
- run a dry-run check first:

```bash
php artisan migrate --pretend --force
```

For risky schema changes, prefer multi-release migrations rather than dropping columns immediately.

---

# 16. DigitalOcean Spaces Separation

Semestra may use one DigitalOcean Space initially, but production and development must use separate paths.

Recommended:

```text
semestra-files/
│
├── production/
│   ├── materials/
│   ├── exports/
│   └── avatars/
│
└── development/
    ├── materials/
    ├── exports/
    └── avatars/
```

Example environment variables:

Production:

```env
STORAGE_PREFIX=production
```

Development:

```env
STORAGE_PREFIX=development
```

Later, stronger isolation may use separate Spaces:

```text
semestra-prod
semestra-dev
```

---

# 17. Notestra Storage Paths

For Notestra and course PDFs:

```text
production/materials/
production/exports/annotated/

development/materials/
development/exports/annotated/
```

Development must never write to:

```text
production/
```

---

# 18. Environment Variable Isolation

Treat production and development configuration as independent.

Separate at minimum:

- frontend URL,
- API URL,
- database name,
- database user,
- database password,
- storage prefix,
- Redis DB index/instance,
- queue/cache prefix,
- session cookie name,
- mail driver/sandbox target,
- OAuth callback URLs,
- mail settings,
- third-party API keys where practical,
- application secrets.

Never copy production `.env` into development without reviewing every value.

---

# 19. Environment File Templates

Keep a version-controlled `.env.example` per app (frontend, backend) with every key present but no real values, so a new deploy never inherits a stale or accidental production value by omission.

Recommended:

```text
.env.example              # neutral, safe to commit
.env.production.example   # documents prod-specific keys, placeholder values only
.env.development.example  # documents dev-specific keys, placeholder values only
```

Rules:

- `.env.example` files are the source of truth for which keys exist; actual values live only in Dokploy, never in Git,
- when adding a new environment variable, update the relevant `.env.example` in the same PR, so the isolation list in Section 18 stays enforceable in practice,
- do not generate a development `.env` by copying a production `.env` and editing in place; start from `.env.development.example` instead, this avoids leftover production values in keys nobody thought to check.

---

# 20. CORS and Authentication

Production should trust only expected production origins.

Example:

```env
FRONTEND_URL=https://semestra.com
SANCTUM_STATEFUL_DOMAINS=semestra.com
```

Development:

```env
FRONTEND_URL=https://dev.semestra.com
SANCTUM_STATEFUL_DOMAINS=dev.semestra.com
```

Avoid wildcard CORS in production.

---

# 21. Mail Safety (Development)

Development must never send email to real users. A staging environment that accidentally uses production mail credentials can email real students/instructors with test data.

Recommended, in order of preference:

- use `MAIL_MAILER=log` in development so mail is written to the log instead of sent,
- or route all development mail through a sandbox provider (e.g. Mailtrap, Mailhog) that cannot reach real inboxes,
- if a real transactional provider must be tested in staging, restrict recipients to an explicit allow-list of internal test addresses in application config, never real user addresses,
- never point `MAIL_MAILER`/mail credentials in development at the same provider account used by production.

Before promoting any feature that sends mail, verify the development `.env` mail block is not simply a copy of the production one.

---

# 22. HTTPS

Enable HTTPS for all hostnames:

```text
https://semestra.com
https://api.semestra.com
https://dev.semestra.com
https://api-dev.semestra.com
```

Dokploy/Traefik should handle routing and certificate provisioning.

After first deployment, verify all certificates and redirects.

---

# 23. Standard Feature Deployment Workflow

```text
1. Create feature branch.
2. Develop locally.
3. Commit changes.
4. Push feature branch.
5. Merge into development.
6. Dokploy deploys development.
7. Test at dev.semestra.com.
8. Fix issues if needed.
9. Repeat until stable.
10. Merge development into main.
11. Dokploy deploys main.
12. Verify production.
```

Example:

```bash
git checkout development
git pull
git checkout -b feature/notestra

# work

git add .
git commit -m "feat: add Notestra annotation workspace"
git push origin feature/notestra
```

---

# 24. Development Deployment Checklist

- [ ] Development frontend builds successfully.
- [ ] Development backend starts successfully.
- [ ] Database migrations complete successfully.
- [ ] Authentication works.
- [ ] Frontend uses `api-dev.semestra.com`.
- [ ] Backend uses `semestra_dev`.
- [ ] Development files use the development storage prefix.
- [ ] Development queue worker uses `semestra-dev` prefix and its own Redis DB.
- [ ] Development mail does not reach real users.
- [ ] No production secrets are exposed.
- [ ] Critical pages load.
- [ ] Forms submit successfully.
- [ ] Browser console has no unexpected critical errors.
- [ ] Laravel logs have no unexpected critical errors.
- [ ] New features work end-to-end.

---

# 25. Production Promotion Checklist

Before merging into `main`:

- [ ] Development is stable.
- [ ] Major flows are tested.
- [ ] Database migrations are reviewed.
- [ ] Production backup exists.
- [ ] New environment variables are configured.
- [ ] Storage changes are understood.
- [ ] Production integrations are ready.
- [ ] `APP_DEBUG=false`.
- [ ] No test secrets are hard-coded.
- [ ] Rollback plan is known.

---

# 26. Production Deployment Procedure

Dokploy rebuilds and restarts the existing container on deploy, so expect a brief downtime window (typically seconds) during production releases. Avoid deploying at peak usage hours where practical.

1. Confirm development is stable.
2. Merge into `main`.

```bash
git checkout main
git pull
git merge development
git push origin main
```

3. Let Dokploy build and deploy production.
4. Run production migrations if required.

```bash
php artisan migrate --force
```

5. Restart the production queue worker if job code changed.

```bash
php artisan queue:restart
```

6. Optimize Laravel where appropriate.

```bash
php artisan optimize
```

7. Verify:

```text
https://semestra.com
https://api.semestra.com
```

8. Perform the smoke test below.

---

# 27. Production Smoke Test

- [ ] Dashboard loads.
- [ ] Login works.
- [ ] Logout works.
- [ ] Existing user data loads.
- [ ] Courses load.
- [ ] Tasks load.
- [ ] Materials load.
- [ ] PDF/material access works.
- [ ] Notestra opens if part of the release.
- [ ] File uploads work.
- [ ] API writes succeed.
- [ ] Queued jobs process (check worker logs, not just dispatch).
- [ ] No new frontend critical errors.
- [ ] No new Laravel critical errors.

---

# 28. Rollback Procedure

If a production release is broken, redeploy the last known-good production commit.

Inspect history:

```bash
git log --oneline
```

Preferred rollback approach:

```text
bad release
    ↓
revert commit
    ↓
push main
    ↓
Dokploy redeploy
```

Example:

```bash
git revert <bad_commit>
git push origin main
```

Avoid force-resetting shared branches unless absolutely necessary.

---

# 29. Database Rollback Warning

Application rollback does not automatically mean database rollback.

Do not blindly run:

```bash
php artisan migrate:rollback
```

on production.

A rollback can destroy valid user data. Prefer:

- restoring the application first,
- checking database compatibility,
- applying a targeted corrective migration,
- restoring a backup only when necessary.

---

# 30. Backup Strategy

Production should have backups for:

- PostgreSQL,
- important object storage,
- critical configuration documentation.

Recommended database approach:

- daily automated backup,
- manual backup before risky migrations,
- multiple restore points.

A backup that has never been restored is not proven. Schedule a periodic restore test:

- restore the latest production backup into a throwaway/local database (never into `semestra_dev`),
- run migrations against it and confirm the schema matches expectations,
- spot-check a handful of tables for row counts and data integrity,
- record the date of the last successful restore test alongside the backup schedule.

Treat a backup strategy without a passing restore test as unverified, not as a working safety net.

As Semestra grows, define a separate backup/versioning policy for Spaces as well.

---

# 31. Monitoring

Monitor:

- CPU,
- RAM,
- disk usage,
- Docker/container health,
- PostgreSQL resource usage,
- Redis resource usage,
- queue worker health (process alive, queue depth, failed jobs),
- backend exceptions,
- API latency,
- storage usage.

Optional health endpoints:

```text
GET /health
GET /api/health
```

Do not expose sensitive system information in health responses.

---

# 32. Log Isolation & Retention

Production and development logs must stay separated and neither should leak personal data unnecessarily.

Rules:

- production and development each write to their own log path/stream, never a shared file or shared external log sink, so a development stack trace never lands next to production user data (and vice versa),
- Laravel logs default to local files; if Semestra later ships logs to an external service (e.g. a log aggregator), configure production and development with separate projects/API keys, same isolation rule as Section 18,
- do not log full request/response bodies for authenticated endpoints, PDFs, or material content; log identifiers (user ID, material ID) instead of raw personal data,
- `APP_DEBUG=false` in both public environments (already required by Section 31) also prevents verbose stack traces with data from leaking into HTTP responses; logs are still the correct place to capture that detail,
- set a retention window for logs (e.g. 14-30 days) and rotate/delete older logs automatically; unbounded log growth is both a disk-usage risk (Section 33 RAM/disk guidance) and a data-retention liability,
- development logs may be purged more aggressively than production, since they hold no real user data under the data policy in Section 44.

---

# 33. 4 GB RAM / 2 vCPU Guidance

A 4 GB RAM / 2 vCPU Droplet is a reasonable starting point for an early Semestra deployment with both stages.

Likely services:

```text
Dokploy
Traefik
Next.js production
Laravel production
Laravel production worker
Next.js development
Laravel development
Laravel development worker
PostgreSQL
Redis
```

Redis is used for queues, cache, and sessions, so it is not truly optional once the backend relies on `QUEUE_CONNECTION=redis`. Both environments may share one Redis container but must use separate `REDIS_DB` indexes (or separate instances) to avoid key collisions.

Watch resource pressure during:

- Next.js builds,
- Docker builds,
- simultaneous deployments,
- PDF export,
- PostgreSQL spikes.

Recommended practices:

- avoid deploying prod and dev simultaneously,
- monitor memory before large builds,
- clean unused Docker images periodically,
- avoid running public staging with hot reload,
- stop development services when not needed if resources become tight.

---

# 34. Docker Maintenance

Inspect disk usage:

```bash
docker system df
```

Safe basic cleanup example:

```bash
docker image prune
```

Do not blindly run aggressive production cleanup such as:

```bash
docker system prune -a
```

without understanding what will be removed.

---

# 35. When to Split Development onto Another Droplet

Move staging/development to a separate server when:

- production traffic becomes meaningful,
- Docker builds affect users,
- RAM regularly approaches limits,
- development failures impact production,
- database load becomes significant,
- the team grows,
- stronger security isolation is required,
- production uptime becomes business-critical.

Future layout:

```text
Production Droplet
├── production frontend
├── production backend
└── production services

Development Droplet
├── development frontend
├── development backend
└── development services
```

---

# 36. Security Rules

- [ ] Use SSH keys.
- [ ] Disable password SSH where practical.
- [ ] Keep server packages updated.
- [ ] Use HTTPS everywhere.
- [ ] Keep `APP_DEBUG=false` on public deployments.
- [ ] Never commit `.env` files.
- [ ] Separate production/development DB credentials.
- [ ] Keep object storage private.
- [ ] Use signed URLs for private PDFs/materials.
- [ ] Do not expose PostgreSQL publicly.
- [ ] Do not expose internal container ports unnecessarily.
- [ ] Restrict Dokploy access.
- [ ] Use strong unique passwords.
- [ ] Rotate compromised secrets immediately.
- [ ] Keep production secrets out of development where possible.

---

# 37. Secrets Rotation

Rotate secrets on a schedule, not only after a suspected compromise:

- database passwords (`semestra_prod_user`, `semestra_dev_user`),
- DigitalOcean Spaces access keys,
- third-party API keys,
- Redis passwords,
- application secrets (`APP_KEY`, signed-URL secrets).

Recommended cadence:

- rotate production secrets on a fixed interval (e.g. every 90 days) as a baseline, tighter if the app handles sensitive data,
- rotate immediately on suspected exposure (leaked log, committed `.env`, departing team member with access),
- rotate development secrets less urgently, but never leave them identical to production values.

Rotation procedure:

1. Generate the new secret.
2. Update it in Dokploy environment variables (not in Git).
3. Redeploy the affected service(s).
4. Verify the service starts and authenticates successfully.
5. Revoke/invalidate the old secret once the new one is confirmed working.
6. Document the rotation date.

---

# 38. Production Database Rule

The development application must never connect to:

```text
semestra_prod
```

The production application must never connect to:

```text
semestra_dev
```

Any violation should be treated as a deployment incident.

---

# 39. Production Storage Rule

Development must never write to:

```text
production/
```

Production must never depend on files that exist only under:

```text
development/
```

---

# 40. Naming Convention

Recommended Dokploy service names:

```text
semestra-frontend-prod
semestra-backend-prod
semestra-worker-prod
semestra-frontend-dev
semestra-backend-dev
semestra-worker-dev
semestra-postgres
semestra-redis
```

Use consistent environment suffixes to reduce deployment mistakes.

---

# 41. Recommended Release Model

For Semestra's current stage:

```text
Local development
        ↓
feature branch
        ↓
development
        ↓
dev.semestra.com
        ↓
manual testing
        ↓
main
        ↓
semestra.com
```

A complex enterprise CI/CD pipeline is not necessary yet.

---

# 42. Future CI/CD Upgrade

Later:

```text
Pull Request
      ↓
automated tests
      ↓
lint / type-check
      ↓
build
      ↓
merge development
      ↓
automatic staging deploy
      ↓
acceptance test
      ↓
merge main
      ↓
automatic production deploy
```

Possible GitHub Actions checks:

- frontend lint,
- TypeScript type checking,
- Next.js build,
- Laravel/Pest/PHPUnit tests,
- migration checks.

---

# 43. Emergency Hotfix SOP

```bash
git checkout main
git pull
git checkout -b hotfix/<issue>
```

Fix and test.

Then:

```bash
git add .
git commit -m "fix: <description>"
git push origin hotfix/<issue>
```

Merge into `main`, deploy, then merge/cherry-pick the same fix into `development`.

Never allow `development` to permanently miss a production hotfix.

---

# 44. Development Data Policy

Development should preferably use:

- fake users,
- test courses,
- synthetic materials,
- test PDFs.

Avoid copying real production data into development.

If production data must be copied for debugging:

- remove personal data where possible,
- remove authentication secrets,
- remove private files unless necessary,
- restrict access,
- delete the temporary copy after debugging.

---

# 45. Notestra-Specific Deployment Checks

Before promoting Notestra to production:

- [ ] Production Spaces credentials work.
- [ ] Development storage path is isolated.
- [ ] Signed URLs open correctly.
- [ ] PDF.js can load PDFs correctly.
- [ ] PDF access CORS is correct.
- [ ] Annotation autosave targets the correct API.
- [ ] `material_annotations` exists.
- [ ] `material_notes` exists.
- [ ] Export does not overwrite originals.
- [ ] Development exports cannot appear in production.
- [ ] Large PDFs do not exhaust server memory.
- [ ] Export failures are handled gracefully.

---

# 46. Notestra Migration Order

```text
1. Create material_annotations migration.
2. Create material_notes migration.
3. Deploy to development.
4. Run development migrations.
5. Test persistence.
6. Test deletion cascade.
7. Test autosave.
8. Merge into main.
9. Back up production database.
10. Deploy production.
11. Run production migrations.
12. Perform Notestra smoke test.
```

---

# 47. Pre-Deployment Master Checklist

## Infrastructure

- [ ] Droplet healthy.
- [ ] Dokploy healthy.
- [ ] Traefik healthy.
- [ ] Disk space sufficient.
- [ ] RAM sufficient.
- [ ] PostgreSQL healthy.
- [ ] Redis healthy.

## DNS

- [ ] `semestra.com`
- [ ] `api.semestra.com`
- [ ] `dev.semestra.com`
- [ ] `api-dev.semestra.com`

resolve correctly.

## Production

- [ ] Frontend uses `main`.
- [ ] Backend uses `main`.
- [ ] Database is `semestra_prod`.
- [ ] Storage prefix/bucket is production.
- [ ] URLs are production URLs.
- [ ] `APP_DEBUG=false`.
- [ ] Queue worker and scheduler (if any) use production config only.

## Development

- [ ] Frontend uses `development`.
- [ ] Backend uses `development`.
- [ ] Database is `semestra_dev`.
- [ ] Storage prefix/bucket is development.
- [ ] URLs are development URLs.
- [ ] Mail is sandboxed or log-only.
- [ ] Queue worker and scheduler (if any) use development config only.

---

# 48. Post-Deployment Master Checklist

- [ ] Both frontends load.
- [ ] Both APIs respond.
- [ ] Production data is correct.
- [ ] Development data is isolated.
- [ ] Production login works.
- [ ] Development login works.
- [ ] File uploads use correct storage.
- [ ] Materials open correctly.
- [ ] Production frontend calls production API.
- [ ] Development frontend calls development API.
- [ ] Database migrations are current.
- [ ] HTTPS works everywhere.
- [ ] Queue workers are running for both environments.
- [ ] No critical errors are present.

---

# 49. Incident: Development Affects Production

If development unexpectedly affects production:

1. Stop development deployment.
2. Confirm production health.
3. Check CPU/RAM/disk.
4. Check development DB configuration.
5. Check storage prefix.
6. Check domain routing.
7. Check API URLs.
8. Check environment variables.
9. Confirm no production credentials exist in development.
10. Restore production if required.
11. Document the incident.

Common causes:

- shared DB name,
- wrong API URL,
- wrong storage prefix,
- shared secrets,
- shared queue/Redis DB,
- shared mail provider account,
- memory exhaustion,
- incorrect Dokploy domain mapping.

---

# 50. Incident: Development Used Production Database

1. Stop development immediately.
2. Back up production.
3. Identify affected records.
4. Do not blindly roll back the database.
5. Correct affected data carefully.
6. Rotate credentials if necessary.
7. Fix development environment configuration.
8. Verify isolation before restarting development.

---

# 51. Incident: Bad Production Release

1. Identify whether the failure is frontend, backend, DB, storage, or networking.
2. Revert application code if code is responsible.
3. Do not automatically roll back migrations without assessing data safety.
4. Restore previous environment variables if configuration is responsible.
5. Repeat the production smoke test.

---

# 52. Recommended Current Semestra Setup

```text
1 DigitalOcean Droplet
4 GB RAM
2 vCPU

Dokploy
Traefik

Production:
    semestra.com
    api.semestra.com
    main branch
    semestra_prod
    production/* storage

Development:
    dev.semestra.com
    api-dev.semestra.com
    development branch
    semestra_dev
    development/* storage
```

This provides a good early-stage balance between:

- cost,
- simplicity,
- isolation,
- deployment safety,
- room for growth.

---

# 53. Core Deployment Principle

> Development may share compute infrastructure with production, but must never share production state, identity, or side effects.

Production state includes:

- production database,
- production storage paths,
- production secrets,
- production URLs,
- real user data.

Production side effects include:

- emails sent to real users,
- queue jobs executed against production data,
- webhooks fired to production endpoints,
- file writes into production storage paths,
- payment events,
- notifications delivered to real users.

The standard Semestra deployment flow is:

```text
Build
→ feature branch
→ development
→ dev.semestra.com
→ test
→ main
→ semestra.com
→ verify
```

---

# 54. Quick Reference

```text
PRODUCTION
Branch: main
Frontend: semestra.com
Backend: api.semestra.com
Worker: semestra-worker-prod
Database: semestra_prod
Storage: production/
Redis DB: 0
Session cookie: semestra_session

DEVELOPMENT
Branch: development
Frontend: dev.semestra.com
Backend: api-dev.semestra.com
Worker: semestra-worker-dev
Database: semestra_dev
Storage: development/
Redis DB: 1
Session cookie: semestra_dev_session
```

Both stages can run on the same DigitalOcean Droplet under Dokploy initially. When production traffic or operational risk increases, move staging to a separate Droplet while preserving the same branch, domain, database, and storage-isolation principles.

This SOP is considered production-usable for the current early-stage Semestra deployment. The next meaningful infrastructure upgrade is moving development onto its own Droplet once production usage starts to matter (see Section 35).
