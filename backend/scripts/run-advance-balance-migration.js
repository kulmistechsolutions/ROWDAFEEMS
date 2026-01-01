import pool from '../database/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting advance_balance migration...');
    await client.query('BEGIN');

    // Read migration SQL
    const migrationPath = path.join(__dirname, '../database/migration_add_advance_balance.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await client.query(migrationSQL);
    
    // Calculate and set initial advance_balance for existing parents
    // Based on existing advance_payments records
    console.log('Calculating initial advance_balance from existing advance_payments...');
    await client.query(`
      UPDATE parents p
      SET advance_balance = COALESCE((
        SELECT SUM(ap.amount_per_month * ap.months_remaining)
        FROM advance_payments ap
        WHERE ap.parent_id = p.id AND ap.months_remaining > 0
      ), 0)
      WHERE EXISTS (
        SELECT 1 FROM advance_payments ap2 
        WHERE ap2.parent_id = p.id AND ap2.months_remaining > 0
      )
    `);
    
    console.log('Migration completed successfully!');
    await client.query('COMMIT');
    
    // Verify migration
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'parents' AND column_name = 'advance_balance'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ advance_balance column exists:', result.rows[0]);
    } else {
      console.error('❌ advance_balance column not found!');
    }
    
    // Show summary
    const summary = await client.query(`
      SELECT 
        COUNT(*) as total_parents,
        COUNT(CASE WHEN advance_balance > 0 THEN 1 END) as parents_with_advance,
        SUM(advance_balance) as total_advance_balance
      FROM parents
    `);
    
    console.log('\nSummary:');
    console.log(summary.rows[0]);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

