#!/bin/sh
set -e

echo "[CareID Docker] Starting container initialization..."

# Migrations are gated behind explicit environment variable authorization
if [ "$AUTO_MIGRATE" = "true" ] || [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[CareID Docker] Deploying database migrations with Prisma..."
  npx prisma migrate deploy
else
  echo "[CareID Docker] Automatic migrations disabled. Skipping prisma migrate deploy."
fi

# Seeding is gated behind explicit environment variable authorization
if [ "$AUTO_SEED" = "true" ] || [ "$RUN_SEED" = "true" ]; then
  echo "[CareID Docker] Ensuring deterministic local seed data..."
  node scripts/seed-local.js || echo "[CareID Docker] Seed completed or skipped."
else
  echo "[CareID Docker] Automatic seeding disabled. Skipping seed-local.js."
fi

echo "[CareID Docker] Launching CareID NestJS API server on port ${PORT:-3000}..."
exec node dist/src/main

