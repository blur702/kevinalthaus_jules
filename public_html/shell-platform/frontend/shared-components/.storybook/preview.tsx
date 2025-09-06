import React from 'react';
import type { Preview } from '@storybook/react';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { ShellThemeProvider } from '../src/theme';

// Global styles for Storybook
const globalStyles = (
  <GlobalStyles
    styles={{
      body: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      },
    }}
  />
);

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      theme: {
        base: 'light',
        brandTitle: 'Shell Platform Components',
        brandUrl: '/',
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
        { name: 'grey', value: '#f5f5f5' },
      ],
    },
    layout: 'padded',
  },
  
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
      },
    },
  },
  
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      
      return (
        <ShellThemeProvider defaultMode={theme as 'light' | 'dark'}>
          <CssBaseline />
          {globalStyles}
          <div style={{ padding: '1rem' }}>
            <Story />
          </div>
        </ShellThemeProvider>
      );
    },
  ],
};

export default preview;