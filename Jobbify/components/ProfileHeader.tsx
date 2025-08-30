import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAppContext } from '@/context';
import { LightTheme, DarkTheme } from '@/constants/Theme';

/**
 * Displays the user's avatar, name, title, and status.
 * Monochrome, large avatar, edit on tap.
 */
export interface ProfileHeaderProps {
  name: string;
  title: string;
  avatarUrl: string | null;
  status: 'online' | 'offline' | 'busy';
  onEditAvatar: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  title,
  avatarUrl,
  status,
  onEditAvatar,
}) => {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const statusColor = status === 'online'
    ? themeColors.text
    : status === 'busy'
    ? themeColors.textSecondary
    : themeColors.border;

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={onEditAvatar} style={styles.avatarWrapper}>
        {avatarUrl ? (
          <Image 
            source={{ uri: avatarUrl }} 
            style={styles.avatar} 
            onError={() => {
              // The error is already handled by showing the placeholder when avatarUrl is null
              // We don't need the error details for now
            }}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <FontAwesome name="user" size={40} color={themeColors.textSecondary} />
          </View>
        )}
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.editIconWrapper}>
          <FontAwesome name="camera" size={18} color={themeColors.text} />
        </View>
      </TouchableOpacity>
      <Text style={[styles.name, { color: themeColors.text }]}>{name}</Text>
      <Text style={[styles.title, { color: themeColors.textSecondary }]}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'transparent',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: 'transparent',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  statusDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  editIconWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    color: '#888',
    marginBottom: 0,
  },
});
