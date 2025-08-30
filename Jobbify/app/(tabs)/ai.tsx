import React, { useState, useEffect, useRef } from 'react';
import { LayoutAnimation, UIManager, Platform, Animated, Easing } from 'react-native';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '@/context';
import { LightTheme, DarkTheme } from '@/constants';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurView } from 'expo-blur';
import { BoldText, MediumText, RegularText } from '@/components/StyledText';

// Types and interfaces
type MessageType = 'user' | 'ai';

interface Message {
  id: string;
  text: string;
  type: MessageType;
  timestamp: Date;
}

interface AIFeature {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const AI_TOOLS: AIFeature[] = [
  {
    id: 'resume',
    title: 'Resume Advisor',
    description: "Get feedback on your resume's strengths and weaknesses",
    route: '/(modals)/resume-advisor',
    icon: 'description',
  },
  {
    id: 'interview',
    title: 'Interview Coach',
    description: 'Practice interviews with AI feedback to improve your skills',
    route: '/(modals)/interview-coach',
    icon: 'psychology',
  },
  {
    id: 'skills',
    title: 'Skill Analyzer',
    description: 'Analyze your skills and get personalized recommendations',
    route: '/(modals)/skill-analyzer',
    icon: 'analytics',
  },
  {
    id: 'cover',
    title: 'Cover Letter Generator',
    description: 'Create personalized cover letters tailored to specific jobs',
    route: '/(modals)/cover-letter',
    icon: 'edit',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 0,
    overflow: 'hidden',
  },

  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chatContainer: {
    flex: 1,
  },
  messagesArea: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  userAvatarContainer: {
    marginLeft: 12,
    marginBottom: 6,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  aiAvatarContainer: {
    marginRight: 12,
    marginBottom: 6,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userBubble: {
    borderBottomRightRadius: 8,
  },
  aiBubble: {
    borderBottomLeftRadius: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  welcomeContainer: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  toolsContainer: {
    marginTop: 32,
    marginBottom: 24,
  },
  toolsHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },

  // Modern input area styles
  modernInputArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  modernInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 56,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 100,
    paddingVertical: 0,
    paddingRight: 16,
    fontWeight: '400',
  },
  modernSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  // Modern header styles
  modernHeader: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.8,
    fontWeight: '500',
  },
  modernActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  // Modern welcome section
  modernWelcomeContainer: {
    paddingHorizontal: 28,
    paddingVertical: 40,
    alignItems: 'center',
  },
  modernWelcomeTitle: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  modernToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  modernToolCard: {
    width: (Dimensions.get('window').width - 80) / 2,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 120,
    justifyContent: 'center',
  },
  modernToolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  modernToolTitle: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
});

const AIScreen = () => {
  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const { theme } = useAppContext();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ initialMessage?: string }>();

  const themeColors = theme === 'dark' ? DarkTheme : LightTheme;

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [showTools, setShowTools] = useState(true);
  const typingDot1 = useRef(new Animated.Value(0.6)).current;
  const typingDot2 = useRef(new Animated.Value(0.6)).current;
  const typingDot3 = useRef(new Animated.Value(0.6)).current;
  const [inputFocused, setInputFocused] = useState(false);
  const inputTranslateY = useRef(new Animated.Value(0)).current;
  const inputScale = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    inputRef.current?.blur();
  };



  // Typing animation effect
  useEffect(() => {
    if (isTyping) {
      const createTypingAnimation = (dot: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 500,
              delay,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.3,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
      };

      const animation1 = createTypingAnimation(typingDot1, 0);
      const animation2 = createTypingAnimation(typingDot2, 150);
      const animation3 = createTypingAnimation(typingDot3, 300);

      animation1.start();
      animation2.start();
      animation3.start();

      return () => {
        animation1.stop();
        animation2.stop();
        animation3.stop();
      };
    }
  }, [isTyping]);



  useEffect(() => {
    if (params.initialMessage) {
      handleSend(params.initialMessage);
    } else {
      setMessages([
        {
          id: 'initial-ai-message',
          text: "Hello! I'm your AI career copilot. I can help with resumes, cover letters, interview prep, and more. What would you like help with today?", 
          type: 'ai',
          timestamp: new Date(),
        },
      ]);
    }
  }, [params.initialMessage]);

  useEffect(() => {
    if (messages.length > 1) {
      setShowTools(false);
    }
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages]);

  const handleSend = (text?: string) => {
    // Animate new message
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const messageText = text || inputMessage.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      text: messageText,
      type: 'user',
      timestamp: new Date(),
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    handleAIResponse(messageText);
    
    if(!text) {
        setInputMessage('');
    }

    // Smooth scroll to bottom after adding message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleAIResponse = (userMessageText: string) => {
    setIsTyping(true);
    setTimeout(() => {
      // Animate AI response
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      let responseText = "I'm having a little trouble understanding that. Could you rephrase?";
      const lowerCaseMessage = userMessageText.toLowerCase();

      if (lowerCaseMessage.includes('resume') || lowerCaseMessage.includes('cv')) {
        responseText = "I can help you improve your resume! Our Resume Advisor tool analyzes your resume and provides personalized feedback. Would you like to try it?";
      } else if (lowerCaseMessage.includes('cover letter')) {
        responseText = "Need help with a cover letter? I can generate tailored cover letters based on job descriptions with our Cover Letter Generator tool.";
      } else if (lowerCaseMessage.includes('interview')) {
        responseText = "Preparing for interviews is crucial. Our Interview Coach can help you practice with common questions and provide feedback on your answers.";
      } else if (lowerCaseMessage.includes('skill') || lowerCaseMessage.includes('gap')) {
        responseText = "I can analyze your skills to identify strengths and areas for improvement. Our Skill Analyzer tool provides personalized recommendations.";
      } else if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi') || lowerCaseMessage.includes('hey')) {
        responseText = "Hi there! I'm your AI career assistant. I can help with resumes, cover letters, interview prep, and more. What would you like help with today?";
      } else if (lowerCaseMessage.includes('thank')) {
        responseText = "You're welcome! I'm here to help with your job search. Let me know if you need anything else.";
      } else {
        responseText = "I'm here to assist with your job search. I can help with resumes, cover letters, interview preparation, skill analysis, and job recommendations. What would you like to focus on today?";
      }

      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        text: responseText,
        type: 'ai',
        timestamp: new Date(),
      };
      setMessages(prevMessages => [...prevMessages, aiMessage]);
      setIsTyping(false);
      
      // Scroll to bottom after AI response
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  };

  const scrollToBottom = (animated = true) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated });
    }
  };

  const highlightKeywords = (text: string) => {
    if (!text) return text;
    const keywords = ['resume', 'cover letter', 'interview', 'skill'];
    const parts = text.split(new RegExp(`(${keywords.join('|')})`, 'gi'));
    return parts.map((part, idx) => {
      if (keywords.includes(part.toLowerCase())) {
        return (
          <MediumText key={idx} style={{ color: themeColors.tint }}>
            {part}
          </MediumText>
        );
      }
      return part;
    });
  };

  // Create a separate component for animated messages to avoid hook violations
  const AnimatedMessage = React.memo(({ item }: { item: Message; index: number }) => {
    const isUser = item.type === 'user';

    return (
      <View 
        style={[
          styles.messageRow, 
          { 
            justifyContent: isUser ? 'flex-end' : 'flex-start',
          }
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatarContainer}>
            <LinearGradient
              colors={theme === 'dark'
                ? ['#667eea', '#764ba2']
                : [themeColors.tint, themeColors.tint + 'dd']}
              style={styles.aiAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="smart-toy" size={18} color="#fff" />
            </LinearGradient>
          </View>
        )}
        {isUser ? (
          <LinearGradient
            colors={theme === 'dark'
              ? [themeColors.tint, themeColors.tint + 'cc']
              : [themeColors.tint, themeColors.tint + 'dd']}
            style={[styles.messageBubble, styles.userBubble]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <RegularText style={{
              color: '#fff',
              fontSize: 16,
              lineHeight: 22,
              fontWeight: '500',
            }}>
              {item.text}
            </RegularText>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.messageBubble,
              styles.aiBubble,
              { backgroundColor: themeColors.cardSecondary },
            ]}
          >
            <RegularText style={{
              color: themeColors.text,
              fontSize: 16,
              lineHeight: 22,
            }}>
              {highlightKeywords(item.text)}
            </RegularText>
          </View>
        )}
        {isUser && (
          <View style={styles.userAvatarContainer}>
            <LinearGradient
              colors={theme === 'dark'
                ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.1)']}
              style={styles.userAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="person" size={18} color={themeColors.text} />
            </LinearGradient>
          </View>
        )}
      </View>
    );
  });

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    return <AnimatedMessage item={item} index={index} />;
  };





  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <LinearGradient
        colors={theme === 'dark'
          ? ['#000000', '#111111', '#000000']
          : ['#FFFFFF', '#FAFAFA', '#FFFFFF']}
        style={styles.container}
      >
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      
      {/* Modern gradient header */}
      <LinearGradient
        colors={theme === 'dark'
          ? ['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.8)']
          : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
        style={[styles.modernHeader, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={theme === 'dark'
                ? ['#667eea', '#764ba2']
                : [themeColors.tint, themeColors.tint + 'dd']}
              style={styles.aiIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="psychology" size={24} color="#fff" />
            </LinearGradient>
            <View style={styles.headerTitleContainer}>
              <BoldText style={[styles.headerTitle, { color: themeColors.text }]}>AI Assistant</BoldText>
              <RegularText style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>Your career companion</RegularText>
            </View>
          </View>
          <TouchableOpacity style={[styles.modernActionButton, { backgroundColor: themeColors.cardSecondary }]}>
            <MaterialIcons name="more-horiz" size={22} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
      >
        <View style={styles.chatContainer}>
          {/* Messages area */}
          <View style={styles.messagesArea}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              contentContainerStyle={[
                styles.listContentContainer,
                { paddingTop: 40, paddingBottom: 40 }
              ]}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            />
            
            {/* Enhanced typing indicator */}
            {isTyping && (
              <View style={[styles.messageRow, { justifyContent: 'flex-start' }]}>
                <View style={styles.aiAvatarContainer}>
                  <LinearGradient
                    colors={[themeColors.tint, themeColors.tint + 'cc']}
                    style={[styles.aiAvatar]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialIcons name="smart-toy" size={18} color="#fff" />
                  </LinearGradient>
                </View>
                <BlurView
                  intensity={80}
                  tint={theme}
                  style={[styles.messageBubble, styles.aiBubble, {
                    backgroundColor: theme === 'dark' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(255, 255, 255, 0.9)',
                  }]}
                >
                  <View style={styles.typingIndicator}>
                    <Animated.View style={[
                      styles.typingDot, 
                      { 
                        backgroundColor: themeColors.textSecondary,
                        opacity: typingDot1
                      }
                    ]} />
                    <Animated.View style={[
                      styles.typingDot, 
                      { 
                        backgroundColor: themeColors.textSecondary,
                        opacity: typingDot2
                      }
                    ]} />
                    <Animated.View style={[
                      styles.typingDot, 
                      { 
                        backgroundColor: themeColors.textSecondary,
                        opacity: typingDot3
                      }
                    ]} />
                  </View>
                </BlurView>
              </View>
            )}
            
            {/* Simplified AI Tools section */}
            {showTools && messages.length <= 1 && (
              <View style={styles.modernWelcomeContainer}>
                <BoldText style={[styles.modernWelcomeTitle, { color: themeColors.text }]}>
                  How can I help you today?
                </BoldText>
                <View style={styles.modernToolsGrid}>
                  {AI_TOOLS.map((item) => {
                    const gradientColors = theme === 'dark'
                      ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] as const
                      : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)'] as const;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => router.push(item.route as any)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={gradientColors}
                          style={[styles.modernToolCard, { backgroundColor: themeColors.cardSecondary }]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <LinearGradient
                            colors={theme === 'dark'
                              ? ['#667eea', '#764ba2']
                              : [themeColors.tint, themeColors.tint + 'cc']}
                            style={styles.modernToolIconContainer}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <MaterialIcons name={item.icon} size={24} color="#fff" />
                          </LinearGradient>
                          <BoldText style={[styles.modernToolTitle, { color: themeColors.text }]}>{item.title}</BoldText>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Modern input area with gradient */}
          <LinearGradient
            colors={theme === 'dark'
              ? ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']
              : ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.95)']}
            style={[
              styles.modernInputArea,
              {
                paddingBottom: Math.max(insets.bottom + 12, 20),
                marginBottom: 0,
              }
            ]}
          >
            <Animated.View style={[
               {
                 transform: [{ translateY: inputTranslateY }]
               }
             ]}>
              <Animated.View style={[
                 styles.modernInputContainer,
                 {
                   backgroundColor: themeColors.cardSecondary,
                   borderColor: inputFocused ? themeColors.tint : 'transparent',
                   transform: [{ scale: inputScale }]
                 }
               ]}>
                <TextInput
                  ref={inputRef}
                  style={[styles.modernInput, { color: themeColors.text }]}
                  placeholder="Ask me anything about your career..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={inputMessage}
                  onChangeText={setInputMessage}
                  onSubmitEditing={() => handleSend()}
                  onFocus={() => {
                    setInputFocused(true);
                    Animated.parallel([
                      Animated.spring(inputTranslateY, {
                        toValue: Platform.OS === 'ios' ? 0 : 0,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 8
                      }),
                      Animated.spring(inputScale, {
                        toValue: 1.01,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 8
                      })
                    ]).start();
                  }}
                  onBlur={() => {
                    setInputFocused(false);
                    Animated.parallel([
                      Animated.spring(inputTranslateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 8
                      }),
                      Animated.spring(inputScale, {
                        toValue: 1,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 8
                      })
                    ]).start();
                  }}
                  returnKeyType="send"
                  multiline
                  maxLength={500}
                />
                {inputMessage.trim() ? (
                  <LinearGradient
                    colors={theme === 'dark'
                      ? ['#667eea', '#764ba2']
                      : [themeColors.tint, themeColors.tint + 'dd']}
                    style={styles.modernSendButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <TouchableOpacity
                      onPress={() => handleSend()}
                      style={{
                        width: '100%',
                        height: '100%',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialIcons name="send" size={22} color="#fff" />
                    </TouchableOpacity>
                  </LinearGradient>
                ) : (
                  <View style={[styles.modernSendButton, { backgroundColor: themeColors.textSecondary, opacity: 0.5 }]}>
                    <MaterialIcons name="send" size={22} color="#fff" />
                  </View>
                )}
              </Animated.View>
            </Animated.View>
          </LinearGradient>
        </KeyboardAvoidingView>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
};


export default AIScreen;
