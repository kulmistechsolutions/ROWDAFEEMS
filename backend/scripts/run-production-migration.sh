#!/bin/bash
# Production Migration Script for Render
# This script can be run in Render Shell or locally with production DATABASE_URL

echo "🚀 Running Branch Field Migration on Production Database"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  echo ""
  echo "For Render Shell: DATABASE_URL should be set automatically"
  echo "For local run: Set DATABASE_URL in .env file"
  exit 1
fi

echo "✅ DATABASE_URL found"
echo "📋 Running migration..."
echo ""

# Run the migration script
node scripts/run-migration-branch.js

echo ""
echo "✅ Migration completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Restart your backend service on Render (if needed)"
echo "   2. Check Render logs to ensure no errors"
echo "   3. Test the application - 500 errors should be resolved"
echo ""

