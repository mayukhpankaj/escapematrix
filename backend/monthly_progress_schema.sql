-- Create monthly_progress table to store pre-computed metrics
CREATE TABLE IF NOT EXISTS monthly_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL, -- 1-12
    completed_tasks INTEGER DEFAULT 0,
    max_streak_days INTEGER DEFAULT 0,
    streak_score DECIMAL(5,2) DEFAULT 0.00,
    raw_score DECIMAL(8,2) DEFAULT 0.00,
    normalized_score DECIMAL(5,2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, year, month)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_progress_user_id ON monthly_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_progress_year_month ON monthly_progress(year, month);

-- Enable Row Level Security (RLS)
ALTER TABLE monthly_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON monthly_progress;

-- Create RLS policy
CREATE POLICY "Enable all access for authenticated users" ON monthly_progress FOR ALL USING (true);
