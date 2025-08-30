import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  type?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function Button({
  title,
  onPress,
  type = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  
  // Define button styles based on type
  const getButtonStyle = (): ViewStyle => {
    switch (type) {
      case 'primary':
        return {
          backgroundColor: themeColors.tint,
          borderColor: themeColors.tint,
          borderWidth: 1,
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderColor: themeColors.tint,
          borderWidth: 1,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: themeColors.border,
          borderWidth: 1,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: themeColors.tint,
          borderColor: themeColors.tint,
          borderWidth: 1,
        };
    }
  };
  
  // Define text styles based on type
  const getTextStyle = (): TextStyle => {
    switch (type) {
      case 'primary':
        return {
          color: '#FFFFFF',
        };
      case 'secondary':
      case 'outline':
      case 'text':
        return {
          color: themeColors.tint,
        };
      default:
        return {
          color: '#FFFFFF',
        };
    }
  };
  
  // Define button size
  const getButtonSize = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: 4,
        };
      case 'medium':
        return {
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 6,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 8,
        };
      default:
        return {
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 6,
        };
    }
  };
  
  // Define text size
  const getTextSize = (): TextStyle => {
    switch (size) {
      case 'small':
        return {
          fontSize: 14,
        };
      case 'medium':
        return {
          fontSize: 16,
        };
      case 'large':
        return {
          fontSize: 18,
        };
      default:
        return {
          fontSize: 16,
        };
    }
  };

  // Create style arrays with proper typing
  const buttonStyles: StyleProp<ViewStyle>[] = [
    styles.button,
    getButtonStyle(),
    getButtonSize(),
  ];
  
  if (disabled) {
    buttonStyles.push(styles.disabled);
  }
  
  if (style) {
    buttonStyles.push(style);
  }
  
  const textStyles: StyleProp<TextStyle>[] = [
    styles.text,
    getTextStyle(),
    getTextSize(),
  ];
  
  if (icon) {
    textStyles.push({ marginLeft: 8 } as TextStyle);
  }
  
  if (textStyle) {
    textStyles.push(textStyle);
  }
  
  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextStyle().color} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
