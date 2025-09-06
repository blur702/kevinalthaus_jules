export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface Theme {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
  timestamp: string;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  badge?: string | number;
  disabled?: boolean;
  permissions?: string[];
  children?: MenuItem[];
  onClick?: () => void;
}

export interface Breadcrumb {
  label: string;
  path?: string;
  active?: boolean;
}

export interface TableColumn<T = any> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    page: number;
    total: number;
    pageSize: number;
    onChange: (page: number, pageSize: number) => void;
  };
  selection?: {
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
  };
  onSort?: (key: string, order: 'asc' | 'desc') => void;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string; value: any }[];
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: any) => string | boolean;
  };
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  maskClosable?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

export interface SearchableSelectOption {
  label: string;
  value: any;
  disabled?: boolean;
  group?: string;
}

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
  options?: SearchableSelectOption[];
  value?: any;
}