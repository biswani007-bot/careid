import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  authService,
  type UserSession,
  type LoginCredentials,
  type AuthResult,
  hasSuperAdminPrivileges,
} from '../services/authService';

export interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  requestOtp: (phone: string) => Promise<{ success: boolean; challengeId?: string; expiresIn?: number; resendAfter?: number; error?: string; message?: string }>;
  loginWithOtp: (challengeId: string, otpCode: string, rememberMe?: boolean) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => authService.getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const cached = authService.getStoredUser();
    const token = authService.getStoredToken();
    return !!token && hasSuperAdminPrivileges(cached);
  });
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Restore session from backend on initial mount
  const refreshSession = useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const result = await authService.verifySession();
      if (result.authenticated && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (credentials: LoginCredentials): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const result = await authService.login(credentials);
      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const requestOtp = async (phone: string) => {
    return await authService.requestOtp(phone);
  };

  const loginWithOtp = async (
    challengeId: string,
    otpCode: string,
    rememberMe?: boolean
  ): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const result = await authService.verifyOtp(challengeId, otpCode, rememberMe);
      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isInitialLoading,
        login,
        requestOtp,
        loginWithOtp,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Route protection wrapper for CareID Admin Portal pages.
 *
 * Verifies that the user has an active, authenticated backend session
 * with verified Super Admin or Admin privileges.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialLoading, user } = useAuth();
  const location = useLocation();

  if (isInitialLoading) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-700"
        role="status"
        aria-live="polite"
      >
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !hasSuperAdminPrivileges(user)) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * Public route wrapper for the login page.
 *
 * If the user is already authenticated with Super Admin privileges,
 * redirects directly to /admin/dashboard.
 */
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialLoading, user } = useAuth();

  if (isInitialLoading) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-700"
        role="status"
        aria-live="polite"
      >
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Loading CareID...</p>
      </div>
    );
  }

  if (isAuthenticated && hasSuperAdminPrivileges(user)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AuthContext;
