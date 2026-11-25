import * as fs from 'fs';
import * as path from 'path';
import { FinancingRepository } from '../infrastructure/database/financing.repository';

describe('FinancingRepository Persistence Reliability', () => {
  const testDataDir = path.resolve(process.cwd(), 'data');
  const testFilePath = path.resolve(testDataDir, 'financing-applications.json');
  let backupData: string | null = null;

  beforeAll(() => {
    if (fs.existsSync(testFilePath)) {
      backupData = fs.readFileSync(testFilePath, 'utf-8');
    }
  });

  afterAll(() => {
    if (backupData !== null) {
      fs.writeFileSync(testFilePath, backupData, 'utf-8');
    } else if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should persist an application to JSON file and reload it upon new instance instantiation', async () => {
    const repo1 = new FinancingRepository();

    const created = await repo1.createApplication({
      userId: 'test-user-persist-1',
      userEmail: 'user1@careid.test',
      userName: 'Persistence Test User',
      optionId: 'opt-zerocost-care',
      partnerName: 'CareCredit Health',
      requestedAmount: 50000,
      tenureMonths: 12,
      monthlyEstimatedEmi: 4166.67,
      status: 'PENDING',
      treatmentName: 'Orthopedic Consultation',
    });

    expect(created.id).toBeDefined();
    expect(created.applicationNumber).toMatch(/^FIN-\d{4}-\d{5}$/);

    // Verify file exists on disk and is non-empty
    expect(fs.existsSync(testFilePath)).toBe(true);
    const rawContent = fs.readFileSync(testFilePath, 'utf-8');
    const parsed = JSON.parse(rawContent);
    expect(Array.isArray(parsed)).toBe(true);
    const foundInDisk = parsed.find((item: any) => item.id === created.id);
    expect(foundInDisk).toBeDefined();
    expect(foundInDisk.userName).toBe('Persistence Test User');

    // Instantiate a second repository instance to simulate application restart
    const repo2 = new FinancingRepository();
    const fetched = await repo2.findApplicationById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.requestedAmount).toBe(50000);
    expect(fetched?.status).toBe('PENDING');

    // Update status in repo2 and verify atomic write to disk
    const updated = await repo2.updateApplicationStatus(created.id, 'APPROVED', 'Verified by clinical desk');
    expect(updated?.status).toBe('APPROVED');

    // Instantiate a third repository to confirm updated state survives
    const repo3 = new FinancingRepository();
    const reloaded = await repo3.findApplicationById(created.id);
    expect(reloaded?.status).toBe('APPROVED');
    expect(reloaded?.adminNotes).toBe('Verified by clinical desk');
  });

  it('should handle corrupted or empty file gracefully without crashing', () => {
    // Write empty string to file
    fs.writeFileSync(testFilePath, '', 'utf-8');
    expect(() => new FinancingRepository()).not.toThrow();

    // Write malformed JSON to file
    fs.writeFileSync(testFilePath, '{ invalid json', 'utf-8');
    expect(() => new FinancingRepository()).not.toThrow();
  });
});
