#!/usr/bin/env python3
# update_schema.py - Adds new columns to the jobs table

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def update_schema():
    # SQL to add columns and create unique constraint
    # Note: This uses Supabase's SQL interface to execute raw SQL
    sql = """
    -- Add new columns if they don't exist
    ALTER TABLE public.jobs
      ADD COLUMN IF NOT EXISTS source text,
      ADD COLUMN IF NOT EXISTS external_id text,
      ADD COLUMN IF NOT EXISTS apply_url text;
    
    -- Add a unique constraint for external_id
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'jobs_external_id_key'
        ) THEN
            ALTER TABLE public.jobs
            ADD CONSTRAINT jobs_external_id_key UNIQUE (external_id);
        END IF;
    END $$;
    """
    
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/pg_query",
            headers=headers,
            json={"query": sql},
        )

        if response.status_code == 200:
            print("✅ Schema updated successfully!")
            return True
        else:
            print(f"❌ Error updating schema: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error updating schema: {e}")
        return False

if __name__ == "__main__":
    update_schema()
