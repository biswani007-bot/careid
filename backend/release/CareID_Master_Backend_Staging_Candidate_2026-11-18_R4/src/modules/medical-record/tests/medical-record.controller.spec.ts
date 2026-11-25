import { Test, TestingModule } from '@nestjs/testing';
import { MedicalRecordController, AttachmentController } from '../presentation/controllers/medical-record.controller';
import { MedicalRecordService } from '../application/use-cases/medical-record.service';

describe('MedicalRecordController (Workflow B & Direct Record Upload)', () => {
  let controller: MedicalRecordController;
  let attachmentController: AttachmentController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      createRecord: jest.fn(),
      getRecords: jest.fn(),
      getRecordById: jest.fn(),
      uploadRecordWithFile: jest.fn(),
      uploadAttachment: jest.fn(),
      serveAttachmentFile: jest.fn(),
      getPresignedAttachmentUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicalRecordController, AttachmentController],
      providers: [
        {
          provide: MedicalRecordService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MedicalRecordController>(MedicalRecordController);
    attachmentController = module.get<AttachmentController>(AttachmentController);
  });

  describe('uploadRecordDirect (POST /records/upload)', () => {
    it('should delegate to medicalRecordService.uploadRecordWithFile with parsed DTO and file', async () => {
      const mockResult: any = {
        id: 'record-uuid-1',
        title: 'Dental Panoramic X-Ray',
        category: 'DENTAL',
        status: 'FINAL',
        attachments: [
          {
            id: 'att-1',
            fileName: 'panoramic.png',
            category: 'IMAGE',
          },
        ],
      };
      mockService.uploadRecordWithFile.mockResolvedValue(mockResult);

      const req = { user: { userId: 'patient-user-1', roles: ['PATIENT'] } };
      const dto = {
        category: 'DENTAL',
        title: 'Dental Panoramic X-Ray',
        recordType: 'X-Ray',
        notes: 'Routine 6-month checkup',
      };
      const mockFile = {
        originalname: 'panoramic.png',
        buffer: Buffer.from('fake-image-bytes'),
        size: 1024,
        mimetype: 'image/png',
      };

      const result = await controller.uploadRecordDirect(req, dto, mockFile);

      expect(mockService.uploadRecordWithFile).toHaveBeenCalledWith(
        'patient-user-1',
        dto,
        ['PATIENT'],
        mockFile,
      );
      expect(result).toEqual(mockResult);
      expect(result.category).toBe('DENTAL');
      expect(result.attachments).toHaveLength(1);
    });
  });

  describe('AttachmentController (GET /attachments/file/:filename)', () => {
    it('should delegate to service.serveAttachmentFile with secure streaming headers', async () => {
      const req = { user: { userId: 'patient-user-1', roles: ['PATIENT'] } };
      const res = {
        setHeader: jest.fn(),
        on: jest.fn(),
      };

      await attachmentController.serveAttachmentFile(req, 'att-123.pdf', res);

      expect(mockService.serveAttachmentFile).toHaveBeenCalledWith(
        'att-123.pdf',
        'patient-user-1',
        ['PATIENT'],
        res,
      );
    });
  });
});

