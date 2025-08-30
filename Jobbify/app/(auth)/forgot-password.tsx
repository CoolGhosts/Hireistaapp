import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  Alert,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startAnimations();
  }, []);

  // Start entrance animations
  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Form validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleResetPassword = async () => {
    // Clear previous errors
    setError('');
    setEmailError('');

    // Validate email
    if (!validateEmail(email)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'jobbify://reset-password',
      });

      if (error) throw error;

      setSuccess(true);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes('rate limit')) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else {
          setError(e.message);
        }
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Logo and tagline with animation */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoAnim,
              transform: [
                {
                  scale: logoAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brand, { color: themeColors.tint }]}>JOBBIFY</Text>
          <Text style={[styles.tagline, { color: themeColors.textSecondary }]}>CONNECTING TALENTS TO PROFESSIONS</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: themeColors.card,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {success ? (
            <View style={styles.successContainer}>
              <FontAwesome name="check-circle" size={60} color={themeColors.success} style={styles.successIcon} />
              <Text style={[styles.successTitle, { color: themeColors.text }]}>Reset Email Sent</Text>
              <Text style={[styles.successMessage, { color: themeColors.textSecondary }]}>
                We've sent password reset instructions to your email. Please check your inbox and follow the link to reset your password.
              </Text>
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: themeColors.tint }]}
                onPress={goToLogin}
              >
                <Text style={[styles.backButtonText, { color: themeColors.background }]}>
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>Forgot Password</Text>
              <Text style={[styles.cardSubtitle, { color: themeColors.textSecondary }]}>
                Enter your email address and we'll send you instructions to reset your password.
              </Text>

              {/* Email input */}
              <View style={[
                styles.inputContainer,
                {
                  borderColor: emailError ? themeColors.error : themeColors.border,
                  backgroundColor: themeColors.backgroundSecondary,
                }
              ]}>
                <View style={styles.iconContainer}>
                  <MaterialIcons
                    name="email"
                    size={24}
                    color={emailError ? themeColors.error : themeColors.tint}
                  />
                </View>
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="Email Address"
                  placeholderTextColor={themeColors.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError('');
                  }}
                  autoComplete="email"
                  textContentType="emailAddress"
                />
              </View>
              {emailError ? (
                <Text style={[styles.fieldErrorText, { color: themeColors.error }]}>
                  {emailError}
                </Text>
              ) : null}

              {error ? (
                <Text style={[styles.error, { color: themeColors.error }]}>{error}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.resetButton,
                  { backgroundColor: themeColors.tint },
                  loading && styles.buttonDisabled
                ]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text style={[styles.resetButtonText, { color: themeColors.background }]}>
                  {loading ? 'Sending...' : 'Reset Password'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.loginLink} onPress={goToLogin}>
                <Text style={[styles.loginLinkText, { color: themeColors.textSecondary }]}>
                  Remember your password? <Text style={{ color: themeColors.tint, fontWeight: 'bold' }}>Log In</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16
  },
  brand: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    height: 56,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  fieldErrorText: {
    fontSize: 14,
    marginBottom: 16,
    marginLeft: 4,
  },
  resetButton: {
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  error: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  successContainer: {
    alignItems: 'center',
    padding: 16,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  backButton: {
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});