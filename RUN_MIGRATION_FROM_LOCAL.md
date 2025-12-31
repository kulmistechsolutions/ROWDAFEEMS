# Run Migration from Local Machine (Free Render Plan)

Since Render Shell is not available on the free plan, you can run the migration from your local machine.

## Steps

### Step 1: Get Production DATABASE_URL from Render

1. Go to: https://dashboard.render.com
2. Click on: `bakend-rowdafeems` service
3. Click: **"Environment"** tab
4. Find: `DATABASE_URL`
5. **Click the eye icon** to reveal the value (or copy button)
6. **COPY** the entire value

### Step 2: Backup Your Local .env

```bash
cd backend
cp .env .env.local.backup
```

### Step 3: Update .env with Production DATABASE_URL

Open `backend/.env` in a text editor and replace the `DATABASE_URL` line with the production URL you copied from Render.

### Step 4: Run Migration

```bash
cd backend
node scripts/run-migration-branch.js
```

You should see it connect and update the production database.

### Step 5: Verify Migration

```bash
node scripts/verify-branch-migration.js
```

### Step 6: Restore Your Local .env

```bash
cp .env.local.backup .env
```

Now your local .env is back to using your local database.

## Important Notes

- ✅ This will update your **production database** on Render
- ✅ All existing parents will be set to "Branch 1"
- ✅ The error will disappear after this
- ✅ Your local database URL will be restored after Step 6

