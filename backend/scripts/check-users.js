import pool from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
  try {
    console.log('🔌 Connecting to database...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'NOT SET');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

    // Get all users
    const result = await pool.query(
      'SELECT id, username, email, role, is_active, created_at FROM users ORDER BY id'
    );

    console.log(`\n📋 Found ${result.rows.length} user(s) in database:\n`);

    if (result.rows.length === 0) {
      console.log('❌ NO USERS FOUND! You need to create an admin user.');
      console.log('\n💡 Run: npm run create-admin admin admin@rowdatul-iimaan.com admin123\n');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.is_active ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('');
      });

      // Check for admin user
      const adminUser = result.rows.find(u => u.username === 'admin' && u.is_active);
      if (!adminUser) {
        console.log('⚠️  WARNING: No active admin user found!');
        console.log('💡 Run: npm run create-admin admin admin@rowdatul-iimaan.com admin123\n');
      } else {
        console.log('✅ Active admin user found!');
        console.log(`   Username: ${adminUser.username}`);
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Role: ${adminUser.role}\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('DATABASE_URL')) {
      console.error('\n💡 Make sure DATABASE_URL is set in backend/.env file');
    } else if (error.message.includes('connection')) {
      console.error('\n💡 Check your DATABASE_URL connection string');
      console.error('   Make sure it points to your Render production database');
    }
  } finally {
    await pool.end();
  }
}

checkUsers();

