# Run Migration on Render Production Database

## Quick Solution

The error you're seeing means the production database on Render doesn't have the `branch` column yet. You need to run the migration on the **production database**.

## Option 1: Using Render Shell (Recommended)

1. Go to https://dashboard.render.com
2. Open your backend service: `bakend-rowdafeems`
3. Click the **"Shell"** tab (or "SSH" tab)
4. Run these commands:
   ```bash
   cd backend
   node scripts/run-migration-branch.js
   ```
5. Verify it worked:
   ```bash
   node scripts/verify-branch-migration.js
   ```
6. Restart your Render service (optional, but recommended)

## Option 2: Run from Local Machine (Alternative)

If Render Shell doesn't work, you can run the migration from your local machine:

1. **Get Production DATABASE_URL from Render:**
   - Go to Render Dashboard → `bakend-rowdafeems` → Environment tab
   - Copy the `DATABASE_URL` value

2. **Update your local `.env` temporarily:**
   ```bash
   cd backend
   # Backup your current .env
   cp .env .env.local.backup
   
   # Edit .env - replace DATABASE_URL with production URL from Render
   # (Use your text editor or the PowerShell script)
   ```

3. **Run migration:**
   ```bash
   node scripts/run-migration-branch.js
   node scripts/verify-branch-migration.js
   ```

4. **Restore your local .env:**
   ```bash
   cp .env.local.backup .env
   ```

## After Migration

- ✅ The error will disappear
- ✅ Branch filtering will work in production
- ✅ All existing parents will be set to "Branch 1"

## Troubleshooting

If you get connection errors:
- Verify the DATABASE_URL is correct
- Check that the database allows connections from your IP (for Neon, check firewall settings)
- For Neon databases, ensure SSL is enabled (should be automatic)

