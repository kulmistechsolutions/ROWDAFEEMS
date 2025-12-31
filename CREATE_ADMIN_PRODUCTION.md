# Create Admin User for Production Database

## Problem: 401 Unauthorized Error

If you're getting 401 errors when trying to login, it means the admin user doesn't exist in your production database.

## Solution: Create Admin User

You have 3 options to create the admin user:

### Option 1: Using create-admin Script (Recommended) ✅

1. **Get your production DATABASE_URL from Render:**
   - Go to your Render dashboard
   - Select your backend service
   - Go to "Environment" tab
   - Copy the `DATABASE_URL` value

2. **Update your local .env file:**
   ```bash
   cd backend
   # Edit .env file and set DATABASE_URL to your production database
   ```

   Your `backend/.env` should look like:
   ```env
   PORT=5000
   NODE_ENV=production
   JWT_SECRET=your-jwt-secret
   DATABASE_URL=postgresql://user:password@your-production-db-host:5432/database?sslmode=require
   ```

3. **Run the create-admin script:**
   ```bash
   cd backend
   npm run create-admin admin admin@rowdatul-iimaan.com admin123
   ```

   Or use default values:
   ```bash
   npm run create-admin
   ```
   This creates:
   - Username: `admin`
   - Password: `admin123`

4. **Login with:**
   - Username: `admin`
   - Password: `admin123`

---

### Option 2: Direct SQL Query (Using Database Console) ✅

If you have direct access to your database (e.g., Neon Dashboard, Render Console, or psql):

1. **Connect to your database**

2. **Run this SQL query:**

```sql
-- First, install/ensure bcrypt extension is available (PostgreSQL doesn't have built-in bcrypt)
-- We'll hash the password: admin123
-- The hash for 'admin123' using bcrypt is: $2a$10$YourHashHere
-- But it's better to use the script OR generate it properly

-- For PostgreSQL, you can use pgcrypto extension:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert admin user (you'll need to hash the password first)
-- Option A: Use create-admin script (recommended)
-- Option B: Use a password hasher online and replace HASH_HERE

INSERT INTO users (username, email, password_hash, role, is_active)
VALUES (
  'admin',
  'admin@rowdatul-iimaan.com',
  '$2a$10$rOzJq0bJWzKX.Y1FJ5vN1OPvqJ7zZxK5vXzKX.Y1FJ5vN1OPvqJ7z', -- This is a placeholder, use real hash
  'admin',
  true
)
ON CONFLICT (username) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    is_active = true;
```

**⚠️ Warning:** The SQL above has a placeholder hash. It's better to use Option 1 (create-admin script) which properly hashes the password.

---

### Option 3: Quick Fix - Use Render Shell ✅

If Render provides a shell/console:

1. **Open Render Shell** (if available in your dashboard)

2. **Run:**
   ```bash
   cd backend
   npm run create-admin admin admin@rowdatul-iimaan.com admin123
   ```

---

## Recommended: Option 1 Steps in Detail

### Step-by-Step:

1. **Get DATABASE_URL from Render:**
   ```
   Render Dashboard → Your Backend Service → Environment → DATABASE_URL
   ```

2. **Create/Update backend/.env locally:**
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
   JWT_SECRET=your-jwt-secret-here
   NODE_ENV=production
   PORT=5000
   ```

3. **Run create-admin script:**
   ```bash
   cd backend
   npm install  # Make sure dependencies are installed
   npm run create-admin admin admin@rowdatul-iimaan.com admin123
   ```

4. **Expected output:**
   ```
   Admin user created/updated successfully:
   { id: 1, username: 'admin', email: 'admin@rowdatul-iimaan.com', role: 'admin' }
   
   Login credentials:
   Username: admin
   Password: admin123
   ```

5. **Try logging in again:**
   - Username: `admin`
   - Password: `admin123`

---

## Alternative: Create Custom Admin User

You can create a custom admin user:

```bash
cd backend
npm run create-admin ROWDA rowda@rowdatul-iimaan.com ROWDA123
```

Then login with:
- Username: `ROWDA`
- Password: `ROWDA123`

---

## Verify Admin User Exists

To check if the admin user exists in your database, you can run:

```sql
SELECT id, username, email, role, is_active FROM users WHERE username = 'admin';
```

---

## Still Getting 401 Error?

1. **Double-check the DATABASE_URL** in your backend/.env matches your production database
2. **Verify the user was created:** Run the SQL query above to check
3. **Check username/password:** Make sure you're using the exact username/password from the create-admin output
4. **Check if user is active:** Make sure `is_active = true`
5. **Check backend logs** on Render for any errors

---

## Security Note

⚠️ **IMPORTANT:** Change the default password after first login!

Once logged in, you can change the password through the Users management page (admin only).

