#!/usr/bin/env bash
# Sobe um Postgres descartável, aplica a migração e roda os testes do schema.
# Requer os binários do Postgres (initdb, pg_ctl, psql) no PATH ou em /usr/lib/postgresql/*/bin.
set -euo pipefail
cd "$(dirname "$0")/.."
# o Postgres não roda como root; em contêiner, refaz a chamada como o usuário postgres
if [ "$(id -u)" = "0" ] && id postgres >/dev/null 2>&1; then
  exec runuser -u postgres -- bash "$PWD/scripts/test-db.sh"
fi
PGBIN="$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")"
DIR="$(mktemp -d)"
PORT="${PGPORT_TESTE:-55432}"
trap '"$PGBIN/pg_ctl" -D "$DIR" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
"$PGBIN/initdb" -D "$DIR" -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
PSQL=(psql -h "$DIR" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f supabase/tests/auth_stub.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f supabase/tests/fase1.sql
