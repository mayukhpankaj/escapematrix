-- Update database constraint to allow IN-PROGRESS status
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add new constraint with IN-PROGRESS included
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('TO-DO', 'PENDING', 'IN-PROGRESS', 'COMPLETED'));
