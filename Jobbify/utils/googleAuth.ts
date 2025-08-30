import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';
import { getGoogleOAuthConfig } from './authUtils';

/**
 * Handles Google authentication - optimized for reliable operation
 * in both development and production environments
 */
export async function signInWithGoogle() {
  // For development, give the option to use direct login
  if (__DEV__) {
    return developmentModeLogin();
  }

  // For production builds, use the standard OAuth flow
  try {
    console.log('[googleAuth] Starting Google sign-in process');
    // Get platform-aware config
    const config = getGoogleOAuthConfig();

    const { error } = await supabase.auth.signInWithOAuth(config);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('[googleAuth] Authentication error:', err);
    Alert.alert('Authentication Error', String(err));
    return { success: false, error: err };
  }
}

/**
 * Development mode implementation that bypasses OAuth
 * to allow testing the authenticated experience
 */
function developmentModeLogin() {
  return new Promise((resolve) => {
    Alert.prompt(
      'Development Login',
      'Enter your Supabase email to login:',
      [{
        text: 'Login',
        onPress: async (email) => {
          if (!email) {
            resolve({ success: false });
            return;
          }
          
          // Ask for password
          Alert.prompt(
            'Enter Password',
            'Enter your Supabase password:',
            [{
              text: 'Sign In',
              onPress: async (password) => {
                if (!password) {
                  resolve({ success: false });
                  return;
                }
                
                try {
                  console.log(`[devAuth] Attempting login with email: ${email}`);
                  const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                  });
                  
                  if (error) throw error;
                  console.log('[devAuth] Successfully logged in with test account');
                  resolve({ success: true });
                  
                } catch (err) {
                  console.error('[devAuth] Login error:', err);
                  Alert.alert('Login Failed', String(err));
                  resolve({ success: false, error: err });
                }
              }
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve({ success: false, cancelled: true })
            }],
            'secure-text'
          );
        }
      },
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve({ success: false, cancelled: true })
      }]
    );
  });
}
