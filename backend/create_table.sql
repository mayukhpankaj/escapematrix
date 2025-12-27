-- Escape Matrix Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    task_description TEXT,
    agent_description TEXT,
    task_type TEXT NOT NULL CHECK (task_type IN ('LONG_TERM', 'SHORT_TERM')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('TO-DO', 'PENDING', 'COMPLETED')),
    priority TEXT NOT NULL DEFAULT 'NOTURGENT-NOTIMPORTANT' CHECK (priority IN ('URGENT-IMPORTANT', 'URGENT-NOTIMPORTANT', 'NOTURGENT-IMPORTANT', 'NOTURGENT-NOTIMPORTANT')),
    repetition_days TEXT[],
    repetition_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

-- Create RLS policies
-- Note: Since we're using Clerk, user_id will be stored as Clerk user ID
-- For now, we'll create permissive policies and rely on backend validation

CREATE POLICY "Enable read access for authenticated users" ON tasks
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON tasks
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON tasks
    FOR DELETE USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
