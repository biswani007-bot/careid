/**
 * CareID Doctor-Web Authentication Service
 * Implements actual backend API endpoints from Postman collection:
 * - POST /api/v1/auth/otp/request
 * - POST /api/v1/auth/otp/verify
 * - POST /api/v1/auth/otp/resend
 * - POST /api/v1/auth/token/refresh
 * - POST /api/v1/auth/logout
 * - GET /api/v1/auth/me
 * - GET /api/v1/doctors/me
 */

import { apiClient, ApiResponse } from './apiClient';
import type { DoctorFacilityAssignmentDTO, PrimaryFacilityInfo } from './facilityService';

export interface OtpRequestData {
  challengeId: string;
  message: string;
}

export interface OtpVerifyData {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
}

export interface PasswordLoginData {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string | number;
  user?: {
    id?: string;
    email?: string;
    phone?: string;
    status?: string;
    roles?: string[];
    [key: string]: unknown;
  };
}

export interface ChallengeSessionData {
  challengeId: string;
  phone: string;
  maskedPhone: string;
  requestedAt: number;
}

export interface AuthMeData {
  id: string;
  phone: string;
  status: string;
  roles: string[];
  permissions: string[];
  email?: string;
}

export interface DoctorQualificationDTO {
  id: string;
  degreeName: string;
  instituteName?: string;
  passingYear?: number;
  specialization?: string;
  createdAt?: string;
}

export interface DoctorCertificationDTO {
  id: string;
  title: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  createdAt?: string;
}

export interface DoctorExperienceDTO {
  id: string;
  designation: string;
  hospitalName: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  createdAt?: string;
}

export interface DoctorDocumentDTO {
  id: string;
  documentType: string;
  medicalAttachmentId: string;
  verificationStatus?: string;
  createdAt?: string;
}

export interface DoctorMeData {
  id: string;
  userId: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  profilePhotoUrl?: string | null;
  digitalSignatureUrl?: string | null;
  biography?: string | null;
  professionalSummary?: string | null;
  yearsOfExperience?: number;
  primarySpecialization?: string;
  secondarySpecializations?: string[];
  medicalCouncil?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  providerIdentifier?: string;
  registrationState?: string | null;
  registrationCountry?: string | null;
  registrationIssueDate?: string | null;
  registrationExpiryDate?: string | null;
  verificationStatus?: string;
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  department?: string;
  subSpecializations?: string[];
  clinicalInterests?: string[];
  servicesOffered?: string[];
  languagesSpoken?: string[];
  emergencyPhone?: string | null;
  qualifications?: DoctorQualificationDTO[];
  certifications?: DoctorCertificationDTO[];
  experiences?: DoctorExperienceDTO[];
  documents?: DoctorDocumentDTO[];
  facilities?: DoctorFacilityAssignmentDTO[];
  facilityAssignments?: DoctorFacilityAssignmentDTO[];
  primaryFacility?: PrimaryFacilityInfo;
  qrToken?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'careid_access_token',
  REFRESH_TOKEN: 'careid_refresh_token',
  CHALLENGE: 'careid_auth_challenge',
  USER_PHONE: 'careid_user_phone',
  USER_CACHE: 'careid_user_profile_cache',
};

export const authService = {
  /**
   * Request Phone OTP for authentication
   * Endpoint: POST /api/v1/auth/otp/request
   * Payload: { phone: "+16505550003" } (E.164 format)
   */
  async requestPhoneOtp(phone: string): Promise<OtpRequestData> {
    const cleanPhone = phone.trim();
    const response: ApiResponse<OtpRequestData> = await apiClient.post<OtpRequestData>(
      '/api/v1/auth/otp/request',
      { phone: cleanPhone }
    );
    const raw = response as unknown as { data?: OtpRequestData } & OtpRequestData;
    const payload = raw?.data || raw;
    const challengeId = payload?.challengeId || (raw as unknown as { data?: { challengeId?: string } })?.data?.challengeId;
    if (!challengeId) {
      throw new Error(payload?.message || 'Failed to retrieve OTP challenge from server');
    }
    return {
      challengeId,
      message: payload?.message || 'OTP sent successfully to registered phone number',
    };
  },

  /**
   * Verify Phone OTP and establish clinical session
   * Endpoint: POST /api/v1/auth/otp/verify
   * Payload: { challengeId: "uuid", otpCode: "123456" }
   */
  async verifyPhoneOtp(challengeId: string, otpCode: string): Promise<OtpVerifyData> {
    const cleanChallengeId = challengeId.trim();
    const cleanOtpCode = otpCode.trim();
    if (!cleanChallengeId) {
      throw new Error('Authentication challenge ID is required. Please request a new OTP.');
    }
    if (!cleanOtpCode) {
      throw new Error('Please enter the 6-digit OTP code.');
    }

    const response: ApiResponse<OtpVerifyData> = await apiClient.post<OtpVerifyData>(
      '/api/v1/auth/otp/verify',
      {
        challengeId: cleanChallengeId,
        otpCode: cleanOtpCode,
      }
    );
    const raw = response as unknown as { data?: OtpVerifyData } & OtpVerifyData;
    const payload = raw?.data || raw;
    if (!payload?.accessToken) {
      throw new Error('Server response did not include an access token');
    }
    return {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      expiresIn: payload.expiresIn,
    };
  },

  /**
   * Resend OTP to registered phone number
   * Endpoint: POST /api/v1/auth/otp/resend
   * Payload: { challengeId: "uuid" }
   */
  async resendPhoneOtp(challengeId: string): Promise<OtpRequestData> {
    const cleanChallengeId = challengeId.trim();
    if (!cleanChallengeId) {
      throw new Error('Authentication challenge ID is required to resend OTP.');
    }

    const response: ApiResponse<OtpRequestData> = await apiClient.post<OtpRequestData>(
      '/api/v1/auth/otp/resend',
      { challengeId: cleanChallengeId }
    );
    const raw = response as unknown as { data?: OtpRequestData } & OtpRequestData;
    const payload = raw?.data || raw;
    const newChallengeId = payload?.challengeId || cleanChallengeId;
    return {
      challengeId: newChallengeId,
      message: payload?.message || 'OTP resent successfully to registered phone number',
    };
  },

  /**
   * Authenticate via email/identifier and password
   * Endpoint: POST /api/v1/auth/password/login
   * Payload: { identifier: string, password: string }
   */
  async loginWithPassword(identifier: string, password: string): Promise<PasswordLoginData> {
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      throw new Error('Please enter your email address');
    }
    if (!password) {
      throw new Error('Please enter your password');
    }

    const response: ApiResponse<PasswordLoginData> = await apiClient.post<PasswordLoginData>(
      '/api/v1/auth/password/login',
      {
        identifier: cleanIdentifier,
        password,
      }
    );

    const raw = response as unknown as { data?: PasswordLoginData } & Record<string, unknown>;
    const payload = (raw?.data || raw) as unknown as Record<string, unknown>;
    const accessToken = (payload?.accessToken || payload?.access_token) as string | undefined;
    const refreshToken = (payload?.refreshToken || payload?.refresh_token) as string | undefined;

    if (!accessToken) {
      throw new Error((payload?.message as string) || 'Server response did not include an access token');
    }

    const loginData: PasswordLoginData = {
      accessToken,
      refreshToken: refreshToken || '',
      expiresIn: (payload?.expires_in || payload?.expiresIn) as string | number | undefined,
      user: payload?.user as Record<string, unknown> | undefined,
    };

    authService.saveTokens({
      accessToken: loginData.accessToken,
      refreshToken: loginData.refreshToken,
      expiresIn: typeof loginData.expiresIn === 'string' ? loginData.expiresIn : undefined,
    });

    return loginData;
  },

  /**
   * Refresh JWT Access Token
   * Endpoint: POST /api/v1/auth/token/refresh
   * Payload: { refreshToken: "..." }
   */
  async refreshAccessToken(): Promise<OtpVerifyData> {
    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response: ApiResponse<OtpVerifyData> = await apiClient.post<OtpVerifyData>(
      '/api/v1/auth/token/refresh',
      { refreshToken }
    );
    const raw = response as unknown as { data?: OtpVerifyData } & OtpVerifyData;
    const payload = raw?.data || raw;
    if (payload?.accessToken) {
      authService.saveTokens(payload);
    }
    return payload;
  },

  /**
   * Get current authenticated user profile and claims
   * Endpoint: GET /api/v1/auth/me
   */
  async getAuthMe(tokenOverride?: string): Promise<AuthMeData> {
    const headers = tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : undefined;
    const response: ApiResponse<AuthMeData> = await apiClient.get<AuthMeData>(
      '/api/v1/auth/me',
      headers
    );
    const raw = response as unknown as { data?: AuthMeData } & AuthMeData;
    return raw?.data || raw;
  },

  /**
   * Get current authenticated doctor profile
   * Endpoint: GET /api/v1/doctors/me
   */
  async getDoctorMe(tokenOverride?: string): Promise<DoctorMeData> {
    const headers = tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : undefined;
    const response: ApiResponse<DoctorMeData> = await apiClient.get<DoctorMeData>(
      '/api/v1/doctors/me',
      headers
    );
    const raw = response as unknown as { data?: DoctorMeData } & DoctorMeData;
    const data = raw?.data || raw;
    if (!data || !data.id) {
      throw new Error('Doctor profile data is empty or invalid');
    }
    return data;
  },

  /**
   * Terminate active user session
   * Endpoint: POST /api/v1/auth/logout
   */
  async logout(): Promise<void> {
    const refreshToken = authService.getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.post('/api/v1/auth/logout', { refreshToken });
      } catch {
        // Continue clearing client storage regardless of server status
      }
    }
    authService.clearSession();
  },

  // --- Session & Token Management ---

  saveTokens(tokens: { accessToken: string; refreshToken: string; expiresIn?: string }): void {
    if (tokens.accessToken) {
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    }
    if (tokens.refreshToken) {
      sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    }
  },

  /**
   * Decodes and returns the JWT claims from active access token
   */
  getJwtClaims(): { roles?: string[]; permissions?: string[]; sub?: string; phone?: string; [key: string]: unknown } | null {
    const token = authService.getAccessToken();
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  },

  /**
   * Checks whether the current authenticated session has Administrator privileges
   */
  isUserAdmin(): boolean {
    const claims = authService.getJwtClaims();
    if (!claims || !Array.isArray(claims.roles)) return false;
    return claims.roles.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN');
  },

  getAccessToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  getRefreshToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  saveChallengeData(data: ChallengeSessionData): void {
    sessionStorage.setItem(STORAGE_KEYS.CHALLENGE, JSON.stringify(data));
    sessionStorage.setItem(STORAGE_KEYS.USER_PHONE, data.phone);
  },

  getChallengeData(): ChallengeSessionData | null {
    const raw = sessionStorage.getItem(STORAGE_KEYS.CHALLENGE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ChallengeSessionData;
    } catch {
      return null;
    }
  },

  clearChallengeData(): void {
    sessionStorage.removeItem(STORAGE_KEYS.CHALLENGE);
  },

  saveUserCache(data: unknown): void {
    try {
      sessionStorage.setItem(STORAGE_KEYS.USER_CACHE, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors
    }
  },

  getUserCache<T>(): T | null {
    const raw = sessionStorage.getItem(STORAGE_KEYS.USER_CACHE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  clearSession(): void {
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.CHALLENGE);
    sessionStorage.removeItem(STORAGE_KEYS.USER_PHONE);
    sessionStorage.removeItem(STORAGE_KEYS.USER_CACHE);
  },

  // --- Formatting & Validation Utilities ---

  /**
   * Formats dialed digits into standard E.164 international format
   * e.g., code="+1", nationalNumber="650 555 0003" -> "+16505550003"
   */
  formatToE164(countryCode: string, nationalNumber: string): string {
    const cleanCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    const cleanDigits = nationalNumber.replace(/\D/g, '');
    return `${cleanCode}${cleanDigits}`;
  },

  /**
   * Masks a phone number for clinical privacy
   * e.g., "+16505550003" -> "+1 ••••••0003"
   */
  maskPhoneNumber(e164Phone: string): string {
    if (!e164Phone) return '';
    const digitsOnly = e164Phone.replace(/\D/g, '');
    if (digitsOnly.length <= 4) return e164Phone;
    const lastFour = digitsOnly.slice(-4);
    const countryPrefix = e164Phone.split(/[\s0-9]/)[0] || '+1';
    return `${countryPrefix} ••••••${lastFour}`;
  },

  /**
   * Validates international mobile numbers
   */
  validatePhoneNumber(nationalNumber: string): { isValid: boolean; error?: string } {
    const cleanDigits = nationalNumber.replace(/\D/g, '');
    if (!cleanDigits) {
      return { isValid: false, error: 'Mobile number is required' };
    }
    if (cleanDigits.length < 7) {
      return { isValid: false, error: 'Mobile number is too short' };
    }
    if (cleanDigits.length > 15) {
      return { isValid: false, error: 'Mobile number cannot exceed 15 digits' };
    }
    return { isValid: true };
  },

  /**
   * Validates standard email address format
   */
  validateEmail(email: string): { isValid: boolean; error?: string } {
    const trimmed = email.trim();
    if (!trimmed) {
      return { isValid: false, error: 'Email address is required' };
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return { isValid: false, error: 'Please enter a valid email address (e.g. user@domain.com)' };
    }
    return { isValid: true };
  },
};
