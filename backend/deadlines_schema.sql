-- Create deadlines table
CREATE TABLE IF NOT EXISTS deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    task_description TEXT,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    deadline_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN-PROGRESS', 'COMPLETED', 'OVERDUE')),
    priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deadlines_user_id ON deadlines(user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_status ON deadlines(status);
CREATE INDEX IF NOT EXISTS idx_deadlines_deadline_time ON deadlines(deadline_time);

-- Enable Row Level Security (RLS)
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON deadlines;

-- Create RLS policies
CREATE POLICY "Enable all access for authenticated users" ON deadlines FOR ALL USING (true);

-- Create function to auto-update status to OVERDUE
CREATE OR REPLACE FUNCTION update_overdue_deadlines()
RETURNS void AS $$
BEGIN
    UPDATE deadlines
    SET status = 'OVERDUE', updated_at = NOW()
    WHERE deadline_time < NOW()
    AND status NOT IN ('COMPLETED', 'OVERDUE');
END;
$$ LANGUAGE plpgsql;
