import { Stack } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';

// Explicitly set the group title to empty to hide (modals) in the header
export const options = {
  title: '',
};

export default function ModalLayout() {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;

  return (
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: themeColors.headerBackground,
      },
      headerTintColor: themeColors.tint,
      headerTitleStyle: {
        color: themeColors.text,
      },
      contentStyle: {
        backgroundColor: themeColors.background,
      },
      presentation: 'modal',
      animation: 'slide_from_bottom',
      // Do not hide the header globally
    }}>
    </Stack>
  );
}
