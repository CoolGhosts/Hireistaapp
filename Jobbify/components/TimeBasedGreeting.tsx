import React from 'react';
import { Text, StyleSheet } from 'react-native';

/**
 * TimeBasedGreeting - Shows different greetings based on time of day
 * 
 * @param name - Optional user name to personalize greeting
 * @param style - Optional style object to override default styles
 */
export default function TimeBasedGreeting({ 
  name, 
  style 
}: { 
  name?: string;
  style?: any;
}) {
  // Get current hour to determine greeting
  const currentHour = new Date().getHours();
  
  let greeting = 'Good evening';
  if (currentHour >= 5 && currentHour < 12) {
    greeting = 'Good morning';
  } else if (currentHour >= 12 && currentHour < 18) {
    greeting = 'Good afternoon';
  }
  
  return (
    <Text style={[styles.greeting, style]}>
      {greeting}{name ? `, ${name}` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  }
});
