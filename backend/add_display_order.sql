-- Add display_order field to both tables
ALTER TABLE long_term_tasks ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE short_term_tasks ADD COLUMN display_order INTEGER DEFAULT 0;

-- Set initial order based on created_at for existing tasks
UPDATE long_term_tasks 
SET display_order = subquery.row_num 
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at) as row_num 
    FROM long_term_tasks
) AS subquery 
WHERE long_term_tasks.id = subquery.id;

UPDATE short_term_tasks 
SET display_order = subquery.row_num 
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at) as row_num 
    FROM short_term_tasks
) AS subquery 
WHERE short_term_tasks.id = subquery.id;

-- Add indexes for better performance
CREATE INDEX idx_long_term_tasks_display_order ON long_term_tasks(user_id, status, display_order);
CREATE INDEX idx_short_term_tasks_display_order ON short_term_tasks(user_id, status, display_order);
