#!/usr/bin/env bash
# Database tests (task M-14, "RLS tests"). Starts a throwaway local PostgreSQL cluster, loads a stand-in for the Supabase
# `auth` / `storage` parts (bootstrap.sql), then the REAL supabase/schema.sql and seed.sql, then runs tests.sql.
# Nothing is installed and nothing outside a temporary folder is written. Needs PostgreSQL 14+ on the machine
# (server binaries, not only psql). Usage: npm run test:db        (or: PGBIN=/path/to/bin bash tools/db-test/run.sh)
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/initdb" ]; then
  echo "PostgreSQL server binaries not found. Install PostgreSQL or set PGBIN to the folder that holds initdb." >&2
  exit 2
fi

work="$(mktemp -d /tmp/schedy-dbtest.XXXXXX)"
port="${PGPORT:-54329}"
# PostgreSQL refuses to run as root; inside a root container use the postgres user if there is one.
if [ "$(id -u)" = 0 ]; then
  id postgres >/dev/null 2>&1 || { echo "Running as root and there is no 'postgres' user to run the server as." >&2; exit 2; }
  chown postgres "$work"
  as_pg() { runuser -u postgres -- "$@"; }
else
  as_pg() { "$@"; }
fi
trap 'as_pg "$PGBIN/pg_ctl" -D "$work/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$work"' EXIT

as_pg "$PGBIN/initdb" -D "$work/data" -A trust -U postgres >/dev/null
as_pg "$PGBIN/pg_ctl" -D "$work/data" -w -l "$work/server.log" \
  -o "-c listen_addresses='' -c unix_socket_directories=$work -p $port -c fsync=off" start >/dev/null

psql_run() { as_pg "$PGBIN/psql" -X -q -h "$work" -p "$port" -U postgres -v ON_ERROR_STOP=1 "$@"; }
as_pg "$PGBIN/createdb" -h "$work" -p "$port" -U postgres schedy_test

for f in "$here/bootstrap.sql" "${SCHEMA_FILE:-$repo/supabase/schema.sql}" "$repo/supabase/seed.sql"; do
  psql_run -d schedy_test -f "$f" >/dev/null 2>"$work/load.err" || { cat "$work/load.err" >&2; echo "FAILED while loading $f" >&2; exit 1; }
done

if psql_run -d schedy_test -f "$here/tests.sql" >/dev/null 2>"$work/out.txt"; then status=0; else status=1; fi
grep -E "NOTICE:  (ok|FAIL) - " "$work/out.txt" | sed -E 's/^.*NOTICE:  //' || true
grep -vE "NOTICE:  (ok|FAIL) - " "$work/out.txt" | grep -v '^$' >&2 || true
passed="$(grep -cE "NOTICE:  ok - " "$work/out.txt" || true)"
if [ "$status" = 0 ]; then echo "db tests: $passed passed"; else echo "db tests: FAILED after $passed passed" >&2; fi
exit "$status"
