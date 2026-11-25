/**
 * Central API Client for CareID Admin Portal
 *
 * Configures base URL from VITE_API_BASE_URL (defaults to https://360api.vnvision.in)
 * Centralizes request headers, authentication bearer token injection,
 * response parsing, and error handling.
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: {
    timestamp?: string;
    path?: string;
    total?: number;
    totalItems?: number;
    totalPages?: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
  total?: number;
  totalCount?: number;
  pagination?: any;
  raw?: any;
  error?: string;
}

export interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
  skipRefreshOn401?: boolean;
}

// Read base URL from Vite environment variables (never hardcoded)
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'https://360api.vnvision.in';
};

// Token storage keys
export const TOKEN_STORAGE_KEYS = {
  ACCESS_TOKEN: 'careid_access_token',
  REFRESH_TOKEN: 'careid_refresh_token',
  USER_SESSION: 'careid_user_session',
  REMEMBER_ME: 'careid_remember_me',
} as const;

/**
 * Retrieve the active access token from storage.
 * Checks localStorage first (remember me = true), then sessionStorage.
 */
export const getStoredAccessToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN) ||
      sessionStorage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
  } catch {
    return null;
  }
};

/**
 * Retrieve the active refresh token from storage.
 */
export const getStoredRefreshToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN) ||
      sessionStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    return null;
  }
};

/**
 * Set active tokens in storage based on remember-me choice.
 */
export const storeAuthTokens = (
  accessToken: string,
  refreshToken?: string,
  rememberMe: boolean = true
): void => {
  try {
    const storage = rememberMe ? localStorage : sessionStorage;
    const secondary = rememberMe ? sessionStorage : localStorage;

    // Clear the other storage to prevent desynchronization
    secondary.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
    secondary.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);

    storage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      storage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    localStorage.setItem(TOKEN_STORAGE_KEYS.REMEMBER_ME, rememberMe ? 'true' : 'false');
  } catch {
    // Fail silently in restricted sandbox/storage environments
  }
};

/**
 * Clear all stored tokens and sessions from both storages.
 */
export const clearStoredAuthTokens = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.USER_SESSION);
    sessionStorage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(TOKEN_STORAGE_KEYS.USER_SESSION);
  } catch {
    // Ignore storage clear errors
  }
};

/**
 * Attempt to refresh the JWT access token using the stored refresh token.
 */
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearStoredAuthTokens();
    return null;
  }

  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => resolve(token));
    });
  }

  isRefreshing = true;

  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/v1/auth/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearStoredAuthTokens();
      onTokenRefreshed(null);
      return null;
    }

    const json = await response.json();
    const data = json.data || json;
    const newAccessToken = data.accessToken;
    const newRefreshToken = data.refreshToken || refreshToken;

    if (newAccessToken) {
      const isRemember = localStorage.getItem(TOKEN_STORAGE_KEYS.REMEMBER_ME) !== 'false';
      storeAuthTokens(newAccessToken, newRefreshToken, isRemember);
      onTokenRefreshed(newAccessToken);
      return newAccessToken;
    }

    clearStoredAuthTokens();
    onTokenRefreshed(null);
    return null;
  } catch {
    clearStoredAuthTokens();
    onTokenRefreshed(null);
    return null;
  } finally {
    isRefreshing = false;
  }
};

/**
 * Generic API request function with automatic token injection and refresh retry.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Inject Bearer token if required or if available
  const token = getStoredAccessToken();
  if (token && (options.requiresAuth !== false)) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, fetchOptions);

    // If 401 Unauthorized and not already retrying, attempt token refresh
    if (response.status === 401 && !options.skipRefreshOn401 && token) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) {
        // Retry with refreshed token
        return apiRequest<T>(endpoint, {
          ...options,
          skipRefreshOn401: true,
          headers: {
            ...headers,
            Authorization: `Bearer ${refreshedToken}`,
          },
        });
      }
    }

    // Try to parse JSON response
    let json: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      json = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      json = { message: text };
    }

    if (!response.ok) {
      const errorMsg =
        json?.message ||
        json?.error ||
        `HTTP Error ${response.status}: ${response.statusText}`;

      return {
        success: false,
        statusCode: response.status,
        error: errorMsg,
        message: errorMsg,
        data: json?.data,
        meta: json?.meta,
      };
    }

    const meta = {
      ...json?.meta,
      ...(json?.total !== undefined ? { total: json.total, totalItems: json.total } : {}),
      ...(json?.totalCount !== undefined ? { totalCount: json.totalCount, totalItems: json.totalCount } : {}),
      ...(json?.page !== undefined ? { page: json.page } : {}),
      ...(json?.limit !== undefined ? { limit: json.limit } : {}),
      ...(json?.totalPages !== undefined ? { totalPages: json.totalPages } : {}),
    };

    return {
      success: true,
      statusCode: response.status,
      message: json?.message,
      data: json?.data !== undefined ? json.data : json,
      meta: Object.keys(meta).length > 0 ? meta : json?.meta,
      total: json?.total ?? json?.totalCount ?? json?.meta?.totalItems ?? json?.meta?.total,
      totalCount: json?.totalCount ?? json?.total ?? json?.meta?.totalItems ?? json?.meta?.total,
      raw: json,
    };
  } catch (error: any) {
    return {
      success: false,
      statusCode: 0,
      error: error?.message || 'Network request failed',
      message: 'Network request failed',
    };
  }
}

/**
 * Convenient API method wrappers
 */
export const apiClient = {
  get: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },

  postForm: <T = any>(endpoint: string, formData: FormData, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },

  patch: <T = any>(endpoint: string, body?: any, options?: ApiRequestOptions) => {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },

  del: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  delete: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default apiClient;

