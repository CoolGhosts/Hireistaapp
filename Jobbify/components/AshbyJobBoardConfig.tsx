import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { validateJobBoardName, getJobBoardConfigurations } from '@/services/ashbyJobsService';

interface AshbyJobBoardConfigProps {
  onConfigSaved?: () => void;
}

const ASHBY_CONFIG_KEY = 'ashby_job_board_config';

export const AshbyJobBoardConfig: React.FC<AshbyJobBoardConfigProps> = ({ onConfigSaved }) => {
  const { theme } = useAppContext();
  const colors = theme === 'light' ? LightTheme.colors : DarkTheme.colors;
  
  const [jobBoardName, setJobBoardName] = useState('');
  const [includeCompensation, setIncludeCompensation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved configuration on component mount
  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      setIsLoading(true);
      const savedConfig = await AsyncStorage.getItem(ASHBY_CONFIG_KEY);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setJobBoardName(config.jobBoardName || '');
        setIncludeCompensation(config.includeCompensation !== false);
      }
    } catch (error) {
      console.error('Error loading Ashby config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!jobBoardName.trim()) {
      Alert.alert('Error', 'Please enter a job board name');
      return;
    }

    if (!validateJobBoardName(jobBoardName.trim())) {
      Alert.alert(
        'Invalid Job Board Name',
        'Job board name should only contain letters, numbers, hyphens, and underscores'
      );
      return;
    }

    try {
      setIsSaving(true);
      const config = {
        jobBoardName: jobBoardName.trim(),
        includeCompensation,
        savedAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(ASHBY_CONFIG_KEY, JSON.stringify(config));
      
      Alert.alert(
        'Configuration Saved',
        'Your Ashby job board configuration has been saved successfully. The app will use this configuration for fetching jobs.',
        [
          {
            text: 'OK',
            onPress: () => onConfigSaved?.()
          }
        ]
      );
    } catch (error) {
      console.error('Error saving Ashby config:', error);
      Alert.alert('Error', 'Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearConfig = async () => {
    Alert.alert(
      'Clear Configuration',
      'Are you sure you want to clear the Ashby job board configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(ASHBY_CONFIG_KEY);
              setJobBoardName('');
              setIncludeCompensation(true);
              Alert.alert('Configuration Cleared', 'Ashby job board configuration has been cleared.');
            } catch (error) {
              console.error('Error clearing config:', error);
              Alert.alert('Error', 'Failed to clear configuration.');
            }
          }
        }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    description: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
      lineHeight: 20,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.card,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 4,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
    },
    checkboxLabel: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      backgroundColor: colors.primary,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonSecondary: {
      backgroundColor: colors.border,
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: colors.text,
    },
    exampleContainer: {
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    exampleTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    exampleText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'monospace',
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading configuration...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ashby Job Board Configuration</Text>
      
      <Text style={styles.description}>
        Configure your Ashby job board to fetch jobs directly from your company's Ashby-hosted careers page. 
        You can find your job board name in your Ashby job board URL.
      </Text>

      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>Example:</Text>
        <Text style={styles.exampleText}>
          URL: https://jobs.ashbyhq.com/YourCompany{'\n'}
          Job Board Name: YourCompany
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Job Board Name</Text>
        <TextInput
          style={styles.input}
          value={jobBoardName}
          onChangeText={setJobBoardName}
          placeholder="Enter your Ashby job board name"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setIncludeCompensation(!includeCompensation)}
      >
        <View style={[styles.checkbox, includeCompensation && styles.checkboxChecked]}>
          {includeCompensation && (
            <FontAwesome name="check" size={12} color={colors.background} />
          )}
        </View>
        <Text style={styles.checkboxLabel}>Include compensation data</Text>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={clearConfig}
          disabled={isSaving}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Clear</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={saveConfig}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
