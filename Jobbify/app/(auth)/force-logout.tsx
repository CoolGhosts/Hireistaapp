import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { clearAllData } from '../../utils/clearAllData';
import { supabase } from '../../lib/supabase';

export default function ForceLogoutScreen() {
  const [status, setStatus] = useState('Forcing logout and clearing all data...');

  useEffect(() => {
    forceLogoutAndClear();
  }, []);

  const forceLogoutAndClear = async () => {
    try {
      setStatus('🔄 Signing out current session...');
      
      // Force sign out
      await supabase.auth.signOut({ scope: 'global' });
      
      setStatus('🧹 Clearing all local storage...');
      
      // Clear all local data
      await clearAllData.clearLocalStorage();
      
      setStatus('🔍 Verifying clean state...');
      
      // Verify everything is cleared
      const isCleared = await clearAllData.verifyDataCleared();
      
      if (isCleared) {
        setStatus('✅ All data cleared successfully!');
      } else {
        setStatus('⚠️ Some data may still remain');
      }
      
      // Wait a moment then redirect
      setTimeout(() => {
        setStatus('🔄 Redirecting to login...');
        router.replace('/(auth)/login');
      }, 2000);
      
    } catch (error) {
      console.error('Error during force logout:', error);
      setStatus(`❌ Error: ${error}`);
      
      // Still try to redirect after error
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 3000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.title}>Clearing Data</Text>
        <Text style={styles.status}>{status}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});
