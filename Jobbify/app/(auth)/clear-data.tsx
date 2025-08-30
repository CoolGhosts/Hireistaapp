import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView,
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { router } from 'expo-router';
import { clearAllData } from '../../utils/clearAllData';

export default function ClearDataScreen() {
  const [isClearing, setIsClearing] = useState(false);
  const [status, setStatus] = useState<string>('Ready to clear all data');

  const handleClearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all user data, cache, and sign out any logged-in users. This action cannot be undone. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            setStatus('Clearing all data...');
            
            try {
              await clearAllData.clearEverything();
              setStatus('All data cleared successfully!');
              
              // Verify the clear was successful
              const isCleared = await clearAllData.verifyDataCleared();
              if (isCleared) {
                setStatus('✅ Data clear verified - app is now in clean state');
                
                // Navigate back to login after a delay
                setTimeout(() => {
                  router.replace('/(auth)/login');
                }, 2000);
              } else {
                setStatus('⚠️ Data clear verification failed - some data may remain');
              }
              
            } catch (error) {
              console.error('Error clearing data:', error);
              setStatus(`❌ Error clearing data: ${error}`);
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleClearLocalOnly = async () => {
    Alert.alert(
      'Clear Local Data Only',
      'This will clear local storage and cache but keep database data intact. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Local Data',
          style: 'default',
          onPress: async () => {
            setIsClearing(true);
            setStatus('Clearing local data...');
            
            try {
              await clearAllData.clearLocalStorage();
              setStatus('✅ Local data cleared successfully!');
              
              setTimeout(() => {
                router.replace('/(auth)/login');
              }, 1500);
              
            } catch (error) {
              console.error('Error clearing local data:', error);
              setStatus(`❌ Error clearing local data: ${error}`);
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Data Management</Text>
        <Text style={styles.subtitle}>
          Use these tools to clear user data and reset the app to a clean state
        </Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusText}>{status}</Text>
          {isClearing && <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearAllData}
            disabled={isClearing}
          >
            <Text style={styles.dangerButtonText}>
              🗑️ Clear All Data (Database + Local)
            </Text>
            <Text style={styles.buttonSubtext}>
              Deletes all users from database and clears local cache
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={handleClearLocalOnly}
            disabled={isClearing}
          >
            <Text style={styles.warningButtonText}>
              📱 Clear Local Data Only
            </Text>
            <Text style={styles.buttonSubtext}>
              Clears local cache but keeps database data
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.back()}
            disabled={isClearing}
          >
            <Text style={styles.secondaryButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>ℹ️ What gets cleared:</Text>
          <Text style={styles.infoText}>• All user accounts from Supabase</Text>
          <Text style={styles.infoText}>• All profiles and user data</Text>
          <Text style={styles.infoText}>• Job cache and interactions</Text>
          <Text style={styles.infoText}>• Local storage and secure storage</Text>
          <Text style={styles.infoText}>• Authentication sessions</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  loader: {
    marginTop: 10,
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#ff4444',
  },
  warningButton: {
    backgroundColor: '#ff8800',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  warningButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 3,
  },
});
