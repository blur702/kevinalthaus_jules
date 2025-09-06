import { importShared } from './__federation_fn_import-CGcCI4KO.js';
import { j as jsxRuntimeExports } from './jsx-runtime-a3QmZIrm.js';

const {Link} = await importShared('react-router-dom');

const {Home,ArrowLeft,Search} = await importShared('lucide-react');

const NotFound = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:mx-auto sm:w-full sm:max-w-md", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-24 h-24 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "w-12 h-12 text-primary-600 dark:text-primary-400" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4", children: "404" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4", children: "Page Not Found" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto", children: "The page you're looking for doesn't exist or has been moved to another location." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => window.history.back(),
          className: "w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "w-4 h-4 mr-2" }),
            "Go Back"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Link,
        {
          to: "/",
          className: "w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Home, { className: "w-4 h-4 mr-2" }),
            "Go Home"
          ]
        }
      )
    ] })
  ] }) }) });
};

export { NotFound as default };
