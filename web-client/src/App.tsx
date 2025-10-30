import { ThemeProvider, createTheme } from '@mui/material';
import { useEffect, useMemo } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { AppSidebar } from './components/layout/AppSidebar';
import { useColorScheme } from './hooks/useColorScheme';
import { useBrandingStore } from './stores/brandingStore';
import { NotificationsProvider } from './providers/NotificationsProvider';
import { theme } from './theme/theme';
import { useState } from 'react';
import { AppTutorial } from './components/tutorial/AppTutorial';

export function App() {
  const [runTour, setRunTour] = useState(false);
  const { colorScheme } = useColorScheme();
  const { primaryColor, secondaryColor } = useBrandingStore();

  // Create theme based on branding colors and system preference
  const customTheme = useMemo(() => createTheme({
    ...theme,
    palette: {
      ...theme.palette,
      mode: colorScheme,
      primary: {
        main: primaryColor || theme.palette.primary.main,
      },
      secondary: {
        main: secondaryColor || theme.palette.secondary.main,
      },
    },
  }), [colorScheme, primaryColor, secondaryColor]);

  // Listen for system color scheme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <ThemeProvider theme={customTheme}>
      <NotificationsProvider>
        <BrowserRouter>
          <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
            <AppSidebar onStartTour={() => setRunTour(true)} />
            <main className="flex-1 overflow-auto">
              <AppRoutes />
            </main>
            <AppTutorial run={runTour} onClose={() => setRunTour(false)} />
          </div>
        </BrowserRouter>
      </NotificationsProvider>
    </ThemeProvider>
  );
}