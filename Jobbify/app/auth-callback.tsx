import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Verifying your account...');
  const [error, setError] = useState<string | null>(null);
  const params = useLocalSearchParams();
  
  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the current URL to extract tokens
        const url = window.location.href;
        console.log('Processing auth callback from URL:', url);
        
        // Check if there's an access token in the URL (Supabase format)
        if (url.includes('access_token')) {
          setMessage('Account verified successfully!');
          
          // Let Supabase handle the URL parameters
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session error:', error.message);
            setError('Failed to verify your account. Please try again or contact support.');
            return;
          }
          
          // Check if we have a valid session
          if (data.session) {
            setMessage('Verification successful! Redirecting to app...');

            // Let the main layout handle navigation based on onboarding status
            // Don't force redirect to tabs here
            setTimeout(() => {
              router.replace('/');
            }, 1500);
          } else {
            setMessage('Verification successful! Please log in to continue.');
            
            // Redirect to login page
            setTimeout(() => {
              router.replace('/login');
            }, 1500);
          }
        } else if (params.error) {
          // Handle error from auth provider
          console.error('Auth error:', params.error);
          setError(`Authentication error: ${params.error_description || params.error}`);
        } else {
          // No token found, redirect to login
          setMessage('No verification token found. Please try again.');
          setTimeout(() => {
            router.replace('/login');
          }, 2000);
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError('An error occurred during verification. Please try again.');
      }
    };
    
    handleEmailVerification();
  }, [params]);
  
  return (
    <View style={styles.container}>
      {error ? (
        <View>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.helpText}>
            Please try logging in or contact support if this issue persists.
          </Text>
        </View>
      ) : (
        <>
          <ActivityIndicator size="large" color="#6200EE" style={styles.loader} />
          <Text style={styles.message}>{message}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  loader: {
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  errorText: {
    fontSize: 18,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
}); 