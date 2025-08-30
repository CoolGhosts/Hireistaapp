import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
  Animated,
  Easing,
  Dimensions,
  KeyboardAvoidingView
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
// Import the logo as a local asset without using path mapping
const logoImage = require('../../assets/images/logo.png');
import { useAuthCheck } from '@/utils/authCheck';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest, DiscoveryDocument } from 'expo-auth-session';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize WebBrowser for Expo Auth Session 
WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  // Theme context
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  // State management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const router = useRouter();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;

  // Redirect to main app if already logged in
  useAuthCheck({ redirectIfAuthed: true });

  // Load remember me preference on mount
  useEffect(() => {
    loadRememberMePreference();
    startAnimations();
  }, []);

  // Load remember me preference from storage
  const loadRememberMePreference = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('rememberedEmail');
      const savedRememberMe = await AsyncStorage.getItem('rememberMe');

      if (savedEmail && savedRememberMe === 'true') {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      console.log('Error loading remember me preference:', error);
    }
  };

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

  // Form validation functions
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

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Handle remember me functionality
  const handleRememberMe = async (email: string, remember: boolean) => {
    try {
      if (remember) {
        await AsyncStorage.setItem('rememberedEmail', email);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
        await AsyncStorage.removeItem('rememberMe');
      }
    } catch (error) {
      console.log('Error saving remember me preference:', error);
    }
  };

  /**
   * Handle standard email/password sign in
   */
  const handleSignIn = async () => {
    // Clear previous errors
    setError('');
    setEmailError('');
    setPasswordError('');

    // Validate form
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting sign in for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      console.log('Sign in successful for user:', data.user?.email);

      // Ensure user profile exists in database
      if (data.user) {
        try {
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          // If profile doesn't exist, create it
          if (profileError && profileError.code === 'PGRST116') {
            console.log('Creating profile for user:', data.user.email);

            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
                email: data.user.email || '',
                user_type: 'job_seeker'
              });

            if (createError) {
              console.error('Error creating profile:', createError);
            } else {
              console.log('Profile created successfully');
            }
          } else if (profileError) {
            console.error('Error checking profile:', profileError);
          } else {
            console.log('Profile already exists:', existingProfile);
          }
        } catch (profileError) {
          console.error('Error handling profile creation:', profileError);
        }
      }

      // Handle remember me
      await handleRememberMe(email, rememberMe);

      // Navigation will be handled by auth state change listener
    } catch (error: any) {
      console.error('Sign in error:', error);

      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link.');
      } else if (error.message.includes('Too many requests')) {
        setError('Too many login attempts. Please wait a moment and try again.');
      } else {
        setError(error.message || 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle Google Sign-In using our simplified approach
   */
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Initiating Google OAuth sign-in...');
      
      // Import the signInWithGoogle function directly
      const { signInWithGoogle } = await import('../../utils/googleAuth');
      
      // Use our simple authentication function
      await signInWithGoogle();
      
      // Note: the actual auth state change will be handled by the auth listener
      // We don't need to do any additional navigation here
      
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      setError(`Sign-in failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Check for existing session on mount - let the main layout handle navigation
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        console.log('Existing session found, letting main layout handle navigation');
        // Don't redirect here - let the main layout handle it based on onboarding status
      }
    };

    checkExistingSession();
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* App logo and title with animation */}
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
            <Image
              source={logoImage}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.logoText, { color: themeColors.tint }]}>Jobbify</Text>
            <Text style={[styles.tagline, { color: themeColors.textSecondary }]}>Find your next opportunity</Text>
          </Animated.View>

          {/* Login form with animation */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                backgroundColor: themeColors.card,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Text style={[styles.heading, { color: themeColors.text }]}>Welcome Back</Text>

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
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
            {emailError ? (
              <Text style={[styles.fieldErrorText, { color: themeColors.error }]}>
                {emailError}
              </Text>
            ) : null}

            {/* Password input */}
            <View style={[
              styles.inputContainer,
              {
                borderColor: passwordError ? themeColors.error : themeColors.border,
                backgroundColor: themeColors.backgroundSecondary,
              }
            ]}>
              <View style={styles.iconContainer}>
                <MaterialIcons
                  name="lock"
                  size={24}
                  color={passwordError ? themeColors.error : themeColors.tint}
                />
              </View>
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                placeholder="Password"
                placeholderTextColor={themeColors.textSecondary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                testID="passwordToggle"
              >
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={24}
                  color={themeColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={[styles.fieldErrorText, { color: themeColors.error }]}>
                {passwordError}
              </Text>
            ) : null}

            {/* Remember me and forgot password row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[
                  styles.checkbox,
                  {
                    borderColor: themeColors.border,
                    backgroundColor: rememberMe ? themeColors.tint : 'transparent',
                  }
                ]}>
                  {rememberMe && (
                    <MaterialIcons name="check" size={16} color={themeColors.background} />
                  )}
                </View>
                <Text style={[styles.rememberMeText, { color: themeColors.textSecondary }]}>
                  Remember me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={[styles.forgotPasswordText, { color: themeColors.tint }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error message */}
            {error ? (
              <Text style={[styles.errorText, { color: themeColors.error }]}>{error}</Text>
            ) : null}

            {/* Login button */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: themeColors.tint },
                loading && styles.buttonDisabled
              ]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={themeColors.background} />
              ) : (
                <Text style={[styles.buttonText, { color: themeColors.background }]}>
                  Log In
                </Text>
              )}
            </TouchableOpacity>
          
            {/* Social login options */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
              <Text style={[styles.dividerText, { color: themeColors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[
                styles.socialButton,
                {
                  backgroundColor: themeColors.card,
                  borderColor: themeColors.border,
                },
                loading && styles.buttonDisabled
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <View style={styles.socialButtonContent}>
                <FontAwesome name="google" size={24} color="#EA4335" style={styles.socialIcon} />
                <Text style={[styles.socialButtonText, { color: themeColors.text }]}>
                  Continue with Google
                </Text>
              </View>
            </TouchableOpacity>

            {/* Future Apple Sign-In Note */}
            <View style={styles.socialLoginNote}>
              <MaterialIcons
                name="info-outline"
                size={18}
                color={themeColors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.noteText, { color: themeColors.textSecondary }]}>
                Apple sign-in coming soon
              </Text>
            </View>
          </Animated.View>

          {/* Don't have an account link */}
          <Animated.View
            style={[
              styles.footerContainer,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={[styles.linkText, { color: themeColors.tint }]}>Sign Up</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
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
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'center',
    minHeight: SCREEN_HEIGHT - 100,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  formContainer: {
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
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
  passwordToggle: {
    padding: 4,
  },
  fieldErrorText: {
    fontSize: 14,
    marginBottom: 16,
    marginLeft: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberMeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordContainer: {
    padding: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    marginVertical: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  socialButton: {
    borderRadius: 16,
    height: 56,
    borderWidth: 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  socialIcon: {
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  linkText: {
    fontSize: 16,
    fontWeight: '700',
  },
  socialLoginNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
