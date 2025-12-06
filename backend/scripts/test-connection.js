import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file!');
    console.log('\n📝 Create backend/.env file with:');
    console.log('DATABASE_URL=postgresql://user:password@host:5432/database');
    process.exit(1);
  }

  // Determine SSL config
  let sslConfig = false;
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.includes('neon.tech') || 
        process.env.DATABASE_URL.includes('neon.tech') ||
        process.env.DATABASE_URL.includes('sslmode=require') ||
        process.env.NODE_ENV === 'production') {
      sslConfig = { rejectUnauthorized: false };
    }
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig
  });

  try {
    console.log('🔌 Testing database connection...');
    const result = await pool.query('SELECT NOW(), version()');
    console.log('✅ Connection successful!');
    console.log('   Database time:', result.rows[0].now);
    console.log('   PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tables.rows.length > 0) {
      console.log('\n📊 Found tables:');
      tables.rows.forEach(row => console.log('   -', row.table_name));
    } else {
      console.log('\n⚠️  No tables found. Run: npm run setup-db');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Database server is not running or wrong host/port');
    } else if (error.code === '28P01') {
      console.error('\n💡 Invalid username or password');
    } else if (error.code === '3D000') {
      console.error('\n💡 Database does not exist');
    } else {
      console.error('\n💡 Check your DATABASE_URL in .env file');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();

