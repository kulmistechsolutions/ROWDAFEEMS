# 🚀 Quick Start Guide

## Step 1: Configure Database Connection

### Option A: Using Neon DB (Recommended - Free)

1. Go to https://neon.tech and sign up
2. Create a new project
3. Copy your connection string (looks like: `postgresql://user:pass@host/dbname`)
4. Create `backend/.env` file:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=rowdatul-iimaan-secret-key-2024-change-in-production
DATABASE_URL=postgresql://your-neon-connection-string-here
```

### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create database: `CREATE DATABASE rowdatul_iimaan;`
3. Create `backend/.env` file:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=rowdatul-iimaan-secret-key-2024-change-in-production
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/rowdatul_iimaan
```

## Step 2: Setup Database & Create Admin User

```bash
cd backend
npm run setup-db
```

This will:
- ✅ Test database connection
- ✅ Create all tables
- ✅ Create admin user (username: `admin`, password: `admin123`)

## Step 3: Test Connection (Optional)

```bash
cd backend
npm run test-connection
```

## Step 4: Start the Application

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

## Step 5: Login

1. Open http://localhost:3000
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`

⚠️ **Important:** Change the password after first login!

## Troubleshooting

### Database Connection Error?

1. Check your `.env` file exists in `backend/` folder
2. Verify DATABASE_URL is correct
3. Test connection: `cd backend && npm run test-connection`
4. For Neon DB: Make sure SSL is enabled (it's automatic)

### "DATABASE_URL not found"?

Create `backend/.env` file with your database connection string.

### Port Already in Use?

Change PORT in `backend/.env` to a different port (e.g., 5001)

### Need Help?

- Check `SETUP.md` for detailed instructions
- Check `README.md` for full documentation


