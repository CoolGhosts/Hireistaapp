import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

type ProgressStage = {
  label: string;
  count: number;
  color: string;
};

/**
 * ProgressDashboard - Shows application progress across different stages
 * with a segmented bar chart and statistics.
 */
export default function ProgressDashboard({
  stages,
  totalGoal,
  themeColors,
  progressAnim,
}: {
  stages: ProgressStage[];
  totalGoal: number;
  themeColors: any;
  progressAnim: Animated.Value;
}) {
  // Calculate total applications across all stages
  const totalApplications = stages.reduce((sum, stage) => sum + stage.count, 0);
  
  // Calculate percentage of goal completed
  const progressPercent = Math.min((totalApplications / totalGoal) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: themeColors.text }]}>Your Progress</Text>
        <Text style={[styles.goalText, { color: themeColors.textSecondary }]}>
          Goal: {totalApplications}/{totalGoal}
        </Text>
      </View>

      {/* Segmented Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: themeColors.card }]}>
          {stages.map((stage, index) => {
            // Calculate each stage's width as percentage of total
            const stagePercent = (stage.count / totalGoal) * 100;
            // Calculate starting position by summing previous stages
            const startPosition = stages
              .slice(0, index)
              .reduce((sum, s) => sum + (s.count / totalGoal) * 100, 0);
              
            return stagePercent > 0 ? (
              <Animated.View
                key={index}
                style={[
                  styles.progressSegment,
                  {
                    backgroundColor: stage.color,
                    width: `${stagePercent}%`,
                    left: `${startPosition}%`,
                  },
                ]}
              />
            ) : null;
          })}
        </View>
        <Text style={[styles.progressText, { color: themeColors.textSecondary }]}>
          {progressPercent.toFixed(0)}% complete
        </Text>
      </View>

      {/* Stage Statistics */}
      <View style={styles.statsContainer}>
        {stages.map((stage, index) => (
          <View key={index} style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: stage.color }]} />
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
              {stage.label}
            </Text>
            <Text style={[styles.statCount, { color: themeColors.text }]}>
              {stage.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  goalText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressTrack: {
    height: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressSegment: {
    height: '100%',
    position: 'absolute',
    top: 0,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  statCount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
