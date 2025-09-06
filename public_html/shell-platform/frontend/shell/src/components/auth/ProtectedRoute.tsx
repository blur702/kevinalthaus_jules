import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector, selectIsAuthenticated, selectUser, selectAuthLoading } from '@/store';
import { hasPermission, hasRole } from '@/utils/auth.utils';
import Loading from '@/components/common/Loading';
import ErrorBoundary from '@/components/common/ErrorBoundary';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions/roles, otherwise ANY
  fallback?: React.ReactNode;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback,
  redirectTo = '/login',
}) => {
  const location = useLocation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const authLoading = useAppSelector(selectAuthLoading);

  // Show loading while authentication is being checked
  if (authLoading) {
    return <Loading fullScreen text="Verifying authentication..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If no permissions or roles are required, allow access
  if (permissions.length === 0 && roles.length === 0) {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    );
  }

  const userPermissions = user?.permissions || [];
  const userRoles = user?.roles || [];

  // Check permissions
  const hasRequiredPermissions = permissions.length === 0 || (
    requireAll 
      ? permissions.every(permission => hasPermission(userPermissions, permission))
      : permissions.some(permission => hasPermission(userPermissions, permission))
  );

  // Check roles
  const hasRequiredRoles = roles.length === 0 || (
    requireAll
      ? roles.every(role => hasRole(userRoles, role))
      : roles.some(role => hasRole(userRoles, role))
  );

  // Allow access if user has required permissions AND roles (or none are specified)
  const hasAccess = hasRequiredPermissions && hasRequiredRoles;

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You don't have the necessary permissions to access this page.
          </p>

          {(permissions.length > 0 || roles.length > 0) && (
            <div className="text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required:
              </h3>
              
              {permissions.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Permissions ({requireAll ? 'all' : 'any'}):
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {permissions.map(permission => (
                      <span
                        key={permission}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {roles.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Roles ({requireAll ? 'all' : 'any'}):
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {roles.map(role => (
                      <span
                        key={role}
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
            >
              Go Back
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};

// HOC for protecting components
export const withProtection = (
  WrappedComponent: React.ComponentType<any>,
  protectionOptions: Omit<ProtectedRouteProps, 'children'>
) => {
  const ProtectedComponent: React.FC<any> = (props) => (
    <ProtectedRoute {...protectionOptions}>
      <WrappedComponent {...props} />
    </ProtectedRoute>
  );

  ProtectedComponent.displayName = `withProtection(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ProtectedComponent;
};

// Hook for checking permissions in components
export const usePermissions = () => {
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const checkPermission = React.useCallback((permission: string) => {
    if (!isAuthenticated || !user) return false;
    return hasPermission(user.permissions, permission);
  }, [user, isAuthenticated]);

  const checkRole = React.useCallback((role: string) => {
    if (!isAuthenticated || !user) return false;
    return hasRole(user.roles, role);
  }, [user, isAuthenticated]);

  const checkPermissions = React.useCallback((permissions: string[], requireAll = false) => {
    if (!isAuthenticated || !user || permissions.length === 0) return false;
    
    return requireAll
      ? permissions.every(permission => hasPermission(user.permissions, permission))
      : permissions.some(permission => hasPermission(user.permissions, permission));
  }, [user, isAuthenticated]);

  const checkRoles = React.useCallback((roles: string[], requireAll = false) => {
    if (!isAuthenticated || !user || roles.length === 0) return false;
    
    return requireAll
      ? roles.every(role => hasRole(user.roles, role))
      : roles.some(role => hasRole(user.roles, role));
  }, [user, isAuthenticated]);

  return {
    user,
    isAuthenticated,
    checkPermission,
    checkRole,
    checkPermissions,
    checkRoles,
  };
};

export default ProtectedRoute;