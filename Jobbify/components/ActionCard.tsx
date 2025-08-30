import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

/**
 * ActionCard - A visually distinct card for primary/recommended actions
 * 
 * Designed to highlight important next steps for users with clear visual hierarchy,
 * making the most critical actions stand out in the UI.
 */
export default function ActionCard({
  title,
  description,
  icon,
  onPress,
  themeColors,
  primary = false,
}: {
  title: string;
  description: string;
  icon: any; // Changed from string to any to accommodate FontAwesome icon names
  onPress: () => void;
  themeColors: any;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: primary ? themeColors.tint + '15' : themeColors.card,
          borderColor: primary ? themeColors.tint : 'transparent',
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: primary ? themeColors.tint + '25' : themeColors.background + '80',
          },
        ]}
      >
        <FontAwesome
          name={icon}
          size={20}
          color={primary ? themeColors.tint : themeColors.text}
        />
      </View>
      <View style={styles.contentContainer}>
        <Text
          style={[
            styles.title,
            {
              color: primary ? themeColors.tint : themeColors.text,
              fontWeight: primary ? '700' : '600',
            },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.description,
            { color: themeColors.textSecondary },
          ]}
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>
      <FontAwesome
        name="chevron-right"
        size={14}
        color={themeColors.textSecondary}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    marginLeft: 8,
  },
});
