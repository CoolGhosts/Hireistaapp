import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Keys for storing different types of data
const KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
};

/**
 * Save authentication tokens securely
 * Falls back to AsyncStorage if SecureStore fails
 */
export async function saveAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Use AsyncStorage for web
      await AsyncStorage.setItem(KEYS.AUTH_TOKEN, accessToken);
      await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
    } else {
      // Try to use SecureStore for native platforms
      try {
        await SecureStore.setItemAsync(KEYS.AUTH_TOKEN, accessToken);
        await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
      } catch (secureStoreError) {
        console.warn('SecureStore failed, falling back to AsyncStorage:', secureStoreError);
        // Fallback to AsyncStorage if SecureStore fails
        await AsyncStorage.setItem(KEYS.AUTH_TOKEN, accessToken);
        await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
      }
    }
  } catch (error) {
    console.error('Error saving auth tokens:', error);
    throw error;
  }
}

/**
 * Get the stored authentication token
 * Falls back to AsyncStorage if SecureStore fails
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    } else {
      try {
        return await SecureStore.getItemAsync(KEYS.AUTH_TOKEN);
      } catch (secureStoreError) {
        console.warn('SecureStore failed, falling back to AsyncStorage:', secureStoreError);
        // Fallback to AsyncStorage if SecureStore fails
        return await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
      }
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Get the stored refresh token
 * Falls back to AsyncStorage if SecureStore fails
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
    } else {
      try {
        return await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
      } catch (secureStoreError) {
        console.warn('SecureStore failed, falling back to AsyncStorage:', secureStoreError);
        // Fallback to AsyncStorage if SecureStore fails
        return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
      }
    }
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
}

/**
 * Save user data securely
 * Note: This is now primarily used for caching user profile data
 * The authoritative user data is stored in Supabase
 */
export async function saveUserData(userData: any): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
    } else {
      try {
        await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(userData));
      } catch (secureStoreError) {
        console.warn('SecureStore failed, falling back to AsyncStorage:', secureStoreError);
        // Fallback to AsyncStorage if SecureStore fails
        await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
      }
    }
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
}

/**
 * Get the stored user data
 * Note: This is cached data - always verify with Supabase for authoritative data
 */
export async function getUserData(): Promise<any | null> {
  try {
    let userData;
    if (Platform.OS === 'web') {
      userData = await AsyncStorage.getItem(KEYS.USER_DATA);
    } else {
      try {
        userData = await SecureStore.getItemAsync(KEYS.USER_DATA);
      } catch (secureStoreError) {
        console.warn('SecureStore failed, falling back to AsyncStorage:', secureStoreError);
        // Fallback to AsyncStorage if SecureStore fails
        userData = await AsyncStorage.getItem(KEYS.USER_DATA);
      }
    }
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

/**
 * Clear all stored authentication data
 * Clears from both SecureStore and AsyncStorage to ensure all data is removed
 */
export async function clearAuthData(): Promise<void> {
  try {
    const clearSecureStore = async () => {
      try {
        await SecureStore.deleteItemAsync(KEYS.AUTH_TOKEN);
        await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
        await SecureStore.deleteItemAsync(KEYS.USER_DATA);
      } catch (secureStoreError) {
        console.warn('Error clearing from SecureStore:', secureStoreError);
        // We continue execution even if SecureStore fails
      }
    };

    const clearAsyncStorage = async () => {
      await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(KEYS.REFRESH_TOKEN);
      await AsyncStorage.removeItem(KEYS.USER_DATA);

      // Also clear any user-specific application data
      await clearUserApplicationData();
    };

    // Clear from both storages to be thorough
    if (Platform.OS !== 'web') {
      await clearSecureStore();
    }
    await clearAsyncStorage();

  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
}

/**
 * Complete app reset - clears ALL cached data including user profiles, applications, etc.
 * Use this when you need to completely reset the app state
 */
export async function clearAllAppData(): Promise<void> {
  try {
    console.log('🧹 Starting complete app data clear...');

    // First clear auth data
    await clearAuthData();

    // Clear additional cached data
    const additionalKeys = [
      'cached_user_data',
      'rememberedEmail',
      'rememberMe',
    ];

    await AsyncStorage.multiRemove(additionalKeys);

    // Clear any remaining user-specific data
    const allKeys = await AsyncStorage.getAllKeys();
    const userDataKeys = allKeys.filter(key =>
      key.includes('user_applications_') ||
      key.includes('cached_user_data') ||
      key.includes('auth_token') ||
      key.includes('refresh_token') ||
      key.includes('user_data')
    );

    if (userDataKeys.length > 0) {
      console.log('🧹 Clearing additional user data keys:', userDataKeys);
      await AsyncStorage.multiRemove(userDataKeys);
    }

    console.log('✅ Complete app data clear finished');

  } catch (error) {
    console.error('Error clearing all app data:', error);
    throw error;
  }
}

/**
 * Clear user-specific application data from AsyncStorage
 * This removes all application data and swiped job data for all users to prevent data leakage
 */
export async function clearUserApplicationData(): Promise<void> {
  try {
    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();

    // Filter keys that start with user-specific prefixes
    const applicationKeys = allKeys.filter(key => key.startsWith('user_applications_'));
    const swipedJobKeys = allKeys.filter(key => key.startsWith('swipedJobIds_'));

    // Also remove the old global keys if they exist
    const keysToRemove = [
      ...applicationKeys,
      ...swipedJobKeys,
      'user_applications', // Old global application key
      'swipedJobIds' // Old global swiped jobs key
    ];

    if (keysToRemove.length > 0) {
      console.log(`[SecureStorage] Clearing ${keysToRemove.length} user data keys`);
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (error) {
    console.error('Error clearing user application data:', error);
    // Don't throw - this is a cleanup operation
  }
}