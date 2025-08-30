import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  KeyboardAvoidingView
} from 'react-native';
import { supabase, checkDatabaseAccess, ensureTablesExist } from '../../lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import { MaterialIcons } from '@expo/vector-icons';
// Import the logo as a local asset without using path mapping
const logoImage = require('../../assets/images/logo.png');
import { useAuthCheck } from '@/utils/authCheck';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SignUpScreen() {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dbChecked, setDbChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  
  // Check database access on component mount
  useEffect(() => {
    const verifyDatabaseAccess = async () => {
      try {
        // First ensure tables exist
        await ensureTablesExist();
        
        // Then check database access
        const result = await checkDatabaseAccess();
        setDbChecked(result.success);
        if (!result.success) {
          console.error('Database pre-check failed:', result.error);
          setError('Unable to connect to the database. Please try again later.');
        }
      } catch (err) {
        console.error('Error during database access check:', err);
      }
    };
    
    verifyDatabaseAccess();
    startAnimations();
  }, []);

  // Redirect to main app if already logged in
  useAuthCheck({ redirectIfAuthed: true });

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
  const validateName = (name: string) => {
    if (!name.trim()) {
      setNameError('Name is required');
      return false;
    }
    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    setNameError('');
    return true;
  };

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

  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  // Get password strength
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/(?=.*[a-z])/.test(password)) strength++;
    if (/(?=.*[A-Z])/.test(password)) strength++;
    if (/(?=.*\d)/.test(password)) strength++;
    if (/(?=.*[@$!%*?&])/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return 'Weak';
      case 2:
      case 3:
        return 'Medium';
      case 4:
      case 5:
        return 'Strong';
      default:
        return 'Weak';
    }
  };

  const getPasswordStrengthColor = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return themeColors.error;
      case 2:
      case 3:
        return themeColors.warning;
      case 4:
      case 5:
        return themeColors.success;
      default:
        return themeColors.error;
    }
  };

  // Default all sign ups to job seekers to simplify the flow
  const userType = 'job_seeker';

  const validateForm = () => {
    // Clear previous errors
    setError('');
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Validate all fields
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword, password);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return false;
    }

    if (!dbChecked) {
      setError('Database connection issue. Please go to the database debug page to fix.');

      // Provide a visual cue to go to debug page after a short delay
      setTimeout(() => {
        router.push('/debug-db');
      }, 1500);

      return false;
    }

    return true;
  };

  // Note: Profile creation is now handled automatically by the database trigger
  // when a user is created in auth.users, so we don't need manual profile creation

  const handleSignUp = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Starting signup process for:', email);
      
      // 1. Create the user in Supabase Auth
      // For mobile app, we don't need emailRedirectTo as it causes issues
    // The window.location.origin would be invalid in the mobile context
    const { data: authData, error: authError } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          name,
          user_type: userType
        }
        // No emailRedirectTo for mobile app
      }
    });
      
      if (authError) {
        console.error('Supabase auth error:', authError.message);
        throw authError;
      }
      
      // Check if user was created successfully
      if (!authData?.user) {
        console.error('No user returned from signup');
        throw new Error('Failed to create account. Please try again later.');
      }
      
      console.log('User created successfully with ID:', authData.user.id);

      // The auth trigger will automatically create the profile and job_seeker_profile
      // Wait for the trigger to complete and auth context to update
      console.log('Waiting for profile creation and auth context update...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to verify profile creation with retry logic for RLS timing issues
      let profile = null;
      let profileError = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Profile verification attempt ${attempt}...`);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (data && !error) {
          profile = data;
          profileError = null;
          break;
        } else {
          profileError = error;
          console.log(`Attempt ${attempt} failed:`, error?.message);

          if (attempt < 3) {
            // Wait longer between attempts
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      if (profileError || !profile) {
        console.error('Profile verification failed after all attempts:', profileError);

        // Check if it's an RLS issue (user can't see their own profile yet)
        if (profileError?.code === 'PGRST116' || profileError?.message?.includes('0 rows')) {
          console.log('This appears to be an RLS timing issue. Profile likely exists but user context not ready.');
          console.log('Continuing with signup - profile should be accessible after login.');

          // Log this for debugging but don't fail the signup
          console.log('Note: This is a known timing issue with RLS policies after signup.');
          console.log('The profile was created by the database trigger, but RLS prevents immediate access.');
        } else {
          // For other types of errors, we should still fail
          console.error('Unexpected profile verification error:', profileError);
          throw new Error('Account created but profile setup failed. Please try logging in.');
        }
      } else {
        console.log('Profile verified successfully:', profile);
      }

      // Try to verify job_seeker_profile (less critical)
      try {
        const { data: jobSeekerProfile, error: jobSeekerError } = await supabase
          .from('job_seeker_profiles')
          .select('*')
          .eq('profile_id', authData.user.id)
          .single();

        if (jobSeekerProfile && !jobSeekerError) {
          console.log('Job seeker profile verified successfully:', jobSeekerProfile);
        } else {
          console.log('Job seeker profile not found yet, will be created on first login if needed');
        }
      } catch (jsError) {
        console.log('Job seeker profile check failed, continuing anyway:', jsError);
      }
      
      // 4. Signup completed successfully
      console.log('✅ Signup process completed successfully!');
      console.log('User can now log in with their credentials.');

      setLoading(false);
      router.replace({
        pathname: '/signup-success',
        params: { email: email }
      });
    } catch (e) {
      if (e instanceof Error) {
        console.error('Signup error details:', e);

        // Check for specific error cases from Supabase
        if (e.message.includes('User already registered')) {
          setError('This email address is already in use. Please try logging in instead.');
        } else if (e.message.includes('email')) {
          setError('This email address is already in use.');
        } else if (e.message.includes('Password should be at least')) {
          setError('Password is too weak. Please use at least 6 characters.');
        } else if (e.message.includes('password')) {
          setError('Password is too weak. Please use at least 6 characters.');
        } else if (e.message.includes('rate limit') || e.message.includes('too many')) {
          setError('Too many attempts. Please try again later.');
        } else if (e.message.includes('foreign key') || e.message.includes('authentication system')) {
          setError('There was a temporary issue creating your account. Please try again in a moment.');
        } else if (e.message.includes('Database') || e.message.includes('column')) {
          setError('There was an issue with your account setup. Please contact support.');
        } else if (e.message.includes('Failed to create user profile')) {
          setError('Account created but profile setup failed. Please contact support.');
        } else {
          setError(e.message);
        }
        console.error('Signup error:', e.message);
      } else {
        setError('An unknown error occurred');
        console.error('Unknown signup error:', e);
      }
      setLoading(false);
    }
  };

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

          {/* Sign up form with animation */}
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
            <Text style={[styles.heading, { color: themeColors.text }]}>Create Your Account</Text>
          
            {/* Database connection status */}
            {!dbChecked && (
              <View style={[
                styles.statusContainer,
                { backgroundColor: themeColors.backgroundSecondary }
              ]}>
                <ActivityIndicator size="small" color={themeColors.tint} style={styles.statusIcon} />
                <Text style={[styles.statusText, { color: themeColors.tint }]}>
                  Connecting to service...
                </Text>
              </View>
            )}

            {/* Name input */}
            <View style={[
              styles.inputContainer,
              {
                borderColor: nameError ? themeColors.error : themeColors.border,
                backgroundColor: themeColors.backgroundSecondary,
              }
            ]}>
              <View style={styles.iconContainer}>
                <MaterialIcons
                  name="person"
                  size={24}
                  color={nameError ? themeColors.error : themeColors.tint}
                />
              </View>
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                placeholder="Full Name"
                placeholderTextColor={themeColors.textSecondary}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError('');
                }}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
              />
            </View>
            {nameError ? (
              <Text style={[styles.fieldErrorText, { color: themeColors.error }]}>
                {nameError}
              </Text>
            ) : null}

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
                autoComplete="password-new"
                textContentType="newPassword"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
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

            {/* Password strength indicator */}
            {password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <Text style={[styles.passwordStrengthLabel, { color: themeColors.textSecondary }]}>
                  Password strength:
                </Text>
                <Text style={[
                  styles.passwordStrengthText,
                  { color: getPasswordStrengthColor(getPasswordStrength(password)) }
                ]}>
                  {getPasswordStrengthText(getPasswordStrength(password))}
                </Text>
              </View>
            )}

            {/* Confirm Password input */}
            <View style={[
              styles.inputContainer,
              {
                borderColor: confirmPasswordError ? themeColors.error : themeColors.border,
                backgroundColor: themeColors.backgroundSecondary,
              }
            ]}>
              <View style={styles.iconContainer}>
                <MaterialIcons
                  name="lock-outline"
                  size={24}
                  color={confirmPasswordError ? themeColors.error : themeColors.tint}
                />
              </View>
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={themeColors.textSecondary}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError('');
                }}
                secureTextEntry={!showConfirmPassword}
                autoComplete="password-new"
                textContentType="newPassword"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <MaterialIcons
                  name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                  size={24}
                  color={themeColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? (
              <Text style={[styles.fieldErrorText, { color: themeColors.error }]}>
                {confirmPasswordError}
              </Text>
            ) : null}

            {/* Error message */}
            {error ? (
              <View>
                <Text style={[styles.errorText, { color: themeColors.error }]}>{error}</Text>
                {error.includes('database') && (
                  <TouchableOpacity
                    onPress={() => router.push('/debug-db')}
                    style={styles.debugLink}
                  >
                    <Text style={[styles.debugLinkText, { color: themeColors.tint }]}>
                      Open Database Diagnostics
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* Sign up button */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: themeColors.tint },
                (loading || !dbChecked) && styles.buttonDisabled
              ]}
              onPress={handleSignUp}
              disabled={loading || !dbChecked}
            >
              {loading ? (
                <ActivityIndicator color={themeColors.background} />
              ) : !dbChecked ? (
                <Text style={[styles.buttonText, { color: themeColors.background }]}>
                  Connecting...
                </Text>
              ) : (
                <Text style={[styles.buttonText, { color: themeColors.background }]}>
                  Sign Up
                </Text>
              )}
            </TouchableOpacity>

            {/* Note about social logins */}
            <View style={styles.socialLoginNote}>
              <MaterialIcons
                name="info-outline"
                size={18}
                color={themeColors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.noteText, { color: themeColors.textSecondary }]}>
                Google and Apple sign-up options coming soon
              </Text>
            </View>
          </Animated.View>

          {/* Already have an account link */}
          <Animated.View
            style={[
              styles.footerContainer,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={[styles.linkText, { color: themeColors.tint }]}>Log In</Text>
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
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginLeft: 4,
  },
  passwordStrengthLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  passwordStrengthText: {
    fontSize: 14,
    fontWeight: '700',
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  debugLink: {
    marginTop: 8,
    alignItems: 'center',
  },
  debugLinkText: {
    textDecorationLine: 'underline',
    fontSize: 14,
    fontWeight: '600',
  },
});