import { supabase } from '../lib/supabase';

/**
 * Debug utility to test authentication and profile creation
 */
export const authDebug = {
  /**
   * Test if we can create a user and profile (using the new trigger-based approach)
   */
  async testSignup(email: string, password: string, name: string) {
    console.log('🧪 Testing signup process with database triggers...');

    try {
      // Step 1: Create auth user (this should trigger profile creation automatically)
      console.log('📝 Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            user_type: 'job_seeker'
          }
        }
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        return { success: false, error: authError.message };
      }

      if (!authData?.user) {
        console.error('❌ No user returned');
        return { success: false, error: 'No user returned from signup' };
      }

      console.log('✅ Auth user created:', authData.user.id);

      // Step 2: Wait for trigger to complete
      console.log('⏳ Waiting for database triggers to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Verify profile was created by trigger
      console.log('🔍 Checking if profile was created by trigger...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile not found:', profileError);
        return { success: false, error: 'Profile was not created by trigger' };
      }

      console.log('✅ Profile created by trigger:', profile);

      // Step 4: Check if job_seeker_profile was created by trigger
      console.log('🔍 Checking job_seeker_profile...');
      const { data: jobSeekerProfile, error: jobSeekerError } = await supabase
        .from('job_seeker_profiles')
        .select('*')
        .eq('profile_id', authData.user.id)
        .single();

      if (jobSeekerError) {
        console.error('❌ Job seeker profile error:', jobSeekerError);
        // This might be expected if the trigger chain doesn't include job_seeker_profiles
        console.log('ℹ️ Job seeker profile not created automatically, this may be normal');
      } else {
        console.log('✅ Job seeker profile found:', jobSeekerProfile);
      }

      return {
        success: true,
        data: {
          user: authData.user,
          profile: profile,
          jobSeekerProfile: jobSeekerProfile || null
        }
      };

    } catch (error) {
      console.error('❌ Test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Test database connectivity and permissions
   */
  async testDatabaseAccess() {
    console.log('🧪 Testing database access...');
    
    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Database access error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Database access successful');

      // Test auth context
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id || 'None');

      return { success: true };

    } catch (error) {
      console.error('❌ Database test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Verify profile exists (bypasses RLS timing issues)
   */
  async verifyProfileExists(userId: string) {
    console.log('🔍 Verifying profile exists for user:', userId);

    try {
      // Use a simple count query which is less affected by RLS timing
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId);

      if (error) {
        console.error('❌ Profile verification error:', error);
        return { success: false, error: error.message };
      }

      const exists = count && count > 0;
      console.log(exists ? '✅ Profile exists' : '❌ Profile not found');

      return { success: true, exists };

    } catch (error) {
      console.error('❌ Profile verification failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Clean up test data
   */
  async cleanupTestUser(userId: string) {
    console.log('🧹 Cleaning up test user:', userId);

    try {
      // Delete job_seeker_profile first (due to foreign key)
      await supabase
        .from('job_seeker_profiles')
        .delete()
        .eq('profile_id', userId);

      // Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      // Note: Auth user deletion requires admin privileges
      console.log('✅ Test data cleaned up');
      return { success: true };

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};
