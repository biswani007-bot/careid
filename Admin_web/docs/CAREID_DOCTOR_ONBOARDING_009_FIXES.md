# CAREID DOCTOR ONBOARDING 009 — IMPLEMENTATION & FIXES REPORT

**Project:** CAREID / HEALTH VAULT 360  
**Goal:** CAREID-DOCTOR-ONBOARDING-AUTH-PHOTO-SPECIALITY-FIX-009  
**Date:** November 24, 2026  
**Status:** **IMPLEMENTED & VERIFIED**

---

## 1. Overview of Code Modifications

This report details the concrete source code changes implemented across the Backend, Admin Web, and Doctor Web to resolve Defect 1 (Doctor Login 403), Defect 2 (Profile Photo Upload), and Defect 3 (Dynamic Specialities).

---

## 2. Defect 1 Fix: Doctor Password Login Support

### 2.1 Backend AuthService Remediation
**File:** `D:\careid\backend\src\modules\auth\application\use-cases\auth.service.ts`

**Changes Made:**
1. Modified the authorization gate in `passwordLogin` so that users possessing the `DOCTOR` role are permitted to authenticate via password login alongside `ADMIN` and `SUPER_ADMIN`.
2. Added doctor profile resolution: when a `DOCTOR` authenticates, the service retrieves the associated `doctor_profiles` record and includes doctor-specific claims in the session response.
3. Updated audit logging: differentiates between `ADMIN_PASSWORD_LOGIN_SUCCESS` and `DOCTOR_PASSWORD_LOGIN_SUCCESS`.
4. Maintained strict role separation: Admin-only API endpoints guarded by `RolesGuard(['ADMIN', 'SUPER_ADMIN'])` reject doctor sessions with `403 Forbidden`.

```typescript
// Updated authorization gate in auth.service.ts
const hasAuthorizedRole = 
  userRoles.includes('ADMIN') || 
  userRoles.includes('SUPER_ADMIN') || 
  userRoles.includes('DOCTOR');

if (!hasAuthorizedRole) {
  await this.authRepository.createAuditLog(
    user.id,
    'PASSWORD_LOGIN_FAILED',
    'Unauthorized role attempted password login',
    ipAddress,
  );
  throw new ForbiddenException('Access denied. Insufficient privileges.');
}
```

### 2.2 Unit Test Updates
**File:** `D:\careid\backend\src\modules\auth\tests\password-login.spec.ts`
- Verified positive authentication tests for `DOCTOR` role.
- Verified negative tests: inactive doctor accounts rejected (`401 Unauthorized`), incorrect password rejected (`401 Unauthorized`), non-authorized roles (e.g. `PATIENT` or unapproved roles) rejected (`403 Forbidden`).
- Test suite executed via Jest and passed:
  ```text
  PASS src/modules/auth/tests/password-login.spec.ts
  ```

---

## 3. Defect 2 Fix: Doctor Profile Photo Upload

### 3.1 Frontend Service Mutation
**File:** `D:\careid\Admin_web\src\services\doctorService.ts`

Added `useUploadDoctorPhotoMutation`:
```typescript
export const useUploadDoctorPhotoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ doctorId, file }: { doctorId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.postForm<any>(`/api/v1/doctors/${doctorId}/photo`, formData);
      if (!res.success && res.message) {
        throw new Error(Array.isArray(res.message) ? res.message.join('; ') : res.message);
      }
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', vars.doctorId] });
    },
  });
};
```

### 3.2 Form Component Integration
**File:** `D:\careid\Admin_web\src\components\doctors\AdminAddDoctor.tsx`
- Added client-side file validation:
  - Allowed MIME types: `image/jpeg`, `image/png`.
  - Maximum size: `2 * 1024 * 1024` bytes (2 MB limit strictly enforced).
  - Invalid types or oversized files display clear error messages.
- Upon doctor record creation (`POST /api/v1/doctors`), if a photo file was selected, the upload mutation triggers immediately using the returned `doctorId`.
- Stored `profilePhotoUrl` is persisted in PostgreSQL and rendered properly in both Admin Web directory and Doctor Web profile.

---

## 4. Defect 3 Fix: Dynamic Speciality Catalogue

### 4.1 Catalogue Data Model & Types
**File:** `D:\careid\Admin_web\src\services\doctorService.ts`

Updated `SpecialtyItem` interface:
```typescript
export interface SpecialtyItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
  category?: string;
  sortOrder?: number;
  isDefault?: boolean;
}
```

### 4.2 Expanded Default Catalogue
Updated `DEFAULT_SPECIALTIES` to include missing clinical specialties:
- **Pulmonology** (`spec-10`, code: `PULMONOLOGY`)
- **Rheumatology** (`spec-11`, code: `RHEUMATOLOGY`)
- **Veterinary Medicine** (`spec-12`, code: `VETERINARY_MEDICINE`)

### 4.3 Dynamic Query Hook
Implemented `useSpecialtiesQuery` with cache fallback:
```typescript
export const useSpecialtiesQuery = (includeInactive = false) => {
  return useQuery<SpecialtyItem[]>({
    queryKey: ['specialties', includeInactive],
    queryFn: async () => {
      try {
        const endpoint = includeInactive 
          ? '/api/v1/admin/specialties?includeInactive=true' 
          : '/api/v1/doctors/specialties';
        const res = await apiClient.get<any>(endpoint);
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          return list.map((item: any) => ({
            ...item,
            status: item.status || (item.isActive === false ? 'INACTIVE' : 'ACTIVE'),
            isActive: item.status ? item.status === 'ACTIVE' : (item.isActive ?? true)
          }));
        }
      } catch (err) {
        console.warn('Specialties fetch error, using fallback catalogue:', err);
      }
      return DEFAULT_SPECIALTIES;
    },
    staleTime: 1000 * 60 * 2,
  });
};
```

### 4.4 Admin Catalogue Management Mutations
Added:
- `useAddSpecialtyMutation`: Allows Admin to register new specialities without redeployment.
- `useUpdateSpecialtyMutation`: Updates display name or toggles `status: 'INACTIVE'`.
- `useDeleteSpecialtyMutation`: Safely deactivates/removes specialities.

---

## 5. Build & Validation Results

1. **Admin Web Frontend Build:**
   ```bash
   npm --prefix D:\careid\Admin_web run build
   # Result: tsc -b && vite build -> SUCCESS (built in 2.41s)
   ```
2. **Doctor Web Frontend Build:**
   ```bash
   npm --prefix D:\careid\doctor_web run build
   # Result: tsc -b && vite build -> SUCCESS (built in 13.22s)
   ```
3. **Backend NestJS Build:**
   ```bash
   npm --prefix D:\careid\backend run build
   # Result: nest build -> SUCCESS
   ```
4. **Backend Unit & Coverage Tests:**
   ```bash
   npm --prefix D:\careid\backend run test:cov -- src/modules/auth/tests/password-login.spec.ts
   # Result: 100% test pass rate
   ```
