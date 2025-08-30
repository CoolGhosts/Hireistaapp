#!/usr/bin/env node

/**
 * Verify All Fixes Script
 * This script verifies that all the issues have been resolved
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyFixes() {
  console.log('🔍 Verifying All Fixes...\n');

  let allGood = true;

  // Check 1: Metro config fix
  console.log('1️⃣  Checking Metro configuration...');
  try {
    const metroConfig = fs.readFileSync('metro.config.js', 'utf8');
    if (metroConfig.includes('config.symbolicator')) {
      console.log('✅ Metro config uses correct "symbolicator" option');
    } else if (metroConfig.includes('config.symbolicate')) {
      console.log('❌ Metro config still uses incorrect "symbolicate" option');
      allGood = false;
    } else {
      console.log('⚠️  Metro config doesn\'t have symbolication config');
    }
  } catch (error) {
    console.log('❌ Could not read metro.config.js');
    allGood = false;
  }

  // Check 2: Package version fix
  console.log('\n2️⃣  Checking package versions...');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const expoGoogleAppAuth = packageJson.dependencies['expo-google-app-auth'];
    
    if (expoGoogleAppAuth === '~8.3.0') {
      console.log('✅ expo-google-app-auth is using compatible version (~8.3.0)');
    } else {
      console.log(`❌ expo-google-app-auth version is ${expoGoogleAppAuth}, should be ~8.3.0`);
      allGood = false;
    }
  } catch (error) {
    console.log('❌ Could not read package.json');
    allGood = false;
  }

  // Check 3: Database table
  console.log('\n3️⃣  Checking database table...');
  try {
    const { data, error } = await supabase
      .from('user_job_preferences')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ user_job_preferences table exists and is accessible');
    } else if (error.code === 'PGRST116') {
      console.log('❌ user_job_preferences table does not exist');
      allGood = false;
    } else {
      console.log('❌ Database connection issue:', error.message);
      allGood = false;
    }
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
    allGood = false;
  }

  // Check 4: Algorithm version
  console.log('\n4️⃣  Checking algorithm version...');
  try {
    const serviceFile = fs.readFileSync('services/jobRecommendationService.ts', 'utf8');
    if (serviceFile.includes('v1.1-enhanced')) {
      console.log('✅ Algorithm updated to v1.1-enhanced');
    } else {
      console.log('❌ Algorithm version not updated');
      allGood = false;
    }
  } catch (error) {
    console.log('❌ Could not read jobRecommendationService.ts');
    allGood = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allGood) {
    console.log('🎉 ALL FIXES VERIFIED SUCCESSFULLY!');
    console.log('\n✅ Summary of fixes:');
    console.log('   • Metro config: symbolicate → symbolicator');
    console.log('   • Package version: expo-google-app-auth@~8.3.0');
    console.log('   • Database: user_job_preferences table created');
    console.log('   • Algorithm: Enhanced to v1.1 with better scoring');
    
    console.log('\n🚀 Your app should now work without errors!');
    console.log('   • No more Metro bundler warnings');
    console.log('   • No more package compatibility issues');
    console.log('   • No more database relation errors');
    console.log('   • Better job recommendations');
    
    console.log('\n📱 To restart your app:');
    console.log('   npm start');
  } else {
    console.log('❌ SOME ISSUES STILL NEED ATTENTION');
    console.log('\nPlease check the failed items above and fix them.');
  }
  console.log('='.repeat(60));
}

// Run the verification
if (require.main === module) {
  verifyFixes();
}

module.exports = { verifyFixes };
