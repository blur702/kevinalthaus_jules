import React from 'react';
import { Users as UsersIcon, UserPlus } from 'lucide-react';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const Users: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:text-3xl sm:truncate">
              User Management
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </button>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex">
            <UsersIcon className="h-8 w-8 text-blue-400 flex-shrink-0" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
                User Management System
              </h3>
              <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                The user management interface is being developed. This will include:
              </p>
              <ul className="mt-3 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                <li>User list with search and filtering</li>
                <li>Role and permission management</li>
                <li>User creation and editing forms</li>
                <li>Bulk operations</li>
                <li>Activity logs and audit trails</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Users;