-- Rowdatul Iimaan Fee Management System Database Schema

-- Users table (staff/admin)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
    id SERIAL PRIMARY KEY,
    parent_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    number_of_children INTEGER NOT NULL DEFAULT 1,
    monthly_fee_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phone_number)
);

-- Billing months table
CREATE TABLE IF NOT EXISTS billing_months (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month)
);

-- Parent month fee table (tracks each parent's fee status per month)
CREATE TABLE IF NOT EXISTS parent_month_fee (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    billing_month_id INTEGER NOT NULL REFERENCES billing_months(id) ON DELETE CASCADE,
    monthly_fee DECIMAL(10, 2) NOT NULL,
    carried_forward_amount DECIMAL(10, 2) DEFAULT 0,
    total_due_this_month DECIMAL(10, 2) NOT NULL,
    amount_paid_this_month DECIMAL(10, 2) DEFAULT 0,
    outstanding_after_payment DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial', 'advanced')),
    advance_months_remaining INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, billing_month_id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    billing_month_id INTEGER NOT NULL REFERENCES billing_months(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('normal', 'partial', 'advance', 'carry_forward')),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    collected_by INTEGER NOT NULL REFERENCES users(id),
    sms_text TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment items table (breakdown of payment: normal, carried forward, advance)
CREATE TABLE IF NOT EXISTS payment_items (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('monthly_fee', 'carried_forward', 'advance')),
    amount DECIMAL(10, 2) NOT NULL,
    months_covered INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Advance payments tracking
CREATE TABLE IF NOT EXISTS advance_payments (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    months_paid INTEGER NOT NULL,
    months_remaining INTEGER NOT NULL,
    amount_per_month DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parents_phone ON parents(phone_number);
CREATE INDEX IF NOT EXISTS idx_parent_month_fee_parent ON parent_month_fee(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_month_fee_month ON parent_month_fee(billing_month_id);
CREATE INDEX IF NOT EXISTS idx_payments_parent ON payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(billing_month_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_billing_months_year_month ON billing_months(year, month);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON parents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parent_month_fee_updated_at BEFORE UPDATE ON parent_month_fee
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advance_payments_updated_at BEFORE UPDATE ON advance_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


