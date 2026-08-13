#!/bin/sh
set -e

# Runtime env (DB creds, APP_KEY, etc.) isn't available at build time on
# App Platform, so caching happens here on container start, not in the
# Dockerfile. Migrations run separately as a PRE_DEPLOY job — never here.
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Idempotent — storage:link no-ops if the symlink already exists. Without
# it, uploaded materials 403 (public/storage never gets created).
php artisan storage:link || true

exec "$@"
