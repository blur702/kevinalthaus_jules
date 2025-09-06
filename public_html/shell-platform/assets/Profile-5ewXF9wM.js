import { importShared } from './__federation_fn_import-CGcCI4KO.js';
import { j as jsxRuntimeExports } from './jsx-runtime-a3QmZIrm.js';
import { u as useAppDispatch, a as useAppSelector, n as selectUser, o as getUserInitials, E as ErrorBoundary, L as LoadingButton, p as updateProfileAsync } from './index-DgkQSV2E.js';

const {useState} = await importShared('react');

const {useForm} = await importShared('react-hook-form');

const {User,Camera,Save,Lock,Shield,Bell,Globe,Eye,EyeOff} = await importShared('lucide-react');
const {clsx} = await importShared('clsx');

const Profile = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const profileForm = useForm({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      username: user?.username || ""
    }
  });
  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });
  const onProfileSubmit = async (data) => {
    setIsLoading(true);
    try {
      await dispatch(updateProfileAsync(data)).unwrap();
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };
  const onPasswordSubmit = async (data) => {
    setIsLoading(true);
    try {
      console.log("Change password:", data);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Upload avatar:", file);
    }
  };
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "preferences", label: "Preferences", icon: Globe }
  ];
  const userInitials = getUserInitials(user?.firstName, user?.lastName, user?.username);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "md:flex md:items-center md:justify-between mb-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:text-3xl sm:truncate", children: "Profile Settings" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Manage your account settings and preferences" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "-mb-px flex space-x-8 px-6", children: tabs.map((tab) => {
        const Icon = tab.icon;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setActiveTab(tab.id),
            className: clsx(
              "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm",
              activeTab === tab.id ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: tab.label })
            ]
          },
          tab.id
        );
      }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6", children: [
        activeTab === "profile" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold", children: user?.avatar ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: user.avatar,
                  alt: user.username,
                  className: "w-24 h-24 rounded-full object-cover"
                }
              ) : userInitials }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-gray-700 rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "w-4 h-4 text-gray-600 dark:text-gray-300" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "file",
                    accept: "image/*",
                    onChange: handleAvatarChange,
                    className: "hidden"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: [
                user?.firstName,
                " ",
                user?.lastName
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: [
                "@",
                user?.username
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: profileForm.handleSubmit(onProfileSubmit), className: "space-y-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 gap-6 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "First Name" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    ...profileForm.register("firstName"),
                    type: "text",
                    className: "mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Last Name" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    ...profileForm.register("lastName"),
                    type: "text",
                    className: "mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Email" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  ...profileForm.register("email"),
                  type: "email",
                  className: "mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Username" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  ...profileForm.register("username"),
                  type: "text",
                  className: "mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              LoadingButton,
              {
                type: "submit",
                loading: isLoading,
                loadingText: "Saving...",
                className: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-4 h-4 mr-2" }),
                  "Save Changes"
                ]
              }
            ) })
          ] })
        ] }),
        activeTab === "security" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-4", children: "Change Password" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: passwordForm.handleSubmit(onPasswordSubmit), className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Current Password" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 relative", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    ...passwordForm.register("currentPassword", { required: true }),
                    type: showPasswords.current ? "text" : "password",
                    className: "block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500 pr-10"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setShowPasswords((prev) => ({ ...prev, current: !prev.current })),
                    className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                    children: showPasswords.current ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "h-4 w-4 text-gray-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-4 w-4 text-gray-400" })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "New Password" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 relative", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    ...passwordForm.register("newPassword", { required: true }),
                    type: showPasswords.new ? "text" : "password",
                    className: "block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500 pr-10"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setShowPasswords((prev) => ({ ...prev, new: !prev.new })),
                    className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                    children: showPasswords.new ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "h-4 w-4 text-gray-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-4 w-4 text-gray-400" })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Confirm New Password" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 relative", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    ...passwordForm.register("confirmPassword", { required: true }),
                    type: showPasswords.confirm ? "text" : "password",
                    className: "block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500 pr-10"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm })),
                    className: "absolute inset-y-0 right-0 pr-3 flex items-center",
                    children: showPasswords.confirm ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "h-4 w-4 text-gray-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-4 w-4 text-gray-400" })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              LoadingButton,
              {
                type: "submit",
                loading: isLoading,
                loadingText: "Updating...",
                className: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-4 h-4 mr-2" }),
                  "Update Password"
                ]
              }
            ) })
          ] })
        ] }) }),
        activeTab === "notifications" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: "Notification Preferences" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-medium text-gray-900 dark:text-gray-100", children: "Email Notifications" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Receive notifications via email" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  defaultChecked: user?.preferences.notifications.email,
                  className: "h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-medium text-gray-900 dark:text-gray-100", children: "Push Notifications" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Receive push notifications in your browser" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  defaultChecked: user?.preferences.notifications.push,
                  className: "h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-medium text-gray-900 dark:text-gray-100", children: "Desktop Notifications" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Show desktop notifications" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  defaultChecked: user?.preferences.notifications.desktop,
                  className: "h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                }
              )
            ] })
          ] })
        ] }),
        activeTab === "preferences" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: "Application Preferences" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Language" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  defaultValue: user?.preferences.language,
                  className: "mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "en", children: "English" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "es", children: "Spanish" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fr", children: "French" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "de", children: "German" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Timezone" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  defaultValue: user?.preferences.timezone,
                  className: "mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "UTC", children: "UTC" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "America/New_York", children: "Eastern Time" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "America/Chicago", children: "Central Time" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "America/Denver", children: "Mountain Time" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "America/Los_Angeles", children: "Pacific Time" })
                  ]
                }
              )
            ] })
          ] })
        ] })
      ] })
    ] })
  ] }) });
};

export { Profile as default };
