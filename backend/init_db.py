"""
Simple Supabase Table Creation
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def create_table():
    """Create tasks table using direct SQL execution"""
    
    # Read the SQL file
    with open('/app/backend/create_table.sql', 'r') as f:
        sql = f.read()
    
    try:
        print("🔧 Creating tasks table in Supabase...")
        # Try to execute via REST API
        response = supabase.postgrest.rpc('exec_sql', {'query': sql}).execute()
        print("✅ Table created successfully!")
    except Exception as e:
        print(f"⚠️  Automated creation failed: {e}")
        print("\n📋 Please manually run the SQL in your Supabase Dashboard:")
        print("   1. Go to https://supabase.com/dashboard")
        print("   2. Select your project")
        print("   3. Go to SQL Editor")
        print("   4. Run the SQL from: /app/backend/create_table.sql")
        print("\n   OR we can proceed with a test insert to check if table already exists...")
        
        # Test if table exists by trying to query it
        try:
            test_response = supabase.table('tasks').select('*').limit(1).execute()
            print("\n✅ Table 'tasks' already exists and is accessible!")
            return True
        except Exception as test_error:
            print(f"\n❌ Table doesn't exist yet. Error: {test_error}")
            return False

if __name__ == "__main__":
    create_table()
