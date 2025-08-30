import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { clearAllAppData } from '@/lib/secureStorage';

export default function DebugScreen() {
  const { theme, user, isLoading } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  
  const [authState, setAuthState] = useState<any>(null);
  const [dbConnection, setDbConnection] = useState<string>('Checking...');
  
  useEffect(() => {
    checkAuthState();
    checkDatabaseConnection();
  }, []);
  
  const checkAuthState = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      setAuthState({
        hasSession: !!session,
        user: session?.user,
        error: error?.message
      });
    } catch (error) {
      setAuthState({
        hasSession: false,
        error: error.message
      });
    }
  };
  
  const checkDatabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error) {
        setDbConnection(`Error: ${error.message}`);
      } else {
        setDbConnection('✅ Connected');
      }
    } catch (error) {
      setDbConnection(`Error: ${error.message}`);
    }
  };
  
  const clearAuthData = async () => {
    try {
      // Sign out from Supabase first
      await supabase.auth.signOut();

      // Then clear all app data
      await clearAllAppData();

      Alert.alert('Success', 'All auth and cached data cleared');
      checkAuthState();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
  
  const goToLogin = () => {
    router.push('/(auth)/login');
  };
  
  const goToHome = () => {
    router.push('/(tabs)/home');
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView style={styles.content}>
        <Text style={[styles.title, { color: themeColors.text }]}>Debug Information</Text>
        
        {/* App Context State */}
        <View style={[styles.section, { borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>App Context</Text>
          <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
            Loading: {isLoading ? 'true' : 'false'}
          </Text>
          <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
            User: {user ? 'Present' : 'null'}
          </Text>
          {user && (
            <>
              <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
                User ID: {user.id}
              </Text>
              <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
                Email: {user.email}
              </Text>
              <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
                Name: {user.name}
              </Text>
              <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
                User Type: {user.userType}
              </Text>
              <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
                Onboarding Complete: {user.onboardingCompleted ? 'true' : 'false'}
              </Text>
            </>
          )}
        </View>
        
        {/* Supabase Auth State */}
        <View style={[styles.section, { borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Supabase Auth</Text>
          <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
            Has Session: {authState?.hasSession ? 'true' : 'false'}
          </Text>
          {authState?.user && (
            <>
              <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
                Auth User ID: {authState.user.id}
              </Text>
              <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
                Auth Email: {authState.user.email}
              </Text>
            </>
          )}
          {authState?.error && (
            <Text style={[styles.debugText, { color: 'red' }]}>
              Error: {authState.error}
            </Text>
          )}
        </View>
        
        {/* Database Connection */}
        <View style={[styles.section, { borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Database</Text>
          <Text style={[styles.debugText, { color: themeColors.textSecondary }]}>
            Connection: {dbConnection}
          </Text>
        </View>
        
        {/* Actions */}
        <View style={[styles.section, { borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors.primary }]}
            onPress={checkAuthState}
          >
            <Text style={styles.buttonText}>Refresh Auth State</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors.primary }]}
            onPress={checkDatabaseConnection}
          >
            <Text style={styles.buttonText}>Test Database</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: 'orange' }]}
            onPress={clearAuthData}
          >
            <Text style={styles.buttonText}>Clear Auth Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: 'green' }]}
            onPress={goToLogin}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: 'blue' }]}
            onPress={goToHome}
          >
            <Text style={styles.buttonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  debugText: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
