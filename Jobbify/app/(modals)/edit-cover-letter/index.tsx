import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  Modal 
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { generateAICoverLetter, JobDetails, CoverLetterOptions } from '@/services/deepseekService';
import { updateCoverLetter, getCoverLetter, trackCoverLetterStatus } from '@/services/coverLetterService';

// Sample cover letter templates - same as in cover-letter/index.tsx
const coverLetterTemplates: CoverLetterOptions[] = [
  {
    tone: 'professional',
    style: 'traditional',
    focus: 'experience'
  },
  {
    tone: 'conversational',
    style: 'modern',
    focus: 'skills'
  },
  {
    tone: 'enthusiastic',
    style: 'creative',
    focus: 'culture-fit'
  }
];

const templateNames = {
  'professional-traditional-experience': 'Professional Standard',
  'conversational-modern-skills': 'Modern Conversational',
  'enthusiastic-creative-culture-fit': 'Creative Culture-Fit'
};

export default function EditCoverLetterScreen() {
  const { theme, user } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const params = useLocalSearchParams<{ 
    jobId?: string, 
    position?: string, 
    company?: string 
  }>();
  
  const [jobDetails, setJobDetails] = useState<JobDetails>({
    company: params.company || '',
    position: params.position || '',
    contactPerson: '',
    keyRequirements: '',
    userSkills: '',
    companyInfo: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<CoverLetterOptions>(coverLetterTemplates[0]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Fetch existing cover letter on load
  useEffect(() => {
    if (params.jobId && user?.id) {
      fetchCoverLetter();
    } else {
      setIsLoading(false);
    }
  }, [params.jobId, user?.id]);

  const fetchCoverLetter = async () => {
    if (!params.jobId || !user?.id) return;
    
    try {
      setIsLoading(true);
      const result = await getCoverLetter(params.jobId, user.id);
      
      if (result.success && result.coverLetter) {
        setCoverLetter(result.coverLetter);
      }
    } catch (error) {
      console.error('Error fetching cover letter:', error);
      Alert.alert('Error', 'Failed to load cover letter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update job details
  const updateJobDetails = (field: keyof JobDetails, value: string) => {
    setJobDetails(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  
  // Generate cover letter using AI
  const handleGenerateCoverLetter = async () => {
    try {
      setIsGenerating(true);
      const generatedLetter = await generateAICoverLetter(jobDetails, selectedTemplate);
      setCoverLetter(generatedLetter);
    } catch (error) {
      console.error('Error generating cover letter:', error);
      Alert.alert('Error', 'Failed to generate cover letter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save cover letter
  const handleSaveCoverLetter = async () => {
    if (!params.jobId || !user?.id) {
      Alert.alert('Error', 'Missing job or user information.');
      return;
    }

    try {
      setIsSaving(true);
      
      // Update cover letter in database
      const result = await updateCoverLetter(params.jobId, user.id, coverLetter);
      
      if (result.success) {
        // Track that this application has a cover letter
        await trackCoverLetterStatus(user.id, params.jobId, true);
        
        Alert.alert('Success', 'Cover letter updated successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to update cover letter. Please try again.');
      }
    } catch (error) {
      console.error('Error saving cover letter:', error);
      Alert.alert('Error', 'Failed to save cover letter. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Function to get template name
  const getTemplateName = (template: CoverLetterOptions): string => {
    const key = `${template.tone}-${template.style}-${template.focus}`;
    return templateNames[key as keyof typeof templateNames] || 'Custom Template';
  };

  // Render template selection modal
  const renderTemplateModal = () => {
    return (
      <Modal
        visible={showTemplateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.templateModalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Select Template Style
            </Text>
            
            <ScrollView>
              {coverLetterTemplates.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.templateOption,
                    { 
                      backgroundColor: themeColors.background,
                      borderColor: 
                        template.tone === selectedTemplate.tone &&
                        template.style === selectedTemplate.style &&
                        template.focus === selectedTemplate.focus
                          ? themeColors.tint
                          : themeColors.border,
                      borderWidth: 1
                    }
                  ]}
                  onPress={() => {
                    setSelectedTemplate(template);
                    setShowTemplateModal(false);
                  }}
                >
                  <Text style={[styles.templateOptionName, { color: themeColors.text }]}>
                    {getTemplateName(template)}
                  </Text>
                  <View style={styles.templateOptionDetails}>
                    <Text style={[styles.templateOptionDetail, { color: themeColors.textSecondary }]}>
                      Tone: {template.tone}
                    </Text>
                    <Text style={[styles.templateOptionDetail, { color: themeColors.textSecondary }]}>
                      Style: {template.style}
                    </Text>
                    <Text style={[styles.templateOptionDetail, { color: themeColors.textSecondary }]}>
                      Focus: {template.focus}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: themeColors.tint }]}
              onPress={() => setShowTemplateModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen
        options={{
          title: 'Edit Cover Letter',
          headerStyle: { backgroundColor: themeColors.card },
          headerTintColor: themeColors.text,
        }}
      />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.tint} />
            <Text style={[styles.loadingText, { color: themeColors.text }]}>
              Loading cover letter...
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.formContainer}>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                  Job Information
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: themeColors.text }]}>
                    Company
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { 
                        backgroundColor: themeColors.backgroundSecondary,
                        color: themeColors.text,
                        borderColor: themeColors.border,
                        borderWidth: 1,
                      }
                    ]}
                    placeholderTextColor={themeColors.textSecondary}
                    value={jobDetails.company}
                    onChangeText={(text) => updateJobDetails('company', text)}
                    placeholder="Enter company name"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: themeColors.text }]}>
                    Position
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      { 
                        backgroundColor: themeColors.backgroundSecondary,
                        color: themeColors.text,
                        borderColor: themeColors.border,
                        borderWidth: 1,
                      }
                    ]}
                    placeholderTextColor={themeColors.textSecondary}
                    value={jobDetails.position}
                    onChangeText={(text) => updateJobDetails('position', text)}
                    placeholder="Enter job position"
                  />
                </View>
              </View>
              
              <View style={styles.templateSection}>
                <View style={styles.templateHeader}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    Template
                  </Text>
                  <TouchableOpacity
                    style={styles.templateButton}
                    onPress={() => setShowTemplateModal(true)}
                  >
                    <Text style={[styles.templateButtonText, { color: themeColors.tint }]}>
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={[styles.templateCard, { backgroundColor: themeColors.card }]}>
                  <Text style={[styles.templateName, { color: themeColors.text }]}>
                    {getTemplateName(selectedTemplate)}
                  </Text>
                  <View style={styles.templateDetails}>
                    <Text style={[styles.templateDetail, { color: themeColors.textSecondary }]}>
                      Tone: {selectedTemplate.tone}
                    </Text>
                    <Text style={[styles.templateDetail, { color: themeColors.textSecondary }]}>
                      Style: {selectedTemplate.style}
                    </Text>
                    <Text style={[styles.templateDetail, { color: themeColors.textSecondary }]}>
                      Focus: {selectedTemplate.focus}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.generateButton, 
                    { backgroundColor: themeColors.tint },
                    isGenerating && { opacity: 0.7 }
                  ]}
                  onPress={handleGenerateCoverLetter}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <FontAwesome name="magic" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                      <Text style={styles.generateButtonText}>
                        Generate New Cover Letter
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    Cover Letter
                  </Text>
                  <TouchableOpacity
                    style={[styles.previewButton, 
                      { borderColor: themeColors.tint, backgroundColor: previewMode ? themeColors.tint + '20' : 'transparent' }
                    ]}
                    onPress={() => setPreviewMode(!previewMode)}
                  >
                    <FontAwesome 
                      name={previewMode ? "edit" : "eye"} 
                      size={16} 
                      color={themeColors.tint} 
                      style={{marginRight: 6}} 
                    />
                    <Text style={[styles.previewButtonText, { color: themeColors.tint }]}>
                      {previewMode ? "Edit" : "Preview"}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {previewMode ? (
                  <ScrollView 
                    style={[
                      styles.previewContainer,
                      { 
                        backgroundColor: themeColors.backgroundSecondary,
                        borderColor: themeColors.border,
                        borderWidth: 1,
                      }
                    ]}
                    contentContainerStyle={styles.previewContent}
                  >
                    {coverLetter.split('\n').map((paragraph, index) => (
                      <Text 
                        key={index} 
                        style={[
                          styles.previewParagraph, 
                          { color: themeColors.text }
                        ]}
                      >
                        {paragraph}
                      </Text>
                    ))}
                  </ScrollView>
                ) : (
                  <TextInput
                    style={[
                      styles.textArea,
                      { 
                        backgroundColor: themeColors.backgroundSecondary,
                        color: themeColors.text,
                        borderColor: themeColors.border,
                        borderWidth: 1,
                      }
                    ]}
                    multiline
                    numberOfLines={20}
                    textAlignVertical="top"
                    value={coverLetter}
                    onChangeText={setCoverLetter}
                    placeholder="Your cover letter will appear here..."
                    placeholderTextColor={themeColors.textSecondary}
                  />
                )}
              </View>
              
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.saveButton, 
                    { backgroundColor: themeColors.tint },
                    isSaving && { opacity: 0.7 }
                  ]}
                  onPress={handleSaveCoverLetter}
                  disabled={isSaving || !coverLetter}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      Save Cover Letter
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cancelButton, 
                    { 
                      backgroundColor: 'transparent',
                      borderColor: themeColors.border,
                      borderWidth: 1,
                    }
                  ]}
                  onPress={() => router.back()}
                >
                  <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      
      {renderTemplateModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 300,
    textAlignVertical: 'top',
  },
  templateSection: {
    marginVertical: 16,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  templateButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  templateCard: {
    borderRadius: 8,
    padding: 16,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  templateDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  templateDetail: {
    fontSize: 14,
    marginRight: 12,
    marginBottom: 4,
  },
  actionsContainer: {
    marginVertical: 20,
    gap: 12,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
  },
  buttonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateModalContent: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  templateOption: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  templateOptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  templateOptionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  templateOptionDetail: {
    fontSize: 14,
    marginRight: 12,
    marginBottom: 4,
  },
  closeButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Preview mode styles
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    minHeight: 300,
    borderRadius: 8,
    padding: 16,
  },
  previewContent: {
    paddingBottom: 20,
  },
  previewParagraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  }
});
