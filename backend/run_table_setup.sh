#!/bin/bash

# Script to run the SQL to create user_pro_status table
# Usage: ./run_table_setup.sh

echo "Setting up user_pro_status table..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed or not in PATH"
    exit 1
fi

# Get database connection details from environment
DB_URL=${DATABASE_URL:-""}

if [ -z "$DB_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo "Please set it to your PostgreSQL connection string"
    exit 1
fi

# Run the SQL script
echo "Executing SQL script..."
psql "$DB_URL" -f create_user_pro_status_table.sql

if [ $? -eq 0 ]; then
    echo "✅ user_pro_status table created successfully!"
else
    echo "❌ Error creating table"
    exit 1
fi
