import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppContext } from '@/context';
import { LightTheme, DarkTheme } from '@/constants/Theme';

/**
 * Displays user stats (applications, interviews, offers, etc.) in a bold, monochrome row.
 */
export interface StatsRowProps {
  stats: { label: string; value: number | string }[];
}

export const StatsRow: React.FC<StatsRowProps> = ({ stats }) => {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  return (
    <View style={styles.row}>
      {stats.map(({ label, value }, idx) => (
        <View style={styles.stat} key={label}>
          <Text style={[styles.value, { color: themeColors.text }]}>{value}</Text>
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>{label}</Text>
          {idx !== stats.length - 1 && <View style={[styles.divider, { backgroundColor: themeColors.border }]} />}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 0,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  label: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 0.5,
  },
  divider: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 1,
    opacity: 0.12,
  },
});
