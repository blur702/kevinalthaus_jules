import { importShared } from './__federation_fn_import-CGcCI4KO.js';
import { j as jsxRuntimeExports } from './jsx-runtime-a3QmZIrm.js';
import { u as useAppDispatch, a as useAppSelector, s as selectIsAuthenticated, b as selectAuthError, c as selectAuthLoading, i as isPasswordStrong, d as clearError, L as LoadingButton, r as registerAsync } from './index-DgkQSV2E.js';

const React = await importShared('react');
const {useState} = React;

const {Link,Navigate} = await importShared('react-router-dom');

const {useForm} = await importShared('react-hook-form');

const {Eye,EyeOff,Mail,Lock,User,AlertCircle,CheckCircle} = await importShared('lucide-react');
const {clsx} = await importShared('clsx');

const RegisterForm = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authError = useAppSelector(selectAuthError);
  const authLoading = useAppSelector(selectAuthLoading);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    getValues
  } = useForm({
    mode: "onChange",
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: ""
    }
  });
  const password = watch("password");
  const passwordStrength = password ? isPasswordStrong(password) : { isStrong: false, feedback: [] };
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
      await dispatch(registerAsync(data)).unwrap();
    } catch (error) {
    }
  };
  if (isAuthenticated) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/", replace: true });
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
              d: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            }
          )
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-3xl font-bold text-gray-900 dark:text-gray-100", children: "Create your account" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-gray-600 dark:text-gray-300", children: "Join Shell Platform and start building amazing experiences" })
    ] }),
    authError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircle, { className: "h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-red-800 dark:text-red-200", children: "Registration Error" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-red-700 dark:text-red-300", children: authError })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit(onSubmit), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "firstName", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "First name" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "h-5 w-5 text-gray-400" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  ...register("firstName"),
                  type: "text",
                  autoComplete: "given-name",
                  className: "block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
                  placeholder: "First name"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "lastName", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Last name" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ...register("lastName"),
                type: "text",
                autoComplete: "family-name",
                className: "block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
                placeholder: "Last name"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: [
            "Email address ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-500", children: "*" })
          ] }),
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
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "username", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: [
            "Username ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-500", children: "*" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "h-5 w-5 text-gray-400" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ...register("username", {
                  required: "Username is required",
                  minLength: {
                    value: 3,
                    message: "Username must be at least 3 characters"
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_-]+$/,
                    message: "Username can only contain letters, numbers, hyphens, and underscores"
                  }
                }),
                type: "text",
                autoComplete: "username",
                className: clsx(
                  "block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
                  errors.username ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-100 bg-red-50 dark:bg-red-900/20" : "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                ),
                placeholder: "Choose a username"
              }
            )
          ] }),
          errors.username && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.username.message })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: [
            "Password ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-500", children: "*" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-5 w-5 text-gray-400" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ...register("password", {
                  required: "Password is required",
                  validate: (value) => {
                    const { isStrong } = isPasswordStrong(value);
                    return isStrong || "Password is not strong enough";
                  }
                }),
                type: showPassword ? "text" : "password",
                autoComplete: "new-password",
                className: clsx(
                  "block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
                  errors.password ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-100 bg-red-50 dark:bg-red-900/20" : "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                ),
                placeholder: "Create a password"
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
          password && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
              passwordStrength.isStrong ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { className: "w-4 h-4 text-green-500" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircle, { className: "w-4 h-4 text-red-500" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: clsx(
                "text-xs font-medium",
                passwordStrength.isStrong ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              ), children: passwordStrength.isStrong ? "Strong password" : "Weak password" })
            ] }),
            !passwordStrength.isStrong && passwordStrength.feedback.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-1 text-xs text-red-600 dark:text-red-400 space-y-1", children: passwordStrength.feedback.map((feedback, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
              "• ",
              feedback
            ] }, index)) })
          ] }),
          errors.password && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.password.message })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "confirmPassword", className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: [
            "Confirm password ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-red-500", children: "*" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-5 w-5 text-gray-400" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) => {
                    const { password: password2 } = getValues();
                    return value === password2 || "Passwords do not match";
                  }
                }),
                type: showConfirmPassword ? "text" : "password",
                autoComplete: "new-password",
                className: clsx(
                  "block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm",
                  errors.confirmPassword ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-100 bg-red-50 dark:bg-red-900/20" : "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                ),
                placeholder: "Confirm your password"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setShowConfirmPassword(!showConfirmPassword),
                className: "absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                children: showConfirmPassword ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "h-5 w-5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-5 w-5" })
              }
            )
          ] }),
          errors.confirmPassword && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: errors.confirmPassword.message })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-gray-600 dark:text-gray-300", children: [
        "By creating an account, you agree to our",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/terms", className: "text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300", children: "Terms of Service" }),
        " ",
        "and",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/privacy", className: "text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300", children: "Privacy Policy" }),
        "."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LoadingButton,
        {
          type: "submit",
          loading: authLoading,
          loadingText: "Creating account...",
          disabled: !isValid,
          className: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed",
          children: "Create account"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-300", children: [
        "Already have an account?",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Link,
          {
            to: "/login",
            className: "font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300",
            children: "Sign in here"
          }
        )
      ] }) })
    ] })
  ] }) });
};

export { RegisterForm as default };
