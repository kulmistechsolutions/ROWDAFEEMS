import express from 'express';
import pool from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get salary records for a specific month
router.get('/month/:monthId', authenticateToken, async (req, res) => {
  try {
    const { monthId } = req.params;
    const { status, search } = req.query;

    let query = `
      SELECT 
        tsr.*,
        t.teacher_name,
        t.department,
        t.phone_number,
        t.monthly_salary as teacher_monthly_salary
      FROM teacher_salary_records tsr
      JOIN teachers t ON tsr.teacher_id = t.id
      WHERE tsr.billing_month_id = $1
    `;

    const params = [monthId];

    if (status && status !== 'all') {
      query += ` AND tsr.status = $${params.length + 1}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (t.teacher_name ILIKE $${params.length + 1} OR t.phone_number ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY t.teacher_name`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get salary records error:', error);
    res.status(500).json({ error: 'Failed to fetch salary records' });
  }
});

// Pay teacher salary
router.post('/pay', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { teacher_id, billing_month_id, amount, payment_type, months_advance, notes } = req.body;
    const paid_by = req.user.id;

    if (!teacher_id || !billing_month_id || !amount || amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid payment data' });
    }

    // Validate advance payment requirements
    if (payment_type === 'advance' && (!months_advance || months_advance <= 0)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Months in advance is required for advance payments' });
    }

    // Get teacher and month info
    const teacherResult = await client.query('SELECT * FROM teachers WHERE id = $1', [teacher_id]);
    if (teacherResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const teacher = teacherResult.rows[0];
    const monthResult = await client.query('SELECT * FROM billing_months WHERE id = $1', [billing_month_id]);
    if (monthResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Month not found' });
    }

    // Get current salary record
    let salaryRecord = null;
    let salaryResult = null;

    if (payment_type !== 'advance') {
      salaryResult = await client.query(
        'SELECT * FROM teacher_salary_records WHERE teacher_id = $1 AND billing_month_id = $2',
        [teacher_id, billing_month_id]
      );

      if (salaryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Salary record not found for this month. Please set up the month first.' });
      }

      salaryRecord = salaryResult.rows[0];

      // Check if month is already fully paid (for normal payments)
      if (payment_type === 'normal' && salaryRecord.status === 'paid') {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Salary for this month is already fully paid. Only outstanding or advance payments are allowed.' 
        });
      }
    } else {
      // For advance payments, get or create salary record for current month if needed
      salaryResult = await client.query(
        'SELECT * FROM teacher_salary_records WHERE teacher_id = $1 AND billing_month_id = $2',
        [teacher_id, billing_month_id]
      );

      if (salaryResult.rows.length === 0) {
        // Create a salary record for advance payment tracking
        const insertResult = await client.query(
          `INSERT INTO teacher_salary_records (teacher_id, billing_month_id, monthly_salary, total_due_this_month, amount_paid_this_month, outstanding_after_payment, status)
           VALUES ($1, $2, $3, $3, 0, $3, 'unpaid') RETURNING *`,
          [teacher_id, billing_month_id, teacher.monthly_salary]
        );
        salaryRecord = insertResult.rows[0];
      } else {
        salaryRecord = salaryResult.rows[0];
      }
    }

    let paymentType = payment_type || 'normal';
    let remainingBalance = 0;
    let newStatus = salaryRecord.status;
    let newOutstanding = salaryRecord.outstanding_after_payment;
    let newPaid = salaryRecord.amount_paid_this_month;
    let advanceMonths = 0;

    // Handle different payment types
    if (payment_type === 'advance' && months_advance) {
      // Advance payment
      paymentType = 'advance';
      advanceMonths = months_advance;
      newStatus = 'advanced';
      newPaid = parseFloat(newPaid) + parseFloat(amount);
      newOutstanding = parseFloat(newOutstanding);
    } else if (payment_type === 'partial') {
      // Partial payment
      paymentType = 'partial';
      newPaid = parseFloat(newPaid) + parseFloat(amount);
      newOutstanding = parseFloat(salaryRecord.outstanding_after_payment) - parseFloat(amount);
      remainingBalance = newOutstanding;

      if (newOutstanding <= 0) {
        newStatus = 'paid';
        newOutstanding = 0;
      } else {
        newStatus = 'partial';
      }
    } else {
      // Normal payment (full)
      paymentType = 'normal';
      newPaid = parseFloat(salaryRecord.total_due_this_month);
      newOutstanding = 0;
      newStatus = 'paid';
    }

    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO teacher_salary_payments (teacher_id, billing_month_id, amount, payment_type, paid_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [teacher_id, billing_month_id, amount, paymentType, paid_by, notes || null]
    );

    const payment = paymentResult.rows[0];

    // Create advance payment record if needed
    if (payment_type === 'advance' && months_advance) {
      await client.query(
        `INSERT INTO teacher_advance_payments (teacher_id, payment_id, months_paid, months_remaining, amount_per_month)
         VALUES ($1, $2, $3, $3, $4)`,
        [teacher_id, payment.id, months_advance, parseFloat(amount) / months_advance]
      );
    }

    // Update salary record
    await client.query(
      `UPDATE teacher_salary_records 
       SET amount_paid_this_month = $1,
           outstanding_after_payment = $2,
           status = $3,
           advance_months_remaining = CASE WHEN $4 > 0 THEN $4 ELSE advance_months_remaining END
       WHERE id = $5`,
      [newPaid, newOutstanding, newStatus, advanceMonths, salaryRecord.id]
    );

    await client.query('COMMIT');

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('teacher:salary:paid', { teacher_id, billing_month_id, payment });
      io.emit('reports:updated');
    }

    res.status(201).json({
      payment,
      salary_record: {
        ...salaryRecord,
        amount_paid_this_month: newPaid,
        outstanding_after_payment: newOutstanding,
        status: newStatus
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Pay teacher salary error:', error);
    res.status(500).json({ error: 'Failed to process salary payment' });
  } finally {
    client.release();
  }
});

// Get salary summary for dashboard
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM

    let monthQuery = '';
    const params = [];

    if (month) {
      const [year, monthNum] = month.split('-');
      monthQuery = 'WHERE bm.year = $1 AND bm.month = $2';
      params.push(year, monthNum);
    } else {
      monthQuery = 'WHERE bm.is_active = true';
    }

    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT t.id) as total_teachers,
        COALESCE(SUM(tsr.total_due_this_month), 0) as total_salary_required,
        COALESCE(SUM(tsr.amount_paid_this_month), 0) as total_salary_paid,
        COALESCE(SUM(tsr.outstanding_after_payment), 0) as total_salary_outstanding,
        COUNT(CASE WHEN tsr.status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN tsr.status = 'unpaid' THEN 1 END) as unpaid_count,
        COUNT(CASE WHEN tsr.status = 'partial' THEN 1 END) as partial_count
      FROM teachers t
      LEFT JOIN teacher_salary_records tsr ON tsr.teacher_id = t.id
      LEFT JOIN billing_months bm ON tsr.billing_month_id = bm.id
      ${monthQuery}
      AND t.is_active = true
    `;

    const result = await pool.query(summaryQuery, params);

    // Get advance payments remaining
    const advanceQuery = `
      SELECT 
        COALESCE(SUM(tap.amount_per_month * tap.months_remaining), 0) as advance_remaining
      FROM teacher_advance_payments tap
      WHERE tap.months_remaining > 0
    `;
    const advanceResult = await pool.query(advanceQuery);

    res.json({
      summary: {
        ...result.rows[0],
        advance_remaining: parseFloat(advanceResult.rows[0].advance_remaining)
      }
    });
  } catch (error) {
    console.error('Get salary summary error:', error);
    res.status(500).json({ error: 'Failed to fetch salary summary' });
  }
});

export default router;

