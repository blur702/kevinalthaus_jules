import { createTheme, Theme, ThemeOptions } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';
import {
  colorTokens,
  typographyTokens,
  spacingTokens,
  borderRadiusTokens,
  shadowTokens,
  breakpointTokens,
  zIndexTokens,
} from './tokens';

/**
 * Custom theme interface extending MUI's Theme
 */
declare module '@mui/material/styles' {
  interface Theme {
    customShadows: typeof shadowTokens;
    customSpacing: typeof spacingTokens;
    customBorderRadius: typeof borderRadiusTokens;
    customZIndex: typeof zIndexTokens;
  }

  interface ThemeOptions {
    customShadows?: typeof shadowTokens;
    customSpacing?: typeof spacingTokens;
    customBorderRadius?: typeof borderRadiusTokens;
    customZIndex?: typeof zIndexTokens;
  }
}

/**
 * Create a custom theme with the specified mode
 * @param mode - 'light' or 'dark'
 * @returns MUI Theme object
 */
export const createShellTheme = (mode: PaletteMode = 'light'): Theme => {
  const isLight = mode === 'light';

  const baseThemeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: colorTokens.primary[500],
        light: colorTokens.primary[300],
        dark: colorTokens.primary[700],
        contrastText: colorTokens.common.white,
      },
      secondary: {
        main: colorTokens.secondary[500],
        light: colorTokens.secondary[300],
        dark: colorTokens.secondary[700],
        contrastText: colorTokens.common.white,
      },
      error: {
        main: colorTokens.error[500],
        light: colorTokens.error[300],
        dark: colorTokens.error[700],
        contrastText: colorTokens.common.white,
      },
      warning: {
        main: colorTokens.warning[500],
        light: colorTokens.warning[300],
        dark: colorTokens.warning[700],
        contrastText: colorTokens.common.black,
      },
      info: {
        main: colorTokens.info[500],
        light: colorTokens.info[300],
        dark: colorTokens.info[700],
        contrastText: colorTokens.common.white,
      },
      success: {
        main: colorTokens.success[500],
        light: colorTokens.success[300],
        dark: colorTokens.success[700],
        contrastText: colorTokens.common.white,
      },
      grey: colorTokens.grey,
      background: {
        default: isLight ? colorTokens.grey[50] : colorTokens.grey[900],
        paper: isLight ? colorTokens.common.white : colorTokens.grey[800],
      },
      text: {
        primary: isLight ? colorTokens.grey[900] : colorTokens.common.white,
        secondary: isLight ? colorTokens.grey[700] : colorTokens.grey[300],
        disabled: isLight ? colorTokens.grey[500] : colorTokens.grey[600],
      },
      divider: isLight ? colorTokens.grey[200] : colorTokens.grey[700],
      action: {
        active: isLight ? colorTokens.grey[600] : colorTokens.grey[400],
        hover: isLight ? colorTokens.grey[100] : colorTokens.grey[700],
        selected: isLight ? colorTokens.grey[200] : colorTokens.grey[600],
        disabled: isLight ? colorTokens.grey[400] : colorTokens.grey[600],
        disabledBackground: isLight ? colorTokens.grey[200] : colorTokens.grey[700],
      },
    },

    typography: {
      fontFamily: typographyTokens.fontFamily.primary,
      h1: {
        fontSize: typographyTokens.fontSize['5xl'],
        fontWeight: typographyTokens.fontWeight.bold,
        lineHeight: typographyTokens.lineHeight.tight,
        letterSpacing: typographyTokens.letterSpacing.tighter,
      },
      h2: {
        fontSize: typographyTokens.fontSize['4xl'],
        fontWeight: typographyTokens.fontWeight.bold,
        lineHeight: typographyTokens.lineHeight.tight,
        letterSpacing: typographyTokens.letterSpacing.tight,
      },
      h3: {
        fontSize: typographyTokens.fontSize['3xl'],
        fontWeight: typographyTokens.fontWeight.semibold,
        lineHeight: typographyTokens.lineHeight.tight,
      },
      h4: {
        fontSize: typographyTokens.fontSize['2xl'],
        fontWeight: typographyTokens.fontWeight.semibold,
        lineHeight: typographyTokens.lineHeight.normal,
      },
      h5: {
        fontSize: typographyTokens.fontSize.xl,
        fontWeight: typographyTokens.fontWeight.semibold,
        lineHeight: typographyTokens.lineHeight.normal,
      },
      h6: {
        fontSize: typographyTokens.fontSize.lg,
        fontWeight: typographyTokens.fontWeight.medium,
        lineHeight: typographyTokens.lineHeight.normal,
      },
      subtitle1: {
        fontSize: typographyTokens.fontSize.base,
        fontWeight: typographyTokens.fontWeight.medium,
        lineHeight: typographyTokens.lineHeight.normal,
      },
      subtitle2: {
        fontSize: typographyTokens.fontSize.sm,
        fontWeight: typographyTokens.fontWeight.medium,
        lineHeight: typographyTokens.lineHeight.normal,
      },
      body1: {
        fontSize: typographyTokens.fontSize.base,
        fontWeight: typographyTokens.fontWeight.regular,
        lineHeight: typographyTokens.lineHeight.relaxed,
      },
      body2: {
        fontSize: typographyTokens.fontSize.sm,
        fontWeight: typographyTokens.fontWeight.regular,
        lineHeight: typographyTokens.lineHeight.normal,
      },
      caption: {
        fontSize: typographyTokens.fontSize.xs,
        fontWeight: typographyTokens.fontWeight.regular,
        lineHeight: typographyTokens.lineHeight.normal,
      },
      overline: {
        fontSize: typographyTokens.fontSize.xs,
        fontWeight: typographyTokens.fontWeight.medium,
        lineHeight: typographyTokens.lineHeight.normal,
        textTransform: 'uppercase',
        letterSpacing: typographyTokens.letterSpacing.wider,
      },
      button: {
        fontSize: typographyTokens.fontSize.sm,
        fontWeight: typographyTokens.fontWeight.medium,
        textTransform: 'none',
        letterSpacing: typographyTokens.letterSpacing.wide,
      },
    },

    spacing: (factor: number) => spacingTokens[factor as keyof typeof spacingTokens] || `${factor * 4}px`,

    breakpoints: {
      values: breakpointTokens,
    },

    shape: {
      borderRadius: parseInt(borderRadiusTokens.base),
    },

    shadows: [
      'none',
      shadowTokens.xs,
      shadowTokens.sm,
      shadowTokens.base,
      shadowTokens.base,
      shadowTokens.md,
      shadowTokens.md,
      shadowTokens.lg,
      shadowTokens.lg,
      shadowTokens.xl,
      shadowTokens.xl,
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
      shadowTokens['2xl'],
    ],

    zIndex: {
      mobileStepper: zIndexTokens.sticky,
      fab: zIndexTokens.docked,
      speedDial: zIndexTokens.docked,
      appBar: zIndexTokens.sticky,
      drawer: zIndexTokens.overlay,
      modal: zIndexTokens.modal,
      snackbar: zIndexTokens.toast,
      tooltip: zIndexTokens.tooltip,
    },

    // Custom theme extensions
    customShadows: shadowTokens,
    customSpacing: spacingTokens,
    customBorderRadius: borderRadiusTokens,
    customZIndex: zIndexTokens,
  };

  // Create base theme
  const theme = createTheme(baseThemeOptions);

  // Enhance with component-specific customizations
  return createTheme(theme, {
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: borderRadiusTokens.md,
            textTransform: 'none',
            fontWeight: typographyTokens.fontWeight.medium,
            padding: `${spacingTokens[2]} ${spacingTokens[4]}`,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: shadowTokens.md,
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${colorTokens.primary[500]} 0%, ${colorTokens.primary[600]} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${colorTokens.primary[600]} 0%, ${colorTokens.primary[700]} 100%)`,
            },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${colorTokens.secondary[500]} 0%, ${colorTokens.secondary[600]} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${colorTokens.secondary[600]} 0%, ${colorTokens.secondary[700]} 100%)`,
            },
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: borderRadiusTokens.lg,
            boxShadow: shadowTokens.sm,
            border: `1px solid ${isLight ? colorTokens.grey[200] : colorTokens.grey[700]}`,
            '&:hover': {
              boxShadow: shadowTokens.md,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },

      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: borderRadiusTokens.md,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: colorTokens.primary[300],
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
                borderColor: colorTokens.primary[500],
              },
            },
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: borderRadiusTokens.lg,
            border: `1px solid ${isLight ? colorTokens.grey[200] : colorTokens.grey[700]}`,
          },
          elevation1: {
            boxShadow: shadowTokens.sm,
          },
          elevation2: {
            boxShadow: shadowTokens.base,
          },
          elevation3: {
            boxShadow: shadowTokens.md,
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? colorTokens.common.white : colorTokens.grey[800],
            color: isLight ? colorTokens.grey[900] : colorTokens.common.white,
            boxShadow: shadowTokens.sm,
            borderBottom: `1px solid ${isLight ? colorTokens.grey[200] : colorTokens.grey[700]}`,
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${isLight ? colorTokens.grey[200] : colorTokens.grey[700]}`,
            backgroundColor: isLight ? colorTokens.common.white : colorTokens.grey[800],
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: borderRadiusTokens.full,
            fontWeight: typographyTokens.fontWeight.medium,
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: borderRadiusTokens.md,
            border: '1px solid',
          },
          standardSuccess: {
            borderColor: colorTokens.success[200],
            backgroundColor: isLight ? colorTokens.success[50] : colorTokens.success[900],
          },
          standardError: {
            borderColor: colorTokens.error[200],
            backgroundColor: isLight ? colorTokens.error[50] : colorTokens.error[900],
          },
          standardWarning: {
            borderColor: colorTokens.warning[200],
            backgroundColor: isLight ? colorTokens.warning[50] : colorTokens.warning[900],
          },
          standardInfo: {
            borderColor: colorTokens.info[200],
            backgroundColor: isLight ? colorTokens.info[50] : colorTokens.info[900],
          },
        },
      },
    },
  });
};

// Default light and dark themes
export const lightTheme = createShellTheme('light');
export const darkTheme = createShellTheme('dark');