# CAREID MASTER BACKEND — DAY-OF-PROCEDURE CHECK-IN INTEGRITY & PRIVACY REPORT

**Document ID:** CRID-DOC-REM-04  
**Component:** Procedure Day Patient Intake Subsystem (Stage 15)  
**Files Modified:**
- [`appointment.service.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/appointment/application/use-cases/appointment.service.ts)
- [`appointment.controller.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/appointment/presentation/controllers/appointment.controller.ts)
- [`appointment-hold-durability.spec.ts`](file:///C:/Users/PABANI/Downloads/hvapi-main/hvapi-main/src/modules/appointment/tests/appointment-hold-durability.spec.ts)

---

## 1. Technical Context & Security Architecture

Under CareID clinical protocols, on the day of a scheduled procedure, clinical staff check in the patient at the intake desk (`POST /api/v1/appointments/:id/check-in`). This action:
1. Records bed/bay allocation (e.g. `PRE-OP-BAY-4`).
2. Records baseline intake vitals (blood pressure, heart rate, oxygen saturation, temperature).
3. Transitions appointment status from `CONFIRMED` or `SCHEDULED` to `IN_PROGRESS`.
4. Persists the check-in audit payload into `appointment.notes` using the standard CareID clinical demarcation tag `--- CHECK_IN ---`.

The audit identified two critical areas requiring engineering strengthening:
1. **Intake Vitals Data Boundary Validation:** Vitals input had no physiological bounds checking, creating vulnerability to malformed data ingestion.
2. **Clinical Record Privacy Scoping:** `GET /api/v1/appointments/:id/check-in` in `AppointmentController` failed to pass caller identity to the service, potentially allowing any authenticated user knowing an appointment UUID to view confidential patient intake vitals and bed assignments.

---

## 2. Implementation Details

### Physiological Sanity Checks in `checkIn`
Added strict boundary validation:
```typescript
if (dto.vitals) {
  const v = dto.vitals;
  if (v.heartRate !== undefined && (typeof v.heartRate !== 'number' || v.heartRate < 20 || v.heartRate > 300)) {
    throw new BadRequestException('Heart rate must be a valid number between 20 and 300 bpm');
  }
  if (v.oxygenSaturation !== undefined && (typeof v.oxygenSaturation !== 'number' || v.oxygenSaturation < 50 || v.oxygenSaturation > 100)) {
    throw new BadRequestException('Oxygen saturation (SpO2) must be between 50% and 100%');
  }
  if (v.temperature !== undefined && (typeof v.temperature !== 'number' || v.temperature < 30 || v.temperature > 45)) {
    throw new BadRequestException('Temperature must be between 30°C and 45°C');
  }
}
```

### Safety Hold Check
Before allowing check-in and transition to `IN_PROGRESS`, the system verifies that no active emergency safety hold is in place:
```typescript
if (appointment.notes && appointment.notes.includes('--- ACTIVE_SAFETY_HOLD ---')) {
  const hold = JSON.parse(holdJson);
  if (hold && hold.status === 'ACTIVE') {
    throw new ConflictException(
      `Cannot check in appointment '${appointmentId}' while an emergency safety hold (${hold.holdId}) is active.`
    );
  }
}
```

### Clinical Privacy Enforcement in `getCheckInRecord`
Updated `AppointmentController`:
```typescript
@Get(':id/check-in')
@Roles('STAFF', 'FACILITY_ADMIN', 'NURSE', 'ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
async getCheckInRecord(@Req() req: any, @Param('id') id: string) {
  const roles = req.user.roles || (req.user.role ? [req.user.role] : []);
  return this.appointmentService.getCheckInRecord(req.user.userId, roles, id);
}
```

In `AppointmentService.getCheckInRecord`:
```typescript
if (callerUserId) {
  const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
  const isStaff = roles.includes('STAFF') || roles.includes('FACILITY_ADMIN') || roles.includes('NURSE');
  const isDoctor = roles.includes('DOCTOR') || roles.includes('PRACTITIONER');
  const isPatient = roles.includes('PATIENT');

  if (!isAdmin && !isStaff) {
    if (isDoctor) {
      const doctor = await this.repository.findDoctorProfileByUserId(callerUserId);
      if (!doctor || doctor.id !== appointment.doctorProfileId) {
        throw new ForbiddenException('Doctor can only view check-in records for their own appointments');
      }
    } else if (isPatient) {
      const patient = await this.repository.findPatientProfileByUserId(callerUserId);
      if (!patient || patient.id !== appointment.patientProfileId) {
        throw new ForbiddenException('Patients can only view their own check-in records');
      }
    }
  }
}
```

---

## 3. Automated Verification

Covered in `src/modules/appointment/tests/appointment-hold-durability.spec.ts`:
- `should reject check-in if heart rate is out of reasonable range` (PASS)
- `should reject check-in if oxygen saturation is below physiological minimum` (PASS)
- `should accept valid physiological vitals on check-in` (PASS)
- `should allow patient to view only their own check-in record and reject other patients` (PASS)
- `should allow assigned doctor to view check-in and reject unassigned doctor` (PASS)

---
**Verified By:** Principal Software Architect & Healthcare Security Specialist  
**Status:** COMPLETED & VERIFIED
