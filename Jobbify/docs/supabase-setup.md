# Supabase Setup for Jobbify

This document outlines the necessary setup for the Supabase backend used by the Jobbify app.

## Required Tables

The app requires the following tables to function properly:

### 1. `profiles` Table

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  email TEXT,
  user_type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. `job_seeker_profiles` Table

```sql
CREATE TABLE IF NOT EXISTS job_seeker_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  bio TEXT,
  title TEXT,
  resume_url TEXT
);
```

### 3. `service_provider_profiles` Table

```sql
CREATE TABLE IF NOT EXISTS service_provider_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  bio TEXT,
  service_area TEXT,
  availability TEXT
);
```

## Required Functions

### 1. SQL Execution Function

Create the following SQL/PostgreSQL function in the Supabase SQL editor:

```sql
-- Create a function that can execute arbitrary SQL
-- IMPORTANT: This is a privileged function and should be restricted in production
CREATE OR REPLACE FUNCTION execute_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
```

### 2. Table Definition Function

Create a function to retrieve table definitions:

```sql
-- Function to get table definition
CREATE OR REPLACE FUNCTION get_table_definition(table_name text)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  table_info json;
BEGIN
  SELECT json_build_object(
    'columns', (
      SELECT json_object_agg(column_name, json_build_object(
        'data_type', data_type,
        'is_nullable', is_nullable
      ))
      FROM information_schema.columns
      WHERE table_name = $1
    ),
    'constraints', (
      SELECT json_agg(json_build_object(
        'name', constraint_name,
        'type', constraint_type
      ))
      FROM information_schema.table_constraints
      WHERE table_name = $1
    )
  ) INTO table_info;
  
  RETURN table_info;
END;
$$;
```

## Security Settings

For proper functioning of the app:

1. Enable Row Level Security (RLS) on all tables
2. Create appropriate policies to restrict access:

```sql
-- Example profile access policy
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

## Email Confirmation

Supabase handles email confirmation by default. To customize:

1. Go to Authentication → Email Templates in the Supabase dashboard
2. Customize the confirmation email template
3. Make sure "Confirm email" is enabled in Authentication → Settings

## Testing the Setup

After creating the tables and functions:

1. Use the Debug Database screen in the app to verify table structure
2. Create a test user and check that profile records are created properly

## Troubleshooting

If you encounter the error "Could not find the 'email' column of 'profiles'":

1. Use the "Fix Database Tables" button in the Debug Database screen
2. Or run the SQL directly in the Supabase SQL editor 