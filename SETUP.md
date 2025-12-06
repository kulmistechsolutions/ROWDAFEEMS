# Setup Guide - Rowdatul Iimaan Fee Management System

## Quick Start

### 1. Install Dependencies

```bash
npm run install:all
```

This will install dependencies for root, backend, and frontend.

### 2. Database Setup

#### Option A: Using Neon DB (Recommended)

1. Create a Neon account at https://neon.tech
2. Create a new project
3. Copy your connection string
4. Update `backend/.env` with your DATABASE_URL

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database: `CREATE DATABASE rowdatul_iimaan;`
3. Update `backend/.env` with your connection string

### 3. Run Database Schema

Connect to your database and run:

```bash
psql -d your_database -f backend/database/schema.sql
```

Or copy the contents of `backend/database/schema.sql` and run it in your database console.

### 4. Configure Environment

Copy and edit the backend environment file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 5. Create Admin User

```bash
cd backend
npm run create-admin
```

Or manually:

```bash
cd backend
node scripts/create-admin.js admin admin@school.com admin123
```

Default credentials:
- Username: `admin`
- Password: `admin123`

**⚠️ Change the default password after first login!**

### 6. Start Development Servers

From the root directory:

```bash
npm run dev
```

This starts:
- Backend API: http://localhost:5000
- Frontend App: http://localhost:3000

### 7. Access the Application

1. Open http://localhost:3000
2. Login with admin credentials
3. Start managing fees!

## Project Structure

```
ROWDAFEE/
├── backend/              # Node.js + Express API
│   ├── database/         # Database schema
│   ├── routes/           # API routes
│   ├── middleware/       # Auth middleware
│   └── server.js         # Main server file
├── frontend/             # React + Vite app
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utility functions
│   └── public/           # Static assets
└── LOGO.jpeg            # School logo
```

## Features Overview

### ✅ Implemented Features

- **Authentication**: Secure login with JWT
- **User Management**: Admin can create/manage users
- **Parent Management**: Add, edit, import parents from Excel
- **Month Setup**: Automated monthly billing
- **Payment Collection**: Normal, partial, advance payments
- **Fee History**: Complete transaction history
- **Receipts**: PDF receipt generation
- **Dashboard**: Charts and KPIs
- **Reports**: Excel export functionality
- **Responsive Design**: Mobile, tablet, desktop support

## Troubleshooting

### Database Connection Issues

- Verify DATABASE_URL in `.env` is correct
- Check if database server is running
- Ensure SSL settings match your database provider

### Port Already in Use

- Change PORT in `backend/.env`
- Update Vite proxy in `frontend/vite.config.js`

### Logo Not Showing

- Ensure `LOGO.jpeg` exists in root directory
- Check `frontend/public/logo.jpeg` exists
- Verify file permissions

### Import Errors

- Run `npm run install:all` again
- Delete `node_modules` and reinstall
- Check Node.js version (v18+ required)

## Production Deployment

### Backend

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET`
3. Configure proper CORS settings
4. Use process manager (PM2) for Node.js

### Frontend

1. Build: `cd frontend && npm run build`
2. Serve `dist/` folder with a web server
3. Configure API proxy or use environment variables

## Support

For issues or questions, check the README.md file or review the code comments.


