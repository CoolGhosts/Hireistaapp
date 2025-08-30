#!/usr/bin/env python3
# direct_migration.py - Direct PostgreSQL connection to add missing columns

import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get direct PostgreSQL connection from Supabase URL"""
    supabase_url = os.getenv("SUPABASE_URL")
    
    # Convert Supabase URL to PostgreSQL connection string
    # Supabase format: https://project.supabase.co
    # PostgreSQL format: postgresql://postgres:password@db.project.supabase.co:5432/postgres
    
    if supabase_url:
        parsed = urlparse(supabase_url)
        project_ref = parsed.hostname.split('.')[0]
        
        # Construct PostgreSQL connection string
        # Note: You'll need the database password from Supabase dashboard
        db_host = f"db.{project_ref}.supabase.co"
        db_port = "5432"
        db_name = "postgres"
        db_user = "postgres"
        
        print(f"To connect directly to PostgreSQL:")
        print(f"Host: {db_host}")
        print(f"Port: {db_port}")
        print(f"Database: {db_name}")
        print(f"User: {db_user}")
        print(f"\nYou need to get the database password from your Supabase dashboard.")
        print(f"Go to: https://supabase.com/dashboard/project/{project_ref}/settings/database")
        
        return None  # Can't connect without password
    
    return None

def run_migration_with_password(password):
    """Run migration with provided password"""
    supabase_url = os.getenv("SUPABASE_URL")
    parsed = urlparse(supabase_url)
    project_ref = parsed.hostname.split('.')[0]
    
    connection_string = f"postgresql://postgres:{password}@db.{project_ref}.supabase.co:5432/postgres"
    
    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        # Execute migration SQL
        migration_sql = """
        -- Add missing columns
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source text;
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_id text;
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS apply_url text;
        
        -- Add unique constraint for external_id
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
        
        cursor.execute(migration_sql)
        conn.commit()
        
        print("✅ Migration completed successfully!")
        
        # Verify columns
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'jobs' AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print("\nCurrent jobs table columns:")
        for col_name, col_type in columns:
            print(f"  - {col_name}: {col_type}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("Direct PostgreSQL Migration Tool")
    print("=" * 40)
    
    # Show connection info
    get_db_connection()
    
    print("\nTo run the migration:")
    print("1. Get your database password from Supabase dashboard")
    print("2. Run: python direct_migration.py <password>")
    print("\nAlternatively, you can:")
    print("1. Copy the SQL from manual_migration.sql")
    print("2. Run it directly in Supabase SQL Editor")
    print("   Go to: https://supabase.com/dashboard/project/[your-project]/sql")