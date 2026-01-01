-- Migration: Add advance_balance column to parents table
-- Date: 2025-01-XX
-- Description: Adds advance_balance field to track monetary advance payments

-- Add advance_balance column to parents table
ALTER TABLE parents 
ADD COLUMN IF NOT EXISTS advance_balance DECIMAL(10, 2) DEFAULT 0;

-- Initialize existing records to 0 if NULL
UPDATE parents SET advance_balance = 0 WHERE advance_balance IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_parents_advance_balance ON parents(advance_balance);

