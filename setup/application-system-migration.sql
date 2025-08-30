-- Migration for enhancing the job application system with automated emails and better tracking

-- Fix profiles table issues
DO $$
BEGIN
  -- Add missing columns to profiles table
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  
  -- Create service_provider_profiles table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_provider_profiles') THEN
    CREATE TABLE public.service_provider_profiles (
      id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
      company_name TEXT,
      website TEXT,
      services TEXT[],
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Enable RLS on service_provider_profiles
    ALTER TABLE public.service_provider_profiles ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies for service_provider_profiles
    CREATE POLICY "Users can view their own service provider profile" 
      ON public.service_provider_profiles FOR SELECT 
      USING (auth.uid() = id);
      
    CREATE POLICY "Users can update their own service provider profile" 
      ON public.service_provider_profiles FOR UPDATE 
      USING (auth.uid() = id);
  END IF;
END $$;

-- Fix RLS policies for profiles table
DO $$
BEGIN
  -- Drop existing RLS policies on profiles table to recreate them
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  
  -- Create proper RLS policies
  CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);
    
  CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);
END $$;

-- Create admin schema and tables if they don't exist
DO $$
BEGIN
  -- Create admin schema if it doesn't exist
  CREATE SCHEMA IF NOT EXISTS admin;
  
  -- Create admin_users table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'admin' AND tablename = 'admin_users') THEN
    CREATE TABLE admin.admin_users (
      id SERIAL PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id)
    );
  END IF;
  
  -- Create admin functions if they don't exist
  IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'admin')) THEN
    -- Function to check if a user is an admin
    CREATE OR REPLACE FUNCTION admin.is_admin(user_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM admin.admin_users 
        WHERE admin_users.user_id = user_id 
        AND is_active = true
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Function to view all applications (admin only)
    CREATE OR REPLACE FUNCTION admin.applications_view()
    RETURNS SETOF application_data AS $$
    BEGIN
      IF NOT admin.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
      END IF;
      
      RETURN QUERY SELECT * FROM application_data;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Function to update application status (admin only)
    CREATE OR REPLACE FUNCTION admin.update_application_status(
      application_id INTEGER,
      new_status TEXT
    )
    RETURNS BOOLEAN AS $$
    BEGIN
      -- Check if the user is an admin
      IF NOT admin.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
      END IF;
      
      -- Update the application status
      UPDATE matches
      SET status = new_status
      WHERE id = application_id;
      
      RETURN FOUND;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Function to apply on behalf of a user (admin only)
    CREATE OR REPLACE FUNCTION admin.apply_on_behalf(
      p_profile_id UUID,
      p_job_id UUID,
      p_cover_letter TEXT DEFAULT NULL
    )
    RETURNS JSONB AS $$
    DECLARE
      v_application_id INTEGER;
      v_application_email TEXT;
      v_result JSONB;
    BEGIN
      -- Check if the user is an admin
      IF NOT admin.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
      END IF;
      
      -- Check if application already exists
      IF EXISTS (SELECT 1 FROM matches WHERE profile_id = p_profile_id AND job_id = p_job_id) THEN
        RAISE EXCEPTION 'Application already exists for this user and job';
      END IF;
      
      -- Generate a unique application email
      v_application_email = 'app-' || 
                           LOWER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8)) || 
                           '@applications.jobbify.com';
      
      -- Insert into application_emails
      INSERT INTO application_emails (profile_id, job_id, email)
      VALUES (p_profile_id, p_job_id, v_application_email);
      
      -- Create the match/application
      INSERT INTO matches (profile_id, job_id, status, cover_letter, application_email)
      VALUES (p_profile_id, p_job_id, 'applied', p_cover_letter, v_application_email)
      RETURNING id INTO v_application_id;
      
      -- Prepare the result
      SELECT jsonb_build_object(
        'id', v_application_id,
        'profile_id', p_profile_id,
        'job_id', p_job_id,
        'status', 'applied',
        'application_email', v_application_email
      ) INTO v_result;
      
      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
END $$;

-- Create table to store application-specific emails
CREATE TABLE IF NOT EXISTS application_emails (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(profile_id, job_id)
);

-- Add indexes for quick lookups
CREATE INDEX IF NOT EXISTS application_emails_profile_id_idx ON application_emails(profile_id);
CREATE INDEX IF NOT EXISTS application_emails_job_id_idx ON application_emails(job_id);
CREATE INDEX IF NOT EXISTS application_emails_email_idx ON application_emails(email);

-- Add cover_letter field to matches table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'cover_letter'
  ) THEN
    ALTER TABLE matches ADD COLUMN cover_letter TEXT;
  END IF;
END $$;

-- Add email field to matches table to store the generated email used for the application
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'application_email'
  ) THEN
    ALTER TABLE matches ADD COLUMN application_email VARCHAR(255);
  END IF;
END $$;

-- Add metadata field for additional application data if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE matches ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create function to update modified time
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger for application_emails table
DROP TRIGGER IF EXISTS update_application_emails_modtime ON application_emails;
CREATE TRIGGER update_application_emails_modtime
BEFORE UPDATE ON application_emails
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Update the matches trigger if needed
DROP TRIGGER IF EXISTS update_matches_modtime ON matches;
CREATE TRIGGER update_matches_modtime
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Create or update RLS policies for application_emails
ALTER TABLE application_emails ENABLE ROW LEVEL SECURITY;

-- Users can view their own application emails
CREATE POLICY "Users can view own application emails"
  ON application_emails FOR SELECT 
  USING (auth.uid() = profile_id);

-- Users can insert their own application emails
CREATE POLICY "Users can insert own application emails"
  ON application_emails FOR INSERT 
  WITH CHECK (auth.uid() = profile_id);

-- Users can update their own application emails
CREATE POLICY "Users can update own application emails"
  ON application_emails FOR UPDATE 
  USING (auth.uid() = profile_id);

-- Create view to make it easier to query application data
CREATE OR REPLACE VIEW application_data AS
SELECT 
  m.id,
  m.profile_id,
  m.job_id,
  m.status,
  m.created_at,
  m.updated_at,
  m.cover_letter,
  m.application_email,
  m.metadata,
  p.name as applicant_name,
  p.email as applicant_email,
  j.title as job_title,
  j.company as job_company,
  j.location as job_location,
  j.url as job_url,
  j.description as job_description,
  ae.email as generated_email
FROM matches m
LEFT JOIN profiles p ON m.profile_id = p.id
LEFT JOIN jobs j ON m.job_id = j.id
LEFT JOIN application_emails ae ON m.profile_id = ae.profile_id AND m.job_id = ae.job_id;

-- Grant access to the view
GRANT SELECT ON application_data TO authenticated;
GRANT SELECT ON application_data TO anon;
