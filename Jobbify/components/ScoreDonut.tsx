import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ScoreDonutProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  maxScore?: number;
  showLabel?: boolean;
}

const ScoreDonut: React.FC<ScoreDonutProps> = ({ 
  score, 
  size = 120, 
  strokeWidth = 12, 
  color = '#4285F4',
  maxScore = 10,
  showLabel = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Scale the score - if maxScore is 10, multiply by 10 to get percentage
  const scaleFactor = 100 / maxScore;
  const scaledScore = score * scaleFactor;
  
  // Ensure progress is between 50-100% for more positive visualization
  // This makes even a score of 5/10 appear as 50% filled, which looks more encouraging
  const progress = Math.min(Math.max(scaledScore, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Get color based on score - all scores are positive, but with subtle differentiation
  const getScoreColor = () => {
    if (maxScore === 100) {
      // For job match scores (0-100)
      if (progress >= 80) return '#34A853'; // Green for high matches
      if (progress >= 60) return '#4285F4'; // Blue for good matches
      return '#FBBC05'; // Yellow for moderate matches
    } else {
      // For resume scores (typically 5-10 out of 10)
      if (score >= maxScore * 0.8) return '#34A853'; // Green for high scores
      if (score >= maxScore * 0.6) return '#4285F4'; // Blue for good scores
      return '#FBBC05'; // Yellow for moderate scores
    }
  };

  const displayColor = color === '#4285F4' ? getScoreColor() : color;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          stroke={displayColor + '33'}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={displayColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={[styles.scoreText, { color: displayColor }]}>
          {maxScore === 100 ? Math.round(progress) : score}
        </Text>
        {showLabel && (
          <Text style={styles.label}>
            {maxScore === 100 ? '%' : `/${maxScore}`}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
});

export default ScoreDonut;
