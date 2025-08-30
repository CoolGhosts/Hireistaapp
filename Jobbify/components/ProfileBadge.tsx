import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

/**
 * ProfileBadge - A profile avatar badge with completion indicator
 * 
 * This component shows the user's avatar with an optional completion indicator,
 * following modern UI principles of providing quick feedback about account status.
 */
export default function ProfileBadge({
  uri,
  size = 44,
  completionPercent = 0,
  showCompletionIndicator = true,
  themeColors,
  onPress,
}: {
  uri: string;
  size?: number;
  completionPercent?: number;
  showCompletionIndicator?: boolean;
  themeColors: any;
  onPress?: () => void;
}) {
  // Status color based on completion
  let statusColor = '#F44336'; // Red - needs attention
  if (completionPercent >= 80) {
    statusColor = '#4CAF50'; // Green - good
  } else if (completionPercent >= 40) {
    statusColor = '#FF9800'; // Orange - in progress
  }

  return (
    <TouchableOpacity 
      style={[styles.container, { width: size, height: size }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri }}
        style={[
          styles.avatar, 
          { 
            width: size, 
            height: size,
            borderColor: themeColors.card,
          }
        ]}
      />
      
      {showCompletionIndicator && (
        <View 
          style={[
            styles.statusBadge, 
            { 
              backgroundColor: statusColor,
              borderColor: themeColors.background,
            }
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    borderRadius: 999,
    borderWidth: 2,
  },
  statusBadge: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    bottom: 0,
    right: 0,
  },
});
