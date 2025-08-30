import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AppProvider } from '../context/AppContext';
import LoginScreen from '../app/(auth)/login';
import SignUpScreen from '../app/(auth)/signup';
import ForgotPasswordScreen from '../app/(auth)/forgot-password';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
  checkDatabaseAccess: jest.fn(() => Promise.resolve({ success: true })),
  ensureTablesExist: jest.fn(() => Promise.resolve()),
}));

jest.mock('../utils/authCheck', () => ({
  useAuthCheck: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock animations
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = () => ({
    start: jest.fn(),
  });
  RN.Animated.parallel = () => ({
    start: jest.fn(),
  });
  return RN;
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('Authentication Screens', () => {
  describe('LoginScreen', () => {
    it('renders correctly', () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      expect(getByText('Jobbify')).toBeTruthy();
      expect(getByText('Welcome Back')).toBeTruthy();
      expect(getByPlaceholderText('Email Address')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
    });

    it('validates email input', async () => {
      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = getByPlaceholderText('Email Address');
      const loginButton = getByText('Log In');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Please enter a valid email address')).toBeTruthy();
      });
    });

    it('validates password input', async () => {
      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = getByPlaceholderText('Email Address');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Log In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Password must be at least 6 characters')).toBeTruthy();
      });
    });

    it('toggles password visibility', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const passwordInput = getByPlaceholderText('Password');
      const toggleButton = getByTestId('passwordToggle');

      expect(passwordInput.props.secureTextEntry).toBe(true);

      fireEvent.press(toggleButton);
      expect(getByPlaceholderText('Password').props.secureTextEntry).toBe(false);

      fireEvent.press(toggleButton);
      expect(getByPlaceholderText('Password').props.secureTextEntry).toBe(true);
    });
  });

  describe('SignUpScreen', () => {
    it('renders correctly', () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <SignUpScreen />
        </TestWrapper>
      );

      expect(getByText('Jobbify')).toBeTruthy();
      expect(getByText('Create Your Account')).toBeTruthy();
      expect(getByPlaceholderText('Full Name')).toBeTruthy();
      expect(getByPlaceholderText('Email Address')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
      expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
    });

    it('validates all required fields', async () => {
      const { getByText } = render(
        <TestWrapper>
          <SignUpScreen />
        </TestWrapper>
      );

      await waitFor(() => getByText('Sign Up'));
      const signUpButton = getByText('Sign Up');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(getByText('Name is required')).toBeTruthy();
        expect(getByText('Email is required')).toBeTruthy();
        expect(getByText('Password is required')).toBeTruthy();
        expect(getByText('Please confirm your password')).toBeTruthy();
      });
    });

    it('validates password confirmation', async () => {
      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <SignUpScreen />
        </TestWrapper>
      );

      await waitFor(() => getByText('Sign Up'));
      const nameInput = getByPlaceholderText('Full Name');
      const emailInput = getByPlaceholderText('Email Address');
      const passwordInput = getByPlaceholderText('Password');
      const confirmPasswordInput = getByPlaceholderText('Confirm Password');
      const signUpButton = getByText('Sign Up');

      fireEvent.changeText(nameInput, 'John Doe');
      fireEvent.changeText(emailInput, 'john@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'different123');
      fireEvent.press(signUpButton);

      await waitFor(() => {
        expect(getByText('Passwords do not match')).toBeTruthy();
      });
    });
  });

  describe('ForgotPasswordScreen', () => {
    it('renders correctly', () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ForgotPasswordScreen />
        </TestWrapper>
      );

      expect(getByText('JOBBIFY')).toBeTruthy();
      expect(getByText('Forgot Password')).toBeTruthy();
      expect(getByPlaceholderText('Email Address')).toBeTruthy();
      expect(getByText('Reset Password')).toBeTruthy();
    });

    it('validates email before sending reset', async () => {
      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <ForgotPasswordScreen />
        </TestWrapper>
      );

      const emailInput = getByPlaceholderText('Email Address');
      const resetButton = getByText('Reset Password');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(resetButton);

      await waitFor(() => {
        expect(getByText('Please enter a valid email address')).toBeTruthy();
      });
    });
  });
});

describe('Authentication Flow Integration', () => {
  it('should navigate between auth screens correctly', () => {
    // This would test navigation between login, signup, and forgot password screens
    // In a real implementation, you'd mock the router and test navigation calls
  });

  it('should handle authentication state changes', () => {
    // This would test the auth state listener and navigation after successful login
  });

  it('should persist remember me preference', () => {
    // This would test AsyncStorage interactions for remember me functionality
  });
});
