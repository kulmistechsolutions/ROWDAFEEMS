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
    // Detect advance payments from multiple sources:
    // 1. advance_payments table (months_remaining > 0)
    // 2. payments table (payment_type = 'advance')
    // 3. payment_items table (item_type = 'advance')
    // 4. payments table (notes ILIKE '%advance%')
    console.log('Calculating initial advance_balance from existing advance payments...');
    
    // Method 1: Use advance_payments table (most accurate for remaining balance)
    await client.query(`
      UPDATE parents p
      SET advance_balance = COALESCE((
        SELECT SUM(ap.amount_per_month * ap.months_remaining)
        FROM advance_payments ap
        WHERE ap.parent_id = p.id AND ap.months_remaining > 0
      ), 0)
    `);
    
    // Method 2: Also check payment_items for advance payments (in case advance_payments is empty)
    // Calculate from payment_items where item_type = 'advance'
    // This gives us the total advance amount paid
    console.log('Also checking payment_items for advance payments...');
    await client.query(`
      UPDATE parents p
      SET advance_balance = COALESCE(advance_balance, 0) + COALESCE((
        SELECT SUM(pi.amount)
        FROM payment_items pi
        JOIN payments py ON pi.payment_id = py.id
        WHERE py.parent_id = p.id 
          AND pi.item_type = 'advance'
          AND NOT EXISTS (
            SELECT 1 FROM advance_payments ap 
            WHERE ap.payment_id = py.id
          )
      ), 0)
    `);
    
    // Method 3: Check payments table for payment_type = 'advance' (fallback)
    console.log('Checking payments table for advance payment_type...');
    await client.query(`
      UPDATE parents p
      SET advance_balance = COALESCE(advance_balance, 0) + COALESCE((
        SELECT SUM(py.amount)
        FROM payments py
        WHERE py.parent_id = p.id 
          AND py.payment_type = 'advance'
          AND NOT EXISTS (
            SELECT 1 FROM payment_items pi 
            WHERE pi.payment_id = py.id AND pi.item_type = 'advance'
          )
          AND NOT EXISTS (
            SELECT 1 FROM advance_payments ap 
            WHERE ap.payment_id = py.id
          )
      ), 0)
    `);
    
    // Method 4: Check payments.notes for 'advance' keyword (last resort)
    console.log('Checking payments.notes for advance keyword...');
    await client.query(`
      UPDATE parents p
      SET advance_balance = COALESCE(advance_balance, 0) + COALESCE((
        SELECT SUM(py.amount)
        FROM payments py
        WHERE py.parent_id = p.id 
          AND (py.notes ILIKE '%advance%' OR py.sms_text ILIKE '%advance%')
          AND py.payment_type != 'advance'
          AND NOT EXISTS (
            SELECT 1 FROM payment_items pi 
            WHERE pi.payment_id = py.id AND pi.item_type = 'advance'
          )
          AND NOT EXISTS (
            SELECT 1 FROM advance_payments ap 
            WHERE ap.payment_id = py.id
          )
      ), 0)
    `);
    
    console.log('Advance balance calculation completed.');
    
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

