import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Theme } from '@/types';

interface ThemeState extends Theme {
  systemPreference: 'light' | 'dark';
  effectiveTheme: 'light' | 'dark';
}

const getSystemPreference = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getStoredTheme = (): Theme => {
  const stored = localStorage.getItem('shell-theme');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fallback to default if stored theme is invalid
    }
  }
  
  return {
    mode: 'system',
    primaryColor: '#3b82f6',
    accentColor: '#6366f1',
    fontSize: 'medium',
  };
};

const calculateEffectiveTheme = (mode: Theme['mode'], systemPreference: 'light' | 'dark'): 'light' | 'dark' => {
  return mode === 'system' ? systemPreference : mode;
};

const initialSystemPreference = getSystemPreference();
const initialTheme = getStoredTheme();

const initialState: ThemeState = {
  ...initialTheme,
  systemPreference: initialSystemPreference,
  effectiveTheme: calculateEffectiveTheme(initialTheme.mode, initialSystemPreference),
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<Theme['mode']>) => {
      state.mode = action.payload;
      state.effectiveTheme = calculateEffectiveTheme(action.payload, state.systemPreference);
      
      // Persist to localStorage
      const themeToStore: Theme = {
        mode: state.mode,
        primaryColor: state.primaryColor,
        accentColor: state.accentColor,
        fontSize: state.fontSize,
      };
      localStorage.setItem('shell-theme', JSON.stringify(themeToStore));
      
      // Apply theme to document
      applyThemeToDocument(state);
    },
    
    setPrimaryColor: (state, action: PayloadAction<string>) => {
      state.primaryColor = action.payload;
      
      const themeToStore: Theme = {
        mode: state.mode,
        primaryColor: state.primaryColor,
        accentColor: state.accentColor,
        fontSize: state.fontSize,
      };
      localStorage.setItem('shell-theme', JSON.stringify(themeToStore));
      
      applyThemeToDocument(state);
    },
    
    setAccentColor: (state, action: PayloadAction<string>) => {
      state.accentColor = action.payload;
      
      const themeToStore: Theme = {
        mode: state.mode,
        primaryColor: state.primaryColor,
        accentColor: state.accentColor,
        fontSize: state.fontSize,
      };
      localStorage.setItem('shell-theme', JSON.stringify(themeToStore));
      
      applyThemeToDocument(state);
    },
    
    setFontSize: (state, action: PayloadAction<Theme['fontSize']>) => {
      state.fontSize = action.payload;
      
      const themeToStore: Theme = {
        mode: state.mode,
        primaryColor: state.primaryColor,
        accentColor: state.accentColor,
        fontSize: state.fontSize,
      };
      localStorage.setItem('shell-theme', JSON.stringify(themeToStore));
      
      applyThemeToDocument(state);
    },
    
    setSystemPreference: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.systemPreference = action.payload;
      state.effectiveTheme = calculateEffectiveTheme(state.mode, action.payload);
      
      applyThemeToDocument(state);
    },
    
    resetTheme: (state) => {
      const defaultTheme = {
        mode: 'system' as const,
        primaryColor: '#3b82f6',
        accentColor: '#6366f1',
        fontSize: 'medium' as const,
      };
      
      Object.assign(state, {
        ...defaultTheme,
        systemPreference: state.systemPreference,
        effectiveTheme: calculateEffectiveTheme(defaultTheme.mode, state.systemPreference),
      });
      
      localStorage.setItem('shell-theme', JSON.stringify(defaultTheme));
      applyThemeToDocument(state);
    },
    
    initializeTheme: (state) => {
      applyThemeToDocument(state);
    },
  },
});

// Helper function to apply theme to document
const applyThemeToDocument = (theme: ThemeState) => {
  const root = document.documentElement;
  
  // Apply dark/light mode class
  if (theme.effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // Apply custom CSS variables
  root.style.setProperty('--primary-color', theme.primaryColor);
  root.style.setProperty('--accent-color', theme.accentColor);
  
  // Apply font size
  const fontSizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px',
  };
  root.style.setProperty('--base-font-size', fontSizeMap[theme.fontSize]);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      theme.effectiveTheme === 'dark' ? '#0f172a' : '#ffffff'
    );
  }
};

export const {
  setThemeMode,
  setPrimaryColor,
  setAccentColor,
  setFontSize,
  setSystemPreference,
  resetTheme,
  initializeTheme,
} = themeSlice.actions;

export default themeSlice.reducer;

// Selector helpers
export const selectEffectiveTheme = (state: { theme: ThemeState }) => state.theme.effectiveTheme;
export const selectThemeMode = (state: { theme: ThemeState }) => state.theme.mode;
export const selectPrimaryColor = (state: { theme: ThemeState }) => state.theme.primaryColor;
export const selectAccentColor = (state: { theme: ThemeState }) => state.theme.accentColor;
export const selectFontSize = (state: { theme: ThemeState }) => state.theme.fontSize;