-- Complete Backend Migration to Supabase
-- This script adds all missing tables and functions for a complete Supabase backend

-- Create swipes table for job swiping functionality
CREATE TABLE IF NOT EXISTS swipes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('left', 'right')),
  job_title TEXT,
  job_company TEXT,
  job_location TEXT,
  job_salary_min INTEGER,
  job_salary_max INTEGER,
  job_type TEXT,
  job_remote BOOLEAN,
  job_tags TEXT[],
  match_score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Create resumes table for resume storage and management
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  extracted_text TEXT,
  analysis_result JSONB,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table for job filtering and recommendations
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  job_types TEXT[],
  employment_types TEXT[],
  remote_preference TEXT CHECK (remote_preference IN ('remote_only', 'hybrid', 'onsite', 'any')),
  salary_min INTEGER,
  salary_max INTEGER,
  preferred_locations TEXT[],
  skills TEXT[],
  experience_level TEXT,
  company_size_preference TEXT[],
  industry_preferences TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_cache table for caching external job API results
CREATE TABLE IF NOT EXISTS job_cache (
  id SERIAL PRIMARY KEY,
  external_job_id TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL, -- 'remoteok', 'ashby', 'rapidapi', etc.
  job_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_job_interactions table for tracking user behavior
CREATE TABLE IF NOT EXISTS user_job_interactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id INTEGER,
  external_job_id TEXT,
  interaction_type TEXT CHECK (interaction_type IN ('view', 'like', 'dislike', 'apply', 'save', 'share')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookmarks table for saved jobs
CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id INTEGER,
  external_job_id TEXT,
  job_data JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_id, external_job_id)
);

-- Create cover_letters table for AI-generated cover letters
CREATE TABLE IF NOT EXISTS cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id INTEGER,
  external_job_id TEXT,
  content TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'final', 'sent')) DEFAULT 'draft',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create application_tracking table for tracking job applications
CREATE TABLE IF NOT EXISTS application_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_id INTEGER,
  external_job_id TEXT,
  application_url TEXT,
  status TEXT CHECK (status IN ('pending', 'submitted', 'interviewing', 'rejected', 'accepted', 'withdrawn')) DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_resumes_modtime ON resumes;
CREATE TRIGGER update_resumes_modtime
BEFORE UPDATE ON resumes
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_user_preferences_modtime ON user_preferences;
CREATE TRIGGER update_user_preferences_modtime
BEFORE UPDATE ON user_preferences
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_cover_letters_modtime ON cover_letters;
CREATE TRIGGER update_cover_letters_modtime
BEFORE UPDATE ON cover_letters
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable RLS for new tables
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_job_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for swipes
DROP POLICY IF EXISTS "Users can view own swipes" ON swipes;
CREATE POLICY "Users can view own swipes"
  ON swipes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own swipes" ON swipes;
CREATE POLICY "Users can insert own swipes"
  ON swipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for resumes
DROP POLICY IF EXISTS "Users can view own resumes" ON resumes;
CREATE POLICY "Users can view own resumes"
  ON resumes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own resumes" ON resumes;
CREATE POLICY "Users can insert own resumes"
  ON resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own resumes" ON resumes;
CREATE POLICY "Users can update own resumes"
  ON resumes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resumes" ON resumes;
CREATE POLICY "Users can delete own resumes"
  ON resumes FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for user_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policies for bookmarks
DROP POLICY IF EXISTS "Users can view own bookmarks" ON bookmarks;
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bookmarks" ON bookmarks;
CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON bookmarks;
CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for cover_letters
DROP POLICY IF EXISTS "Users can view own cover letters" ON cover_letters;
CREATE POLICY "Users can view own cover letters"
  ON cover_letters FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cover letters" ON cover_letters;
CREATE POLICY "Users can insert own cover letters"
  ON cover_letters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cover letters" ON cover_letters;
CREATE POLICY "Users can update own cover letters"
  ON cover_letters FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policies for application_tracking
DROP POLICY IF EXISTS "Users can view own applications" ON application_tracking;
CREATE POLICY "Users can view own applications"
  ON application_tracking FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own applications" ON application_tracking;
CREATE POLICY "Users can insert own applications"
  ON application_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own applications" ON application_tracking;
CREATE POLICY "Users can update own applications"
  ON application_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policies for user_job_interactions
DROP POLICY IF EXISTS "Users can view own interactions" ON user_job_interactions;
CREATE POLICY "Users can view own interactions"
  ON user_job_interactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own interactions" ON user_job_interactions;
CREATE POLICY "Users can insert own interactions"
  ON user_job_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Job cache is public read for all authenticated users
DROP POLICY IF EXISTS "Authenticated users can read job cache" ON job_cache;
CREATE POLICY "Authenticated users can read job cache"
  ON job_cache FOR SELECT
  TO authenticated
  USING (true);

-- Create function to clean up expired job cache
CREATE OR REPLACE FUNCTION clean_expired_job_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM job_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user job recommendations
CREATE OR REPLACE FUNCTION get_user_job_recommendations(user_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  job_id INTEGER,
  external_job_id TEXT,
  job_data JSONB,
  match_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jc.id as job_id,
    jc.external_job_id,
    jc.job_data,
    CASE
      WHEN up.user_id IS NOT NULL THEN 85.0::DECIMAL -- Higher score if user has preferences
      ELSE 50.0::DECIMAL -- Default score
    END as match_score
  FROM job_cache jc
  LEFT JOIN user_preferences up ON up.user_id = user_uuid
  LEFT JOIN swipes s ON s.user_id = user_uuid AND s.job_id = jc.id
  WHERE s.id IS NULL -- Exclude already swiped jobs
    AND jc.expires_at > NOW()
  ORDER BY match_score DESC, jc.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
