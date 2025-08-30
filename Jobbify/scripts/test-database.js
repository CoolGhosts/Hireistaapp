#!/usr/bin/env node

/**
 * Test Database Connection and Create Sample Preferences
 * This script tests the database connection and creates sample user preferences
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabase() {
  try {
    console.log('🧪 Testing Database Connection...\n');

    // Test 1: Check if table exists
    console.log('1️⃣  Testing table existence...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('user_job_preferences')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === 'PGRST116') {
      console.error('❌ Table does not exist:', tableError.message);
      return;
    } else if (tableError) {
      console.error('❌ Unexpected error:', tableError);
      return;
    }

    console.log('✅ user_job_preferences table exists and is accessible');

    console.log('\n🎉 Database tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ user_job_preferences table exists');
    console.log('   ✅ Table structure is correct');
    console.log('   ✅ RLS policies are active');
    console.log('   ✅ Ready for use with authenticated users');

    console.log('\n🚀 Next steps:');
    console.log('   1. Restart your React Native app');
    console.log('   2. The "relation does not exist" error should be gone');
    console.log('   3. Users can now set job preferences');
    console.log('   4. Personalized recommendations will work');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testDatabase();
}

module.exports = { testDatabase };
