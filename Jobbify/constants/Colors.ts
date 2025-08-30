/**
 * Colors.ts - Central color definitions for the application
 * 
 * This file synchronizes with Theme.ts to ensure consistent theming across the app.
 * These colors are used by the Themed components through useThemeColor.
 */
import { LightTheme, DarkTheme } from './Theme';

// Jobbify brand colors (base palette) - Light Yellow Theme
const jobbifyYellow = '#FFF9C4'; // Light yellow background
const jobbifyLightYellow = '#FFFDE7'; // Very light yellow for cards
const jobbifyMediumYellow = '#FFF59D'; // Medium yellow for accents
const jobbifyBlack = '#000000'; // Pure black for text
const jobbifyDarkGray = '#333333'; // Dark gray for secondary text
const jobbifyMediumGray = '#666666'; // Medium gray for tertiary text
const jobbifyLightGray = '#F0F0F0'; // Light gray for borders
const jobbifyWhite = '#FFFFFF'; // White

// Use the same colors as defined in Theme.ts for consistency
export default {
  light: {
    text: LightTheme.text,
    background: LightTheme.background,
    tint: LightTheme.tint,
    card: LightTheme.card,
    border: LightTheme.border,
    tabIconDefault: LightTheme.tabIconDefault,
    tabIconSelected: LightTheme.tabIconSelected,
    // Add more colors as needed for themed components
  },
  dark: {
    text: DarkTheme.text, 
    background: DarkTheme.background,
    tint: DarkTheme.tint,
    card: DarkTheme.card,
    border: DarkTheme.border,
    tabIconDefault: DarkTheme.tabIconDefault,
    tabIconSelected: DarkTheme.tabIconSelected,
    // Add more colors as needed for themed components
  },
};
