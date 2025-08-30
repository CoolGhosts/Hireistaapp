import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { ThemeColors } from '@/constants/Theme';

interface CoverLetterStatusIndicatorProps {
  hasAttachment: boolean;
  attachmentType?: 'file' | 'text' | 'legacy' | 'none';
  onPress?: () => void;
  themeColors: ThemeColors;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const CoverLetterStatusIndicator: React.FC<CoverLetterStatusIndicatorProps> = ({
  hasAttachment,
  attachmentType = 'none',
  onPress,
  themeColors,
  size = 'medium',
  showLabel = true,
}) => {
  const getIconName = () => {
    if (!hasAttachment) return 'file-o';
    
    switch (attachmentType) {
      case 'file':
        return 'file-pdf-o';
      case 'text':
        return 'file-text-o';
      case 'legacy':
        return 'file-text';
      default:
        return 'file-o';
    }
  };

  const getColor = () => {
    if (!hasAttachment) return themeColors.textSecondary;
    
    switch (attachmentType) {
      case 'file':
        return themeColors.success;
      case 'text':
        return themeColors.info;
      case 'legacy':
        return themeColors.warning;
      default:
        return themeColors.textSecondary;
    }
  };

  const getLabel = () => {
    if (!hasAttachment) return 'No Cover Letter';
    
    switch (attachmentType) {
      case 'file':
        return 'PDF Attached';
      case 'text':
        return 'Custom Letter';
      case 'legacy':
        return 'Text Letter';
      default:
        return 'Cover Letter';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.containerSmall,
          icon: 12,
          text: styles.labelSmall,
        };
      case 'large':
        return {
          container: styles.containerLarge,
          icon: 20,
          text: styles.labelLarge,
        };
      default:
        return {
          container: styles.containerMedium,
          icon: 16,
          text: styles.labelMedium,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const color = getColor();
  const iconName = getIconName();
  const label = getLabel();

  const content = (
    <View style={[
      styles.container,
      sizeStyles.container,
      { backgroundColor: color + '15' }
    ]}>
      <FontAwesome
        name={iconName as any}
        size={sizeStyles.icon}
        color={color}
      />
      {showLabel && (
        <Text style={[sizeStyles.text, { color }]}>
          {label}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  containerMedium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  containerLarge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  labelLarge: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});
