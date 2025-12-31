# Create Admin User for Render Backend

Since you already have DATABASE_URL in Render, follow these steps:

## Step 1: Get DATABASE_URL from Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your backend service (`bakend-rowdafeems`)
3. Click on **"Environment"** tab
4. Find `DATABASE_URL` and **copy the entire value**

## Step 2: Update Local .env (Temporarily)

**IMPORTANT:** This is just to create the admin user, then you can switch back if needed.

1. Open `backend/.env` file
2. **Backup your current DATABASE_URL** (copy it somewhere safe)
3. **Replace** DATABASE_URL with the one from Render:

```env
DATABASE_URL=your-render-database-url-here
JWT_SECRET=your-jwt-secret
NODE_ENV=production
PORT=5000
```

## Step 3: Create Admin User

Run this command to create the admin user in Render's database:

```bash
cd backend
node scripts/create-admin-direct.js admin admin@rowdatul-iimaan.com admin123
```

You should see:
```
✅ Admin user created successfully!
🔐 Login Credentials:
   Username: admin
   Password: admin123
```

## Step 4: Verify User Created

Check that the user exists in Render's database:

```bash
node scripts/check-users.js
```

You should see the admin user listed with `Active: ✅ Yes`

## Step 5: Try Login

1. Go to your frontend (the one pointing to Render backend)
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`

## Step 6: (Optional) Restore Local DATABASE_URL

If you want to use your local Neon database for development, you can restore the original DATABASE_URL in `backend/.env`.

---

## Quick Command Summary

```bash
# 1. Get DATABASE_URL from Render (copy it)
# 2. Update backend/.env with Render's DATABASE_URL
# 3. Create admin user
cd backend
node scripts/create-admin-direct.js admin admin@rowdatul-iimaan.com admin123

# 4. Verify
node scripts/check-users.js

# 5. Login at your frontend
# Username: admin
# Password: admin123
```

---

## Troubleshooting

### "Cannot connect to database"
- Double-check the DATABASE_URL from Render (copy it exactly)
- Make sure there are no extra spaces
- Check if Render database requires SSL (add `?sslmode=require` if needed)

### "User already exists but still can't login"
- The script will update existing users and set `is_active = true`
- Run `node scripts/check-users.js` to verify the user is active

### Still getting 401 error?
1. Check Render logs for database connection errors
2. Verify DATABASE_URL in Render matches what you used
3. Make sure the database is the same one your Render backend uses
4. Check if JWT_SECRET matches between local .env and Render

---

## Alternative: Multiple Admin Users

You can create different admin users:

```bash
# Create ROWDA user
node scripts/create-admin-direct.js ROWDA rowda@rowdatul-iimaan.com ROWDA123

# Create custom admin
node scripts/create-admin-direct.js myadmin myadmin@school.com mypassword123
```

