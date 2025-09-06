import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { store } from '@/store';
import { queryClient } from '@/services/query-client';
import AppRouter from '@/routes/AppRouter';
import AuthProvider from '@/components/auth/AuthProvider';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import '@/styles/globals.css';

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Prevent the default browser behavior (logging to console)
  event.preventDefault();
  
  // You could send this to an error tracking service
  // errorTrackingService.captureException(event.reason);
});

// Global error handler for JavaScript errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // You could send this to an error tracking service
  // errorTrackingService.captureException(event.error);
});

const App: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error Boundary:', error, errorInfo);
        // You could send this to an error tracking service
        // errorTrackingService.captureException(error, { extra: errorInfo });
      }}
      showDetails={import.meta.env.DEV}
    >
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
          
          {/* React Query DevTools - only in development */}
          {import.meta.env.DEV && (
            <ReactQueryDevtools 
              initialIsOpen={false} 
              position="bottom-right"
            />
          )}
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;