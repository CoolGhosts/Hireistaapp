import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView, FlatList, Image, Modal, ActivityIndicator, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useAppContext } from '../../../context';
import { LightTheme, DarkTheme } from '../../../constants';
import { FontAwesome } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Audio from 'expo-av';

interface Question {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'personal' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  jobRoles?: string[];
}

interface Answer {
  questionId: string;
  text: string;
  feedback?: string;
  rating?: number; // 1-5 scale
  audioUri?: string;
  transcription?: string;
}

interface PracticeSession {
  id: string;
  title: string;
  jobTitle: string;
  date: Date;
  questions: Question[];
  answers: Answer[];
  overallFeedback?: string;
}

interface JobRole {
  id: string;
  title: string;
  icon: keyof typeof FontAwesome.glyphMap;
  color: string;
}

// Job role options
const jobRoles: JobRole[] = [
  { id: '1', title: 'Frontend Developer', icon: 'code', color: '#4285F4' },
  { id: '2', title: 'Backend Developer', icon: 'server', color: '#34A853' },
  { id: '3', title: 'UX Designer', icon: 'paint-brush', color: '#EA4335' },
  { id: '4', title: 'Data Scientist', icon: 'bar-chart', color: '#FBBC05' },
  { id: '5', title: 'Product Manager', icon: 'sitemap', color: '#9C27B0' },
  { id: '6', title: 'DevOps Engineer', icon: 'cogs', color: '#00BCD4' },
  { id: '7', title: 'Marketing Specialist', icon: 'bullhorn', color: '#FF9800' },
];

// Mock interview questions
const mockQuestions: Question[] = [
  {
    id: '1',
    question: 'Tell me about yourself and your experience.',
    category: 'personal',
    difficulty: 'easy',
    jobRoles: ['Frontend Developer', 'Backend Developer', 'UX Designer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'Marketing Specialist'],
  },
  {
    id: '2',
    question: 'Describe a challenging project you worked on and how you overcame obstacles.',
    category: 'behavioral',
    difficulty: 'medium',
    jobRoles: ['Frontend Developer', 'Backend Developer', 'UX Designer', 'Data Scientist', 'Product Manager', 'DevOps Engineer'],
  },
  {
    id: '3',
    question: 'How would you explain a complex technical concept to a non-technical person?',
    category: 'behavioral',
    difficulty: 'medium',
    jobRoles: ['Frontend Developer', 'Backend Developer', 'Data Scientist', 'DevOps Engineer'],
  },
  {
    id: '4',
    question: 'What is the difference between let, const, and var in JavaScript?',
    category: 'technical',
    difficulty: 'medium',
    jobRoles: ['Frontend Developer', 'Backend Developer'],
  },
  {
    id: '5',
    question: 'Describe a time when you had a conflict with a team member. How did you resolve it?',
    category: 'situational',
    difficulty: 'hard',
    jobRoles: ['Frontend Developer', 'Backend Developer', 'UX Designer', 'Data Scientist', 'Product Manager', 'DevOps Engineer'],
  },
  {
    id: '6',
    question: 'How would you optimize a slow-performing web application?',
    category: 'technical',
    difficulty: 'hard',
    jobRoles: ['Frontend Developer', 'Backend Developer', 'DevOps Engineer'],
  },
  {
    id: '7',
    question: 'What are your salary expectations for this role?',
    category: 'personal',
    difficulty: 'medium',
    jobRoles: ['Frontend Developer', 'Backend Developer', 'UX Designer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'Marketing Specialist'],
  },
  {
    id: '8',
    question: 'Why do you want to work for our company specifically?',
    category: 'personal',
    difficulty: 'easy',
    jobRoles: ['Frontend Developer', 'Backend Developer', 'UX Designer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'Marketing Specialist'],
  },
  {
    id: '9',
    question: 'Explain how React\'s virtual DOM works and its advantages.',
    category: 'technical',
    difficulty: 'hard',
    jobRoles: ['Frontend Developer'],
  },
  {
    id: '10',
    question: 'Where do you see yourself in five years?',
    category: 'personal',
    difficulty: 'easy',
    jobRoles: ['Frontend Developer', 'Backend Developer', 'UX Designer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'Marketing Specialist'],
  },
];

// Mock feedback for answers
const mockFeedback = [
  'Your answer demonstrates good experience and communication skills. Try to be more specific about achievements with metrics.',
  'Strong explanation of the technical concept. Consider adding a real-world example to make it more relatable.',
  'Good response, but you could improve by focusing more on the resolution rather than the conflict itself.',
  'Excellent technical answer with clear examples. Your knowledge comes across well.',
  'Your answer lacks specificity. Try to provide concrete examples of your experience in similar situations.',
];

export default function InterviewCoachScreen() {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [customJobTitle, setCustomJobTitle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answeredQuestions, setAnsweredQuestions] = useState<Map<string, Answer>>(new Map());
  
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Job titles for quick selection
  const jobTitles = jobRoles.map((jobRole) => jobRole.title);
  
  // Start a practice session with filtered questions
  const startPracticeSession = () => {
    const jobTitle = showCustomInput ? customJobTitle : selectedJobTitle;
    if (!jobTitle) return;
    
    // Filter questions based on job title and pick 5 questions
    // In a real app, this would use AI to select relevant questions
    const filteredQuestions = [...mockQuestions]
      .filter((question) => question.jobRoles?.includes(jobTitle))
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    
    setSelectedQuestions(filteredQuestions);
    setCurrentQuestionIndex(0);
    setAnsweredQuestions(new Map());
    setPracticeMode(true);
    setPracticeComplete(false);
  };
  
  // Submit answer to current question
  const submitAnswer = () => {
    if (!currentAnswer.trim()) return;
    
    const currentQuestion = selectedQuestions[currentQuestionIndex];
    
    // Create a new answer object
    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      text: currentAnswer,
    };
    
    // Update the answered questions map
    const updatedAnswers = new Map(answeredQuestions);
    updatedAnswers.set(currentQuestion.id, newAnswer);
    setAnsweredQuestions(updatedAnswers);
    
    // Move to the next question or complete the session
    if (currentQuestionIndex < selectedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer('');
    } else {
      // Practice session complete
      setPracticeComplete(true);
      
      // Simulate AI generating feedback for each answer
      setTimeout(() => {
        const answersWithFeedback = new Map(updatedAnswers);
        
        updatedAnswers.forEach((answer, questionId) => {
          const feedback = mockFeedback[Math.floor(Math.random() * mockFeedback.length)];
          const rating = Math.floor(Math.random() * 4) + 2; // Random rating between 2-5
          
          answersWithFeedback.set(questionId, {
            ...answer,
            feedback,
            rating,
          });
        });
        
        setAnsweredQuestions(answersWithFeedback);
        setShowFeedback(true);
      }, 1500);
    }
  };
  
  // Reset the practice session
  const resetPractice = () => {
    setPracticeMode(false);
    setPracticeComplete(false);
    setShowFeedback(false);
    setSelectedQuestions([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer('');
    setAnsweredQuestions(new Map());
  };
  
  // Get category styling
  const getCategoryStyle = (category: Question['category']) => {
    switch (category) {
      case 'behavioral':
        return { backgroundColor: '#4285F430', color: '#4285F4' };
      case 'technical':
        return { backgroundColor: '#EA433530', color: '#EA4335' };
      case 'personal':
        return { backgroundColor: '#34A85330', color: '#34A853' };
      case 'situational':
        return { backgroundColor: '#FBBC0530', color: '#FBBC05' };
      default:
        return { backgroundColor: themeColors.tint + '30', color: themeColors.tint };
    }
  };
  
  // Render job title selection
  const renderJobSelection = () => (
    <View style={styles.setupContainer}>
      <Text style={[styles.setupTitle, { color: themeColors.text }]}>
        Interview Practice
      </Text>
      <Text style={[styles.setupDescription, { color: themeColors.textSecondary }]}>
        Select a job position to receive tailored interview questions and AI-powered feedback on your answers.
      </Text>
      
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        Select Job Position
      </Text>
      
      <View style={styles.jobTitleGrid}>
        {jobTitles.map((title) => (
          <TouchableOpacity
            key={title}
            style={[
              styles.jobTitleButton,
              { backgroundColor: themeColors.card },
              selectedJobTitle === title && { backgroundColor: themeColors.tint + '20', borderColor: themeColors.tint }
            ]}
            onPress={() => {
              setSelectedJobTitle(title);
              setShowCustomInput(false);
            }}
          >
            <Text 
              style={[
                styles.jobTitleText, 
                { color: themeColors.text },
                selectedJobTitle === title && { color: themeColors.tint }
              ]}
            >
              {title}
            </Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={[
            styles.jobTitleButton,
            { backgroundColor: themeColors.card },
            showCustomInput && { backgroundColor: themeColors.tint + '20', borderColor: themeColors.tint }
          ]}
          onPress={() => {
            setShowCustomInput(true);
            setSelectedJobTitle('');
          }}
        >
          <Text 
            style={[
              styles.jobTitleText, 
              { color: themeColors.text },
              showCustomInput && { color: themeColors.tint }
            ]}
          >
            Custom...
          </Text>
        </TouchableOpacity>
      </View>
      
      {showCustomInput && (
        <TextInput
          style={[
            styles.customJobInput,
            { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }
          ]}
          placeholder="Enter job title"
          placeholderTextColor={themeColors.textSecondary}
          value={customJobTitle}
          onChangeText={setCustomJobTitle}
        />
      )}
      
      <TouchableOpacity
        style={[
          styles.startButton,
          { backgroundColor: themeColors.tint },
          (!selectedJobTitle && !customJobTitle) && { opacity: 0.6 }
        ]}
        onPress={startPracticeSession}
        disabled={!selectedJobTitle && !customJobTitle}
      >
        <Text style={styles.startButtonText}>Start Practice Interview</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Render interview practice mode
  const renderPracticeMode = () => {
    const currentQuestion = selectedQuestions[currentQuestionIndex];
    const { category, difficulty } = currentQuestion;
    const categoryStyle = getCategoryStyle(category);
    
    return (
      <View style={styles.practiceContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: themeColors.tint,
                width: `${((currentQuestionIndex + 1) / selectedQuestions.length) * 100}%`
              }
            ]} 
          />
        </View>
        <Text style={[styles.questionCounter, { color: themeColors.textSecondary }]}>
          Question {currentQuestionIndex + 1} of {selectedQuestions.length}
        </Text>
        
        <View style={[styles.questionCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.questionHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.backgroundColor }]}>
              <Text style={[styles.categoryText, { color: categoryStyle.color }]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </View>
            
            <View style={styles.difficultyContainer}>
              {Array(difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3).fill(0).map((_, i) => (
                <View 
                  key={i} 
                  style={[styles.difficultyDot, { backgroundColor: themeColors.tint }]} 
                />
              ))}
              {Array(3 - (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3)).fill(0).map((_, i) => (
                <View 
                  key={i + 3} 
                  style={[styles.difficultyDot, { backgroundColor: themeColors.border }]} 
                />
              ))}
            </View>
          </View>
          
          <Text style={[styles.questionText, { color: themeColors.text }]}>
            {currentQuestion.question}
          </Text>
          
          <TextInput
            style={[
              styles.answerInput,
              { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }
            ]}
            placeholder="Type your answer here..."
            placeholderTextColor={themeColors.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={currentAnswer}
            onChangeText={setCurrentAnswer}
          />
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton, { borderColor: themeColors.border }]}
              onPress={resetPractice}
            >
              <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>Exit Practice</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton, 
                styles.primaryButton, 
                { backgroundColor: themeColors.tint },
                !currentAnswer.trim() && { opacity: 0.6 }
              ]}
              onPress={submitAnswer}
              disabled={!currentAnswer.trim()}
            >
              <Text style={styles.primaryButtonText}>
                {currentQuestionIndex < selectedQuestions.length - 1 ? 'Next Question' : 'Complete Practice'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  // Render feedback after practice is complete
  const renderFeedback = () => {
    // Calculate average rating
    let totalRating = 0;
    let count = 0;
    
    answeredQuestions.forEach((answer) => {
      if (answer.rating) {
        totalRating += answer.rating;
        count++;
      }
    });
    
    const averageRating = count > 0 ? (totalRating / count).toFixed(1) : '0.0';
    
    return (
      <View style={styles.feedbackContainer}>
        <Text style={[styles.feedbackTitle, { color: themeColors.text }]}>
          Practice Complete!
        </Text>
        
        <View style={[styles.scoreCard, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.scoreLabel, { color: themeColors.textSecondary }]}>Overall Performance</Text>
          <View style={styles.scoreValue}>
            <Text style={[styles.scoreNumber, { color: themeColors.text }]}>{averageRating}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <FontAwesome
                  key={star}
                  name="star"
                  size={20}
                  color={parseFloat(averageRating) >= star ? '#FBBC05' : themeColors.border}
                  style={styles.starIcon}
                />
              ))}
            </View>
          </View>
        </View>
        
        <Text style={[styles.feedbackSubtitle, { color: themeColors.text }]}>Question Feedback</Text>
        
        <FlatList
          data={selectedQuestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const answer = answeredQuestions.get(item.id);
            if (!answer) return null;
            
            const categoryStyle = getCategoryStyle(item.category);
            
            return (
              <View style={[styles.feedbackItem, { backgroundColor: themeColors.card }]}>
                <View style={styles.feedbackHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.backgroundColor }]}>
                    <Text style={[styles.categoryText, { color: categoryStyle.color }]}>
                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </Text>
                  </View>
                  
                  {answer.rating && (
                    <View style={styles.ratingContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesome
                          key={star}
                          name="star"
                          size={16}
                          color={answer.rating! >= star ? '#FBBC05' : themeColors.border}
                          style={styles.miniStarIcon}
                        />
                      ))}
                    </View>
                  )}
                </View>
                
                <Text style={[styles.feedbackQuestion, { color: themeColors.text }]}>{item.question}</Text>
                <Text style={[styles.feedbackAnswer, { color: themeColors.textSecondary }]}>{answer.text}</Text>
                
                {answer.feedback && (
                  <View style={[styles.aiFeedback, { backgroundColor: themeColors.tint + '10' }]}>
                    <FontAwesome name="comment" size={16} color={themeColors.tint} style={styles.feedbackIcon} />
                    <Text style={[styles.feedbackText, { color: themeColors.text }]}>{answer.feedback}</Text>
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.feedbackList}
        />
        
        <TouchableOpacity
          style={[styles.newPracticeButton, { backgroundColor: themeColors.tint }]}
          onPress={resetPractice}
        >
          <Text style={styles.newPracticeText}>Start New Practice</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ title: 'Interview Coach' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!practiceMode && renderJobSelection()}
        {practiceMode && !practiceComplete && renderPracticeMode()}
        {practiceComplete && showFeedback && renderFeedback()}
        {practiceComplete && !showFeedback && (
          <View style={styles.loadingContainer}>
            <Image
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3940/3940731.png' }}
              style={styles.loadingImage}
            />
            <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
              AI is analyzing your responses...
            </Text>
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
  setupContainer: {
    padding: 20,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  setupDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  jobTitleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  jobTitleButton: {
    width: '48%',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    marginRight: '4%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  jobTitleButton_nth2n: {
    marginRight: 0,
  },
  jobTitleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customJobInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  startButton: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Practice Mode styles
  practiceContainer: {
    padding: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 10,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  questionCounter: {
    fontSize: 14,
    marginBottom: 20,
  },
  questionCard: {
    borderRadius: 12,
    padding: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  difficultyContainer: {
    flexDirection: 'row',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 24,
  },
  answerInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    marginLeft: 10,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Feedback styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  feedbackContainer: {
    padding: 20,
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  scoreValue: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginHorizontal: 2,
  },
  feedbackSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  feedbackList: {
    paddingBottom: 20,
  },
  feedbackItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  miniStarIcon: {
    marginLeft: 2,
  },
  feedbackQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedbackAnswer: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  aiFeedback: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 12,
  },
  feedbackIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  newPracticeButton: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  newPracticeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
