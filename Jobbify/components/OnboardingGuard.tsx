import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { checkOnboardingStatus, getNextOnboardingStep } from '@/services/onboardingService';
import { LightTheme, DarkTheme } from '@/constants/Theme';

interface OnboardingGuardProps {
  children: React.ReactNode;
  requireJobPreferences?: boolean;
}

/**
 * OnboardingGuard component that ensures users complete onboarding before accessing protected content
 */
export const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ 
  children, 
  requireJobPreferences = true 
}) => {
  const { user, theme } = useAppContext();
  const [isChecking, setIsChecking] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.id) {
        setIsChecking(false);
        return;
      }

      try {
        if (requireJobPreferences) {
          const status = await checkOnboardingStatus(user.id);
          
          if (!status.isComplete) {
            // User hasn't completed required onboarding
            const nextStep = await getNextOnboardingStep(user.id);
            if (nextStep) {
              console.log('Redirecting to onboarding step:', nextStep);
              router.replace(nextStep);
              return;
            }
          }
          
          setCanAccess(status.isComplete);
        } else {
          // No onboarding required for this component
          setCanAccess(true);
        }
      } catch (error) {
        console.error('Error checking onboarding access:', error);
        setCanAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [user?.id, requireJobPreferences]);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.message, { color: themeColors.text }]}>
          Please log in to continue
        </Text>
      </View>
    );
  }

  if (isChecking) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.tint} />
        <Text style={[styles.message, { color: themeColors.text }]}>
          Checking your preferences...
        </Text>
      </View>
    );
  }

  if (!canAccess && requireJobPreferences) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.message, { color: themeColors.text }]}>
          Setting up your job preferences...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default OnboardingGuard;
