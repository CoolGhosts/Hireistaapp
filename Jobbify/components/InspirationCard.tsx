import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const INSPIRATIONS = [
  {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    type: "quote"
  },
  {
    quote: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
    author: "Winston Churchill",
    type: "quote"
  },
  {
    tip: "Update your LinkedIn profile before applying to increase visibility to recruiters.",
    type: "tip"
  },
  {
    tip: "Follow up within a week after submitting your application to show interest.",
    type: "tip"
  },
  {
    quote: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
    author: "Steve Jobs",
    type: "quote"
  },
];

/**
 * InspirationCard - Displays rotating career advice, tips and motivational quotes
 * Allows users to cycle through different pieces of inspiration
 */
export default function InspirationCard({ themeColors }: { themeColors: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem = INSPIRATIONS[currentIndex];
  
  const nextInspiration = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === INSPIRATIONS.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {currentItem.type === 'quote' ? (
            <FontAwesome name="quote-left" size={16} color={themeColors.tint} />
          ) : (
            <FontAwesome name="lightbulb-o" size={16} color={themeColors.tint} />
          )}
        </View>
        <Text style={[styles.headerText, { color: themeColors.text }]}>
          {currentItem.type === 'quote' ? 'Inspiration' : 'Career Tip'}
        </Text>
      </View>
      
      <View style={styles.content}>
        {currentItem.type === 'quote' ? (
          <>
            <Text style={[styles.quote, { color: themeColors.text }]}>
              "{currentItem.quote}"
            </Text>
            <Text style={[styles.author, { color: themeColors.textSecondary }]}>
              — {currentItem.author}
            </Text>
          </>
        ) : (
          <Text style={[styles.tip, { color: themeColors.text }]}>
            {currentItem.tip}
          </Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={[styles.nextButton, { backgroundColor: themeColors.background }]} 
        onPress={nextInspiration}
      >
        <FontAwesome name="refresh" size={14} color={themeColors.tint} />
        <Text style={[styles.nextButtonText, { color: themeColors.tint }]}>
          Next
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconContainer: {
    marginRight: 8,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  quote: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  author: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'right',
  },
  tip: {
    fontSize: 15,
    lineHeight: 21,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  nextButtonText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
});
