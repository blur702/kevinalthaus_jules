import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { PaletteMode } from '@mui/material';
import { createShellTheme } from './theme';

/**
 * Theme context interface
 */
interface ThemeContextValue {
  mode: PaletteMode;
  toggleTheme: () => void;
  setTheme: (mode: PaletteMode) => void;
}

/**
 * Theme provider props
 */
interface ShellThemeProviderProps {
  children: ReactNode;
  defaultMode?: PaletteMode;
  persistTheme?: boolean;
  storageKey?: string;
}

// Theme context
const ThemeContext = createContext<ThemeContextValue | null>(null);

// Local storage key for theme persistence
const DEFAULT_STORAGE_KEY = 'shell-platform-theme-mode';

/**
 * Custom hook to use theme context
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ShellThemeProvider');
  }
  return context;
};

/**
 * Theme provider component that manages light/dark theme state
 * and provides theme context to child components
 */
export const ShellThemeProvider: React.FC<ShellThemeProviderProps> = ({
  children,
  defaultMode = 'light',
  persistTheme = true,
  storageKey = DEFAULT_STORAGE_KEY,
}) => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    if (persistTheme && typeof window !== 'undefined') {
      const savedMode = localStorage.getItem(storageKey) as PaletteMode;
      if (savedMode === 'light' || savedMode === 'dark') {
        return savedMode;
      }
      
      // Check for system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return defaultMode;
  });

  // Create theme based on current mode
  const theme = createShellTheme(mode);

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  /**
   * Set specific theme mode
   * @param newMode - Theme mode to set
   */
  const setTheme = (newMode: PaletteMode) => {
    setMode(newMode);
  };

  // Persist theme preference to localStorage
  useEffect(() => {
    if (persistTheme && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, mode);
    }
  }, [mode, persistTheme, storageKey]);

  // Listen for system theme changes
  useEffect(() => {
    if (!persistTheme || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if no explicit preference is stored
      const savedMode = localStorage.getItem(storageKey);
      if (!savedMode) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [persistTheme, storageKey]);

  // Update document class for CSS custom properties
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mode);
    }
  }, [mode]);

  const contextValue: ThemeContextValue = {
    mode,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

/**
 * HOC to provide theme context to components
 * @param Component - Component to wrap
 * @returns Component wrapped with theme provider
 */
export function withTheme<P extends object>(Component: React.ComponentType<P>) {
  return function ThemedComponent(props: P) {
    return (
      <ShellThemeProvider>
        <Component {...props} />
      </ShellThemeProvider>
    );
  };
}