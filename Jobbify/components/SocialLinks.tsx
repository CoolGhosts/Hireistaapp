import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAppContext } from '@/context';
import { LightTheme, DarkTheme } from '@/constants';

/**
 * Minimalist, monochrome social links row (GitHub, LinkedIn, etc.)
 */
export interface SocialLinksProps {
  links: { type: 'github' | 'linkedin' | 'twitter' | 'website'; url: string }[];
  onPress: (type: string, url: string) => void;
}

export const SocialLinks: React.FC<SocialLinksProps> = ({ links, onPress }) => {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const iconMap: Record<string, string> = {
    github: 'github',
    linkedin: 'linkedin',
    twitter: 'twitter',
    website: 'globe',
  };
  return (
    <View style={styles.row}>
      {links.map(({ type, url }) => (
        <TouchableOpacity
          key={type}
          style={styles.iconBtn}
          onPress={() => onPress(type, url)}
        >
          <FontAwesome
            // cast to any due to union typing
            name={iconMap[type] as any || ('globe' as any)}
            size={22}
            color={themeColors.textSecondary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 10,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
});
