-- Migration: Add Student Status, Teacher Salary Enhancements, and Status Filter Updates
-- Date: 2025-01-XX
-- Description: Adds student suspend/pending status, teacher salary advance_applied status, and enhancements

-- 1. Add student status to parents table (Active/Suspended)
-- Default to 'active' for existing records
ALTER TABLE parents 
ADD COLUMN IF NOT EXISTS student_status VARCHAR(20) DEFAULT 'active' 
CHECK (student_status IN ('active', 'suspended'));

-- Update existing records to active if NULL
UPDATE parents SET student_status = 'active' WHERE student_status IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_parents_student_status ON parents(student_status);

-- 2. Update teacher_salary_records status constraint to include 'advance_applied'
ALTER TABLE teacher_salary_records 
DROP CONSTRAINT IF EXISTS teacher_salary_records_status_check;

ALTER TABLE teacher_salary_records 
ADD CONSTRAINT teacher_salary_records_status_check 
CHECK (status IN ('paid', 'unpaid', 'partial', 'advance_covered', 'outstanding', 'advance_applied'));

-- 3. Add index for department filtering on teacher salary records
CREATE INDEX IF NOT EXISTS idx_teacher_salary_records_month_status ON teacher_salary_records(billing_month_id, status);



