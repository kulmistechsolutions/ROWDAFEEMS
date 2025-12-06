# 🎯 START HERE - Quick Setup Guide

## ⚡ Fast Setup (3 Steps)

### 1️⃣ Configure Database

Edit `backend/.env` and set your `DATABASE_URL`:

**For Neon DB (Free):**
- Go to https://neon.tech
- Create account & project
- Copy connection string
- Paste in `DATABASE_URL=`

**For Local PostgreSQL:**
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/rowdatul_iimaan
```

### 2️⃣ Setup Database & Create Admin

```bash
cd backend
npm run setup-db
```

This creates:
- ✅ All database tables
- ✅ Admin user (username: `admin`, password: `admin123`)

### 3️⃣ Start Application

**Terminal 1:**
```bash
cd backend
npm run dev
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```

## 🔐 Login

1. Open http://localhost:3000
2. Username: `admin`
3. Password: `admin123`

## 🆘 Need Help?

- **Check connection:** `cd backend && npm run test-connection`
- **Check .env:** `cd backend && npm run check-env`
- See `SETUP_DATABASE.md` for detailed instructions

## 📋 What You Need

- Node.js installed
- PostgreSQL database (Neon DB or local)
- Database connection string

That's it! 🚀


