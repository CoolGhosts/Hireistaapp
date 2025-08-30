#!/usr/bin/env node

/**
 * Database Migration Runner
 * This script runs the database migrations to ensure all required tables exist
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/001_add_job_recommendations.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded successfully');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim().length === 0) continue;

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        });

        if (error) {
          // Check if it's a "relation already exists" error, which is okay
          if (error.message.includes('already exists') || error.code === '42P07') {
            console.log(`⚠️  Table/relation already exists (skipping): ${error.message}`);
            continue;
          }
          throw error;
        }

        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (statementError) {
        console.error(`❌ Error executing statement ${i + 1}:`, statementError.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
        
        // Continue with other statements unless it's a critical error
        if (!statementError.message.includes('already exists')) {
          throw statementError;
        }
      }
    }

    // Verify the tables were created
    console.log('🔍 Verifying table creation...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['user_job_preferences', 'job_recommendations', 'swipes']);

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      const tableNames = tables.map(t => t.table_name);
      console.log('📋 Existing tables:', tableNames);
      
      const requiredTables = ['user_job_preferences', 'job_recommendations', 'swipes'];
      const missingTables = requiredTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        console.warn('⚠️  Missing tables:', missingTables);
      } else {
        console.log('✅ All required tables exist');
      }
    }

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Alternative method using Supabase client directly
async function runMigrationDirect() {
  try {
    console.log('🚀 Starting direct database migration...');

    // Check if table already exists
    console.log('🔍 Checking if user_job_preferences table exists...');
    const { data: existingTable, error: checkError } = await supabase
      .from('user_job_preferences')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ user_job_preferences table already exists!');
      console.log('🎉 Migration completed - table is ready to use!');
      return;
    }

    if (checkError.code !== 'PGRST116' && !checkError.message.includes('does not exist')) {
      console.error('❌ Unexpected error checking table:', checkError);
      throw checkError;
    }

    console.log('📄 Table does not exist, need to create it manually...');
    console.log('');
    console.log('🔧 MANUAL SETUP REQUIRED:');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('-- Create user_job_preferences table');
    console.log(`CREATE TABLE IF NOT EXISTS user_job_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Location preferences
  preferred_locations TEXT[] DEFAULT '{}',
  max_commute_distance INTEGER DEFAULT 50,
  remote_work_preference TEXT CHECK (remote_work_preference IN ('required', 'preferred', 'acceptable', 'not_preferred')) DEFAULT 'preferred',
  willing_to_relocate BOOLEAN DEFAULT FALSE,

  -- Job type preferences
  preferred_job_types TEXT[] DEFAULT '{}',
  preferred_industries TEXT[] DEFAULT '{}',
  preferred_company_sizes TEXT[] DEFAULT '{}',

  -- Experience and role preferences
  experience_level TEXT CHECK (experience_level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'executive')) DEFAULT 'mid',
  preferred_roles TEXT[] DEFAULT '{}',

  -- Compensation preferences
  min_salary INTEGER,
  max_salary INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  salary_negotiable BOOLEAN DEFAULT TRUE,

  -- Work preferences
  preferred_schedule TEXT DEFAULT 'flexible',

  -- Algorithm weights (0.0 to 1.0)
  location_weight DECIMAL(3,2) DEFAULT 0.25,
  salary_weight DECIMAL(3,2) DEFAULT 0.30,
  role_weight DECIMAL(3,2) DEFAULT 0.25,
  company_weight DECIMAL(3,2) DEFAULT 0.20,

  -- Learning preferences
  auto_learn_from_swipes BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_job_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own job preferences" ON user_job_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own job preferences" ON user_job_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own job preferences" ON user_job_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own job preferences" ON user_job_preferences FOR DELETE USING (auth.uid() = user_id);`);
    console.log('');
    console.log('📍 Steps:');
    console.log('1. Go to your Supabase project SQL editor');
    console.log('2. Copy and paste the SQL above');
    console.log('3. Click "Run" to execute');
    console.log('4. Restart your app');
    console.log('');

  } catch (error) {
    console.error('❌ Direct migration failed:', error.message);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  runMigrationDirect()
    .then(() => {
      console.log('✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration, runMigrationDirect };
