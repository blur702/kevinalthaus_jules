/**
 * Theme module exports
 * Provides centralized access to theme-related functionality
 */

export * from './tokens';
export * from './theme';
export * from './ThemeProvider';

// Re-export commonly used MUI theme types for convenience
export type {
  Theme,
  ThemeOptions,
  PaletteMode,
  Palette,
  PaletteOptions,
  Typography,
  TypographyOptions,
  Breakpoints,
  BreakpointsOptions,
} from '@mui/material/styles';