import bcrypt from 'bcryptjs';
import pool from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  const username = process.argv[2] || 'admin';
  const email = process.argv[3] || 'admin@school.com';
  const password = process.argv[4] || 'admin123';
  const role = 'admin';

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO UPDATE
       SET email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role
       RETURNING id, username, email, role`,
      [username, email, passwordHash, role]
    );

    console.log('Admin user created/updated successfully:');
    console.log(result.rows[0]);
    console.log(`\nLogin credentials:`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();


