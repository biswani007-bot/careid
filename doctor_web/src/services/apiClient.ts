/**
 * CareID Doctor-Web API Client
 * Base HTTP client configured with environment-based base URL
 * Includes automatic JWT Authorization injection and 401 token refresh queue.
 */

const getBaseUrl = (): string => {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'https://360api.vnvision.in';
  return envUrl.replace(/\/+$/, '');
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: {
    timestamp?: string;
    path?: string;
  };
}

export interface ApiErrorResponse {
  success: boolean;
  statusCode: number;
  error?: string;
  message: string | string[];
  meta?: {
    timestamp?: string;
    path?: string;
  };
}

export class ApiError extends Error {
  statusCode: number;
  errorType?: string;
  messages: string[];

  constructor(statusCode: number, message: string | string[], errorType?: string) {
    const primaryMessage = Array.isArray(message)
      ? message.join(', ')
      : message || 'An unexpected server error occurred';
    super(primaryMessage);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.messages = Array.isArray(message) ? message : [message];
  }
}

// Token refresh mutex & subscriber queue
let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function subscribeTokenRefresh(): Promise<string> {
  return new Promise((resolve, reject) => {
    refreshSubscribers.push({ resolve, reject });
  });
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((sub) => sub.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(error: unknown) {
  refreshSubscribers.forEach((sub) => sub.reject(error));
  refreshSubscribers = [];
  sessionStorage.removeItem('careid_access_token');
  sessionStorage.removeItem('careid_refresh_token');
  sessionStorage.removeItem('careid_user_profile_cache');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('careid:auth_expired'));
  }
}

async function performTokenRefresh(): Promise<string> {
  const refreshToken = sessionStorage.getItem('careid_refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const baseUrl = getBaseUrl();
  const refreshUrl = `${baseUrl}/api/v1/auth/token/refresh`;

  const response = await fetch(refreshUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const json = await response.json();
  const tokenData = json?.data || json;
  if (!tokenData?.accessToken) {
    throw new Error('Malformed refresh response');
  }

  sessionStorage.setItem('careid_access_token', tokenData.accessToken);
  if (tokenData.refreshToken) {
    sessionStorage.setItem('careid_refresh_token', tokenData.refreshToken);
  }

  return tokenData.accessToken;
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function prepareBody(body?: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return body;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body;
  if (typeof ArrayBuffer !== 'undefined' && (body instanceof ArrayBuffer || ArrayBuffer.isView(body))) {
    return body as BodyInit;
  }
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return body;
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${normalizedEndpoint}`;

  const hasFormDataBody = isFormData(options.body);

  const headers: Record<string, string> = {};

  if (!hasFormDataBody) {
    headers['Content-Type'] = 'application/json';
  }
  headers['Accept'] = 'application/json';

  if (options.headers) {
    if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  // When submitting FormData, Content-Type must be omitted so Fetch generates the boundary
  if (hasFormDataBody) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  const token = sessionStorage.getItem('careid_access_token');
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const errMessage =
      err instanceof Error
        ? err.message
        : 'Network connection error. Please check your internet connection.';
    throw new ApiError(0, errMessage, 'NetworkError');
  }

  // Handle 401 Unauthorized with automatic Token Refresh (except on auth endpoints)
  const isAuthEndpoint =
    normalizedEndpoint.includes('/auth/otp/verify') ||
    normalizedEndpoint.includes('/auth/otp/request') ||
    normalizedEndpoint.includes('/auth/password/login') ||
    normalizedEndpoint.includes('/auth/admin/login') ||
    normalizedEndpoint.includes('/auth/token/refresh') ||
    normalizedEndpoint.includes('/auth/logout');

  if (response.status === 401 && !isAuthEndpoint) {
    const storedRefreshToken = sessionStorage.getItem('careid_refresh_token');
    if (storedRefreshToken) {
      try {
        let newAccessToken: string;
        if (isRefreshing) {
          // Wait for the active refresh to finish
          newAccessToken = await subscribeTokenRefresh();
        } else {
          isRefreshing = true;
          try {
            newAccessToken = await performTokenRefresh();
            onRefreshed(newAccessToken);
          } catch (refreshErr) {
            onRefreshFailed(refreshErr);
            throw refreshErr;
          } finally {
            isRefreshing = false;
          }
        }

        // Retry the original request with new token
        const retryHeaders: Record<string, string> = {
          ...headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        if (hasFormDataBody) {
          delete retryHeaders['Content-Type'];
          delete retryHeaders['content-type'];
        }

        const retryResponse = await fetch(fullUrl, {
          ...options,
          headers: retryHeaders,
        });

        let retryJson: unknown;
        try {
          retryJson = await retryResponse.json();
        } catch {
          retryJson = null;
        }

        if (retryResponse.ok) {
          return retryJson as ApiResponse<T>;
        }
      } catch {
        // If refresh fails, fall through to default error handling
      }
    }
  }

  let jsonResponse: unknown;
  try {
    jsonResponse = await response.json();
  } catch {
    jsonResponse = null;
  }

  if (!response.ok) {
    const errorBody = jsonResponse as ApiErrorResponse | null;
    const statusCode = response.status;
    const errorMessage =
      errorBody?.message ||
      (statusCode === 404
        ? 'Requested endpoint not found'
        : statusCode === 401
        ? 'Unauthorized: Invalid credentials or session expired'
        : statusCode === 403
        ? 'Forbidden: Access denied'
        : statusCode === 429
        ? 'Too many requests. Please wait a moment and try again.'
        : statusCode >= 500
        ? 'CareID Server error. Please try again later.'
        : `Request failed with status ${statusCode}`);

    throw new ApiError(statusCode, errorMessage, errorBody?.error);
  }

  return jsonResponse as ApiResponse<T>;
}

export interface ApiDownloadResult {
  blob: Blob;
  filename: string;
  contentType: string;
}

export function parseContentDispositionFilename(header?: string | null): string | null {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;\n]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }
  const quotedMatch = header.match(/filename="([^"]+)"/i);
  if (quotedMatch) return quotedMatch[1].trim();
  const bareMatch = header.match(/filename=([^;\s]+)/i);
  if (bareMatch) return bareMatch[1].trim();
  return null;
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}

export async function apiDownload(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiDownloadResult> {
  const baseUrl = getBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${normalizedEndpoint}`;

  const headers: Record<string, string> = {
    Accept: 'application/pdf, application/json, */*',
  };

  if (options.headers) {
    if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  const token = sessionStorage.getItem('careid_access_token');
  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const errMessage =
      err instanceof Error
        ? err.message
        : 'Network connection error. Please check your internet connection.';
    throw new ApiError(0, errMessage, 'NetworkError');
  }

  // Handle 401 Unauthorized with token refresh
  if (response.status === 401) {
    const storedRefreshToken = sessionStorage.getItem('careid_refresh_token');
    if (storedRefreshToken) {
      try {
        let newAccessToken: string;
        if (isRefreshing) {
          newAccessToken = await subscribeTokenRefresh();
        } else {
          isRefreshing = true;
          try {
            newAccessToken = await performTokenRefresh();
            onRefreshed(newAccessToken);
          } catch (refreshErr) {
            onRefreshFailed(refreshErr);
            throw refreshErr;
          } finally {
            isRefreshing = false;
          }
        }

        const retryHeaders: Record<string, string> = {
          ...headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        response = await fetch(fullUrl, {
          ...options,
          headers: retryHeaders,
        });
      } catch {
        // Fall through to error handling
      }
    }
  }

  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.message || errorMsg;
    } catch {
      // Ignore JSON parse errors for non-200 responses
    }
    throw new ApiError(response.status, errorMsg);
  }

  const dispositionHeader = response.headers.get('content-disposition');
  const serverFilename = parseContentDispositionFilename(dispositionHeader);
  const serverContentType = response.headers.get('content-type') || '';

  const rawBuffer = await response.arrayBuffer();
  const uint8View = new Uint8Array(rawBuffer);

  let finalBlob: Blob;
  let finalFilename = serverFilename || 'careid-clinical-record.pdf';
  let finalContentType = serverContentType || 'application/pdf';

  // Check if raw binary is PDF (%PDF magic number [0x25, 0x50, 0x44, 0x46])
  if (
    uint8View.length >= 4 &&
    uint8View[0] === 0x25 &&
    uint8View[1] === 0x50 &&
    uint8View[2] === 0x44 &&
    uint8View[3] === 0x46
  ) {
    finalContentType = 'application/pdf';
    if (!finalFilename.endsWith('.pdf')) finalFilename += '.pdf';
    finalBlob = new Blob([rawBuffer], { type: 'application/pdf' });
  } else {
    // Attempt parsing as JSON in case NestJS StreamableFile wrapper or JSON clinical payload is returned
    let parsedJson: Record<string, unknown> | null = null;
    try {
      const textDecoder = new TextDecoder('utf-8');
      const textContent = textDecoder.decode(rawBuffer);
      parsedJson = JSON.parse(textContent) as Record<string, unknown>;
    } catch {
      parsedJson = null;
    }

    if (parsedJson) {
      // Check for NestJS StreamableFile buffer serialization
      const streamBuffer = (parsedJson.data as Record<string, unknown> | undefined)?.stream as
        | Record<string, unknown>
        | undefined;
      const readableState = streamBuffer?._readableState as Record<string, unknown> | undefined;
      const bufferList = readableState?.buffer as Array<{ data?: number[] } | number[]> | undefined;

      if (Array.isArray(bufferList) && bufferList.length > 0) {
        const byteArrays: Uint8Array[] = bufferList.map((item) => {
          const rawBytes = Array.isArray(item) ? item : item.data || [];
          return new Uint8Array(rawBytes);
        });
        finalContentType = 'application/pdf';
        if (!finalFilename.endsWith('.pdf')) finalFilename += '.pdf';
        finalBlob = new Blob(byteArrays, { type: 'application/pdf' });
      } else {
        // Structured JSON payload
        finalContentType = 'application/json';
        finalFilename = finalFilename.replace(/\.pdf$/i, '.json');
        if (!finalFilename.endsWith('.json')) finalFilename += '.json';
        const formattedJson = JSON.stringify(parsedJson.data || parsedJson, null, 2);
        finalBlob = new Blob([formattedJson], { type: 'application/json' });
      }
    } else {
      // Fallback to raw buffer with server content-type
      finalBlob = new Blob([rawBuffer], { type: serverContentType || 'application/octet-stream' });
    }
  }

  return {
    blob: finalBlob,
    filename: finalFilename,
    contentType: finalContentType,
  };
}

export async function postFormData<T>(
  endpoint: string,
  formData: FormData,
  headers?: HeadersInit
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    headers,
    body: formData,
  });
}

export const apiClient = {
  get: <T>(endpoint: string, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, { method: 'GET', headers }),

  post: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      headers,
      body: prepareBody(body),
    }),

  put: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      headers,
      body: prepareBody(body),
    }),

  patch: <T>(endpoint: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      headers,
      body: prepareBody(body),
    }),

  delete: <T>(endpoint: string, headers?: HeadersInit) =>
    apiRequest<T>(endpoint, { method: 'DELETE', headers }),

  download: apiDownload,
  postFormData,
};
