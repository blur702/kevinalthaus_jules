const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/Dashboard-D-P3lfrS.js","assets/__federation_fn_import-CGcCI4KO.js","assets/jsx-runtime-a3QmZIrm.js","assets/index-BwWhYzy4.js","assets/LoginForm-BjjsRFvI.js","assets/RegisterForm-vTMcXefs.js","assets/PluginManager-CEdKzlJk.js","assets/Profile-S5nbg16_.js","assets/Settings-D_--ZQDu.js","assets/Users-7LzE9IzD.js","assets/Analytics-ByqZzueI.js","assets/NotFound-cq2FJI5l.js"])))=>i.map(i=>d[i]);
import { importShared } from './__federation_fn_import-CGcCI4KO.js';
import { j as jsxRuntimeExports } from './jsx-runtime-a3QmZIrm.js';
import { r as reactDomExports } from './index-34AiBnsD.js';

true&&(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
}());

var client = {};

var m = reactDomExports;
{
  client.createRoot = m.createRoot;
  client.hydrateRoot = m.hydrateRoot;
}

const scriptRel = 'modulepreload';const assetsURL = function(dep) { return "/"+dep };const seen = {};const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (true && deps && deps.length > 0) {
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};

class InvalidTokenError extends Error {
}
InvalidTokenError.prototype.name = "InvalidTokenError";
function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).replace(/(.)/g, (m, p) => {
        let code = p.charCodeAt(0).toString(16).toUpperCase();
        if (code.length < 2) {
            code = "0" + code;
        }
        return "%" + code;
    }));
}
function base64UrlDecode(str) {
    let output = str.replace(/-/g, "+").replace(/_/g, "/");
    switch (output.length % 4) {
        case 0:
            break;
        case 2:
            output += "==";
            break;
        case 3:
            output += "=";
            break;
        default:
            throw new Error("base64 string is not of the correct length");
    }
    try {
        return b64DecodeUnicode(output);
    }
    catch (err) {
        return atob(output);
    }
}
function jwtDecode(token, options) {
    if (typeof token !== "string") {
        throw new InvalidTokenError("Invalid token specified: must be a string");
    }
    options || (options = {});
    const pos = options.header === true ? 0 : 1;
    const part = token.split(".")[pos];
    if (typeof part !== "string") {
        throw new InvalidTokenError(`Invalid token specified: missing part #${pos + 1}`);
    }
    let decoded;
    try {
        decoded = base64UrlDecode(part);
    }
    catch (e) {
        throw new InvalidTokenError(`Invalid token specified: invalid base64 for part #${pos + 1} (${e.message})`);
    }
    try {
        return JSON.parse(decoded);
    }
    catch (e) {
        throw new InvalidTokenError(`Invalid token specified: invalid json for part #${pos + 1} (${e.message})`);
    }
}

/*! js-cookie v3.0.5 | MIT */
/* eslint-disable no-var */
function assign (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      target[key] = source[key];
    }
  }
  return target
}
/* eslint-enable no-var */

/* eslint-disable no-var */
var defaultConverter = {
  read: function (value) {
    if (value[0] === '"') {
      value = value.slice(1, -1);
    }
    return value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
  },
  write: function (value) {
    return encodeURIComponent(value).replace(
      /%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
      decodeURIComponent
    )
  }
};
/* eslint-enable no-var */

/* eslint-disable no-var */

function init (converter, defaultAttributes) {
  function set (name, value, attributes) {
    if (typeof document === 'undefined') {
      return
    }

    attributes = assign({}, defaultAttributes, attributes);

    if (typeof attributes.expires === 'number') {
      attributes.expires = new Date(Date.now() + attributes.expires * 864e5);
    }
    if (attributes.expires) {
      attributes.expires = attributes.expires.toUTCString();
    }

    name = encodeURIComponent(name)
      .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
      .replace(/[()]/g, escape);

    var stringifiedAttributes = '';
    for (var attributeName in attributes) {
      if (!attributes[attributeName]) {
        continue
      }

      stringifiedAttributes += '; ' + attributeName;

      if (attributes[attributeName] === true) {
        continue
      }

      // Considers RFC 6265 section 5.2:
      // ...
      // 3.  If the remaining unparsed-attributes contains a %x3B (";")
      //     character:
      // Consume the characters of the unparsed-attributes up to,
      // not including, the first %x3B (";") character.
      // ...
      stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
    }

    return (document.cookie =
      name + '=' + converter.write(value, name) + stringifiedAttributes)
  }

  function get (name) {
    if (typeof document === 'undefined' || (arguments.length && !name)) {
      return
    }

    // To prevent the for loop in the first place assign an empty array
    // in case there are no cookies at all.
    var cookies = document.cookie ? document.cookie.split('; ') : [];
    var jar = {};
    for (var i = 0; i < cookies.length; i++) {
      var parts = cookies[i].split('=');
      var value = parts.slice(1).join('=');

      try {
        var found = decodeURIComponent(parts[0]);
        jar[found] = converter.read(value, found);

        if (name === found) {
          break
        }
      } catch (e) {}
    }

    return name ? jar[name] : jar
  }

  return Object.create(
    {
      set,
      get,
      remove: function (name, attributes) {
        set(
          name,
          '',
          assign({}, attributes, {
            expires: -1
          })
        );
      },
      withAttributes: function (attributes) {
        return init(this.converter, assign({}, this.attributes, attributes))
      },
      withConverter: function (converter) {
        return init(assign({}, this.converter, converter), this.attributes)
      }
    },
    {
      attributes: { value: Object.freeze(defaultAttributes) },
      converter: { value: Object.freeze(converter) }
    }
  )
}

var api = init(defaultConverter, { path: '/' });

const AUTH_STORAGE_KEY = "shell-auth";
const ACCESS_TOKEN_KEY = "shell-access-token";
const REFRESH_TOKEN_KEY = "shell-refresh-token";
const setAuthTokens = (accessToken, refreshToken) => {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  api.set(REFRESH_TOKEN_KEY, refreshToken, {
    httpOnly: false,
    // Note: httpOnly won't work from client-side, server should set this
    secure: window.location.protocol === "https:",
    sameSite: "strict",
    expires: 7
    // 7 days
  });
};
const getAccessToken = () => {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
};
const getRefreshToken = () => {
  return api.get(REFRESH_TOKEN_KEY) || null;
};
const removeAuthTokens = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  api.remove(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
};
const isTokenValid = (token) => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1e3;
    return decoded.exp > currentTime + 300;
  } catch {
    return false;
  }
};
const isTokenExpiring = (token, bufferMinutes = 5) => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1e3;
    const bufferTime = bufferMinutes * 60;
    return decoded.exp - currentTime < bufferTime;
  } catch {
    return true;
  }
};
const hasPermission = (userPermissions, requiredPermission) => {
  if (!userPermissions || !requiredPermission) return false;
  if (userPermissions.includes(requiredPermission)) return true;
  const parts = requiredPermission.split(".");
  for (let i = parts.length - 1; i >= 0; i--) {
    const wildcardPermission = parts.slice(0, i).join(".") + ".*";
    if (userPermissions.includes(wildcardPermission)) return true;
  }
  return userPermissions.includes("admin.*") || userPermissions.includes("*");
};
const hasRole = (userRoles, requiredRole) => {
  if (!userRoles || !requiredRole) return false;
  return userRoles.includes(requiredRole) || userRoles.includes("admin");
};
const getUserInitials = (firstName, lastName, username) => {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (username && username.length >= 2) {
    return username.substring(0, 2).toUpperCase();
  }
  return "U";
};
const isPasswordStrong = (password) => {
  const feedback = [];
  let isStrong = true;
  if (password.length < 8) {
    feedback.push("Password must be at least 8 characters long");
    isStrong = false;
  }
  if (!/[a-z]/.test(password)) {
    feedback.push("Password must contain at least one lowercase letter");
    isStrong = false;
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push("Password must contain at least one uppercase letter");
    isStrong = false;
  }
  if (!/\d/.test(password)) {
    feedback.push("Password must contain at least one number");
    isStrong = false;
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push("Password must contain at least one special character");
    isStrong = false;
  }
  return { isStrong, feedback };
};
const sanitizeRedirectUrl = (url) => {
  try {
    const redirectUrl = new URL(url, window.location.origin);
    if (redirectUrl.origin !== window.location.origin) {
      return "/dashboard";
    }
    return redirectUrl.pathname + redirectUrl.search + redirectUrl.hash;
  } catch {
    return "/dashboard";
  }
};

const axios$1 = await importShared('axios');
const API_BASE_URL = "/api";
class AuthService {
  baseURL = `${API_BASE_URL}/auth`;
  async login(credentials) {
    const response = await axios$1.post(
      `${this.baseURL}/login`,
      credentials
    );
    const authData = response.data.data || response.data;
    const { token, accessToken, refreshToken } = authData;
    setAuthTokens(token || accessToken, refreshToken);
    return authData;
  }
  async register(credentials) {
    const response = await axios$1.post(
      `${this.baseURL}/register`,
      credentials
    );
    const authData = response.data.data || response.data;
    const { token, accessToken, refreshToken } = authData;
    setAuthTokens(token || accessToken, refreshToken);
    return authData;
  }
  async logout() {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await axios$1.post(`${this.baseURL}/logout`, { refreshToken });
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      removeAuthTokens();
    }
  }
  async refreshToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    const response = await axios$1.post(
      `${this.baseURL}/refresh`,
      { refreshToken }
    );
    const authData = response.data.data || response.data;
    const { accessToken, refreshToken: newRefreshToken } = authData;
    setAuthTokens(accessToken, newRefreshToken);
    return authData;
  }
  async getCurrentUser() {
    const response = await axios$1.get(
      `${this.baseURL}/me`,
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`
        }
      }
    );
    return response.data;
  }
  async updateProfile(userData) {
    const response = await axios$1.put(
      `${this.baseURL}/profile`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`
        }
      }
    );
    return response.data;
  }
  async changePassword(currentPassword, newPassword) {
    await axios$1.put(
      `${this.baseURL}/change-password`,
      { currentPassword, newPassword },
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`
        }
      }
    );
  }
  async requestPasswordReset(data) {
    await axios$1.post(`${this.baseURL}/request-password-reset`, data);
  }
  async resetPassword(data) {
    await axios$1.post(`${this.baseURL}/reset-password`, data);
  }
  async verifyEmail(token) {
    await axios$1.post(`${this.baseURL}/verify-email`, { token });
  }
  async resendVerificationEmail() {
    await axios$1.post(
      `${this.baseURL}/resend-verification`,
      {},
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`
        }
      }
    );
  }
  async validateToken() {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }
  async revokeAllSessions() {
    await axios$1.post(
      `${this.baseURL}/revoke-sessions`,
      {},
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`
        }
      }
    );
    removeAuthTokens();
  }
  async getUserSessions() {
    const response = await axios$1.get(
      `${this.baseURL}/sessions`,
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`
        }
      }
    );
    return response.data;
  }
  async revokeSession(sessionId) {
    await axios$1.delete(
      `${this.baseURL}/sessions/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`
        }
      }
    );
  }
}
const authService = new AuthService();

const {createSlice: createSlice$3,createAsyncThunk: createAsyncThunk$1} = await importShared('@reduxjs/toolkit');
const initialState$3 = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionTimeoutWarning: false
};
const loginAsync = createAsyncThunk$1(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  }
);
const registerAsync = createAsyncThunk$1(
  "auth/register",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.register(credentials);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Registration failed");
    }
  }
);
const refreshTokenAsync = createAsyncThunk$1(
  "auth/refreshToken",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.refreshToken();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Token refresh failed");
    }
  }
);
const getCurrentUserAsync = createAsyncThunk$1(
  "auth/getCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getCurrentUser();
      return user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to get user");
    }
  }
);
const updateProfileAsync = createAsyncThunk$1(
  "auth/updateProfile",
  async (userData, { rejectWithValue }) => {
    try {
      const user = await authService.updateProfile(userData);
      return user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Profile update failed");
    }
  }
);
const logoutAsync = createAsyncThunk$1(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
);
const initializeAuthAsync = createAsyncThunk$1(
  "auth/initialize",
  async (_, { dispatch }) => {
    const accessToken = getAccessToken();
    if (!accessToken || !isTokenValid(accessToken)) {
      try {
        await dispatch(refreshTokenAsync()).unwrap();
        return await dispatch(getCurrentUserAsync()).unwrap();
      } catch {
        removeAuthTokens();
        throw new Error("Authentication required");
      }
    } else {
      return await dispatch(getCurrentUserAsync()).unwrap();
    }
  }
);
const authSlice = createSlice$3({
  name: "auth",
  initialState: initialState$3,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSessionTimeoutWarning: (state, action) => {
      state.sessionTimeoutWarning = action.payload;
    },
    updateUserPreferences: (state, action) => {
      if (state.user) {
        state.user.preferences = { ...state.user.preferences, ...action.payload };
      }
    },
    resetAuth: (state) => {
      Object.assign(state, initialState$3);
      removeAuthTokens();
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loginAsync.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    }).addCase(loginAsync.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
    }).addCase(loginAsync.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    }).addCase(registerAsync.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    }).addCase(registerAsync.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
    }).addCase(registerAsync.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    }).addCase(refreshTokenAsync.pending, (state) => {
      state.isLoading = true;
    }).addCase(refreshTokenAsync.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
      state.sessionTimeoutWarning = false;
    }).addCase(refreshTokenAsync.rejected, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      removeAuthTokens();
    }).addCase(getCurrentUserAsync.pending, (state) => {
      state.isLoading = true;
    }).addCase(getCurrentUserAsync.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    }).addCase(getCurrentUserAsync.rejected, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      removeAuthTokens();
    }).addCase(updateProfileAsync.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    }).addCase(updateProfileAsync.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.error = null;
    }).addCase(updateProfileAsync.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    }).addCase(logoutAsync.fulfilled, (state) => {
      Object.assign(state, initialState$3);
    }).addCase(initializeAuthAsync.pending, (state) => {
      state.isLoading = true;
    }).addCase(initializeAuthAsync.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
      state.accessToken = getAccessToken();
      state.error = null;
    }).addCase(initializeAuthAsync.rejected, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
    });
  }
});
const {
  clearError: clearError$1,
  setSessionTimeoutWarning,
  updateUserPreferences,
  resetAuth
} = authSlice.actions;
const authReducer = authSlice.reducer;

const {createSlice: createSlice$2,createAsyncThunk} = await importShared('@reduxjs/toolkit');

const initialState$2 = {
  registry: null,
  installedPlugins: [],
  loadedPlugins: {},
  activePlugins: [],
  errors: [],
  isLoading: false,
  error: null
};
const loadPluginRegistryAsync = createAsyncThunk(
  "plugins/loadRegistry",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/plugins/registry");
      if (!response.ok) {
        throw new Error("Failed to load plugin registry");
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
const loadPluginAsync = createAsyncThunk(
  "plugins/loadPlugin",
  async (pluginId, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const plugin = state.plugins.installedPlugins.find((p) => p.id === pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }
      const moduleFactory = await import(
        /* @vite-ignore */
        plugin.remoteUrl
      );
      const module = await moduleFactory.get(plugin.exposedModule);
      const component = module();
      const instance = {
        plugin,
        module,
        component: component.default || component,
        isLoaded: true
      };
      return { pluginId, instance };
    } catch (error) {
      const pluginError = {
        pluginId,
        error,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        context: "loading"
      };
      return rejectWithValue(pluginError);
    }
  }
);
const installPluginAsync = createAsyncThunk(
  "plugins/installPlugin",
  async (plugin, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/plugins/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(plugin)
      });
      if (!response.ok) {
        throw new Error("Failed to install plugin");
      }
      return plugin;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
const uninstallPluginAsync = createAsyncThunk(
  "plugins/uninstallPlugin",
  async (pluginId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error("Failed to uninstall plugin");
      }
      return pluginId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
const updatePluginAsync = createAsyncThunk(
  "plugins/updatePlugin",
  async (pluginId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}/update`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Failed to update plugin");
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
const togglePluginAsync = createAsyncThunk(
  "plugins/togglePlugin",
  async ({ pluginId, active }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ active })
      });
      if (!response.ok) {
        throw new Error("Failed to toggle plugin");
      }
      return { pluginId, active };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
const pluginSlice = createSlice$2({
  name: "plugins",
  initialState: initialState$2,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPluginError: (state, action) => {
      state.errors = state.errors.filter((error) => error.pluginId !== action.payload);
    },
    clearAllErrors: (state) => {
      state.errors = [];
    },
    setPluginError: (state, action) => {
      const existingErrorIndex = state.errors.findIndex(
        (error) => error.pluginId === action.payload.pluginId
      );
      if (existingErrorIndex >= 0) {
        state.errors[existingErrorIndex] = action.payload;
      } else {
        state.errors.push(action.payload);
      }
    },
    unloadPlugin: (state, action) => {
      const pluginId = action.payload;
      delete state.loadedPlugins[pluginId];
      state.activePlugins = state.activePlugins.filter((id) => id !== pluginId);
    },
    updatePluginStatus: (state, action) => {
      const { pluginId, status } = action.payload;
      const plugin = state.installedPlugins.find((p) => p.id === pluginId);
      if (plugin) {
        plugin.status = status;
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loadPluginRegistryAsync.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    }).addCase(loadPluginRegistryAsync.fulfilled, (state, action) => {
      state.isLoading = false;
      state.registry = action.payload;
      state.error = null;
    }).addCase(loadPluginRegistryAsync.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    }).addCase(loadPluginAsync.pending, (state, action) => {
      const pluginId = action.meta.arg;
      const plugin = state.installedPlugins.find((p) => p.id === pluginId);
      if (plugin) {
        plugin.status = "loading";
      }
    }).addCase(loadPluginAsync.fulfilled, (state, action) => {
      const { pluginId, instance } = action.payload;
      state.loadedPlugins[pluginId] = instance;
      if (!state.activePlugins.includes(pluginId)) {
        state.activePlugins.push(pluginId);
      }
      const plugin = state.installedPlugins.find((p) => p.id === pluginId);
      if (plugin) {
        plugin.status = "active";
      }
      state.errors = state.errors.filter((error) => error.pluginId !== pluginId);
    }).addCase(loadPluginAsync.rejected, (state, action) => {
      const pluginError = action.payload;
      state.errors.push(pluginError);
      const plugin = state.installedPlugins.find((p) => p.id === pluginError.pluginId);
      if (plugin) {
        plugin.status = "error";
      }
    }).addCase(installPluginAsync.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    }).addCase(installPluginAsync.fulfilled, (state, action) => {
      state.isLoading = false;
      const plugin = action.payload;
      plugin.status = "inactive";
      plugin.metadata.installDate = (/* @__PURE__ */ new Date()).toISOString();
      const existingIndex = state.installedPlugins.findIndex((p) => p.id === plugin.id);
      if (existingIndex >= 0) {
        state.installedPlugins[existingIndex] = plugin;
      } else {
        state.installedPlugins.push(plugin);
      }
    }).addCase(installPluginAsync.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    }).addCase(uninstallPluginAsync.fulfilled, (state, action) => {
      const pluginId = action.payload;
      state.installedPlugins = state.installedPlugins.filter((p) => p.id !== pluginId);
      delete state.loadedPlugins[pluginId];
      state.activePlugins = state.activePlugins.filter((id) => id !== pluginId);
      state.errors = state.errors.filter((error) => error.pluginId !== pluginId);
    }).addCase(updatePluginAsync.fulfilled, (state, action) => {
      const updatedPlugin = action.payload;
      const index = state.installedPlugins.findIndex((p) => p.id === updatedPlugin.id);
      if (index >= 0) {
        updatedPlugin.metadata.lastUpdate = (/* @__PURE__ */ new Date()).toISOString();
        state.installedPlugins[index] = updatedPlugin;
        if (state.loadedPlugins[updatedPlugin.id]) {
          delete state.loadedPlugins[updatedPlugin.id];
        }
      }
    }).addCase(togglePluginAsync.fulfilled, (state, action) => {
      const { pluginId, active } = action.payload;
      const plugin = state.installedPlugins.find((p) => p.id === pluginId);
      if (plugin) {
        plugin.status = active ? "active" : "inactive";
        if (active) {
          if (!state.activePlugins.includes(pluginId)) {
            state.activePlugins.push(pluginId);
          }
        } else {
          state.activePlugins = state.activePlugins.filter((id) => id !== pluginId);
          delete state.loadedPlugins[pluginId];
        }
      }
    });
  }
});
const {
  clearError,
  clearPluginError,
  clearAllErrors,
  setPluginError,
  unloadPlugin,
  updatePluginStatus
} = pluginSlice.actions;
const pluginReducer = pluginSlice.reducer;

const {createSlice: createSlice$1} = await importShared('@reduxjs/toolkit');

const getSystemPreference = () => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
const getStoredTheme = () => {
  const stored = localStorage.getItem("shell-theme");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
    }
  }
  return {
    mode: "system",
    primaryColor: "#3b82f6",
    accentColor: "#6366f1",
    fontSize: "medium"
  };
};
const calculateEffectiveTheme = (mode, systemPreference) => {
  return mode === "system" ? systemPreference : mode;
};
const initialSystemPreference = getSystemPreference();
const initialTheme = getStoredTheme();
const initialState$1 = {
  ...initialTheme,
  systemPreference: initialSystemPreference,
  effectiveTheme: calculateEffectiveTheme(initialTheme.mode, initialSystemPreference)
};
const themeSlice = createSlice$1({
  name: "theme",
  initialState: initialState$1,
  reducers: {
    setThemeMode: (state, action) => {
      state.mode = action.payload;
      state.effectiveTheme = calculateEffectiveTheme(action.payload, state.systemPreference);
      const themeToStore = {
        mode: state.mode,
        primaryColor: state.primaryColor,
        accentColor: state.accentColor,
        fontSize: state.fontSize
      };
      localStorage.setItem("shell-theme", JSON.stringify(themeToStore));
      applyThemeToDocument(state);
    },
    setPrimaryColor: (state, action) => {
      state.primaryColor = action.payload;
      const themeToStore = {
        mode: state.mode,
        primaryColor: state.primaryColor,
        accentColor: state.accentColor,
        fontSize: state.fontSize
      };
      localStorage.setItem("shell-theme", JSON.stringify(themeToStore));
      applyThemeToDocument(state);
    },
    setAccentColor: (state, action) => {
      state.accentColor = action.payload;
      const themeToStore = {
        mode: state.mode,
        primaryColor: state.primaryColor,
        accentColor: state.accentColor,
        fontSize: state.fontSize
      };
      localStorage.setItem("shell-theme", JSON.stringify(themeToStore));
      applyThemeToDocument(state);
    },
    setFontSize: (state, action) => {
      state.fontSize = action.payload;
      const themeToStore = {
        mode: state.mode,
        primaryColor: state.primaryColor,
        accentColor: state.accentColor,
        fontSize: state.fontSize
      };
      localStorage.setItem("shell-theme", JSON.stringify(themeToStore));
      applyThemeToDocument(state);
    },
    setSystemPreference: (state, action) => {
      state.systemPreference = action.payload;
      state.effectiveTheme = calculateEffectiveTheme(state.mode, action.payload);
      applyThemeToDocument(state);
    },
    resetTheme: (state) => {
      const defaultTheme = {
        mode: "system",
        primaryColor: "#3b82f6",
        accentColor: "#6366f1",
        fontSize: "medium"
      };
      Object.assign(state, {
        ...defaultTheme,
        systemPreference: state.systemPreference,
        effectiveTheme: calculateEffectiveTheme(defaultTheme.mode, state.systemPreference)
      });
      localStorage.setItem("shell-theme", JSON.stringify(defaultTheme));
      applyThemeToDocument(state);
    },
    initializeTheme: (state) => {
      applyThemeToDocument(state);
    }
  }
});
const applyThemeToDocument = (theme) => {
  const root = document.documentElement;
  if (theme.effectiveTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.style.setProperty("--primary-color", theme.primaryColor);
  root.style.setProperty("--accent-color", theme.accentColor);
  const fontSizeMap = {
    small: "14px",
    medium: "16px",
    large: "18px"
  };
  root.style.setProperty("--base-font-size", fontSizeMap[theme.fontSize]);
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      "content",
      theme.effectiveTheme === "dark" ? "#0f172a" : "#ffffff"
    );
  }
};
const {
  setThemeMode,
  setPrimaryColor,
  setAccentColor,
  setFontSize,
  setSystemPreference,
  resetTheme,
  initializeTheme
} = themeSlice.actions;
const themeReducer = themeSlice.reducer;

const {createSlice} = await importShared('@reduxjs/toolkit');

const initialState = {
  notifications: [],
  maxNotifications: 5
};
let notificationIdCounter = 0;
const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification: {
      reducer: (state, action) => {
        const notification = action.payload;
        state.notifications.unshift(notification);
        if (state.notifications.length > state.maxNotifications) {
          state.notifications = state.notifications.slice(0, state.maxNotifications);
        }
      },
      prepare: (notification) => {
        return {
          payload: {
            ...notification,
            id: `notification_${Date.now()}_${++notificationIdCounter}`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        };
      }
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    clearNotificationsByType: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.type !== action.payload
      );
    },
    updateNotification: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.notifications.findIndex((notification) => notification.id === id);
      if (index >= 0) {
        state.notifications[index] = { ...state.notifications[index], ...updates };
      }
    },
    setMaxNotifications: (state, action) => {
      state.maxNotifications = Math.max(1, action.payload);
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(0, state.maxNotifications);
      }
    },
    // Bulk operations
    addMultipleNotifications: (state, action) => {
      const newNotifications = action.payload.map((notification, index) => ({
        ...notification,
        id: `notification_${Date.now()}_${++notificationIdCounter + index}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }));
      state.notifications = [...newNotifications, ...state.notifications];
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(0, state.maxNotifications);
      }
    },
    markAllAsRead: (state) => {
    }
  }
});
const {
  addNotification,
  removeNotification,
  clearNotifications,
  clearNotificationsByType,
  updateNotification,
  setMaxNotifications,
  addMultipleNotifications,
  markAllAsRead
} = notificationSlice.actions;
const notificationReducer = notificationSlice.reducer;

const {configureStore} = await importShared('@reduxjs/toolkit');

const {useDispatch,useSelector} = await importShared('react-redux');
const store = configureStore({
  reducer: {
    auth: authReducer,
    plugins: pluginReducer,
    theme: themeReducer,
    notifications: notificationReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      // Ignore these action types
      ignoredActions: [
        "plugins/loadPlugin/fulfilled",
        "plugins/setPluginError"
      ],
      // Ignore these field paths in all actions
      ignoredActionsPaths: ["payload.error", "payload.instance.module"],
      // Ignore these paths in the state
      ignoredPaths: ["plugins.loadedPlugins", "plugins.errors"]
    }
  }),
  devTools: false
});
const useAppDispatch = () => useDispatch();
const useAppSelector = useSelector;
const selectUser = (state) => state.auth.user;
const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
const selectAuthLoading = (state) => state.auth.isLoading;
const selectAuthError = (state) => state.auth.error;
const selectInstalledPlugins = (state) => state.plugins.installedPlugins;
const selectLoadedPlugins = (state) => state.plugins.loadedPlugins;
const selectActivePlugins = (state) => state.plugins.activePlugins;
const selectPluginRegistry = (state) => state.plugins.registry;
const selectEffectiveTheme = (state) => state.theme.effectiveTheme;
const selectNotifications = (state) => state.notifications.notifications;

const axios = await importShared('axios');
class ApiService {
  api;
  refreshPromise = null;
  constructor() {
    this.api = axios.create({
      baseURL: "/api",
      timeout: 1e4,
      headers: {
        "Content-Type": "application/json"
      }
    });
    this.setupInterceptors();
  }
  setupInterceptors() {
    this.api.interceptors.request.use(
      async (config) => {
        const token = getAccessToken();
        if (token) {
          if (!isTokenValid(token)) {
            try {
              await this.refreshTokenIfNeeded();
              const newToken = getAccessToken();
              if (newToken) {
                config.headers.Authorization = `Bearer ${newToken}`;
              }
            } catch {
              store.dispatch(logoutAsync());
              window.location.href = "/login";
              return Promise.reject(new Error("Authentication required"));
            }
          } else {
            config.headers.Authorization = `Bearer ${token}`;
            if (isTokenExpiring(token, 5)) {
              this.refreshTokenIfNeeded().catch(() => {
              });
            }
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await this.refreshTokenIfNeeded();
            const newToken = getAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch {
            store.dispatch(logoutAsync());
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );
  }
  async refreshTokenIfNeeded() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = store.dispatch(refreshTokenAsync()).unwrap();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }
  // Generic request method
  async request(config) {
    const { retries = 3, retryDelay = 1e3, ...axiosConfig } = config;
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.api(axiosConfig);
        return response.data;
      } catch (error) {
        lastError = error;
        if (error.response?.status >= 400 && error.response?.status < 500) {
          break;
        }
        if (attempt === retries) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
    throw lastError;
  }
  // HTTP method helpers
  async get(url, config) {
    return this.request({ ...config, method: "GET", url });
  }
  async post(url, data, config) {
    return this.request({ ...config, method: "POST", url, data });
  }
  async put(url, data, config) {
    return this.request({ ...config, method: "PUT", url, data });
  }
  async patch(url, data, config) {
    return this.request({ ...config, method: "PATCH", url, data });
  }
  async delete(url, config) {
    return this.request({ ...config, method: "DELETE", url });
  }
  // File upload with progress
  async upload(url, formData, onProgress) {
    return this.request({
      method: "POST",
      url,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data"
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round(progressEvent.loaded * 100 / progressEvent.total);
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage
          });
        }
      }
    });
  }
  // Download file
  async download(url, filename) {
    const response = await this.api({
      method: "GET",
      url,
      responseType: "blob"
    });
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
  // Cancel request
  createCancelToken() {
    const controller = new AbortController();
    return {
      token: controller.signal,
      cancel: (message) => controller.abort()
    };
  }
  // Get API instance for custom requests
  getAxiosInstance() {
    return this.api;
  }
}
new ApiService();

const {QueryClient} = await importShared('@tanstack/react-query');
const queryConfig = {
  queries: {
    retry: (failureCount, error) => {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1e3 * 2 ** attemptIndex, 3e4),
    staleTime: 5 * 60 * 1e3,
    // 5 minutes
    gcTime: 10 * 60 * 1e3,
    // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true
  },
  mutations: {
    retry: (failureCount, error) => {
      return false;
    }
  }
};
const queryClient = new QueryClient({
  defaultOptions: queryConfig
});

const {useState: useState$1} = await importShared('react');

const {Link} = await importShared('react-router-dom');

const {Menu,Search,Bell,Settings: Settings$2,User: User$1,LogOut,Sun,Moon,Monitor,ChevronDown: ChevronDown$1,Home: Home$2,Grid3X3: Grid3X3$1} = await importShared('lucide-react');
const Header = ({ onMenuToggle, isMobileMenuOpen }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const effectiveTheme = useAppSelector(selectEffectiveTheme);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState$1(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState$1(false);
  const [searchQuery, setSearchQuery] = useState$1("");
  const handleLogout = () => {
    dispatch(logoutAsync());
    setIsProfileMenuOpen(false);
  };
  const handleThemeChange = (mode) => {
    dispatch(setThemeMode(mode));
    setIsThemeMenuOpen(false);
  };
  const userInitials = getUserInitials(user?.firstName, user?.lastName, user?.username);
  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-40", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: onMenuToggle,
            className: "p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 lg:hidden focus:outline-none focus:ring-2 focus:ring-primary-500",
            "aria-label": "Toggle mobile menu",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { className: "w-6 h-6" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Link,
          {
            to: "/",
            className: "flex items-center space-x-2 text-xl font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Grid3X3$1, { className: "w-5 h-5 text-white" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:block", children: "Shell Platform" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden md:flex flex-1 max-w-md mx-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-5 w-5 text-gray-400" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "Search plugins, commands...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: "block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden md:flex items-center space-x-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Link,
          {
            to: "/",
            className: "p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors",
            title: "Dashboard",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Home$2, { className: "w-5 h-5" })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setIsThemeMenuOpen(!isThemeMenuOpen),
              className: "p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500",
              title: "Theme settings",
              children: effectiveTheme === "dark" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Moon, { className: "w-5 h-5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, { className: "w-5 h-5" })
            }
          ),
          isThemeMenuOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-1", children: ["light", "dark", "system"].map((mode) => {
            const Icon = themeIcons[mode];
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => handleThemeChange(mode),
                className: "flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "w-4 h-4 mr-3" }),
                  mode.charAt(0).toUpperCase() + mode.slice(1)
                ]
              },
              mode
            );
          }) }) }),
          isThemeMenuOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "fixed inset-0 z-40",
              onClick: () => setIsThemeMenuOpen(false)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: "p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors relative focus:outline-none focus:ring-2 focus:ring-primary-500",
            title: "Notifications",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "w-5 h-5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute top-0 right-0 block w-2 h-2 bg-red-500 rounded-full transform translate-x-1 -translate-y-1" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Link,
          {
            to: "/settings",
            className: "p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500",
            title: "Settings",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings$2, { className: "w-5 h-5" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setIsProfileMenuOpen(!isProfileMenuOpen),
              className: "flex items-center space-x-2 p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium", children: user?.avatar ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: user.avatar,
                    alt: user.username,
                    className: "w-8 h-8 rounded-full object-cover"
                  }
                ) : userInitials }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden md:block text-sm font-medium text-gray-900 dark:text-gray-100", children: user?.firstName || user?.username }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown$1, { className: "hidden md:block w-4 h-4" })
              ]
            }
          ),
          isProfileMenuOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-2 border-b border-gray-200 dark:border-gray-700", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-medium text-gray-900 dark:text-gray-100", children: [
                user?.firstName,
                " ",
                user?.lastName
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: user?.email })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Link,
              {
                to: "/profile",
                className: "flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                onClick: () => setIsProfileMenuOpen(false),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(User$1, { className: "w-4 h-4 mr-3" }),
                  "Profile"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Link,
              {
                to: "/settings",
                className: "flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                onClick: () => setIsProfileMenuOpen(false),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Settings$2, { className: "w-4 h-4 mr-3" }),
                  "Settings"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: handleLogout,
                className: "flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "w-4 h-4 mr-3" }),
                  "Sign Out"
                ]
              }
            )
          ] }) }),
          isProfileMenuOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "fixed inset-0 z-40",
              onClick: () => setIsProfileMenuOpen(false)
            }
          )
        ] })
      ] })
    ] }),
    isMobileMenuOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-gray-200 dark:border-gray-700 px-4 py-2 md:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-5 w-5 text-gray-400" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          placeholder: "Search plugins, commands...",
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          className: "block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        }
      )
    ] }) })
  ] });
};

const React$4 = await importShared('react');
const {useMemo} = React$4;

const {NavLink,useLocation: useLocation$1} = await importShared('react-router-dom');

const {Home: Home$1,Grid3X3,Settings: Settings$1,User,Package,BarChart3,FileText,Users: Users$1,Shield,ChevronDown,ChevronRight,X: X$1} = await importShared('lucide-react');
const {clsx: clsx$2} = await importShared('clsx');

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation$1();
  const user = useAppSelector(selectUser);
  const installedPlugins = useAppSelector(selectInstalledPlugins);
  const coreMenuItems = useMemo(() => [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "Home",
      path: "/",
      permissions: ["dashboard.read"]
    },
    {
      id: "plugins",
      label: "Plugins",
      icon: "Package",
      path: "/plugins",
      permissions: ["plugins.read"],
      children: [
        {
          id: "plugins-installed",
          label: "Installed",
          path: "/plugins/installed",
          permissions: ["plugins.read"]
        },
        {
          id: "plugins-marketplace",
          label: "Marketplace",
          path: "/plugins/marketplace",
          permissions: ["plugins.install"]
        },
        {
          id: "plugins-develop",
          label: "Develop",
          path: "/plugins/develop",
          permissions: ["plugins.develop"]
        }
      ]
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "BarChart3",
      path: "/analytics",
      permissions: ["analytics.read"]
    },
    {
      id: "content",
      label: "Content",
      icon: "FileText",
      path: "/content",
      permissions: ["content.read"]
    },
    {
      id: "users",
      label: "Users",
      icon: "Users",
      path: "/users",
      permissions: ["users.read"]
    },
    {
      id: "security",
      label: "Security",
      icon: "Shield",
      path: "/security",
      permissions: ["security.read"]
    },
    {
      id: "settings",
      label: "Settings",
      icon: "Settings",
      path: "/settings",
      permissions: ["settings.read"]
    },
    {
      id: "profile",
      label: "Profile",
      icon: "User",
      path: "/profile"
    }
  ], []);
  const pluginMenuItems = useMemo(() => {
    return installedPlugins.filter((plugin) => plugin.status === "active" && plugin.configuration.menuItems).flatMap((plugin) => plugin.configuration.menuItems || []).filter((item) => {
      if (!item.permissions?.length) return true;
      return item.permissions.some(
        (permission) => hasPermission(user?.permissions || [], permission)
      );
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [installedPlugins, user?.permissions]);
  const hasMenuPermission = (item) => {
    if (!item.permissions?.length) return true;
    return item.permissions.some(
      (permission) => hasPermission(user?.permissions || [], permission)
    );
  };
  const filteredCoreItems = coreMenuItems.filter(hasMenuPermission);
  [...filteredCoreItems, ...pluginMenuItems];
  const iconMap = {
    Home: Home$1,
    Grid3X3,
    Package,
    BarChart3,
    FileText,
    Users: Users$1,
    Shield,
    Settings: Settings$1,
    User
  };
  const renderIcon = (iconName, className = "w-5 h-5") => {
    const IconComponent = iconMap[iconName] || Grid3X3;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(IconComponent, { className });
  };
  const renderMenuItem = (item, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.path ? location.pathname === item.path : false;
    const isParentActive = item.children?.some((child) => child.path === location.pathname);
    const [isExpanded, setIsExpanded] = React$4.useState(isParentActive || false);
    const baseClasses = clsx$2(
      "flex items-center w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 group",
      {
        "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20": isActive,
        "text-gray-700 hover:text-primary-600 hover:bg-primary-50 dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-primary-900/20": !isActive,
        "pl-6": level === 1,
        "pl-9": level === 2
      }
    );
    if (hasChildren) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => setIsExpanded(!isExpanded),
            className: baseClasses,
            children: [
              item.icon && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-3 flex-shrink-0", children: renderIcon(item.icon) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: item.label }),
              item.badge && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 rounded-full", children: item.badge }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 flex-shrink-0", children: isExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-4 h-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "w-4 h-4" }) })
            ]
          }
        ),
        isExpanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 space-y-1", children: item.children?.map((child) => renderMenuItem(child, level + 1)) })
      ] }, item.id);
    }
    if (item.onClick) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: item.onClick,
          disabled: item.disabled,
          className: clsx$2(baseClasses, {
            "opacity-50 cursor-not-allowed": item.disabled
          }),
          children: [
            item.icon && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-3 flex-shrink-0", children: renderIcon(item.icon) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: item.label }),
            item.badge && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 rounded-full", children: item.badge })
          ]
        },
        item.id
      );
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      NavLink,
      {
        to: item.path || "#",
        className: ({ isActive: isActive2 }) => clsx$2(
          baseClasses,
          {
            "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20": isActive2,
            "opacity-50 cursor-not-allowed pointer-events-none": item.disabled
          }
        ),
        onClick: () => {
          if (window.innerWidth < 1024) {
            onClose();
          }
        },
        children: [
          item.icon && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mr-3 flex-shrink-0", children: renderIcon(item.icon) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: item.label }),
          item.badge && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 rounded-full", children: item.badge })
        ]
      },
      item.id
    );
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    isOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "aside",
      {
        className: clsx$2(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          {
            "translate-x-0": isOpen,
            "-translate-x-full": !isOpen
          }
        ),
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 lg:hidden", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Grid3X3, { className: "w-5 h-5 text-white" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xl font-semibold text-gray-900 dark:text-gray-100", children: "Shell Platform" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: onClose,
                className: "p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-6 h-6" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex-1 px-4 py-4 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Core" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: filteredCoreItems.map((item) => renderMenuItem(item)) })
            ] }),
            pluginMenuItems.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider", children: "Plugins" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1", children: pluginMenuItems.map((item) => renderMenuItem(item)) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-t border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium", children: user?.avatar ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "img",
              {
                src: user.avatar,
                alt: user.username,
                className: "w-8 h-8 rounded-full object-cover"
              }
            ) : user?.username?.[0]?.toUpperCase() || "U" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-medium text-gray-900 dark:text-gray-100 truncate", children: [
                user?.firstName,
                " ",
                user?.lastName
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 truncate", children: user?.email })
            ] })
          ] }) })
        ] })
      }
    )
  ] });
};

const {useEffect: useEffect$1} = await importShared('react');

const {createPortal} = await importShared('react-dom');

const {CheckCircle,XCircle,AlertCircle,Info,X} = await importShared('lucide-react');
const {clsx: clsx$1} = await importShared('clsx');

const NotificationItem = ({ notification, onRemove }) => {
  const { id, type, title, message, duration, persistent, actions } = notification;
  useEffect$1(() => {
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
    info: Info
  };
  const colorMap = {
    success: {
      container: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
      icon: "text-green-500 dark:text-green-400",
      title: "text-green-800 dark:text-green-200",
      message: "text-green-700 dark:text-green-300",
      button: "text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
    },
    error: {
      container: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
      icon: "text-red-500 dark:text-red-400",
      title: "text-red-800 dark:text-red-200",
      message: "text-red-700 dark:text-red-300",
      button: "text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
    },
    warning: {
      container: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800",
      icon: "text-yellow-500 dark:text-yellow-400",
      title: "text-yellow-800 dark:text-yellow-200",
      message: "text-yellow-700 dark:text-yellow-300",
      button: "text-yellow-600 hover:text-yellow-500 dark:text-yellow-400 dark:hover:text-yellow-300"
    },
    info: {
      container: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
      icon: "text-blue-500 dark:text-blue-400",
      title: "text-blue-800 dark:text-blue-200",
      message: "text-blue-700 dark:text-blue-300",
      button: "text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
    }
  };
  const Icon = iconMap[type];
  const colors = colorMap[type];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: clsx$1(
        "max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 ease-in-out",
        "animate-slide-in"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: clsx$1("p-4 border-l-4", colors.container), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: clsx$1("h-5 w-5", colors.icon) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-3 w-0 flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: clsx$1("text-sm font-medium", colors.title), children: title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: clsx$1("mt-1 text-sm", colors.message), children: message }),
            actions && actions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex space-x-2", children: actions.map((action, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: () => {
                  action.action();
                  onRemove(id);
                },
                className: clsx$1(
                  "text-sm font-medium rounded-md px-3 py-1.5 transition-colors",
                  {
                    "bg-primary-600 text-white hover:bg-primary-700": action.style === "primary",
                    "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600": action.style === "secondary",
                    "bg-red-600 text-white hover:bg-red-700": action.style === "danger"
                  }
                ),
                children: action.label
              },
              index
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-4 flex-shrink-0 flex", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => onRemove(id),
              className: clsx$1(
                "inline-flex rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
                colors.button
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sr-only", children: "Dismiss" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" })
              ]
            }
          ) })
        ] }) }),
        !persistent && duration && duration > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1 bg-gray-200 dark:bg-gray-700", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: clsx$1(
              "h-full transition-all ease-linear",
              {
                "bg-green-500": type === "success",
                "bg-red-500": type === "error",
                "bg-yellow-500": type === "warning",
                "bg-blue-500": type === "info"
              }
            ),
            style: {
              width: "100%",
              animation: `shrink ${duration}ms linear forwards`
            }
          }
        ) })
      ]
    }
  );
};
const NotificationContainer = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const handleRemoveNotification = (id) => {
    dispatch(removeNotification(id));
  };
  useEffect$1(() => {
    const id = "notification-container";
    let container2 = document.getElementById(id);
    if (!container2) {
      container2 = document.createElement("div");
      container2.id = id;
      container2.className = "fixed inset-0 pointer-events-none z-50";
      document.body.appendChild(container2);
    }
    return () => {
      const existingContainer = document.getElementById(id);
      if (existingContainer && existingContainer.children.length === 0) {
        document.body.removeChild(existingContainer);
      }
    };
  }, []);
  const container = document.getElementById("notification-container");
  if (!container || notifications.length === 0) {
    return null;
  }
  return createPortal(
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed top-0 right-0 p-6 space-y-4 pointer-events-none z-50", children: notifications.map((notification) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      NotificationItem,
      {
        notification,
        onRemove: handleRemoveNotification
      },
      notification.id
    )) }),
    container
  );
};
const style = document.createElement("style");
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
if (!document.head.querySelector("#notification-animations")) {
  style.id = "notification-animations";
  document.head.appendChild(style);
}

const {clsx} = await importShared('clsx');

const {Loader2} = await importShared('lucide-react');

const Loading = ({
  size = "md",
  variant = "spinner",
  text,
  fullScreen = false,
  overlay = false,
  className
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  };
  const renderSpinner = () => /* @__PURE__ */ jsxRuntimeExports.jsx(
    Loader2,
    {
      className: clsx(
        "animate-spin text-primary-600 dark:text-primary-400",
        sizeClasses[size]
      )
    }
  );
  const renderDots = () => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex space-x-1", children: [0, 1, 2].map((index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: clsx(
        "bg-primary-600 dark:bg-primary-400 rounded-full animate-pulse",
        {
          "w-1 h-1": size === "sm",
          "w-2 h-2": size === "md",
          "w-3 h-3": size === "lg",
          "w-4 h-4": size === "xl"
        }
      ),
      style: {
        animationDelay: `${index * 0.15}s`,
        animationDuration: "0.6s"
      }
    },
    index
  )) });
  const renderPulse = () => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: clsx(
        "bg-primary-600 dark:bg-primary-400 rounded-full animate-pulse-slow",
        sizeClasses[size]
      )
    }
  );
  const renderVariant = () => {
    switch (variant) {
      case "dots":
        return renderDots();
      case "pulse":
        return renderPulse();
      default:
        return renderSpinner();
    }
  };
  const content = /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: clsx(
        "flex items-center justify-center",
        {
          "flex-col space-y-2": text,
          "space-x-2": !text && variant === "spinner"
        },
        className
      ),
      children: [
        renderVariant(),
        text && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-gray-600 dark:text-gray-300 animate-pulse", children: text })
      ]
    }
  );
  if (fullScreen || overlay) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: clsx(
          "fixed inset-0 z-50 flex items-center justify-center",
          {
            "bg-white dark:bg-gray-900": fullScreen,
            "bg-black bg-opacity-50 dark:bg-opacity-70": overlay
          }
        ),
        children: [
          overlay && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg", children: content }),
          fullScreen && content
        ]
      }
    );
  }
  return content;
};
const Skeleton = ({
  width,
  height,
  className,
  variant = "rectangular",
  lines = 1
}) => {
  const baseClasses = "bg-gray-200 dark:bg-gray-700 animate-pulse";
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-md"
  };
  if (variant === "text" && lines > 1) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: clsx("space-y-2", className), children: Array.from({ length: lines }).map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: clsx(
          baseClasses,
          variantClasses[variant],
          "h-4"
        ),
        style: {
          width: index === lines - 1 ? "75%" : "100%"
        }
      },
      index
    )) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: clsx(
        baseClasses,
        variantClasses[variant],
        className
      ),
      style: {
        width: width || (variant === "text" ? "100%" : "40px"),
        height: height || (variant === "text" ? "1rem" : "40px")
      }
    }
  );
};
const LoadingButton = ({
  loading = false,
  loadingText,
  variant = "primary",
  size = "md",
  children,
  disabled,
  className,
  ...props
}) => {
  const variantClasses = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100",
    danger: "bg-red-600 hover:bg-red-700 text-white"
  };
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      ...props,
      disabled: disabled || loading,
      className: clsx(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      ),
      children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-4 h-4 animate-spin mr-2" }),
        loading ? loadingText || "Loading..." : children
      ]
    }
  );
};

const React$3 = await importShared('react');
const {Component} = React$3;

const {AlertTriangle,RefreshCw,Home,Bug} = await importShared('lucide-react');

class ErrorBoundary extends Component {
  resetTimeoutId = null;
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    this.reportError(error, errorInfo);
  }
  componentDidUpdate(prevProps) {
    const { resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    if (hasError && prevProps.resetOnPropsChange && resetOnPropsChange) {
      if (prevProps.children !== this.props.children) {
        this.resetErrorBoundary();
      }
    }
  }
  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }
  reportError = (error, errorInfo) => {
    const eventId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.setState({ eventId });
    if (window.gtag) {
      window.gtag("event", "exception", {
        description: error.message,
        fatal: false,
        custom_map: {
          component_stack: errorInfo.componentStack
        }
      });
    }
  };
  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: void 0
    });
  };
  handleRetry = () => {
    this.resetErrorBoundary();
  };
  handleReload = () => {
    window.location.reload();
  };
  handleGoHome = () => {
    window.location.href = "/";
  };
  toggleDetails = () => {
    console.log("Toggle error details");
  };
  render() {
    const { hasError, error, errorInfo, eventId } = this.state;
    const { children, fallback, showDetails = false, isolate = false } = this.props;
    if (hasError && error) {
      if (fallback) {
        return fallback;
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 ${isolate ? "isolated-error" : ""}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full mx-auto mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-6 h-6 text-red-600 dark:text-red-400" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2", children: "Something went wrong" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 dark:text-gray-300 mb-6", children: "We're sorry, but something unexpected happened. Please try again." }),
          eventId && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-4", children: [
            "Error ID: ",
            eventId
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: this.handleRetry,
                className: "w-full flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 mr-2" }),
                  "Try Again"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex space-x-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: this.handleReload,
                  className: "flex-1 flex items-center justify-center px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 mr-2" }),
                    "Reload"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  onClick: this.handleGoHome,
                  className: "flex-1 flex items-center justify-center px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Home, { className: "w-4 h-4 mr-2" }),
                    "Home"
                  ]
                }
              )
            ] }),
            showDetails && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { className: "text-left", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Bug, { className: "w-4 h-4 mr-1" }),
                "Error Details"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300 overflow-auto max-h-40", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Error:" }),
                  " ",
                  error.message
                ] }),
                error.stack && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Stack:" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "whitespace-pre-wrap mt-1", children: error.stack })
                ] }),
                errorInfo?.componentStack && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Component Stack:" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "whitespace-pre-wrap mt-1", children: errorInfo.componentStack })
                ] })
              ] })
            ] })
          ] })
        ] })
      ] }) });
    }
    return children;
  }
}

const {useState,useEffect} = await importShared('react');

const {Outlet} = await importShared('react-router-dom');
const MainLayout = () => {
  const dispatch = useAppDispatch();
  useAppSelector(selectUser);
  const authLoading = useAppSelector(selectAuthLoading);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    const initialize = async () => {
      try {
        dispatch(initializeTheme());
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e) => {
          dispatch(setSystemPreference(e.matches ? "dark" : "light"));
        };
        mediaQuery.addEventListener("change", handleChange);
        await dispatch(initializeAuthAsync());
        return () => {
          mediaQuery.removeEventListener("change", handleChange);
        };
      } catch (error) {
        console.error("Failed to initialize application:", error);
      } finally {
        setIsInitialized(true);
      }
    };
    initialize();
  }, [dispatch]);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  if (!isInitialized || authLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Loading,
      {
        fullScreen: true,
        variant: "spinner",
        text: "Initializing Shell Platform..."
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-screen bg-gray-50 dark:bg-gray-900", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Sidebar,
      {
        isOpen: isMobileMenuOpen,
        onClose: closeMobileMenu
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col min-w-0 lg:ml-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Header,
        {
          onMenuToggle: handleMobileMenuToggle,
          isMobileMenuOpen
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ErrorBoundary,
        {
          fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2", children: "Something went wrong" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 dark:text-gray-300", children: "Please refresh the page to try again." })
          ] }) }),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {})
        }
      ) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(NotificationContainer, {})
  ] }) });
};

const React$2 = await importShared('react');

const {Navigate: Navigate$1,useLocation} = await importShared('react-router-dom');
const ProtectedRoute = ({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback,
  redirectTo = "/login"
}) => {
  const location = useLocation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const authLoading = useAppSelector(selectAuthLoading);
  if (authLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Loading, { fullScreen: true, text: "Verifying authentication..." });
  }
  if (!isAuthenticated) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Navigate$1,
      {
        to: redirectTo,
        state: { from: location },
        replace: true
      }
    );
  }
  if (permissions.length === 0 && roles.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children });
  }
  const userPermissions = user?.permissions || [];
  const userRoles = user?.roles || [];
  const hasRequiredPermissions = permissions.length === 0 || (requireAll ? permissions.every((permission) => hasPermission(userPermissions, permission)) : permissions.some((permission) => hasPermission(userPermissions, permission)));
  const hasRequiredRoles = roles.length === 0 || (requireAll ? roles.every((role) => hasRole(userRoles, role)) : roles.some((role) => hasRole(userRoles, role)));
  const hasAccess = hasRequiredPermissions && hasRequiredRoles;
  if (!hasAccess) {
    if (fallback) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: fallback });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "svg",
        {
          className: "w-8 h-8 text-red-600 dark:text-red-400",
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
              d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            }
          )
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2", children: "Access Denied" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 dark:text-gray-300 mb-6", children: "You don't have the necessary permissions to access this page." }),
      (permissions.length > 0 || roles.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Required:" }),
        permissions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-medium text-gray-500 dark:text-gray-400", children: [
            "Permissions (",
            requireAll ? "all" : "any",
            "):"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1 mt-1", children: permissions.map((permission) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded",
              children: permission
            },
            permission
          )) })
        ] }),
        roles.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-medium text-gray-500 dark:text-gray-400", children: [
            "Roles (",
            requireAll ? "all" : "any",
            "):"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1 mt-1", children: roles.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded",
              children: role
            },
            role
          )) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => window.history.back(),
            className: "w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors",
            children: "Go Back"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => window.location.href = "/",
            className: "w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors",
            children: "Go to Dashboard"
          }
        )
      ] })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children });
};
const usePermissions = () => {
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const checkPermission = React$2.useCallback((permission) => {
    if (!isAuthenticated || !user) return false;
    return hasPermission(user.permissions, permission);
  }, [user, isAuthenticated]);
  const checkRole = React$2.useCallback((role) => {
    if (!isAuthenticated || !user) return false;
    return hasRole(user.roles, role);
  }, [user, isAuthenticated]);
  const checkPermissions = React$2.useCallback((permissions, requireAll = false) => {
    if (!isAuthenticated || !user || permissions.length === 0) return false;
    return requireAll ? permissions.every((permission) => hasPermission(user.permissions, permission)) : permissions.some((permission) => hasPermission(user.permissions, permission));
  }, [user, isAuthenticated]);
  const checkRoles = React$2.useCallback((roles, requireAll = false) => {
    if (!isAuthenticated || !user || roles.length === 0) return false;
    return requireAll ? roles.every((role) => hasRole(user.roles, role)) : roles.some((role) => hasRole(user.roles, role));
  }, [user, isAuthenticated]);
  return {
    user,
    isAuthenticated,
    checkPermission,
    checkRole,
    checkPermissions,
    checkRoles
  };
};

const React$1 = await importShared('react');
const {Suspense} = React$1;

const {BrowserRouter:Router,Routes,Route,Navigate} = await importShared('react-router-dom');
const Dashboard = React$1.lazy(() => __vitePreload(() => import('./Dashboard-D-P3lfrS.js'),true?__vite__mapDeps([0,1,2,3]):void 0));
const LoginForm = React$1.lazy(() => __vitePreload(() => import('./LoginForm-BjjsRFvI.js'),true?__vite__mapDeps([4,1,2,3]):void 0));
const RegisterForm = React$1.lazy(() => __vitePreload(() => import('./RegisterForm-vTMcXefs.js'),true?__vite__mapDeps([5,1,2,3]):void 0));
const PluginManager = React$1.lazy(() => __vitePreload(() => import('./PluginManager-CEdKzlJk.js'),true?__vite__mapDeps([6,1,2,3]):void 0));
const Profile = React$1.lazy(() => __vitePreload(() => import('./Profile-S5nbg16_.js'),true?__vite__mapDeps([7,1,2,3]):void 0));
const Settings = React$1.lazy(() => __vitePreload(() => import('./Settings-D_--ZQDu.js'),true?__vite__mapDeps([8,1,2,3]):void 0));
const Users = React$1.lazy(() => __vitePreload(() => import('./Users-7LzE9IzD.js'),true?__vite__mapDeps([9,1,2,3]):void 0));
const Analytics = React$1.lazy(() => __vitePreload(() => import('./Analytics-ByqZzueI.js'),true?__vite__mapDeps([10,1,2,3]):void 0));
const NotFound = React$1.lazy(() => __vitePreload(() => import('./NotFound-cq2FJI5l.js'),true?__vite__mapDeps([11,1,2,3]):void 0));
const PublicRoute = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  if (isAuthenticated) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/", replace: true });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
};
const AppRouter = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Router, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    Suspense,
    {
      fallback: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Loading,
        {
          fullScreen: true,
          variant: "spinner",
          text: "Loading..."
        }
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Routes, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Route,
          {
            path: "/login",
            element: /* @__PURE__ */ jsxRuntimeExports.jsx(PublicRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoginForm, {}) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Route,
          {
            path: "/register",
            element: /* @__PURE__ */ jsxRuntimeExports.jsx(PublicRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(RegisterForm, {}) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Route,
          {
            path: "/",
            element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayout, {}) }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { index: true, element: /* @__PURE__ */ jsxRuntimeExports.jsx(Dashboard, {}) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Route,
                {
                  path: "plugins/*",
                  element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { permissions: ["plugins.read"], children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Routes, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { index: true, element: /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "installed", replace: true }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Route,
                      {
                        path: "installed",
                        element: /* @__PURE__ */ jsxRuntimeExports.jsx(PluginManager, {})
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Route,
                      {
                        path: "marketplace",
                        element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { permissions: ["plugins.install"], children: /* @__PURE__ */ jsxRuntimeExports.jsx(PluginManager, {}) })
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Route,
                      {
                        path: "develop",
                        element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { permissions: ["plugins.develop"], children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 text-center", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4", children: "Plugin Development" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 dark:text-gray-300", children: "Plugin development tools coming soon..." })
                        ] }) })
                      }
                    )
                  ] }) })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Route,
                {
                  path: "users",
                  element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { permissions: ["users.read"], children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, {}) })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Route,
                {
                  path: "analytics",
                  element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { permissions: ["analytics.read"], children: /* @__PURE__ */ jsxRuntimeExports.jsx(Analytics, {}) })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "profile", element: /* @__PURE__ */ jsxRuntimeExports.jsx(Profile, {}) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Route,
                {
                  path: "settings",
                  element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { permissions: ["settings.read"], children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, {}) })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Route,
                {
                  path: "plugin/:pluginId/*",
                  element: /* @__PURE__ */ jsxRuntimeExports.jsx(ProtectedRoute, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(PluginRouteHandler, {}) })
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Route, { path: "*", element: /* @__PURE__ */ jsxRuntimeExports.jsx(NotFound, {}) })
      ] })
    }
  ) }) });
};
const PluginRouteHandler = () => {
  const { useParams } = require("react-router-dom");
  const { pluginId } = useParams();
  if (!pluginId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Navigate, { to: "/404", replace: true });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2", children: [
      "Plugin Route: ",
      pluginId
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-blue-700 dark:text-blue-300", children: "Dynamic plugin routing is being implemented. This will render the plugin's custom routes." })
  ] }) });
};

const {Provider} = await importShared('react-redux');

const {QueryClientProvider} = await importShared('@tanstack/react-query');
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault();
});
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});
const App = () => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ErrorBoundary,
    {
      onError: (error, errorInfo) => {
        console.error("App Error Boundary:", error, errorInfo);
      },
      showDetails: false,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Provider, { store, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(QueryClientProvider, { client: queryClient, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AppRouter, {}),
        false
      ] }) })
    }
  );
};

const React = await importShared('react');
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}
const root = client.createRoot(rootElement);
root.render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);

export { setPluginError as A, selectActivePlugins as B, usePermissions as C, ErrorBoundary as E, LoadingButton as L, Skeleton as S, useAppSelector as a, selectAuthError as b, selectAuthLoading as c, clearError$1 as d, sanitizeRedirectUrl as e, selectInstalledPlugins as f, selectPluginRegistry as g, loadPluginRegistryAsync as h, isPasswordStrong as i, updatePluginAsync as j, uninstallPluginAsync as k, loginAsync as l, installPluginAsync as m, selectUser as n, getUserInitials as o, updateProfileAsync as p, selectEffectiveTheme as q, registerAsync as r, selectIsAuthenticated as s, togglePluginAsync as t, useAppDispatch as u, addNotification as v, selectLoadedPlugins as w, updatePluginStatus as x, loadPluginAsync as y, Loading as z };
