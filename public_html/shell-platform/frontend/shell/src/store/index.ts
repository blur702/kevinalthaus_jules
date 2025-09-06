import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import authReducer from './auth.slice';
import pluginReducer from './plugin.slice';
import themeReducer from './theme.slice';
import notificationReducer from './notification.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    plugins: pluginReducer,
    theme: themeReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'plugins/loadPlugin/fulfilled',
          'plugins/setPluginError',
        ],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['payload.error', 'payload.instance.module'],
        // Ignore these paths in the state
        ignoredPaths: ['plugins.loadedPlugins', 'plugins.errors'],
      },
    }),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Auth selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

// Plugin selectors
export const selectPlugins = (state: RootState) => state.plugins;
export const selectInstalledPlugins = (state: RootState) => state.plugins.installedPlugins;
export const selectLoadedPlugins = (state: RootState) => state.plugins.loadedPlugins;
export const selectActivePlugins = (state: RootState) => state.plugins.activePlugins;
export const selectPluginRegistry = (state: RootState) => state.plugins.registry;
export const selectPluginErrors = (state: RootState) => state.plugins.errors;

// Theme selectors
export const selectTheme = (state: RootState) => state.theme;
export const selectEffectiveTheme = (state: RootState) => state.theme.effectiveTheme;

// Notification selectors
export const selectNotifications = (state: RootState) => state.notifications.notifications;