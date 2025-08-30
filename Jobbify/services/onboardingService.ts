import { supabase } from '@/lib/supabase';
import { getUserJobPreferences } from './jobRecommendationService';

export interface OnboardingStatus {
  hasJobPreferences: boolean;
  hasCareerPreferences: boolean;
  isComplete: boolean;
}

/**
 * Check if user has completed the mandatory onboarding
 */
export const checkOnboardingStatus = async (userId: string): Promise<OnboardingStatus> => {
  try {
    // Check if user has job preferences
    const jobPreferences = await getUserJobPreferences(userId);
    const hasJobPreferences = !!jobPreferences;

    // Check if user has career preferences
    const { data: careerPreferences, error: careerError } = await supabase
      .from('career_preferences')
      .select('id')
      .eq('id', userId)
      .single();

    if (careerError && careerError.code !== 'PGRST116') {
      console.error('Error checking career preferences:', careerError);
    }

    const hasCareerPreferences = !!careerPreferences;

    // User must have job preferences to access job panels
    // Career preferences are optional but recommended
    const isComplete = hasJobPreferences;

    return {
      hasJobPreferences,
      hasCareerPreferences,
      isComplete
    };
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return {
      hasJobPreferences: false,
      hasCareerPreferences: false,
      isComplete: false
    };
  }
};

/**
 * Mark onboarding as complete in user profile
 */
export const markOnboardingComplete = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error marking onboarding complete:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markOnboardingComplete:', error);
    return false;
  }
};

/**
 * Get the next required onboarding step
 * Change: If user lacks job preferences, route them to Filters modal to set them.
 */
export const getNextOnboardingStep = async (userId: string): Promise<string | null> => {
  const status = await checkOnboardingStatus(userId);

  // If no job preferences, guide the user to set filters/preferences first
  if (!status.hasJobPreferences) {
    return '/(modals)/filters';
  }

  // If job preferences are complete, onboarding is done
  return null;
};

/**
 * Check if user can access job panels
 */
export const canAccessJobPanels = async (userId: string): Promise<boolean> => {
  const status = await checkOnboardingStatus(userId);
  return status.isComplete;
};
