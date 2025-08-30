-- Migration for adding resume upload functionality

-- Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a storage bucket for resumes if it doesn't exist
-- Note: This needs to be run in the Supabase SQL editor
-- CREATE STORAGE BUCKET 'resumes';

-- Add resume_url column to job_seeker_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'job_seeker_profiles' AND column_name = 'resume_url'
  ) THEN
    ALTER TABLE job_seeker_profiles 
    ADD COLUMN resume_url TEXT,
    ADD COLUMN resume_name TEXT,
    ADD COLUMN resume_size INTEGER,
    ADD COLUMN resume_type TEXT,
    ADD COLUMN resume_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create or update a function to update the resume_updated_at timestamp
CREATE OR REPLACE FUNCTION update_resume_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.resume_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or update the trigger
DROP TRIGGER IF EXISTS update_job_seeker_profiles_resume_updated_at ON job_seeker_profiles;
CREATE TRIGGER update_job_seeker_profiles_resume_updated_at
BEFORE UPDATE OF resume_url, resume_name, resume_size, resume_type ON job_seeker_profiles
FOR EACH ROW
EXECUTE FUNCTION update_resume_updated_at();

-- Create a policy to allow users to update their own resume
-- This assumes you have RLS enabled on the job_seeker_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'job_seeker_profiles' 
    AND policyname = 'Users can update their own resume'
  ) THEN
    CREATE POLICY "Users can update their own resume"
    ON job_seeker_profiles
    FOR UPDATE
    USING (auth.uid() = profile_id);
  END IF;
END $$;
