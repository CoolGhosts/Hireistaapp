# Setting Up Signup for Jobbify

This guide helps you set up and troubleshoot the signup feature for the Jobbify application.

## Issue Overview

The signup feature needs to properly create and store user data in Supabase. When a user signs up:

1. The user is created in Supabase Auth
2. A profile record is created in the `profiles` table
3. A profile record is created in the `job_seeker_profiles` or `service_provider_profiles` table based on user type
4. An email verification link is sent to the user

## Setup Steps

### 1. Configure Supabase Database

The most common issue is missing tables or columns in the database. To fix this:

1. Go to the Supabase dashboard
2. Open the SQL Editor
3. Copy and paste the contents of the `docs/supabase-create-functions.sql` file
4. Run the SQL script to create all necessary tables, functions, and triggers

This script will:
- Create the `profiles`, `job_seeker_profiles`, and `service_provider_profiles` tables
- Add missing columns if the tables already exist
- Create PostgreSQL functions for database diagnostics and fixes
- Set up Row Level Security (RLS) policies
- Create a trigger to automatically create profiles when users sign up

### 2. Test the Setup

After running the SQL script:

1. Launch the Jobbify app
2. Navigate to `/debug-db` in the app to open the Database Debug screen
3. Click "Refresh Database Status" to verify the tables exist with the correct columns
4. If issues persist, click "Fix Database Tables (Execute SQL)"

### 3. Configure Email Verification

For email verification to work correctly:

1. In the Supabase dashboard, go to Authentication → Settings
2. Ensure "Enable Email Confirmations" is turned ON
3. Go to Authentication → Email Templates to customize the confirmation email
4. Update the Site URL in Authentication → URL Configuration to your app's URL

### 4. Testing Signup

To test the complete signup flow:

1. Sign up with a new email address
2. You should be redirected to the signup success page
3. Check your email for the verification link
4. Click the verification link to complete registration
5. You should be redirected back to the app and logged in

## Troubleshooting

### "Could not find the 'email' column of 'profiles'" Error

This error occurs when the `profiles` table exists but is missing the `email` column. To fix:

1. Use the Database Debug screen in the app and click "Fix Database Tables"
2. Or run the SQL script from `docs/supabase-create-functions.sql`

### Email Verification Not Working

If users aren't receiving verification emails:

1. Check spam/junk folders
2. Verify your Supabase email settings
3. Make sure the `emailRedirectTo` URL in signup.tsx is correct
4. Test with a real email address (not a temporary one)

### Database Connection Issues

If you have persistent database connection problems:

1. Verify your Supabase URL and API key in `lib/supabase.ts`
2. Check that you have the appropriate RLS policies as defined in the SQL script
3. Verify network connectivity to the Supabase service

## Automatic Profile Creation

For optimal user experience, we've added a database trigger that automatically creates profile records when a user signs up. This helps prevent the common error where users exist in auth but not in the profiles table.

## Further Help

If you continue to experience issues:

1. Check the app console logs for detailed error messages
2. Review the Supabase database logs in the Dashboard
3. Ensure all app dependencies are properly installed 