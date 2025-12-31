import bcrypt from 'bcryptjs';
import pool from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminDirect() {
  const username = process.argv[2] || 'admin';
  const email = process.argv[3] || 'admin@rowdatul-iimaan.com';
  const password = process.argv[4] || 'admin123';
  const role = 'admin';

  try {
    console.log('🔌 Connecting to database...');
    
    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, username, email, role, is_active FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists:');
      console.log(existingUser.rows[0]);
      console.log('\n🔄 Updating password...');
      
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `UPDATE users 
         SET email = $1,
             password_hash = $2,
             role = $3,
             is_active = true
         WHERE username = $4
         RETURNING id, username, email, role, is_active`,
        [email, passwordHash, role, username]
      );
      
      console.log('✅ User password updated successfully!');
      console.log(result.rows[0]);
    } else {
      console.log('👤 Creating new admin user...');
      const passwordHash = await bcrypt.hash(password, 10);
      
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, username, email, role, is_active`,
        [username, email, passwordHash, role]
      );
      
      console.log('✅ Admin user created successfully!');
      console.log(result.rows[0]);
    }

    console.log(`\n🔐 Login Credentials:`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${role}`);
    console.log(`\n✅ Ready to login!\n`);

    // Verify the user can be found
    const verifyUser = await pool.query(
      'SELECT id, username, email, role, is_active FROM users WHERE username = $1',
      [username]
    );
    
    if (verifyUser.rows.length > 0) {
      console.log('✅ Verification: User exists in database');
      console.log(verifyUser.rows[0]);
    } else {
      console.log('❌ ERROR: User not found after creation!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    
    if (error.code === '23505') {
      console.error('\n💡 User already exists. The script will update it.');
    } else if (error.message.includes('DATABASE_URL')) {
      console.error('\n💡 Make sure DATABASE_URL is set in backend/.env file');
    } else if (error.message.includes('connection')) {
      console.error('\n💡 Check your DATABASE_URL connection string');
    }
  } finally {
    await pool.end();
  }
}

createAdminDirect();

