-- Additional Performance Indexes for Faster Queries

-- Index for parent_month_fee status lookups (commonly filtered)
CREATE INDEX IF NOT EXISTS idx_parent_month_fee_status ON parent_month_fee(status);

-- Composite index for parent_month_fee active month lookups
CREATE INDEX IF NOT EXISTS idx_parent_month_fee_parent_active ON parent_month_fee(parent_id, status) 
WHERE status IN ('paid', 'unpaid', 'partial', 'advanced');

-- Index for billing_months active lookup
CREATE INDEX IF NOT EXISTS idx_billing_months_active ON billing_months(is_active) 
WHERE is_active = true;

-- Index for parent_month_fee parent and month lookup (frequently joined)
CREATE INDEX IF NOT EXISTS idx_parent_month_fee_parent_month ON parent_month_fee(parent_id, billing_month_id);

-- Index for advance_payments lookups
CREATE INDEX IF NOT EXISTS idx_advance_payments_parent ON advance_payments(parent_id, months_remaining);

-- Index for payment_items payment lookup
CREATE INDEX IF NOT EXISTS idx_payment_items_payment ON payment_items(payment_id);

-- Index for parent_name searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_parents_name_lower ON parents(LOWER(parent_name));

-- Index for payments parent and date (common sorting)
CREATE INDEX IF NOT EXISTS idx_payments_parent_date ON payments(parent_id, payment_date DESC);

-- Partial index for outstanding balances (only non-zero)
CREATE INDEX IF NOT EXISTS idx_parent_month_fee_outstanding ON parent_month_fee(outstanding_after_payment) 
WHERE outstanding_after_payment > 0;

