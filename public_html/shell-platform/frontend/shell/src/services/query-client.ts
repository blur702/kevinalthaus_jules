import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { apiService } from './api.service';

const queryConfig: DefaultOptions = {
  queries: {
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      
      // Don't retry on client errors (4xx)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      
      // Retry up to 3 times for server errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  },
  mutations: {
    retry: (failureCount, error: any) => {
      // Don't retry mutations on any error by default
      return false;
    },
  },
};

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

// Query key factories
export const queryKeys = {
  // Auth
  auth: {
    currentUser: ['auth', 'currentUser'] as const,
    sessions: ['auth', 'sessions'] as const,
  },
  
  // Plugins
  plugins: {
    all: ['plugins'] as const,
    registry: ['plugins', 'registry'] as const,
    installed: ['plugins', 'installed'] as const,
    plugin: (id: string) => ['plugins', 'plugin', id] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
  },
  
  // User preferences
  preferences: {
    all: ['preferences'] as const,
    theme: ['preferences', 'theme'] as const,
  },
};

// Query functions
export const queryFunctions = {
  // Auth
  getCurrentUser: () => apiService.get('/auth/me'),
  getSessions: () => apiService.get('/auth/sessions'),
  
  // Plugins
  getPluginRegistry: () => apiService.get('/plugins/registry'),
  getInstalledPlugins: () => apiService.get('/plugins/installed'),
  getPlugin: (id: string) => apiService.get(`/plugins/${id}`),
  
  // Notifications
  getNotifications: (params?: { page?: number; limit?: number }) => 
    apiService.get('/notifications', { params }),
  getUnreadNotifications: () => apiService.get('/notifications/unread'),
  
  // User preferences
  getUserPreferences: () => apiService.get('/user/preferences'),
};

// Mutation functions
export const mutationFunctions = {
  // Auth
  login: (credentials: any) => apiService.post('/api/auth/login', credentials),
  register: (userData: any) => apiService.post('/auth/register', userData),
  logout: () => apiService.post('/auth/logout'),
  changePassword: (data: any) => apiService.put('/auth/change-password', data),
  updateProfile: (data: any) => apiService.put('/auth/profile', data),
  
  // Plugins
  installPlugin: (plugin: any) => apiService.post('/plugins/install', plugin),
  uninstallPlugin: (id: string) => apiService.delete(`/plugins/${id}`),
  updatePlugin: (id: string) => apiService.post(`/plugins/${id}/update`),
  togglePlugin: (id: string, active: boolean) => 
    apiService.post(`/plugins/${id}/toggle`, { active }),
  
  // Notifications
  markNotificationAsRead: (id: string) => 
    apiService.patch(`/notifications/${id}/read`),
  markAllNotificationsAsRead: () => 
    apiService.post('/notifications/mark-all-read'),
  deleteNotification: (id: string) => 
    apiService.delete(`/notifications/${id}`),
  
  // User preferences
  updateUserPreferences: (preferences: any) => 
    apiService.put('/user/preferences', preferences),
};

// Cache invalidation helpers
export const invalidateQueries = {
  auth: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser });
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
  },
  
  plugins: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.plugins.all });
  },
  
  notifications: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  },
  
  preferences: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
  },
};

// Optimistic update helpers
export const optimisticUpdates = {
  updateProfile: (newData: any) => {
    queryClient.setQueryData(queryKeys.auth.currentUser, (old: any) => ({
      ...old,
      data: { ...old?.data, ...newData },
    }));
  },
  
  markNotificationAsRead: (notificationId: string) => {
    queryClient.setQueryData(queryKeys.notifications.all, (old: any) => ({
      ...old,
      data: old?.data?.map((notification: any) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      ),
    }));
  },
};

// Prefetch helpers
export const prefetchQueries = {
  currentUser: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.auth.currentUser,
      queryFn: queryFunctions.getCurrentUser,
    });
  },
  
  pluginRegistry: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.plugins.registry,
      queryFn: queryFunctions.getPluginRegistry,
    });
  },
  
  notifications: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.notifications.all,
      queryFn: () => queryFunctions.getNotifications({ limit: 20 }),
    });
  },
};