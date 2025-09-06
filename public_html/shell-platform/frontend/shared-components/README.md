# Shell Platform Shared Components

A comprehensive Material-UI based component library for the Shell Platform with accessibility, theming, and responsive design built-in.

## Features

- 🎨 **Comprehensive Design System** - Consistent visual language with light/dark theme support
- ♿ **Accessibility First** - WCAG 2.1 AA compliant with full keyboard navigation and screen reader support
- 📱 **Responsive Design** - Mobile-first approach with flexible breakpoints
- 🧪 **Well Tested** - Comprehensive unit tests with high coverage
- 📖 **Storybook Integration** - Interactive component documentation
- 🚀 **Performance Optimized** - Tree-shakeable with lazy loading support
- 🔧 **TypeScript Support** - Full type safety with detailed prop interfaces

## Installation

```bash
npm install @shell-platform/shared-components
```

### Peer Dependencies

```bash
npm install react react-dom @mui/material @emotion/react @emotion/styled
```

## Quick Start

```tsx
import React from 'react';
import { ShellThemeProvider, Button, AppBar } from '@shell-platform/shared-components';

function App() {
  return (
    <ShellThemeProvider>
      <AppBar title="Shell Platform" />
      <Button variant="contained" color="primary">
        Get Started
      </Button>
    </ShellThemeProvider>
  );
}
```

## Components

### Core Components

#### Layout
- **AppBar** - Application header with navigation and user menu
- **Drawer** - Collapsible sidebar navigation
- **Footer** - Application footer with links and branding

#### Buttons
- **Button** - Primary action button with loading states
- **IconButton** - Icon-only button with tooltips and badges
- **FAB** - Floating action button with positioning

#### Feedback
- **Alert** - Contextual messages with dismissible functionality
- **Loading** - Multiple loading indicators including skeleton loaders
- **Snackbar** - Toast notifications (coming soon)
- **Dialog** - Modal dialogs (coming soon)

### Advanced Components (Coming Soon)

- **DataGrid** - Feature-rich data table with sorting, filtering, and pagination
- **Charts** - Interactive charts powered by Recharts
- **RichTextEditor** - WYSIWYG text editor
- **CodeEditor** - Syntax-highlighted code editor
- **ImageGallery** - Responsive image gallery with lightbox
- **DragAndDrop** - Drag and drop interface components

## Theme System

The component library includes a comprehensive theme system with:

- Light and dark mode support
- Consistent color palette
- Typography scale
- Spacing system
- Responsive breakpoints
- Custom shadows and elevations

### Using the Theme Provider

```tsx
import { ShellThemeProvider, useTheme } from '@shell-platform/shared-components';

function MyComponent() {
  const { mode, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Switch to {mode === 'light' ? 'dark' : 'light'} mode
    </button>
  );
}

function App() {
  return (
    <ShellThemeProvider defaultMode="light" persistTheme>
      <MyComponent />
    </ShellThemeProvider>
  );
}
```

## Accessibility

All components are built with accessibility in mind:

- **Keyboard Navigation** - Full keyboard support for all interactive elements
- **Screen Reader Support** - Proper ARIA labels and semantic HTML
- **Focus Management** - Logical focus flow and visible focus indicators
- **Color Contrast** - WCAG AA compliant color combinations
- **Reduced Motion** - Respects user's motion preferences

### Accessibility Hooks

```tsx
import { useFocusTrap, useKeyboardNavigation, useAnnouncer } from '@shell-platform/shared-components';

function AccessibleModal({ open, onClose }) {
  const containerRef = useFocusTrap(open);
  const announce = useAnnouncer();
  const { onKeyDown } = useKeyboardNavigation({
    onEscape: onClose
  });

  React.useEffect(() => {
    if (open) {
      announce('Modal opened', 'polite');
    }
  }, [open, announce]);

  return (
    <div ref={containerRef} onKeyDown={onKeyDown}>
      {/* Modal content */}
    </div>
  );
}
```

## Development

### Running Storybook

```bash
npm run storybook
```

### Running Tests

```bash
npm test
npm run test:coverage
```

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Component Development Guidelines

- Follow the existing component structure
- Include comprehensive TypeScript interfaces
- Add accessibility features by default
- Write unit tests with good coverage
- Create Storybook stories for all variants
- Document props with JSDoc comments

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License - see LICENSE file for details.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.