# 🔧 Database Setup & Login Configuration

## 📝 Step 1: Configure Database Connection

Edit `backend/.env` file and update the `DATABASE_URL`:

### For Neon DB (Recommended):
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=rowdatul-iimaan-secret-key-2024-change-in-production
DATABASE_URL=postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### For Local PostgreSQL:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=rowdatul-iimaan-secret-key-2024-change-in-production
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/rowdatul_iimaan
```

## 🚀 Step 2: Setup Database & Create Admin User

Run this command to:
- ✅ Test database connection
- ✅ Create all tables
- ✅ Create admin user

```bash
cd backend
npm run setup-db
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change password after first login!**

## ✅ Step 3: Test Connection

```bash
cd backend
npm run test-connection
```

## 🎯 Step 4: Start Application

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

## 🔐 Step 5: Login

1. Open http://localhost:3000
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`

## 🆘 Troubleshooting

### "DATABASE_URL not found"
- Make sure `backend/.env` file exists
- Check that DATABASE_URL is set correctly

### "Connection refused"
- Database server not running
- Wrong host/port in DATABASE_URL

### "Invalid username or password"
- Check database credentials in DATABASE_URL

### "Database does not exist"
- Create the database first:
  ```sql
  CREATE DATABASE rowdatul_iimaan;
  ```

### For Neon DB:
- Make sure SSL is enabled (add `?sslmode=require` to connection string)
- Copy the full connection string from Neon dashboard


