"""
Supabase Database Setup Script
Creates the tasks table with proper schema and RLS policies
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Create Supabase client with service role key (has admin privileges)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def setup_database():
    """
    Setup the database schema for Escape Matrix app
    Creates tasks table with proper columns and RLS policies
    """
    
    # SQL to create tasks table
    create_table_sql = """
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
    
    -- Create index on user_id for faster queries
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
    """
    
    # Enable RLS (Row Level Security)
    enable_rls_sql = """
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    """
    
    # Create RLS policy - users can only access their own tasks
    create_policy_sql = """
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
    
    -- Create new policies
    CREATE POLICY "Users can view their own tasks" ON tasks
        FOR SELECT USING (auth.uid()::text = user_id);
    
    CREATE POLICY "Users can insert their own tasks" ON tasks
        FOR INSERT WITH CHECK (auth.uid()::text = user_id);
    
    CREATE POLICY "Users can update their own tasks" ON tasks
        FOR UPDATE USING (auth.uid()::text = user_id);
    
    CREATE POLICY "Users can delete their own tasks" ON tasks
        FOR DELETE USING (auth.uid()::text = user_id);
    """
    
    try:
        print("🔧 Setting up database schema...")
        
        # Execute SQL commands
        print("  → Creating tasks table...")
        supabase.rpc('exec_sql', {'sql': create_table_sql}).execute()
        
        print("  → Enabling Row Level Security...")
        supabase.rpc('exec_sql', {'sql': enable_rls_sql}).execute()
        
        print("  → Creating RLS policies...")
        supabase.rpc('exec_sql', {'sql': create_policy_sql}).execute()
        
        print("✅ Database setup completed successfully!")
        print("\nTables created:")
        print("  - tasks (with RLS policies)")
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        print("\n⚠️  Manual Setup Required:")
        print("\nPlease run these SQL commands in your Supabase SQL Editor:")
        print("\n" + "="*60)
        print(create_table_sql)
        print("\n" + enable_rls_sql)
        print("\n" + create_policy_sql)
        print("="*60)

if __name__ == "__main__":
    setup_database()
