import express from 'express';
import pool from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all billing months
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM billing_months ORDER BY year DESC, month DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get months error:', error);
    res.status(500).json({ error: 'Failed to fetch months' });
  }
});

// Get active month
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM billing_months WHERE is_active = true ORDER BY year DESC, month DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return res.json({ month: null });
    }
    
    res.json({ month: result.rows[0] });
  } catch (error) {
    console.error('Get active month error:', error);
    res.status(500).json({ error: 'Failed to fetch active month' });
  }
});

// Create new billing month (Month Setup)
router.post('/setup', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    // Check if month already exists
    const existingCheck = await client.query(
      'SELECT id FROM billing_months WHERE year = $1 AND month = $2',
      [year, month]
    );

    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This month already exists' });
    }

    // Deactivate all other months FIRST (before creating new one)
    const deactivateResult = await client.query('UPDATE billing_months SET is_active = false WHERE is_active = true RETURNING id');
    console.log(`Deactivated ${deactivateResult.rows.length} previous active month(s)`);

    // Create new billing month
    const monthResult = await client.query(
      'INSERT INTO billing_months (year, month, is_active) VALUES ($1, $2, true) RETURNING *',
      [year, month]
    );

    const newMonth = monthResult.rows[0];

    // Get all parents
    const parentsResult = await client.query('SELECT * FROM parents');

    // Get previous month's data
    const prevMonthResult = await client.query(
      `SELECT * FROM billing_months 
       WHERE (year < $1 OR (year = $1 AND month < $2))
       ORDER BY year DESC, month DESC LIMIT 1`,
      [year, month]
    );

    // OPTIMIZATION: Batch fetch all previous month fees at once
    let prevMonthFeesMap = {};
    if (prevMonthResult.rows.length > 0) {
      const prevMonthId = prevMonthResult.rows[0].id;
      const prevMonthFees = await client.query(
        'SELECT parent_id, outstanding_after_payment, advance_months_remaining FROM parent_month_fee WHERE billing_month_id = $1',
        [prevMonthId]
      );
      prevMonthFees.rows.forEach(fee => {
        prevMonthFeesMap[fee.parent_id] = fee;
      });
    }

    // OPTIMIZATION: Batch fetch all advance payments at once
    const parentIds = parentsResult.rows.map(p => p.id);
    const allAdvancePayments = await client.query(
      'SELECT parent_id, months_remaining, amount_per_month, id FROM advance_payments WHERE parent_id = ANY($1) AND months_remaining > 0 ORDER BY parent_id, created_at ASC',
      [parentIds]
    );
    const advancePaymentsMap = {};
    allAdvancePayments.rows.forEach(advance => {
      if (!advancePaymentsMap[advance.parent_id]) {
        advancePaymentsMap[advance.parent_id] = advance;
      }
    });

    // Prepare batch insert data
    const feeInsertValues = [];
    const advanceUpdateIds = [];

    for (const parent of parentsResult.rows) {
      let carriedForward = 0;
      let advanceMonthsRemaining = 0;

      // Get previous month's outstanding from map
      if (prevMonthFeesMap[parent.id]) {
        const prevFee = prevMonthFeesMap[parent.id];
        carriedForward = parseFloat(prevFee.outstanding_after_payment || 0);
        advanceMonthsRemaining = parseInt(prevFee.advance_months_remaining || 0);
      }

      // Get advance payment from map
      const advance = advancePaymentsMap[parent.id];
      let totalDue = parent.monthly_fee_amount;
      let status = 'unpaid';

      // If parent has advance payment, reduce due amount
      if (advance && advanceMonthsRemaining > 0) {
        // Advance payment covers this month
        totalDue = 0;
        status = 'advanced';
        advanceUpdateIds.push(advance.id);
      } else {
        // Add carried forward to total due
        totalDue = parent.monthly_fee_amount + carriedForward;
      }

      // Prepare insert values for batch insert
      feeInsertValues.push([
        parent.id,
        newMonth.id,
        parent.monthly_fee_amount,
        carriedForward,
        totalDue,
        0, // amount_paid_this_month
        totalDue, // outstanding_after_payment
        status,
        advanceMonthsRemaining > 0 ? advanceMonthsRemaining - (advance && advanceMonthsRemaining > 0 ? 1 : 0) : 0
      ]);
    }

    // Batch update advance payments (only if any need updating)
    if (advanceUpdateIds.length > 0) {
      await client.query(
        'UPDATE advance_payments SET months_remaining = months_remaining - 1 WHERE id = ANY($1)',
        [advanceUpdateIds]
      );
    }

    // Batch insert all parent_month_fee records (using VALUES for better compatibility)
    if (feeInsertValues.length > 0) {
      const values = feeInsertValues.map((v, idx) => 
        `($${idx * 9 + 1}, $${idx * 9 + 2}, $${idx * 9 + 3}, $${idx * 9 + 4}, $${idx * 9 + 5}, $${idx * 9 + 6}, $${idx * 9 + 7}, $${idx * 9 + 8}, $${idx * 9 + 9})`
      ).join(', ');
      
      const params = feeInsertValues.flat();
      
      await client.query(
        `INSERT INTO parent_month_fee 
         (parent_id, billing_month_id, monthly_fee, carried_forward_amount, total_due_this_month, 
          amount_paid_this_month, outstanding_after_payment, status, advance_months_remaining)
         VALUES ${values}`,
        params
      );
    }

    await client.query('COMMIT');

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('month:created', { month: newMonth });
      io.emit('month:updated', { billing_month_id: newMonth.id });
      io.emit('reports:updated');
    }
    
    res.status(201).json({ 
      month: newMonth, 
      message: 'Month setup completed successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Month setup error:', error);
    res.status(500).json({ error: 'Failed to setup month' });
  } finally {
    client.release();
  }
});

// Get a single billing month by ID
router.get('/:monthId', authenticateToken, async (req, res) => {
  try {
    const { monthId } = req.params;
    const result = await pool.query(
      'SELECT * FROM billing_months WHERE id = $1',
      [monthId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Month not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get month error:', error);
    res.status(500).json({ error: 'Failed to fetch month' });
  }
});

// Delete a billing month (with cascade delete of related records)
router.delete('/:monthId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { monthId } = req.params;
    
    // Check if month exists
    const monthCheck = await client.query(
      'SELECT * FROM billing_months WHERE id = $1',
      [monthId]
    );
    
    if (monthCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Month not found' });
    }
    
    const month = monthCheck.rows[0];
    
    // Check if month is active
    if (month.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Cannot delete active month. Please activate another month first.' 
      });
    }
    
    // Check if there are any payments for this month
    const paymentsCheck = await client.query(
      'SELECT COUNT(*) as count FROM payments WHERE billing_month_id = $1',
      [monthId]
    );
    
    const paymentCount = parseInt(paymentsCheck.rows[0].count);
    
    // Delete will cascade to:
    // - parent_month_fee (ON DELETE CASCADE)
    // - payments (ON DELETE CASCADE)
    // - payment_items (ON DELETE CASCADE via payments)
    
    // Delete the month (cascade will handle related records)
    await client.query(
      'DELETE FROM billing_months WHERE id = $1',
      [monthId]
    );
    
    await client.query('COMMIT');
    
    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('month:deleted', { month_id: monthId });
      io.emit('reports:updated');
    }
    
    res.json({ 
      message: 'Month deleted successfully',
      deleted_payments: paymentCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete month error:', error);
    res.status(500).json({ error: 'Failed to delete month' });
  } finally {
    client.release();
  }
});

// Get fees for a specific month
router.get('/:monthId/fees', authenticateToken, async (req, res) => {
  try {
    const { monthId } = req.params;
    const { status, search } = req.query;

    let query = `
      SELECT 
        pmf.*,
        p.parent_name,
        p.phone_number,
        p.number_of_children,
        p.monthly_fee_amount as parent_monthly_fee
      FROM parent_month_fee pmf
      JOIN parents p ON pmf.parent_id = p.id
      WHERE pmf.billing_month_id = $1
    `;

    const params = [monthId];

    if (status && status !== 'all') {
      query += ` AND pmf.status = $${params.length + 1}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (p.parent_name ILIKE $${params.length + 1} OR p.phone_number ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY p.parent_name`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get fees error:', error);
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
});

export default router;


