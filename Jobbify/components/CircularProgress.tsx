import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/**
 * CircularProgress: Simple circular progress indicator with center label.
 * Props:
 *   - percent: number (0-100)
 *   - radius: number (default 38)
 *   - strokeWidth: number (default 7)
 *   - color: string (progress color)
 *   - bgColor: string (background track color)
 *   - label: string (center label)
 */
export default function CircularProgress({
  percent,
  radius = 38,
  strokeWidth = 7,
  color = '#4CAF50',
  bgColor = '#eee',
  label = '',
  textColor = '#333',
}: {
  percent: number;
  radius?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  textColor?: string;
}) {
  const normalized = Math.max(0, Math.min(percent, 100));
  const size = radius * 2;
  const center = radius;
  const r = radius - strokeWidth / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * normalized) / 100;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circ},${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.centered]}>
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: 16, fontWeight: 'bold',
  },
});
