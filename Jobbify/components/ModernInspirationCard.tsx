import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

type ModernInspirationCardProps = {
  quote: string;
  author: string;
  themeColors: any;
};

export default function ModernInspirationCard({ 
  quote, 
  author, 
  themeColors 
}: ModernInspirationCardProps) {
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: themeColors.cardAlt || themeColors.card,
        borderColor: themeColors.border,
      }
    ]}>
      <View style={styles.quoteIconContainer}>
        <FontAwesome 
          name="quote-left" 
          size={22} 
          color={themeColors.tint} 
          style={styles.quoteIcon}
        />
      </View>
      
      <Text style={[styles.quoteText, { color: themeColors.text }]}>
        {quote}
      </Text>
      
      <Text style={[styles.authorText, { color: themeColors.textSecondary }]}>
        {author}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 24,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  quoteIconContainer: {
    marginBottom: 12,
  },
  quoteIcon: {
    opacity: 0.7,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  authorText: {
    fontSize: 14,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
});
