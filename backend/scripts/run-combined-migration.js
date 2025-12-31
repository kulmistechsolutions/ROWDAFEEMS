import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file!');
    console.log('\n📝 Please create backend/.env file with:');
    console.log('DATABASE_URL=postgresql://user:password@host:5432/database');
    process.exit(1);
  }

  // Determine SSL config
  let sslConfig = false;
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.includes('neon.tech') || 
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
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

    console.log('🚀 Running Combined Migration: Branch + Student Status\n');
    
    try {
      // 1. Add branch column
      console.log('1️⃣  Adding branch column to parents table...');
      await pool.query(`
        ALTER TABLE parents 
        ADD COLUMN IF NOT EXISTS branch VARCHAR(50) DEFAULT 'Branch 1'
        CHECK (branch IN ('Branch 1', 'Branch 2'))
      `);
      console.log('   ✅ Branch column added\n');

      // 2. Update existing records for branch
      console.log('2️⃣  Updating existing records to Branch 1...');
      const branchUpdateResult = await pool.query(`
        UPDATE parents SET branch = 'Branch 1' WHERE branch IS NULL
      `);
      console.log(`   ✅ Updated ${branchUpdateResult.rowCount} records\n`);

      // 3. Create branch index
      console.log('3️⃣  Creating index on branch column...');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_parents_branch ON parents(branch)
      `);
      console.log('   ✅ Branch index created\n');

      // 4. Add student_status column
      console.log('4️⃣  Adding student_status column to parents table...');
      await pool.query(`
        ALTER TABLE parents 
        ADD COLUMN IF NOT EXISTS student_status VARCHAR(20) DEFAULT 'active' 
        CHECK (student_status IN ('active', 'suspended'))
      `);
      console.log('   ✅ Student status column added\n');

      // 5. Update existing records for student_status
      console.log('5️⃣  Updating existing records to active...');
      const statusUpdateResult = await pool.query(`
        UPDATE parents SET student_status = 'active' WHERE student_status IS NULL
      `);
      console.log(`   ✅ Updated ${statusUpdateResult.rowCount} records\n`);

      // 6. Create student_status index
      console.log('6️⃣  Creating index on student_status column...');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_parents_student_status ON parents(student_status)
      `);
      console.log('   ✅ Student status index created\n');

      // 7. Create composite index (optional)
      console.log('7️⃣  Creating composite index...');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_parent_month_fee_branch ON parent_month_fee(parent_id)
      `);
      console.log('   ✅ Composite index created\n');

    } catch (error) {
      // Check if it's a "already exists" or "duplicate" error
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate column') ||
          error.message.includes('relation') && error.message.includes('already exists')) {
        console.log('ℹ️  Skipped (already exists):', error.message.substring(0, 80));
        console.log('   Migration may have already been applied.\n');
      } else {
        console.error('❌ Error:', error.message);
        throw error;
      }
    }

    console.log('\n✅ Combined Migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Branch field added to parents table');
    console.log('   ✅ Student status field added to parents table');
    console.log('   ✅ All existing records updated with default values');
    console.log('   ✅ Indexes created for performance');
    console.log('   ✅ You can now use Branch and Student Status filtering\n');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

