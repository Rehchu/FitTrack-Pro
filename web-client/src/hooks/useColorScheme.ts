import { useEffect, useState } from 'react';

type ColorScheme = 'light' | 'dark';

export function useColorScheme() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    // Check for saved preference
    const saved = localStorage.getItem('colorScheme') as ColorScheme;
    if (saved) return saved;
    
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Update theme and save preference
  useEffect(() => {
    localStorage.setItem('colorScheme', colorScheme);
    document.documentElement.classList.toggle('dark', colorScheme === 'dark');
  }, [colorScheme]);

  const toggleColorScheme = () => {
    setColorScheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return {
    colorScheme,
    toggleColorScheme,
    isDark: colorScheme === 'dark'
  };
}