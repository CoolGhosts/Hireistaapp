import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';

export default function OnboardingLayout() {
  const { theme, user } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const segments = useSegments();

  useEffect(() => {
    // Allow users to navigate through onboarding screens naturally
    // No forced redirects - let users complete the welcome flow
  }, [user, segments]);
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="import-resume" />
      <Stack.Screen name="job-seeker" />
      <Stack.Screen name="service-provider" />
    </Stack>
  );
}