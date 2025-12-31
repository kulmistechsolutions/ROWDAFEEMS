import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runMigration() {
  console.log('🚀 Production Database Migration Tool\n');
  console.log('⚠️  This will modify your PRODUCTION database!');
  console.log('Make sure you have the correct DATABASE_URL.\n');

  // Check current DATABASE_URL
  const currentUrl = process.env.DATABASE_URL || '';
  console.log('Current DATABASE_URL:', currentUrl.substring(0, 50) + '...\n');

  const confirm = await question('Is this the PRODUCTION database URL? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('\n❌ Migration cancelled. Please update DATABASE_URL in .env file first.');
    console.log('   Get the production DATABASE_URL from Render Dashboard → Environment tab\n');
    rl.close();
    process.exit(0);
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file!');
    console.log('\n📝 Please create backend/.env file with:');
    console.log('DATABASE_URL=postgresql://user:password@host:5432/database');
    rl.close();
    process.exit(1);
  }

  // Determine SSL config
  let sslConfig = false;
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.includes('neon.tech') || 
        process.env.DATABASE_URL.includes('sslmode=require') ||
        process.env.DATABASE_URL.includes('render.com') ||
        process.env.NODE_ENV === 'production') {
      sslConfig = { rejectUnauthorized: false };
    }
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig
  });

  try {
    console.log('\n🔌 Connecting to database...');
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
          (error.message.includes('relation') && error.message.includes('already exists'))) {
        console.log('ℹ️  Skipped (already exists):', error.message.substring(0, 80));
        console.log('   Migration may have already been applied.\n');
      } else {
        console.error('❌ Error:', error.message);
        throw error;
      }
    }

    // Verify migration
    console.log('🔍 Verifying migration...');
    const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN branch = 'Branch 1' THEN 1 END) as branch1_count,
        COUNT(CASE WHEN branch = 'Branch 2' THEN 1 END) as branch2_count
      FROM parents
    `);
    
    if (verifyResult.rows.length > 0) {
      const stats = verifyResult.rows[0];
      console.log(`   📊 Total parents: ${stats.total}`);
      console.log(`   📊 Branch 1: ${stats.branch1_count}`);
      console.log(`   📊 Branch 2: ${stats.branch2_count}`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Branch field has been added to parents table.');
    console.log('   All existing records have been set to "Branch 1" by default.');
    console.log('   You can now use Branch filtering in the application.');
    console.log('\n🔄 Please restart your backend service on Render if errors persist.\n');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    rl.close();
    process.exit(1);
  } finally {
    await pool.end();
    rl.close();
  }
}

runMigration();

