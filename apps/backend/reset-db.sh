#!/bin/bash

echo "🧹 Resetting database..."

# Drop and recreate the database
docker exec -it taskboard-db-dev psql -U app -d postgres -c "DROP DATABASE IF EXISTS app;"
docker exec -it taskboard-db-dev psql -U app -d postgres -c "CREATE DATABASE app;"

echo "✅ Database reset complete!"

