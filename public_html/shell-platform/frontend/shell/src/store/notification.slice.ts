import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  maxNotifications: number;
}

const initialState: NotificationState = {
  notifications: [],
  maxNotifications: 5,
};

let notificationIdCounter = 0;

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: {
      reducer: (state, action: PayloadAction<Notification>) => {
        const notification = action.payload;
        
        // Add to the beginning of the array
        state.notifications.unshift(notification);
        
        // Limit the number of notifications
        if (state.notifications.length > state.maxNotifications) {
          state.notifications = state.notifications.slice(0, state.maxNotifications);
        }
      },
      prepare: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
        return {
          payload: {
            ...notification,
            id: `notification_${Date.now()}_${++notificationIdCounter}`,
            timestamp: new Date().toISOString(),
          },
        };
      },
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    clearNotificationsByType: (state, action: PayloadAction<Notification['type']>) => {
      state.notifications = state.notifications.filter(
        notification => notification.type !== action.payload
      );
    },
    
    updateNotification: (state, action: PayloadAction<{ id: string; updates: Partial<Notification> }>) => {
      const { id, updates } = action.payload;
      const index = state.notifications.findIndex(notification => notification.id === id);
      
      if (index >= 0) {
        state.notifications[index] = { ...state.notifications[index], ...updates };
      }
    },
    
    setMaxNotifications: (state, action: PayloadAction<number>) => {
      state.maxNotifications = Math.max(1, action.payload);
      
      // Trim notifications if we're over the new limit
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(0, state.maxNotifications);
      }
    },
    
    // Bulk operations
    addMultipleNotifications: (state, action: PayloadAction<Array<Omit<Notification, 'id' | 'timestamp'>>>) => {
      const newNotifications = action.payload.map((notification, index) => ({
        ...notification,
        id: `notification_${Date.now()}_${++notificationIdCounter + index}`,
        timestamp: new Date().toISOString(),
      }));
      
      state.notifications = [...newNotifications, ...state.notifications];
      
      // Limit the number of notifications
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(0, state.maxNotifications);
      }
    },
    
    markAllAsRead: (state) => {
      // This would be used if we implement read/unread functionality
      // For now, it's a placeholder for future enhancement
    },
  },
});

// Action creators for common notification types
export const showSuccessNotification = (title: string, message: string, options?: Partial<Notification>) =>
  notificationSlice.actions.addNotification({
    title,
    message,
    type: 'success',
    duration: 4000,
    ...options,
  });

export const showErrorNotification = (title: string, message: string, options?: Partial<Notification>) =>
  notificationSlice.actions.addNotification({
    title,
    message,
    type: 'error',
    persistent: true,
    ...options,
  });

export const showWarningNotification = (title: string, message: string, options?: Partial<Notification>) =>
  notificationSlice.actions.addNotification({
    title,
    message,
    type: 'warning',
    duration: 6000,
    ...options,
  });

export const showInfoNotification = (title: string, message: string, options?: Partial<Notification>) =>
  notificationSlice.actions.addNotification({
    title,
    message,
    type: 'info',
    duration: 5000,
    ...options,
  });

export const {
  addNotification,
  removeNotification,
  clearNotifications,
  clearNotificationsByType,
  updateNotification,
  setMaxNotifications,
  addMultipleNotifications,
  markAllAsRead,
} = notificationSlice.actions;

export default notificationSlice.reducer;

// Selectors
export const selectNotifications = (state: { notifications: NotificationState }) => 
  state.notifications.notifications;

export const selectNotificationsByType = (type: Notification['type']) => 
  (state: { notifications: NotificationState }) =>
    state.notifications.notifications.filter(notification => notification.type === type);

export const selectNotificationCount = (state: { notifications: NotificationState }) => 
  state.notifications.notifications.length;

export const selectHasNotifications = (state: { notifications: NotificationState }) => 
  state.notifications.notifications.length > 0;