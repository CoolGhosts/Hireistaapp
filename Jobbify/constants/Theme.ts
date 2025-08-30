// Theme color constants for the app

// Jobbify brand colors - Light Yellow Theme
const jobbifyYellow = '#FFF9C4'; // Light yellow background
const jobbifyLightYellow = '#FFFDE7'; // Very light yellow for cards
const jobbifyMediumYellow = '#FFF59D'; // Medium yellow for accents
const jobbifyBlack = '#000000'; // Pure black for text
const jobbifyDarkGray = '#333333'; // Dark gray for secondary text
const jobbifyMediumGray = '#666666'; // Medium gray for tertiary text
const jobbifyLightGray = '#F0F0F0'; // Light gray for borders
const jobbifyWhite = '#FFFFFF'; // White

export interface ThemeColors {
  // Base colors
  background: string;
  card: string;
  cardSecondary: string;  // secondary card background
  text: string;
  textSecondary: string;
  border: string;
  tint: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  
  // Component specific
  headerBackground: string;
  tabBackground: string;
  tabIconDefault: string;
  tabIconSelected: string;
  cardGradient: readonly [string, string, string]; 
  applyButtonColor: string;
  passButtonColor: string;
  infoButtonColor: string;
  searchBackground: string;
  statusBackground: string;
  modalBackdrop: string;
  backgroundSecondary: string;  // secondary background for modals/buttons
  
  // Additional theme colors
  primary?: string;
  danger?: string;
}

export const LightTheme: ThemeColors = {
  // Base colors
  background: '#FFF9C4', // Light yellow background
  card: '#FFFDE7', // Very light yellow for cards
  cardSecondary: '#FFF59D', // Medium yellow for secondary cards
  text: '#000000', // Pure black text
  textSecondary: '#333333', // Dark gray for secondary text
  border: '#F0F0F0', // Light gray borders
  tint: '#000000', // Black tint
  error: '#D32F2F', // Red for errors
  success: '#388E3C', // Green for success
  warning: '#F57C00', // Orange for warnings
  info: '#1976D2', // Blue for info
  
  // Component specific
  headerBackground: '#FFF9C4', // Light yellow header
  tabBackground: '#FFF9C4', // Light yellow tab background
  tabIconDefault: '#666666', // Gray for inactive tabs
  tabIconSelected: '#000000', // Black for selected tabs
  cardGradient: ['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)'] as const,
  applyButtonColor: '#000000', // Black apply button
  passButtonColor: '#D32F2F', // Red pass button
  infoButtonColor: '#1976D2', // Blue info button
  searchBackground: '#FFFDE7', // Very light yellow search background
  statusBackground: '#FFF59D', // Medium yellow status background
  modalBackdrop: 'rgba(0,0,0,0.08)',
  backgroundSecondary: '#FFFDE7', // Very light yellow secondary background
};

export const DarkTheme: ThemeColors = {
  // Base colors
  background: '#000000',
  card: '#111111',
  cardSecondary: '#181818',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#222222',
  tint: '#FFFFFF',
  error: '#FF5252',
  success: '#69F0AE',
  warning: '#FFD740',
  info: '#40C4FF',
  
  // Component specific
  headerBackground: '#000000',
  tabBackground: '#000000',
  tabIconDefault: '#B0B0B0',
  tabIconSelected: '#FFFFFF',
  cardGradient: ['transparent', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0.9)'] as const,
  applyButtonColor: '#FFFFFF',
  passButtonColor: '#FF5252',
  infoButtonColor: '#40C4FF',
  searchBackground: '#181818',
  statusBackground: '#181818',
  modalBackdrop: 'rgba(255,255,255,0.08)',
  backgroundSecondary: '#181818',
};
