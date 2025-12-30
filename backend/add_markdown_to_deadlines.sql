-- Add markdown_content column to deadlines table
ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS markdown_content TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_deadlines_markdown ON deadlines(markdown_content);
