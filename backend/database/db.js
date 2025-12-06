import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Parse connection string and ensure SSL for Neon DB
let sslConfig = false;
if (process.env.DATABASE_URL) {
  // For Neon DB or any remote PostgreSQL, use SSL
  if (process.env.DATABASE_URL.includes('neon.tech') || 
      process.env.DATABASE_URL.includes('neon.tech') ||
      process.env.NODE_ENV === 'production') {
    sslConfig = { rejectUnauthorized: false };
  }
  // If sslmode=require is in the URL, use SSL
  if (process.env.DATABASE_URL.includes('sslmode=require')) {
    sslConfig = { rejectUnauthorized: false };
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

