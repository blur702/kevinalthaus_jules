import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector, selectAuthLoading } from '@/store';
import { initializeAuthAsync } from '@/store/auth.slice';
import Loading from '@/components/common/Loading';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const authLoading = useAppSelector(selectAuthLoading);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await dispatch(initializeAuthAsync()).unwrap();
      } catch (error) {
        // Failed to initialize auth - user will need to login
        console.log('Authentication initialization failed - user needs to login');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Show loading screen while initializing authentication
  if (isInitializing || authLoading) {
    return (
      <Loading 
        fullScreen 
        variant="spinner" 
        text="Initializing authentication..." 
      />
    );
  }

  return <>{children}</>;
};

export default AuthProvider;