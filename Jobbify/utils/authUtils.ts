import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Private from '../config/private';

// Google OAuth Client IDs (no hardcoded IDs)
const GOOGLE_WEB_CLIENT_ID = Private.GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = Private.GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

/**
 * Gets the appropriate redirect URI for OAuth authentication
 * For Supabase authentication, the key is to understand that:
 * 1. Supabase handles the OAuth redirect internally
 * 2. Your app needs to handle the callback after auth is complete
 */
export function getAuthRedirectUri(): string {
  try {
    // For Supabase mobile authentication, we need a URL that:
    // 1. Works across networks and devices
    // 2. Can be opened by WebBrowser.openAuthSessionAsync
    // 3. Will eventually redirect back to our app
    
    if (isRunningInExpoGo()) {
      // For Expo Go, we need to use Expo's authentication proxy
      // The key is this URL should be able to redirect back to Expo Go
      const redirectUrl = 'https://auth.expo.io/@bigpooper/jobbify';
      console.log('Using Expo authentication proxy for callback:', redirectUrl);
      return redirectUrl;
    } else {
      // For production builds, use the Supabase URL with public TLD
      const base = Private.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const redirectUrl = base ? `${base.replace(/\/$/, '')}/auth/v1/callback` : '';
      console.log('Using Supabase callback URL for production:', redirectUrl);
      return redirectUrl;
    }
  } catch (error) {
    console.error('Error generating redirect URI:', error);
    // Fallback to empty so caller can handle
    return '';
  }
}

/**
 * Determines if the app is running in Expo Go
 */
export function isRunningInExpoGo(): boolean {
  // Check if we're running in Expo Go
  // This is a heuristic and might need adjustment
  const appOwnership = Constants.appOwnership;
  return appOwnership === 'expo';
}

/**
 * Gets the Google OAuth configuration based on the platform and environment
 */
export function getGoogleOAuthConfig() {
  // Use our defined constants rather than trying to read from config
  const redirectUri = getAuthRedirectUri();
  
  // Check if we're using the Expo proxy or a direct deep link
  const isUsingExpoProxy = redirectUri.includes('auth.expo.io');
  
  // Determine the appropriate client ID based on platform
  let clientId = GOOGLE_WEB_CLIENT_ID; // Default to web client ID
  
  if (Platform.OS === 'ios') {
    // For iOS, we need to consider native auth or proxy usage
    if (isUsingExpoProxy) {
      console.log('Using Web Client ID for iOS with Expo proxy');
      clientId = GOOGLE_WEB_CLIENT_ID;
    } else {
      console.log('Using iOS Client ID for native iOS authentication');
      clientId = GOOGLE_IOS_CLIENT_ID;
    }
  } else {
    // For Android and web
    console.log('Using Web Client ID for non-iOS platforms');
    clientId = GOOGLE_WEB_CLIENT_ID;
  }
  
  // Build and return the complete config object
  return {
    provider: 'google' as const,
    clientId,
    redirectUri,
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: Platform.OS === 'ios' ? false : true
    }
  };
}
