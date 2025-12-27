-- Update database constraint - Remove PENDING, keep TO-DO, IN-PROGRESS, COMPLETED
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add new constraint WITHOUT PENDING
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('TO-DO', 'IN-PROGRESS', 'COMPLETED'));

-- Update any existing PENDING tasks to TO-DO
UPDATE tasks SET status = 'TO-DO' WHERE status = 'PENDING';
