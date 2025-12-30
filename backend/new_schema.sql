-- Drop existing tables (this will delete all data)
DROP TABLE IF EXISTS tasks CASCADE;

-- Create long_term_tasks table
CREATE TABLE long_term_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    task_description TEXT,
    status TEXT NOT NULL CHECK (status IN ('TO-DO', 'IN-PROGRESS', 'COMPLETED')),
    priority TEXT NOT NULL CHECK (priority IN ('URGENT-IMPORTANT', 'URGENT-NOTIMPORTANT', 'NOTURGENT-IMPORTANT', 'NOTURGENT-NOTIMPORTANT')),
    markdown_content TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create short_term_tasks table
CREATE TABLE short_term_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    parent_task_id UUID REFERENCES long_term_tasks(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    task_description TEXT,
    status TEXT NOT NULL CHECK (status IN ('TO-DO', 'IN-PROGRESS', 'COMPLETED')),
    priority TEXT NOT NULL CHECK (priority IN ('URGENT-IMPORTANT', 'URGENT-NOTIMPORTANT', 'NOTURGENT-IMPORTANT', 'NOTURGENT-NOTIMPORTANT')),
    repetition_days TEXT[],
    repetition_time TEXT,
    markdown_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_long_term_tasks_user_id ON long_term_tasks(user_id);
CREATE INDEX idx_long_term_tasks_status ON long_term_tasks(status);
CREATE INDEX idx_short_term_tasks_user_id ON short_term_tasks(user_id);
CREATE INDEX idx_short_term_tasks_parent_task_id ON short_term_tasks(parent_task_id);
CREATE INDEX idx_short_term_tasks_status ON short_term_tasks(status);

-- Enable Row Level Security (RLS)
ALTER TABLE long_term_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_term_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (permissive for now - you can make these stricter later)
CREATE POLICY "Enable all access for authenticated users" ON long_term_tasks FOR ALL USING (true);
CREATE POLICY "Enable all access for authenticated users" ON short_term_tasks FOR ALL USING (true);

-- Create function to automatically update progress when child tasks are completed
CREATE OR REPLACE FUNCTION update_long_term_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_children INTEGER;
    completed_children INTEGER;
    new_progress INTEGER;
BEGIN
    -- Only proceed if the short_term_task has a parent
    IF NEW.parent_task_id IS NOT NULL THEN
        -- Count total children
        SELECT COUNT(*) INTO total_children
        FROM short_term_tasks
        WHERE parent_task_id = NEW.parent_task_id;
        
        -- Count completed children
        SELECT COUNT(*) INTO completed_children
        FROM short_term_tasks
        WHERE parent_task_id = NEW.parent_task_id
        AND status = 'COMPLETED';
        
        -- Calculate progress percentage
        IF total_children > 0 THEN
            new_progress := ROUND((completed_children::NUMERIC / total_children::NUMERIC) * 100);
        ELSE
            new_progress := 0;
        END IF;
        
        -- Update parent task progress
        UPDATE long_term_tasks
        SET progress = new_progress,
            updated_at = NOW()
        WHERE id = NEW.parent_task_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update progress on status change
CREATE TRIGGER trigger_update_long_term_progress
AFTER INSERT OR UPDATE OF status ON short_term_tasks
FOR EACH ROW
EXECUTE FUNCTION update_long_term_progress();

-- Also update progress when a child task is deleted
CREATE OR REPLACE FUNCTION update_long_term_progress_on_delete()
RETURNS TRIGGER AS $$
DECLARE
    total_children INTEGER;
    completed_children INTEGER;
    new_progress INTEGER;
BEGIN
    -- Only proceed if the deleted task had a parent
    IF OLD.parent_task_id IS NOT NULL THEN
        -- Count remaining total children
        SELECT COUNT(*) INTO total_children
        FROM short_term_tasks
        WHERE parent_task_id = OLD.parent_task_id;
        
        -- Count completed children
        SELECT COUNT(*) INTO completed_children
        FROM short_term_tasks
        WHERE parent_task_id = OLD.parent_task_id
        AND status = 'COMPLETED';
        
        -- Calculate progress percentage
        IF total_children > 0 THEN
            new_progress := ROUND((completed_children::NUMERIC / total_children::NUMERIC) * 100);
        ELSE
            new_progress := 0;
        END IF;
        
        -- Update parent task progress
        UPDATE long_term_tasks
        SET progress = new_progress,
            updated_at = NOW()
        WHERE id = OLD.parent_task_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_long_term_progress_on_delete
AFTER DELETE ON short_term_tasks
FOR EACH ROW
EXECUTE FUNCTION update_long_term_progress_on_delete();
