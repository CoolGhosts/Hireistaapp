import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAppContext } from '../../../context';
import { LightTheme, DarkTheme } from '../../../constants';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { generateAICoverLetter, JobDetails, CoverLetterOptions } from '../../../services/deepseekService';
import { extractTextFromFile } from '../../../services/fileTextExtractService';

interface CoverLetter {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  company: string;
  position: string;
}

interface ResumeFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
}

// Sample cover letter templates
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

export default function CoverLetterScreen() {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const params = useLocalSearchParams<{ jobId?: string, position?: string, company?: string }>();
  
  const [jobDetails, setJobDetails] = useState<JobDetails>({
    company: params.company || '',
    position: params.position || '',
    contactPerson: '',
    keyRequirements: '',
    userSkills: '',
    companyInfo: ''
  });
  
  const [resumeFile, setResumeFile] = useState<ResumeFile | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [savedLetters, setSavedLetters] = useState<CoverLetter[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [letterTitle, setLetterTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CoverLetterOptions>(coverLetterTemplates[0]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // Update job details
  const updateJobDetails = (field: keyof JobDetails, value: string) => {
    setJobDetails(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  
  // Pick a resume for reference
  const handlePickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false) {
        const file = result.assets[0];
        const fileObj: ResumeFile = {
          name: file.name,
          uri: file.uri,
          size: file.size || 0,
          mimeType: file.mimeType || '',
        };
        
        setResumeFile(fileObj);

        // Extract the text from the resume
        try {
          const extractedText = await extractTextFromFile({
            uri: file.uri,
            name: file.name,
            mimeType: file.mimeType || '',
          });
          setResumeText(extractedText);
        } catch (error) {
          console.error('Error extracting text from resume:', error);
          Alert.alert('Error', 'Failed to extract text from the resume. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error picking resume:', error);
      Alert.alert('Error', 'There was a problem accessing your files. Please try again.');
    }
  };

  // Remove resume
  const handleRemoveResume = () => {
    setResumeFile(null);
    setResumeText(null);
  };
  
  // Generate cover letter using AI
  const handleGenerateCoverLetter = async () => {
    if (!jobDetails.company || !jobDetails.position) {
      Alert.alert('Missing Information', 'Please provide at least the company name and position.');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const generatedLetter = await generateAICoverLetter(jobDetails, selectedTemplate, resumeText || undefined);
      setCoverLetter(generatedLetter);
      
      // Set default title for saving
      setLetterTitle(`${jobDetails.position} at ${jobDetails.company}`);
    } catch (error) {
      console.error('Error generating cover letter:', error);
      Alert.alert('Error', 'Failed to generate cover letter. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Save cover letter
  const handleSaveCoverLetter = () => {
    if (!coverLetter || !letterTitle) return;
    
    const newLetter: CoverLetter = {
      id: Date.now().toString(),
      title: letterTitle,
      content: coverLetter,
      createdAt: new Date(),
      company: jobDetails.company,
      position: jobDetails.position
    };
    
    setSavedLetters([newLetter, ...savedLetters]);
    setShowSaveModal(false);
    Alert.alert('Success', 'Cover letter saved successfully!');
  };
  
  // Reset form
  const handleReset = () => {
    setJobDetails({
      company: '',
      position: '',
      contactPerson: '',
      keyRequirements: '',
      userSkills: '',
      companyInfo: ''
    });
    setCoverLetter('');
    setResumeFile(null);
    setResumeText(null);
  };
  
  // Function to get template name
  const getTemplateName = (template: CoverLetterOptions): string => {
    const key = `${template.tone}-${template.style}-${template.focus}`;
    return templateNames[key as keyof typeof templateNames] || 'Custom Template';
  };
  
  // Render form inputs
  const renderForm = () => (
    <View style={styles.formContainer}>
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Job Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: themeColors.text }]}>Company</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: themeColors.card, color: themeColors.text }]}
          placeholder="Enter company name"
          placeholderTextColor={themeColors.textSecondary}
          value={jobDetails.company}
          onChangeText={(text) => updateJobDetails('company', text)}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: themeColors.text }]}>Position</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: themeColors.card, color: themeColors.text }]}
          placeholder="Enter job title"
          placeholderTextColor={themeColors.textSecondary}
          value={jobDetails.position}
          onChangeText={(text) => updateJobDetails('position', text)}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: themeColors.text }]}>Contact Person (Optional)</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: themeColors.card, color: themeColors.text }]}
          placeholder="Hiring manager's name if known"
          placeholderTextColor={themeColors.textSecondary}
          value={jobDetails.contactPerson}
          onChangeText={(text) => updateJobDetails('contactPerson', text)}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: themeColors.text }]}>Key Requirements</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: themeColors.card, color: themeColors.text }]}
          placeholder="Paste key requirements from job description"
          placeholderTextColor={themeColors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={jobDetails.keyRequirements}
          onChangeText={(text) => updateJobDetails('keyRequirements', text)}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: themeColors.text }]}>Your Relevant Skills</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: themeColors.card, color: themeColors.text }]}
          placeholder="List your skills that match the job requirements"
          placeholderTextColor={themeColors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={jobDetails.userSkills}
          onChangeText={(text) => updateJobDetails('userSkills', text)}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: themeColors.text }]}>Company Information (Optional)</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: themeColors.card, color: themeColors.text }]}
          placeholder="Add any specific information about the company's culture, values, or mission"
          placeholderTextColor={themeColors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={jobDetails.companyInfo}
          onChangeText={(text) => updateJobDetails('companyInfo', text)}
        />
      </View>
      
      <View style={styles.resumeSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Resume Reference (Optional)</Text>
        <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
          Upload your resume to create a more personalized cover letter
        </Text>
        
        {resumeFile ? (
          <View style={[styles.resumeCard, { backgroundColor: themeColors.card }]}>
            <FontAwesome name="file-text-o" size={20} color={themeColors.tint} />
            <Text style={[styles.resumeName, { color: themeColors.text }]} numberOfLines={1}>
              {resumeFile.name}
            </Text>
            <TouchableOpacity onPress={handleRemoveResume}>
              <FontAwesome name="times-circle" size={20} color={themeColors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.uploadButton, { backgroundColor: themeColors.card }]} 
            onPress={handlePickResume}
          >
            <FontAwesome name="upload" size={16} color={themeColors.tint} />
            <Text style={[styles.uploadButtonText, { color: themeColors.tint }]}>Upload Resume</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.templateSection}>
        <View style={styles.templateHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Cover Letter Template</Text>
        <TouchableOpacity 
            style={styles.templateButton} 
          onPress={() => setShowTemplateModal(true)}
        >
            <Text style={[styles.templateButtonText, { color: themeColors.tint }]}>Change</Text>
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
          style={[styles.generateButton, { backgroundColor: themeColors.tint }]} 
          onPress={handleGenerateCoverLetter}
          disabled={isGenerating || !jobDetails.company || !jobDetails.position}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <FontAwesome name="magic" size={16} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.generateButtonText}>Generate Cover Letter</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.resetButton, { borderColor: themeColors.textSecondary }]} 
          onPress={handleReset}
        >
          <FontAwesome name="refresh" size={16} color={themeColors.textSecondary} style={styles.buttonIcon} />
          <Text style={[styles.resetButtonText, { color: themeColors.textSecondary }]}>Reset Form</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render save modal
  const renderSaveModal = () => (
    <Modal
      visible={showSaveModal}
      animationType="fade"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>Save Cover Letter</Text>
          
          <Text style={[styles.inputLabel, { color: themeColors.text }]}>Title</Text>
          <TextInput
            style={[
              styles.textInput, 
              { backgroundColor: themeColors.background, color: themeColors.text, marginBottom: 20 }
            ]}
            placeholder="Enter a title for this cover letter"
            placeholderTextColor={themeColors.textSecondary}
            value={letterTitle}
            onChangeText={setLetterTitle}
          />
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: themeColors.textSecondary }]} 
              onPress={() => setShowSaveModal(false)}
            >
              <Text style={[styles.cancelButtonText, { color: themeColors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: themeColors.tint }]} 
              onPress={handleSaveCoverLetter}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Render template selection modal
  const renderTemplateModal = () => (
    <Modal
      visible={showTemplateModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.templateModalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select Template</Text>
          
          {coverLetterTemplates.map((template, index) => (
              <TouchableOpacity 
              key={index}
                style={[
                styles.templateOption,
                { backgroundColor: themeColors.background },
                selectedTemplate.tone === template.tone &&
                selectedTemplate.style === template.style &&
                selectedTemplate.focus === template.focus
                  ? { borderColor: themeColors.tint, borderWidth: 2 }
                  : {}
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
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: 'Cover Letter Generator',
        }}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView style={styles.scrollView}>
          {/* Form Section */}
          {renderForm()}
          
          {/* Cover Letter Output */}
          {coverLetter ? (
            <View style={styles.outputContainer}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Generated Cover Letter</Text>
              
              <View style={[styles.coverLetterOutput, { backgroundColor: themeColors.card }]}>
                <Text style={[styles.coverLetterText, { color: themeColors.text }]}>{coverLetter}</Text>
                  </View>
                  
              <View style={styles.outputActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColors.tint }]} 
                  onPress={() => setShowSaveModal(true)}
                >
                  <FontAwesome name="save" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.actionButtonText}>Save</Text>
                </TouchableOpacity>
                
                    <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColors.tint }]} 
                    >
                  <FontAwesome name="copy" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.actionButtonText}>Copy</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColors.tint }]} 
                    >
                  <FontAwesome name="share-square-o" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.actionButtonText}>Share</Text>
                    </TouchableOpacity>
                  </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Modals */}
      {renderSaveModal()}
      {renderTemplateModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  resumeSection: {
    marginVertical: 16,
  },
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
  },
  resumeName: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 14,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    marginLeft: 8,
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
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 16,
  },
  outputContainer: {
    padding: 16,
    paddingTop: 0,
  },
  coverLetterOutput: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  coverLetterText: {
    fontSize: 16,
    lineHeight: 24,
  },
  outputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 10,
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 12,
    padding: 20,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
  saveButton: {
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
});
