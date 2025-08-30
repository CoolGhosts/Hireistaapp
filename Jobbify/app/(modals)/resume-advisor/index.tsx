import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image, FlatList, Dimensions, Modal, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../../../context';
import { LightTheme, DarkTheme } from '../../../constants';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { ResumeFile } from '../../../services/supabaseResumeService';
import { getDeepSeekResumeFeedback } from '../../../services/deepseekService';
import { extractTextFromFile, analyzeResumeWithGemini, testApiConnection } from '../../../services/fileTextExtractService';
import { uploadResume, analyzeResume as analyzeResumeInSupabase, getUserResumes, StoredResume } from '../../../services/supabaseResumeService';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import ScoreDonut from '../../../components/ScoreDonut';
import { companyImages } from '../../../constants/companyImages';

// Define or expand types for JobMatch
interface JobMatch {
  id: string;
  title: string;
  company: string;
  matchScore?: number;
  missingSkills?: string[];
  // Add missing properties
  salary?: {
    min?: number;
    max?: number;
    average?: number;
  };
  location?: string;
  type?: string;
  experienceLevel?: string;
}

// Define our own custom ResumeAnalysis type to avoid conflicts
interface CustomResumeAnalysis {
  overallSummary: string;
  overallScore: number | null;
  strengths: string[];
  areasForImprovement: string[];
  sections: any[];
  keySkills: any[];
  jobMatches: JobMatch[];
  visualSuggestions: any[];
}

// Simple BackButton component
const BackButton = () => {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
      <FontAwesome name="chevron-left" size={18} color="#007AFF" />
    </TouchableOpacity>
  );
};

const getStyles = (themeColors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  content: {
    flex: 1,
    padding: 0,
    backgroundColor: themeColors.background,
  },
  uploadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  uploadCard: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    backgroundColor: themeColors.background,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: themeColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  uploadIcon: {
    marginBottom: 18,
  },
  uploadTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.text,
    fontFamily: 'Inter',
    marginBottom: 10,
  },
  uploadText: {
    fontSize: 15,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 22,
    marginTop: 18,
    shadowColor: '#4285F4',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  uploadButtonIcon: {
    marginRight: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Inter',
    marginLeft: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.card,
    borderRadius: 16,
    padding: 12,
    margin: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text,
    fontFamily: 'Inter',
  },
  fileSize: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  fileAction: {
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileActionText: {
    fontSize: 14,
    color: '#4285F4',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: themeColors.border,
    borderRadius: 30,
    padding: 4,
    marginVertical: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 30,
  },
  activeTabButton: {
    backgroundColor: themeColors.tint,
  },
  tabLabel: {
    fontSize: 16,
    color: themeColors.textSecondary,
    fontFamily: 'Inter',
  },
  activeTabLabel: {
    color: themeColors.card,
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: themeColors.textSecondary,
  },
  emptyText: {
    fontSize: 16,
    color: themeColors.textSecondary,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: themeColors.card,
    borderRadius: 20,
    padding: 22,
    margin: 16,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.text,
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 8,
  },
  scoreNumber: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#4285F4',
    fontFamily: 'Inter',
  },
  scoreMax: {
    fontSize: 18,
    color: themeColors.textSecondary,
    marginLeft: 2,
  },
  scoreBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: themeColors.border,
    borderRadius: 4,
    marginTop: 8,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#4285F4',
    borderRadius: 4,
  },
  infoSection: {
    backgroundColor: themeColors.card,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    color: themeColors.text,
    fontSize: 15,
    fontFamily: 'Inter',
  },
  detailSection: {
    backgroundColor: themeColors.card,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.text,
    fontFamily: 'Inter',
    flex: 1,
  },
  detailScore: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailScoreText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailFeedback: {
    fontSize: 14,
    color: themeColors.text,
    marginBottom: 10,
  },
  suggestionsContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: themeColors.textSecondary,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionIcon: {
    marginRight: 6,
  },
  suggestionText: {
    fontSize: 14,
    color: themeColors.text,
    flex: 1,
  },
  skillItem: {
    marginBottom: 12,
  },
  skillName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: themeColors.text,
    fontFamily: 'Inter',
  },
  skillBarContainer: {
    height: 6,
    backgroundColor: themeColors.border,
    borderRadius: 3,
    marginBottom: 5,
    overflow: 'hidden',
  },
  skillBar: {
    height: '100%',
    backgroundColor: '#4285F4',
  },
  skillLevel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginBottom: 3,
  },
  skillFeedback: {
    fontSize: 12,
    color: themeColors.textSecondary,
    fontStyle: 'italic',
  },
  jobCard: {
    backgroundColor: 'transparent', // Use gradient background
    borderRadius: 20,
    padding: 20,
    marginVertical: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  jobTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.text,
    marginBottom: 4,
  },
  jobCompany: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  jobMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jobMatchScore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobMatchPercent: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  jobDetails: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  jobDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  jobDetailIcon: {
    marginRight: 6,
  },
  jobDetailText: {
    fontSize: 14,
    color: themeColors.text,
  },
  jobSkillsSection: {
    marginBottom: 12,
  },
  jobSkillsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: themeColors.textSecondary,
  },
  jobSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  jobSkillBadge: {
    backgroundColor: '#222d',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  recommendedSkill: {
    backgroundColor: '#4285F4',
  },
  jobSkillText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    fontFamily: 'Inter',
  },
  jobActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  jobActionButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  jobActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 5,
  },
  secondaryButtonText: {
    color: '#4285F4',
  },
  missingSkillChip: {
    backgroundColor: '#FF9800',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  missingSkillText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    fontFamily: 'Inter',
  },
  keySkillsContainer: {
    flexDirection: 'column',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  companyLogo: {
    width: '100%',
    height: 100,
    resizeMode: 'contain',
    marginBottom: 16,
    alignSelf: 'center',
  },
  applyButton: {
    backgroundColor: themeColors.applyButtonColor,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  applyButtonText: {
    color: themeColors.card,
    fontSize: 16,
    fontWeight: '600',
  },
  scoreSummary: {
    fontSize: 14,
    color: themeColors.text,
    fontFamily: 'Inter',
    marginTop: 8,
  },

});

export default function ResumeAdvisorScreen() {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const styles = getStyles(themeColors);
  const router = useRouter();

  const [resumeFile, setResumeFile] = useState<ResumeFile | null>(null);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CustomResumeAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  


  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Test API connectivity on component mount
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const isConnected = await testApiConnection();
        setApiConnected(isConnected);
        console.log('API connection status:', isConnected ? 'Connected' : 'Disconnected');
      } catch (error) {
        console.error('Error checking API connection:', error);
        setApiConnected(false);
      }
    };
    
    checkApiConnection();
  }, []);

  // Function to navigate to cover letter generator with job details
  const navigateToCoverLetterGenerator = (job: any) => {
    router.push({
      pathname: '/(modals)/cover-letter',
      params: {
        company: job.company,
        position: job.title,
      }
    });
  };

  // Function to handle resume upload or replacement
  const handleResumeUpload = async () => {
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
        const resumeFileObj: ResumeFile = {
          name: file.name,
          uri: file.uri,
          size: file.size || 0,
          mimeType: file.mimeType || '',
          lastModified: Date.now(),
        };

        setResumeFile(resumeFileObj);
        setResumeUploaded(true);
        setAnalysis(null); // Clear previous analysis before re-analyzing
        analyzeResume(resumeFileObj);
      }
    } catch (error) {
      console.error('Error picking resume:', error);
      Alert.alert('Error', 'There was a problem accessing your files. Please try again.');
    }
  };

  // Function to analyze the resume with Gemini backend
  const analyzeResume = async (file: ResumeFile) => {
    try {
      setAnalyzing(true);
      
      // Check API connection first
      if (apiConnected === false) {
        const isConnected = await testApiConnection();
        setApiConnected(isConnected);
        
        if (!isConnected) {
          Alert.alert(
            'API Connection Error',
            'Cannot connect to the resume analysis API. Please check your network connection and ensure the API server is running.',
            [{ text: 'OK' }]
          );
          setAnalyzing(false);
          return;
        }
      }
      
      // Extract text from PDF/DOCX using cloud service
      const extractedText = await extractTextFromFile({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType || '',
      });
      // Call Gemini backend for AI-powered feedback
      const geminiResult = await analyzeResumeWithGemini(extractedText);
      let parsed = null;
      // Defensive: Check if geminiResult is a string before calling .match
      if (typeof geminiResult === 'string') {
        const jsonMatch = geminiResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0].replace(/'/g, '"'));
          } catch (e) {
            parsed = null;
          }
        }
      } else if (typeof geminiResult === 'object' && geminiResult !== null) {
        parsed = geminiResult;
      }
      if (!parsed) throw new Error('Invalid response from backend');
      // Map new schema to analysis state
      setAnalysis({
        overallSummary: parsed.overallSummary || '',
        overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : null,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement : [],
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
        keySkills: Array.isArray(parsed.keySkills) ? parsed.keySkills : [],
        jobMatches: Array.isArray(parsed.jobMatches) ? parsed.jobMatches : [],
        visualSuggestions: Array.isArray(parsed.visualSuggestions) ? parsed.visualSuggestions : [],
      });
    } catch (error) {
      console.error('Error analyzing resume:', error);
      Alert.alert('Analysis Error', 'There was a problem analyzing your resume. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };







  // Render the overview tab
  const renderOverviewTab = () => {
    if (!analysis) {
      return (
        <View style={styles.loadingContainer}>
          {analyzing ? (
            <>
              <ActivityIndicator size="large" color="#4285F4" />
              <Text style={styles.loadingText}>Analyzing your resume...</Text>
            </>
          ) : (
            <Text style={styles.emptyText}>Upload your resume to get started</Text>
          )}
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.scoreCard}>
          <Text style={[styles.scoreTitle, { color: themeColors.text }]}>Resume Score</Text>
          <View style={styles.scoreCircle}>
            <ScoreDonut score={analysis.overallScore ?? 0} size={140} strokeWidth={12} maxScore={10} color={themeColors.tint} />
          </View>
          <Text style={[styles.scoreSummary, { color: themeColors.text }]}>
            {getSummaryForScore(analysis.overallScore ?? 0)}
          </Text>
        </View>

        {/* AI Feedback Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>AI Feedback</Text>
          {Array.isArray(analysis.areasForImprovement) && analysis.areasForImprovement.map((item: string, index: number) => (
            <View key={index} style={styles.infoItem}>
              <FontAwesome name="magic" size={16} color="#8e44ad" style={styles.infoIcon} />
              <Text style={styles.infoText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Strengths</Text>
          {Array.isArray(analysis.strengths) && analysis.strengths.map((strength: string, index: number) => (
            <View key={index} style={styles.infoItem}>
              <FontAwesome name="check-circle" size={16} color="#4285F4" style={styles.infoIcon} />
              <Text style={styles.infoText}>{strength}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Areas to Improve</Text>
          {/* Optionally keep this if you later split AI output into strengths/improvements */}
        </View>

        {Array.isArray(analysis.areasForImprovement) && analysis.areasForImprovement.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Missing Sections</Text>
            {analysis.areasForImprovement.map((section: string, index: number) => (
              <View key={index} style={styles.infoItem}>
                <FontAwesome name="minus-circle" size={16} color="#FF69B4" style={styles.infoIcon} />
                <Text style={styles.infoText}>{section}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // Render the details tab
  const renderDetailsTab = () => {
    if (!analysis) return null;
    return (
      <ScrollView style={styles.tabContent}>
        {Array.isArray(analysis.sections) && analysis.sections.length > 0 ? (
          analysis.sections.map((section: any, index: number) => (
            <View key={index} style={styles.detailSection}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{section.sectionName}</Text>
                <View style={styles.detailScore}>
                  <Text style={styles.detailScoreText}>{typeof section.score === 'number' ? section.score : '-'} /10</Text>
                </View>
              </View>
              <Text style={styles.detailFeedback}>{section.summary}</Text>
              {Array.isArray(section.strengths) && section.strengths.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionTitle}>Strengths</Text>
                  {section.strengths.map((item: string, i: number) => (
                    <View key={i} style={styles.infoItem}>
                      <FontAwesome name="check-circle" size={16} color="#4CAF50" style={styles.infoIcon} />
                      <Text style={styles.infoText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
              {Array.isArray(section.weaknesses) && section.weaknesses.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionTitle}>Weaknesses</Text>
                  {section.weaknesses.map((item: string, i: number) => (
                    <View key={i} style={styles.infoItem}>
                      <FontAwesome name="exclamation-circle" size={16} color="#FF9800" style={styles.infoIcon} />
                      <Text style={styles.infoText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
              {Array.isArray(section.suggestions) && section.suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionTitle}>Suggestions</Text>
                  {section.suggestions.map((item: string, i: number) => (
                    <View key={i} style={styles.infoItem}>
                      <FontAwesome name="lightbulb-o" size={16} color="#4285F4" style={styles.infoIcon} />
                      <Text style={styles.infoText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
              {Array.isArray(section.examples) && section.examples.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionTitle}>Examples</Text>
                  {section.examples.map((item: string, i: number) => (
                    <View key={i} style={styles.infoItem}>
                      <FontAwesome name="star" size={16} color="#FFD700" style={styles.infoIcon} />
                      <Text style={styles.infoText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No section details available.</Text>
        )}
        {/* Key Skills */}
        {Array.isArray(analysis.keySkills) && analysis.keySkills.length > 0 && (
          <View style={styles.keySkillsContainer}>
            <Text style={styles.suggestionTitle}>Key Skills</Text>
            {analysis.keySkills.map((skill: any, index: number) => (
              <View key={index} style={styles.skillItem}>
                <Text style={styles.skillName}>{skill.skill}</Text>
                <View style={styles.skillBarContainer}>
                  <View style={[styles.skillBar, { width: `${(typeof skill.score === 'number' ? skill.score : 0) * 10}%` }]} />
                </View>
                <Text style={styles.skillLevel}>{typeof skill.score === 'number' ? skill.score : '-'} /10</Text>
                {skill.evidence && <Text style={styles.skillFeedback}>{skill.evidence}</Text>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // Render the job matches tab - MODIFIED to include filters
  const renderJobMatchesTab = () => {
    if (!analysis) return null;
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const CARD_WIDTH = SCREEN_WIDTH * 0.8;
    const jobsToDisplay = Array.isArray(analysis.jobMatches) ? analysis.jobMatches : [];
    
    return (
      <View style={{flex: 1}}>
        
        <FlatList
          data={jobsToDisplay}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 }}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No job matches available.</Text>}
          renderItem={({ item: job }) => (
            <LinearGradient
              colors={themeColors.cardGradient}
              style={[styles.jobCard, { width: CARD_WIDTH, marginHorizontal: 8 }]}
            >
              {companyImages[job.company] && (
                <Image source={{uri: companyImages[job.company]}} style={styles.companyLogo} />
              )}
              <View style={styles.jobHeader}>
                <View style={styles.jobTitleContainer}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobCompany}>{job.company}</Text>
                </View>
                <View style={styles.jobMatchScore}>
                  <ScoreDonut 
                    score={typeof job.matchScore === 'number' ? job.matchScore : 0} 
                    size={48} 
                    strokeWidth={5} 
                    color={themeColors.tint} 
                    maxScore={100}
                    showLabel={false}
                  />
                  <Text style={[styles.jobMatchPercent, { color: themeColors.text }]}>
                    {typeof job.matchScore === 'number' ? job.matchScore : 0}%
                  </Text>
                </View>
              </View>
              
              {/* Display job details like salary, location, type */}
              <View style={styles.jobDetails}>
                {job.salary && (
                  <View style={styles.jobDetailItem}>
                    <FontAwesome name="money" size={14} color={themeColors.textSecondary} style={styles.jobDetailIcon} />
                    <Text style={styles.jobDetailText}>
                      ${job.salary.min?.toLocaleString()} - ${job.salary.max?.toLocaleString()}
                    </Text>
                  </View>
                )}
                
                {job.location && (
                  <View style={styles.jobDetailItem}>
                    <FontAwesome name="map-marker" size={14} color={themeColors.textSecondary} style={styles.jobDetailIcon} />
                    <Text style={styles.jobDetailText}>{job.location}</Text>
                  </View>
                )}
                
                {job.type && (
                  <View style={styles.jobDetailItem}>
                    <FontAwesome name="briefcase" size={14} color={themeColors.textSecondary} style={styles.jobDetailIcon} />
                    <Text style={styles.jobDetailText}>{job.type}</Text>
                  </View>
                )}
              </View>
              
              {renderMissingSkills(job)}
              <View style={styles.jobActions}>
                <TouchableOpacity 
                  style={styles.jobActionButton}
                  onPress={() => navigateToCoverLetterGenerator(job)}
                >
                  <FontAwesome name="file-text-o" size={14} color="#fff" />
                  <Text style={styles.jobActionText}>Cover Letter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.jobActionButton, styles.secondaryButton]}>
                  <FontAwesome name="bookmark-o" size={14} color={themeColors.tint} />
                  <Text style={[styles.jobActionText, styles.secondaryButtonText]}>Save</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.applyButton}>
                <Text style={styles.applyButtonText}>Apply Now</Text>
              </TouchableOpacity>
            </LinearGradient>
          )}
        />
      </View>
    );
  };

  // Helper to get a positive summary based on score
  const getSummaryForScore = (score: number): string => {
    if (score >= 9) return "Excellent! Your resume is highly effective.";
    if (score >= 8) return "Great job! Your resume is very strong.";
    if (score >= 7) return "Good work! Your resume is solid with room for small improvements.";
    if (score >= 6) return "Nice start! Your resume has potential for growth.";
    return "Good foundation! Let's build on your resume's strengths.";
  };

  // Render the job filters modal


  // Fix missing skills map with proper types
  const renderMissingSkills = (job: JobMatch) => {
    if (!Array.isArray(job.missingSkills) || job.missingSkills.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionTitle}>Missing Skills</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {job.missingSkills.map((skill: string, idx: number) => (
            <View key={idx} style={styles.missingSkillChip}>
              <Text style={styles.missingSkillText}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Resume Advisor',
          headerLeft: () => <BackButton />,
        }}
      />

      <View style={styles.content}>
        {!resumeUploaded ? (
          <View style={styles.uploadContainer}>
            <LinearGradient colors={themeColors.cardGradient} style={styles.uploadCard}>
              <View style={styles.uploadIconContainer}>
                <FontAwesome name="file-text-o" size={40} color={themeColors.tint} />
              </View>
              <Text style={styles.uploadTitle}>Upload Your Resume</Text>
              <Text style={styles.uploadText}>
                Get personalized feedback, identify areas for improvement, and see matching job opportunities.
              </Text>
              <TouchableOpacity style={styles.uploadButton} onPress={handleResumeUpload}>
                <FontAwesome name="upload" size={14} color="#fff" style={styles.uploadButtonIcon} />
                <Text style={styles.uploadButtonText}>Select Resume File</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <>
            <View style={styles.fileInfo}>
              <FontAwesome name="file-text-o" size={24} color="#4285F4" style={styles.fileIcon} />
              <View style={styles.fileDetails}>
                <Text style={styles.fileName}>{resumeFile?.name}</Text>
                <Text style={styles.fileSize}>{(resumeFile?.size || 0) / 1024 < 1000
                  ? `${Math.round((resumeFile?.size || 0) / 1024)} KB`
                  : `${Math.round((resumeFile?.size || 0) / 1024 / 1024)} MB`}</Text>
              </View>
              <TouchableOpacity style={styles.fileAction} onPress={handleResumeUpload}>
                <FontAwesome name="refresh" size={14} color="#4285F4" />
                <Text style={styles.fileActionText}>Replace</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'overview' && styles.activeTabButton]}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveTab('overview'); }}
              >
                <Text style={[styles.tabLabel, activeTab === 'overview' && styles.activeTabLabel]}>Overview</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'details' && styles.activeTabButton]}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveTab('details'); }}
              >
                <Text style={[styles.tabLabel, activeTab === 'details' && styles.activeTabLabel]}>Section Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'jobs' && styles.activeTabButton]}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveTab('jobs'); }}
              >
                <Text style={[styles.tabLabel, activeTab === 'jobs' && styles.activeTabLabel]}>Job Matches</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'jobs' && renderJobMatchesTab()}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
