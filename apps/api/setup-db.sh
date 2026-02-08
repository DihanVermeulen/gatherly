#!/bin/bash

# gatherly Database Setup Script

echo "🎅 gatherly Database Setup"
echo "=============================="
echo ""

# Check if PostgreSQL is installed
# if ! command -v psql &> /dev/null; then
#     echo "❌ PostgreSQL is not installed or not in PATH"
#     echo "Please install PostgreSQL first: https://www.postgresql.org/download/"
#     exit 1
# fi

echo "✓ PostgreSQL found"
echo ""

# Configuration
DB_NAME="gatherly"
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "Database Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""

# Check if database exists
if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "⚠️  Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"
        echo "✓ Database dropped"
    else
        echo "Using existing database..."
    fi
fi

# Create database if it doesn't exist
if ! psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Creating database '$DB_NAME'..."
    createdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"
    if [ $? -eq 0 ]; then
        echo "✓ Database created"
    else
        echo "❌ Failed to create database"
        exit 1
    fi
fi

# Run schema
echo ""
echo "Running schema script..."
psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f src/db/schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Schema applied successfully"
    echo ""
    echo "🎉 Database setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Copy .env.example to .env and update values if needed"
    echo "  2. Run 'pnpm dev' to start the API server"
else
    echo ""
    echo "❌ Failed to apply schema"
    exit 1
fi
