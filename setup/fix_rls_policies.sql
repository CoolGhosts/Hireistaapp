-- Fix Row-Level Security (RLS) policies for data isolation
-- Run this in Supabase SQL Editor

-- First, let's check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('matches', 'swipes', 'bookmarks', 'profiles', 'job_seeker_profiles');

-- Drop existing problematic policies for matches table
DROP POLICY IF EXISTS "Users can only see their own matches" ON matches;
DROP POLICY IF EXISTS "Users can only insert their own matches" ON matches;
DROP POLICY IF EXISTS "Users can only update their own matches" ON matches;
DROP POLICY IF EXISTS "Users can only delete their own matches" ON matches;

-- Create comprehensive RLS policies for matches table
CREATE POLICY "Enable read access for users on their own matches" ON matches
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Enable insert access for users on their own matches" ON matches
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Enable update access for users on their own matches" ON matches
    FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Enable delete access for users on their own matches" ON matches
    FOR DELETE USING (auth.uid() = profile_id);

-- Fix swipes table policies
DROP POLICY IF EXISTS "Users can only see their own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can only insert their own swipes" ON swipes;

CREATE POLICY "Enable read access for users on their own swipes" ON swipes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for users on their own swipes" ON swipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix bookmarks table policies
DROP POLICY IF EXISTS "Users can only see their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can only insert their own bookmarks" ON bookmarks;

CREATE POLICY "Enable read access for users on their own bookmarks" ON bookmarks
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Enable insert access for users on their own bookmarks" ON bookmarks
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Ensure profiles table has proper policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Enable read access for users on their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable insert access for users on their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update access for users on their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Fix job_seeker_profiles table policies
DROP POLICY IF EXISTS "Users can view their own job seeker profile" ON job_seeker_profiles;
DROP POLICY IF EXISTS "Users can insert their own job seeker profile" ON job_seeker_profiles;
DROP POLICY IF EXISTS "Users can update their own job seeker profile" ON job_seeker_profiles;

CREATE POLICY "Enable read access for users on their own job seeker profile" ON job_seeker_profiles
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Enable insert access for users on their own job seeker profile" ON job_seeker_profiles
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Enable update access for users on their own job seeker profile" ON job_seeker_profiles
    FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- Ensure RLS is enabled on all tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_seeker_profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to jobs table (since jobs are public)
DROP POLICY IF EXISTS "Enable read access for all users" ON jobs;
CREATE POLICY "Enable read access for all users" ON jobs FOR SELECT USING (true);

-- Verify the policies are working
SELECT 'RLS Policies Updated Successfully' as status;

-- Test query to verify current user context
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    'RLS policies should now work with this user context' as note;
