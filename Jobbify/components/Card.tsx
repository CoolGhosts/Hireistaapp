import React from 'react';
import { StyleSheet, View, ViewStyle, TouchableOpacity } from 'react-native';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: number;
  borderRadius?: number;
  padding?: number;
}

export default function Card({
  children,
  style,
  onPress,
  elevation = 2,
  borderRadius = 12,
  padding = 16,
}: CardProps) {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  
  const cardStyle = {
    backgroundColor: themeColors.card,
    borderColor: themeColors.border,
    borderRadius,
    padding,
    ...getShadow(elevation, theme),
  };
  
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={[styles.card, cardStyle, style]}>
      {children}
    </View>
  );
}

// Helper function to get shadow styles based on elevation and theme
function getShadow(elevation: number, theme: 'light' | 'dark') {
  if (theme === 'dark') {
    // Subtle shadow for dark theme
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.3,
      shadowRadius: elevation * 1.5,
      elevation: elevation,
    };
  }
  
  // More visible shadow for light theme
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: elevation },
    shadowOpacity: 0.1,
    shadowRadius: elevation,
    elevation: elevation,
  };
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    marginVertical: 8,
    overflow: 'hidden',
  },
});
