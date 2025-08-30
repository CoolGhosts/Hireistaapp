/**
 * Script to clear all user data from Supabase and local storage
 * Run this script when you need to completely reset the application
 * 
 * Usage: node scripts/clearAllData.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service key needed for admin operations

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  console.log('Set it with: export SUPABASE_SERVICE_KEY=your_service_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllData() {
  console.log('🚀 Starting complete data clear...');
  
  try {
    // 1. Delete all users from auth.users (this should cascade to related tables)
    console.log('👥 Deleting all users from auth.users...');
    const { data: users, error: getUsersError } = await supabase.auth.admin.listUsers();
    
    if (getUsersError) {
      console.error('❌ Error fetching users:', getUsersError);
      throw getUsersError;
    }
    
    if (users && users.users.length > 0) {
      for (const user of users.users) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`❌ Error deleting user ${user.id}:`, deleteError);
        } else {
          console.log(`✅ Deleted user: ${user.email || user.id}`);
        }
      }
    } else {
      console.log('ℹ️ No users found in auth.users');
    }

    // 2. Clear all user-related tables manually (in case cascade didn't work)
    const tablesToClear = [
      'job_seeker_profiles',
      'service_provider_profiles', 
      'profiles',
      'resumes',
      'user_preferences',
      'bookmarks',
      'swipes',
      'user_job_interactions',
      'application_tracking',
      'cover_letters',
      'job_cache'
    ];

    for (const table of tablesToClear) {
      try {
        console.log(`🧹 Clearing table: ${table}`);
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
          console.warn(`⚠️ Error clearing ${table}:`, error.message);
        } else {
          console.log(`✅ Cleared table: ${table}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error clearing ${table}:`, error.message);
      }
    }

    // 3. Verify all tables are empty
    console.log('🔍 Verifying all tables are empty...');
    for (const table of tablesToClear) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.warn(`⚠️ Error checking ${table}:`, error.message);
        } else {
          console.log(`📊 ${table}: ${count} rows`);
        }
      } catch (error) {
        console.warn(`⚠️ Error checking ${table}:`, error.message);
      }
    }

    console.log('✅ Data clearing completed successfully!');
    console.log('📱 Database is now in a completely clean state');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('1. Clear local storage in the mobile app');
    console.log('2. Restart the app to ensure clean state');
    console.log('3. Test user registration and login flows');

  } catch (error) {
    console.error('❌ Error during data clear:', error);
    process.exit(1);
  }
}

// Run the script
clearAllData();
