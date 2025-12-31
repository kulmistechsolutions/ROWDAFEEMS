# ⚠️ Production Database Migration Required

## Issue

The application is showing 500 errors because the production database on Render doesn't have the `branch` column yet. The migration was only run on your local database.

## Solution: Run Migration on Production Database

You need to run the migration script on your production database. Here's how:

### Option 1: Using Render Shell (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service (`bakend-rowdafeems`)
3. Click on "Shell" tab (or use "Manual Deploy" → "Run in shell")
4. Run the migration:

```bash
cd backend
node scripts/run-migration-branch.js
```

### Option 2: Connect Directly to Production Database

1. Get your production DATABASE_URL from Render:
   - Go to Render Dashboard → Your Backend Service → Environment
   - Copy the `DATABASE_URL` value

2. Temporarily update your local `.env`:
   ```env
   DATABASE_URL=your-production-database-url-here
   ```

3. Run the migration locally:
   ```bash
   cd backend
   node scripts/run-migration-branch.js
   ```

4. Verify it worked:
   ```bash
   node scripts/verify-branch-migration.js
   ```

5. **Important:** Change your `.env` back to local database after migration

### Option 3: Using psql (if you have PostgreSQL client)

1. Get DATABASE_URL from Render environment variables
2. Connect to database:
   ```bash
   psql "your-database-url-here"
   ```
3. Run the SQL manually:
   ```sql
   ALTER TABLE parents 
   ADD COLUMN IF NOT EXISTS branch VARCHAR(50) DEFAULT 'Branch 1'
   CHECK (branch IN ('Branch 1', 'Branch 2'));
   
   UPDATE parents SET branch = 'Branch 1' WHERE branch IS NULL;
   
   CREATE INDEX IF NOT EXISTS idx_parents_branch ON parents(branch);
   
   CREATE INDEX IF NOT EXISTS idx_parent_month_fee_branch ON parent_month_fee(parent_id);
   ```

## Verify Migration

After running the migration, check the Render logs to ensure there are no more 500 errors.

The errors you're seeing:
- `/api/reports/summary?branch=Branch+1` - 500 error (branch column missing)
- `/api/parents/1962` - 500 error (trying to read/update branch field)

Should be resolved after running the migration.

## Quick Command Summary

```bash
# In Render Shell:
cd backend
node scripts/run-migration-branch.js
node scripts/verify-branch-migration.js
```

