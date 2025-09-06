import { importShared } from './__federation_fn_import-CGcCI4KO.js';
import { j as jsxRuntimeExports } from './jsx-runtime-a3QmZIrm.js';
import { u as useAppDispatch, a as useAppSelector, s as selectIsAuthenticated, b as selectAuthError, c as selectAuthLoading, d as clearError, e as sanitizeRedirectUrl, L as LoadingButton, l as loginAsync } from './index-DEIz9Ujh.js';

const React = await importShared('react');
const {useState} = React;

const {Link,Navigate,useLocation} = await importShared('react-router-dom');

const {useForm} = await importShared('react-hook-form');

const {Eye,EyeOff,Mail,Lock,AlertCircle} = await importShared('lucide-react');
const {clsx} = await importShared('clsx');

const LoginForm = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authError = useAppSelector(selectAuthError);
  const authLoading = useAppSelector(selectAuthLoading);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch
  } = useForm({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false
    }
  });
  React.useEffect(() => {
    const subscription = watch(() => {
      if (authError) {
        dispatch(clearError());
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, authError, dispatch]);
  const onSubmit = async (data) => {
    try {
      await dispatch(loginAsync(data)).unwrap();
    } catch (error) {
    }
  };
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || "/dashboard";
    const redirectTo = sanitizeRedirectUrl(from);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: redirectTo, replace: true });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md w-full space-y-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "svg",
        {
          className: "w-10 h-10 text-white",
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          xmlns: "http://www.w3.org/2000/svg",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "path",
            {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: 2,
              d: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            }
          )
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold text-gray-900 dark:text-gray-100", children: "Sign in to Shell Platform" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-gray-600 dark:text-gray-300", children: "Enter your credentials to access your account" })
    ] }),
    authError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircle, { className: "h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-red-800 dark:text-red-200", children: "Authentication Error" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-red-700 dark:text-red-300", children: authError })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit(onSubmit), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Email address" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "h-5 w-5 text-gray-400" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                }),
                type: "email",
                autoComplete: "email",
                className: clsx(
                  "block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
                  errors.email ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-100 bg-red-50 dark:bg-red-900/20" : "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                ),
                placeholder: "Enter your email"
              }
            )
          ] }),
          errors.email && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.email.message })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Password" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-5 w-5 text-gray-400" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters"
                  }
                }),
                type: showPassword ? "text" : "password",
                autoComplete: "current-password",
                className: clsx(
                  "block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
                  errors.password ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-100 bg-red-50 dark:bg-red-900/20" : "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                ),
                placeholder: "Enter your password"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setShowPassword(!showPassword),
                className: "absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                children: showPassword ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "h-5 w-5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-5 w-5" })
              }
            )
          ] }),
          errors.password && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.password.message })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              ...register("rememberMe"),
              type: "checkbox",
              className: "h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "rememberMe", className: "ml-2 block text-sm text-gray-700 dark:text-gray-300", children: "Remember me" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Link,
          {
            to: "/forgot-password",
            className: "text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300",
            children: "Forgot your password?"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LoadingButton,
        {
          type: "submit",
          loading: authLoading,
          loadingText: "Signing in...",
          disabled: !isValid,
          className: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed",
          children: "Sign in"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-300", children: [
        "Don't have an account?",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Link,
          {
            to: "/register",
            className: "font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300",
            children: "Sign up here"
          }
        )
      ] }) })
    ] }),
    false
  ] }) });
};

export { LoginForm as default };
