# Production image — single container running nginx + php-fpm under
# supervisord, matching the "one App Platform component" deploy model.
# Multi-stage: composer deps built separately so app-code changes don't
# force a full dependency reinstall.

FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

FROM php:8.4-fpm-alpine AS runtime

RUN apk add --no-cache nginx supervisor postgresql-dev icu-dev icu-libs $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_pgsql bcmath pcntl opcache intl \
    && apk del icu-dev $PHPIZE_DEPS \
    && mkdir -p /run/php /run/nginx

WORKDIR /app

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY --from=vendor /app/vendor ./vendor
COPY . .
RUN composer dump-autoload --optimize --no-dev \
    && chown -R www-data:www-data /app/storage /app/bootstrap/cache

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-app.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
