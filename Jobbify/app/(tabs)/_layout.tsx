import React, { useRef, useEffect, useState, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable, View, Animated, Text, Dimensions, LayoutChangeEvent, LayoutAnimation, UIManager, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import Colors from '@/constants/Colors';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Use FontAwesome icon type with strong typing
// Note: we don't use the color property anymore as we rely on dynamic theme colors instead
const TAB_CONFIG: { key: string; icon: keyof typeof FontAwesome.glyphMap; label: string; isCenter?: boolean }[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'inbox', icon: 'inbox', label: 'Inbox' },
  { key: 'index', icon: 'briefcase', label: 'Jobs', isCenter: true },
  { key: 'ai', icon: 'magic', label: 'AI' },
  { key: 'profile', icon: 'globe', label: 'Profile' },
  // Admin tab removed - now implemented in Supabase backend
];

// Separate tabs into left, center, and right for the new layout
const LEFT_TABS = TAB_CONFIG.filter(tab => tab.key === 'home' || tab.key === 'inbox');
const CENTER_TAB = TAB_CONFIG.find(tab => tab.isCenter);
const RIGHT_TABS = TAB_CONFIG.filter(tab => tab.key === 'ai' || tab.key === 'profile');

function CustomTabBar({ state, descriptors, navigation }: any) {
  // Get theme from our app context for consistent theme handling
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  
  // Constants for the new design
  const centerButtonSize = 72; // Increased from 64
  const centerButtonRadius = centerButtonSize / 2;
  const tabHeight = 48;
  const navBarHeight = 80;
  
  // Theme-aware colors
  const iconActive = themeColors.tint;
  const iconInactive = themeColors.tabIconDefault;
  
  // Bar background with solid colors (no transparency)
  const barBackground = theme === 'light'
    ? themeColors.tabBackground // Use theme's tab background (light yellow)
    : '#1a1a1a'; // Solid dark color for dark mode
    
  // Border color that works in both themes  
  const borderColor = theme === 'light'
    ? themeColors.border // Use theme's border color
    : 'rgba(255, 255, 255, 0.05)'; // Very light white border for dark mode

  // Center button colors
  const centerButtonBg = themeColors.tint;
  const centerButtonShadow = theme === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.3)';
  
  // Helper function to render a regular tab with enhanced animations
  const renderTab = (tabConfig: any, routeName: string) => {
    const isFocused = state.routes.find((route: any) => route.name === routeName) && 
                     state.routes[state.index].name === routeName;
    const [animatedValue] = useState(new Animated.Value(isFocused ? 1 : 0));
    const [slideValue] = useState(new Animated.Value(0));
    
    useEffect(() => {
      // Main selection animation
      Animated.spring(animatedValue, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
      
      // Slide-in animation
      Animated.spring(slideValue, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }).start();
    }, [isFocused]);
    
    const onPress = () => {
      // Enhanced press animation with bounce
      Animated.sequence([
        Animated.spring(animatedValue, {
          toValue: 0.7,
          useNativeDriver: true,
          tension: 500,
          friction: 6,
        }),
        Animated.spring(animatedValue, {
          toValue: 1.2,
          useNativeDriver: true,
          tension: 400,
          friction: 8,
        }),
        Animated.spring(animatedValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        })
      ]).start();
      navigation.navigate(routeName);
    };
    
    const scale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1.0, 1.12],
    });
    
    const slideY = slideValue.interpolate({
      inputRange: [0, 1],
      outputRange: [10, 0],
    });
    
    const indicatorScale = slideValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    
    return (
      <Pressable 
        key={tabConfig.key}
        onPress={onPress} 
        style={({ pressed }) => [
          {
            paddingHorizontal: 16,
            paddingVertical: 0,
            height: tabHeight,
            borderRadius: tabHeight / 2,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            flex: 1,
          },
          pressed && { 
            opacity: 0.8
          }
        ]}
      >

        
        {/* Bottom indicator line */}
        <Animated.View style={{
          position: 'absolute',
          bottom: -2,
          left: '25%',
          right: '25%',
          height: 3,
          borderRadius: 1.5,
          backgroundColor: theme === 'light' ? themeColors.tint : '#2196F3',
          transform: [{ scaleX: indicatorScale }],
          opacity: isFocused ? 1 : 0,
        }} />
        
        <Animated.View style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }, { translateY: slideY }],
          flex: 1,
          width: '100%',
        }}>
          <FontAwesome 
            name={tabConfig.icon} 
            size={isFocused ? 28 : 24}
            color={isFocused ? iconActive : iconInactive} 
            style={{ 
              marginBottom: 2,
            }}
          />
          <Text style={{
            fontSize: isFocused ? 11 : 10,
            fontWeight: isFocused ? '700' : '400',
            color: isFocused ? iconActive : iconInactive,
            textAlign: 'center',
          }}>
            {tabConfig.label}
          </Text>
        </Animated.View>
      </Pressable>
    );
  };
  
  // Helper function to render the center floating button with enhanced animations
  const renderCenterButton = () => {
    if (!CENTER_TAB) return null;
    
    const isFocused = state.routes[state.index].name === CENTER_TAB.key;
    const [centerAnimatedValue] = useState(new Animated.Value(isFocused ? 1 : 0));
    
    useEffect(() => {
      Animated.spring(centerAnimatedValue, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }).start();
    }, [isFocused]);
    
    const onPress = () => {
      // Enhanced spring animation on press
      Animated.sequence([
        Animated.spring(centerAnimatedValue, {
          toValue: 0.85,
          useNativeDriver: true,
          tension: 500,
          friction: 6,
        }),
        Animated.spring(centerAnimatedValue, {
          toValue: 1.1,
          useNativeDriver: true,
          tension: 300,
          friction: 8,
        })
      ]).start();
      navigation.navigate(CENTER_TAB.key);
    };
    
    const scale = centerAnimatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1.0, 1.15],
    });
    
    const rotation = centerAnimatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '5deg'],
    });
    
    // Better color contrast for dark mode
    const buttonBackground = theme === 'light' ? centerButtonBg : '#2196F3'; // Blue for dark mode
    const iconColor = theme === 'light' ? '#fff' : '#fff'; // Always white for contrast
    const borderColor = theme === 'light' ? '#fff' : '#1976D2'; // Darker blue border for dark mode
    
    return (
      <Pressable 
        onPress={onPress}
        style={({ pressed }) => [
          {
            position: 'absolute',
            top: -centerButtonRadius + 10, // Overlay the navbar
            left: screenWidth / 2 - centerButtonRadius,
            width: centerButtonSize,
            height: centerButtonSize,
            borderRadius: centerButtonRadius,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 12,
            shadowColor: theme === 'light' ? centerButtonShadow : '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: theme === 'light' ? 1 : 0.8,
            shadowRadius: 12,
            // Enhanced border for better visibility
            borderWidth: 4,
            borderColor: borderColor,
          },
          pressed && {
            opacity: 0.9
          }
        ]}
      >
        <Animated.View style={{
          width: '100%',
          height: '100%',
          borderRadius: centerButtonRadius,
          backgroundColor: buttonBackground,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }, { rotate: rotation }]
        }}>
          <FontAwesome 
            name={CENTER_TAB.icon} 
            size={30}
            color={iconColor}
          />
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <View style={{ 
      position: 'absolute', 
      bottom: 0, 
      left: 0, 
      right: 0,
      height: navBarHeight,
      paddingBottom: Math.max(insets.bottom, 16),
      backgroundColor: barBackground, // Solid background, no transparency
      borderTopWidth: 2,
      borderTopColor: borderColor,
      elevation: 16,
      shadowColor: theme === 'light' ? '#000' : '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: theme === 'light' ? 0.1 : 0.3,
      shadowRadius: 8,
      // Ensure no blur or transparency effects
      opacity: 1.0,
    }}>
      {/* Main navbar content */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 16,
        height: '100%'
      }}>
        {/* Left side tabs */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          justifyContent: 'flex-start'
        }}>
          {LEFT_TABS.map(tab => renderTab(tab, tab.key))}
        </View>
        
        {/* Center space for floating button */}
        <View style={{ width: centerButtonSize, alignItems: 'center' }} />
        
        {/* Right side tabs */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          justifyContent: 'flex-end',
          gap: 8
        }}>
          {RIGHT_TABS.map(tab => renderTab(tab, tab.key))}
        </View>
      </View>
      
      {/* Floating center button */}
      {renderCenterButton()}
    </View>
  );
}

function TabScreens() {
  const { theme } = useAppContext();
  const insets = useSafeAreaInsets();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  // When changing themes, ensure smooth transition - defer to prevent insertion effect warnings
  useEffect(() => {
    // Use requestAnimationFrame to defer the layout animation
    requestAnimationFrame(() => {
      LayoutAnimation.configureNext({
        duration: 300,
        update: { type: 'easeInEaseOut' },
      });
    });
  }, [theme]);
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide the default tab bar since we have a custom one
      }}
      tabBar={(props) => <CustomTabBar {...props} />}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Jobs',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
        }}
      />
      {/* Admin tab removed - now implemented in Supabase backend */}
    </Tabs>
  );
}

// Export without wrapping in AppProvider since it's already wrapped in the root layout
export default function TabLayout() {
  return <TabScreens />;
}
