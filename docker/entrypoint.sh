#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running Prisma migrations..."
  cd /app/libs/common
  npx prisma migrate deploy --config prisma7.config.ts
  cd /app
fi

exec "$@"
