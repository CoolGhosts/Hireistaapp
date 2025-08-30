import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

type ActionItem = {
  id: string;
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
};

type QuickActionsProps = {
  actions: ActionItem[];
  themeColors: any;
};

export default function QuickActions({ actions, themeColors }: QuickActionsProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
        Quick Actions
      </Text>
      
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map(action => (
          <TouchableOpacity
            key={action.id}
            style={[
              styles.actionButton,
              { 
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              }
            ]}
            activeOpacity={0.8}
            onPress={action.onPress}
          >
            <View style={[
              styles.iconContainer,
              { backgroundColor: action.color + '20' }
            ]}>
              <FontAwesome name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={[styles.actionLabel, { color: themeColors.text }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  scrollContent: {
    paddingRight: 20,
    paddingLeft: 4,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
