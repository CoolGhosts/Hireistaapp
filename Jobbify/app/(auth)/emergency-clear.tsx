import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function EmergencyClearScreen() {
  const [status, setStatus] = useState('🚨 Emergency data clear in progress...');

  useEffect(() => {
    emergencyClear();
  }, []);

  const emergencyClear = async () => {
    try {
      setStatus('🔄 Step 1: Force signing out all sessions...');
      
      // Force sign out with all scopes
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('✅ Global sign out completed');
      } catch (error) {
        console.log('Global sign out failed, trying local:', error);
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (localError) {
          console.log('Local sign out also failed:', localError);
        }
      }
      
      setStatus('🧹 Step 2: Clearing AsyncStorage...');
      
      // Get all keys first
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('📋 Found AsyncStorage keys:', allKeys);
      
      // Clear specific problematic keys first
      const problematicKeys = [
        'cached_user_data',
        'user_profile',
        'auth_session',
        'supabase_auth',
        'user_preferences'
      ];
      
      for (const key of problematicKeys) {
        try {
          await AsyncStorage.removeItem(key);
          console.log(`🗑️ Removed ${key}`);
        } catch (error) {
          console.log(`${key} not found`);
        }
      }
      
      // Clear everything
      await AsyncStorage.clear();
      console.log('✅ AsyncStorage completely cleared');
      
      setStatus('🔐 Step 3: Clearing SecureStore...');
      
      if (Platform.OS !== 'web') {
        const secureKeys = [
          'supabase.auth.token',
          'supabase-auth-token',
          'sb-auth-token',
          'cached_user_data',
          'user_preferences',
          'auth_session',
          'user_profile',
          'supabase.session',
          'expo-auth-session',
          'auth.token',
          'session',
          'user',
          'profile'
        ];
        
        for (const key of secureKeys) {
          try {
            await SecureStore.deleteItemAsync(key);
            console.log(`🗑️ Cleared SecureStore: ${key}`);
          } catch (error) {
            console.log(`SecureStore key ${key} not found`);
          }
        }
      }
      
      setStatus('🔍 Step 4: Verifying clear...');
      
      // Verify AsyncStorage is empty
      const remainingKeys = await AsyncStorage.getAllKeys();
      if (remainingKeys.length > 0) {
        console.warn('⚠️ Some keys remain:', remainingKeys);
        setStatus(`⚠️ Warning: ${remainingKeys.length} keys remain in storage`);
      } else {
        console.log('✅ AsyncStorage is completely empty');
      }
      
      // Check auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.warn('⚠️ Session still exists:', session.user?.email);
        setStatus('⚠️ Warning: Auth session still exists');
      } else {
        console.log('✅ No auth session found');
      }
      
      setStatus('✅ Emergency clear completed! Redirecting...');
      
      // Wait a moment then redirect
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Emergency clear failed:', error);
      setStatus(`❌ Emergency clear failed: ${error}`);
      
      // Still try to redirect
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 5000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚨 Emergency Data Clear</Text>
        <ActivityIndicator size="large" color="#ff4444" style={styles.loader} />
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.subtitle}>
          Clearing all cached data and forcing logout...
        </Text>
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
    color: '#ff4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  loader: {
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
