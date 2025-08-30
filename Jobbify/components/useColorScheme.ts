import { useAppContext } from '../context/AppContext';

// Custom hook that uses our context-based theme instead of the system one
export function useColorScheme() {
  const { theme } = useAppContext();
  return theme;
}
