import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { testApiConnection } from '@/services/remoteOkService';
import { fetchJobs } from '@/services/JobsService';

export const ApiDebugger: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnection = async () => {
    setIsLoading(true);
    addResult('Starting API connection test...');
    
    try {
      const result = await testApiConnection();
      addResult(`Connection test result: ${result ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      addResult(`Connection test error: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  const testFetchJobs = async () => {
    setIsLoading(true);
    addResult('Testing job fetch...');
    
    try {
      const jobs = await fetchJobs();
      addResult(`Fetched ${jobs.length} jobs successfully`);
      if (jobs.length > 0) {
        addResult(`First job: ${jobs[0].title} at ${jobs[0].company}`);
      }
    } catch (error) {
      addResult(`Job fetch error: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Debugger</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={testConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={testFetchJobs}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Fetch Jobs</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    minWidth: 80,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
  },
  resultsContainer: {
    maxHeight: 200,
    backgroundColor: '#000',
    borderRadius: 5,
    padding: 10,
  },
  resultText: {
    color: '#00FF00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});
