#!/bin/sh
# Runtime start: sync the database schema, then boot the API server.
# Schema sync runs here (not at build time) because DATABASE_URL is only
# available at runtime on Railway. drizzle-kit push is idempotent — it creates
# missing tables on a fresh database and is a no-op once the schema is current.
set -e

echo "[start] Syncing database schema (drizzle-kit push)…"
pnpm --filter @workspace/db run push

echo "[start] Starting API server…"
exec node artifacts/api-server/dist/index.mjs
