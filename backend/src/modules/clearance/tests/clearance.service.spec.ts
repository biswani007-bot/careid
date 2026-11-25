import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ClearanceService } from '../clearance.service';
import { DatabaseService } from '@database/database.service';

describe('ClearanceService (Dynamic Clinical Clearance & Readiness)', () => {
  let service: ClearanceService;
  let mockDb: any;

  const mockRequirement = {
    id: 'req-lab-1',
    code: 'REQ-LAB-METABOLIC',
    name: 'Pre-Procedure Metabolic & Coagulation Panel',
    description: 'Pre-op coagulation and metabolic verification',
    category: 'LABORATORY',
    clinicalPracticeType: 'ALL',
    requiredEvidenceType: 'LAB_RESULT',
    reviewerRole: 'DOCTOR',
    requiredApprovalsCount: 1,
    requiredSpecialties: [],
    isMandatory: true,
    sortOrder: 4,
    status: 'ACTIVE',
    version: 1,
  };

  const mockSpecRequirement = {
    id: 'req-spec-1',
    code: 'REQ-SPEC-CLEARANCE',
    name: 'Pre-Op Anesthesia & Clinical Clearance',
    description: 'Multidisciplinary specialist evaluation',
    category: 'SPECIALIST_CLEARANCE',
    clinicalPracticeType: 'ALL',
    requiredEvidenceType: 'SPECIALIST_SIGN_OFF',
    reviewerRole: 'DOCTOR',
    requiredApprovalsCount: 3,
    requiredSpecialties: ['ANESTHESIA', 'CARDIOLOGY', 'MEDICAL'],
    isMandatory: true,
    sortOrder: 5,
    status: 'ACTIVE',
    version: 1,
  };

  const mockPolicy = {
    id: 'pol-cath-1',
    policyNumber: 'POL-CLEAR-CATHLAB',
    name: 'Cath Lab Policy',
    facilityId: 'fac-1',
    procedureCode: '93458',
    clinicalPracticeType: 'HUMAN_HEALTHCARE',
    status: 'PUBLISHED',
    version: 1,
    schedulingPrerequisites: ['REQ-LAB-METABOLIC', 'REQ-SPEC-CLEARANCE'],
    items: [
      {
        id: 'item-1',
        policyId: 'pol-cath-1',
        requirementId: 'req-lab-1',
        isMandatory: true,
        sortOrder: 1,
        requiredSpecialties: [],
        requirement: mockRequirement,
      },
      {
        id: 'item-2',
        policyId: 'pol-cath-1',
        requirementId: 'req-spec-1',
        isMandatory: true,
        sortOrder: 2,
        requiredSpecialties: ['ANESTHESIA', 'CARDIOLOGY', 'MEDICAL'],
        requirement: mockSpecRequirement,
      },
    ],
  };

  const mockOffer = {
    id: 'offer-101',
    offerNumber: 'TO-2026-101',
    facilityId: 'fac-1',
    patientProfileId: 'patient-55',
    status: 'RATIFIED_ACCEPTED',
    version: 1,
    procedures: [{ id: 'proc-1', procedureCode: '93458', procedureName: 'Left Heart Cath' }],
    patient: { firstName: 'Alice', lastName: 'Walker' },
    facility: { id: 'fac-1', name: 'Manhattan Heart Center' },
  };

  beforeEach(async () => {
    mockDb = {
      clearanceRequirement: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([mockRequirement]),
        findFirst: jest.fn().mockResolvedValue(mockRequirement),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'req-new', ...args.data })),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
        delete: jest.fn().mockResolvedValue({ id: 'req-lab-1' }),
      },
      clearancePolicy: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([mockPolicy]),
        findFirst: jest.fn().mockResolvedValue(mockPolicy),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'pol-new', ...args.data })),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
        delete: jest.fn().mockResolvedValue({ id: 'pol-cath-1' }),
      },
      clearancePolicyItem: {
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      treatmentOffer: {
        findUnique: jest.fn().mockResolvedValue(mockOffer),
      },
      treatmentOfferClearanceRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: 'tocr-1',
            ...args.data,
            decisions: [],
            policy: mockPolicy,
          })
        ),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      clearanceDecisionItem: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'cdi-new', ...args.data })),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      laboratoryReport: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      treatmentOfferHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
      procedureCatalogue: {
        findUnique: jest.fn().mockResolvedValue({ id: 'proc-cat-1', code: '93458' }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockDb)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClearanceService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<ClearanceService>(ClearanceService);
  });

  describe('Catalogue & Policy Management', () => {
    it('should list requirements with pagination and filtering', async () => {
      const res = await service.listRequirements({ page: 1, limit: 10, category: 'LABORATORY' });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
      expect(mockDb.clearanceRequirement.findMany).toHaveBeenCalled();
    });

    it('should prevent creating a requirement with a duplicate code', async () => {
      mockDb.clearanceRequirement.findUnique.mockResolvedValueOnce(mockRequirement);
      await expect(
        service.createRequirement({ code: 'REQ-LAB-METABOLIC', name: 'Duplicate' })
      ).rejects.toThrow(ConflictException);
    });

    it('should resolve facility-specific clearance policy over default policy', async () => {
      const resolved = await service.resolveApplicablePolicy('fac-1', '93458');
      expect(resolved).toBeDefined();
      expect(resolved?.policyNumber).toBe('POL-CLEAR-CATHLAB');
    });
  });

  describe('Dynamic Checklist & Evidence Enforcement', () => {
    it('should render dynamic checklist with authoritative count from policy (2 gates)', async () => {
      const res = await service.getOfferClearance('doc-1', 'offer-101', ['DOCTOR']);
      expect(res.treatmentOfferId).toBe('offer-101');
      expect(res.totalGatesCount).toBe(2);
      expect(res.requirements).toHaveLength(2);
      expect(res.requirements[0].code).toBe('REQ-LAB-METABOLIC');
      expect(res.requirements[1].code).toBe('REQ-SPEC-CLEARANCE');
      expect(res.overallStatus).toBe('PENDING');
    });

    it('should reject lab clearance when required evidence is missing on file', async () => {
      mockDb.treatmentOfferClearanceRecord.findUnique.mockResolvedValue({
        id: 'tocr-1',
        treatmentOfferId: 'offer-101',
        patientProfileId: 'patient-55',
        facilityId: 'fac-1',
        decisions: [],
        policy: mockPolicy,
      });
      mockDb.laboratoryReport.count.mockResolvedValue(0);
      mockDb.laboratoryReport.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOfferClearance(
          'doc-1',
          'offer-101',
          { labClearance: 'CLEARED' },
          ['DOCTOR']
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow lab clearance when lab evidence is verified on file', async () => {
      mockDb.laboratoryReport.count.mockResolvedValue(1);
      mockDb.laboratoryReport.findFirst.mockResolvedValue({ id: 'lab-rep-1' });

      // After clearance update, mock record with cleared lab decision
      mockDb.treatmentOfferClearanceRecord.findUnique.mockResolvedValue({
        id: 'tocr-1',
        treatmentOfferId: 'offer-101',
        patientProfileId: 'patient-55',
        facilityId: 'fac-1',
        decisions: [
          {
            id: 'cdi-1',
            requirementId: 'req-lab-1',
            requirementCode: 'REQ-LAB-METABOLIC',
            status: 'CLEARED',
            specialty: null,
            reviewerId: 'doc-1',
            clinicalRemarks: 'Coags normal',
          },
        ],
        policy: mockPolicy,
      });

      const res = await service.updateOfferClearance(
        'doc-1',
        'offer-101',
        { labClearance: { status: 'CLEARED', notes: 'Coagulation labs verified: INR 1.05, PT 12s' } },
        ['DOCTOR']
      );

      expect(res).toBeDefined();
      expect(mockDb.clearanceDecisionItem.create).toHaveBeenCalled();
    });
  });

  describe('Multi-Specialty Independent Decisions', () => {
    it('should keep aggregate requirement status incomplete when only Anesthesia is cleared and Cardiology is pending', async () => {
      // Simulate state where only Anesthesia is cleared
      mockDb.treatmentOfferClearanceRecord.findUnique.mockResolvedValue({
        id: 'tocr-1',
        treatmentOfferId: 'offer-101',
        patientProfileId: 'patient-55',
        facilityId: 'fac-1',
        decisions: [
          {
            id: 'cdi-anes',
            requirementId: 'req-spec-1',
            requirementCode: 'REQ-SPEC-CLEARANCE',
            specialty: 'ANESTHESIA',
            status: 'CLEARED',
            reviewerId: 'doc-anes',
          },
          {
            id: 'cdi-card',
            requirementId: 'req-spec-1',
            requirementCode: 'REQ-SPEC-CLEARANCE',
            specialty: 'CARDIOLOGY',
            status: 'PENDING',
          },
          {
            id: 'cdi-med',
            requirementId: 'req-spec-1',
            requirementCode: 'REQ-SPEC-CLEARANCE',
            specialty: 'MEDICAL',
            status: 'PENDING',
          },
        ],
        policy: mockPolicy,
      });

      const res = await service.getOfferClearance('doc-1', 'offer-101', ['DOCTOR']);
      const specReq = res.requirements.find((r) => r.code === 'REQ-SPEC-CLEARANCE');
      expect(specReq).toBeDefined();
      expect(specReq?.status).toBe('PARTIALLY_CLEARED');
      expect(specReq?.unmetReason).toContain('Pending specialist reviews: CARDIOLOGY, MEDICAL');
    });

    it('should mark aggregate requirement CLEARED when all required specialties are cleared', async () => {
      mockDb.treatmentOfferClearanceRecord.findUnique.mockResolvedValue({
        id: 'tocr-1',
        treatmentOfferId: 'offer-101',
        patientProfileId: 'patient-55',
        facilityId: 'fac-1',
        decisions: [
          {
            id: 'cdi-anes',
            requirementId: 'req-spec-1',
            requirementCode: 'REQ-SPEC-CLEARANCE',
            specialty: 'ANESTHESIA',
            status: 'CLEARED',
            reviewerId: 'doc-anes',
          },
          {
            id: 'cdi-card',
            requirementId: 'req-spec-1',
            requirementCode: 'REQ-SPEC-CLEARANCE',
            specialty: 'CARDIOLOGY',
            status: 'CLEARED',
            reviewerId: 'doc-card',
          },
          {
            id: 'cdi-med',
            requirementId: 'req-spec-1',
            requirementCode: 'REQ-SPEC-CLEARANCE',
            specialty: 'MEDICAL',
            status: 'CLEARED',
            reviewerId: 'doc-med',
          },
        ],
        policy: mockPolicy,
      });

      const res = await service.getOfferClearance('doc-1', 'offer-101', ['DOCTOR']);
      const specReq = res.requirements.find((r) => r.code === 'REQ-SPEC-CLEARANCE');
      expect(specReq?.status).toBe('CLEARED');
    });
  });

  describe('Authorization and Booking Enforcement', () => {
    it('should reject clearance submission from unauthorized role (e.g. PATIENT)', async () => {
      await expect(
        service.updateOfferClearance(
          'patient-user',
          'offer-101',
          { labClearance: 'CLEARED' },
          ['PATIENT']
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject booking when prerequisites are incomplete', async () => {
      // Mock incomplete clearance
      mockDb.treatmentOfferClearanceRecord.findUnique.mockResolvedValue({
        id: 'tocr-1',
        treatmentOfferId: 'offer-101',
        patientProfileId: 'patient-55',
        facilityId: 'fac-1',
        decisions: [
          {
            requirementId: 'req-lab-1',
            requirementCode: 'REQ-LAB-METABOLIC',
            status: 'PENDING',
          },
        ],
        policy: mockPolicy,
      });

      await expect(
        service.validateOfferReadinessForBooking('offer-101')
      ).rejects.toThrow(BadRequestException);
    });

    it('should support clearing dynamic requirement directly by code without legacy spread', async () => {
      mockDb.treatmentOfferClearanceRecord.findUnique.mockResolvedValue({
        id: 'tocr-1',
        treatmentOfferId: 'offer-101',
        patientProfileId: 'patient-55',
        facilityId: 'fac-1',
        decisions: [],
        policy: mockPolicy,
      });

      mockDb.clearanceRequirement.findFirst.mockResolvedValue({
        id: 'req-surg-1',
        code: 'REQ-SURGICAL-PREP',
        name: 'Surgical Site Marking',
        requiredEvidenceType: 'NONE',
        reviewerRole: 'DOCTOR',
        requiredSpecialties: [],
      });

      const res = await service.updateOfferClearance(
        'doc-1',
        'offer-101',
        {
          requirementCode: 'REQ-SURG-READY',
          status: 'CLEARED',
          clinicalRemarks: 'Surgical site verified and marked',
        },
        ['DOCTOR']
      );

      expect(res).toBeDefined();
    });

    it('should keep agreement requirement PENDING when offer is in DRAFT status', async () => {
      const draftOffer = { ...mockOffer, status: 'DRAFT' };
      mockDb.treatmentOffer.findUnique.mockResolvedValue(draftOffer);

      const policyWithAgreement = {
        ...mockPolicy,
        items: [
          {
            id: 'item-agree',
            policyId: 'pol-cath-1',
            requirementId: 'req-agree',
            isMandatory: true,
            sortOrder: 1,
            requiredSpecialties: [],
            requirement: {
              id: 'req-agree',
              code: 'REQ-OFFER-AGREEMENT',
              name: 'Treatment Offer & Financing Agreement',
              category: 'ADMINISTRATIVE',
              requiredEvidenceType: 'DOCUMENT',
              reviewerRole: 'ANY_CLINICIAN',
              requiredSpecialties: [],
            },
          },
        ],
      };
      mockDb.clearancePolicy.findFirst.mockResolvedValue(policyWithAgreement);

      const res = await service.getOfferClearance('doc-1', 'offer-101', ['DOCTOR']);
      const agreeReq = res.requirements.find((r) => r.code === 'REQ-OFFER-AGREEMENT');
      expect(agreeReq?.status).toBe('PENDING');
      expect(agreeReq?.unmetReason).toContain('Patient acceptance required');
    });
  });
});
