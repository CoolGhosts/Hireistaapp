import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

// Import the logo as a local asset
const logoImage = require('../../assets/images/logo.png');

export default function SignupSuccessScreen() {
  const params = useLocalSearchParams<{ email: string }>();
  const email = params.email || 'your email';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <Stack.Screen options={{ 
        headerShown: false,
        title: "Account Created",
        animation: "fade"
      }} />
      
      <View style={styles.contentContainer}>
        <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        
        <View style={styles.iconContainer}>
          <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
        </View>
        
        <Text style={styles.title}>Account Created!</Text>
        
        <View style={styles.card}>
          <Text style={styles.message}>
            We've sent a verification email to <Text style={styles.email}>{email}</Text>
          </Text>
          
          <Text style={styles.instructions}>
            Please check your inbox and click the verification link to complete your registration.
          </Text>
        </View>
        
        <View style={styles.infoContainer}>
          <MaterialIcons name="info-outline" size={20} color="#666" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            If you don't see the email, check your spam folder.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.linkButton} 
          onPress={() => router.push('/')}
        >
          <Text style={styles.linkText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    width: '100%',
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
    lineHeight: 26,
  },
  email: {
    fontWeight: 'bold',
    color: '#6200EE',
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flexShrink: 1,
  },
  button: {
    backgroundColor: '#6200EE',
    borderRadius: 8,
    width: '100%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: 8,
  },
  linkText: {
    color: '#6200EE',
    fontSize: 16,
  },
}); 