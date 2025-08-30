#!/usr/bin/env python3
# service_role_migration.py - Use service role to add columns via REST API

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # This should be the service role key

def add_columns_via_insert():
    """Try to add columns by attempting an insert and handling the error"""
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        
        # Try to insert a test record with the missing columns
        # This will fail but might give us more info about the schema
        test_data = {
            "title": "Test Job",
            "company": "Test Company", 
            "location": "Test Location",
            "description": "Test Description",
            "source": "test",
            "external_id": "test_123",
            "apply_url": "https://test.com"
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/jobs",
            headers=headers,
            json=test_data
        )
        
        print(f"Insert test response: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Columns already exist! Deleting test record...")
            # Delete the test record
            delete_response = requests.delete(
                f"{SUPABASE_URL}/rest/v1/jobs?external_id=eq.test_123",
                headers=headers
            )
            print(f"Delete response: {delete_response.status_code}")
            return True
        else:
            print("❌ Columns missing, need manual intervention")
            return False
            
    except Exception as e:
        print(f"❌ Error testing schema: {e}")
        return False

def check_current_schema():
    """Check what columns currently exist in the jobs table"""
    try:
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
        
        # Get a sample record to see current schema
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/jobs?limit=1",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            if data:
                print("Current jobs table columns:")
                for key in data[0].keys():
                    print(f"  - {key}")
                
                missing_columns = []
                required_columns = ['source', 'external_id', 'apply_url']
                
                for col in required_columns:
                    if col not in data[0].keys():
                        missing_columns.append(col)
                
                if missing_columns:
                    print(f"\n❌ Missing columns: {missing_columns}")
                    return False
                else:
                    print("\n✅ All required columns exist!")
                    return True
            else:
                print("No data in jobs table to check schema")
                return False
        else:
            print(f"❌ Error checking schema: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking schema: {e}")
        return False

if __name__ == "__main__":
    print("Service Role Migration Tool")
    print("=" * 30)
    
    print("\n1. Checking current schema...")
    schema_ok = check_current_schema()
    
    if not schema_ok:
        print("\n2. Testing column addition...")
        add_columns_via_insert()
        
        print("\n" + "=" * 50)
        print("MANUAL MIGRATION REQUIRED")
        print("=" * 50)
        print("\nThe database schema needs to be updated manually.")
        print("\nOption 1 - Use Supabase SQL Editor:")
        print(f"1. Go to: https://supabase.com/dashboard/project/ubueawlkwlvgzxcslats/sql")
        print("2. Copy and run the SQL from manual_migration.sql")
        print("\nOption 2 - Use direct PostgreSQL connection:")
        print("1. Get database password from Supabase dashboard")
        print("2. Use psql or any PostgreSQL client to run the migration")
        
        print("\nAfter running the migration, restart the job API to resolve the errors.")
    else:
        print("\n✅ Schema is already up to date!")