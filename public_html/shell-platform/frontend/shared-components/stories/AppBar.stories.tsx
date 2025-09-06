import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { 
  Dashboard, 
  Analytics, 
  Settings,
  Logout,
  Person,
  Notifications,
} from '@mui/icons-material';
import { Badge, IconButton as MuiIconButton } from '@mui/material';
import { AppBar } from '../src/components/Layout';

const meta: Meta<typeof AppBar> = {
  title: 'Components/Layout/AppBar',
  component: AppBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A comprehensive application bar with navigation, user menu, and theme toggle.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: { type: 'select' },
      options: ['fixed', 'absolute', 'sticky', 'static', 'relative'],
    },
    elevation: {
      control: { type: 'range', min: 0, max: 24 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockNavigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <Dashboard />, href: '/dashboard' },
  { id: 'analytics', label: 'Analytics', icon: <Analytics />, href: '/analytics' },
  { id: 'settings', label: 'Settings', icon: <Settings />, href: '/settings' },
];

const mockUserMenuItems = [
  { id: 'profile', label: 'Profile', icon: <Person />, href: '/profile' },
  { id: 'settings', label: 'Settings', icon: <Settings />, href: '/user-settings' },
  { id: 'divider', label: '', divider: true },
  { id: 'logout', label: 'Logout', icon: <Logout />, onClick: action('logout') },
];

const mockUser = {
  name: 'John Doe',
  email: 'john.doe@shellplatform.com',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
};

const mockActions = (
  <MuiIconButton color="inherit">
    <Badge badgeContent={4} color="error">
      <Notifications />
    </Badge>
  </MuiIconButton>
);

export const Default: Story = {
  args: {
    title: 'Shell Platform',
    onMenuClick: action('menu-click'),
  },
};

export const WithNavigation: Story = {
  args: {
    title: 'Shell Platform',
    navigationItems: mockNavigationItems,
    onMenuClick: action('menu-click'),
  },
};

export const WithUser: Story = {
  args: {
    title: 'Shell Platform',
    user: mockUser,
    userMenuItems: mockUserMenuItems,
    onMenuClick: action('menu-click'),
  },
};

export const WithActions: Story = {
  args: {
    title: 'Shell Platform',
    actions: mockActions,
    onMenuClick: action('menu-click'),
  },
};

export const Complete: Story = {
  args: {
    title: 'Shell Platform',
    navigationItems: mockNavigationItems,
    user: mockUser,
    userMenuItems: mockUserMenuItems,
    actions: mockActions,
    onMenuClick: action('menu-click'),
  },
};

export const WithLogo: Story = {
  args: {
    logo: (
      <div style={{ 
        width: 40, 
        height: 40, 
        backgroundColor: '#1976d2', 
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
      }}>
        SP
      </div>
    ),
    title: 'Shell Platform',
    user: mockUser,
    userMenuItems: mockUserMenuItems,
    onMenuClick: action('menu-click'),
  },
};

export const Transparent: Story = {
  args: {
    title: 'Shell Platform',
    transparent: true,
    user: mockUser,
    userMenuItems: mockUserMenuItems,
    onMenuClick: action('menu-click'),
  },
  parameters: {
    backgrounds: { default: 'grey' },
  },
};

export const CustomHeight: Story = {
  args: {
    title: 'Shell Platform',
    height: 80,
    user: mockUser,
    userMenuItems: mockUserMenuItems,
    onMenuClick: action('menu-click'),
  },
};

export const NoThemeToggle: Story = {
  args: {
    title: 'Shell Platform',
    showThemeToggle: false,
    user: mockUser,
    userMenuItems: mockUserMenuItems,
    onMenuClick: action('menu-click'),
  },
};

export const NoMenuButton: Story = {
  args: {
    title: 'Shell Platform',
    showMenuButton: false,
    navigationItems: mockNavigationItems,
    user: mockUser,
    userMenuItems: mockUserMenuItems,
  },
};