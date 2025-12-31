import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function verifyMigration() {
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
    console.log('🔍 Verifying branch migration...\n');

    // Check if branch column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'parents' AND column_name = 'branch'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('❌ Branch column does not exist!');
      console.log('   Please run the migration: node scripts/run-migration-branch.js');
      process.exit(1);
    }

    console.log('✅ Branch column exists!');
    console.log('   Column:', columnCheck.rows[0].column_name);
    console.log('   Type:', columnCheck.rows[0].data_type);
    console.log('   Default:', columnCheck.rows[0].column_default || 'NULL');

    // Check if index exists
    const indexCheck = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'parents' AND indexname = 'idx_parents_branch'
    `);

    if (indexCheck.rows.length > 0) {
      console.log('\n✅ Index exists: idx_parents_branch');
    } else {
      console.log('\n⚠️  Index idx_parents_branch not found (may not be critical)');
    }

    // Check existing records
    const countCheck = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN branch IS NULL THEN 1 END) as null_count,
        COUNT(CASE WHEN branch = 'Branch 1' THEN 1 END) as branch1_count,
        COUNT(CASE WHEN branch = 'Branch 2' THEN 1 END) as branch2_count
      FROM parents
    `);

    if (countCheck.rows.length > 0) {
      const stats = countCheck.rows[0];
      console.log('\n📊 Parent records status:');
      console.log('   Total parents:', stats.total);
      console.log('   Branch 1:', stats.branch1_count);
      console.log('   Branch 2:', stats.branch2_count);
      if (parseInt(stats.null_count) > 0) {
        console.log('   ⚠️  NULL values:', stats.null_count, '(should be 0)');
      }
    }

    console.log('\n✅ Migration verification complete!');
    console.log('   Branch filtering is ready to use.\n');

  } catch (error) {
    console.error('\n❌ Verification failed!');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyMigration();

