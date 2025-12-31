# Run Combined Migration (Branch + Student Status)

## Issue

Your production database is missing both:
- `branch` column
- `student_status` column

## Solution: Run Combined Migration

The combined migration will add both columns at once.

### Step 1: Get Production DATABASE_URL

1. Go to: https://dashboard.render.com
2. Click: `bakend-rowdafeems` → Environment tab
3. Copy: `DATABASE_URL` value

### Step 2: Run Migration

**Option A: Use PowerShell Helper Script**

```bash
cd backend
powershell -ExecutionPolicy Bypass -File RUN_PRODUCTION_MIGRATION.ps1
```

Then when prompted, paste the production DATABASE_URL.

**Option B: Manual Steps**

1. Backup your local .env:
   ```bash
   cd backend
   cp .env .env.local.backup
   ```

2. Edit `.env` - replace `DATABASE_URL` with production URL from Render

3. Run combined migration:
   ```bash
   node scripts/run-combined-migration.js
   ```
   
   OR use npm script:
   ```bash
   npm run run-combined-migration
   ```

4. Restore local .env:
   ```bash
   cp .env.local.backup .env
   ```

## What the Migration Does

1. ✅ Adds `branch` column (default: 'Branch 1')
2. ✅ Adds `student_status` column (default: 'active')
3. ✅ Updates all existing records with default values
4. ✅ Creates indexes for performance

## After Migration

- ✅ No more "column does not exist" errors
- ✅ Branch filtering will work
- ✅ Student status (Active/Suspended) will work
- ✅ All existing parents set to Branch 1 and Active status

