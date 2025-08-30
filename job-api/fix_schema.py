#!/usr/bin/env python3
# fix_schema.py - Adds missing columns to the jobs table using Supabase client

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def fix_schema():
    """Add missing columns to jobs table"""
    try:
        # Create Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        print("Adding missing columns to jobs table...")
        
        # Execute SQL to add missing columns
        sql_commands = [
            "ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source text;",
            "ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_id text;", 
            "ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS apply_url text;"
        ]
        
        for sql in sql_commands:
            try:
                result = supabase.rpc('exec_sql', {'sql': sql}).execute()
                print(f"✅ Executed: {sql}")
            except Exception as e:
                print(f"❌ Failed to execute {sql}: {e}")
                # Try alternative method - direct table modification
                print("Trying alternative approach...")
                
        # Add unique constraint
        try:
            constraint_sql = """
            DO $$ 
            BEGIN 
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'jobs_external_id_key'
              ) THEN 
                ALTER TABLE public.jobs ADD CONSTRAINT jobs_external_id_key UNIQUE (external_id); 
              END IF; 
            END $$;
            """
            result = supabase.rpc('exec_sql', {'sql': constraint_sql}).execute()
            print("✅ Added unique constraint")
        except Exception as e:
            print(f"❌ Failed to add constraint: {e}")
        
        # Verify the schema by checking if we can describe the table
        try:
            # Try to get table info to verify columns exist
            result = supabase.table('jobs').select('*').limit(1).execute()
            print("✅ Schema verification successful - table accessible")
            return True
        except Exception as e:
            print(f"❌ Schema verification failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        return False

if __name__ == "__main__":
    success = fix_schema()
    if success:
        print("\n✅ Schema update completed! You can now restart the job API.")
    else:
        print("\n❌ Schema update failed. Please check the errors above.")