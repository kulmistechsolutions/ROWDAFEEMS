import express from 'express';
import pool from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create payment
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { parent_id, billing_month_id, amount, payment_type, months_advance, notes } = req.body;
    const collected_by = req.user.id;

    if (!parent_id || !billing_month_id || !amount || amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid payment data' });
    }

    // Validate advance payment requirements
    if (payment_type === 'advance' && (!months_advance || months_advance <= 0)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Months in advance is required for advance payments' });
    }

    // Get parent and month info
    const parentResult = await client.query('SELECT * FROM parents WHERE id = $1', [parent_id]);
    if (parentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Parent not found' });
    }

    const parent = parentResult.rows[0];
    
    // Prevent payment collection for suspended students
    if (parent.student_status === 'suspended') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot collect payment for suspended students. Please reactivate the student first.' });
    }
    const monthResult = await client.query('SELECT * FROM billing_months WHERE id = $1', [billing_month_id]);
    if (monthResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Month not found' });
    }

    // Get current month fee status (only needed for normal/partial payments)
    let fee = null;
    let feeResult = null;
    
    if (payment_type !== 'advance') {
      feeResult = await client.query(
        'SELECT * FROM parent_month_fee WHERE parent_id = $1 AND billing_month_id = $2',
        [parent_id, billing_month_id]
      );

      if (feeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Fee record not found for this month. Please set up the month first or use advance payment.' });
      }

      fee = feeResult.rows[0];

      // STRICT VALIDATION: Check if month is already fully paid (only for normal/partial payments)
      // Advance payments are always allowed, even if month is paid
      if (fee.status === 'paid' && payment_type !== 'advance') {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'This month is already fully paid. Please select Advance Payment to pay for future months.' 
        });
      }

      // STRICT VALIDATION: For normal payments, check if amount exceeds monthly due
      const paymentAmount = parseFloat(amount);
      const feePaid = parseFloat(fee.amount_paid_this_month || 0);
      const feeTotalDue = parseFloat(fee.total_due_this_month || 0);
      const remainingDue = feeTotalDue - feePaid;

      if (payment_type === 'normal' && paymentAmount > remainingDue) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Amount exceeds this month's payable fee. Select Advance Payment to pay extra. Maximum allowed: $${remainingDue.toFixed(2)}` 
        });
      }

      // STRICT VALIDATION: For partial payments, amount must be less than remaining due
      if (payment_type === 'partial' && paymentAmount >= remainingDue) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Partial payment amount must be less than the remaining due ($${remainingDue.toFixed(2)}). Use normal payment for full amount or Advance Payment for extra.` 
        });
      }
    } else {
      // For advance payments, get or create fee record for current month if needed
      feeResult = await client.query(
        'SELECT * FROM parent_month_fee WHERE parent_id = $1 AND billing_month_id = $2',
        [parent_id, billing_month_id]
      );

      if (feeResult.rows.length === 0) {
        // Create a fee record for advance payment tracking
        const insertResult = await client.query(
          `INSERT INTO parent_month_fee (parent_id, billing_month_id, monthly_fee, carried_forward_amount, total_due_this_month, amount_paid_this_month, outstanding_after_payment, status)
           VALUES ($1, $2, $3, 0, $3, 0, $3, 'unpaid') RETURNING *`,
          [parent_id, billing_month_id, parent.monthly_fee_amount]
        );
        fee = insertResult.rows[0];
      } else {
        fee = feeResult.rows[0];
      }
    }

    let paymentType = payment_type || 'normal';
    let remainingBalance = 0;
    let newStatus = fee ? fee.status : 'unpaid';
    let newOutstanding = fee ? fee.outstanding_after_payment : 0;
    let newPaid = fee ? fee.amount_paid_this_month : 0;
    let advanceMonths = 0;

    // Handle different payment types
    if (payment_type === 'advance' && months_advance) {
      // Advance payment
      paymentType = 'advance';
      advanceMonths = months_advance;
      
      // Update fee status for advance payment
      newStatus = 'advanced';
    } else {
      // Normal or partial payment
      const feePaid = parseFloat(fee.amount_paid_this_month || 0);
      const feeTotalDue = parseFloat(fee.total_due_this_month || 0);
      const paymentAmount = parseFloat(amount);
      
      newPaid = feePaid + paymentAmount;
      newOutstanding = feeTotalDue - newPaid;

      if (newOutstanding <= 0) {
        newStatus = 'paid';
        newOutstanding = 0;
      } else if (newPaid > 0) {
        newStatus = 'partial';
      }

      remainingBalance = newOutstanding;
    }

    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (parent_id, billing_month_id, amount, payment_type, collected_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [parent_id, billing_month_id, amount, paymentType, collected_by, notes]
    );

    const payment = paymentResult.rows[0];

    // Create payment items
    if (payment_type === 'advance') {
      // Create payment item for advance payment
      await client.query(
        `INSERT INTO payment_items (payment_id, item_type, amount, months_covered)
         VALUES ($1, 'advance', $2, $3)`,
        [payment.id, amount, months_advance]
      );
      
      // Create or update advance payment record (AFTER payment is created so we have payment_id)
      const existingAdvance = await client.query(
        'SELECT * FROM advance_payments WHERE parent_id = $1 ORDER BY id DESC LIMIT 1',
        [parent_id]
      );

      if (existingAdvance.rows.length > 0) {
        // Update existing advance payment - accumulate months and update payment_id reference
        await client.query(
          `UPDATE advance_payments 
           SET months_paid = months_paid + $1, 
               months_remaining = months_remaining + $1,
               amount_per_month = $2,
               payment_id = $3
           WHERE parent_id = $4 AND id = $5`,
          [months_advance, parent.monthly_fee_amount, payment.id, parent_id, existingAdvance.rows[0].id]
        );
      } else {
        // Create new advance payment record with payment_id
        await client.query(
          `INSERT INTO advance_payments (parent_id, payment_id, months_paid, months_remaining, amount_per_month)
           VALUES ($1, $2, $3, $3, $4)`,
          [parent_id, payment.id, months_advance, parent.monthly_fee_amount]
        );
      }
      
      // CRITICAL: Increase advance_balance in parents table
      // Advance amount = months_advance * monthly_fee_amount
      const advanceAmount = parseFloat(amount);
      await client.query(
        'UPDATE parents SET advance_balance = COALESCE(advance_balance, 0) + $1 WHERE id = $2',
        [advanceAmount, parent_id]
      );
    } else {
      // Split payment: monthly fee and carried forward
      const feeMonthlyFee = parseFloat(fee.monthly_fee || 0);
      const feePaid = parseFloat(fee.amount_paid_this_month || 0);
      const monthlyFeeAmount = Math.min(parseFloat(amount), feeMonthlyFee - feePaid);
      const carriedForwardAmount = parseFloat(amount) - monthlyFeeAmount;

      if (monthlyFeeAmount > 0) {
        await client.query(
          `INSERT INTO payment_items (payment_id, item_type, amount)
           VALUES ($1, 'monthly_fee', $2)`,
          [payment.id, monthlyFeeAmount]
        );
      }

      if (carriedForwardAmount > 0) {
        await client.query(
          `INSERT INTO payment_items (payment_id, item_type, amount)
           VALUES ($1, 'carried_forward', $2)`,
          [payment.id, carriedForwardAmount]
        );
      }
    }

    // Update parent_month_fee (fee should exist at this point)
    if (fee) {
      if (payment_type === 'advance') {
        // For advance payments, update status and advance months remaining
        await client.query(
          `UPDATE parent_month_fee
           SET status = $1,
               advance_months_remaining = $2
           WHERE parent_id = $3 AND billing_month_id = $4`,
          [newStatus, advanceMonths, parent_id, billing_month_id]
        );
      } else {
        // For normal/partial payments, update all fields
        await client.query(
          `UPDATE parent_month_fee
           SET amount_paid_this_month = $1,
               outstanding_after_payment = $2,
               status = $3,
               advance_months_remaining = CASE WHEN $4 > 0 THEN $4 ELSE advance_months_remaining END
           WHERE parent_id = $5 AND billing_month_id = $6`,
          [newPaid, newOutstanding, newStatus, advanceMonths, parent_id, billing_month_id]
        );
      }
    }

    // Generate SMS text
    let smsText = '';
    if (payment_type === 'advance') {
      smsText = `Dear ${parent.parent_name}, you have made an advance payment of ${amount} for ${months_advance} month(s) at Rowdatul Iimaan School. Thank you.`;
    } else {
      smsText = `Dear ${parent.parent_name}, you have paid ${amount} for ${monthResult.rows[0].month}/${monthResult.rows[0].year} at Rowdatul Iimaan School. Remaining balance: ${remainingBalance}. Thank you.`;
    }

    // Update payment with SMS text
    await client.query(
      'UPDATE payments SET sms_text = $1 WHERE id = $2',
      [smsText, payment.id]
    );

    await client.query('COMMIT');

    // Fetch updated payment with SMS
    const updatedPayment = await client.query(
      'SELECT * FROM payments WHERE id = $1',
      [payment.id]
    );

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('payment:created', {
        payment: updatedPayment.rows[0],
        parent_id: parent_id,
        billing_month_id: billing_month_id
      });
      io.emit('parent:updated', { parent_id: parent_id });
      io.emit('month:updated', { billing_month_id: billing_month_id });
      io.emit('reports:updated');
    }

    res.status(201).json({
      payment: updatedPayment.rows[0],
      sms_text: smsText,
      remaining_balance: remainingBalance
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create payment error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Failed to create payment',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Please check server logs for details'
    });
  } finally {
    client.release();
  }
});

// Get payment receipt
router.get('/:id/receipt', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.*,
        pr.parent_name,
        pr.phone_number,
        pr.number_of_children,
        bm.year,
        bm.month,
        u.username as collected_by_username,
        pi.item_type,
        pi.amount as item_amount,
        pi.months_covered
      FROM payments p
      JOIN parents pr ON p.parent_id = pr.id
      JOIN billing_months bm ON p.billing_month_id = bm.id
      JOIN users u ON p.collected_by = u.id
      LEFT JOIN payment_items pi ON pi.payment_id = p.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Group payment items
    const payment = {
      ...result.rows[0],
      items: result.rows.map(row => ({
        type: row.item_type,
        amount: row.item_amount,
        months_covered: row.months_covered
      }))
    };

    res.json(payment);
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

export default router;

