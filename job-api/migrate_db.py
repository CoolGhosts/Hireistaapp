#!/usr/bin/env python3
# migrate_db.py - Apply database migrations using Supabase REST API

import os
import requests
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def migrate_database():
    # Add the columns and unique constraint to jobs table
    migration_sql = """
    -- Add source and external_id columns
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source text;
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_id text;
    
    -- Add unique constraint on external_id (if it doesn't exist)
    DO $$ 
    BEGIN 
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'jobs_external_id_key'
        ) THEN 
            ALTER TABLE jobs ADD CONSTRAINT jobs_external_id_key UNIQUE (external_id); 
        END IF; 
    END $$;
    """
    
    print("Applying database migrations...")
    
    # Prepare the REST API request
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    # Send the SQL query via the REST API
    try:
        # Use the REST API endpoint for SQL queries
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/pg_query",
            headers=headers,
            json={"query": migration_sql}
        )
        
        if response.status_code == 200:
            print("✅ Database migration successful!")
            return True
        else:
            print(f"❌ Error applying migrations: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Exception during migration: {e}")
        return False

if __name__ == "__main__":
    migrate_database()
