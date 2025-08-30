import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';

/**
 * Hook to enforce authentication and redirect as needed
 * Note: User state management is handled by main layout, this only handles redirects
 */
export function useAuthCheck(options?: { redirectTo?: string; redirectIfAuthed?: boolean }) {
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // If we should redirect authenticated users away from auth pages
          if (options?.redirectIfAuthed) {
            // Let the main layout handle navigation based on onboarding status
            // Don't force redirect to tabs here
            console.log('User is authenticated, letting main layout handle navigation');
          }
        } else {
          // If we should redirect unauthenticated users to welcome screen
          if (!options?.redirectIfAuthed) {
            // Add a small delay to ensure root layout is mounted
            setTimeout(() => {
              try {
                if (options?.redirectTo) {
                  router.replace(options.redirectTo);
                } else {
                  router.replace('/(onboarding)/welcome');
                }
              } catch (navError) {
                console.error('Navigation error:', navError);
              }
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuth();

    // No auth state listener needed - main layout handles all auth state changes
  }, []);
}