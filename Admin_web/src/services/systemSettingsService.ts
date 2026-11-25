/**
 * CareID System Settings Service
 *
 * Implements strict live backend integration for:
 * - Platform Settings (GET/PUT /api/v1/admin/settings)
 * - Organization Profile & Branding (GET/POST/PUT /api/v1/admin/organizations)
 * - RBAC Roles & Permissions (GET /api/v1/admin/roles, GET /api/v1/admin/permission-matrix, PUT /api/v1/admin/roles/:id/permissions)
 * - Enterprise Security Metrics (GET /api/v1/security/dashboard)
 * - Maintenance Governance (GET /api/v1/governance/maintenance)
 * - Live Notifications (GET /api/v1/notifications)
 */

import { apiClient, type ApiResponse } from './apiClient';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface SystemSettingItem {
  id: string;
  category: 'GENERAL' | 'BRANDING' | 'SECURITY' | 'ROLES' | 'OCR' | 'INTEGRATIONS' | 'NOTIFICATIONS' | string;
  key: string;
  value: string;
  valueType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description?: string;
  isPublic?: boolean;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertSettingPayload {
  category: string;
  key: string;
  value: string;
  valueType?: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description?: string;
  isPublic?: boolean;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  phone?: string;
  email?: string;
  website?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  language?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  code?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  phone?: string;
  email?: string;
  website?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  language?: string;
}

export interface RbacRole {
  id: string;
  name: string;
  description?: string;
  rolePermissions?: Array<{
    permissionId: string;
    permission?: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
}

export interface PermissionMatrixData {
  roles: Array<{
    id: string;
    name: string;
    assignedPermissions: string[];
  }>;
  permissions: Array<{
    id: string;
    name: string;
    description?: string;
    category?: string;
  }>;
}

export interface SecurityDashboardData {
  mfaEnforcementRate?: number;
  totalActiveSessions?: number;
  recentFailedLogins?: number;
  ipWhitelistEnforced?: boolean;
  encryptionStandard?: string;
  tlsVersion?: string;
  auditLoggingEnabled?: boolean;
  complianceCertifications?: string[];
  lastSecurityAuditDate?: string;
  [key: string]: any;
}

export interface MaintenanceStatusData {
  mode: 'ON' | 'OFF' | string;
  scheduledStart?: string;
  scheduledEnd?: string;
  message?: string;
  allowAdminBypass?: boolean;
}

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

/**
 * Fetch all platform settings or filter by category
 * GET /api/v1/admin/settings
 */
export async function getSystemSettings(category?: string): Promise<SystemSettingItem[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  const response = await apiClient.get<SystemSettingItem[]>(`/api/v1/admin/settings${query}`);
  if (!response.success || !Array.isArray(response.data)) {
    return [];
  }
  return response.data;
}

/**
 * Save / Upsert a platform setting
 * PUT /api/v1/admin/settings
 */
export async function upsertSystemSetting(payload: UpsertSettingPayload): Promise<ApiResponse<SystemSettingItem>> {
  const body: Record<string, any> = {
    category: payload.category.toUpperCase(),
    key: payload.key.toUpperCase(),
    value: payload.value,
    valueType: payload.valueType || 'STRING',
  };
  if (payload.description) {
    body.description = payload.description;
  }
  return apiClient.put<SystemSettingItem>('/api/v1/admin/settings', body);
}

/**
 * Batch save multiple system settings sequentially
 */
export async function batchUpsertSystemSettings(
  settings: UpsertSettingPayload[]
): Promise<{ success: boolean; saved: number; errors: string[] }> {
  const errors: string[] = [];
  let saved = 0;

  for (const s of settings) {
    try {
      const res = await upsertSystemSetting(s);
      if (res.success) {
        saved++;
      } else {
        errors.push(`${s.key}: ${res.error || res.message || 'Failed'}`);
      }
    } catch (err: any) {
      errors.push(`${s.key}: ${err?.message || 'Network exception'}`);
    }
  }

  return {
    success: errors.length === 0,
    saved,
    errors,
  };
}

/**
 * Fetch organizations
 * GET /api/v1/admin/organizations
 */
export async function getOrganizations(): Promise<OrganizationProfile[]> {
  const response = await apiClient.get<OrganizationProfile[]>('/api/v1/admin/organizations');
  if (!response.success || !Array.isArray(response.data)) {
    return [];
  }
  return response.data;
}

/**
 * Fetch primary organization or create if none exists
 */
export async function getPrimaryOrganization(): Promise<OrganizationProfile | null> {
  const orgs = await getOrganizations();
  if (orgs.length > 0) {
    return orgs[0];
  }

  // Create default initial organization if table is empty
  const defaultOrg: UpdateOrganizationPayload = {
    name: 'CareID Health Network',
    code: 'CAREID-HQ',
    primaryColor: '#28006d',
    secondaryColor: '#006a60',
    phone: '+1 (800) 555-0199',
    email: 'admin-support@careid-health.org',
    website: 'https://360api.vnvision.in',
    streetAddress: 'Central Health Vault Node 01',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    timezone: 'America/New_York',
    language: 'en',
  };

  const createRes = await apiClient.post<OrganizationProfile>('/api/v1/admin/organizations', defaultOrg);
  if (createRes.success && createRes.data) {
    return createRes.data;
  }
  return null;
}

/**
 * Update organization profile & branding
 * PUT /api/v1/admin/organizations/:id
 */
export async function updateOrganization(
  orgId: string,
  payload: UpdateOrganizationPayload
): Promise<ApiResponse<OrganizationProfile>> {
  return apiClient.put<OrganizationProfile>(`/api/v1/admin/organizations/${orgId}`, payload);
}

/**
 * Fetch live RBAC roles
 * GET /api/v1/admin/roles
 */
export async function getRbacRoles(): Promise<RbacRole[]> {
  const response = await apiClient.get<RbacRole[]>('/api/v1/admin/roles');
  if (!response.success || !Array.isArray(response.data)) {
    return [];
  }
  return response.data;
}

/**
 * Fetch RBAC permission matrix
 * GET /api/v1/admin/permission-matrix
 */
export async function getPermissionMatrix(): Promise<PermissionMatrixData | null> {
  const response = await apiClient.get<PermissionMatrixData>('/api/v1/admin/permission-matrix');
  if (!response.success || !response.data) {
    return null;
  }
  return response.data;
}

/**
 * Update role permissions
 * PUT /api/v1/admin/roles/:id/permissions
 */
export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[]
): Promise<ApiResponse<any>> {
  return apiClient.put(`/api/v1/admin/roles/${roleId}/permissions`, {
    permissionIds,
  });
}

/**
 * Fetch enterprise security dashboard metrics
 * GET /api/v1/security/dashboard
 */
export async function getSecurityDashboard(): Promise<SecurityDashboardData | null> {
  const response = await apiClient.get<SecurityDashboardData>('/api/v1/security/dashboard');
  if (!response.success || !response.data) {
    return null;
  }
  return response.data;
}

/**
 * Fetch maintenance mode status
 * GET /api/v1/governance/maintenance
 */
export async function getMaintenanceStatus(): Promise<MaintenanceStatusData | null> {
  const response = await apiClient.get<MaintenanceStatusData>('/api/v1/governance/maintenance');
  if (!response.success || !response.data) {
    return null;
  }
  return response.data;
}

/**
 * Fetch live notifications
 * GET /api/v1/notifications
 */
export async function getSystemNotifications(): Promise<any[]> {
  const response = await apiClient.get<any[]>('/api/v1/notifications');
  if (!response.success || !Array.isArray(response.data)) {
    return [];
  }
  return response.data;
}
