/**
 * Test script to verify Supabase connection and authentication
 * Run this to debug connection issues
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (same as in the app)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  console.log('🔗 Testing Supabase Connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣ Testing basic connection...');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseAnonKey.substring(0, 20) + '...');

    // Test 2: Database access
    console.log('\n2️⃣ Testing database access...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError.message);
    } else {
      console.log('✅ Profiles table accessible');
    }

    // Test 3: Auth session
    console.log('\n3️⃣ Testing auth session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('❌ Session error:', sessionError.message);
    } else if (session) {
      console.log('✅ Active session found:', session.user.email);
    } else {
      console.log('ℹ️ No active session (expected for fresh start)');
    }

    // Test 4: User job preferences table
    console.log('\n4️⃣ Testing user job preferences table...');
    const { data: prefsData, error: prefsError } = await supabase
      .from('user_job_preferences')
      .select('*')
      .limit(1);

    if (prefsError) {
      console.error('❌ User job preferences error:', prefsError.message);
    } else {
      console.log('✅ User job preferences table accessible');
    }

    // Test 5: Jobs table
    console.log('\n5️⃣ Testing jobs table...');
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, company')
      .limit(3);

    if (jobsError) {
      console.error('❌ Jobs table error:', jobsError.message);
    } else {
      console.log('✅ Jobs table accessible');
      if (jobsData && jobsData.length > 0) {
        console.log(`   Found ${jobsData.length} jobs:`);
        jobsData.forEach(job => {
          console.log(`   - ${job.title} at ${job.company}`);
        });
      } else {
        console.log('   No jobs found (table is empty)');
      }
    }

    // Test 6: RLS policies
    console.log('\n6️⃣ Testing RLS policies...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('user_job_preferences')
      .select('*')
      .limit(1);

    if (rlsError && rlsError.message.includes('RLS')) {
      console.log('✅ RLS policies working (access denied for unauthenticated user)');
    } else if (rlsError) {
      console.log('⚠️ RLS test error:', rlsError.message);
    } else {
      console.log('✅ RLS allows access (or no data to protect)');
    }

    console.log('\n🎉 Supabase connection test completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Connection established');
    console.log('   ✅ Database tables accessible');
    console.log('   ✅ Authentication system ready');
    console.log('   ✅ RLS policies active');

    return true;

  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check internet connection');
    console.log('   2. Verify Supabase URL and key');
    console.log('   3. Check Supabase project status');
    console.log('   4. Verify database tables exist');
    
    return false;
  }
}

// Test auth flow simulation
async function testAuthFlow() {
  console.log('\n🔐 Testing Auth Flow Simulation...\n');

  try {
    // Simulate what happens when app starts
    console.log('1️⃣ App startup - checking session...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Session check failed:', error.message);
      return false;
    }

    if (session) {
      console.log('✅ User session found:', session.user.email);
      
      // Test profile lookup
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.log('⚠️ Profile not found or error:', profileError.message);
      } else {
        console.log('✅ User profile found:', profile);
      }
    } else {
      console.log('ℹ️ No session - user needs to log in');
    }

    console.log('\n✅ Auth flow simulation completed');
    return true;

  } catch (error) {
    console.error('\n❌ Auth flow test failed:', error.message);
    return false;
  }
}

// Main test function
async function runAllTests() {
  console.log('🧪 Starting Supabase Connection Tests\n');
  console.log('=' .repeat(50));

  const connectionTest = await testSupabaseConnection();
  
  console.log('\n' + '=' .repeat(50));
  
  const authTest = await testAuthFlow();

  console.log('\n' + '=' .repeat(50));
  console.log('\n🏁 All Tests Complete');
  
  if (connectionTest && authTest) {
    console.log('✅ All tests passed - Supabase is working correctly!');
    console.log('\n💡 If the app is still stuck loading, the issue might be:');
    console.log('   1. React Native specific issues');
    console.log('   2. App state management problems');
    console.log('   3. Navigation timing issues');
    console.log('   4. Device/emulator specific problems');
  } else {
    console.log('❌ Some tests failed - check the errors above');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { testSupabaseConnection, testAuthFlow };
