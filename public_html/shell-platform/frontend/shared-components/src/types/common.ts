/**
 * Common types and interfaces used across components
 */

import { ReactNode, CSSProperties } from 'react';
import { SxProps, Theme } from '@mui/material/styles';

/**
 * Base component props that all components should extend
 */
export interface BaseComponentProps {
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Inline styles
   */
  style?: CSSProperties;
  
  /**
   * MUI sx prop for styling
   */
  sx?: SxProps<Theme>;
  
  /**
   * Test ID for testing purposes
   */
  testId?: string;
  
  /**
   * Accessibility role
   */
  role?: string;
  
  /**
   * ARIA label for accessibility
   */
  'aria-label'?: string;
  
  /**
   * ARIA labelled by for accessibility
   */
  'aria-labelledby'?: string;
  
  /**
   * ARIA described by for accessibility
   */
  'aria-describedby'?: string;
}

/**
 * Common size variants
 */
export type Size = 'small' | 'medium' | 'large';

/**
 * Common color variants
 */
export type Color = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

/**
 * Component variant types
 */
export type Variant = 'contained' | 'outlined' | 'text';

/**
 * Alignment options
 */
export type Alignment = 'left' | 'center' | 'right';

/**
 * Orientation options
 */
export type Orientation = 'horizontal' | 'vertical';

/**
 * Position options
 */
export type Position = 'top' | 'bottom' | 'left' | 'right';

/**
 * Loading state interface
 */
export interface LoadingState {
  loading: boolean;
  error?: string | null;
}

/**
 * Pagination interface
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string;
  value: any;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
}

/**
 * Generic data table column definition
 */
export interface ColumnDefinition<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => ReactNode;
  headerRender?: () => ReactNode;
}

/**
 * Form field validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Form field interface
 */
export interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  validation?: (value: any) => ValidationResult;
}

/**
 * Option interface for select components
 */
export interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  description?: string;
}

/**
 * Menu item interface
 */
export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
  href?: string;
  children?: MenuItem[];
}

/**
 * Breadcrumb item interface
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
}

/**
 * Tab item interface
 */
export interface TabItem {
  id: string;
  label: string;
  content?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  badge?: string | number;
}

/**
 * Timeline item interface
 */
export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  icon?: ReactNode;
  color?: Color;
  variant?: 'filled' | 'outlined';
}

/**
 * Chart data point interface
 */
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

/**
 * Chart data interface for dashboard metrics
 */
export interface ChartData {
  name: string;
  value: number;
  users?: number;
  revenue?: number;
  sessions?: number;
}

/**
 * Chart series interface
 */
export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

/**
 * File upload interface
 */
export interface FileUploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  url?: string;
}

/**
 * Image gallery item interface
 */
export interface GalleryItem {
  id: string;
  src: string;
  thumbnail?: string;
  alt: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
}

/**
 * Drag and drop item interface
 */
export interface DragDropItem {
  id: string;
  type: string;
  data: any;
  draggable?: boolean;
}

/**
 * Toast notification interface
 */
export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Modal configuration interface
 */
export interface ModalConfig {
  title?: string;
  content: ReactNode;
  actions?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  fullScreen?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
}

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Responsive value type
 */
export type ResponsiveValue<T> = T | { xs?: T; sm?: T; md?: T; lg?: T; xl?: T };

/**
 * Event handler type
 */
export type EventHandler<T = any> = (event: T) => void;

/**
 * Async event handler type
 */
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;