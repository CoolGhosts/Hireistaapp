import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, FlatList, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useAppContext } from '../../../context';
import { LightTheme, DarkTheme } from '../../../constants';
import { FontAwesome } from '@expo/vector-icons';

interface Skill {
  name: string;
  level: number; // 1-10 scale
  category: 'technical' | 'soft' | 'industry';
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  link: string;
  type: 'course' | 'practice' | 'certification' | 'book';
}

interface AnalysisResult {
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  marketInsights: string[];
  skillBalance: {
    technical: number;
    soft: number;
    industry: number;
  };
}

// Mock user skills data
const mockUserSkills: Skill[] = [
  { name: 'JavaScript', level: 8, category: 'technical' },
  { name: 'React', level: 9, category: 'technical' },
  { name: 'Node.js', level: 6, category: 'technical' },
  { name: 'TypeScript', level: 7, category: 'technical' },
  { name: 'HTML/CSS', level: 9, category: 'technical' },
  { name: 'UI/UX Design', level: 5, category: 'technical' },
  { name: 'RESTful APIs', level: 8, category: 'technical' },
  { name: 'Git', level: 7, category: 'technical' },
  { name: 'Communication', level: 8, category: 'soft' },
  { name: 'Teamwork', level: 9, category: 'soft' },
  { name: 'Problem Solving', level: 8, category: 'soft' },
  { name: 'Time Management', level: 6, category: 'soft' },
  { name: 'Leadership', level: 5, category: 'soft' },
  { name: 'SaaS Industry', level: 4, category: 'industry' },
  { name: 'E-commerce', level: 3, category: 'industry' },
  { name: 'Healthcare IT', level: 2, category: 'industry' },
];

// Mock analysis result
const mockAnalysisResult: AnalysisResult = {
  strengths: [
    'Strong frontend development skills (React, JavaScript, HTML/CSS)',
    'Good collaboration abilities (Teamwork, Communication)',
    'Solid technical foundation with APIs and version control',
    'Problem-solving skills are well-developed'
  ],
  weaknesses: [
    'Limited industry-specific knowledge (SaaS, E-commerce, Healthcare)',
    'Room for improvement in UI/UX Design skills',
    'Leadership skills could be enhanced',
    'Backend development skills (Node.js) could be strengthened'
  ],
  recommendations: [
    {
      id: '1',
      title: 'Advanced Node.js Development',
      description: 'Strengthen your backend skills with this comprehensive Node.js course covering advanced concepts, architecture, and performance optimization.',
      link: 'https://example.com/nodejs-course',
      type: 'course'
    },
    {
      id: '2',
      title: 'UI/UX Design Principles',
      description: 'Learn fundamental design principles and user experience concepts to enhance your frontend development with thoughtful, user-centric design.',
      link: 'https://example.com/uiux-course',
      type: 'course'
    },
    {
      id: '3',
      title: 'AWS Certified Developer',
      description: 'Get certified in cloud development to broaden your skillset and open up more job opportunities in modern tech stacks.',
      link: 'https://example.com/aws-cert',
      type: 'certification'
    },
    {
      id: '4',
      title: 'Tech Leadership: Team Management',
      description: 'Develop your leadership skills with this practical guide to managing technical teams and projects effectively.',
      link: 'https://example.com/tech-leadership',
      type: 'book'
    },
  ],
  marketInsights: [
    'Your frontend skills are in high demand, with React developers earning 15% above market average',
    'Consider specializing in a specific industry to increase job prospects',
    'Adding cloud computing skills would complement your current technical abilities',
    'Employers increasingly value soft skills - your teamwork is a strong selling point'
  ],
  skillBalance: {
    technical: 74, // percentage
    soft: 72,
    industry: 30,
  }
};

export default function SkillAnalyzerScreen() {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  
  const [userSkills, setUserSkills] = useState<Skill[]>(mockUserSkills);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'strengths' | 'improve' | 'insights'>('strengths');
  
  // Start skill analysis
  const startAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    // Simulate API delay
    setTimeout(() => {
      setAnalysisResult(mockAnalysisResult);
      setIsAnalyzing(false);
    }, 2500);
  };
  
  // Calculate skill category color
  const getCategoryColor = (category: Skill['category']) => {
    switch (category) {
      case 'technical':
        return '#4285F4'; // Blue
      case 'soft':
        return '#EA4335'; // Red
      case 'industry':
        return '#34A853'; // Green
      default:
        return themeColors.tint;
    }
  };
  
  // Format skill level label
  const getSkillLevelLabel = (level: number) => {
    if (level >= 9) return 'Expert';
    if (level >= 7) return 'Advanced';
    if (level >= 5) return 'Intermediate';
    if (level >= 3) return 'Basic';
    return 'Beginner';
  };
  
  // Render skill item
  const renderSkillItem = ({ item }: { item: Skill }) => (
    <View style={[styles.skillItem, { backgroundColor: themeColors.card }]}>
      <View style={styles.skillHeader}>
        <Text style={[styles.skillName, { color: themeColors.text }]}>{item.name}</Text>
        <View 
          style={[
            styles.categoryBadge, 
            { backgroundColor: `${getCategoryColor(item.category)}20` }
          ]}
        >
          <Text 
            style={[styles.categoryText, { color: getCategoryColor(item.category) }]}
          >
            {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.skillLevelContainer}>
        <View style={[styles.skillLevelBar, { backgroundColor: themeColors.border }]}>
          <View 
            style={[
              styles.skillLevelFill, 
              { 
                width: `${item.level * 10}%`, 
                backgroundColor: getCategoryColor(item.category)
              }
            ]} 
          />
        </View>
        <Text style={[styles.skillLevelText, { color: themeColors.textSecondary }]}>
          {getSkillLevelLabel(item.level)}
        </Text>
      </View>
    </View>
  );
  
  // Render recommendation item
  const renderRecommendationItem = ({ item }: { item: Recommendation }) => (
    <TouchableOpacity style={[styles.recommendationItem, { backgroundColor: themeColors.card }]}>
      <View style={styles.recommendationHeader}>
        <Text style={[styles.recommendationTitle, { color: themeColors.text }]}>{item.title}</Text>
        <View 
          style={[
            styles.recommendationType, 
            { backgroundColor: themeColors.tint + '20' }
          ]}
        >
          <Text style={[styles.recommendationTypeText, { color: themeColors.tint }]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
      </View>
      <Text 
        style={[styles.recommendationDescription, { color: themeColors.textSecondary }]}
        numberOfLines={2}
      >
        {item.description}
      </Text>
      <View style={styles.recommendationFooter}>
        <TouchableOpacity style={[styles.learnMoreButton, { backgroundColor: themeColors.tint }]}>
          <Text style={styles.learnMoreText}>Learn More</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  // Render the skills overview section
  const renderSkillsOverview = () => (
    <View style={styles.skillsOverviewSection}>
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Your Skills</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skillCategoriesScroll}>
        <View style={styles.skillCategories}>
          {Object.entries(analysisResult?.skillBalance || {}).map(([category, percentage]) => (
            <View key={category} style={styles.skillCategoryItem}>
              <View style={styles.scoreRingContainer}>
                <View 
                  style={[
                    styles.scoreRing, 
                    { 
                      borderColor: getCategoryColor(category as Skill['category']),
                      borderWidth: 8,
                    }
                  ]}
                >
                  <Text 
                    style={[
                      styles.scoreText, 
                      { color: getCategoryColor(category as Skill['category']) }
                    ]}
                  >
                    {percentage}%
                  </Text>
                </View>
              </View>
              <Text style={[styles.categoryLabel, { color: themeColors.text }]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      
      <FlatList
        data={userSkills}
        renderItem={renderSkillItem}
        keyExtractor={(item) => item.name}
        scrollEnabled={false}
        style={styles.skillsList}
      />
    </View>
  );
  
  // Render analysis tabs
  const renderAnalysisTabs = () => (
    <View style={[styles.tabsContainer, { borderBottomColor: themeColors.border }]}>
      <TouchableOpacity 
        style={[
          styles.tab, 
          activeTab === 'strengths' && [styles.activeTab, { borderBottomColor: themeColors.success }]
        ]} 
        onPress={() => setActiveTab('strengths')}
      >
        <Text 
          style={[
            styles.tabText, 
            { color: activeTab === 'strengths' ? themeColors.success : themeColors.textSecondary }
          ]}
        >
          Strengths
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.tab, 
          activeTab === 'improve' && [styles.activeTab, { borderBottomColor: themeColors.error }]
        ]} 
        onPress={() => setActiveTab('improve')}
      >
        <Text 
          style={[
            styles.tabText, 
            { color: activeTab === 'improve' ? themeColors.error : themeColors.textSecondary }
          ]}
        >
          Areas to Improve
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.tab, 
          activeTab === 'insights' && [styles.activeTab, { borderBottomColor: themeColors.info }]
        ]} 
        onPress={() => setActiveTab('insights')}
      >
        <Text 
          style={[
            styles.tabText, 
            { color: activeTab === 'insights' ? themeColors.info : themeColors.textSecondary }
          ]}
        >
          Market Insights
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  // Render analysis content based on active tab
  const renderAnalysisContent = () => {
    if (!analysisResult) return null;
    
    switch (activeTab) {
      case 'strengths':
        return (
          <View style={styles.tabContent}>
            {analysisResult.strengths.map((strength, index) => (
              <View 
                key={index} 
                style={[styles.analysisItem, { backgroundColor: themeColors.card, borderLeftColor: themeColors.success }]}
              >
                <FontAwesome name="check-circle" size={20} color={themeColors.success} style={styles.analysisIcon} />
                <Text style={[styles.analysisText, { color: themeColors.text }]}>{strength}</Text>
              </View>
            ))}
          </View>
        );
      
      case 'improve':
        return (
          <View style={styles.tabContent}>
            {analysisResult.weaknesses.map((weakness, index) => (
              <View 
                key={index} 
                style={[styles.analysisItem, { backgroundColor: themeColors.card, borderLeftColor: themeColors.error }]}
              >
                <FontAwesome name="exclamation-circle" size={20} color={themeColors.error} style={styles.analysisIcon} />
                <Text style={[styles.analysisText, { color: themeColors.text }]}>{weakness}</Text>
              </View>
            ))}
            
            <Text style={[styles.recommendationsTitle, { color: themeColors.text }]}>Recommended Courses</Text>
            <FlatList
              data={analysisResult.recommendations}
              renderItem={renderRecommendationItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationsList}
            />
          </View>
        );
      
      case 'insights':
        return (
          <View style={styles.tabContent}>
            {analysisResult.marketInsights.map((insight, index) => (
              <View 
                key={index} 
                style={[styles.analysisItem, { backgroundColor: themeColors.card, borderLeftColor: themeColors.info }]}
              >
                <FontAwesome name="lightbulb-o" size={20} color={themeColors.info} style={styles.analysisIcon} />
                <Text style={[styles.analysisText, { color: themeColors.text }]}>{insight}</Text>
              </View>
            ))}
          </View>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ title: 'Skill Analyzer' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!analysisResult && !isAnalyzing ? (
          <View style={styles.startSection}>
            <View style={[styles.startCard, { backgroundColor: themeColors.card }]}>
              <FontAwesome name="line-chart" size={50} color={themeColors.tint} style={styles.startIcon} />
              <Text style={[styles.startTitle, { color: themeColors.text }]}>Analyze Your Skills</Text>
              <Text style={[styles.startDescription, { color: themeColors.textSecondary }]}>
                Get insights on your strengths and weaknesses, and personalized recommendations to advance your career.
              </Text>
              
              <TouchableOpacity 
                style={[styles.startButton, { backgroundColor: themeColors.tint }]}
                onPress={startAnalysis}
              >
                <Text style={styles.startButtonText}>Analyze My Skills</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isAnalyzing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.tint} />
            <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
              Analyzing your skills and preparing insights...
            </Text>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            {renderSkillsOverview()}
            {renderAnalysisTabs()}
            {renderAnalysisContent()}
          </View>
        )}
      </ScrollView>
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
  startSection: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  startCard: {
    width: '100%',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  startIcon: {
    marginBottom: 16,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  startButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  resultsContainer: {
    padding: 16,
  },
  skillsOverviewSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  skillCategoriesScroll: {
    marginBottom: 16,
  },
  skillCategories: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  skillCategoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  scoreRingContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  skillsList: {
    marginTop: 8,
  },
  skillItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skillName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  skillLevelContainer: {
    marginBottom: 4,
  },
  skillLevelBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  skillLevelFill: {
    height: 8,
    borderRadius: 4,
  },
  skillLevelText: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    marginBottom: 24,
  },
  analysisItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  analysisIcon: {
    marginRight: 12,
    marginTop: 1,
  },
  analysisText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
  },
  recommendationsList: {
    paddingBottom: 8,
  },
  recommendationItem: {
    width: Dimensions.get('window').width * 0.75,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  recommendationType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendationTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  recommendationDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  recommendationFooter: {
    alignItems: 'flex-start',
  },
  learnMoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  learnMoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
