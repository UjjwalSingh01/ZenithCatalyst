#!/bin/sh
set -e

# Structure: make the tables and columns match schema.prisma.
echo "Syncing database schema..."
./node_modules/.bin/prisma db push --accept-data-loss

# Data: changes to existing rows, which db push cannot express — it only ever
# changes structure. Every script records itself in _zenith_data_migrations and
# does nothing once recorded, so applying all of them on every start is safe.
#
# After db push, so every column a script touches already exists. Before the
# server, so no request is ever answered from half-migrated data. `set -e`
# means a failing script stops the start rather than serving on regardless.
for script in prisma/data-migrations/*.sql; do
  [ -e "$script" ] || continue
  echo "Data migration: $script"
  ./node_modules/.bin/prisma db execute --file "$script"
done

echo "Starting server..."
exec node dist/server.js
