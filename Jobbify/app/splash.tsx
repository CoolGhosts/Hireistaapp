import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { getNextOnboardingStep } from '../services/onboardingService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing helpers
const isSmallDevice = SCREEN_HEIGHT < 700;
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

// Responsive dimensions
const SPACING = moderateScale(20);
const LOGO_SIZE = isSmallDevice ? moderateScale(70) : moderateScale(85);
const TITLE_SIZE = isSmallDevice ? moderateScale(28) : moderateScale(32);
const SUBTITLE_SIZE = isSmallDevice ? moderateScale(14) : moderateScale(16);
const FEATURE_ICON_SIZE = moderateScale(42);
const BUTTON_PADDING_V = isSmallDevice ? moderateScale(14) : moderateScale(16);

// Feature data
const features = [
  {
    icon: 'search',
    title: 'Smart Job Matchings',
    description: 'AI-powered recommendations',
    color: '#0284C7',
    bgColor: '#E0F2FE',
  },
  {
    icon: 'line-chart',
    title: 'Career Growth',
    description: 'Track your application progress',
    color: '#16A34A',
    bgColor: '#F0FDF4',
  },
  {
    icon: 'bell-o',
    title: 'Instant Alerts',
    description: 'Never miss an opportunity',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
];

// Types
interface Feature {
  icon: keyof typeof FontAwesome.glyphMap;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

interface AnimatedFeatureCardProps {
  feature: Feature;
  index: number;
  animation: Animated.Value;
}

// Animated Feature Card Component
const AnimatedFeatureCard = ({ feature, index, animation }: AnimatedFeatureCardProps) => (
  <Animated.View
    style={[
      styles.featureCard,
      {
        opacity: animation,
        transform: [
          {
            translateY: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          },
        ],
      },
    ]}
  >
    <View style={[styles.featureIconWrapper, { backgroundColor: feature.bgColor }]}>
      <FontAwesome 
        name={feature.icon} 
        size={moderateScale(18)} 
        color={feature.color} 
      />
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle} numberOfLines={1}>
        {feature.title}
      </Text>
      <Text style={styles.featureDescription} numberOfLines={1}>
        {feature.description}
      </Text>
    </View>
  </Animated.View>
);

export default function SplashScreen() {
  const { user } = useAppContext();

  // Animation values
  const animations = useRef({
    logoOpacity: new Animated.Value(0),
    logoScale: new Animated.Value(0.9),
    titleTranslateY: new Animated.Value(30),
    titleOpacity: new Animated.Value(0),
    featureAnimations: features.map(() => new Animated.Value(0)),
    buttonScale: new Animated.Value(0.8),
    buttonOpacity: new Animated.Value(0),
  }).current;

  useEffect(() => {
    const animate = () => {
      const logoAnimation = Animated.parallel([
        Animated.timing(animations.logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(animations.logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]);

      const titleAnimation = Animated.parallel([
        Animated.timing(animations.titleOpacity, {
          toValue: 1,
          duration: 800,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.spring(animations.titleTranslateY, {
          toValue: 0,
          tension: 60,
          friction: 8,
          delay: 300,
          useNativeDriver: true,
        }),
      ]);

      const featuresAnimation = Animated.stagger(
        150,
        animations.featureAnimations.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          })
        )
      );

      const buttonAnimation = Animated.parallel([
        Animated.timing(animations.buttonOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(animations.buttonScale, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
      ]);

      Animated.sequence([
        logoAnimation,
        titleAnimation,
        Animated.delay(200),
        featuresAnimation,
        Animated.delay(300),
        buttonAnimation,
      ]).start();
    };

    animate();

    const timer = setTimeout(async () => {
      await handleNavigation();
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const handleNavigation = async () => {
    if (user) {
      if (user.onboardingCompleted) {
        router.replace('/(tabs)');
      } else {
        // Use onboarding service to get the correct next step
        const nextStep = await getNextOnboardingStep(user.id);
        router.replace(nextStep || '/(onboarding)/welcome');
      }
    } else {
      // New flow: Go to welcome screen for guests
      router.replace('/(onboarding)/welcome');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F4FF" />
      <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Animated.View
            style={{
              opacity: animations.logoOpacity,
              transform: [{ scale: animations.logoScale }],
            }}
          >
            <View style={styles.logoWrapper}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        </View>

        {/* Welcome Text Section */}
        <View style={styles.textSection}>
          <Animated.View
            style={{
              opacity: animations.titleOpacity,
              transform: [{ translateY: animations.titleTranslateY }],
            }}
          >
            <Text style={styles.welcomeTitle}>Welcome to Jobbify</Text>
            <Text style={styles.welcomeSubtitle}>
              Your next career move is just a tap away.
            </Text>
          </Animated.View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <AnimatedFeatureCard
                key={index}
                feature={feature}
                index={index}
                animation={animations.featureAnimations[index]}
              />
            ))}
          </View>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <Animated.View
            style={{
              opacity: animations.buttonOpacity,
              transform: [{ scale: animations.buttonScale }],
              width: '100%',
            }}
          >
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => handleNavigation()}
              activeOpacity={0.8}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <FontAwesome 
                name="arrow-right" 
                size={moderateScale(16)} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING,
    paddingTop: Platform.OS === 'android' ? verticalScale(20) : 0,
  },
  // --- Logo Section ---
  logoSection: {
    paddingTop: isSmallDevice ? verticalScale(30) : verticalScale(60),
    paddingBottom: verticalScale(30),
    alignItems: 'center',
  },
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: moderateScale(24),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: LOGO_SIZE * 0.65,
    height: LOGO_SIZE * 0.65,
  },
  // --- Text Section ---
  textSection: {
    paddingBottom: verticalScale(40),
    alignItems: 'center',
    paddingHorizontal: SPACING,
  },
  welcomeTitle: {
    fontSize: TITLE_SIZE,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: verticalScale(12),
  },
  welcomeSubtitle: {
    fontSize: SUBTITLE_SIZE,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: SUBTITLE_SIZE * 1.5,
    paddingHorizontal: moderateScale(20),
  },
  // --- Features Section ---
  featuresSection: {
    paddingBottom: verticalScale(30),
  },
  featuresContainer: {
    gap: moderateScale(12),
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconWrapper: {
    width: FEATURE_ICON_SIZE,
    height: FEATURE_ICON_SIZE,
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(14),
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: verticalScale(3),
  },
  featureDescription: {
    fontSize: moderateScale(12),
    color: '#64748B',
    lineHeight: moderateScale(16),
  },
  // --- Button Section ---
  buttonSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: verticalScale(30),
    paddingTop: verticalScale(20),
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: moderateScale(50),
    paddingVertical: BUTTON_PADDING_V,
    paddingHorizontal: moderateScale(28),
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    gap: moderateScale(10),
  },
  getStartedText: {
    fontSize: moderateScale(17),
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

