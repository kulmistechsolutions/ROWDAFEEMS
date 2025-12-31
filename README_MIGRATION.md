# ⚠️ CRITICAL: Run Database Migration on Production

## Current Issue

Your production application is showing 500 errors because the `branch` column doesn't exist in the production database on Render.

## Quick Fix: Run Migration on Production

### Step 1: Access Render Shell

1. Go to https://dashboard.render.com
2. Click on your backend service: `bakend-rowdafeems`
3. Click on **"Shell"** tab (or look for "Manual Deploy" → "Run in shell")

### Step 2: Run Migration

In the Render shell, run:

```bash
cd backend
node scripts/run-migration-branch.js
```

### Step 3: Verify

```bash
node scripts/verify-branch-migration.js
```

You should see:
```
✅ Branch column exists!
✅ Index exists: idx_parents_branch
✅ Migration verification complete!
```

### Step 4: Restart Backend (if needed)

After migration, the backend should automatically restart. If errors persist, manually restart:
- Go to Render Dashboard → Your Backend Service
- Click "Manual Deploy" → "Clear build cache & deploy" (or just restart)

## Alternative: Connect to Production Database Directly

If Render Shell doesn't work, you can run the migration from your local machine:

1. **Get Production DATABASE_URL:**
   - Render Dashboard → Your Backend Service → Environment
   - Copy the `DATABASE_URL` value

2. **Backup your local .env:**
   ```bash
   cp backend/.env backend/.env.local.backup
   ```

3. **Update .env with production URL:**
   ```env
   DATABASE_URL=your-production-database-url-from-render
   ```

4. **Run migration:**
   ```bash
   cd backend
   node scripts/run-migration-branch.js
   node scripts/verify-branch-migration.js
   ```

5. **Restore local .env:**
   ```bash
   mv backend/.env.local.backup backend/.env
   ```

## What the Migration Does

The migration script will:
1. Add `branch` column to `parents` table (default: 'Branch 1')
2. Set all existing parents to 'Branch 1'
3. Create indexes for performance
4. Make the queries work correctly

## After Migration

Once migration is complete:
- ✅ `/api/reports/summary?branch=Branch+1` will work
- ✅ `/api/parents/:id` will work
- ✅ All branch filtering features will work
- ✅ No more 500 errors related to branch

---

**Note:** The code is already deployed. You just need to run the database migration on production.

