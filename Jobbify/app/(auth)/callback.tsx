import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

// This component handles OAuth redirects from providers like Google
export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('Auth callback received, params:', params);
        
        // Get the iOS client ID from app.config.js
        const iosClientId = Constants.expoConfig?.extra?.GOOGLE_IOS_CLIENT_ID;
        console.log('iOS client ID available:', !!iosClientId);
        
        // On web, the auth callback will be handled directly by the browser
        // For native, we need to process the deep link that expo-auth-session gives us

        if (params.code) {
          console.log('Processing auth code from params');
          // This is a native redirect with auth code from expo-auth-session
          
          // For iOS, we might need to append the client_id to the code
          let code = params.code as string;
          
          // Note: Supabase exchangeCodeForSession only takes a single parameter
          // For iOS, we handle the client ID in the initial OAuth call
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Failed to exchange code for session:', error);
            router.replace('/login?error=auth_callback_failed');
            return;
          }
          
          if (data.session) {
            console.log('Session created successfully, letting main layout handle navigation');
            // Let the main layout handle navigation based on onboarding status
            router.replace('/');
          } else {
            console.warn('No session created from code exchange');
            // No session, redirect to login
            router.replace('/login?error=no_session');
          }
        } else {
          // No code found, might be an error or direct access
          console.log('No auth code found in callback params');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error handling OAuth callback:', error);
        router.replace('/login?error=auth_exception');
      }
    };

    // Process the callback as soon as the component mounts
    handleOAuthCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6200EE" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
  },
});
