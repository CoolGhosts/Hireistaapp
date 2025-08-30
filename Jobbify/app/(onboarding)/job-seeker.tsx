import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as DocumentPicker from 'expo-document-picker';
import { uploadResume, ResumeFile } from '@/services/supabaseResumeService';
import { supabase } from '@/lib/supabase';

// Define the onboarding steps
type OnboardingStep = 'basic-info' | 'experience' | 'education' | 'skills' | 'resume';

export default function JobSeekerOnboarding() {
  const { theme, user } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  
  // State for current step
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('basic-info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for form data
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    bio: '',
    phone: '',
    location: '',
    photoUrl: '',
  });
  
  const [experiences, setExperiences] = useState([
    { id: '1', title: '', company: '', startDate: '', endDate: '', description: '', current: false }
  ]);
  
  const [educations, setEducations] = useState([
    { id: '1', school: '', degree: '', field: '', startDate: '', endDate: '', description: '', current: false }
  ]);
  
  const [skills, setSkills] = useState([
    { id: '1', name: '', level: 'Beginner' }
  ]);
  

  
  const [resumeFile, setResumeFile] = useState<ResumeFile | null>(null);
  
  // Function to handle step navigation
  const goToNextStep = () => {
    switch (currentStep) {
      case 'basic-info':
        setCurrentStep('experience');
        break;
      case 'experience':
        setCurrentStep('education');
        break;
      case 'education':
        setCurrentStep('skills');
        break;
      case 'skills':
        setCurrentStep('resume');
        break;
      case 'resume':
        // Instead of completing onboarding, navigate to career preferences
        router.push('/(modals)/job-preferences?onboarding=true');
        break;
    }
  };
  
  const goToPreviousStep = () => {
    switch (currentStep) {
      case 'experience':
        setCurrentStep('basic-info');
        break;
      case 'education':
        setCurrentStep('experience');
        break;
      case 'skills':
        setCurrentStep('education');
        break;
      case 'resume':
        setCurrentStep('skills');
        break;
    }
  };
  
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
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };
  
  // Function to handle form submission - now only saves job seeker data but doesn't mark onboarding as complete
  // The career preferences screen will mark onboarding as complete
  const completeOnboarding = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get the current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Upload resume if available
      let resumeUrl = null;
      if (resumeFile) {
        const uploadedResume = await uploadResume(resumeFile, true); // Set as primary
        resumeUrl = uploadedResume.file_url;
      }
      
      // Update job_seeker_profiles
      const { error: profileError } = await supabase
        .from('job_seeker_profiles')
        .update({
          title: basicInfo.title,
          bio: basicInfo.bio,
          phone: basicInfo.phone,
          location: basicInfo.location,
          photo_url: basicInfo.photoUrl,
          resume_url: resumeUrl,
          preferences: { skills: skills.map(s => s.name).filter(Boolean) },
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
        
      if (profileError) throw profileError;
      
      // Add experiences
      if (experiences.length > 0) {
        for (const exp of experiences) {
          if (exp.title && exp.company) {
            const { error: expError } = await supabase
              .from('experiences')
              .insert({
                user_id: currentUser.id,
                title: exp.title,
                company: exp.company,
                start_date: exp.startDate,
                end_date: exp.endDate || null,
                description: exp.description,
                is_current: exp.current,
              });
              
            if (expError) throw expError;
          }
        }
      }
      
      // Add educations
      if (educations.length > 0) {
        for (const edu of educations) {
          if (edu.school && edu.degree) {
            const { error: eduError } = await supabase
              .from('educations')
              .insert({
                user_id: currentUser.id,
                school: edu.school,
                degree: edu.degree,
                field: edu.field,
                start_date: edu.startDate,
                end_date: edu.endDate || null,
                description: edu.description,
                is_current: edu.current,
              });
              
            if (eduError) throw eduError;
          }
        }
      }
      
      // Add skills
      for (const skill of skills) {
        if (skill.name) {
          const { error: skillError } = await supabase
            .from('user_skills')
            .insert({
              user_id: currentUser.id,
              skill_name: skill.name,
              proficiency_level: skill.level,
            });
            
          if (skillError) throw skillError;
        }
      }
      
      // Navigate to home screen
      router.replace('/(tabs)/home');
      
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to add items to arrays
  const addExperience = () => {
    setExperiences([
      ...experiences,
      { id: Date.now().toString(), title: '', company: '', startDate: '', endDate: '', description: '', current: false }
    ]);
  };
  
  const addEducation = () => {
    setEducations([
      ...educations,
      { id: Date.now().toString(), school: '', degree: '', field: '', startDate: '', endDate: '', description: '', current: false }
    ]);
  };
  
  const addSkill = () => {
    setSkills([
      ...skills,
      { id: Date.now().toString(), name: '', level: 'Beginner' }
    ]);
  };
  
  // Helper function to update experience
  const updateExperience = (id: string, field: string, value: string | boolean) => {
    setExperiences(experiences.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };
  
  // Helper function to update education
  const updateEducation = (id: string, field: string, value: string | boolean) => {
    setEducations(educations.map(edu => 
      edu.id === id ? { ...edu, [field]: value } : edu
    ));
  };
  
  // Helper function to update skill
  const updateSkill = (id: string, field: string, value: string) => {
    setSkills(skills.map(skill => 
      skill.id === id ? { ...skill, [field]: value } : skill
    ));
  };
  

  
  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 'basic-info':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>Basic Information</Text>
            <Text style={[styles.stepDescription, { color: themeColors.textSecondary }]}>
              Let's start with some basic information about you.
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Professional Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="e.g. Frontend Developer"
                placeholderTextColor={themeColors.textSecondary}
                value={basicInfo.title}
                onChangeText={(text) => setBasicInfo({ ...basicInfo, title: text })}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Bio</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="Tell us about yourself"
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={4}
                value={basicInfo.bio}
                onChangeText={(text) => setBasicInfo({ ...basicInfo, bio: text })}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="e.g. +1 (555) 123-4567"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="phone-pad"
                value={basicInfo.phone}
                onChangeText={(text) => setBasicInfo({ ...basicInfo, phone: text })}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: themeColors.text }]}>Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                placeholder="e.g. New York, NY"
                placeholderTextColor={themeColors.textSecondary}
                value={basicInfo.location}
                onChangeText={(text) => setBasicInfo({ ...basicInfo, location: text })}
              />
            </View>
          </View>
        );
        
      case 'experience':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>Work Experience</Text>
            <Text style={[styles.stepDescription, { color: themeColors.textSecondary }]}>
              Add your work experience to help employers understand your background.
            </Text>
            
            {experiences.map((exp, index) => (
              <View key={exp.id} style={styles.cardContainer}>
                <Text style={[styles.cardTitle, { color: themeColors.text }]}>Experience {index + 1}</Text>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: themeColors.text }]}>Job Title</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="e.g. Frontend Developer"
                    placeholderTextColor={themeColors.textSecondary}
                    value={exp.title}
                    onChangeText={(text) => updateExperience(exp.id, 'title', text)}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: themeColors.text }]}>Company</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="e.g. Acme Inc."
                    placeholderTextColor={themeColors.textSecondary}
                    value={exp.company}
                    onChangeText={(text) => updateExperience(exp.id, 'company', text)}
                  />
                </View>
                
                <View style={styles.rowContainer}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: themeColors.text }]}>Start Date</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                      placeholder="MM/YYYY"
                      placeholderTextColor={themeColors.textSecondary}
                      value={exp.startDate}
                      onChangeText={(text) => updateExperience(exp.id, 'startDate', text)}
                    />
                  </View>
                  
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.label, { color: themeColors.text }]}>End Date</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                      placeholder="MM/YYYY"
                      placeholderTextColor={themeColors.textSecondary}
                      value={exp.endDate}
                      onChangeText={(text) => updateExperience(exp.id, 'endDate', text)}
                      editable={!exp.current}
                    />
                  </View>
                </View>
                
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => updateExperience(exp.id, 'current', !exp.current)}
                  >
                    {exp.current && (
                      <FontAwesome name="check" size={16} color={themeColors.tint} />
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.checkboxLabel, { color: themeColors.text }]}>I currently work here</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: themeColors.text }]}>Description</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="Describe your responsibilities and achievements"
                    placeholderTextColor={themeColors.textSecondary}
                    multiline
                    numberOfLines={4}
                    value={exp.description}
                    onChangeText={(text) => updateExperience(exp.id, 'description', text)}
                  />
                </View>
              </View>
            ))}
            
            <TouchableOpacity
              style={[styles.addButton, { borderColor: themeColors.tint }]}
              onPress={addExperience}
            >
              <FontAwesome name="plus" size={16} color={themeColors.tint} style={styles.addButtonIcon} />
              <Text style={[styles.addButtonText, { color: themeColors.tint }]}>Add Another Experience</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'education':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>Education</Text>
            <Text style={[styles.stepDescription, { color: themeColors.textSecondary }]}>
              Add your educational background.
            </Text>
            
            {educations.map((edu, index) => (
              <View key={edu.id} style={styles.cardContainer}>
                <Text style={[styles.cardTitle, { color: themeColors.text }]}>Education {index + 1}</Text>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: themeColors.text }]}>School</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="e.g. University of California"
                    placeholderTextColor={themeColors.textSecondary}
                    value={edu.school}
                    onChangeText={(text) => updateEducation(edu.id, 'school', text)}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: themeColors.text }]}>Degree</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="e.g. Bachelor of Science"
                    placeholderTextColor={themeColors.textSecondary}
                    value={edu.degree}
                    onChangeText={(text) => updateEducation(edu.id, 'degree', text)}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: themeColors.text }]}>Field of Study</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="e.g. Computer Science"
                    placeholderTextColor={themeColors.textSecondary}
                    value={edu.field}
                    onChangeText={(text) => updateEducation(edu.id, 'field', text)}
                  />
                </View>
                
                <View style={styles.rowContainer}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.label, { color: themeColors.text }]}>Start Date</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                      placeholder="MM/YYYY"
                      placeholderTextColor={themeColors.textSecondary}
                      value={edu.startDate}
                      onChangeText={(text) => updateEducation(edu.id, 'startDate', text)}
                    />
                  </View>
                  
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.label, { color: themeColors.text }]}>End Date</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                      placeholder="MM/YYYY"
                      placeholderTextColor={themeColors.textSecondary}
                      value={edu.endDate}
                      onChangeText={(text) => updateEducation(edu.id, 'endDate', text)}
                      editable={!edu.current}
                    />
                  </View>
                </View>
                
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => updateEducation(edu.id, 'current', !edu.current)}
                  >
                    {edu.current && (
                      <FontAwesome name="check" size={16} color={themeColors.tint} />
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.checkboxLabel, { color: themeColors.text }]}>I'm currently studying here</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: themeColors.text }]}>Description</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="Add any additional information"
                    placeholderTextColor={themeColors.textSecondary}
                    multiline
                    numberOfLines={4}
                    value={edu.description}
                    onChangeText={(text) => updateEducation(edu.id, 'description', text)}
                  />
                </View>
              </View>
            ))}
            
            <TouchableOpacity
              style={[styles.addButton, { borderColor: themeColors.tint }]}
              onPress={addEducation}
            >
              <FontAwesome name="plus" size={16} color={themeColors.tint} style={styles.addButtonIcon} />
              <Text style={[styles.addButtonText, { color: themeColors.tint }]}>Add Another Education</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'skills':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>Skills</Text>
            <Text style={[styles.stepDescription, { color: themeColors.textSecondary }]}>
              Add your skills to help employers find you.
            </Text>
            
            {skills.map((skill, index) => (
              <View key={skill.id} style={styles.skillContainer}>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: themeColors.text }]}>Skill {index + 1}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: themeColors.backgroundSecondary, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="e.g. JavaScript"
                    placeholderTextColor={themeColors.textSecondary}
                    value={skill.name}
                    onChangeText={(text) => updateSkill(skill.id, 'name', text)}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: themeColors.text }]}>Proficiency Level</Text>
                  <View style={styles.levelContainer}>
                    {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.levelButton,
                          skill.level === level && styles.selectedLevelButton,
                          skill.level === level && { backgroundColor: themeColors.tint }
                        ]}
                        onPress={() => updateSkill(skill.id, 'level', level)}
                      >
                        <Text
                          style={[
                            styles.levelButtonText,
                            skill.level === level && styles.selectedLevelButtonText,
                            { color: skill.level === level ? '#fff' : themeColors.text }
                          ]}
                        >
                          {level}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            ))}
            
            <TouchableOpacity
              style={[styles.addButton, { borderColor: themeColors.tint }]}
              onPress={addSkill}
            >
              <FontAwesome name="plus" size={16} color={themeColors.tint} style={styles.addButtonIcon} />
              <Text style={[styles.addButtonText, { color: themeColors.tint }]}>Add Another Skill</Text>
            </TouchableOpacity>
          </View>
        );
        

        
      case 'resume':
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: themeColors.text }]}>Resume Upload</Text>
            <Text style={[styles.stepDescription, { color: themeColors.textSecondary }]}>
              Upload your resume to help employers learn more about you.
            </Text>
            
            <View style={[styles.resumeContainer, { backgroundColor: themeColors.backgroundSecondary }]}>
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
                    Drag & drop your resume here or click to browse
                  </Text>
                  <Text style={[styles.resumeUploadSubtext, { color: themeColors.textSecondary }]}>
                    Supported formats: PDF, DOC, DOCX
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={[styles.resumeTip, { color: themeColors.textSecondary }]}>
              Tip: Make sure your resume is up-to-date and highlights your most relevant skills and experiences.
            </Text>
          </View>
        );
    }
  };
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Complete Your Profile</Text>
        <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
          Step {['basic-info', 'experience', 'education', 'skills', 'resume'].indexOf(currentStep) + 1} of 5
        </Text>
      </View>
      
      {renderStep()}
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <View style={styles.buttonContainer}>
        {currentStep !== 'basic-info' && (
          <TouchableOpacity
            style={[styles.backButton, { borderColor: themeColors.border }]}
            onPress={goToPreviousStep}
            disabled={loading}
          >
            <Text style={[styles.backButtonText, { color: themeColors.text }]}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: themeColors.tint }]}
          onPress={goToNextStep}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === 'resume' ? (loading ? 'Completing...' : 'Complete') : (loading ? 'Saving...' : 'Next')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  checkboxGroup: {
    marginTop: 8,
  },
  cardContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  addButtonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  skillContainer: {
    marginBottom: 16,
  },
  levelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  levelButton: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedLevelButton: {
    borderColor: 'transparent',
  },
  levelButtonText: {
    fontSize: 14,
  },
  selectedLevelButtonText: {
    fontWeight: 'bold',
  },
  resumeContainer: {
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  resumeTip: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flex: 2,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
});