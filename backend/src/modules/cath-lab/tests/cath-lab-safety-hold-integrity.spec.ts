import { Test, TestingModule } from '@nestjs/testing';
import { CathLabService } from '../cath-lab.service';
import { DatabaseService } from '@database/database.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SafetyHoldCategory } from '../cath-lab.dto';

describe('CathLabService - Safety Hold Integrity & Clinical Data Separation (CAREID-020)', () => {
  let service: CathLabService;
  let mockDb: any;

  beforeEach(async () => {
    (CathLabService as any).activeSafetyHolds?.clear();
    mockDb = {
      appointment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'appt-100',
          appointmentNumber: 'APT-100',
          patientProfileId: 'patient-100',
          facilityId: 'facility-100',
          notes: 'Standard pre-procedural consultation note for elective angioplasty.',
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((args) => Promise.resolve(args.data)),
      },
      safetyHoldRecord: {
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'shr-new', ...args.data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CathLabService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<CathLabService>(CathLabService);
  });

  it('should declare a safety hold without injecting raw JSON into appointment notes', async () => {
    const hold = await service.declareSafetyHold(
      'doctor-user-1',
      ['DOCTOR'],
      {
        appointmentId: 'appt-100',
        holdCategory: SafetyHoldCategory.RADIATION_OR_CONTRAST_HAZARD,
        reason: 'Patient received 180ml iodinated contrast; protocol limit is 150ml.',
        clinicalNotes: 'Initiate saline hydration at 100ml/hr.',
      },
    );

    expect(hold).toBeDefined();
    expect(hold.status).toBe('ACTIVE');
    expect(hold.holdCategory).toBe('RADIATION_OR_CONTRAST_HAZARD');
    expect(hold.categoryLabel).toBe('Radiation or Contrast Hazard');

    // Authoritative persistence must be called on structured model
    expect(mockDb.safetyHoldRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          appointmentId: 'appt-100',
          holdCategory: 'RADIATION_OR_CONTRAST_HAZARD',
          status: 'ACTIVE',
        }),
      }),
    );

    // Appointment notes update must NOT contain JSON strings or markers
    const updateCalls = mockDb.appointment.update.mock.calls;
    if (updateCalls.length > 0) {
      const updatedNotes = updateCalls[0][0].data.notes;
      expect(updatedNotes).not.toContain('--- ACTIVE_SAFETY_HOLD ---');
      expect(updatedNotes).not.toContain('--- SAFETY_HOLD_HISTORY ---');
      expect(updatedNotes).not.toContain('{');
    }
  });

  it('should clear an active safety hold and record structured resolution without contaminating notes', async () => {
    const hold = await service.declareSafetyHold(
      'doctor-user-1',
      ['DOCTOR'],
      {
        appointmentId: 'appt-100',
        holdCategory: SafetyHoldCategory.PATIENT_HEMODYNAMIC_INSTABILITY,
        reason: 'Hypotension post-induction',
      },
    );

    const cleared = await service.clearSafetyHold(
      'doctor-user-2',
      hold.holdId,
      {
        resolutionNotes: 'IV bolus delivered; BP normalized to 125/80 mmHg.',
      },
    );

    expect(cleared.status).toBe('RESOLVED');
    expect(cleared.resolvedBy).toBe('doctor-user-2');
    expect(cleared.resolutionNotes).toBe('IV bolus delivered; BP normalized to 125/80 mmHg.');

    // Database record updated
    expect(mockDb.safetyHoldRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { holdId: hold.holdId },
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolvedBy: 'doctor-user-2',
        }),
      }),
    );

    // Verify hold is no longer active
    const activeCheck = await service.getActiveSafetyHold('appt-100');
    expect(activeCheck.hasActiveHold).toBe(false);
  });

  it('should retrieve structured safety hold history cleanly', async () => {
    mockDb.safetyHoldRecord.findMany.mockResolvedValueOnce([
      {
        id: 'shr-1',
        holdId: 'hold-1',
        appointmentId: 'appt-100',
        treatmentOfferId: null,
        patientProfileId: 'patient-100',
        facilityId: 'facility-100',
        status: 'RESOLVED',
        holdCategory: 'STERILITY_BREACH',
        reason: 'Catheter packaging tear identified before sterile field transfer',
        clinicalNotes: null,
        declaredBy: 'nurse-1',
        declaredAt: new Date('2026-11-21T09:00:00.000Z'),
        resolvedBy: 'doctor-1',
        resolvedAt: new Date('2026-11-21T09:05:00.000Z'),
        resolutionNotes: 'New sterile catheter pack inspected and opened',
        durationSeconds: 300,
      },
    ]);

    const history = await service.getSafetyHoldHistory('appt-100');
    expect(history).toHaveLength(1);
    expect(history[0].categoryLabel).toBe('Sterility Breach or Contamination');
    expect(history[0].status).toBe('RESOLVED');
    expect(history[0].durationSeconds).toBe(300);
  });
});
