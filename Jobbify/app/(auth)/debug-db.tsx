import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase, checkDatabaseAccess, ensureTablesExist } from '../../lib/supabase';
import { router } from 'expo-router';

export default function DatabaseDebugScreen() {
  const [status, setStatus] = useState<string>('Loading...');
  const [dbInfo, setDbInfo] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  
  const CREATE_PROFILES_SQL = `
  -- Fix for profiles table:
  CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT,
    email TEXT,
    user_type TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  -- If table exists but missing columns:
  ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS user_type TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;

  const CREATE_JOB_SEEKER_PROFILES_SQL = `
  -- Fix for job_seeker_profiles table:
  CREATE TABLE IF NOT EXISTS job_seeker_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    bio TEXT,
    title TEXT,
    resume_url TEXT
  );
  `;
  
  useEffect(() => {
    checkDatabaseStatus();
  }, []);
  
  async function checkDatabaseStatus() {
    try {
      setStatus('Checking database status...');
      
      // First ensure all required tables exist
      await ensureTablesExist();
      
      // Check database access
      const accessResult = await checkDatabaseAccess();
      
      // Get table information
      const tables = ['profiles', 'job_seeker_profiles', 'service_provider_profiles'];
      const tablesInfo: Record<string, any> = {};
      
      for (const table of tables) {
        try {
          // Try to get structure
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
            
          if (error) {
            tablesInfo[table] = { error: error.message, exists: false };
          } else {
            // Get column information
            const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
            tablesInfo[table] = { 
              exists: true, 
              columns,
              count: await getTableCount(table)
            };
          }
        } catch (err: any) {
          tablesInfo[table] = { error: err.message, exists: false };
        }
      }
      
      setDbInfo({
        accessCheck: accessResult,
        tables: tablesInfo,
        timestamp: new Date().toISOString()
      });
      
      setStatus(accessResult.success ? 'Database connected' : 'Database connection issues detected');
      
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
      setStatus('Error checking database');
    }
  }
  
  async function getTableCount(table: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      return count || 0;
    } catch {
      return -1; // Error getting count
    }
  }
  
  // Add this new function to directly execute SQL
  async function executeSQLFix() {
    try {
      setStatus('Attempting to fix database tables with SQL...');
      
      // Execute the profiles table SQL
      const { error: profilesError } = await supabase.rpc('execute_sql', { 
        sql: CREATE_PROFILES_SQL 
      });
      
      if (profilesError) {
        console.error('Error executing profiles SQL:', profilesError);
        setError(`SQL execution failed: ${profilesError.message}`);
        return;
      }
      
      // Execute the job_seeker_profiles table SQL
      const { error: jobSeekerError } = await supabase.rpc('execute_sql', { 
        sql: CREATE_JOB_SEEKER_PROFILES_SQL 
      });
      
      if (jobSeekerError) {
        console.error('Error executing job_seeker_profiles SQL:', jobSeekerError);
        setError(`SQL execution failed: ${jobSeekerError.message}`);
        return;
      }
      
      setStatus('Database tables fixed successfully! Refreshing status...');
      setTimeout(() => {
        checkDatabaseStatus();
      }, 1000);
    } catch (err: any) {
      setError(`Failed to execute SQL: ${err.message}`);
      console.error('Error executing SQL fix:', err);
    }
  }
  
  async function fixJobSeekerProfilesTable() {
    try {
      setStatus('Attempting to fix job_seeker_profiles table...');
      
      // Log the SQL that would fix the issue
      console.log(`
        -- If the table exists but needs the user_id column:
        ALTER TABLE job_seeker_profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
        
        -- Or if it's better to recreate with the right structure:
        DROP TABLE IF EXISTS job_seeker_profiles;
        CREATE TABLE job_seeker_profiles (
          id UUID PRIMARY KEY,
          bio TEXT,
          title TEXT,
          resume_url TEXT
        );
      `);
      
      setStatus('Generated SQL fix commands. Please check console logs.');
    } catch (err: any) {
      setError(err.message);
    }
  }
  
  async function fixProfilesTable() {
    try {
      setStatus('Attempting to fix profiles table...');
      
      // Log the SQL that would fix the issue
      console.log(`
        -- Fix for profiles table:
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS email TEXT,
        ADD COLUMN IF NOT EXISTS name TEXT,
        ADD COLUMN IF NOT EXISTS user_type TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
        
        -- Or recreate with the right structure:
        DROP TABLE IF EXISTS profiles;
        CREATE TABLE profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id),
          name TEXT,
          email TEXT,
          user_type TEXT,
          created_at TIMESTAMP
        );
      `);
      
      setStatus('Generated SQL fix commands for profiles table. Please check console logs.');
    } catch (err: any) {
      setError(err.message);
    }
  }
  
  async function runApiDiagnostic() {
    try {
      setStatus('Running API diagnostic...');
      
      // Get the API URL - since we're in Expo, we need to use the correct URL format
      const apiUrl = 'http://localhost:8081/api/check-db';
      
      // Call API
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      // Log the entire response for debugging
      console.log('API diagnostic result:', JSON.stringify(data, null, 2));
      
      // Update state with API response
      setDbInfo({
        ...dbInfo,
        apiDiagnostic: data,
        timestamp: new Date().toISOString()
      });
      
      setStatus('API diagnostic complete');
    } catch (err: any) {
      console.error('API diagnostic error:', err);
      setError(`API diagnostic failed: ${err.message}`);
    }
  }
  
  function copyToClipboard(text: string) {
    try {
      // Not all browsers/environments support this
      // In a real app, would use a proper clipboard library
      navigator.clipboard.writeText(text)
        .then(() => {
          setStatus('SQL copied to clipboard!');
          setTimeout(() => setStatus('Database connected'), 2000);
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          // Fallback: show the text to manually copy
          console.log('Copy this SQL manually:', text);
          setStatus('SQL logged to console');
        });
    } catch (err) {
      console.error('Clipboard API not available:', err);
      // Fallback: show the text to manually copy
      console.log('Copy this SQL manually:', text);
      setStatus('SQL logged to console');
    }
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>Database Diagnostics</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusValue}>{status}</Text>
        </View>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={checkDatabaseStatus}
          >
            <Text style={styles.buttonText}>Refresh Database Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.fixButton]} 
            onPress={executeSQLFix}
          >
            <Text style={styles.buttonText}>Fix Database Tables (Execute SQL)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={fixJobSeekerProfilesTable}
          >
            <Text style={styles.buttonText}>Fix job_seeker_profiles Table</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={fixProfilesTable}
          >
            <Text style={styles.buttonText}>Fix profiles Table</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={runApiDiagnostic}
          >
            <Text style={styles.buttonText}>Run API Diagnostic</Text>
          </TouchableOpacity>
          
          <Text style={styles.sectionSubtitle}>Copy SQL Fixes:</Text>
          <TouchableOpacity 
            style={[styles.actionButton, styles.sqlButton]} 
            onPress={() => copyToClipboard(CREATE_PROFILES_SQL)}
          >
            <Text style={styles.buttonText}>Copy Profiles SQL Fix</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.sqlButton]} 
            onPress={() => copyToClipboard(CREATE_JOB_SEEKER_PROFILES_SQL)}
          >
            <Text style={styles.buttonText}>Copy Job Seeker Profiles SQL Fix</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.sectionTitle}>Database Info:</Text>
          {Object.keys(dbInfo).length > 0 ? (
            <>
              <Text style={styles.infoText}>
                Access Check: {dbInfo.accessCheck?.success ? '✅ Success' : '❌ Failed'}
              </Text>
              
              {dbInfo.accessCheck?.error && (
                <Text style={styles.errorText}>Error: {dbInfo.accessCheck.error}</Text>
              )}
              
              <Text style={styles.sectionSubtitle}>Tables:</Text>
              
              {dbInfo.tables && Object.entries(dbInfo.tables).map(([tableName, tableInfo]: [string, any]) => (
                <View key={tableName} style={styles.tableInfo}>
                  <Text style={styles.tableName}>{tableName}:</Text>
                  <Text style={styles.tableStatus}>
                    {tableInfo.exists ? '✅ Exists' : '❌ Missing'}
                  </Text>
                  
                  {tableInfo.exists && tableInfo.columns && (
                    <>
                      <Text>Rows: {tableInfo.count !== undefined ? tableInfo.count : 'Unknown'}</Text>
                      <Text>Columns: {tableInfo.columns.join(', ')}</Text>
                    </>
                  )}
                  
                  {tableInfo.error && (
                    <Text style={styles.errorText}>Error: {tableInfo.error}</Text>
                  )}
                </View>
              ))}
              
              <Text style={styles.timestamp}>
                Last checked: {new Date(dbInfo.timestamp).toLocaleString()}
              </Text>
            </>
          ) : (
            <Text>No database information available</Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    alignItems: 'center',
  },
  statusLabel: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  statusValue: {
    flex: 1,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#6200EE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  fixButton: {
    backgroundColor: '#2E7D32',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    marginBottom: 8,
  },
  tableInfo: {
    marginLeft: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  tableName: {
    fontWeight: 'bold',
  },
  tableStatus: {
    marginBottom: 8,
  },
  timestamp: {
    marginTop: 16,
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'right',
  },
  backButton: {
    backgroundColor: '#6200EE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sqlButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
}); 