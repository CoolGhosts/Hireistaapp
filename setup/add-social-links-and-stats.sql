-- Migration for adding social links and application stats to profiles

-- Add social links to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Create a view to get application stats for job seekers
CREATE OR REPLACE VIEW job_seeker_application_stats AS
SELECT 
  p.id as profile_id,
  COUNT(m.id) FILTER (WHERE m.status = 'pending') as pending_applications,
  COUNT(m.id) FILTER (WHERE m.status = 'accepted') as interviews,
  COUNT(m.id) FILTER (WHERE m.status = 'offered') as offers
FROM profiles p
LEFT JOIN matches m ON p.id = m.profile_id
WHERE p.user_type = 'job_seeker'
GROUP BY p.id;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on the new view
ALTER VIEW job_seeker_application_stats OWNER TO authenticated;
GRANT SELECT ON job_seeker_application_stats TO authenticated;
