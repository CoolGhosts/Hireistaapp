-- Test RLS policies to ensure they're working correctly
-- Run this in Supabase SQL Editor after fixing the policies

-- Check current authentication context
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    auth.role() as current_role;

-- Test 1: Check if we can read from matches table
SELECT 
    'Test 1: Reading matches' as test,
    COUNT(*) as count,
    'Should only show current user matches' as expected
FROM matches 
WHERE profile_id = auth.uid();

-- Test 2: Try to insert a test match (this should work)
-- Note: Replace 'test-job-id' with an actual job ID from your jobs table
INSERT INTO matches (profile_id, job_id, status, created_at)
VALUES (
    auth.uid(), 
    (SELECT id FROM jobs LIMIT 1), -- Use first available job
    'applying', 
    NOW()
) 
ON CONFLICT (profile_id, job_id) DO NOTHING;

-- Test 3: Verify the insert worked
SELECT 
    'Test 3: Verify insert' as test,
    COUNT(*) as count,
    'Should be at least 1' as expected
FROM matches 
WHERE profile_id = auth.uid();

-- Test 4: Check swipes table access
SELECT 
    'Test 4: Reading swipes' as test,
    COUNT(*) as count,
    'Should only show current user swipes' as expected
FROM swipes 
WHERE user_id = auth.uid();

-- Test 5: Check bookmarks table access
SELECT 
    'Test 5: Reading bookmarks' as test,
    COUNT(*) as count,
    'Should only show current user bookmarks' as expected
FROM bookmarks 
WHERE profile_id = auth.uid();

-- Test 6: Check profile access
SELECT 
    'Test 6: Reading profile' as test,
    COUNT(*) as count,
    'Should be 1 if profile exists' as expected
FROM profiles 
WHERE id = auth.uid();

-- Test 7: Check job_seeker_profiles access
SELECT 
    'Test 7: Reading job seeker profile' as test,
    COUNT(*) as count,
    'Should be 1 if job seeker profile exists' as expected
FROM job_seeker_profiles 
WHERE profile_id = auth.uid();

-- Test 8: Verify we can read jobs (should be public)
SELECT 
    'Test 8: Reading jobs' as test,
    COUNT(*) as count,
    'Should show all jobs (public access)' as expected
FROM jobs;

-- Show all current policies for verification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('matches', 'swipes', 'bookmarks', 'profiles', 'job_seeker_profiles', 'jobs')
ORDER BY tablename, cmd;
