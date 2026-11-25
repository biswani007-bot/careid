import { Test, TestingModule } from '@nestjs/testing';
import { AntivirusScannerService } from '../infrastructure/antivirus-scanner.service';
import { DatabaseService } from '@database/database.service';

describe('AntivirusScannerService', () => {
  let service: AntivirusScannerService;
  let db: any;

  beforeEach(async () => {
    db = {
      medicalAttachment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      medicalRecordAuditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntivirusScannerService,
        {
          provide: DatabaseService,
          useValue: db,
        },
      ],
    }).compile();

    service = module.get<AntivirusScannerService>(AntivirusScannerService);
  });

  it('should scan clean PDF file and transition status to CLEAN when ClamAV daemon is available', async () => {
    jest.spyOn(service as any, 'checkClamAvDaemon').mockResolvedValue(true);
    const mockAtt = {
      id: 'att-1',
      fileName: 'lab_results.pdf',
      originalName: 'lab_results.pdf',
      virusScanStatus: 'PENDING',
      medicalRecordId: 'rec-1',
    };
    db.medicalAttachment.findUnique.mockResolvedValue(mockAtt);
    db.medicalAttachment.update.mockResolvedValue({ ...mockAtt, virusScanStatus: 'CLEAN' });

    const result = await service.scanAttachment('att-1');

    expect(result.status).toBe('CLEAN');
    expect(db.medicalAttachment.update).toHaveBeenCalledWith({
      where: { id: 'att-1' },
      data: { virusScanStatus: 'CLEAN' },
    });
    expect(db.medicalRecordAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ATTACHMENT_VIRUS_SCAN_CLEAN',
          attachmentId: 'att-1',
        }),
      }),
    );
  });

  it('should FAIL CLOSED and return SCAN_FAILED when ClamAV daemon is unreachable and bypass is disabled', async () => {
    jest.spyOn(service as any, 'checkClamAvDaemon').mockResolvedValue(false);
    delete process.env.ALLOW_MOCK_VIRUS_SCAN;

    const mockAtt = {
      id: 'att-safe-unscanned',
      fileName: 'doctor_notes.pdf',
      originalName: 'doctor_notes.pdf',
      virusScanStatus: 'PENDING',
      medicalRecordId: 'rec-1',
    };
    db.medicalAttachment.findUnique.mockResolvedValue(mockAtt);
    db.medicalAttachment.update.mockResolvedValue({ ...mockAtt, virusScanStatus: 'SCAN_FAILED' });

    const result = await service.scanAttachment('att-safe-unscanned');

    expect(result.status).toBe('SCAN_FAILED');
    expect(db.medicalAttachment.update).toHaveBeenCalledWith({
      where: { id: 'att-safe-unscanned' },
      data: { virusScanStatus: 'SCAN_FAILED' },
    });
    expect(db.medicalRecordAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ATTACHMENT_VIRUS_SCAN_FAILED',
          attachmentId: 'att-safe-unscanned',
        }),
      }),
    );
  });

  it('should detect dangerous executable file and transition status to INFECTED', async () => {
    const mockAtt = {
      id: 'att-malware',
      fileName: 'trojan_payload.exe',
      originalName: 'trojan_payload.exe',
      virusScanStatus: 'PENDING',
      medicalRecordId: 'rec-1',
    };
    db.medicalAttachment.findUnique.mockResolvedValue(mockAtt);
    db.medicalAttachment.update.mockResolvedValue({ ...mockAtt, virusScanStatus: 'INFECTED' });

    const result = await service.scanAttachment('att-malware');

    expect(result.status).toBe('INFECTED');
    expect(db.medicalAttachment.update).toHaveBeenCalledWith({
      where: { id: 'att-malware' },
      data: { virusScanStatus: 'INFECTED' },
    });
    expect(db.medicalRecordAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ATTACHMENT_VIRUS_SCAN_INFECTED',
        }),
      }),
    );
  });

  it('should detect EICAR virus test string in filename and flag INFECTED', async () => {
    const mockAtt = {
      id: 'att-eicar',
      fileName: 'eicar-test-file.txt',
      originalName: 'eicar-test-file.txt',
      virusScanStatus: 'PENDING',
      medicalRecordId: null,
    };
    db.medicalAttachment.findUnique.mockResolvedValue(mockAtt);
    db.medicalAttachment.update.mockResolvedValue({ ...mockAtt, virusScanStatus: 'INFECTED' });

    const result = await service.scanAttachment('att-eicar');

    expect(result.status).toBe('INFECTED');
  });

  it('should process batch of pending attachments', async () => {
    jest.spyOn(service as any, 'checkClamAvDaemon').mockResolvedValue(true);
    db.medicalAttachment.findMany.mockResolvedValue([
      { id: 'att-1', fileName: 'scan1.pdf', virusScanStatus: 'PENDING' },
      { id: 'att-2', fileName: 'scan2.jpg', virusScanStatus: 'PENDING' },
    ]);
    db.medicalAttachment.findUnique
      .mockResolvedValueOnce({ id: 'att-1', fileName: 'scan1.pdf', virusScanStatus: 'PENDING' })
      .mockResolvedValueOnce({ id: 'att-2', fileName: 'scan2.jpg', virusScanStatus: 'PENDING' });

    const result = await service.scanPendingBatch(10);

    expect(result.scanned).toBe(2);
    expect(result.clean).toBe(2);
    expect(result.infected).toBe(0);
  });
});

