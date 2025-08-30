import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';

interface TabHeaderProps {
  title: string;
}

export default function TabHeader({ title }: TabHeaderProps) {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  return (
    <SafeAreaView style={{ backgroundColor: themeColors.background }}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={themeColors.background}
      />
      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});
