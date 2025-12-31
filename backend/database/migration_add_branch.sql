-- Migration: Add Branch Field to Parents Table
-- Date: 2025-01-XX
-- Description: Adds branch field for student filtering (Branch 1, Branch 2)

-- Add branch column to parents table
ALTER TABLE parents 
ADD COLUMN IF NOT EXISTS branch VARCHAR(50) DEFAULT 'Branch 1'
CHECK (branch IN ('Branch 1', 'Branch 2'));

-- Update existing records to Branch 1 if NULL
UPDATE parents SET branch = 'Branch 1' WHERE branch IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_parents_branch ON parents(branch);

-- Add composite index for filtering by branch and status
CREATE INDEX IF NOT EXISTS idx_parent_month_fee_branch ON parent_month_fee(parent_id);
-- Note: Branch filtering will be done via JOIN with parents table

