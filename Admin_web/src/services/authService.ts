/**
 * CareID Authentication Service
 *
 * Implements real backend authentication against https://360api.vnvision.in
 * following the CareID Staging Postman Collection specification:
 * - Admin Email/Password Login: POST /api/v1/auth/admin/login
 * - Session profile & claims: GET /api/v1/auth/me
 * - User roles: GET /api/v1/auth/roles
 * - User permissions: GET /api/v1/auth/permissions
 * - Token refresh: POST /api/v1/auth/token/refresh
 * - Session logout: POST /api/v1/auth/logout
 */

import {
  apiClient,
  getApiBaseUrl,
  storeAuthTokens,
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  TOKEN_STORAGE_KEYS,
  refreshAccessToken,
} from './apiClient';

export interface UserSession {
  id: string;
  email?: string;
  phone?: string;
  status: string;
  roles: string[];
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface OtpRequestResult {
  success: boolean;
  challengeId?: string;
  expiresIn?: number;
  resendAfter?: number;
  error?: string;
  message?: string;
  statusCode?: number;
}

export interface AuthResult {
  success: boolean;
  user?: UserSession;
  error?: string;
  statusCode?: number;
  isStagingFallback?: boolean;
}

/**
 * Check if a user has sufficient Super Admin or Admin privileges.
 */
export const hasSuperAdminPrivileges = (user: UserSession | null | undefined): boolean => {
  if (!user || !user.roles) return false;
  const normalizedRoles = user.roles.map((r) => r.toUpperCase());
  return normalizedRoles.includes('SUPER_ADMIN') || normalizedRoles.includes('ADMIN');
};

/**
 * Read currently cached user session from browser storage.
 */
export const getStoredUserSession = (): UserSession | null => {
  try {
    const raw =
      localStorage.getItem(TOKEN_STORAGE_KEYS.USER_SESSION) ||
      sessionStorage.getItem(TOKEN_STORAGE_KEYS.USER_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Store user session in appropriate storage based on remember-me choice.
 */
export const storeUserSession = (user: UserSession, rememberMe: boolean = true): void => {
  try {
    const storage = rememberMe ? localStorage : sessionStorage;
    const secondary = rememberMe ? sessionStorage : localStorage;

    secondary.removeItem(TOKEN_STORAGE_KEYS.USER_SESSION);
    storage.setItem(TOKEN_STORAGE_KEYS.USER_SESSION, JSON.stringify(user));
  } catch {
    // Fail silently in restricted environments
  }
};

/**
 * Primary Admin Login
 *
 * Implements authentication using the updated Postman collection specification:
 * - Endpoint: POST /api/v1/auth/password/login
 * - Payload: { identifier, password }
 */
export const loginWithBackend = async (
  credentials: LoginCredentials
): Promise<AuthResult> => {
  const { email, password, rememberMe = true } = credentials;
  const baseUrl = getApiBaseUrl();

  const payload = {
    identifier: email,
    password: password,
  };

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    // 1. Submit login payload to documented endpoint in updated Postman collection
    const response = await fetch(`${baseUrl}/api/v1/auth/password/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // Handle 200 OK — Admin authenticated successfully
    if (response.ok) {
      const json = await response.json();
      const data = json.data || json;

      const accessToken = data.access_token || data.accessToken;
      const refreshToken = data.refresh_token || data.refreshToken;
      const userRaw = data.user || {};

      if (!accessToken) {
        return {
          success: false,
          error: 'Unexpected response: No access token returned by authentication server.',
          statusCode: 500,
        };
      }

      const userSession: UserSession = {
        id: userRaw.id || '',
        email: userRaw.email || email,
        phone: userRaw.phone || '',
        status: userRaw.status || 'ACTIVE',
        roles: Array.isArray(userRaw.roles) ? userRaw.roles : ['ADMIN'],
        permissions: Array.isArray(userRaw.permissions) ? userRaw.permissions : [],
      };

      // Role check: Only Super Admin / Admin are granted portal access
      if (!hasSuperAdminPrivileges(userSession)) {
        return {
          success: false,
          error: 'Access denied: Administrator privileges (SUPER_ADMIN or ADMIN) required.',
          statusCode: 403,
        };
      }

      storeAuthTokens(accessToken, refreshToken, rememberMe);
      storeUserSession(userSession, rememberMe);

      return {
        success: true,
        user: userSession,
      };
    }

    // Handle known HTTP error codes
    if (response.status === 400) {
      const json = await response.json().catch(() => ({}));
      return {
        success: false,
        error: json.message || 'Validation error: Identifier and password required.',
        statusCode: 400,
      };
    }

    if (response.status === 401) {
      const json = await response.json().catch(() => ({}));
      return {
        success: false,
        error: json.message || 'Authentication failed: Invalid credentials or inactive account.',
        statusCode: 401,
      };
    }

    if (response.status === 403) {
      const json = await response.json().catch(() => ({}));
      return {
        success: false,
        error: json.message || 'Authorization failed: Insufficient administrator privileges.',
        statusCode: 403,
      };
    }

    // Handle 404 (endpoint not registered on hosted backend)
    if (response.status === 404) {
      return {
        success: false,
        error:
          'Authentication endpoint (POST /api/v1/auth/password/login) was not found on the backend server (404 Not Found). Please verify deployment with backend administrator.',
        statusCode: 404,
      };
    }

    const errorJson = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errorJson.message || `Server error (${response.status})`,
      statusCode: response.status,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error: Unable to connect to authentication server.',
      statusCode: 0,
    };
  }
};

/**
 * Request OTP for phone-based administrator login
 *
 * Endpoint: POST /api/v1/auth/otp/request
 * Payload: { phone }
 */
export const requestOtp = async (phone: string): Promise<OtpRequestResult> => {
  const baseUrl = getApiBaseUrl();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/otp/request`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: phone.trim() }),
    });

    const json = await response.json().catch(() => ({}));

    if (response.ok && json.success) {
      return {
        success: true,
        challengeId: json.data?.challengeId,
        expiresIn: json.data?.expiresIn || 300,
        resendAfter: json.data?.resendAfter || 60,
        message: json.message || 'OTP sent successfully',
        statusCode: response.status,
      };
    }

    return {
      success: false,
      error: json.message || 'Failed to send OTP code. Please check your phone number.',
      statusCode: response.status,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error: Unable to reach authentication server.',
      statusCode: 0,
    };
  }
};

/**
 * Verify OTP and complete phone-based administrator login
 *
 * Endpoint: POST /api/v1/auth/otp/verify
 * Payload: { challengeId, otpCode }
 */
export const verifyOtp = async (
  challengeId: string,
  otpCode: string,
  rememberMe: boolean = true
): Promise<AuthResult> => {
  const baseUrl = getApiBaseUrl();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        challengeId,
        otpCode: otpCode.trim(),
      }),
    });

    const json = await response.json().catch(() => ({}));

    if (response.ok && (json.success || json.data?.access_token)) {
      const data = json.data || json;
      const accessToken = data.access_token || data.accessToken;
      const refreshToken = data.refresh_token || data.refreshToken;
      const userRaw = data.user || {};

      if (!accessToken) {
        return {
          success: false,
          error: 'Unexpected response: No access token returned by authentication server.',
          statusCode: 500,
        };
      }

      const userSession: UserSession = {
        id: userRaw.id || '',
        email: userRaw.email || (userRaw.phone ? `${userRaw.phone}@careid.local` : 'admin@careid.test'),
        phone: userRaw.phone || '',
        status: userRaw.status || 'ACTIVE',
        roles: Array.isArray(userRaw.roles) ? userRaw.roles : ['ADMIN'],
        permissions: Array.isArray(userRaw.permissions) ? userRaw.permissions : [],
      };

      // Role check: Only Super Admin / Admin are granted portal access
      if (!hasSuperAdminPrivileges(userSession)) {
        return {
          success: false,
          error: 'Access denied: Administrator privileges (SUPER_ADMIN or ADMIN) required.',
          statusCode: 403,
        };
      }

      storeAuthTokens(accessToken, refreshToken, rememberMe);
      storeUserSession(userSession, rememberMe);

      return {
        success: true,
        user: userSession,
      };
    }

    if (response.status === 401) {
      return {
        success: false,
        error: json.message || 'Invalid or expired OTP code. Please try again.',
        statusCode: 401,
      };
    }

    if (response.status === 400) {
      return {
        success: false,
        error: json.message || 'Invalid OTP verification request parameters.',
        statusCode: 400,
      };
    }

    return {
      success: false,
      error: json.message || `Authentication failed (${response.status})`,
      statusCode: response.status,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error: Unable to connect to authentication server.',
      statusCode: 0,
    };
  }
};

/**
 * Verify and restore active session with backend GET /api/v1/auth/me.
 *
 * Called on application startup and route protection guards.
 */
export const verifyActiveSession = async (): Promise<{
  authenticated: boolean;
  user: UserSession | null;
}> => {
  const token = getStoredAccessToken();
  if (!token) {
    clearStoredAuthTokens();
    return { authenticated: false, user: null };
  }

  try {
    const res = await apiClient.get('/api/v1/auth/me');

    if (res.success && res.data) {
      const cached = getStoredUserSession();
      const me = res.data;

      const userSession: UserSession = {
        id: me.id || cached?.id || '',
        email: me.email || cached?.email || (me.phone ? `${me.phone}@careid.local` : 'superadmin@careid.test'),
        phone: me.phone || cached?.phone || '',
        status: me.status || 'ACTIVE',
        roles: Array.isArray(me.roles) ? me.roles : cached?.roles || ['SUPER_ADMIN'],
        permissions: Array.isArray(me.permissions) ? me.permissions : cached?.permissions || [],
      };

      if (!hasSuperAdminPrivileges(userSession)) {
        clearStoredAuthTokens();
        return { authenticated: false, user: null };
      }

      const isRemember = localStorage.getItem(TOKEN_STORAGE_KEYS.REMEMBER_ME) !== 'false';
      storeUserSession(userSession, isRemember);

      return { authenticated: true, user: userSession };
    }

    // If 401 or failed verification, attempt refresh
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retry = await apiClient.get('/api/v1/auth/me');
      if (retry.success && retry.data) {
        const cached = getStoredUserSession();
        const me = retry.data;
        const userSession: UserSession = {
          id: me.id || cached?.id || '',
          email: me.email || cached?.email || 'superadmin@careid.test',
          phone: me.phone || cached?.phone || '',
          status: me.status || 'ACTIVE',
          roles: Array.isArray(me.roles) ? me.roles : ['SUPER_ADMIN'],
          permissions: Array.isArray(me.permissions) ? me.permissions : [],
        };
        return { authenticated: true, user: userSession };
      }
    }

    clearStoredAuthTokens();
    return { authenticated: false, user: null };
  } catch {
    // If backend is momentarily unreachable but valid session exists in cache
    const cached = getStoredUserSession();
    if (cached && hasSuperAdminPrivileges(cached)) {
      return { authenticated: true, user: cached };
    }

    clearStoredAuthTokens();
    return { authenticated: false, user: null };
  }
};

/**
 * Logout authenticated user.
 *
 * Calls POST /api/v1/auth/logout with refreshToken and clears client storage.
 */
export const logoutUser = async (): Promise<void> => {
  const refreshToken = getStoredRefreshToken();

  if (refreshToken) {
    try {
      await apiClient.post('/api/v1/auth/logout', { refreshToken }, { requiresAuth: false });
    } catch {
      // Continue client cleanup even if network request fails
    }
  }

  clearStoredAuthTokens();
};

export const authService = {
  login: loginWithBackend,
  requestOtp,
  verifyOtp,
  verifySession: verifyActiveSession,
  logout: logoutUser,
  getStoredUser: getStoredUserSession,
  getStoredToken: getStoredAccessToken,
  hasSuperAdminPrivileges,
};

export default authService;

