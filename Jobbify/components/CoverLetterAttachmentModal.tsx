import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { getOpenRouterCompletion } from '@/services/openRouterService';
import * as DocumentPicker from 'expo-document-picker';
import { BlurView } from 'expo-blur';
import { ThemeColors } from '@/constants/Theme';
import {
  CoverLetterFile,
  CoverLetterAttachment,
  uploadCoverLetterFile,
  saveCustomCoverLetter,
  getCoverLetterAttachment,
  deleteCoverLetterAttachment,
  downloadCoverLetterFile,
  getApplicationId,
} from '@/services/coverLetterService';

const { width: screenWidth } = Dimensions.get('window');

interface CoverLetterAttachmentModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  themeColors: ThemeColors;
  onAttachmentChange?: (hasAttachment: boolean) => void;
}

export const CoverLetterAttachmentModal: React.FC<CoverLetterAttachmentModalProps> = ({
  visible,
  onClose,
  jobId,
  userId,
  jobTitle,
  companyName,
  themeColors,
  onAttachmentChange,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'write'>('upload');
  const [customText, setCustomText] = useState('');
  const [selectedFile, setSelectedFile] = useState<CoverLetterFile | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<CoverLetterAttachment | null>(null);
  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Load existing attachment when modal opens
  useEffect(() => {
    if (visible && userId && jobId) {
      loadExistingAttachment();
    }
  }, [visible, userId, jobId]);

  const loadExistingAttachment = async () => {
    try {
      setLoading(true);

      // First get the application ID
      const appIdResult = await getApplicationId(jobId, userId);
      if (!appIdResult.success || !appIdResult.applicationId) {
        console.log('No application found for this job');
        return;
      }

      setApplicationId(appIdResult.applicationId);

      // Then get the cover letter attachment
      const result = await getCoverLetterAttachment(appIdResult.applicationId, userId);
      if (result.success && result.data) {
        setExistingAttachment(result.data);
        if (result.data.type === 'text' && result.data.customText) {
          setCustomText(result.data.customText);
          setActiveTab('write');
        } else if (result.data.type === 'file') {
          setActiveTab('upload');
        }
      }
    } catch (error) {
      console.error('Error loading existing attachment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({
          name: file.name,
          uri: file.uri,
          size: file.size || 0,
          mimeType: file.mimeType || 'application/pdf',
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || !applicationId) {
      Alert.alert('Error', 'Please select a file first.');
      return;
    }

    try {
      setLoading(true);
      const result = await uploadCoverLetterFile(selectedFile, userId, applicationId);

      if (result.success) {
        setExistingAttachment(result.data || null);
        setSelectedFile(null);
        onAttachmentChange?.(true);
        Alert.alert('Success', 'Cover letter uploaded successfully!');
      } else {
        Alert.alert('Upload Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomText = async () => {
    if (!customText.trim() || !applicationId) {
      Alert.alert('Error', 'Please enter cover letter text.');
      return;
    }

    try {
      setLoading(true);
      const result = await saveCustomCoverLetter(customText.trim(), userId, applicationId);

      if (result.success) {
        setExistingAttachment(result.data || null);
        onAttachmentChange?.(true);
        Alert.alert('Success', 'Cover letter saved successfully!');
      } else {
        Alert.alert('Save Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error saving custom text:', error);
      Alert.alert('Error', 'Failed to save cover letter. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingAttachment || !applicationId) return;

    Alert.alert(
      'Delete Cover Letter',
      'Are you sure you want to delete this cover letter?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await deleteCoverLetterAttachment(applicationId, userId);

              if (result.success) {
                setExistingAttachment(null);
                setCustomText('');
                setSelectedFile(null);
                onAttachmentChange?.(false);
                Alert.alert('Success', 'Cover letter deleted successfully!');
              } else {
                Alert.alert('Delete Failed', result.error || 'Unknown error occurred');
              }
            } catch (error) {
              console.error('Error deleting attachment:', error);
              Alert.alert('Error', 'Failed to delete cover letter. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDownload = async () => {
    if (!existingAttachment?.fileUrl || !existingAttachment?.fileName) return;

    try {
      setLoading(true);
      const result = await downloadCoverLetterFile(
        existingAttachment.fileUrl,
        existingAttachment.fileName
      );

      if (result.success) {
        Alert.alert('Success', `File downloaded to: ${result.localUri}`);
      } else {
        Alert.alert('Download Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    try {
      setAiLoading(true);
      const prompt = `Write a professional cover letter for the position ${jobTitle} at ${companyName}.`;
      const generated = await getOpenRouterCompletion(prompt);
      setCustomText(prev => (prev ? prev + '\n\n' : '') + generated);
    } catch (e) {
      Alert.alert('AI Error', (e as Error).message ?? 'Could not generate text');
    } finally {
      setAiLoading(false);
    }
  };

  const renderTabButton = (tab: 'upload' | 'write', label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor: activeTab === tab ? themeColors.tint : 'transparent',
          borderColor: themeColors.border,
        },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <FontAwesome
        name={icon as any}
        size={16}
        color={activeTab === tab ? themeColors.background : themeColors.textSecondary}
      />
      <Text
        style={[
          styles.tabButtonText,
          {
            color: activeTab === tab ? themeColors.background : themeColors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <BlurView intensity={20} style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: themeColors.text }]}>
                Cover Letter
              </Text>
              <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
                {jobTitle} at {companyName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={themeColors.tint} />
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Existing Attachment Display */}
            {existingAttachment && (
              <View style={[styles.existingAttachment, { backgroundColor: themeColors.card }]}>
                <View style={styles.attachmentHeader}>
                  <FontAwesome
                    name={existingAttachment.type === 'file' ? 'file-pdf-o' : 'file-text-o'}
                    size={20}
                    color={themeColors.success}
                  />
                  <Text style={[styles.attachmentTitle, { color: themeColors.text }]}>
                    Current Cover Letter ({existingAttachment.type === 'file' ? 'PDF' : 'Text'})
                  </Text>
                </View>

                {existingAttachment.type === 'file' && (
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: themeColors.textSecondary }]}>
                      {existingAttachment.fileName}
                    </Text>
                    <Text style={[styles.fileSize, { color: themeColors.textSecondary }]}>
                      {((existingAttachment.fileSize || 0) / 1024).toFixed(1)} KB
                    </Text>
                  </View>
                )}

                <View style={styles.attachmentActions}>
                  {existingAttachment.type === 'file' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: themeColors.info + '20' }]}
                      onPress={handleDownload}
                    >
                      <FontAwesome name="download" size={14} color={themeColors.info} />
                      <Text style={[styles.actionButtonText, { color: themeColors.info }]}>
                        Download
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: themeColors.error + '20' }]}
                    onPress={handleDelete}
                  >
                    <FontAwesome name="trash" size={14} color={themeColors.error} />
                    <Text style={[styles.actionButtonText, { color: themeColors.error }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {renderTabButton('upload', 'Upload PDF', 'upload')}
              {renderTabButton('write', 'Write Custom', 'edit')}
            </View>

            {/* Tab Content */}
            {activeTab === 'upload' && (
              <View style={styles.tabContent}>
                <TouchableOpacity
                  style={[
                    styles.uploadArea,
                    {
                      backgroundColor: selectedFile ? themeColors.success + '10' : themeColors.card,
                      borderColor: selectedFile ? themeColors.success : themeColors.border,
                    },
                  ]}
                  onPress={handleFilePick}
                >
                  <FontAwesome
                    name={selectedFile ? 'file-pdf-o' : 'cloud-upload'}
                    size={32}
                    color={selectedFile ? themeColors.success : themeColors.textSecondary}
                  />
                  <Text style={[styles.uploadText, { color: themeColors.text }]}>
                    {selectedFile ? selectedFile.name : 'Tap to select PDF file'}
                  </Text>
                  {selectedFile && (
                    <Text style={[styles.uploadSubtext, { color: themeColors.textSecondary }]}>
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </Text>
                  )}
                  <Text style={[styles.uploadHint, { color: themeColors.textSecondary }]}>
                    Maximum file size: 5MB
                  </Text>
                </TouchableOpacity>

                {selectedFile && (
                  <TouchableOpacity
                    style={[styles.uploadButton, { backgroundColor: themeColors.tint }]}
                    onPress={handleUploadFile}
                    disabled={loading}
                  >
                    <Text style={[styles.uploadButtonText, { color: themeColors.background }]}>
                      Upload Cover Letter
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeTab === 'write' && (
              <View style={styles.tabContent}>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    },
                  ]}
                  placeholder="Write your cover letter here..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={customText}
                  onChangeText={setCustomText}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: customText.trim() ? themeColors.tint : themeColors.textSecondary,
                    },
                  ]}
                  onPress={handleSaveCustomText}
                  disabled={!customText.trim() || loading}
                >
                  <Text style={[styles.saveButtonText, { color: themeColors.background }]}>
                    Save Cover Letter
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: themeColors.info },
                  ]}
                  onPress={handleGenerateAI}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <ActivityIndicator color={themeColors.background} />
                  ) : (
                    <Text style={[styles.saveButtonText, { color: themeColors.background }]}>
                      Generate with AI
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  closeButton: {
    padding: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  existingAttachment: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  attachmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  attachmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  fileInfo: {
    marginBottom: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
  },
  attachmentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  uploadHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  uploadButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    height: 200,
    marginBottom: 20,
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
