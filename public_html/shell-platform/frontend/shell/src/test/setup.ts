import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  },
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  },
  writable: true,
});

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

// Mock console methods to reduce noise in tests
const originalError = console.error;
console.error = (...args: any[]) => {
  // Suppress React error boundary console errors in tests
  if (
    args[0]?.includes?.('Error: Uncaught [Error: ') ||
    args[0]?.includes?.('The above error occurred')
  ) {
    return;
  }
  originalError(...args);
};

// Mock fetch
global.fetch = vi.fn();

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  value: vi.fn(() => 'mocked-uuid-1234-5678-9012'),
});

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_API_BASE_URL: 'http://localhost:3001/api',
    DEV: true,
    MODE: 'test',
  },
}));

// Setup global test utilities
global.TEST_USER = {
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
  roles: ['user'],
  permissions: ['dashboard.read', 'plugins.read'],
  preferences: {
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      desktop: true,
    },
  },
  lastLoginAt: '2023-01-01T00:00:00.000Z',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
};

global.TEST_PLUGIN = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'A test plugin',
  author: 'Test Author',
  category: 'testing',
  tags: ['test'],
  remoteUrl: 'http://localhost:3002/plugin.js',
  exposedModule: './Plugin',
  permissions: [],
  dependencies: [],
  configuration: {
    routes: [],
    menuItems: [],
    settings: [],
    features: [],
  },
  status: 'active',
  metadata: {
    installDate: '2023-01-01T00:00:00.000Z',
    size: 1024,
    hash: 'test-hash',
  },
};