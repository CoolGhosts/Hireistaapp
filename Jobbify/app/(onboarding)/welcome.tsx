import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Dimensions, Animated, Easing, Pressable, Image, Platform, ScrollView as RNScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AICoachIcon,
  SmartMatchesIcon,
  QuickApplyIcon,
  InsightsIcon,
  DiamondIcon,
  StarIcon,
  AutoAwesomeIcon,
  WorkIcon,
} from '@/components/ModernIcons';
import { MotiView } from 'moti';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { DarkTheme } from '@/constants/Theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85;
const CARD_SPACING = 20;

export default function WelcomeOnboarding() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppContext();
  const themeColors = DarkTheme;

  // Modern gradient palette
  const gradientColors = ['#0F0A1E', '#1A0B2E', '#0F0A1E'] as const;
  const primaryAccent = '#6366F1'; // indigo
  const secondaryAccent = '#EC4899'; // pink
  const tertiaryAccent = '#10B981'; // emerald

  // Animations
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Button press animation
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Carousel states and animations
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<RNScrollView>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManualScroll = useRef(false);

  useEffect(() => {
    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    // Shimmer animation
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Sparkle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0, duration: 1800, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 25000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const shimmerX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-screenWidth, screenWidth] });
  const sparkleOpacity = sparkleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] });
  const sparkleScale = sparkleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.2, 0.8] });
  const rotateZ = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const features = [
    {
      icon: 'ai-coach',
      title: 'AI Career Coach',
      description: 'Get personalized guidance and insights to accelerate your career growth with AI-powered recommendations',
      color: primaryAccent,
      gradient: ['#6366F1', '#8B5CF6'],
    },
    {
      icon: 'smart-matches',
      title: 'Smart Job Matching',
      description: 'Discover opportunities that truly align with your skills and aspirations using advanced algorithms',
      color: secondaryAccent,
      gradient: ['#EC4899', '#F97316'],
    },
    {
      icon: 'quick-apply',
      title: 'One-Click Apply',
      description: 'Apply to multiple positions instantly with your optimized profile and tailored resume',
      color: tertiaryAccent,
      gradient: ['#10B981', '#14B8A6'],
    },
    {
      icon: 'insights',
      title: 'Career Analytics',
      description: 'Track your progress and get actionable insights for improvement with detailed analytics',
      color: primaryAccent,
      gradient: ['#6366F1', '#3B82F6'],
    },
  ] as const;

  const renderFeatureIcon = (iconName: string, size: number, color: string) => {
    const nameMap: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
      'ai-coach': 'robot-outline',
      'smart-matches': 'briefcase-search-outline',
      'quick-apply': 'clipboard-check-outline',
      insights: 'chart-line',
    };
    const mapped = nameMap[iconName] ?? 'star-outline';
    return <MaterialCommunityIcons name={mapped} size={size} color={color} />;
  };

  const handleSignIn = (provider: 'google' | 'apple') => {
    router.push('/(auth)/signup');
  };

  const onPressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true, tension: 100, friction: 8 }).start();
  };

  const onPressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }).start();
  };

  // Auto-scroll functionality
  const startAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }
    autoScrollTimer.current = setTimeout(() => {
      if (!isManualScroll.current && carouselRef.current) {
        const nextIndex = (currentFeatureIndex + 1) % features.length;
        const offsetX = nextIndex * (CARD_WIDTH + CARD_SPACING);
        carouselRef.current.scrollTo({ x: offsetX, animated: true });
        setCurrentFeatureIndex(nextIndex);
        startAutoScroll();
      }
    }, 4000);
  };

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollTimer.current) {
        clearTimeout(autoScrollTimer.current);
      }
    };
  }, [currentFeatureIndex]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
        if (index !== currentFeatureIndex) {
          setCurrentFeatureIndex(index);
        }
      }
    }
  );

  const handleScrollBeginDrag = () => {
    isManualScroll.current = true;
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }
  };

  const handleScrollEndDrag = () => {
    isManualScroll.current = false;
    startAutoScroll();
  };

  const onIndicatorPress = (index: number) => {
    isManualScroll.current = true;
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }
    const offsetX = index * (CARD_WIDTH + CARD_SPACING);
    carouselRef.current?.scrollTo({ x: offsetX, animated: true });
    setCurrentFeatureIndex(index);
    setTimeout(() => {
      isManualScroll.current = false;
      startAutoScroll();
    }, 1000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background gradient */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated background elements */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backgroundBlob,
          {
            top: '10%',
            left: '-20%',
            transform: [{ scale: pulseScale }, { translateY: floatY }, { rotate: rotateZ }],
            opacity: 0.1,
          },
        ]}
      >
        <LinearGradient
          colors={[primaryAccent, secondaryAccent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.backgroundBlob,
          {
            bottom: '20%',
            right: '-30%',
            transform: [
              { scale: Animated.multiply(pulseScale, 0.8) },
              { translateY: Animated.multiply(floatY, -1) },
              { rotate: Animated.multiply(rotateAnim, -1).interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }) },
            ],
            opacity: 0.08,
          },
        ]}
      >
        <LinearGradient
          colors={[tertiaryAccent, primaryAccent]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Floating sparkles */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sparkle,
          {
            top: '15%',
            left: '20%',
            opacity: sparkleOpacity,
            transform: [{ scale: sparkleScale }],
          },
        ]}
      >
        <StarIcon size={12} color={secondaryAccent} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.sparkle,
          {
            top: '25%',
            right: '15%',
            opacity: Animated.multiply(sparkleOpacity, 0.7),
            transform: [{ scale: sparkleScale }, { rotate: '45deg' }],
          },
        ]}
      >
        <DiamondIcon size={10} color={tertiaryAccent} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.sparkle,
          {
            bottom: '30%',
            left: '10%',
            opacity: Animated.multiply(sparkleOpacity, 0.8),
            transform: [{ scale: sparkleScale }, { rotate: '-30deg' }],
          },
        ]}
      >
        <AutoAwesomeIcon size={14} color={primaryAccent} />
      </Animated.View>

      <RNScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Section */}
        <MotiView
          from={{ opacity: 0, translateY: 30, scale: 0.9 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 100 }}
          style={styles.brandSection}
        >
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseScale }] }]}>
            <View style={styles.logoWrapper}>
              <Image source={require('@/assets/images/background-logo.png')} style={styles.logo} resizeMode="contain" />
              <Animated.View style={[styles.logoGlow, { opacity: Animated.multiply(sparkleOpacity, 0.6) }]} />
            </View>
          </Animated.View>

          <Text style={[styles.brandName, { color: themeColors.text }]}>Jobbify</Text>

          <View style={styles.brandTagline}>
            <WorkIcon size={18} color={secondaryAccent} />
            <Text style={[styles.taglineText, { color: themeColors.textSecondary }]}>Your intelligent career companion</Text>
          </View>
        </MotiView>

        {/* Hero Section */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 300 }}
          style={styles.heroSection}
        >
          <Text style={[styles.heroTitle, { color: themeColors.text }]}>Find Your Dream Job</Text>
          <Text style={[styles.heroSubtitle, { color: themeColors.textSecondary }]}>Discover opportunities that match your skills and aspirations</Text>
        </MotiView>

        {/* Modern Carousel Features */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 500 }}
          style={styles.carouselContainer}
        >
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Why Choose Jobbify?</Text>
          
          {/* Horizontal Scrolling Cards */}
          <RNScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            snapToAlignment="start"
            contentInset={{ left: 0, right: 0 }}
            contentContainerStyle={styles.carouselContent}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            scrollEventThrottle={16}
          >
            {features.map((feature, index) => {
              const inputRange = [
                (index - 1) * (CARD_WIDTH + CARD_SPACING),
                index * (CARD_WIDTH + CARD_SPACING),
                (index + 1) * (CARD_WIDTH + CARD_SPACING),
              ];

              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.94, 1, 0.94],
                extrapolate: 'clamp',
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.7, 1, 0.7],
                extrapolate: 'clamp',
              });

              const translateY = scrollX.interpolate({
                inputRange,
                outputRange: [12, 0, 12],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.featureCard,
                    {
                      transform: [{ scale }, { translateY }],
                      opacity,
                    },
                  ]}
                >
                  <LinearGradient 
                    colors={[`${feature.color}1A`, 'rgba(255,255,255,0.06)']} 
                    style={styles.featureCardBg} 
                  />

                  <View style={styles.featureIconContainer}>
                    <LinearGradient colors={feature.gradient} style={styles.featureIconGradient}>
                      <View style={styles.featureIconInner}>
                        {renderFeatureIcon(feature.icon, 28, '#FFFFFF')}
                      </View>
                    </LinearGradient>
                  </View>

                  <Text style={[styles.featureTitle, { color: themeColors.text }]} numberOfLines={1}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDescription, { color: themeColors.textSecondary }]} numberOfLines={2}>
                    {feature.description}
                  </Text>

                  <View style={[styles.featureHighlight, { backgroundColor: feature.color }]} />
                </Animated.View>
              );
            })}
          </RNScrollView>

          {/* Pagination Indicators */}
          <View style={styles.indicatorContainer}>
            {features.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => onIndicatorPress(index)}
                style={[
                  styles.indicator,
                  {
                    backgroundColor: index === currentFeatureIndex ? features[index].color : 'rgba(255,255,255,0.3)',
                    width: index === currentFeatureIndex ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </MotiView>

        {/* Sign In Section */}
        <MotiView
          from={{ opacity: 0, translateY: 40, scale: 0.9 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 800 }}
          style={styles.signInSection}
        >
          <Text style={[styles.signInTitle, { color: themeColors.text }]}>Ready to transform your career?</Text>

          <View style={styles.signInButtons}>
            {/* Platform-specific primary button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                style={styles.signInButton}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onPress={() => handleSignIn(Platform.OS === 'ios' ? 'apple' : 'google')}
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
              >
                <LinearGradient
                  colors={Platform.OS === 'ios' ? ['#000000', '#1c1c1e'] : ['#4285F4', '#34A853']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.signInGradient}
                />
                <View style={styles.signInContent}>
                  {Platform.OS === 'ios' ? (
                    <FontAwesome name="apple" size={24} color="#FFFFFF" />
                  ) : (
                    <FontAwesome name="google" size={24} color="#FFFFFF" />
                  )}
                  <Text style={styles.signInText}>Continue with {Platform.OS === 'ios' ? 'Apple' : 'Google'}</Text>
                </View>
              </Pressable>
            </Animated.View>

            {/* General Sign In Option */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                style={[styles.signInButton, styles.secondaryButton]}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onPress={() => router.push('/(auth)/signup')}
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.signInGradient}
                />
                <View style={styles.signInContent}>
                  <MaterialIcons name="email" size={24} color="#FFFFFF" />
                  <Text style={styles.signInText}>Sign in with Email</Text>
                </View>
              </Pressable>
            </Animated.View>
          </View>

          <Text style={[styles.signInSubtext, { color: themeColors.textSecondary }]}>Free • Secure • No spam • Join 10,000+ professionals</Text>
        </MotiView>
      </RNScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  scroll: {
    flex: 1,
  },
  backgroundBlob: {
    position: 'absolute',
    width: screenWidth * 1.5,
    height: screenWidth * 1.5,
    borderRadius: screenWidth * 0.75,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  // Brand Section
  brandSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 72,
    height: 72,
  },
  logoGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    top: -9,
    left: -9,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
  },
  brandTagline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taglineText: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1.5,
    lineHeight: 48,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
    maxWidth: 320,
  },

  // Modern Carousel Section
  carouselContainer: {
    width: '100%',
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 32,
    opacity: 0.95,
  },
  carouselContent: {
    paddingHorizontal: (screenWidth - CARD_WIDTH) / 2,
    paddingVertical: 6,
  },
  featureCard: {
    width: CARD_WIDTH,
    height: 220,
    marginHorizontal: CARD_SPACING / 2,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  featureIconContainer: {
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  featureIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 16,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconInner: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  featureDescription: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.9,
    paddingHorizontal: 6,
  },
  featureHighlight: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },

  // Sign In Section
  signInSection: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 'auto',
    paddingBottom: 20,
  },
  signInTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  signInButtons: {
    width: '100%',
    gap: 16,
    marginBottom: 20,
  },
  signInButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  signInGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  signInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    gap: 12,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  signInSubtext: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 18,
  },
});
