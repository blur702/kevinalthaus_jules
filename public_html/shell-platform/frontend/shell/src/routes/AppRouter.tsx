import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector, selectIsAuthenticated } from '@/store';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Loading from '@/components/common/Loading';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Lazy load pages for code splitting
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const LoginForm = React.lazy(() => import('@/components/auth/LoginForm'));
const RegisterForm = React.lazy(() => import('@/components/auth/RegisterForm'));
const PluginManager = React.lazy(() => import('@/components/plugins/PluginManager'));
const Profile = React.lazy(() => import('@/pages/Profile'));
const Settings = React.lazy(() => import('@/pages/Settings'));
const Users = React.lazy(() => import('@/pages/Users'));
const Analytics = React.lazy(() => import('@/pages/Analytics'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));

// Public route wrapper
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense 
          fallback={
            <Loading 
              fullScreen 
              variant="spinner" 
              text="Loading..." 
            />
          }
        >
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginForm />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterForm />
                </PublicRoute>
              }
            />

            {/* Protected routes with main layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route index element={<Dashboard />} />

              {/* Plugin routes */}
              <Route
                path="plugins/*"
                element={
                  <ProtectedRoute permissions={['plugins.read']}>
                    <Routes>
                      <Route index element={<Navigate to="installed" replace />} />
                      <Route 
                        path="installed" 
                        element={<PluginManager />} 
                      />
                      <Route 
                        path="marketplace" 
                        element={
                          <ProtectedRoute permissions={['plugins.install']}>
                            <PluginManager />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="develop" 
                        element={
                          <ProtectedRoute permissions={['plugins.develop']}>
                            <div className="p-8 text-center">
                              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                                Plugin Development
                              </h2>
                              <p className="text-gray-600 dark:text-gray-300">
                                Plugin development tools coming soon...
                              </p>
                            </div>
                          </ProtectedRoute>
                        } 
                      />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* User management */}
              <Route
                path="users"
                element={
                  <ProtectedRoute permissions={['users.read']}>
                    <Users />
                  </ProtectedRoute>
                }
              />

              {/* Analytics */}
              <Route
                path="analytics"
                element={
                  <ProtectedRoute permissions={['analytics.read']}>
                    <Analytics />
                  </ProtectedRoute>
                }
              />

              {/* Profile */}
              <Route path="profile" element={<Profile />} />

              {/* Settings */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute permissions={['settings.read']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Dynamic plugin routes */}
              <Route
                path="plugin/:pluginId/*"
                element={
                  <ProtectedRoute>
                    <PluginRouteHandler />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
};

// Component to handle dynamic plugin routes
const PluginRouteHandler: React.FC = () => {
  const { useParams } = require('react-router-dom');
  const { pluginId } = useParams<{ pluginId: string }>();
  
  if (!pluginId) {
    return <Navigate to="/404" replace />;
  }

  // This would be enhanced to check if plugin exists and has routes
  return (
    <div className="p-8">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">
          Plugin Route: {pluginId}
        </h2>
        <p className="text-blue-700 dark:text-blue-300">
          Dynamic plugin routing is being implemented. This will render the plugin's custom routes.
        </p>
      </div>
    </div>
  );
};

export default AppRouter;