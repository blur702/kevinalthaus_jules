import React from 'react';
import { Settings as SettingsIcon, Server, Database, Shield, Mail, Globe } from 'lucide-react';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const Settings: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:text-3xl sm:truncate">
              System Settings
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Configure platform-wide settings and preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Server className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Server Configuration
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Configure server settings
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
              <div className="text-sm">
                <button className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                  Manage
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Database Settings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Database configuration
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
              <div className="text-sm">
                <button className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                  Configure
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Security Settings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Security configuration
                  </dd>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
              <div className="text-sm">
                <button className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex">
            <SettingsIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Settings Panel
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                The system settings panel is being developed. More configuration options will be available soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Settings;