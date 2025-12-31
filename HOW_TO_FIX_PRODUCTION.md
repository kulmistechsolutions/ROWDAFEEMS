# 🔧 How to Fix Production 500 Errors

## Current Status

✅ **Local Database:** Migration completed (467 parents)  
❌ **Production Database:** Migration NOT done - causing 500 errors

## Quick Fix (3 Steps)

### Step 1: Get Production DATABASE_URL

1. Go to: https://dashboard.render.com
2. Click: `bakend-rowdafeems` service
3. Click: **"Environment"** tab
4. Find: `DATABASE_URL`
5. **COPY** the entire value (starts with `postgresql://...`)

### Step 2: Update Local .env

```bash
cd backend

# Backup your current .env
cp .env .env.local.backup

# Edit .env file - replace DATABASE_URL line
# Use notepad or any text editor:
notepad .env
```

**Replace this line:**
```
DATABASE_URL=postgresql://neondb_owner:...@ep-young-frog...
```

**With production URL from Render:**
```
DATABASE_URL=postgresql://your-production-url-from-render
```

**Save the file.**

### Step 3: Run Migration on Production

```bash
# Run migration (will ask for confirmation)
node scripts/run-migration-production.js

# Or run directly:
node scripts/run-migration-branch.js
```

You should see it connect to production and update the database.

### Step 4: Restore Local .env

```bash
# Restore your local database URL
cp .env.local.backup .env
```

### Step 5: Test Production

- Check your application - 500 errors should be gone
- Try updating a parent - should work now
- Branch filtering should work

---

## Alternative: Use Render Shell

If you prefer not to modify local .env:

1. Render Dashboard → `bakend-rowdafeems` → **"Shell"** tab
2. Run:
   ```bash
   cd backend
   node scripts/run-migration-branch.js
   ```

This runs directly on Render with production DATABASE_URL.

---

## Verify It Worked

After migration, check Render logs:
- Should see no more 500 errors
- Parent updates should work
- Reports with branch filter should work

---

## Summary

The migration script you ran connected to your **local Neon database**, not the **production Render database**. You need to run it again with the production DATABASE_URL.

**Time needed:** ~2 minutes  
**Risk:** None (uses IF NOT EXISTS, safe to run multiple times)

