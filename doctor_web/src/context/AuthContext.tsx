import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { DoctorProfile } from '@/pages/settings/types';
import { authService, AuthMeData, DoctorMeData, OtpVerifyData } from '@/services/authService';
import {
  facilityService,
  PrimaryFacilityInfo,
  DoctorFacilityAssignmentDTO,
} from '@/services/facilityService';
import { ApiError } from '@/services/apiClient';
import { loadAuthenticatedPhotoUrl, resolvePatientPhotoUrl } from '@/services/patientService';

export interface AuthenticatedUser {
  id: string;
  userId: string;
  fullName: string;
  credentials: string[];
  title: string;
  specialty: string;
  organization: string;
  sidebarDisplayLabel: string;
  avatarUrl: string;
  sidebarAvatarUrl: string;
  role: 'Attending' | 'Fellow' | 'Admin';
  profile: DoctorProfile;
  primaryFacility?: PrimaryFacilityInfo | null;
  facilities?: DoctorFacilityAssignmentDTO[];
  phone?: string;
  email?: string;
  status?: string;
  roles?: string[];
  permissions?: string[];
  workspaceType: 'HUMAN' | 'VETERINARIAN';
  isHumanDoctor: boolean;
  isVeterinarian: boolean;
  hasDualRoleAmbiguity: boolean;
}

export interface AuthContextType {
  user: AuthenticatedUser;
  updateProfile: (updatedProfile: Partial<DoctorProfile>) => void;
  updateAvatar: (newAvatarUrl: string) => void;
  resetAvatar: () => void;
  refreshUserSession: () => Promise<AuthenticatedUser | null>;
  isDemoSession: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
  loginWithVerifiedSession: (
    tokens: OtpVerifyData,
    userMe?: AuthMeData,
    doctorMe?: DoctorMeData
  ) => Promise<AuthenticatedUser> | void;
  logout: () => Promise<void>;
}

const EMPTY_DOCTOR_PROFILE: DoctorProfile = {
  name: '',
  credentials: '',
  title: '',
  specialty: '',
  npi: '',
  licenseNumber: '',
  licenseState: '',
  licenseStatus: '',
  licenseExpiry: '',
  hospital: '',
  department: '',
  office: '',
  email: '',
  phone: '',
  pager: '',
  bio: '',
  consultationTypes: [],
  certifications: [],
};

const EMPTY_AUTHENTICATED_USER: AuthenticatedUser = {
  id: '',
  userId: '',
  fullName: '',
  credentials: [],
  title: '',
  specialty: '',
  organization: '',
  sidebarDisplayLabel: '',
  avatarUrl: '',
  sidebarAvatarUrl: '',
  role: 'Attending',
  profile: EMPTY_DOCTOR_PROFILE,
  workspaceType: 'HUMAN',
  isHumanDoctor: true,
  isVeterinarian: false,
  hasDualRoleAmbiguity: false,
};

export function resolveWorkspaceDetails(
  userMe?: Partial<AuthMeData> | null,
  doctorMe?: Partial<DoctorMeData> | null
): {
  workspaceType: 'HUMAN' | 'VETERINARIAN';
  isHumanDoctor: boolean;
  isVeterinarian: boolean;
  hasDualRoleAmbiguity: boolean;
} {
  const rolesUpper = (userMe?.roles || []).map((r) => String(r).trim().toUpperCase());
  const hasExplicitVetRole = rolesUpper.some((r) =>
    ['VET', 'VETERINARIAN'].includes(r)
  );
  const isExplicitDualRoleFlag = rolesUpper.includes('DOCTOR_VET');
  const hasExplicitDoctorRole = rolesUpper.some((r) =>
    ['DOCTOR', 'PHYSICIAN', 'SURGEON'].includes(r)
  );

  const specTerms = [
    doctorMe?.primarySpecialization,
    doctorMe?.department,
    doctorMe?.medicalCouncil,
    ...(doctorMe?.secondarySpecializations || []),
    ...(doctorMe?.subSpecializations || []),
  ]
    .filter(Boolean)
    .map((s) => String(s).trim());

  const hasVetSpec = specTerms.some((t) =>
    /vet|veterinar|animal|zoological|dvm|pvmc/i.test(t)
  );

  const hasHumanSpec = specTerms.some((t) => {
    if (/human/i.test(t)) return true;
    const isVetQualified = /vet|veterinar|animal|zoological|dvm|pvmc/i.test(t);
    if (isVetQualified) return false;
    const matchesHumanClinical =
      /cardio|internal|pediatric|neuro|surgery|ortho|oncolog|general\s*med|general\s*pract|family\s*med|physician|attending|fellow|md\b|mbbs|pmdc/i.test(t);
    return matchesHumanClinical && !isVetQualified;
  });

  const hasVetCredential = hasExplicitVetRole || hasVetSpec;
  const hasHumanCredential = hasExplicitDoctorRole || hasHumanSpec;

  // Genuine dual-credential ambiguity:
  // - Holds explicit DOCTOR_VET role
  // - Or holds conflicting credentials across both disciplines
  const isDualRole =
    isExplicitDualRoleFlag ||
    (hasHumanCredential && hasVetCredential);

  if (isDualRole) {
    return {
      workspaceType: 'HUMAN',
      isHumanDoctor: true,
      isVeterinarian: true,
      hasDualRoleAmbiguity: true,
    };
  }

  // Fail closed if neither human nor veterinary credentials can be verified
  if (!hasHumanCredential && !hasVetCredential) {
    return {
      workspaceType: 'HUMAN',
      isHumanDoctor: false,
      isVeterinarian: false,
      hasDualRoleAmbiguity: true,
    };
  }

  // Single-role Verified Veterinarian
  if (hasVetCredential && !hasHumanCredential) {
    return {
      workspaceType: 'VETERINARIAN',
      isHumanDoctor: false,
      isVeterinarian: true,
      hasDualRoleAmbiguity: false,
    };
  }

  // Single-role Verified Human Doctor
  if (hasHumanCredential && !hasVetCredential) {
    return {
      workspaceType: 'HUMAN',
      isHumanDoctor: true,
      isVeterinarian: false,
      hasDualRoleAmbiguity: false,
    };
  }

  return {
    workspaceType: 'HUMAN',
    isHumanDoctor: false,
    isVeterinarian: false,
    hasDualRoleAmbiguity: true,
  };
}

function formatLicenseDate(rawDate?: string | null): string {
  if (!rawDate) return '';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatVerificationStatus(status?: string): string {
  if (!status) return '';
  const upper = status.toUpperCase();
  if (upper === 'VERIFIED') return 'Active • Verified';
  if (upper === 'PENDING') return 'Pending Verification';
  if (upper === 'SUSPENDED') return 'Suspended';
  if (upper === 'REJECTED') return 'Rejected';
  return status;
}

const buildAuthenticatedUser = (
  userMe: AuthMeData,
  doctorMe: DoctorMeData,
  primaryFacility?: PrimaryFacilityInfo | null,
  facilities?: DoctorFacilityAssignmentDTO[]
): AuthenticatedUser => {
  const nameCommaParts = doctorMe.fullName?.includes(',')
    ? doctorMe.fullName.split(',').slice(1).map((s) => s.trim()).filter(Boolean)
    : [];

  const qualificationDegrees =
    Array.isArray(doctorMe.qualifications) && doctorMe.qualifications.length > 0
      ? doctorMe.qualifications.map((q) => q.degreeName).filter(Boolean)
      : [];

  const credentialsList =
    qualificationDegrees.length > 0 ? qualificationDegrees : nameCommaParts;

  // CV work experience remains independently managed
  const currentExperience =
    doctorMe.experiences?.find((exp) => exp.isCurrent) || doctorMe.experiences?.[0];

  const licenseStateParts = [
    doctorMe.medicalCouncil,
    doctorMe.registrationState,
    doctorMe.registrationCountry,
  ].filter((part): part is string => Boolean(part && part.trim()));

  const title =
    currentExperience?.designation?.trim() ||
    (doctorMe.primarySpecialization ? `${doctorMe.primarySpecialization} Specialist` : '');

  const cvHospital = currentExperience?.hospitalName?.trim() || '';

  const doctorProfile: DoctorProfile = {
    name: doctorMe.fullName || '',
    credentials: credentialsList.join(', '),
    title,
    specialty: doctorMe.primarySpecialization || '',
    npi: doctorMe.providerIdentifier || '',
    licenseNumber: doctorMe.licenseNumber || doctorMe.registrationNumber || '',
    licenseState: licenseStateParts.join(' • '),
    licenseStatus: formatVerificationStatus(doctorMe.verificationStatus),
    licenseExpiry: formatLicenseDate(doctorMe.registrationExpiryDate),
    hospital: cvHospital,
    department: doctorMe.department || '',
    office: '',
    email: userMe.email || '',
    phone: userMe.phone || '',
    pager: doctorMe.emergencyPhone || '',
    bio: doctorMe.biography || doctorMe.professionalSummary || '',
    consultationTypes: Array.isArray(doctorMe.servicesOffered)
      ? doctorMe.servicesOffered
      : [],
    certifications: Array.isArray(doctorMe.certifications)
      ? doctorMe.certifications.map((c) => c.title).filter(Boolean)
      : [],
    primaryFacility: primaryFacility || null,
    facilities: facilities || [],
  };

  const displayLabel = doctorMe.fullName ? doctorMe.fullName.split(',')[0].trim() : '';
  const photoUrl = resolvePatientPhotoUrl(doctorMe.profilePhotoUrl) || '';

  // Organization reflects primary facility assignment if present
  const organization = primaryFacility?.name || cvHospital || doctorProfile.department || '';

  const workspaceDetails = resolveWorkspaceDetails(userMe, doctorMe);

  return {
    id: doctorMe.id || userMe.id,
    userId: userMe.id,
    fullName: doctorMe.fullName || '',
    credentials: credentialsList,
    title: doctorProfile.title,
    specialty: doctorProfile.specialty,
    organization,
    sidebarDisplayLabel: displayLabel,
    avatarUrl: photoUrl,
    sidebarAvatarUrl: photoUrl,
    role: userMe.roles?.includes('ADMIN') ? 'Admin' : 'Attending',
    profile: doctorProfile,
    primaryFacility: primaryFacility || null,
    facilities: facilities || [],
    phone: userMe.phone,
    email: userMe.email,
    status: userMe.status,
    roles: userMe.roles,
    permissions: userMe.permissions,
    workspaceType: workspaceDetails.workspaceType,
    isHumanDoctor: workspaceDetails.isHumanDoctor,
    isVeterinarian: workspaceDetails.isVeterinarian,
    hasDualRoleAmbiguity: workspaceDetails.hasDualRoleAmbiguity,
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser>(() => {
    const cached = authService.getUserCache<AuthenticatedUser>();
    if (!cached) return EMPTY_AUTHENTICATED_USER;
    if (!cached.workspaceType) {
      const details = resolveWorkspaceDetails(
        { id: cached.userId, email: cached.email, roles: cached.roles },
        {
          id: cached.id,
          primarySpecialization: cached.specialty,
          department: cached.profile?.department,
        }
      );
      return {
        ...cached,
        ...details,
      };
    }
    return cached;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(authService.getAccessToken());
  });

  const [isInitializing, setIsInitializing] = useState<boolean>(() => {
    return Boolean(authService.getAccessToken());
  });

  const refreshInFlightRef = useRef<Promise<AuthenticatedUser | null> | null>(null);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(EMPTY_AUTHENTICATED_USER);
      setIsAuthenticated(false);
    }
  }, []);

  const fetchAndSyncSession = useCallback(async (tokenOverride?: string): Promise<AuthenticatedUser> => {
    const userMe = await authService.getAuthMe(tokenOverride);
    const isClinicalDoctor = userMe.roles?.some((r) =>
      ['DOCTOR', 'PHYSICIAN', 'SURGEON', 'VETERINARIAN', 'DOCTOR_VET', 'VET', 'ADMIN', 'SUPER_ADMIN'].includes(
        String(r).trim().toUpperCase()
      )
    );
    if (!isClinicalDoctor) {
      throw new Error('User does not have DOCTOR or VETERINARIAN clinical role');
    }
    const doctorMe = await authService.getDoctorMe(tokenOverride);

    // Resolve platform facility assignments (Phase B)
    let primaryFacility: PrimaryFacilityInfo | null = null;
    let facilities: DoctorFacilityAssignmentDTO[] = [];
    try {
      const facilityRes = await facilityService.resolveDoctorFacilityAssignments(
        doctorMe.id,
        doctorMe.facilities || doctorMe.facilityAssignments
      );
      primaryFacility = facilityRes.primaryFacility;
      facilities = facilityRes.facilities;
    } catch (facilityErr) {
      console.warn('[AuthContext] Failed to resolve facility assignments:', facilityErr);
    }

    const authUser = buildAuthenticatedUser(userMe, doctorMe, primaryFacility, facilities);
    if (doctorMe.profilePhotoUrl) {
      const authenticatedUrl = await loadAuthenticatedPhotoUrl(doctorMe.profilePhotoUrl);
      authUser.avatarUrl = authenticatedUrl || '';
      authUser.sidebarAvatarUrl = authenticatedUrl || '';
    }
    setUser(authUser);
    authService.saveUserCache(authUser);
    setIsAuthenticated(true);
    return authUser;
  }, []);

  const refreshUserSession = useCallback(async (): Promise<AuthenticatedUser | null> => {
    if (!authService.getAccessToken()) return null;
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }
    const task = fetchAndSyncSession().finally(() => {
      refreshInFlightRef.current = null;
    });
    refreshInFlightRef.current = task;
    return task;
  }, [fetchAndSyncSession]);

  // Initialize or restore session from live backend on app mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const token = authService.getAccessToken();
      if (!token) {
        if (isMounted) {
          setIsInitializing(false);
          setIsAuthenticated(false);
        }
        return;
      }

      try {
        await refreshUserSession();
      } catch (err: unknown) {
        // If doctor profile is not found on backend (404), do not repeatedly call /doctors/me or clear session
        if (err instanceof ApiError && err.statusCode === 404) {
          if (isMounted) {
            setUser(EMPTY_AUTHENTICATED_USER);
            setIsAuthenticated(false);
          }
          return;
        }

        const refreshToken = authService.getRefreshToken();
        if (refreshToken) {
          try {
            await authService.refreshAccessToken();
            if (isMounted) {
              await refreshUserSession();
            }
            return;
          } catch {
            // Token refresh failed as well
          }
        }

        if (isMounted) {
          authService.clearSession();
          setUser(EMPTY_AUTHENTICATED_USER);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    restoreSession();

    // Listen to auth expired event dispatched by apiClient on 401 refresh failure
    const handleAuthExpired = () => {
      if (isMounted) {
        authService.clearSession();
        setUser(EMPTY_AUTHENTICATED_USER);
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('careid:auth_expired', handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('careid:auth_expired', handleAuthExpired);
    };
  }, [refreshUserSession]);

  const loginWithVerifiedSession = useCallback(
    async (
      tokens: OtpVerifyData,
      userMe?: AuthMeData,
      doctorMe?: DoctorMeData
    ): Promise<AuthenticatedUser> => {
      authService.saveTokens(tokens);
      if (userMe && doctorMe) {
        let primaryFacility: PrimaryFacilityInfo | null = null;
        let facilities: DoctorFacilityAssignmentDTO[] = [];
        try {
          const facilityRes = await facilityService.resolveDoctorFacilityAssignments(
            doctorMe.id,
            doctorMe.facilities || doctorMe.facilityAssignments
          );
          primaryFacility = facilityRes.primaryFacility;
          facilities = facilityRes.facilities;
        } catch (facilityErr) {
          console.warn('[AuthContext] Failed to resolve facility assignments:', facilityErr);
        }
        const authUser = buildAuthenticatedUser(userMe, doctorMe, primaryFacility, facilities);
        setUser(authUser);
        authService.saveUserCache(authUser);
        setIsAuthenticated(true);
        return authUser;
      }
      return await fetchAndSyncSession(tokens.accessToken);
    },
    [fetchAndSyncSession]
  );

  const updateProfile = (updatedProfile: Partial<DoctorProfile>) => {
    setUser((prev) => {
      const mergedProfile: DoctorProfile = {
        ...prev.profile,
        ...updatedProfile,
      };

      const workspaceDetails = resolveWorkspaceDetails(
        { id: prev.userId, email: prev.email, roles: prev.roles },
        {
          id: prev.id,
          primarySpecialization: mergedProfile.specialty || prev.specialty,
          department: mergedProfile.department || prev.profile.department,
        }
      );

      const updatedUser: AuthenticatedUser = {
        ...prev,
        fullName: mergedProfile.name || prev.fullName,
        sidebarDisplayLabel: mergedProfile.name
          ? mergedProfile.name.split(',')[0].trim()
          : prev.sidebarDisplayLabel,
        title: mergedProfile.title || prev.title,
        specialty: mergedProfile.specialty || prev.specialty,
        email: mergedProfile.email || prev.email,
        phone: mergedProfile.phone || prev.phone,
        profile: mergedProfile,
        workspaceType: workspaceDetails.workspaceType,
        isHumanDoctor: workspaceDetails.isHumanDoctor,
        isVeterinarian: workspaceDetails.isVeterinarian,
        hasDualRoleAmbiguity: workspaceDetails.hasDualRoleAmbiguity,
      };

      authService.saveUserCache(updatedUser);
      return updatedUser;
    });
  };

  const updateAvatar = (newAvatarUrl: string) => {
    setUser((prev) => {
      const updatedUser: AuthenticatedUser = {
        ...prev,
        avatarUrl: newAvatarUrl,
        sidebarAvatarUrl: newAvatarUrl,
      };
      authService.saveUserCache(updatedUser);
      return updatedUser;
    });
  };

  const resetAvatar = () => {
    setUser((prev) => {
      const updatedUser: AuthenticatedUser = {
        ...prev,
        avatarUrl: '',
        sidebarAvatarUrl: '',
      };
      authService.saveUserCache(updatedUser);
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        updateProfile,
        updateAvatar,
        resetAvatar,
        refreshUserSession,
        isDemoSession: !isAuthenticated,
        isAuthenticated,
        isInitializing,
        loginWithVerifiedSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
