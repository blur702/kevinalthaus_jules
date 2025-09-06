import { importShared } from './__federation_fn_import-CGcCI4KO.js';
import { j as jsxRuntimeExports } from './jsx-runtime-a3QmZIrm.js';
import { E as ErrorBoundary } from './index-D32DKnMk.js';

const {Users:UsersIcon,UserPlus} = await importShared('lucide-react');
const Users = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:flex md:items-center md:justify-between mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:text-3xl sm:truncate", children: "User Management" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Manage user accounts, roles, and permissions" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 flex md:mt-0 md:ml-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          className: "inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "w-4 h-4 mr-2" }),
            "Add User"
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(UsersIcon, { className: "h-8 w-8 text-blue-400 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-blue-800 dark:text-blue-200", children: "User Management System" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-blue-700 dark:text-blue-300", children: "The user management interface is being developed. This will include:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-3 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "User list with search and filtering" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Role and permission management" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "User creation and editing forms" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Bulk operations" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Activity logs and audit trails" })
        ] })
      ] })
    ] }) })
  ] }) });
};

export { Users as default };
