// Import polyfills first to fix WebCrypto API warning
import 'react-native-get-random-values';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Slot, useSegments, useRouter, Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { AppProvider, useAppContext } from '../context/AppContext';
import { Text } from 'react-native';
import React from 'react';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    PoppinsRegular: require('../assets/fonts/Poppins-Regular.ttf'),
    PoppinsMedium: require('../assets/fonts/Poppins-Medium.ttf'),
    PoppinsBold: require('../assets/fonts/Poppins-Bold.ttf'),
    ...FontAwesome.font,
  });
  const [fontTimeout, setFontTimeout] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Add a timeout for font loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loaded) {
        setFontTimeout(true);
        console.warn('Font loading timeout!');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [loaded]);

  if (!loaded && !fontTimeout) {
    return null;
  }

  if (fontTimeout && !loaded) {
    return (
      <Text style={{ color: 'red', marginTop: 100, fontSize: 20 }}>
        Font loading failed or is taking too long!
      </Text>
    );
  }

  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}

function RootLayoutNav() {
  const { user, isLoading } = useAppContext();





  // Route protection logic moved into its own effect to avoid calling hook inside hook
  const segments = useSegments();
  const router = useRouter();
  const processingRef = React.useRef(false);
  const prevSegmentsRef = React.useRef<string[] | null>(null);
  const prevUserRef = React.useRef(user);
  const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Disabled effect-driven navigation to prevent remount loops.
  // Synchronous <Redirect> logic below now handles routing deterministically.
  useEffect(() => {
    // Intentionally left blank
  }, [user, segments, isLoading]);

  // Wait for user data to load before making navigation decisions
  if (isLoading) {
    return null; // Show nothing while loading to prevent flicker
  }

  // Synchronous redirect to avoid initial flicker to tabs/home
  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segments[0] === '(onboarding)';
  const inModals = segments[0] === '(modals)';

  // If no user and not in auth/onboarding/modals, redirect to welcome
  if (!user && !inAuthGroup && !inOnboarding && !inModals) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  // If user is authenticated and in auth group, redirect based on onboarding status
  if (user && inAuthGroup) {
    if (user.onboardingCompleted) {
      return <Redirect href="/(tabs)" />;
    } else {
      return <Redirect href="/(modals)/filters" />;
    }
  }

  // If user is authenticated but on welcome screen, redirect appropriately
  if (user && inOnboarding) {
    // Check onboarding status using the onboarding service for more reliable data
    // For now, if user exists and is authenticated, assume onboarding is complete
    // This fixes the issue where onboardingCompleted is undefined due to timing
    return <Redirect href="/(tabs)" />;
  }

  // Return a Slot instead of conditional Stack to fix the warning
  return <Slot />;
}
