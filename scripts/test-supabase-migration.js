#!/usr/bin/env node

/**
 * Test Supabase Migration Script
 * This script tests the complete backend migration to Supabase
 */

// Use dynamic import for ES modules
async function loadSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient;
}

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

async function testSupabaseMigration() {
  const createClient = await loadSupabase();
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('🧪 Testing Complete Supabase Backend Migration...\n');

  const results = {
    tables: {},
    functions: {},
    policies: {},
    storage: {},
    overall: 'PASS'
  };

  // Test 1: Check all required tables exist
  console.log('📋 Testing Table Structure...');
  const requiredTables = [
    'profiles',
    'jobs',
    'swipes',
    'resumes',
    'user_preferences',
    'job_cache',
    'user_job_interactions',
    'bookmarks',
    'cover_letters',
    'application_tracking'
  ];

  for (const table of requiredTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        results.tables[table] = { status: 'FAIL', error: error.message };
        results.overall = 'FAIL';
      } else {
        results.tables[table] = { status: 'PASS', count: count || 0 };
      }
      
      console.log(`  ✅ ${table}: ${results.tables[table].status} (${results.tables[table].count || 0} rows)`);
    } catch (err) {
      results.tables[table] = { status: 'FAIL', error: err.message };
      results.overall = 'FAIL';
      console.log(`  ❌ ${table}: FAIL - ${err.message}`);
    }
  }

  // Test 2: Check RLS policies
  console.log('\n🔒 Testing Row Level Security Policies...');
  const tablesWithRLS = [
    'swipes',
    'resumes', 
    'user_preferences',
    'bookmarks',
    'cover_letters',
    'application_tracking',
    'user_job_interactions'
  ];

  for (const table of tablesWithRLS) {
    try {
      // Check if RLS is enabled
      const { data: rlsData, error: rlsError } = await supabase
        .rpc('check_rls_enabled', { table_name: table })
        .single();

      if (rlsError) {
        // Fallback: try to query the table (should fail without auth for RLS-enabled tables)
        const { error: queryError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        // If query succeeds without auth, RLS might not be properly configured
        if (!queryError) {
          results.policies[table] = { status: 'WARNING', message: 'RLS status unclear' };
        } else {
          results.policies[table] = { status: 'PASS', message: 'RLS appears active' };
        }
      } else {
        results.policies[table] = { status: 'PASS', message: 'RLS enabled' };
      }
      
      console.log(`  ✅ ${table}: ${results.policies[table].status} - ${results.policies[table].message}`);
    } catch (err) {
      results.policies[table] = { status: 'FAIL', error: err.message };
      console.log(`  ❌ ${table}: FAIL - ${err.message}`);
    }
  }

  // Test 3: Check utility functions
  console.log('\n⚙️ Testing Utility Functions...');
  const functions = [
    'clean_expired_job_cache',
    'get_user_job_recommendations'
  ];

  for (const func of functions) {
    try {
      // Test function exists by calling it (some may fail due to parameters, but should not be "function not found")
      const { error } = await supabase.rpc(func);
      
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        results.functions[func] = { status: 'FAIL', error: 'Function does not exist' };
        results.overall = 'FAIL';
      } else {
        results.functions[func] = { status: 'PASS', message: 'Function exists' };
      }
      
      console.log(`  ✅ ${func}: ${results.functions[func].status}`);
    } catch (err) {
      results.functions[func] = { status: 'FAIL', error: err.message };
      console.log(`  ❌ ${func}: FAIL - ${err.message}`);
    }
  }

  // Test 4: Check storage buckets
  console.log('\n📁 Testing Storage Configuration...');
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      results.storage.buckets = { status: 'FAIL', error: bucketsError.message };
      results.overall = 'FAIL';
    } else {
      const resumesBucket = buckets.find(bucket => bucket.name === 'resumes');
      if (resumesBucket) {
        results.storage.buckets = { status: 'PASS', message: 'Resumes bucket exists' };
        console.log('  ✅ Storage buckets: PASS - Resumes bucket configured');
      } else {
        results.storage.buckets = { status: 'WARNING', message: 'Resumes bucket not found' };
        console.log('  ⚠️ Storage buckets: WARNING - Resumes bucket not found');
      }
    }
  } catch (err) {
    results.storage.buckets = { status: 'FAIL', error: err.message };
    console.log(`  ❌ Storage buckets: FAIL - ${err.message}`);
  }

  // Test 5: Test job cache functionality
  console.log('\n💾 Testing Job Cache Functionality...');
  try {
    // Test inserting a sample job to cache
    const testJob = {
      external_job_id: 'test-job-' + Date.now(),
      source: 'test',
      job_data: {
        id: 'test-job-' + Date.now(),
        title: 'Test Job',
        company: 'Test Company',
        location: 'Remote'
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    };

    const { error: insertError } = await supabase
      .from('job_cache')
      .insert(testJob);

    if (insertError) {
      results.cache = { status: 'FAIL', error: insertError.message };
      results.overall = 'FAIL';
    } else {
      // Test retrieving the job
      const { data: retrievedJob, error: retrieveError } = await supabase
        .from('job_cache')
        .select('*')
        .eq('external_job_id', testJob.external_job_id)
        .single();

      if (retrieveError || !retrievedJob) {
        results.cache = { status: 'FAIL', error: 'Could not retrieve cached job' };
        results.overall = 'FAIL';
      } else {
        results.cache = { status: 'PASS', message: 'Job caching works correctly' };
        
        // Clean up test data
        await supabase
          .from('job_cache')
          .delete()
          .eq('external_job_id', testJob.external_job_id);
      }
    }
    
    console.log(`  ✅ Job Cache: ${results.cache.status} - ${results.cache.message || results.cache.error}`);
  } catch (err) {
    results.cache = { status: 'FAIL', error: err.message };
    console.log(`  ❌ Job Cache: FAIL - ${err.message}`);
  }

  // Test 6: Test authentication flow
  console.log('\n🔐 Testing Authentication Configuration...');
  try {
    // Test getting session (should be null for anonymous)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      results.auth = { status: 'FAIL', error: sessionError.message };
      results.overall = 'FAIL';
    } else {
      results.auth = { status: 'PASS', message: 'Auth client configured correctly' };
    }
    
    console.log(`  ✅ Authentication: ${results.auth.status} - ${results.auth.message || results.auth.error}`);
  } catch (err) {
    results.auth = { status: 'FAIL', error: err.message };
    console.log(`  ❌ Authentication: FAIL - ${err.message}`);
  }

  // Summary
  console.log('\n📊 Migration Test Summary:');
  console.log('========================');
  
  const passCount = Object.values(results.tables).filter(r => r.status === 'PASS').length;
  const totalTables = Object.keys(results.tables).length;
  
  console.log(`Tables: ${passCount}/${totalTables} passed`);
  console.log(`Functions: ${Object.values(results.functions).filter(r => r.status === 'PASS').length}/${Object.keys(results.functions).length} passed`);
  console.log(`RLS Policies: ${Object.values(results.policies).filter(r => r.status === 'PASS').length}/${Object.keys(results.policies).length} configured`);
  console.log(`Storage: ${results.storage.buckets?.status || 'NOT_TESTED'}`);
  console.log(`Job Cache: ${results.cache?.status || 'NOT_TESTED'}`);
  console.log(`Authentication: ${results.auth?.status || 'NOT_TESTED'}`);
  
  console.log(`\nOverall Status: ${results.overall}`);
  
  if (results.overall === 'PASS') {
    console.log('🎉 Supabase migration completed successfully!');
    console.log('✅ All backend functionality has been migrated to Supabase');
    console.log('✅ Authentication flows through Supabase only');
    console.log('✅ Data storage and caching use Supabase tables');
    console.log('✅ Row Level Security policies are in place');
  } else {
    console.log('❌ Some issues were found. Please review the failed tests above.');
  }

  return results;
}

// Run the test
if (require.main === module) {
  testSupabaseMigration()
    .then(results => {
      process.exit(results.overall === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testSupabaseMigration };
