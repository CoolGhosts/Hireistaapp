import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type ModernActionCardProps = {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  onPress: () => void;
  themeColors: any;
  primary?: boolean;
  gradientStart?: string;
  gradientEnd?: string;
};

export default function ModernActionCard({ 
  title, 
  description, 
  icon, 
  onPress, 
  themeColors,
  primary = false,
  gradientStart,
  gradientEnd
}: ModernActionCardProps) {
  // Default gradient colors if not provided
  const startColor = gradientStart || (primary ? themeColors.tint : themeColors.cardBackground);
  const endColor = gradientEnd || (primary ? themeColors.tintDark || themeColors.tint : themeColors.card);
  
  const textColor = primary ? themeColors.background : themeColors.text;
  const descriptionColor = primary ? `${themeColors.background}D9` : themeColors.textSecondary; 
  const iconColor = primary ? themeColors.background : themeColors.tint;
  const iconBackgroundColor = primary ? `${themeColors.background}33` : `${themeColors.tint}33`; 
  
  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.9}
      onPress={onPress}
    >
      <LinearGradient
        colors={[startColor, endColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.cardGradient,
          { borderColor: themeColors.border }
        ]}
      >
        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: textColor }]}>
              {title}
            </Text>
            <Text style={[styles.description, { color: descriptionColor }]}>
              {description}
            </Text>
          </View>
          
          <View style={[
            styles.iconContainer, 
            { backgroundColor: iconBackgroundColor }
          ]}>
            <FontAwesome 
              name={icon} 
              size={22} 
              color={iconColor} 
            />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  contentContainer: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
