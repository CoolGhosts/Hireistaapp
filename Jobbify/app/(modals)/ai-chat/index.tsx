import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAppContext } from '../../../context';
import { LightTheme, DarkTheme } from '../../../constants';
import { FontAwesome } from '@expo/vector-icons';
import { getOpenRouterCompletion } from '../../../services/openRouterService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

function AIChatScreen() {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const params = useLocalSearchParams<{ initialQuestion: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sendBtnPressed, setSendBtnPressed] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Add initial greeting message
  useEffect(() => {
    const initialMessage: Message = {
      id: '0',
      text: "Hello! I'm your AI career assistant. How can I help you with your job search today?",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([initialMessage]);

    if (params.initialQuestion) {
      handleSendMessage(params.initialQuestion);
    }
  }, [params.initialQuestion]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        if (flatListRef.current && messages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const aiResponse = await getOpenRouterCompletion(text);
      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        text: 'Sorry, I am having trouble connecting. Please try again later.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Render message item
  const renderMessageItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.isUser
          ? [styles.userMessage, { backgroundColor: themeColors.tint }]
          : [styles.aiMessage, { backgroundColor: themeColors.card }],
      ]}
    >
      {!item.isUser && (
        <TouchableOpacity style={styles.aiAvatar} activeOpacity={0.7} onPress={() => {}}>
          <FontAwesome name="android" size={20} color={themeColors.tint} />
        </TouchableOpacity>
      )}
      <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
        <Text
          style={[
            styles.messageText,
            item.isUser ? styles.userText : [styles.aiText, { color: themeColors.text }],
          ]}
        >
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          overScrollMode="always"
        />

        {isTyping && (
          <View style={[styles.typingContainer, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.typingText, { color: themeColors.textSecondary }]}>AI is typing</Text>
            <ActivityIndicator size="small" color={themeColors.tint} style={styles.typingIndicator} />
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: themeColors.card, borderTopColor: themeColors.border },
          ]}
        >
          <TextInput
            style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={themeColors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: themeColors.tint }]}
            onPressIn={() => setSendBtnPressed(true)}
            onPressOut={() => setSendBtnPressed(false)}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.7}
          >
            <FontAwesome
              name="send"
              size={18}
              color="#fff"
              style={sendBtnPressed ? { transform: [{ scale: 1.15 }] } : undefined}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 24,
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    maxWidth: '85%',
    alignItems: 'flex-end',
  },
  userMessage: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e7ef',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
  },
  messageBubble: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    // Color is set dynamically based on theme
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 48,
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  typingText: {
    fontSize: 14,
    marginRight: 8,
  },
  typingIndicator: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default AIChatScreen;
