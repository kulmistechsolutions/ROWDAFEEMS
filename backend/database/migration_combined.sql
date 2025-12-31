-- Combined Migration: Add Branch and Student Status Fields
-- Date: 2025-01-XX
-- Description: Adds branch field and student_status field to parents table

-- 1. Add branch column to parents table
ALTER TABLE parents 
ADD COLUMN IF NOT EXISTS branch VARCHAR(50) DEFAULT 'Branch 1'
CHECK (branch IN ('Branch 1', 'Branch 2'));

-- Update existing records to Branch 1 if NULL
UPDATE parents SET branch = 'Branch 1' WHERE branch IS NULL;

-- Add index for branch
CREATE INDEX IF NOT EXISTS idx_parents_branch ON parents(branch);

-- 2. Add student_status column to parents table (Active/Suspended)
ALTER TABLE parents 
ADD COLUMN IF NOT EXISTS student_status VARCHAR(20) DEFAULT 'active' 
CHECK (student_status IN ('active', 'suspended'));

-- Update existing records to active if NULL
UPDATE parents SET student_status = 'active' WHERE student_status IS NULL;

-- Add index for student_status
CREATE INDEX IF NOT EXISTS idx_parents_student_status ON parents(student_status);

-- 3. Composite index for performance
CREATE INDEX IF NOT EXISTS idx_parent_month_fee_branch ON parent_month_fee(parent_id);

