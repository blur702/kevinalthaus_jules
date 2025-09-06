import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector, selectUser, selectAuthLoading } from '@/store';
import { initializeAuthAsync } from '@/store/auth.slice';
import { initializeTheme, setSystemPreference } from '@/store/theme.slice';
import Header from './Header';
import Sidebar from './Sidebar';
import NotificationContainer from '@/components/common/NotificationContainer';
import Loading from '@/components/common/Loading';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const MainLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const authLoading = useAppSelector(selectAuthLoading);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the application
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize theme
        dispatch(initializeTheme());
        
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
          dispatch(setSystemPreference(e.matches ? 'dark' : 'light'));
        };
        
        mediaQuery.addEventListener('change', handleChange);
        
        // Initialize authentication
        await dispatch(initializeAuthAsync());
        
        return () => {
          mediaQuery.removeEventListener('change', handleChange);
        };
      } catch (error) {
        console.error('Failed to initialize application:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, [dispatch]);

  // Close mobile menu when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mobile menu toggle
  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Show loading screen while initializing
  if (!isInitialized || authLoading) {
    return (
      <Loading 
        fullScreen 
        variant="spinner" 
        text="Initializing Shell Platform..." 
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isMobileMenuOpen} 
          onClose={closeMobileMenu}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
          {/* Header */}
          <Header 
            onMenuToggle={handleMobileMenuToggle}
            isMobileMenuOpen={isMobileMenuOpen}
          />

          {/* Page content */}
          <main className="flex-1 overflow-hidden">
            <div className="h-full">
              <ErrorBoundary
                fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Something went wrong
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300">
                        Please refresh the page to try again.
                      </p>
                    </div>
                  </div>
                }
              >
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>

        {/* Notification container */}
        <NotificationContainer />
      </div>
    </ErrorBoundary>
  );
};

export default MainLayout;