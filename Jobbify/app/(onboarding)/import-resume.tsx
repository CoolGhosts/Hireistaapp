import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as DocumentPicker from 'expo-document-picker';
import { uploadResume, ResumeFile } from '@/services/supabaseResumeService';



export default function ImportResumeScreen() {
  const { theme, user } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  
  const [resumeFile, setResumeFile] = useState<ResumeFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Function to handle resume upload
  const handleResumeUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setResumeFile({
          name: file.name,
          uri: file.uri,
          mimeType: file.mimeType || 'application/octet-stream',
          size: file.size || 0,
        });
        setError('');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      setError('Failed to select resume. Please try again.');
    }
  };

  // Function to save resume to Supabase
  const saveResumeToSupabase = async () => {
    if (!resumeFile || !user) {
      setError('Please select a resume file first.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Upload resume using the new Supabase service
      await uploadResume(resumeFile, true); // Set as primary resume

      // Show success message and navigate to job preferences
      Alert.alert(
        'Success!',
        'Your resume has been uploaded successfully.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(modals)/job-preferences?onboarding=true'),
          },
        ]
      );

    } catch (e) {
      console.error('Error uploading resume:', e);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred while uploading your resume.');
      }
    } finally {
      setUploading(false);
    }
  };

  const skipResume = () => {
    router.replace('/(modals)/job-preferences?onboarding=true');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          Import Resume
        </Text>
        <TouchableOpacity onPress={skipResume}>
          <Text style={[styles.skipButton, { color: themeColors.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Title and Description */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            Upload Your Resume
          </Text>
          <Text style={[styles.description, { color: themeColors.textSecondary }]}>
            Upload your resume to help employers learn more about your experience and skills. This will help us provide better job recommendations.
          </Text>
        </View>

        {/* Resume Upload Area */}
        <View style={[styles.uploadContainer, { backgroundColor: themeColors.backgroundSecondary, borderColor: themeColors.border }]}>
          {resumeFile ? (
            <View style={styles.resumeFileContainer}>
              <FontAwesome name="file-pdf-o" size={40} color={themeColors.tint} style={styles.resumeIcon} />
              <View style={styles.resumeDetails}>
                <Text style={[styles.resumeFileName, { color: themeColors.text }]}>{resumeFile.name}</Text>
                <Text style={[styles.resumeFileSize, { color: themeColors.textSecondary }]}>
                  {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              </View>
              <TouchableOpacity
                style={styles.resumeDeleteButton}
                onPress={() => setResumeFile(null)}
              >
                <FontAwesome name="trash" size={20} color={themeColors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.resumeUploadButton}
              onPress={handleResumeUpload}
            >
              <FontAwesome name="cloud-upload" size={40} color={themeColors.tint} style={styles.resumeUploadIcon} />
              <Text style={[styles.resumeUploadText, { color: themeColors.text }]}>
                Tap to select your resume
              </Text>
              <Text style={[styles.resumeUploadSubtext, { color: themeColors.textSecondary }]}>
                Supported formats: PDF, DOC, DOCX
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Error Message */}
        {error ? (
          <Text style={[styles.errorText, { color: themeColors.error }]}>{error}</Text>
        ) : null}

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={[styles.tipsTitle, { color: themeColors.text }]}>Tips for a great resume:</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <FontAwesome name="check-circle" size={16} color={themeColors.success} />
              <Text style={[styles.tipText, { color: themeColors.textSecondary }]}>
                Keep it concise (1-2 pages)
              </Text>
            </View>
            <View style={styles.tipItem}>
              <FontAwesome name="check-circle" size={16} color={themeColors.success} />
              <Text style={[styles.tipText, { color: themeColors.textSecondary }]}>
                Highlight relevant skills and experience
              </Text>
            </View>
            <View style={styles.tipItem}>
              <FontAwesome name="check-circle" size={16} color={themeColors.success} />
              <Text style={[styles.tipText, { color: themeColors.textSecondary }]}>
                Use clear, professional formatting
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.buttonContainer}>
        {resumeFile && (
          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: themeColors.tint }]}
            onPress={saveResumeToSupabase}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <FontAwesome name="upload" size={16} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.uploadButtonText}>Upload Resume</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.continueButton, { borderColor: themeColors.border }]}
          onPress={skipResume}
        >
          <Text style={[styles.continueButtonText, { color: themeColors.text }]}>
            Continue Without Resume
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  titleSection: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  uploadContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  resumeUploadButton: {
    alignItems: 'center',
    padding: 20,
  },
  resumeUploadIcon: {
    marginBottom: 16,
  },
  resumeUploadText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  resumeUploadSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  resumeFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  resumeIcon: {
    marginRight: 16,
  },
  resumeDetails: {
    flex: 1,
  },
  resumeFileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  resumeFileSize: {
    fontSize: 14,
  },
  resumeDeleteButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  tipsContainer: {
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
