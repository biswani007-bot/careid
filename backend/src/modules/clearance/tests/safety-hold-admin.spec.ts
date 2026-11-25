import { Test, TestingModule } from '@nestjs/testing';
import { SafetyHoldAdminService } from '../safety-hold-admin.service';
import { DatabaseService } from '@database/database.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('SafetyHoldAdminService (Dynamic Configuration & Reconciliation)', () => {
  let service: SafetyHoldAdminService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      masterDataCategory: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cat-sh-1', code: 'SAFETY_HOLD_CATEGORIES' }),
        create: jest.fn().mockResolvedValue({ id: 'cat-sh-1', code: 'SAFETY_HOLD_CATEGORIES' }),
      },
      masterDataItem: {
        count: jest.fn().mockResolvedValue(9),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'item-1',
            code: 'RADIATION_OR_CONTRAST_HAZARD',
            name: 'Radiation or Contrast Hazard',
            description: 'DAP threshold exceeded',
            sortOrder: 1,
            status: 'ACTIVE',
            clinicalPracticeType: 'ALL',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'item-2',
            code: 'PATIENT_HEMODYNAMIC_INSTABILITY',
            name: 'Patient Hemodynamic Instability',
            description: 'Hypotension/arrhythmia',
            sortOrder: 2,
            status: 'ACTIVE',
            clinicalPracticeType: 'ALL',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({
          id: 'item-1',
          code: 'RADIATION_OR_CONTRAST_HAZARD',
          name: 'Radiation or Contrast Hazard',
          status: 'ACTIVE',
        }),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'new-item-id', ...args.data })),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      systemConfiguration: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation((args) => Promise.resolve(args.create)),
      },
      treatmentOffer: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'to-legacy-1',
            offerNumber: 'TO-LEGACY-001',
            doctorProfileId: 'doc-1',
            patientProfileId: 'pat-1',
            facilityId: 'fac-1',
            clinicalIndication: `Patient indicated for PCI.\n\n--- SAFETY_HOLD_HISTORY ---\n[{"holdId":"hold-rec-1","status":"RESOLVED","holdCategory":"RADIATION_OR_CONTRAST_HAZARD","reason":"Radiation limit reached","declaredBy":"doc-1","declaredAt":"2026-11-20T10:00:00.000Z","resolvedBy":"doc-2","resolvedAt":"2026-11-20T10:30:00.000Z","resolutionNotes":"Cleared after safe delay"}]`,
            procedures: [{ procedureName: 'PCI Angioplasty' }],
          },
        ]),
        update: jest.fn().mockResolvedValue({ id: 'to-legacy-1' }),
      },
      appointment: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: 'appt-1' }),
      },
      doctorProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'doc-1', userId: 'doc-1' }),
      },
      safetyHoldRecord: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'shr-1' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'doc-1' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyHoldAdminService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<SafetyHoldAdminService>(SafetyHoldAdminService);
  });

  describe('Category Management', () => {
    it('should list safety hold categories with pagination default of 10 records', async () => {
      const res = await service.listCategories({ page: 1, limit: 10 });
      expect(res.data).toHaveLength(2);
      expect(res.meta.total).toBe(9);
      expect(res.meta.limit).toBe(10);
      expect(res.data[0].code).toBe('RADIATION_OR_CONTRAST_HAZARD');
    });

    it('should create new safety hold category when unique', async () => {
      mockDb.masterDataItem.findFirst.mockResolvedValueOnce(null);
      const created = await service.createCategory({
        code: 'VASCULAR_PUNCTURE_SITE_HEMATOMA',
        name: 'Vascular Puncture Site Hematoma',
        description: 'Femoral or radial sheath site hematoma',
      }, 'admin-user-1');

      expect(created.code).toBe('VASCULAR_PUNCTURE_SITE_HEMATOMA');
      expect(mockDb.masterDataItem.create).toHaveBeenCalled();
      expect(mockDb.auditLog.create).toHaveBeenCalled();
    });

    it('should reject duplicate category code with ConflictException', async () => {
      mockDb.masterDataItem.findFirst.mockResolvedValueOnce({ id: 'existing-id' });
      await expect(
        service.createCategory({
          code: 'RADIATION_OR_CONTRAST_HAZARD',
          name: 'Radiation Hazard',
        }, 'admin-user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should toggle category active/inactive status', async () => {
      const res = await service.toggleCategoryStatus('item-1', 'INACTIVE', 'admin-1');
      expect(mockDb.masterDataItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { status: 'INACTIVE' },
      });
      expect(res.status).toBe('INACTIVE');
    });
  });

  describe('Clinical Summary Display Configuration', () => {
    it('should return default summary config when not previously stored in DB', async () => {
      const config = await service.getSummaryConfig();
      expect(config.showProcedureCode).toBe(true);
      expect(config.showClinicalIndication).toBe(true);
      expect(config.showSafetyHoldHistory).toBe(true);
      expect(config.customSectionLabels?.treatmentSummary).toBe('Primary Treatment Summary');
    });

    it('should persist updated clinical summary config in system_configurations', async () => {
      const updated = await service.updateSummaryConfig({
        safetyHoldPanelCollapsedByDefault: true,
        showFinancialTerms: false,
      }, 'admin-1');

      expect(updated.safetyHoldPanelCollapsedByDefault).toBe(true);
      expect(updated.showFinancialTerms).toBe(false);
      expect(mockDb.systemConfiguration.upsert).toHaveBeenCalled();
      expect(mockDb.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('Legacy Data Reconciliation Without Data Loss', () => {
    it('should report reconciliation status correctly matching frontend contracts', async () => {
      const status = await service.getReconciliationStatus();
      expect(status.affectedTreatmentOffersCount).toBe(1);
      expect(status.contaminatedOffers).toBe(1);
      expect(status.totalOffers).toBe(1);
      expect(status.cleanOffers).toBe(0);
      expect(status.reconciliationRequired).toBe(true);
      expect(status.status).toBe('RECONCILIATION_AVAILABLE');
    });

    it('should safely parse legacy offers, extract structured holds, and clean treatment_offers table', async () => {
      const result = await service.reconcileLegacyRecords({ dryRun: false }, 'admin-1');

      expect(result.scannedCount).toBe(1);
      expect(result.reconciledCount).toBe(1);
      expect(result.createdHoldsCount).toBe(1);
      expect(result.auditProvenancePreserved).toBe(true);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].action).toBe('RECONCILED');

      // Verify safety hold created
      expect(mockDb.safetyHoldRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            holdId: 'hold-rec-1',
            status: 'RESOLVED',
            holdCategory: 'RADIATION_OR_CONTRAST_HAZARD',
            reason: 'Radiation limit reached',
          }),
        }),
      );

      // Verify treatment offer database record was updated with clean narrative
      expect(mockDb.treatmentOffer.update).toHaveBeenCalledWith({
        where: { id: 'to-legacy-1' },
        data: { clinicalIndication: 'Patient indicated for PCI.' },
      });

      expect(mockDb.auditLog.create).toHaveBeenCalled();
    });

    it('should not update clinicalIndication if legacy JSON is ambiguous or malformed', async () => {
      mockDb.treatmentOffer.findMany.mockResolvedValueOnce([
        {
          id: 'to-corrupted-1',
          offerNumber: 'TO-CORRUPTED-001',
          doctorProfileId: 'doc-1',
          patientProfileId: 'pat-1',
          facilityId: 'fac-1',
          clinicalIndication: `Patient notes.\n\n--- SAFETY_HOLD_HISTORY ---\n{corrupted-not-json-content`,
          procedures: [{ procedureName: 'Angiography' }],
        },
      ]);
      mockDb.treatmentOffer.update.mockClear();

      const result = await service.reconcileLegacyRecords({ dryRun: false }, 'admin-1');

      expect(result.records[0].action).toBe('FLAGGED_AMBIGUOUS_FOR_MANUAL_REVIEW');
      expect(mockDb.treatmentOffer.update).not.toHaveBeenCalled();
    });
  });
});
