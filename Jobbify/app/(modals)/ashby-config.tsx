import React from 'react';
import { StyleSheet, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { AshbyJobBoardConfig } from '@/components/AshbyJobBoardConfig';

export default function AshbyConfigModal() {
  const { theme } = useAppContext();
  const colors = theme === 'light' ? LightTheme.colors : DarkTheme.colors;

  const handleConfigSaved = () => {
    // Close the modal after configuration is saved
    router.back();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      flex: 1,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="times" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <AshbyJobBoardConfig onConfigSaved={handleConfigSaved} />
      </View>
    </SafeAreaView>
  );
}
