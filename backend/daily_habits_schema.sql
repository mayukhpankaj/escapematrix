-- Create daily_habits table
CREATE TABLE IF NOT EXISTS daily_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    habit_name TEXT NOT NULL,
    color TEXT DEFAULT '#8b5cf6',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create habit_completions table
CREATE TABLE IF NOT EXISTS habit_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES daily_habits(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    completion_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, completion_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_habits_user_id ON daily_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completion_date);

-- Enable Row Level Security (RLS)
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON daily_habits;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON habit_completions;

-- Create RLS policies
CREATE POLICY "Enable all access for authenticated users" ON daily_habits FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON habit_completions FOR ALL USING (true);
