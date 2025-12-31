# 🚨 QUICK FIX: Production Database Migration

## The Problem

Your production database is missing the `branch` column, causing 500 errors when updating parents.

## The Solution (Choose ONE method)

### Method 1: Render Shell (Fastest - 2 minutes)

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Click on `bakend-rowdafeems` service

2. **Open Shell:**
   - Click on **"Shell"** tab (at the top)
   - Or look for **"Manual Deploy"** → **"Run in shell"**

3. **Run Migration:**
   ```bash
   cd backend
   node scripts/run-migration-branch.js
   ```

4. **Verify:**
   ```bash
   node scripts/verify-branch-migration.js
   ```

5. **Done!** The backend will automatically restart. Errors should be gone in ~1 minute.

---

### Method 2: Local Machine (If Render Shell doesn't work)

1. **Get Production DATABASE_URL from Render:**
   - Render Dashboard → `bakend-rowdafeems` → **Environment** tab
   - Copy the `DATABASE_URL` value (starts with `postgresql://...`)

2. **Backup your local .env:**
   ```bash
   cd backend
   cp .env .env.backup
   ```

3. **Update .env with production URL:**
   - Open `backend/.env`
   - Replace `DATABASE_URL` with the production URL from Render
   - Save the file

4. **Run Migration:**
   ```bash
   cd backend
   node scripts/run-migration-branch.js
   node scripts/verify-branch-migration.js
   ```

5. **Restore your local .env:**
   ```bash
   cp .env.backup .env
   ```

---

## What This Does

The migration adds:
- ✅ `branch` column to `parents` table
- ✅ Sets all existing parents to "Branch 1"
- ✅ Creates indexes for performance

**Time:** ~30 seconds
**Impact:** Fixes all 500 errors related to branch field
**Risk:** None - uses `IF NOT EXISTS` so it's safe to run multiple times

---

## After Migration

✅ `/api/parents/:id` PUT requests will work
✅ `/api/reports/summary?branch=...` will work  
✅ Branch filtering will work everywhere
✅ No more 500 errors

---

## Still Getting Errors?

1. **Check Render Logs:**
   - Render Dashboard → Your Backend → **Logs** tab
   - Look for the actual error message

2. **Verify Migration Ran:**
   ```bash
   node scripts/verify-branch-migration.js
   ```
   Should show: ✅ Branch column exists!

3. **Restart Backend:**
   - Render Dashboard → Your Backend
   - Click **"Manual Deploy"** → **"Clear build cache & deploy"**

---

**Need Help?** The migration script is safe to run multiple times - it uses `IF NOT EXISTS` checks.

