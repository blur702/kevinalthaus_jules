import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';

import authReducer from '@/store/auth.slice';
import pluginReducer from '@/store/plugin.slice';
import themeReducer from '@/store/theme.slice';
import notificationReducer from '@/store/notification.slice';

// Test store factory
export const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      plugins: pluginReducer,
      theme: themeReducer,
      notifications: notificationReducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
};

// Test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: ReturnType<typeof createTestStore>;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

export const renderWithProviders = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    queryClient = createTestQueryClient(),
    initialEntries = ['/'],
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );

  return {
    user: userEvent.setup(),
    store,
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// Mock authenticated state
export const mockAuthenticatedState = {
  auth: {
    user: global.TEST_USER,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
    sessionTimeoutWarning: false,
  },
};

// Mock unauthenticated state
export const mockUnauthenticatedState = {
  auth: {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    sessionTimeoutWarning: false,
  },
};

// Mock theme state
export const mockThemeState = {
  theme: {
    mode: 'light' as const,
    primaryColor: '#3b82f6',
    accentColor: '#6366f1',
    fontSize: 'medium' as const,
    systemPreference: 'light' as const,
    effectiveTheme: 'light' as const,
  },
};

// Mock plugin state
export const mockPluginState = {
  plugins: {
    registry: {
      plugins: [global.TEST_PLUGIN],
      categories: [
        {
          id: 'testing',
          name: 'Testing',
          description: 'Test plugins',
          order: 0,
        },
      ],
      lastUpdate: '2023-01-01T00:00:00.000Z',
      version: '1.0.0',
    },
    installedPlugins: [global.TEST_PLUGIN],
    loadedPlugins: {},
    activePlugins: [global.TEST_PLUGIN.id],
    errors: [],
    isLoading: false,
    error: null,
  },
};

// Mock notifications state
export const mockNotificationState = {
  notifications: {
    notifications: [],
    maxNotifications: 5,
  },
};

// Mock complete app state
export const mockAppState = {
  ...mockAuthenticatedState,
  ...mockThemeState,
  ...mockPluginState,
  ...mockNotificationState,
};

// Mock fetch responses
export const mockFetchSuccess = (data: any) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
    headers: new Headers(),
    status: 200,
    statusText: 'OK',
  });
};

export const mockFetchError = (status = 500, message = 'Internal Server Error') => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ error: message }),
    headers: new Headers(),
    status,
    statusText: message,
  });
};

export const mockFetchNetworkError = () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));
};

// Test helpers for local storage
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {};

  vi.mocked(window.localStorage.getItem).mockImplementation((key) => storage[key] || null);
  vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
    storage[key] = value;
  });
  vi.mocked(window.localStorage.removeItem).mockImplementation((key) => {
    delete storage[key];
  });
  vi.mocked(window.localStorage.clear).mockImplementation(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  });

  return storage;
};

// Test helpers for session storage
export const mockSessionStorage = () => {
  const storage: Record<string, string> = {};

  vi.mocked(window.sessionStorage.getItem).mockImplementation((key) => storage[key] || null);
  vi.mocked(window.sessionStorage.setItem).mockImplementation((key, value) => {
    storage[key] = value;
  });
  vi.mocked(window.sessionStorage.removeItem).mockImplementation((key) => {
    delete storage[key];
  });
  vi.mocked(window.sessionStorage.clear).mockImplementation(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  });

  return storage;
};

// Wait for async updates
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Mock intersection observer for components that use it
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
};

// Mock resize observer for components that use it
export const mockResizeObserver = () => {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
};

// Mock media query for responsive components
export const mockMediaQuery = (matches: boolean) => {
  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

// Export everything for convenience
export * from '@testing-library/react';
export { userEvent };