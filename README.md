# ROWDAFEE - Fee Management System

Fee Management System for Rowdatul Iimaan School

## Features

- ✅ Parent Management
- ✅ Monthly Fee Tracking
- ✅ Payment Processing (Normal, Partial, Advance)
- ✅ Receipt Generation (PDF)
- ✅ Real-time Updates (Socket.io)
- ✅ Excel Import/Export
- ✅ Reports & Analytics
- ✅ User Authentication
- ✅ Responsive Design

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Socket.io Client
- jsPDF

### Backend
- Node.js
- Express.js
- PostgreSQL
- Socket.io
- JWT Authentication

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kulmistechsolutions/ROWDAFEEMS.git
   cd ROWDAFEEMS
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   npm run setup-db
   npm run create-admin
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with your API URL
   ```

4. **Run Development**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## Deployment

### Vercel Deployment

#### Frontend Deployment

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Set root directory to `frontend`
4. Configure environment variables:
   - `VITE_API_URL`: Your backend API URL
5. Deploy

#### Backend Deployment

**Option 1: Railway/Render (Recommended)**
- Railway or Render are better suited for Express.js backends
- Set environment variables in the platform
- Point your frontend API URL to the deployed backend

**Option 2: Vercel Serverless**
- Deploy backend as serverless functions
- Configure `vercel.json` in backend folder

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key
PORT=5000
NODE_ENV=production
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.com/api
```

## Default Login

- **Username**: admin
- **Password**: (set during admin creation)

## Project Structure

```
ROWDAFEEMS/
├── backend/
│   ├── database/
│   ├── middleware/
│   ├── routes/
│   ├── scripts/
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── utils/
│   └── vite.config.js
└── README.md
```

## API Endpoints

- `POST /api/auth/login` - User login
- `GET /api/parents` - List all parents
- `POST /api/parents` - Create parent
- `GET /api/parents/:id/profile` - Get parent profile
- `POST /api/payments` - Create payment
- `GET /api/reports/summary` - Get summary reports

## Performance

The system includes performance optimizations:
- Database indexes for faster queries
- Batch operations for month setup
- Debounced search
- Memoized React components

See `PERFORMANCE_OPTIMIZATIONS.md` for details.

## License

Copyright © 2025 Kulmis Tech Solutions

## Support

For issues and questions, please create an issue on GitHub.
