import express from 'express';
import pool from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

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

// Create new billing month (Month Setup) - Admin only
router.post('/setup', authenticateToken, requireAdmin, async (req, res) => {
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

    // Get all active parents (exclude suspended)
    const parentsResult = await client.query("SELECT * FROM parents WHERE student_status = 'active' OR student_status IS NULL");

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

    // OPTIMIZATION: Batch fetch all advance payments and calculate advance_balance for each parent
    const parentIds = parentsResult.rows.map(p => p.id);
    const allAdvancePayments = await client.query(
      'SELECT parent_id, months_remaining, amount_per_month, id FROM advance_payments WHERE parent_id = ANY($1) AND months_remaining > 0 ORDER BY parent_id, created_at ASC',
      [parentIds]
    );
    
    // Calculate advance_balance for each parent (SUM of amount_per_month * months_remaining)
    const advanceBalanceMap = {};
    const advancePaymentsByParent = {};
    allAdvancePayments.rows.forEach(advance => {
      const parentId = advance.parent_id;
      if (!advanceBalanceMap[parentId]) {
        advanceBalanceMap[parentId] = 0;
        advancePaymentsByParent[parentId] = [];
      }
      const balance = parseFloat(advance.amount_per_month) * parseInt(advance.months_remaining);
      advanceBalanceMap[parentId] += balance;
      advancePaymentsByParent[parentId].push(advance);
    });

    // Prepare batch insert data
    const feeInsertValues = [];
    const advanceUpdateIdsFull = []; // For full month consumption (decrement by 1)
    const advanceUpdateIdsPartial = []; // For partial consumption (set to 0)

    for (const parent of parentsResult.rows) {
      let carriedForward = 0;
      let advanceMonthsRemaining = 0;

      // Get previous month's outstanding from map
      if (prevMonthFeesMap[parent.id]) {
        const prevFee = prevMonthFeesMap[parent.id];
        carriedForward = parseFloat(prevFee.outstanding_after_payment || 0);
        advanceMonthsRemaining = parseInt(prevFee.advance_months_remaining || 0);
      }

      // Calculate advance_balance from advance_payments table
      const advanceBalance = advanceBalanceMap[parent.id] || 0;
      const monthlyFee = parseFloat(parent.monthly_fee_amount);
      let totalDue = monthlyFee;
      let status = 'unpaid';
      let amountPaid = 0;
      let outstandingAfterPayment = 0;
      let finalAdvanceMonthsRemaining = 0;
      let advanceToApply = 0;

      // CRITICAL FIX: Apply advance_balance during month setup
      if (advanceBalance >= monthlyFee) {
        // Case 1: advance_balance >= monthly_fee - Mark as PAID (Advance Applied)
        totalDue = 0; // Do NOT create a payable charge
        amountPaid = monthlyFee; // Mark as paid via advance
        outstandingAfterPayment = 0; // No outstanding (month is paid)
        status = 'paid'; // Mark as paid (advance applied)
        carriedForward = 0; // Do NOT carry forward when advance covers (advance is for future, not past debts)
        advanceToApply = monthlyFee; // Amount to deduct from advance balance
        
        // Track advance payments that need to be decremented (consume one month)
        // We'll consume from the oldest advance payment first (FIFO)
        // Consume exactly one month from the first available advance payment
        if (advancePaymentsByParent[parent.id] && advancePaymentsByParent[parent.id].length > 0) {
          const firstAdvance = advancePaymentsByParent[parent.id][0];
          if (firstAdvance.months_remaining > 0) {
            // Consume one month from the first (oldest) advance payment
            advanceUpdateIdsFull.push(firstAdvance.id);
            finalAdvanceMonthsRemaining = firstAdvance.months_remaining - 1;
          }
        }
      } else if (advanceBalance > 0 && advanceBalance < monthlyFee) {
        // Case 2: advance_balance < monthly_fee AND > 0 - Apply partial advance
        advanceToApply = advanceBalance;
        amountPaid = advanceBalance; // Apply the advance
        totalDue = monthlyFee - advanceBalance; // Charge only remaining balance
        outstandingAfterPayment = totalDue; // Remaining to pay
        status = 'partial'; // Mark as partial (some advance applied, some still due)
        carriedForward = 0; // No carry forward when applying advance
        finalAdvanceMonthsRemaining = 0; // All advance consumed
        
        // Consume all remaining advance (set months_remaining to 0 for all)
        if (advancePaymentsByParent[parent.id]) {
          for (const advance of advancePaymentsByParent[parent.id]) {
            advanceUpdateIdsPartial.push(advance.id);
          }
        }
      } else {
        // Case 3: advance_balance = 0 - Use normal logic (partial/unpaid)
        // Preserve existing behavior: carry forward previous month's outstanding
        totalDue = monthlyFee + carriedForward;
        amountPaid = 0;
        outstandingAfterPayment = totalDue;
        finalAdvanceMonthsRemaining = 0;
      }

      // Prepare insert values for batch insert
      feeInsertValues.push([
        parent.id,
        newMonth.id,
        parent.monthly_fee_amount,
        carriedForward,
        totalDue,
        amountPaid,
        outstandingAfterPayment,
        status,
        finalAdvanceMonthsRemaining
      ]);
    }

    // Batch update advance payments
    // Full consumption: decrement months_remaining by 1 (one month consumed)
    if (advanceUpdateIdsFull.length > 0) {
      await client.query(
        'UPDATE advance_payments SET months_remaining = months_remaining - 1 WHERE id = ANY($1)',
        [advanceUpdateIdsFull]
      );
    }
    // Partial consumption: set months_remaining to 0 (all advance consumed)
    if (advanceUpdateIdsPartial.length > 0) {
      await client.query(
        'UPDATE advance_payments SET months_remaining = 0 WHERE id = ANY($1)',
        [advanceUpdateIdsPartial]
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

    // ========== TEACHER SALARY AUTO-GENERATION ==========
    // Get all active teachers
    const teachersResult = await client.query('SELECT * FROM teachers WHERE is_active = true');

    if (teachersResult.rows.length > 0) {
      // Get previous month's teacher salary data
      let prevMonthTeacherSalariesMap = {};
      if (prevMonthResult.rows.length > 0) {
        const prevMonthId = prevMonthResult.rows[0].id;
        const prevMonthTeacherSalaries = await client.query(
          'SELECT teacher_id, outstanding_after_payment, advance_months_remaining, amount_paid_this_month FROM teacher_salary_records WHERE billing_month_id = $1',
          [prevMonthId]
        );
        prevMonthTeacherSalaries.rows.forEach(salary => {
          prevMonthTeacherSalariesMap[salary.teacher_id] = salary;
        });
      }

      // Get all teacher advance payments
      const teacherIds = teachersResult.rows.map(t => t.id);
      const allTeacherAdvancePayments = await client.query(
        'SELECT teacher_id, months_remaining, amount_per_month, id FROM teacher_advance_payments WHERE teacher_id = ANY($1) AND months_remaining > 0 ORDER BY teacher_id, created_at ASC',
        [teacherIds]
      );
      const teacherAdvancePaymentsMap = {};
      allTeacherAdvancePayments.rows.forEach(advance => {
        if (!teacherAdvancePaymentsMap[advance.teacher_id]) {
          teacherAdvancePaymentsMap[advance.teacher_id] = advance;
        }
      });

      // Prepare batch insert data for teacher salaries
      const teacherSalaryInsertValues = [];
      const teacherAdvanceUpdateIds = [];

      for (const teacher of teachersResult.rows) {
        let previousOutstanding = 0;
        let advanceMonthsRemaining = 0;
        let previousPaid = 0;

        // Get previous month's data from map
        if (prevMonthTeacherSalariesMap[teacher.id]) {
          const prevSalary = prevMonthTeacherSalariesMap[teacher.id];
          previousOutstanding = parseFloat(prevSalary.outstanding_after_payment || 0);
          advanceMonthsRemaining = parseInt(prevSalary.advance_months_remaining || 0);
          previousPaid = parseFloat(prevSalary.amount_paid_this_month || 0);
        }

        // Get teacher advance payment from map
        const teacherAdvance = teacherAdvancePaymentsMap[teacher.id];
        let totalDue = teacher.monthly_salary;
        let status = 'unpaid';
        let advanceBalanceUsed = 0;

        // Determine status based on previous month payment
        if (previousPaid > 0 && previousOutstanding === 0) {
          // Teacher was paid last month
          status = 'paid';
        } else if (previousOutstanding > 0) {
          // Teacher has outstanding from previous month
          status = 'outstanding';
          totalDue = teacher.monthly_salary + previousOutstanding;
        }

        // If teacher has advance payment, reduce due amount
        if (teacherAdvance && advanceMonthsRemaining > 0) {
          const advanceAmountPerMonth = parseFloat(teacherAdvance.amount_per_month);
          
          if (advanceAmountPerMonth >= teacher.monthly_salary) {
            // Advance covers full salary
            advanceBalanceUsed = teacher.monthly_salary;
            totalDue = previousOutstanding; // Only previous outstanding remains
            status = previousOutstanding > 0 ? 'advance_applied' : 'advance_covered';
            teacherAdvanceUpdateIds.push(teacherAdvance.id);
          } else {
            // Partial advance - reduce salary by advance amount
            advanceBalanceUsed = advanceAmountPerMonth;
            totalDue = teacher.monthly_salary - advanceAmountPerMonth + previousOutstanding;
            status = totalDue === 0 ? 'advance_covered' : 'advance_applied';
            teacherAdvanceUpdateIds.push(teacherAdvance.id);
          }
        }

        // Prepare insert values for batch insert
        teacherSalaryInsertValues.push([
          teacher.id,
          newMonth.id,
          teacher.monthly_salary,
          advanceBalanceUsed,
          totalDue,
          0, // amount_paid_this_month
          totalDue, // outstanding_after_payment
          status,
          advanceMonthsRemaining > 0 ? advanceMonthsRemaining - (teacherAdvance && advanceMonthsRemaining > 0 ? 1 : 0) : 0
        ]);
      }

      // Batch update teacher advance payments (only if any need updating)
      if (teacherAdvanceUpdateIds.length > 0) {
        await client.query(
          'UPDATE teacher_advance_payments SET months_remaining = months_remaining - 1 WHERE id = ANY($1)',
          [teacherAdvanceUpdateIds]
        );
      }

      // Batch insert all teacher_salary_records
      if (teacherSalaryInsertValues.length > 0) {
        const teacherValues = teacherSalaryInsertValues.map((v, idx) => 
          `($${idx * 9 + 1}, $${idx * 9 + 2}, $${idx * 9 + 3}, $${idx * 9 + 4}, $${idx * 9 + 5}, $${idx * 9 + 6}, $${idx * 9 + 7}, $${idx * 9 + 8}, $${idx * 9 + 9})`
        ).join(', ');
        
        const teacherParams = teacherSalaryInsertValues.flat();
        
        await client.query(
          `INSERT INTO teacher_salary_records 
           (teacher_id, billing_month_id, monthly_salary, advance_balance_used, total_due_this_month, 
            amount_paid_this_month, outstanding_after_payment, status, advance_months_remaining)
           VALUES ${teacherValues}`,
          teacherParams
        );
      }
    }
    // ========== END TEACHER SALARY AUTO-GENERATION ==========

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
router.delete('/:monthId', authenticateToken, requireAdmin, async (req, res) => {
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
        p.monthly_fee_amount as parent_monthly_fee,
        p.branch
      FROM parent_month_fee pmf
      JOIN parents p ON pmf.parent_id = p.id
      WHERE pmf.billing_month_id = $1
    `;

    const params = [monthId];
    const { branch } = req.query;

    if (status && status !== 'all') {
      if (status === 'outstanding') {
        // Outstanding: has outstanding balance > 0
        query += ` AND pmf.outstanding_after_payment > 0`;
      } else {
      query += ` AND pmf.status = $${params.length + 1}`;
      params.push(status);
      }
    }

    // Add branch filter if provided (only if branch column exists)
    if (branch && branch !== 'all') {
      try {
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'parents' AND column_name = 'branch'
        `);
        if (columnCheck.rows.length > 0) {
          query += ` AND p.branch = $${params.length + 1}`;
          params.push(branch);
        }
      } catch (err) {
        // If check fails, skip branch filtering
        console.warn('Branch column check failed, skipping branch filter:', err.message);
      }
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


