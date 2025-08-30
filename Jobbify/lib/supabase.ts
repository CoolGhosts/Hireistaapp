import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { saveAuthTokens, clearAuthData } from './secureStorage';
import * as Private from '../config/private';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

// Supabase configuration (no secrets in code)
const supabaseUrl = Private.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Private.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. Configure via Jobbify/config/private.ts or env.');
}

// Get the URL to be used for authentication redirects (deep linking)
// This should match what we use in the login screen
const redirectUrl = makeRedirectUri({
  scheme: 'jobbify',
  path: 'auth/callback',
});

console.log('Supabase initialized with redirect URL:', redirectUrl);

// Custom storage implementation that uses SecureStore for sensitive data with fallbacks
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    // Always try AsyncStorage first for iOS to prevent the "User interaction is not allowed" error
    try {
      // Check if the value exists in AsyncStorage first
      const asyncValue = await AsyncStorage.getItem(key);
      if (asyncValue !== null) {
        return asyncValue;
      }

      // For web platforms, we're done at this point
      if (Platform.OS === 'web') {
        return null;
      }
      
      // For native platforms, try SecureStore but be prepared to catch errors
      try {
        // Check if we have chunked data
        const chunkCountKey = `${key}_chunk_count`;
        const countStr = await SecureStore.getItemAsync(chunkCountKey);
        
        // If there's a chunk count, we need to reassemble the data
        if (countStr) {
          const count = parseInt(countStr, 10);
          let value = '';
          
          // Collect all chunks
          for (let i = 0; i < count; i++) {
            const chunkKey = `${key}_chunk_${i}`;
            const chunk = await SecureStore.getItemAsync(chunkKey);
            if (chunk) {
              value += chunk;
            } else {
              console.error(`Missing chunk ${i} for key ${key}`);
              return null;
            }
          }
          
          return value;
        }
        
        // No chunks, just a regular item
        return await SecureStore.getItemAsync(key);
      } catch (secureStoreError) {
        console.warn('SecureStore access failed, using AsyncStorage value:', secureStoreError);
        // We've already checked AsyncStorage and didn't find a value, so return null
        return null;
      }
    } catch (error) {
      console.error('Error in storage adapter getItem:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Always store in AsyncStorage for redundancy and fallback
    try {
      await AsyncStorage.setItem(key, value);
    } catch (asyncError) {
      console.error('Error setting item in AsyncStorage:', asyncError);
    }
    
    // For non-web platforms, also try to use SecureStore
    if (Platform.OS !== 'web') {
      try {
        // Use chunking if the value is larger than 2000 bytes (under the 2048 limit for safety)
        const MAX_CHUNK_SIZE = 2000;
        
        if (value.length > MAX_CHUNK_SIZE) {
          // Delete any existing chunks
          await ExpoSecureStoreAdapter.removeItem(key);
          
          // Split the value into chunks
          const chunks = [];
          for (let i = 0; i < value.length; i += MAX_CHUNK_SIZE) {
            chunks.push(value.substring(i, i + MAX_CHUNK_SIZE));
          }
          
          // Store all chunks
          for (let i = 0; i < chunks.length; i++) {
            const chunkKey = `${key}_chunk_${i}`;
            await SecureStore.setItemAsync(chunkKey, chunks[i]);
          }
          
          // Store the chunk count so we know how many to read back
          await SecureStore.setItemAsync(`${key}_chunk_count`, chunks.length.toString());
        } else {
          // Small enough to store directly
          await SecureStore.setItemAsync(key, value);
        }
      } catch (secureStoreError) {
        console.warn('SecureStore failed, but data is saved in AsyncStorage:', secureStoreError);
        // No need to throw - we have the AsyncStorage fallback
      }
    }
  },
  removeItem: async (key: string): Promise<void> => {
    // Always remove from AsyncStorage for consistency
    try {
      await AsyncStorage.removeItem(key);
    } catch (asyncError) {
      console.error('Error removing item from AsyncStorage:', asyncError);
    }
    
    // For non-web platforms, also remove from SecureStore
    if (Platform.OS !== 'web') {
      try {
        // Check if we have chunks to remove
        const chunkCountKey = `${key}_chunk_count`;
        let countStr = null;
        
        try {
          countStr = await SecureStore.getItemAsync(chunkCountKey);
        } catch (countError) {
          console.warn('Error getting chunk count from SecureStore:', countError);
          // Continue removal of non-chunked data
        }
        
        if (countStr) {
          const count = parseInt(countStr, 10);
          
          // Delete all chunks
          for (let i = 0; i < count; i++) {
            const chunkKey = `${key}_chunk_${i}`;
            try {
              await SecureStore.deleteItemAsync(chunkKey);
            } catch (chunkError) {
              console.warn(`Error removing chunk ${i} from SecureStore:`, chunkError);
              // Continue with other chunks
            }
          }
          
          // Delete the chunk count key
          try {
            await SecureStore.deleteItemAsync(chunkCountKey);
          } catch (countDeleteError) {
            console.warn('Error removing chunk count key from SecureStore:', countDeleteError);
          }
        }
        
        // Delete the main key
        await SecureStore.deleteItemAsync(key);
      } catch (secureStoreError) {
        console.warn('Error removing item from SecureStore, but removed from AsyncStorage:', secureStoreError);
        // No need to throw - we have removed from AsyncStorage already
      }
    }
  },
};

// Create the Supabase client with error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable for deep linking support
    flowType: 'pkce', // Use PKCE flow for mobile
  },
});

// Add a wrapper to handle refresh token errors gracefully
const originalRefreshSession = supabase.auth.refreshSession.bind(supabase.auth);
supabase.auth.refreshSession = async (...args) => {
  try {
    return await originalRefreshSession(...args);
  } catch (error: any) {
    if (error?.message?.includes('Invalid Refresh Token') ||
        error?.message?.includes('Refresh Token Not Found') ||
        error?.message?.includes('refresh_token_not_found')) {
      console.log('🔄 Refresh token error caught, clearing auth data silently');
      // Clear auth data and return a signed out state
      await clearAuthData();
      return { data: { session: null, user: null }, error: null };
    }
    // Re-throw other errors
    throw error;
  }
};

// Set up deep linking handler for auth callbacks
Linking.addEventListener('url', ({ url }) => {
  console.log('Deep link received:', url);

  // Check if this is an auth callback URL
  if (url.includes('auth/callback')) {
    console.log('Auth callback URL detected, main layout will handle auth state changes');
  }
});

// Suppress refresh token errors in console
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');

  // Suppress specific refresh token errors that are expected
  if (message.includes('Invalid Refresh Token') ||
      message.includes('Refresh Token Not Found') ||
      message.includes('AuthApiError: Invalid Refresh Token')) {
    // Log a friendlier message instead
    console.log('🔄 Auth token expired (this is normal)');
    return;
  }

  // Call original console.error for other messages
  originalConsoleError.apply(console, args);
};

// Auth state change listener is now handled in AppContext to prevent multiple subscriptions
// This was causing navigation loops and multiple session checks
// Token storage and error handling is now integrated into the main auth flow

// TODO: If we need token storage, we can add it to the AppContext auth handler

// Helper function to check if required tables exist and are accessible
export async function checkDatabaseAccess() {
  try {
    console.log('Checking database tables access...');
    
    // Check profiles table
    const { error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    if (profilesError) {
      console.error('Error accessing profiles table:', profilesError.message);
      return { success: false, error: 'Cannot access profiles table' };
    }
    
    // Check job_seeker_profiles table with a more general query
    // This avoids specifying column names that might not exist
    const { error: jobSeekerError } = await supabase
      .from('job_seeker_profiles')
      .select('*')
      .limit(1);
      
    if (jobSeekerError) {
      console.error('Error accessing job_seeker_profiles table:', jobSeekerError.message);
      return { success: false, error: 'Cannot access job_seeker_profiles table' };
    }
    
    // Get the structure of job_seeker_profiles to log available columns
    const { data: jobSeekerData } = await supabase
      .from('job_seeker_profiles')
      .select('*')
      .limit(1);
      
    if (jobSeekerData && jobSeekerData.length > 0) {
      const columns = Object.keys(jobSeekerData[0]);
      console.log('Available job_seeker_profiles columns:', columns);
    }
    
    console.log('Database access check successful');
    return { success: true };
  } catch (error) {
    console.error('Database access check failed:', error);
    return { success: false, error: 'Database access check failed' };
  }
}

// Function to create necessary tables if they don't exist
export async function ensureTablesExist() {
  try {
    console.log('Checking and creating necessary database tables...');
    
    // First check if profiles table exists and has the required columns
    await ensureProfilesTable();
    
    // Then check job_seeker_profiles
    await ensureJobSeekerProfilesTable();
    
    // Finally check service_provider_profiles
    await ensureServiceProviderProfilesTable();
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
  }
}

// Specialized function to ensure the profiles table exists with correct columns
async function ensureProfilesTable() {
  try {
    // First check if we can select from the table
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Error accessing profiles table:', error.message);
      return;
    }
    
    // Use PostgreSQL information_schema to check if columns exist
    // This avoids RLS issues since we're not inserting test records
    const { data: columnsData, error: columnsError } = await supabase
      .rpc('check_profiles_columns');
    
    if (columnsError) {
      console.error('Error checking profile columns:', columnsError.message);
      
      // First let's try to create the RPC function to check columns
      const { error: createRpcError } = await supabase.rpc('create_check_profiles_columns_function');
      
      if (createRpcError) {
        // If we can't create the function, try a one-time direct alter table approach
        await addMissingProfileColumns();
      } else {
        // Try calling the newly created function
        const { data: retryData, error: retryError } = await supabase.rpc('check_profiles_columns');
        
        if (retryError || !retryData || !retryData.columns_exist) {
          await addMissingProfileColumns();
        }
      }
    } else if (columnsData && !columnsData.columns_exist) {
      // Columns don't exist, add them
      await addMissingProfileColumns();
    }
  } catch (err) {
    console.error('Error in ensureProfilesTable:', err);
    
    // Fallback to direct column addition if all else fails
    await addMissingProfileColumns();
  }
}

// Function to add missing columns to profiles table
async function addMissingProfileColumns() {
  try {
    // Use the execute method with a raw SQL query to add columns
    // We're not using the query builder as this is a schema operation
    const { error } = await supabase.rpc('add_missing_profile_columns');
    
    if (error) {
      console.error('Error adding missing profile columns:', error.message);
      console.log(`
        Profiles table is missing columns. Please go to Supabase dashboard
        and run the following SQL to fix the issue:
        
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type TEXT;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
      `);
    }
  } catch (err) {
    console.error('Error in addMissingProfileColumns:', err);
  }
}

// Try to create a profile table by inserting a record, catching errors
async function tryToFallbackCreateProfile() {
  const testUuid = '00000000-0000-0000-0000-000000000000';
  
  try {
    // Try inserting with minimal fields first
    await supabase
      .from('profiles')
      .upsert({
        id: testUuid
      });
      
    console.log('Successfully created a test profile with id only');
    
    // Now try updating with all fields to check if columns exist
    await supabase
      .from('profiles')
      .update({
        name: 'Test User',
        email: 'test@example.com',
        user_type: 'test',
        created_at: new Date().toISOString()
      })
      .eq('id', testUuid);
      
    console.log('Successfully updated test profile with all fields');
  } catch (err) {
    console.error('Error in fallback profile creation:', err);
    console.log('Profiles table may need to be created manually in Supabase dashboard');
  } finally {
    // Clean up test data
    try {
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testUuid);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Ensure job_seeker_profiles table exists
async function ensureJobSeekerProfilesTable() {
  try {
    const { error } = await supabase
      .from('job_seeker_profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Error accessing job_seeker_profiles table:', error.message);
      console.log(`
        Please go to Supabase dashboard and run:
        
        CREATE TABLE IF NOT EXISTS job_seeker_profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id),
          bio TEXT,
          title TEXT,
          resume_url TEXT
        );
      `);
    }
  } catch (err) {
    console.error('Error in ensureJobSeekerProfilesTable:', err);
  }
}

// Ensure service_provider_profiles table exists
async function ensureServiceProviderProfilesTable() {
  try {
    const { error } = await supabase
      .from('service_provider_profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Error accessing service_provider_profiles table:', error.message);
      console.log(`
        Please go to Supabase dashboard and run:
        
        CREATE TABLE IF NOT EXISTS service_provider_profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id),
          bio TEXT,
          service_area TEXT,
          availability TEXT
        );
      `);
    }
  } catch (err) {
    console.error('Error in ensureServiceProviderProfilesTable:', err);
  }
}
