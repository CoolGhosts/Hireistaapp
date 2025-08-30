import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import { createTestJobApplication, importJobsFromAPI } from '@/services/jobApplicationService';
import { supabase } from '@/lib/supabase';
import { clearAllData } from '@/utils/clearAllData';
import { router } from 'expo-router';

export default function DebugScreen() {
  const { theme, user } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Function to create a test job application
  const handleCreateTestApplication = async () => {
    if (!user) {
      setError('No user logged in');
      return;
    }
    
    setLoading(true);
    setResult('');
    setError('');
    
    try {
      const success = await createTestJobApplication(user.id);
      if (success) {
        setResult('Successfully created test job application!');
      } else {
        setError('Failed to create test job application.');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to check DB structure
  const handleCheckDatabase = async () => {
    if (!user) {
      setError('No user logged in');
      return;
    }
    
    setLoading(true);
    setResult('');
    setError('');
    
    try {
      // Check matches table structure
      const { data, error: tableError } = await supabase.rpc('get_table_definition', { table_name: 'matches' });
      
      if (tableError) {
        setError(`Error checking table structure: ${tableError.message}`);
        return;
      }
      
      setResult(`Table structure: ${JSON.stringify(data, null, 2)}`);
      
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to check jobs table structure
  const handleCheckJobsTable = async () => {
    if (!user) {
      setError('No user logged in');
      return;
    }
    
    setLoading(true);
    setResult('');
    setError('');
    
    try {
      // First, check what columns exist in the jobs table
      const { data: columns, error: columnsError } = await supabase
        .from('jobs')
        .select('*')
        .limit(1);
        
      if (columnsError) {
        setError(`Error checking jobs table: ${columnsError.message}`);
        return;
      }
      
      if (columns && columns.length > 0) {
        const availableColumns = Object.keys(columns[0]);
        setResult(`Jobs table columns: ${availableColumns.join(', ')}`);
      } else {
        // If no jobs exist, try to get the table definition
        const { data: tableData, error: tableError } = await supabase.rpc('get_table_definition', { table_name: 'jobs' });
        
        if (tableError) {
          setError(`Error getting jobs table definition: ${tableError.message}`);
          return;
        }
        
        setResult(`Jobs table definition: ${JSON.stringify(tableData, null, 2)}`);
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to list existing jobs and use them
  const handleListAndUseJobs = async () => {
    if (!user) {
      setError('No user logged in');
      return;
    }
    
    setLoading(true);
    setResult('');
    setError('');
    
    try {
      // First check if any jobs exist that we can use
      const { data: existingJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, company')
        .limit(5);
        
      if (jobsError) {
        setError(`Error checking jobs: ${jobsError.message}`);
        return;
      }
      
      if (!existingJobs || existingJobs.length === 0) {
        setError('No jobs found in the database. Ask an administrator to create jobs.');
        return;
      }
      
      // Show the available jobs
      setResult(`Found ${existingJobs.length} jobs:\n${JSON.stringify(existingJobs, null, 2)}`);
      
      // Use the first job to create an application
      const firstJob = existingJobs[0];
      console.log(`Using job with ID: ${firstJob.id} - ${firstJob.title}`);
      
      // Create application for this job
      const { data: appData, error: appError } = await supabase
        .from('matches')
        .insert({
          profile_id: user.id,
          job_id: firstJob.id,
          status: 'pending'
        })
        .select()
        .single();
        
      if (appError) {
        setError(`Error creating application: ${appError.message}`);
        return;
      }
      
      setResult(`Successfully created job application using job "${firstJob.title}":\n${JSON.stringify(appData, null, 2)}`);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to create a simple job
  const handleCreateSimpleJob = async () => {
    if (!user) {
      setError('No user logged in');
      return;
    }
    
    setLoading(true);
    setResult('');
    setError('');
    
    try {
      // Create a simple job with only required fields
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          title: 'Simple Test Job',
          company: 'Test Company',
          // Try with minimal fields
        })
        .select()
        .single();
        
      if (error) {
        setError(`Error creating job: ${error.message}`);
        return;
      }
      
      setResult(`Job created successfully: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to import jobs from API
  const handleImportJobs = async () => {
    setLoading(true);
    setResult('');
    setError('');
    
    try {
      const result = await importJobsFromAPI();
      
      if (result.success) {
        setResult(`Successfully imported ${result.count} jobs from the API!`);
      } else {
        setError('Failed to import jobs from API.');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to create a direct application with fake job ID
  const handleCreateDirectApplication = async () => {
    if (!user) {
      setError('No user logged in');
      return;
    }

    setLoading(true);
    setResult('');
    setError('');

    try {
      // Create an application with a dummy job ID (1)
      // This won't be displayed correctly, but it's useful for debugging
      const { data, error } = await supabase
        .from('matches')
        .insert({
          profile_id: user.id,
          job_id: 1, // Use 1 as a default job ID for testing
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23503') { // Foreign key violation
          setError('Foreign key constraint error. Job with ID 1 might not exist.');
        } else {
          setError(`Error creating application: ${error.message}`);
        }
        return;
      }

      setResult(`Created test application: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to clear all data and force logout
  const handleClearAllData = async () => {
    Alert.alert(
      '🗑️ Clear All Data',
      'This will:\n• Sign out the current user\n• Clear all local storage\n• Clear all cached data\n\nThis action cannot be undone. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setResult('');
            setError('');

            try {
              setResult('🔄 Clearing all data...');

              // Clear everything
              await clearAllData.clearEverything();

              setResult('✅ All data cleared! Redirecting to login...');

              // Navigate to login after a short delay
              setTimeout(() => {
                router.replace('/(auth)/login');
              }, 2000);

            } catch (err) {
              setError(`❌ Error clearing data: ${err instanceof Error ? err.message : 'Unknown error'}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Debug Tools</Text>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Job Applications</Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.tint }]}
          onPress={handleCreateTestApplication}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Test Job Application'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.tint, marginTop: 12 }]}
          onPress={handleCheckDatabase}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Checking...' : 'Check Database Structure'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.tint, marginTop: 12 }]}
          onPress={handleCheckJobsTable}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Checking...' : 'Check Jobs Table Structure'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.tint, marginTop: 12 }]}
          onPress={handleListAndUseJobs}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Listing...' : 'List and Use Jobs'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.tint, marginTop: 12 }]}
          onPress={handleCreateSimpleJob}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Simple Job'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.tint, marginTop: 12 }]}
          onPress={handleImportJobs}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Importing...' : 'Import Jobs from API'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.tint, marginTop: 12 }]}
          onPress={handleCreateDirectApplication}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Direct Application'}
          </Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color={themeColors.tint} style={styles.loader} />}
        
        {result ? (
          <View style={[styles.resultContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
            <Text style={[styles.resultText, { color: themeColors.success }]}>
              {result}
            </Text>
          </View>
        ) : null}
        
        {error ? (
          <View style={[styles.resultContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
            <Text style={[styles.resultText, { color: themeColors.error }]}>
              {error}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Data Management</Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ff4444', marginTop: 12 }]}
          onPress={handleClearAllData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            🗑️ Clear All Data & Logout
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>User Info</Text>
        <Text style={[styles.userInfo, { color: themeColors.text }]}>
          User ID: {user?.id || 'Not logged in'}
        </Text>
        <Text style={[styles.userInfo, { color: themeColors.text }]}>
          Email: {user?.email || 'Not logged in'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
  resultContainer: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  resultText: {
    fontSize: 14,
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 8,
  },
}); 