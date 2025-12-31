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
    branch VARCHAR(50) DEFAULT 'Branch 1' CHECK (branch IN ('Branch 1', 'Branch 2')),
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

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    teacher_name VARCHAR(255) NOT NULL,
    department VARCHAR(50) NOT NULL CHECK (department IN ('Quraan', 'Primary/Middle/Secondary', 'Shareeca')),
    monthly_salary DECIMAL(10, 2) NOT NULL,
    phone_number VARCHAR(20),
    date_of_joining DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher salary records table (tracks each teacher's salary status per month)
CREATE TABLE IF NOT EXISTS teacher_salary_records (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    billing_month_id INTEGER NOT NULL REFERENCES billing_months(id) ON DELETE CASCADE,
    monthly_salary DECIMAL(10, 2) NOT NULL,
    advance_balance_used DECIMAL(10, 2) DEFAULT 0,
    total_due_this_month DECIMAL(10, 2) NOT NULL,
    amount_paid_this_month DECIMAL(10, 2) DEFAULT 0,
    outstanding_after_payment DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial', 'advance_covered', 'outstanding')),
    advance_months_remaining INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, billing_month_id)
);

-- Teacher salary payments table
CREATE TABLE IF NOT EXISTS teacher_salary_payments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    billing_month_id INTEGER NOT NULL REFERENCES billing_months(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('normal', 'partial', 'advance')),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_by INTEGER NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher advance payments tracking
CREATE TABLE IF NOT EXISTS teacher_advance_payments (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    payment_id INTEGER NOT NULL REFERENCES teacher_salary_payments(id) ON DELETE CASCADE,
    months_paid INTEGER NOT NULL,
    months_remaining INTEGER NOT NULL,
    amount_per_month DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    billing_month_id INTEGER REFERENCES billing_months(id) ON DELETE SET NULL,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for teachers and expenses
CREATE INDEX IF NOT EXISTS idx_teachers_department ON teachers(department);
CREATE INDEX IF NOT EXISTS idx_teachers_active ON teachers(is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_salary_records_teacher ON teacher_salary_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_salary_records_month ON teacher_salary_records(billing_month_id);
CREATE INDEX IF NOT EXISTS idx_teacher_salary_payments_teacher ON teacher_salary_payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_salary_payments_month ON teacher_salary_payments(billing_month_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(billing_month_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- Triggers for updated_at
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_salary_records_updated_at BEFORE UPDATE ON teacher_salary_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_advance_payments_updated_at BEFORE UPDATE ON teacher_advance_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default expense categories
INSERT INTO expense_categories (category_name, description) VALUES
    ('Maintenance', 'Building and facility maintenance costs'),
    ('Books', 'Educational books and materials'),
    ('Electricity', 'Electricity bills'),
    ('Water', 'Water bills'),
    ('Cleaning', 'Cleaning supplies and services'),
    ('Other', 'Other miscellaneous expenses')
ON CONFLICT (category_name) DO NOTHING;


