import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { router } from "expo-router";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5001";

// Token management - stored in memory only (not localStorage)
let _accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

export const getAccessToken = (): string | null => {
  return _accessToken;
};

// Sign-out callback — registered by AuthContext so interceptor can trigger logout
let _signOutCallback: (() => Promise<void>) | null = null;
export const setSignOutCallback = (fn: () => Promise<void>) => {
  _signOutCallback = fn;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  withCredentials: true, // Required for HttpOnly cookies
});

// Request interceptor for logging and auth token
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);

    // Add access token to Authorization header if available
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Queue for requests waiting for token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (
  error: AxiosError | null,
  token: string | null = null,
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor for error handling and auto token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 errors with auto-refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Lazy import to avoid circular dependency
        const { authApi } = await import("./auth");
        const response = await authApi.refresh();

        setAccessToken(response.accessToken);
        processQueue(null, response.accessToken);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(error, null);
        setAccessToken(null);

        // Clear session via AuthContext callback, then redirect to login
        if (_signOutCallback) await _signOutCallback();
        router.replace("/sign-in");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

export default apiClient;
