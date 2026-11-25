import { Test, TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import { ReferralController } from '../presentation/controllers/referral.controller';
import { ReferralService } from '../application/use-cases/referral.service';
import { IReferralRepository } from '../domain/repositories/referral.repository.interface';
import { Logger } from 'nestjs-pino';

describe('Referral Export Functionality (B2-03: CSV, JSON & PDF Stream)', () => {
  let controller: ReferralController;
  let service: ReferralService;
  let mockRepository: jest.Mocked<IReferralRepository>;

  const mockReferralList = [
    {
      id: 'ref-1111-2222',
      referralNumber: 'REF-2026-001',
      patientId: 'pat-1',
      patientName: 'Jane Doe',
      referringDoctorId: 'doc-1',
      referringDoctorName: 'Dr. Alice Brown',
      receivingDoctorId: 'doc-2',
      receivingDoctorName: 'Dr. Bob White',
      referringFacilityName: 'CareID Community Health',
      receivingFacilityName: 'CareID Heart Center',
      priority: 'URGENT',
      status: 'TRIAGED',
      reasonForReferral: 'Unstable angina evaluation',
      createdAt: new Date('2026-11-15T10:00:00Z'),
    },
    {
      id: 'ref-3333-4444',
      referralNumber: 'REF-2026-002',
      patientId: 'pat-2',
      patientName: 'John Smith',
      referringDoctorId: 'doc-1',
      referringDoctorName: 'Dr. Alice Brown',
      receivingDoctorId: 'doc-3',
      receivingDoctorName: 'Dr. Charlie Davis',
      referringFacilityName: 'CareID Community Health',
      receivingFacilityName: 'CareID Ortho Clinic',
      priority: 'ROUTINE',
      status: 'PENDING',
      reasonForReferral: 'Knee osteoarthritis consult',
      createdAt: new Date('2026-11-18T14:30:00Z'),
    },
  ];

  beforeEach(async () => {
    mockRepository = {
      createReferral: jest.fn(),
      findReferrals: jest.fn().mockResolvedValue({
        data: mockReferralList,
        total: 2,
        page: 1,
        limit: 100,
      }),
      findReferralById: jest.fn(),
      findReferralByNumber: jest.fn(),
      updateReferral: jest.fn(),
      triageReferral: jest.fn(),
      updateReferralStatus: jest.fn(),
      addNote: jest.fn(),
      findNotes: jest.fn(),
      addAttachment: jest.fn(),
      findAttachments: jest.fn(),
      findStatusHistory: jest.fn(),
      softDeleteReferral: jest.fn(),
      getDashboardStats: jest.fn(),
      findPatientProfileIdByUserId: jest.fn(),
      findStaffFacilitiesByUserId: jest.fn(),
      findDoctorProfileByUserId: jest.fn(),
      findDoctorActiveFacilityIds: jest.fn(),
      findPatientSummary: jest.fn(),
      findDoctorSummary: jest.fn(),
      findFacilitySummary: jest.fn(),
      findPatientsSummaries: jest.fn().mockResolvedValue(new Map([
        ['pat-1', { id: 'pat-1', fullName: 'Jane Doe' }],
        ['pat-2', { id: 'pat-2', fullName: 'John Smith' }],
      ])),
      findDoctorsSummaries: jest.fn().mockResolvedValue(new Map([
        ['doc-1', { id: 'doc-1', fullName: 'Dr. Alice Brown' }],
        ['doc-2', { id: 'doc-2', fullName: 'Dr. Bob White' }],
        ['doc-3', { id: 'doc-3', fullName: 'Dr. Charlie Davis' }],
      ])),
    } as unknown as jest.Mocked<IReferralRepository>;

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralController],
      providers: [
        ReferralService,
        {
          provide: 'IReferralRepository',
          useValue: mockRepository,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<ReferralController>(ReferralController);
    service = module.get<ReferralService>(ReferralService);
  });

  describe('1. ReferralService.exportReferrals', () => {
    it('should generate valid standard binary PDF starting with %PDF-1.4 when format=PDF', async () => {
      const res = await service.exportReferrals(
        { userId: 'doc-exporter-1', roles: ['DOCTOR'] },
        'PDF',
      );

      expect(res).toBeDefined();
      expect(res.data).toBeDefined();
      expect(res.data.length).toBe(2);
      expect(res.buffer).toBeInstanceOf(Buffer);

      // Verify PDF 1.4 binary signature
      const pdfHeader = res.buffer!.slice(0, 8).toString('utf-8');
      expect(pdfHeader).toContain('%PDF-1.4');
    });

    it('should include clinical headers and patient information in the generated PDF buffer', async () => {
      const res = await service.exportReferrals(
        { userId: 'doc-exporter-1', roles: ['DOCTOR'] },
        'PDF',
      );

      const pdfContent = res.buffer!.toString('latin1');
      expect(pdfContent).toContain('CAREID CLINICAL REFERRAL REGISTRY');
      expect(pdfContent).toContain('REFERRAL REGISTRY SUMMARY');
      expect(pdfContent).toContain('Jane Doe');
      expect(pdfContent).toContain('John Smith');
    });

    it('should generate formatted CSV text when format=CSV', async () => {
      const res = await service.exportReferrals(
        { userId: 'doc-exporter-1', roles: ['DOCTOR'] },
        'CSV',
      );

      expect(res.csv).toBeDefined();
      expect(res.csv).toContain('ID,Patient ID,Patient Name,Referring Doctor');
      expect(res.csv).toContain('"Jane Doe"');
      expect(res.csv).toContain('"John Smith"');
    });
  });

  describe('2. ReferralController.exportReferrals (HTTP Response Headers & StreamableFile)', () => {
    it('should set Content-Type: application/pdf and return StreamableFile when format=PDF is requested', async () => {
      const mockRes = {
        setHeader: jest.fn(),
      };
      const mockReq = {
        user: { userId: 'doc-exporter-1', roles: ['DOCTOR'] },
        headers: {},
      };

      const result = await controller.exportReferrals(mockReq, mockRes, 'PDF');

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="careid-referrals-export.pdf"',
      );
      expect(result).toBeInstanceOf(StreamableFile);

      // Verify the stream content is valid PDF 1.4 binary data
      const stream = (result as StreamableFile).getStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const fullBuffer = Buffer.concat(chunks);
      expect(fullBuffer.length).toBeGreaterThan(100);

      const header = fullBuffer.slice(0, 8).toString('utf-8');
      expect(header).toContain('%PDF-1.4');

      const content = fullBuffer.toString('latin1');
      expect(content).toContain('CAREID CLINICAL REFERRAL REGISTRY');
      expect(content).toContain('Jane Doe');
      expect(content).toContain('%%EOF');
    });

    it('should set Content-Type: text/csv and return CSV string when format=CSV is requested', async () => {
      const mockRes = {
        setHeader: jest.fn(),
      };
      const mockReq = {
        user: { userId: 'doc-exporter-1', roles: ['DOCTOR'] },
        headers: {},
      };

      const result = await controller.exportReferrals(mockReq, mockRes, 'CSV');

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="careid-referrals-export.csv"',
      );
      expect(typeof result).toBe('string');
      expect(result).toContain('ID,Patient ID,Patient Name');
    });
  });
});
