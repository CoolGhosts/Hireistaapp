import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

/**
 * Utility to completely clear all user data and caches
 * Use this for testing or when you need a completely clean state
 */
export const clearAllData = {
  /**
   * Clear all local storage and secure storage
   */
  async clearLocalStorage(): Promise<void> {
    try {
      console.log('🧹 Clearing all local storage...');

      // First, specifically clear the cached user data that's causing the issue
      try {
        await AsyncStorage.removeItem('cached_user_data');
        console.log('🗑️ Cleared cached_user_data from AsyncStorage');
      } catch (error) {
        console.log('cached_user_data not found in AsyncStorage');
      }

      // Clear all AsyncStorage keys one by one to be thorough
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('📋 Found AsyncStorage keys:', allKeys);

        if (allKeys.length > 0) {
          await AsyncStorage.multiRemove(allKeys);
          console.log('🗑️ Removed all AsyncStorage keys');
        }
      } catch (error) {
        console.warn('⚠️ Error with multiRemove, trying clear:', error);
        await AsyncStorage.clear();
      }

      console.log('✅ AsyncStorage cleared completely');

      // Clear SecureStore items (only on native platforms)
      if (Platform.OS !== 'web') {
        try {
          // Comprehensive list of all possible secure store keys
          const secureStoreKeys = [
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
            'profile',
            // Add more potential keys
            'expo-secure-store-auth',
            'supabase-session',
            'auth-data'
          ];

          for (const key of secureStoreKeys) {
            try {
              await SecureStore.deleteItemAsync(key);
              console.log(`🗑️ Cleared SecureStore key: ${key}`);
            } catch (error) {
              // Key might not exist, that's okay
              console.log(`Key ${key} not found in SecureStore (this is normal)`);
            }
          }
          console.log('✅ SecureStore cleared');
        } catch (error) {
          console.warn('⚠️ Error clearing SecureStore:', error);
        }
      }

    } catch (error) {
      console.error('❌ Error clearing local storage:', error);
      throw error;
    }
  },

  /**
   * Sign out current user and clear session
   */
  async signOutUser(): Promise<void> {
    try {
      console.log('👋 Signing out current user...');

      // Try global sign out first (signs out from all devices)
      const { error: globalError } = await supabase.auth.signOut({ scope: 'global' });
      if (globalError) {
        console.warn('⚠️ Error during global sign out:', globalError);

        // If global fails, try local sign out
        const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
        if (localError) {
          console.warn('⚠️ Error during local sign out:', localError);
        }
      } else {
        console.log('✅ User signed out globally');
      }

      // Force clear the session
      try {
        await supabase.auth.refreshSession();
      } catch (refreshError) {
        console.log('Session refresh failed (expected after sign out)');
      }

    } catch (error) {
      console.error('❌ Error signing out user:', error);
    }
  },

  /**
   * Clear all data - both local and sign out user
   */
  async clearEverything(): Promise<void> {
    try {
      console.log('🚀 Starting complete data clear...');
      
      // 1. Sign out user first
      await this.signOutUser();
      
      // 2. Clear all local storage
      await this.clearLocalStorage();
      
      console.log('✅ All data cleared successfully!');
      console.log('📱 App is now in a completely clean state');
      
    } catch (error) {
      console.error('❌ Error during complete data clear:', error);
      throw error;
    }
  },

  /**
   * Verify that all data has been cleared
   */
  async verifyDataCleared(): Promise<boolean> {
    try {
      console.log('🔍 Verifying data has been cleared...');
      
      // Check AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      if (allKeys.length > 0) {
        console.log('⚠️ AsyncStorage still has keys:', allKeys);
        return false;
      }
      
      // Check auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('⚠️ User session still exists');
        return false;
      }
      
      console.log('✅ Data clear verification passed');
      return true;
      
    } catch (error) {
      console.error('❌ Error verifying data clear:', error);
      return false;
    }
  }
};
