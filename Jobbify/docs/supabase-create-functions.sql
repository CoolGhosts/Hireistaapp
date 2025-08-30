-- SQL Functions for Jobbify Supabase Setup
-- Copy this file and execute in the Supabase SQL Editor

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

-- Create required tables if they don't exist
DO $$
BEGIN
  -- Profiles table
  CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT,
    email TEXT,
    user_type TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- Add any missing columns to profiles
  BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Error adding columns to profiles: %', SQLERRM;
  END;

  -- Job seeker profiles table
  CREATE TABLE IF NOT EXISTS job_seeker_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    bio TEXT,
    title TEXT,
    resume_url TEXT
  );

  -- Service provider profiles table
  CREATE TABLE IF NOT EXISTS service_provider_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    bio TEXT,
    service_area TEXT,
    availability TEXT
  );
END
$$;

-- Add Row Level Security (RLS) policies
-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Enable RLS on job_seeker_profiles
ALTER TABLE job_seeker_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own job seeker profile
CREATE POLICY "Users can view own job seeker profile"
  ON job_seeker_profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own job seeker profile
CREATE POLICY "Users can update own job seeker profile"
  ON job_seeker_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to insert their own job seeker profile
CREATE POLICY "Users can insert own job seeker profile"
  ON job_seeker_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create a trigger to automatically create profiles on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, user_type, created_at)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'user_type',
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 