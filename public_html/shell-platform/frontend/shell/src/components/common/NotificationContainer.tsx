import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X 
} from 'lucide-react';
import { useAppSelector, useAppDispatch, selectNotifications } from '@/store';
import { removeNotification } from '@/store/notification.slice';
import { Notification } from '@/types';
import { clsx } from 'clsx';

const NotificationItem: React.FC<{
  notification: Notification;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const { id, type, title, message, duration, persistent, actions } = notification;

  // Auto-remove non-persistent notifications
  useEffect(() => {
    if (!persistent && duration && duration > 0) {
      const timer = setTimeout(() => {
        onRemove(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, persistent, duration, onRemove]);

  const iconMap = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colorMap = {
    success: {
      container: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      icon: 'text-green-500 dark:text-green-400',
      title: 'text-green-800 dark:text-green-200',
      message: 'text-green-700 dark:text-green-300',
      button: 'text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300',
    },
    error: {
      container: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      icon: 'text-red-500 dark:text-red-400',
      title: 'text-red-800 dark:text-red-200',
      message: 'text-red-700 dark:text-red-300',
      button: 'text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
      icon: 'text-yellow-500 dark:text-yellow-400',
      title: 'text-yellow-800 dark:text-yellow-200',
      message: 'text-yellow-700 dark:text-yellow-300',
      button: 'text-yellow-600 hover:text-yellow-500 dark:text-yellow-400 dark:hover:text-yellow-300',
    },
    info: {
      container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
      icon: 'text-blue-500 dark:text-blue-400',
      title: 'text-blue-800 dark:text-blue-200',
      message: 'text-blue-700 dark:text-blue-300',
      button: 'text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300',
    },
  };

  const Icon = iconMap[type];
  const colors = colorMap[type];

  return (
    <div
      className={clsx(
        'max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out',
        'animate-slide-in'
      )}
    >
      <div className={clsx('p-4 border-l-4', colors.container)}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={clsx('h-5 w-5', colors.icon)} />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className={clsx('text-sm font-medium', colors.title)}>
              {title}
            </p>
            <p className={clsx('mt-1 text-sm', colors.message)}>
              {message}
            </p>
            
            {/* Action buttons */}
            {actions && actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.action();
                      onRemove(id);
                    }}
                    className={clsx(
                      'text-sm font-medium rounded-md px-3 py-1.5 transition-colors',
                      {
                        'bg-primary-600 text-white hover:bg-primary-700': action.style === 'primary',
                        'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600': action.style === 'secondary',
                        'bg-red-600 text-white hover:bg-red-700': action.style === 'danger',
                      }
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Close button */}
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onRemove(id)}
              className={clsx(
                'inline-flex rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                colors.button
              )}
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar for timed notifications */}
      {!persistent && duration && duration > 0 && (
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className={clsx(
              'h-full transition-all ease-linear',
              {
                'bg-green-500': type === 'success',
                'bg-red-500': type === 'error',
                'bg-yellow-500': type === 'warning',
                'bg-blue-500': type === 'info',
              }
            )}
            style={{
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);

  const handleRemoveNotification = (id: string) => {
    dispatch(removeNotification(id));
  };

  // Create portal container if it doesn't exist
  useEffect(() => {
    const id = 'notification-container';
    let container = document.getElementById(id);
    
    if (!container) {
      container = document.createElement('div');
      container.id = id;
      container.className = 'fixed inset-0 pointer-events-none z-50';
      document.body.appendChild(container);
    }

    return () => {
      const existingContainer = document.getElementById(id);
      if (existingContainer && existingContainer.children.length === 0) {
        document.body.removeChild(existingContainer);
      }
    };
  }, []);

  const container = document.getElementById('notification-container');
  
  if (!container || notifications.length === 0) {
    return null;
  }

  return createPortal(
    <div className="fixed top-0 right-0 p-6 space-y-4 pointer-events-none z-50">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={handleRemoveNotification}
        />
      ))}
    </div>,
    container
  );
};

export default NotificationContainer;

// Add required CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;

if (!document.head.querySelector('#notification-animations')) {
  style.id = 'notification-animations';
  document.head.appendChild(style);
}