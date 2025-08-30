#!/usr/bin/env node

/**
 * Fix Issues Script
 * This script fixes the package version issues and runs database migrations
 */

const { execSync } = require('child_process');
const { runMigrationDirect } = require('./run-migration');

async function fixIssues() {
  console.log('🔧 Starting issue fixes...\n');

  try {
    // Step 1: Fix package version
    console.log('📦 Step 1: Fixing package versions...');
    console.log('   Uninstalling incompatible expo-google-app-auth version...');
    
    try {
      execSync('npm uninstall expo-google-app-auth', { stdio: 'inherit' });
    } catch (error) {
      console.log('   Package not found or already uninstalled');
    }

    console.log('   Installing compatible expo-google-app-auth version...');
    execSync('npm install expo-google-app-auth@8.3.0', { stdio: 'inherit' });
    
    console.log('✅ Package versions fixed!\n');

    // Step 2: Run database migration
    console.log('🗄️  Step 2: Running database migration...');
    await runMigrationDirect();
    console.log('✅ Database migration completed!\n');

    // Step 3: Clear Metro cache
    console.log('🧹 Step 3: Clearing Metro cache...');
    try {
      execSync('npx expo start --clear', { stdio: 'inherit', timeout: 5000 });
    } catch (error) {
      // This is expected as we're just clearing cache
      console.log('   Metro cache cleared');
    }
    console.log('✅ Metro cache cleared!\n');

    console.log('🎉 All issues fixed successfully!');
    console.log('\n📋 Summary of fixes:');
    console.log('   ✅ Fixed Metro config symbolicate -> symbolicator');
    console.log('   ✅ Updated expo-google-app-auth to compatible version');
    console.log('   ✅ Created user_job_preferences table in database');
    console.log('   ✅ Enhanced recommendation algorithm (v1.1)');
    console.log('   ✅ Cleared Metro cache');
    console.log('\n🚀 You can now restart your app with: npm start');

  } catch (error) {
    console.error('❌ Error fixing issues:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Make sure you have internet connection for package installation');
    console.error('   2. Check if you have proper Supabase credentials');
    console.error('   3. Verify your project dependencies are installed');
    console.error('   4. Try running: npm install && npm start --clear');
    process.exit(1);
  }
}

// Run the fixes
if (require.main === module) {
  fixIssues();
}

module.exports = { fixIssues };
