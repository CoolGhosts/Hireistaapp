import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, G, Rect, Ellipse, RadialGradient } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  gradientColors?: string[];
}

// AI Coach Icon - Modern brain with glowing neural network
export const AICoachIcon: React.FC<IconProps> = ({ size = 28, color = '#ffffff', gradientColors }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Defs>
      <LinearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={gradientColors?.[0] || '#8B5CF6'} />
        <Stop offset="50%" stopColor={gradientColors?.[1] || '#A855F7'} />
        <Stop offset="100%" stopColor={gradientColors?.[2] || '#C084FC'} />
      </LinearGradient>
      <LinearGradient id="aiGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
        <Stop offset="100%" stopColor="#C084FC" stopOpacity="0.1" />
      </LinearGradient>
    </Defs>
    <G>
      {/* Glow effect */}
      <Path
        d="M16 2C11.5 2 7.5 5.5 7 10C6.5 10 6 10.5 6 11C6 11.5 6.5 12 7 12C7 16.5 11 20.5 15.5 21C15.8 21.8 16.5 22.5 17.5 22.5C18.5 22.5 19.2 21.8 19.5 21C24 20.5 28 16.5 28 12C28.5 12 29 11.5 29 11C29 10.5 28.5 10 28 10C27.5 5.5 23.5 2 19 2C18 2 17 2.3 16.2 2.8C16.1 2.3 16 2 16 2Z"
        fill="url(#aiGlow)"
      />
      {/* Brain outline */}
      <Path
        d="M16 4C12.5 4 9.5 6.5 9 10C8.5 10 8 10.5 8 11C8 11.5 8.5 12 9 12C9 15.5 12 18.5 15.5 19C15.8 19.8 16.5 20.5 17.5 20.5C18.5 20.5 19.2 19.8 19.5 19C23 18.5 26 15.5 26 12C26.5 12 27 11.5 27 11C27 10.5 26.5 10 26 10C25.5 6.5 22.5 4 19 4C18 4 17 4.3 16.2 4.8C16.1 4.3 16 4 16 4Z"
        fill="url(#aiGradient)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5"
      />
      {/* Enhanced neural connections */}
      <Circle cx="12" cy="10" r="2" fill="#FFFFFF" opacity="0.9" />
      <Circle cx="20" cy="10" r="2" fill="#FFFFFF" opacity="0.9" />
      <Circle cx="16" cy="14" r="2.5" fill="#FFFFFF" />
      <Circle cx="14" cy="17" r="1.5" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="18" cy="17" r="1.5" fill="#FFFFFF" opacity="0.8" />
      {/* Glowing connection lines */}
      <Path d="M12 10 L16 14 L20 10" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" fill="none" strokeLinecap="round" />
      <Path d="M16 14 L14 17" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" fill="none" strokeLinecap="round" />
      <Path d="M16 14 L18 17" stroke="#FFFFFF" strokeWidth="2" opacity="0.8" fill="none" strokeLinecap="round" />
      {/* Pulse effect dots */}
      <Circle cx="11" cy="8" r="0.5" fill="#FFFFFF" opacity="0.6" />
      <Circle cx="21" cy="8" r="0.5" fill="#FFFFFF" opacity="0.6" />
      <Circle cx="16" cy="11" r="0.5" fill="#FFFFFF" opacity="0.6" />
    </G>
  </Svg>
);

// Smart Matches Icon - Modern interlocking puzzle with glow
export const SmartMatchesIcon: React.FC<IconProps> = ({ size = 28, color = '#ffffff', gradientColors }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Defs>
      <LinearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={gradientColors?.[0] || '#10B981'} />
        <Stop offset="50%" stopColor={gradientColors?.[1] || '#34D399'} />
        <Stop offset="100%" stopColor={gradientColors?.[2] || '#6EE7B7'} />
      </LinearGradient>
      <LinearGradient id="matchGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
        <Stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.1" />
      </LinearGradient>
    </Defs>
    <G>
      {/* Glow effect */}
      <Path
        d="M4 6 L16 6 C16 8 17 9 18 9 C19 9 20 8 20 6 L28 6 L28 16 C26 16 25 17 25 18 C25 19 26 20 28 20 L28 30 L20 30 C20 28 19 27 18 27 C17 27 16 28 16 30 L4 30 L4 20 C6 20 7 19 7 18 C7 17 6 16 4 16 L4 6 Z"
        fill="url(#matchGlow)"
      />
      {/* Main puzzle piece */}
      <Path
        d="M6 8 L14 8 C14 10 15 11 16 11 C17 11 18 10 18 8 L26 8 L26 16 C24 16 23 17 23 18 C23 19 24 20 26 20 L26 28 L18 28 C18 26 17 25 16 25 C15 25 14 26 14 28 L6 28 L6 20 C8 20 9 19 9 18 C9 17 8 16 6 16 L6 8 Z"
        fill="url(#matchGradient)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1"
      />
      {/* Enhanced center connection */}
      <Circle cx="16" cy="18" r="3" fill="#FFFFFF" opacity="0.95" />
      <Circle cx="16" cy="18" r="1.5" fill="url(#matchGradient)" />
      {/* Connection indicators */}
      <Circle cx="16" cy="9.5" r="1.5" fill="#FFFFFF" opacity="0.9" />
      <Circle cx="24.5" cy="18" r="1.5" fill="#FFFFFF" opacity="0.9" />
      <Circle cx="16" cy="26.5" r="1.5" fill="#FFFFFF" opacity="0.9" />
      <Circle cx="7.5" cy="18" r="1.5" fill="#FFFFFF" opacity="0.9" />
      {/* Accent sparkles */}
      <Circle cx="11" cy="13" r="0.8" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="21" cy="13" r="0.8" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="11" cy="23" r="0.8" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="21" cy="23" r="0.8" fill="#FFFFFF" opacity="0.8" />
    </G>
  </Svg>
);

// Quick Apply Icon - Dynamic lightning with energy field
export const QuickApplyIcon: React.FC<IconProps> = ({ size = 28, color = '#ffffff', gradientColors }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Defs>
      <LinearGradient id="quickGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={gradientColors?.[0] || '#F59E0B'} />
        <Stop offset="50%" stopColor={gradientColors?.[1] || '#FBBF24'} />
        <Stop offset="100%" stopColor={gradientColors?.[2] || '#FDE047'} />
      </LinearGradient>
      <LinearGradient id="quickGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
        <Stop offset="100%" stopColor="#FDE047" stopOpacity="0.1" />
      </LinearGradient>
    </Defs>
    <G>
      {/* Energy field rings */}
      <Circle cx="16" cy="16" r="14" fill="none" stroke="url(#quickGlow)" strokeWidth="3" opacity="0.3" />
      <Circle cx="16" cy="16" r="11" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="6 3" opacity="0.5" />
      <Circle cx="16" cy="16" r="8" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
      
      {/* Lightning bolt with glow */}
      <Path
        d="M19 5 L11 17 L15 17 L15 27 L23 15 L19 15 L19 5 Z"
        fill="url(#quickGlow)"
        transform="scale(1.1) translate(-1.6, -1.6)"
      />
      <Path
        d="M18 6 L10 16 L14 16 L14 26 L22 16 L18 16 L18 6 Z"
        fill="url(#quickGradient)"
        stroke="#FFFFFF"
        strokeWidth="0.5"
      />
      
      {/* Enhanced speed lines */}
      <Path d="M6 10 L11 10" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      <Path d="M6 14 L10 14" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <Path d="M6 18 L10 18" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <Path d="M6 22 L11 22" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      
      <Path d="M21 10 L26 10" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      <Path d="M22 14 L26 14" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <Path d="M22 18 L26 18" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <Path d="M21 22 L26 22" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      
      {/* Energy sparks */}
      <Circle cx="12" cy="8" r="1" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="20" cy="24" r="1" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="24" cy="12" r="0.8" fill="#FFFFFF" opacity="0.7" />
      <Circle cx="8" cy="20" r="0.8" fill="#FFFFFF" opacity="0.7" />
    </G>
  </Svg>
);

// Insights Icon - Advanced analytics with glowing data visualization
export const InsightsIcon: React.FC<IconProps> = ({ size = 28, color = '#ffffff', gradientColors }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Defs>
      <LinearGradient id="insightsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={gradientColors?.[0] || '#3B82F6'} />
        <Stop offset="50%" stopColor={gradientColors?.[1] || '#60A5FA'} />
        <Stop offset="100%" stopColor={gradientColors?.[2] || '#93C5FD'} />
      </LinearGradient>
      <LinearGradient id="insightsGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
        <Stop offset="100%" stopColor="#93C5FD" stopOpacity="0.1" />
      </LinearGradient>
    </Defs>
    <G>
      {/* Background glow */}
      <Path d="M4 28 L30 28 L30 8 L4 8 Z" fill="url(#insightsGlow)" opacity="0.2" rx="2" />
      
      {/* Enhanced chart bars with glow */}
      <Path d="M7 26 L7 19 L11 19 L11 26 Z" fill="url(#insightsGlow)" opacity="0.6" />
      <Path d="M8 25 L8 20 L10 20 L10 25 Z" fill="url(#insightsGradient)" />
      
      <Path d="M11 26 L11 15 L15 15 L15 26 Z" fill="url(#insightsGlow)" opacity="0.6" />
      <Path d="M12 25 L12 16 L14 16 L14 25 Z" fill="url(#insightsGradient)" />
      
      <Path d="M15 26 L15 11 L19 11 L19 26 Z" fill="url(#insightsGlow)" opacity="0.6" />
      <Path d="M16 25 L16 12 L18 12 L18 25 Z" fill="url(#insightsGradient)" />
      
      <Path d="M19 26 L19 15 L23 15 L23 26 Z" fill="url(#insightsGlow)" opacity="0.6" />
      <Path d="M20 25 L20 16 L22 16 L22 25 Z" fill="url(#insightsGradient)" />
      
      <Path d="M23 26 L23 19 L27 19 L27 26 Z" fill="url(#insightsGlow)" opacity="0.6" />
      <Path d="M24 25 L24 20 L26 20 L26 25 Z" fill="url(#insightsGradient)" />
      
      {/* Glowing trend line */}
      <Path d="M6 21 Q12 17 17 13 Q22 17 28 19" stroke="url(#insightsGlow)" strokeWidth="4" fill="none" opacity="0.5" />
      <Path d="M6 21 Q12 17 17 13 Q22 17 28 19" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.9" strokeLinecap="round" />
      
      {/* Enhanced data points */}
      <Circle cx="9" cy="20" r="3" fill="url(#insightsGlow)" opacity="0.6" />
      <Circle cx="9" cy="20" r="2" fill="#FFFFFF" />
      <Circle cx="9" cy="20" r="1" fill="url(#insightsGradient)" />
      
      <Circle cx="13" cy="17" r="3" fill="url(#insightsGlow)" opacity="0.6" />
      <Circle cx="13" cy="17" r="2" fill="#FFFFFF" />
      <Circle cx="13" cy="17" r="1" fill="url(#insightsGradient)" />
      
      <Circle cx="17" cy="13" r="3.5" fill="url(#insightsGlow)" opacity="0.6" />
      <Circle cx="17" cy="13" r="2.5" fill="#FFFFFF" />
      <Circle cx="17" cy="13" r="1.5" fill="url(#insightsGradient)" />
      
      <Circle cx="21" cy="17" r="3" fill="url(#insightsGlow)" opacity="0.6" />
      <Circle cx="21" cy="17" r="2" fill="#FFFFFF" />
      <Circle cx="21" cy="17" r="1" fill="url(#insightsGradient)" />
      
      <Circle cx="25" cy="19" r="3" fill="url(#insightsGlow)" opacity="0.6" />
      <Circle cx="25" cy="19" r="2" fill="#FFFFFF" />
      <Circle cx="25" cy="19" r="1" fill="url(#insightsGradient)" />
      
      {/* Grid lines */}
      <Path d="M6 27 L28 27" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <Path d="M6 27 L6 10" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      
      {/* Accent sparkles */}
      <Circle cx="11" cy="11" r="0.8" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="23" cy="13" r="0.8" fill="#FFFFFF" opacity="0.8" />
      <Circle cx="27" cy="15" r="0.8" fill="#FFFFFF" opacity="0.8" />
    </G>
  </Svg>
);

// Decorative Sparkle Icons
export const SparkleIcon: React.FC<IconProps> = ({ size = 16, color = '#ffffff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 L12 2 Z"
      fill={color}
    />
  </Svg>
);

export const DiamondIcon: React.FC<IconProps> = ({ size = 14, color = '#ffffff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2 L18 8 L12 22 L6 8 L12 2 Z"
      fill={color}
    />
    <Path
      d="M6 8 L18 8 L12 14 L6 8 Z"
      fill={color}
      opacity="0.7"
    />
  </Svg>
);

export const StarIcon: React.FC<IconProps> = ({ size = 12, color = '#ffffff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 L12 2 Z"
      fill={color}
    />
  </Svg>
);

export const AutoAwesomeIcon: React.FC<IconProps> = ({ size = 16, color = '#ffffff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G>
      {/* Main star */}
      <Path
        d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 L12 3 Z"
        fill={color}
      />
      {/* Small accent stars */}
      <Path
        d="M19 5 L19.5 6.5 L21 7 L19.5 7.5 L19 9 L18.5 7.5 L17 7 L18.5 6.5 L19 5 Z"
        fill={color}
        opacity="0.8"
      />
      <Path
        d="M5 19 L5.5 20.5 L7 21 L5.5 21.5 L5 23 L4.5 21.5 L3 21 L4.5 20.5 L5 19 Z"
        fill={color}
        opacity="0.8"
      />
    </G>
  </Svg>
);

// Work/Career Icon for brand tagline
export const WorkIcon: React.FC<IconProps> = ({ size = 16, color = '#ffffff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10 2 L14 2 C14.5 2 15 2.5 15 3 L15 5 L20 5 C21.1 5 22 5.9 22 7 L22 19 C22 20.1 21.1 21 20 21 L4 21 C2.9 21 2 20.1 2 19 L2 7 C2 5.9 2.9 5 4 5 L9 5 L9 3 C9 2.5 9.5 2 10 2 Z M11 4 L11 5 L13 5 L13 4 L11 4 Z"
      fill={color}
    />
    {/* Handle */}
    <Path
      d="M10 8 L14 8 C14.5 8 15 8.5 15 9 C15 9.5 14.5 10 14 10 L10 10 C9.5 10 9 9.5 9 9 C9 8.5 9.5 8 10 8 Z"
      fill={color}
      opacity="0.7"
    />
  </Svg>
);

// Rocket Launch Icon for Get Started button - Modern design with dynamic effects
export const RocketIcon: React.FC<IconProps> = ({ size = 20, color = '#0A0A0A', gradientColors }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="rocketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={gradientColors?.[0] || '#F59E0B'} />
        <Stop offset="50%" stopColor={gradientColors?.[1] || '#F97316'} />
        <Stop offset="100%" stopColor={gradientColors?.[2] || '#EF4444'} />
      </LinearGradient>
      <LinearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#E5E7EB" />
        <Stop offset="50%" stopColor="#F3F4F6" />
        <Stop offset="100%" stopColor="#D1D5DB" />
      </LinearGradient>
      <LinearGradient id="flameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FBBF24" />
        <Stop offset="50%" stopColor="#F59E0B" />
        <Stop offset="100%" stopColor="#EF4444" />
      </LinearGradient>
    </Defs>
    <G>
      {/* Main rocket body */}
      <Path
        d="M12 2 C15 5 15 9 15 12 L13 14 L11 14 L9 12 C9 9 9 5 12 2 Z"
        fill="url(#rocketBody)"
        stroke="#9CA3AF"
        strokeWidth="0.3"
      />
      {/* Rocket nose cone */}
      <Path
        d="M12 2 C13.5 3.5 14 5 14 6.5 L10 6.5 C10 5 10.5 3.5 12 2 Z"
        fill="url(#rocketGradient)"
      />
      {/* Side fins with modern styling */}
      <Path d="M9 12 L7 14 L9 16 L11 14 Z" fill="url(#rocketGradient)" opacity="0.8" />
      <Path d="M15 12 L17 14 L15 16 L13 14 Z" fill="url(#rocketGradient)" opacity="0.8" />
      {/* Enhanced flame trails */}
      <Path
        d="M10 14 L10 19 L11 17 L12 20 L13 17 L14 19 L14 14"
        fill="url(#flameGradient)"
        opacity="0.9"
      />
      <Path
        d="M11 14 L11 17 L12 16 L12 18 L13 16 L13 17 L13 14"
        fill="#FBBF24"
        opacity="0.7"
      />
      {/* Rocket window with reflection */}
      <Circle cx="12" cy="8" r="1.5" fill="#1E40AF" opacity="0.8" />
      <Circle cx="12" cy="8" r="1.2" fill="#3B82F6" />
      <Circle cx="11.5" cy="7.5" r="0.5" fill="#ffffff" opacity="0.6" />
      {/* Body details */}
      <Rect x="10.5" y="10" width="3" height="0.5" fill="#9CA3AF" opacity="0.5" />
      <Rect x="10.5" y="11.5" width="3" height="0.5" fill="#9CA3AF" opacity="0.5" />
      {/* Speed lines */}
      <Path d="M4 6 L6 6" stroke={color} strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      <Path d="M4 9 L6 9" stroke={color} strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      <Path d="M18 6 L20 6" stroke={color} strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      <Path d="M18 9 L20 9" stroke={color} strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      {/* Sparkle effects */}
      <Circle cx="6" cy="4" r="0.5" fill="#FBBF24" opacity="0.8" />
      <Circle cx="18" cy="4" r="0.5" fill="#FBBF24" opacity="0.8" />
    </G>
  </Svg>
);