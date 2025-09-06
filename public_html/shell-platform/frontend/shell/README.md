# Shell Platform - Frontend Application

A powerful, extensible React-based shell platform with Module Federation support for dynamic plugin loading.

## Features

- **Modern React Stack**: React 18, TypeScript, Vite
- **Module Federation**: Dynamic plugin loading with Vite Module Federation
- **State Management**: Redux Toolkit with React Query for server state
- **Authentication**: JWT-based auth with automatic token refresh
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Plugin System**: Dynamic plugin loading with isolation and lifecycle management
- **PWA Support**: Service worker with offline capabilities
- **Theme Management**: Light/dark mode with system preference detection
- **Comprehensive Testing**: Unit tests with Vitest and E2E tests with Playwright

## Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── common/         # Reusable UI components
│   ├── layout/         # Layout components
│   └── plugins/        # Plugin-related components
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── routes/             # Routing configuration
├── services/           # API services and configuration
├── store/              # Redux store and slices
├── styles/             # Global styles and Tailwind config
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── test/               # Test utilities and setup
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern browser with ES6 module support

### Installation

1. Clone the repository and navigate to the shell directory:
   ```bash
   cd /var/www/public_html/shell-platform/frontend/shell
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Update environment variables in `.env` as needed.

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Building

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Testing

### Unit Tests

Run unit tests:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

### E2E Tests

Run E2E tests:
```bash
npm run test:e2e
```

Run E2E tests with UI:
```bash
npm run test:e2e:ui
```

## Plugin Development

The shell application supports dynamic plugin loading through Module Federation. Plugins can:

- Add new routes and pages
- Contribute menu items to the navigation
- Provide dashboard widgets
- Access the shared application context
- Communicate with other plugins through the event bus

### Plugin Context

Each plugin receives a context object with:

- `user`: Current authenticated user
- `theme`: Current theme settings
- `navigate`: Navigation function
- `notification`: Notification system
- `eventBus`: Inter-plugin communication
- `storage`: Plugin-specific storage

### Example Plugin Usage

```tsx
import { PluginContainer } from '@/components/plugins/PluginContainer';

// Load a plugin in your component
<PluginContainer pluginId="my-awesome-plugin" />
```

## Architecture

### State Management

- **Redux Toolkit**: Global application state
- **React Query**: Server state management and caching
- **Local Storage**: Persistent user preferences

### Authentication

- JWT tokens with automatic refresh
- Role-based access control (RBAC)
- Permission-based route protection
- Session timeout handling

### Theme System

- Light/dark mode support
- System preference detection
- Customizable colors and typography
- CSS custom properties for dynamic theming

### Plugin System

- Dynamic module loading with Module Federation
- Plugin lifecycle management
- Error boundary isolation
- Inter-plugin communication
- Shared dependency optimization

## API Integration

The application integrates with a backend API for:

- User authentication and authorization
- Plugin registry and management
- User preferences and settings
- Real-time notifications

### API Configuration

Configure API endpoints in your `.env` file:
```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## PWA Features

- Service worker for offline support
- App manifest for installability
- Background sync for offline actions
- Push notification support
- Responsive design for all screen sizes

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Performance

- Code splitting with dynamic imports
- Lazy loading of routes and components
- Optimized bundle sizes with Module Federation
- Service worker caching strategies
- Image optimization and lazy loading

## Security

- XSS protection with CSP headers
- JWT token security best practices
- HTTPS enforcement in production
- Sanitized redirect URLs
- Permission-based access control

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

This project is part of the Shell Platform system.