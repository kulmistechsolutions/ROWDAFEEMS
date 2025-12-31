import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

    // Read migration file
    console.log('📋 Reading migration file...');
    const migrationPath = join(__dirname, '..', 'database', 'migration_add_branch.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running migration: Add Branch Field to Parents Table\n');
    
    // Execute migration statements one by one
    try {
      // 1. Add branch column
      console.log('1️⃣  Adding branch column to parents table...');
      await pool.query(`
        ALTER TABLE parents 
        ADD COLUMN IF NOT EXISTS branch VARCHAR(50) DEFAULT 'Branch 1'
        CHECK (branch IN ('Branch 1', 'Branch 2'))
      `);
      console.log('   ✅ Branch column added\n');

      // 2. Update existing records
      console.log('2️⃣  Updating existing records to Branch 1...');
      const updateResult = await pool.query(`
        UPDATE parents SET branch = 'Branch 1' WHERE branch IS NULL
      `);
      console.log(`   ✅ Updated ${updateResult.rowCount} records\n`);

      // 3. Create index
      console.log('3️⃣  Creating index on branch column...');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_parents_branch ON parents(branch)
      `);
      console.log('   ✅ Index created\n');

      // 4. Create composite index (optional)
      console.log('4️⃣  Creating composite index...');
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

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Branch field has been added to parents table.');
    console.log('   All existing records have been set to "Branch 1" by default.');
    console.log('   You can now use Branch filtering in the application.\n');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

