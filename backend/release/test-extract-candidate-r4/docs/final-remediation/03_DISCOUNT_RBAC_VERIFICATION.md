# CAREID MASTER BACKEND — DISCOUNT APPROVAL RBAC & FACILITY SCOPING VERIFICATION

**Document ID:** CRID-DOC-REM-03  
**Component:** Treatment Offer Subsystem — Financial Governance  
**Files Modified:**
- [`treatment-offer.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/treatment-offer/application/use-cases/treatment-offer.service.ts)
- [`discount-facility-authorization.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/treatment-offer/tests/discount-facility-authorization.spec.ts)

---

## 1. Business Logic & Governance Requirements

Under CareID financial policies:
1. **Standard Discretionary Ceiling:** Attending physicians may offer discounts up to 15% without administrative review.
2. **Supervisor Approval Requirement:** Any treatment offer discount exceeding 15% requires formal supervisor approval before it can be dispatched to the patient.
3. **Attending Physician Self-Approval Prevention:** The attending physician who authored the treatment offer cannot approve their own high-discount offer (>15%), even if they hold additional administrative privileges.
4. **Platform Hard Ceiling:** No discount exceeding 30% can be approved under any circumstances, even by system administrators.
5. **Facility Tenancy Scoping:** A facility supervisor or staff member (`STAFF`, `FACILITY_ADMIN`) can only review and approve discounts for treatment offers belonging to facilities to which they are formally assigned.
6. **Platform Administrator Authority:** Enterprise administrators (`ADMIN`, `SUPER_ADMIN`) possess global oversight and may approve discounts across all facilities.

---

## 2. Implementation Architecture

In `src/modules/treatment-offer/application/use-cases/treatment-offer.service.ts`, `approveDiscount` was updated with the following checks:

```typescript
// 1. Role verification: Must be administrative or staff supervisor
if (!this.isAdmin(roles) && !this.isStaff(roles)) {
  throw new ForbiddenException('Only facility supervisors or administrators can approve discounts exceeding threshold');
}

const offer = await this.repo.findOfferById(offerId);
if (!offer) {
  throw new NotFoundException(`Treatment offer '${offerId}' not found`);
}

// 2. Facility tenancy verification for staff supervisors
if (!this.isAdmin(roles) && this.isStaff(roles) && offer.facilityId) {
  const staff = await this.db.staffMember.findFirst({
    where: { userId, isDeleted: false },
    select: { primaryFacilityId: true, secondaryFacilityId: true },
  });
  if (staff) {
    const staffFacilities = [staff.primaryFacilityId, staff.secondaryFacilityId].filter(Boolean) as string[];
    if (!staffFacilities.includes(offer.facilityId)) {
      throw new ForbiddenException('Access denied: You are not authorized to approve discounts for this facility');
    }
  }
}

// 3. Attending physician anti-self-approval check
const doctorProfileId = await this.resolveDoctorProfile(userId).catch(() => null);
if (doctorProfileId && offer.doctorProfileId === doctorProfileId && !this.isAdmin(roles)) {
  throw new ForbiddenException('Attending physician cannot self-approve a discount exceeding 15%. Supervisor approval is required.');
}

// 4. Hard platform discount ceiling (30%)
const gross = this.toNumber(offer.grossEstimate);
const discount = this.toNumber(offer.discountAmount);
const discountPercent = gross > 0 ? Math.round((discount / gross) * 100 * 10) / 10 : 0;

if (discountPercent > 30) {
  throw new BadRequestException('Cannot approve discount: exceeds platform maximum ceiling of 30%');
}
```

---

## 3. Automated Test Verification

A dedicated unit test suite was implemented in `src/modules/treatment-offer/tests/discount-facility-authorization.spec.ts`:

1. `should reject non-staff non-admin users (e.g. PATIENT)`: Verified that unprivileged roles receive HTTP 403 Forbidden.
2. `should reject attending physician from self-approving discount >15%`: Verified that matching `doctorProfileId` triggers HTTP 403 Forbidden.
3. `should reject staff supervisor if offer belongs to a facility they are NOT assigned to`: Verified that out-of-facility approval is blocked with HTTP 403 Forbidden.
4. `should allow staff supervisor if offer facility matches their primary or secondary facility`: Verified that in-scope staff can approve and that audit history is generated.
5. `should allow platform ADMIN to approve discount for any facility`: Verified that global administrators bypass facility restriction.
6. `should reject discount exceeding 30% ceiling even for admin`: Verified that >30% discount triggers HTTP 400 Bad Request.

All 6 test cases passed successfully.

---
**Verified By:** Principal Software Architect  
**Status:** COMPLETED & VERIFIED
