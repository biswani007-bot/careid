# CareID Master Backend — Discount Authorization & Pricing Ceiling Final Engineering Report (R3)

**Author:** Principal Backend Architect & Application Security Lead  
**Date:** 2026-11-18  
**Component:** Treatment Offer Module (`src/modules/treatment-offer/`)  
**Status:** FULLY REMEDIATED, TESTED & CERTIFIED  

---

## 1. Problem Statement & Regulatory Context

In healthcare financial workflows, commercial discounts on treatment offers represent significant regulatory, compliance, and fraud risks. The CareID ecosystem must enforce strict multi-tiered governance:
1. **Segregation of Duties:** Attending physicians who formulate treatment plans and earn procedural fees must not self-approve substantial discounts (>15%) on their own offers.
2. **Facility-Scoped Supervisory Governance:** Clinical facility supervisors, practice managers, or staff members must only approve discounts for offers originating within facilities to which they are assigned. Approving discounts for a foreign facility is a severe breach of organizational boundary controls.
3. **Platform-Wide Commercial Ceiling (30%):** Under CareID platform commercial policy, no discount—regardless of requester rank or administrative role—may exceed 30% of the gross estimate.
4. **Comprehensive Audit Trail:** Every approval or rejection event must be permanently logged in the immutable audit history with user ID, role, rationale comments, and timestamps.

---

## 2. Technical Implementation Architecture

### 2.1 Attending Physician Self-Approval Prevention
In `TreatmentOfferService.approveDiscount`:
```typescript
if (isStaff && !isAdmin) {
  // Check if caller is also the attending physician
  const doctor = await this.db.doctorProfile.findUnique({
    where: { userId: callerUserId },
  });
  if (doctor && doctor.id === offer.doctorProfileId) {
    const discountPercent = (offer.discountAmount / offer.grossEstimate) * 100;
    if (discountPercent > 15) {
      throw new ForbiddenException(
        'Attending physician cannot self-approve discounts exceeding 15%. Supervisory staff approval is required.',
      );
    }
  }
}
```

### 2.2 Facility-Scoped Supervisory Authorization
If the caller is approving as facility staff or supervisor, their assignment is validated against PostgreSQL `StaffMember` records:
```typescript
if (isStaff && !isAdmin && offer.facilityId) {
  const staff = await this.db.staffMember.findFirst({
    where: { userId: callerUserId },
  });
  if (staff) {
    const isAssigned =
      staff.primaryFacilityId === offer.facilityId ||
      staff.secondaryFacilityId === offer.facilityId;
    if (!isAssigned) {
      throw new ForbiddenException(
        `Staff member is not authorized to approve discounts for facility '${offer.facilityId}'. Staff is only assigned to primary: '${staff.primaryFacilityId}', secondary: '${staff.secondaryFacilityId}'.`,
      );
    }
  }
}
```

### 2.3 Platform Commercial Policy 30% Ceiling
The 30% maximum discount ceiling is enforced platform-wide across all workflows:
1. **Creation / Update Ceiling:**
```typescript
if (dto.discountPercent !== undefined && dto.discountPercent > 30) {
  throw new BadRequestException('Platform commercial policy prohibits discounts exceeding 30%');
}
```
2. **Approval Verification:**
```typescript
const discountPercent = (offer.discountAmount / offer.grossEstimate) * 100;
if (discountPercent > 30) {
  throw new BadRequestException('Cannot approve discount exceeding the platform commercial ceiling of 30%');
}
```
3. **Public Pricing Rules Contract:**
`GET /api/v1/doctors/treatment-offers/pricing-rules` explicitly returns:
```json
{
  "maxDiscountPercent": 30,
  "requiresSupervisoryApprovalThresholdPercent": 15,
  "standardTaxPercent": 0,
  "currency": "INR"
}
```

### 2.4 Immutable Audit Logging
Upon approval or rejection, `createHistory` writes an immutable record:
```typescript
await this.repo.createHistory(
  offer.id,
  dto.approved ? 'DISCOUNT_APPROVED' : 'DISCOUNT_REJECTED',
  offer.status,
  offer.status,
  callerUserId,
  callerRoles[0] || 'STAFF',
  dto.comments || (dto.approved ? 'Discount approved' : 'Discount rejected'),
  {
    discountAmount: offer.discountAmount,
    discountPercent,
    grossEstimate: offer.grossEstimate,
    netEstimate: offer.netEstimate,
  },
);
```

---

## 3. Test Execution & Evidence

Automated test suite `src/modules/treatment-offer/tests/discount-facility-authorization.spec.ts` passes 100%:

```text
PASS src/modules/treatment-offer/tests/discount-facility-authorization.spec.ts (26.6 s)
  Discount Approval Facility Scoping & RBAC Tests
    approveDiscount Facility Scoping & Role Enforcement
      √ should reject non-staff non-admin users (e.g. PATIENT) (107 ms)
      √ should reject attending physician from self-approving discount >15% (7 ms)
      √ should reject staff supervisor if offer belongs to a facility they are NOT assigned to (6 ms)
      √ should allow staff supervisor if offer facility matches their primary or secondary facility (11 ms)
      √ should allow platform ADMIN to approve discount for any facility (7 ms)
      √ should reject discount exceeding 30% ceiling even for admin (5 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

### Test Scenarios Validated:
1. **Unprivileged Roles (e.g. PATIENT):** Immediately rejected with `403 Forbidden`.
2. **Attending Doctor Self-Approval (>15%):** Doctor profile resolved from user ID matches `offer.doctorProfileId`; 20% discount rejected with `403 Forbidden`.
3. **Cross-Facility Supervisor Intrusion:** Staff assigned to `fac-uptown-1` attempts approval on offer for `fac-downtown-2`; rejected with `403 Forbidden`.
4. **Authorized Facility Supervisor:** Staff assigned to `fac-uptown-1` approves offer for `fac-uptown-1`; approved with status `APPROVED`, discount `20%`, and audit history logged.
5. **Platform Super Admin:** Platform administrator overrides facility boundaries and approves discount for remote facility.
6. **30% Platform Ceiling Violation:** 40% discount rejected with `400 BadRequestException` regardless of administrative role.

---

## 4. Conclusion & Certification

The discount approval and commercial governance subsystem is fully certified. It enforces regulatory segregation of duties, prevents cross-facility unauthorized access, hardens the 30% commercial ceiling, and preserves complete auditability with zero database schema migrations.
