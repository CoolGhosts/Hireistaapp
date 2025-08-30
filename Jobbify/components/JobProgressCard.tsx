import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

type StageType = {
  label: string;
  count: number;
  color: string;
};

type JobProgressCardProps = {
  stages: StageType[];
  totalGoal: number;
  progressAnim: Animated.Value;
  themeColors: any;
};

export default function JobProgressCard({ 
  stages, 
  totalGoal, 
  progressAnim, 
  themeColors 
}: JobProgressCardProps) {
  const appliedJobs = stages[0]?.count || 0;
  const progressPercent = Math.min((appliedJobs / totalGoal) * 100, 100);
  
  const width = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={[styles.container, { 
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
    }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          Application Progress
        </Text>
        <View style={styles.goalContainer}>
          <Text style={[styles.goalText, { color: themeColors.textSecondary }]}>
            Goal: {totalGoal} applications
          </Text>
          <FontAwesome name="trophy" size={14} color={themeColors.tint} style={styles.goalIcon} />
        </View>
      </View>

      {/* Progress visualization */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          {stages.map((stage, index) => (
            <View key={index} style={styles.stageItem}>
              <View style={[styles.stageIconCircle, { backgroundColor: stage.color + '22' }]}>
                <Text style={[styles.stageCount, { color: stage.color }]}>
                  {stage.count}
                </Text>
              </View>
              <Text style={[styles.stageLabel, { color: themeColors.textSecondary }]}>
                {stage.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBarContainer, { backgroundColor: `${themeColors.textSecondary}40` }]}>
          <Animated.View 
            style={[
              styles.progressBar, 
              { width, backgroundColor: themeColors.tint }
            ]} 
          />
        </View>
        
        <View style={styles.progressInfoRow}>
          <Text style={[styles.progressInfoText, { color: themeColors.textSecondary }]}>
            {appliedJobs} of {totalGoal} applications
          </Text>
          <Text style={[styles.progressInfoText, { color: themeColors.tint }]}>
            {progressPercent.toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  goalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalText: {
    fontSize: 14,
    fontWeight: '500',
  },
  goalIcon: {
    marginLeft: 6,
  },
  progressContainer: {
    marginTop: 6,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stageItem: {
    alignItems: 'center',
    flex: 1,
  },
  stageIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 10,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressInfoText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
