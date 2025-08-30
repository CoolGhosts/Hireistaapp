import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Appearance, ColorSchemeName, useColorScheme as useNativeColorScheme } from 'react-native';
import { supabase } from '@/lib/supabase';
import { clearUserApplicationData, saveAuthTokens, clearAuthData } from '@/lib/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveJobApplication, getUserApplications } from '@/services/supabaseApplicationService';

// Helper function to validate if a job ID exists in the database
async function validateJobExists(jobId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .single();

    if (error) {
      console.log(`[AppContext] Job ${jobId} does not exist in database:`, error.message);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error(`[AppContext] Error validating job existence for ${jobId}:`, error);
    return false;
  }
}

// Define our application types
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  pay: string;
  image: string;
  distance: string;
  tags: string[];
  description: string;
  qualifications: string[];
  requirements: string[];
  logo?: string;
  url?: string;
  postedDate?: string; // ISO string date for time-based filtering
}

// Unified AppliedJob type for context and UI
export interface AppliedJob {
  job: Job;
  status: 'pending' | 'accepted' | 'denied' | 'responded' | 'applying';
  statusColor?: string; // Added color for status
  responseMessage?: string;
  appliedAt?: string;
  respondedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  skills: string[];
  experience: string[];
  userType?: 'job_seeker' | 'service_provider';
  onboardingCompleted?: boolean;
}

// Context type definition
interface AppContextType {
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // Job applications
  applications: AppliedJob[];
  addApplication: (job: Job) => void;
  updateApplication: (jobId: string, update: Partial<AppliedJob>) => void;
  // User profile
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  // Auth
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

// Create the context with default values
const AppContext = createContext<AppContextType>({
  theme: 'light',
  toggleTheme: () => {},
  applications: [],
  addApplication: () => {},
  updateApplication: () => {},
  user: null,
  setUser: () => {},
  isLoading: false,
  signOut: async () => {},
  refreshUserProfile: async () => {},
});

// Custom hook to use the app context
export const useAppContext = () => useContext(AppContext);

// Global auth initialization flag to prevent multiple subscriptions across component remounts
let globalAuthInitialized = false;
let globalAuthSubscription: any = null;

// Safe version of the context hook that prevents insertion effect errors
export const useSafeAppContext = () => {
  // Create a ref to store initial context values
  const contextRef = React.useRef<AppContextType | null>(null);
  
  // Initialize the ref if needed - this prevents insertion effect issues
  if (contextRef.current === null) {
    // Get initial values - this only runs once during first render
    contextRef.current = useContext(AppContext);
  }
  
  // Get the current context (this might trigger warnings in strict mode)
  const context = useContext(AppContext);
  
  // Update ref with latest values after render
  React.useEffect(() => {
    contextRef.current = context;
  }, [context]);
  
  // Return the context from the ref during render
  return contextRef.current;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get system color scheme and track changes
  const systemColorScheme = useNativeColorScheme() as 'light' | 'dark';
  
  // Initialize theme with persistent storage
  const [theme, setTheme] = useState<'light' | 'dark'>(systemColorScheme || 'light');
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>('system');
  
  // Helper function to synchronize theme state across the app
  const synchronizeThemeState = useCallback(async (newPreference: 'system' | 'light' | 'dark') => {
    console.log(`[AppContext] Synchronizing theme state with preference: ${newPreference}`);
    
    // Update the preference state
    setThemePreference(newPreference);
    
    // Determine the actual theme to apply
    let themeToApply: 'light' | 'dark';
    
    if (newPreference === 'system') {
      // Use the system's current theme
      themeToApply = systemColorScheme || 'light';
      console.log(`[AppContext] Using system theme: ${themeToApply}`);
    } else {
      // Use the explicit user preference
      themeToApply = newPreference as 'light' | 'dark';
      console.log(`[AppContext] Using explicit theme: ${themeToApply}`);
    }
    
    // Apply the theme
    setTheme(themeToApply);
    
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem('theme_preference', newPreference);
      console.log(`[AppContext] Saved theme preference: ${newPreference}`);
    } catch (error) {
      console.error('[AppContext] Error saving theme preference:', error);
    }
  }, []); // Remove systemColorScheme dependency to prevent circular dependency
  
  // Effect for loading saved theme preference from storage on app start
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedThemePreference = await AsyncStorage.getItem('theme_preference');

        if (savedThemePreference) {
          // Use our synchronization helper to properly set everything up
          await synchronizeThemeState(savedThemePreference as 'system' | 'light' | 'dark');
          console.log(`[AppContext] Loaded and applied theme preference: ${savedThemePreference}`);
        } else {
          // First time app run, default to system and save this preference
          await synchronizeThemeState('system');
          console.log('[AppContext] No stored theme preference found, defaulted to system');
        }
      } catch (error) {
        console.error('[AppContext] Error loading theme preference:', error);
        // Fallback to system theme in case of error
        synchronizeThemeState('system');
      }
    };

    // Defer theme loading to prevent insertion effect warnings
    requestAnimationFrame(() => {
      loadThemePreference();
    });
  }, []); // Remove synchronizeThemeState dependency to prevent infinite loop
  
  // Initialize user data
  const [user, setUser] = useState<User | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Applications state as AppliedJob[]
  const [applications, setApplications] = useState<AppliedJob[]>([]);

  // Auth state management
  const isUpdatingUserRef = useRef(false);

  // Load applications from storage when user changes
  useEffect(() => {
    const loadApplications = async () => {
      try {
        if (!user?.id) {
          // Guest mode - no applications to load
          console.log('[AppContext] Guest mode - no applications to load');
          setApplications([]);
          return;
        }

        // Load user-specific applications
        const userSpecificKey = `user_applications_${user.id}`;
        const storedApplications = await AsyncStorage.getItem(userSpecificKey);
        if (storedApplications) {
          const parsedApplications = JSON.parse(storedApplications);
          console.log(`[AppContext] Loaded ${parsedApplications.length} applications from storage for user ${user.id}`);
          setApplications(parsedApplications);
        } else {
          console.log(`[AppContext] No stored applications found for user ${user.id}`);
          setApplications([]);
        }
      } catch (error) {
        console.error('Failed to load applications from storage:', error);
        setApplications([]);
      }
    };

    loadApplications();
  }, [user?.id]); // Depend on user.id so it reloads when user changes

  // Note: Applications are now stored in Supabase via supabaseApplicationService
  // This local state is for UI reactivity only // Depend on both applications and user.id

  // Properly handle system theme changes - only apply if user has selected 'system' preference
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme && themePreference === 'system') {
        console.log(`[AppContext] System theme changed to ${colorScheme}, applying because preference is 'system'`);
        // Defer theme update to prevent insertion effect warnings
        requestAnimationFrame(() => {
          setTheme(colorScheme as 'light' | 'dark');
        });
      } else if (colorScheme) {
        console.log(`[AppContext] System theme changed to ${colorScheme}, ignoring because preference is '${themePreference}'`);
      }
    });
    return () => subscription.remove();
  }, [themePreference]);

  // Effect to respond to system theme changes (only when preference is 'system')
  useEffect(() => {
    // Only update if preference is set to follow system
    if (themePreference === 'system' && systemColorScheme) {
      console.log(`[AppContext] System theme changed to ${systemColorScheme}, updating app theme`);
      // Defer theme update to prevent insertion effect warnings
      requestAnimationFrame(() => {
        setTheme(systemColorScheme);
      });
    }
  }, [systemColorScheme, themePreference]);

  // Improved toggle theme function that cycles through options
  const toggleTheme = useCallback(() => {
    // Get next theme in the cycle: light -> dark -> system -> light
    const getNextTheme = (current: 'light' | 'dark' | 'system'): 'light' | 'dark' | 'system' => {
      switch (current) {
        case 'light': return 'dark';
        case 'dark': return 'system';
        case 'system': return 'light';
        default: return 'light'; // Failsafe
      }
    };
    
    // Get the next theme preference in our cycle
    const nextThemePreference = getNextTheme(themePreference);
    console.log(`[AppContext] Toggling theme from ${themePreference} to ${nextThemePreference}`);
    
    // Use our synchronization helper to update everything consistently
    synchronizeThemeState(nextThemePreference);
  }, [themePreference]); // Remove synchronizeThemeState dependency to prevent circular dependency

  // Add or update application - memoized to avoid recreating on every render
  const addApplication = useCallback((job: Job) => {
    setApplications(prev => {
      // If already applied, don't add again
      if (prev.some(app => app.job.id === job.id)) return prev;
      
      console.log(`[AppContext] Adding application for job: ${job.id} (${job.title})`);
      
      const newApplications = [
        {
          job,
          status: 'applying' as const,
          statusColor: '#FFC107',
          appliedAt: new Date().toISOString(),
        },
        ...prev,
      ];
      
      // Immediately persist to AsyncStorage (user-specific)
      (async () => {
        try {
          if (!user?.id) {
            console.log('[AppContext] No user logged in, skipping immediate save');
            return;
          }
          const userSpecificKey = `user_applications_${user.id}`;
          console.log(`[AppContext] Saving ${newApplications.length} applications to storage for user ${user.id}`);
          await AsyncStorage.setItem(userSpecificKey, JSON.stringify(newApplications));
          
          // Also save to Supabase if user is logged in
          if (user?.id) {
            console.log(`[AppContext] User is logged in, saving to database: ${job.id}`);
            
            try {
              // Prevent applications to mock jobs
              if (job.id.startsWith('mock-job-')) {
                console.error(`[AppContext] Cannot create application: Job ${job.id} is a mock job and doesn't exist in database`);
                return;
              }

              // Validate that the job exists in the database before creating an application
              const jobExists = await validateJobExists(job.id);
              if (!jobExists) {
                console.error(`[AppContext] Cannot create application: Job ${job.id} does not exist in database`);
                return;
              }

              console.log(`[AppContext] Job ${job.id} validated successfully`);

              // Get the current authenticated user ID from Supabase
              const { data: { user: authUser } } = await supabase.auth.getUser();
              const authUserId = authUser?.id;

              if (!authUserId) {
                console.error('[AppContext] No authenticated user found');
                return;
              }

              console.log(`[AppContext] Using auth user ID: ${authUserId} for database operations`);

              // Create application with the validated job ID
              const { error } = await supabase
                .from('matches')
                .upsert(
                  {
                    profile_id: authUserId,
                    job_id: job.id, // Use the original job ID since it's already validated
                    job_title: job.title,
                    job_company: job.company,
                    status: 'applying',
                    created_at: new Date().toISOString()
                  },
                  { onConflict: 'profile_id,job_id' }
                );

              if (error) {
                console.error('[AppContext] Failed to save application to database:', error);
              } else {
                console.log(`[AppContext] Successfully saved application for job ${job.id} to database`);
              }
            } catch (dbError) {
              console.error('[AppContext] Exception saving application to database:', dbError);
            }
          }
        } catch (error) {
          console.error('[AppContext] Failed to save applications to storage:', error);
        }
      })();
      
      return newApplications;
    });
  }, []);

  // Update application status/fields - memoized to avoid recreating on every render
  const updateApplication = useCallback((jobId: string, update: Partial<AppliedJob>) => {
    setApplications(prev => {
      const updatedApplications = prev.map(app =>
        app.job.id === jobId ? { ...app, ...update } : app
      );
      
      // Immediately persist to AsyncStorage (user-specific)
      (async () => {
        try {
          if (!user?.id) {
            console.log('[AppContext] No user logged in, skipping update save');
            return;
          }
          const userSpecificKey = `user_applications_${user.id}`;
          console.log(`[AppContext] Updating application ${jobId} and saving to storage for user ${user.id}`);
          await AsyncStorage.setItem(userSpecificKey, JSON.stringify(updatedApplications));
        } catch (error) {
          console.error('Failed to save updated applications to storage:', error);
        }
      })();
      
      return updatedApplications;
    });
  }, [user]);

  // Sign out function
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      // Clear applications before signing out
      console.log('[AppContext] Clearing applications on sign out');
      setApplications([]);

      // Clear all user application data from storage
      await clearUserApplicationData();

      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh user profile from database
  const refreshUserProfile = useCallback(async () => {
    // Get current user from auth session
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser?.id) return;
    
    setIsLoading(true);
    try {
      // Get the user's profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();  // Use maybeSingle instead of single to avoid errors when no record exists
        
      if (profileError) throw profileError;
      
      // If profile doesn't exist, create it with default values
      if (!profileData) {
        const userType = 'job_seeker'; // Default to job seeker
        
        // Create a new profile
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            name: currentUser.user_metadata?.name || 'New User',
            email: currentUser.email || '',
            user_type: userType
          })
          .select('*')
          .single();
          
        if (insertError) throw insertError;
        profileData = newProfile;
        
        // Also create the job_seeker_profile record
        const { error: jobSeekerInsertError } = await supabase
          .from('job_seeker_profiles')
          .insert({
            profile_id: currentUser.id,
            title: 'Job Seeker',
            bio: '',
          });
          
        if (jobSeekerInsertError) throw jobSeekerInsertError;
      }
      
      // Get user type specific data
      if (profileData.user_type === 'job_seeker') {
        // First check if job seeker profile exists
        let { data: jobSeekerData, error: jobSeekerError } = await supabase
          .from('job_seeker_profiles')
          .select('*')
          .eq('profile_id', currentUser.id)
          .maybeSingle();  // Use maybeSingle instead of single
          
        if (jobSeekerError) throw jobSeekerError;
        
        // If job seeker profile doesn't exist, create it
        if (!jobSeekerData) {
          const { data: newJobSeekerData, error: createError } = await supabase
            .from('job_seeker_profiles')
            .insert({
              profile_id: currentUser.id,
              title: 'Job Seeker',
              bio: '',
            })
            .select('*')
            .single();
            
          if (createError) throw createError;
          
          // Use the new data
          jobSeekerData = newJobSeekerData;
        }
        
        // Get skills - SECURITY: Always filter by current user
        const { data: skillsData, error: skillsError } = await supabase
          .from('user_skills')
          .select('skill_name')
          .eq('profile_id', currentUser.id);

        if (skillsError) {
          console.error('Error fetching user skills:', skillsError);
          // Don't throw - continue with empty skills
        }

        // Get experiences - SECURITY: Always filter by current user
        const { data: experiencesData, error: experiencesError } = await supabase
          .from('experiences')
          .select('title, company')
          .eq('profile_id', currentUser.id);

        if (experiencesError) {
          console.error('Error fetching user experiences:', experiencesError);
          // Don't throw - continue with empty experiences
        }
        
        // Update user state
        setUser({
          id: currentUser.id,
          name: profileData.name || currentUser.user_metadata?.name || 'User',
          email: profileData.email || currentUser.email || '',
          avatar: jobSeekerData?.photo_url || currentUser.user_metadata?.avatar_url || '',
          skills: skillsData?.map(skill => skill.skill_name) || [],
          experience: experiencesData?.map(exp => `${exp.title} at ${exp.company}`) || [],
          userType: 'job_seeker',
          onboardingCompleted: profileData.onboarding_completed || false,
        });
      } else if (profileData.user_type === 'service_provider') {
        // First check if service provider profile exists
        let { data: providerData, error: providerError } = await supabase
          .from('service_provider_profiles')
          .select('*')
          .eq('profile_id', currentUser.id)
          .maybeSingle();  // Use maybeSingle instead of single
          
        if (providerError) throw providerError;
        
        // If provider profile doesn't exist, create it
        if (!providerData) {
          const { data: newProviderData, error: createError } = await supabase
            .from('service_provider_profiles')
            .insert({
              profile_id: currentUser.id,
              name: profileData.name,
              service_categories: [],
            })
            .select('*')
            .single();
            
          if (createError) throw createError;
          
          // Use the new data
          providerData = newProviderData;
        }
        
        // Update user state
        setUser({
          id: currentUser.id,
          name: profileData.name || currentUser.user_metadata?.name || 'User',
          email: profileData.email || currentUser.email || '',
          avatar: providerData?.photo_url || currentUser.user_metadata?.avatar_url || '',
          skills: providerData?.service_categories || [],
          experience: [],
          userType: 'service_provider',
          onboardingCompleted: profileData.onboarding_completed || false,
        });
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Cache user data for faster startup
  const cacheUserData = useCallback(async (userData: any) => {
    try {
      await AsyncStorage.setItem('cached_user_data', JSON.stringify(userData));
    } catch (error) {
      console.error('Error caching user data:', error);
    }
  }, []);

  const loadCachedUserData = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem('cached_user_data');
      if (cachedData) {
        const userData = JSON.parse(cachedData);
        console.log('📦 Loading cached user data for faster startup:', userData);
        setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error('Error loading cached user data:', error);
    }
    return null;
  }, []);

  // Handle user update from auth session
  const handleUserUpdate = useCallback(async (sessionUser: any) => {
    if (!sessionUser) {
      setUser(null);
      await AsyncStorage.removeItem('cached_user_data');
      return;
    }

    // Prevent duplicate calls
    if (isUpdatingUserRef.current) {
      console.log('🔄 User update already in progress, skipping duplicate call');
      return;
    }

    isUpdatingUserRef.current = true;
    console.log('🔄 Starting handleUserUpdate for:', sessionUser.email);

    try {
      // First, try to load cached data for immediate display
      const cachedUser = await loadCachedUserData();
      if (cachedUser) {
        setIsLoading(false);
      }

      // If no cached data, set basic user info immediately for better UX
      if (!cachedUser) {
        const basicUserData = {
          id: sessionUser.id,
          name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'User',
          email: sessionUser.email || '',
          avatar: sessionUser.user_metadata?.avatar_url || '',
          skills: [],
          experience: [],
          userType: 'job_seeker' as 'job_seeker' | 'service_provider',
          onboardingCompleted: false,
        };

        console.log('👤 Setting basic user state immediately:', basicUserData);
        setUser(basicUserData);
      }

      console.log('📊 Fetching user profile...');

      // Fetch profile data from database
      let { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      // If profile doesn't exist, create it with minimal data
      if (fetchError && fetchError.code === 'PGRST116') {
        console.log('➕ Creating new user profile for:', sessionUser.email);

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: sessionUser.id,
            name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'User',
            email: sessionUser.email || '',
            user_type: 'job_seeker' // Default to job seeker
          })
          .select('*')
          .single();

        if (createError) {
          console.error('❌ Error creating profile:', createError);
          throw createError;
        }

        profileData = newProfile;
        console.log('✅ Created new profile:', profileData);
      } else if (fetchError) {
        console.error('❌ Error fetching profile:', fetchError);
        throw fetchError;
      }

      // Update user state with profile data (keep it simple for fast startup)
      const fullUserData = {
        id: sessionUser.id,
        name: profileData?.name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'User',
        email: sessionUser.email || '',
        avatar: sessionUser.user_metadata?.avatar_url || '',
        skills: [], // Load skills later to avoid startup delay
        experience: [], // Load experience later to avoid startup delay
        userType: profileData?.user_type || 'job_seeker',
        onboardingCompleted: profileData?.onboarding_completed || false,
      };

      console.log('👤 Updating user state with optimized profile data:', fullUserData);
      setUser(fullUserData);

      // Cache the updated user data
      await cacheUserData(fullUserData);

    } catch (error) {
      console.error('❌ Error in handleUserUpdate:', error);
      // Cached or basic user data was already set, so we don't need fallback here
    } finally {
      isUpdatingUserRef.current = false;
      setIsLoading(false);
    }
  }, [loadCachedUserData, cacheUserData]);

  // Initialize auth state management
  useEffect(() => {
    // Prevent multiple auth initializations using global flag
    if (globalAuthInitialized) {
      console.log('🔄 Auth already initialized globally, skipping duplicate initialization');
      return;
    }
    globalAuthInitialized = true;

    console.log('🔄 Starting auth initialization...');

    // Clean up any existing subscription first
    if (globalAuthSubscription) {
      console.log('🔄 Cleaning up existing auth subscription');
      globalAuthSubscription.unsubscribe();
    }

    // Single auth state change listener that handles both initial session and changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email);

      try {
        // Handle token storage first
        if (event === 'SIGNED_IN' && session) {
          // Store tokens securely
          await saveAuthTokens(session.access_token, session.refresh_token);
        } else if (event === 'SIGNED_OUT') {
          // Clear stored tokens
          await clearAuthData();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Update stored tokens when refreshed
          await saveAuthTokens(session.access_token, session.refresh_token);
        }

        // Handle user state updates
        if (session?.user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          console.log('👤 User found, updating user state...');
          await handleUserUpdate(session.user);
        } else if (!session && (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT')) {
          console.log('👤 No user session, clearing user state...');
          setUser(null);
          isUpdatingUserRef.current = false; // Reset the flag
          setIsLoading(false);
        }
      } catch (updateError: any) {
        console.error('❌ Error in auth state change:', updateError);
        setIsLoading(false);

        // Handle auth-related errors silently
        if (updateError?.message?.includes('Invalid Refresh Token') ||
            updateError?.message?.includes('Refresh Token Not Found') ||
            updateError?.message?.includes('refresh_token_not_found')) {
          console.log('🔄 Refresh token expired or invalid, clearing auth data silently');
          try {
            await clearAuthData();
            setUser(null);
          } catch (clearError) {
            console.warn('Error clearing auth data:', clearError);
          }
        }
      }
    });

    // Store the subscription globally
    globalAuthSubscription = subscription;

    return () => {
      console.log('🔄 Cleaning up auth subscription');
      if (globalAuthSubscription) {
        globalAuthSubscription.unsubscribe();
        globalAuthSubscription = null;
      }
      globalAuthInitialized = false; // Reset for next mount
    };
  }, [handleUserUpdate]);

  // Create stable context value with useMemo to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    theme,
    toggleTheme,
    applications,
    addApplication,
    updateApplication,
    user,
    setUser,
    isLoading,
    signOut,
    refreshUserProfile,
  }), [
    theme, 
    toggleTheme, 
    applications, 
    addApplication, 
    updateApplication, 
    user, 
    isLoading, 
    signOut, 
    refreshUserProfile
  ]);

  // Provide the context value
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
