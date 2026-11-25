import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { FinancingCryptoService } from '../src/modules/financing/infrastructure/security/financing-crypto.service';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const cryptoService = new FinancingCryptoService();

async function exportToJson() {
  console.log('========================================================================');
  console.log('CAREID FINANCING APPLICATIONS: SAFE POSTGRESQL-TO-JSON EXPORT');
  console.log('========================================================================\n');

  const targetPath = path.resolve(process.cwd(), 'data', 'financing-applications.json');

  // 1. Fetch all applications from PostgreSQL
  const records = await prisma.financingApplication.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { email: true } },
      patientProfile: { select: { firstName: true, lastName: true } },
    },
  });

  console.log(`[EXPORT] Fetched ${records.length} records from PostgreSQL.`);

  // 2. Map and decrypt fields into standard JSON representation
  const formatted = records.map((r) => {
    let decryptedPan: string | null = null;
    if (r.panOrNationalId) {
      if (cryptoService.isCiphertext(r.panOrNationalId)) {
        decryptedPan = cryptoService.decrypt(r.panOrNationalId, `${r.id}:panOrNationalId`);
      } else {
        decryptedPan = r.panOrNationalId;
      }
    }

    let decryptedIncome: number | null = null;
    if (r.monthlyIncomeEncrypted) {
      if (cryptoService.isCiphertext(r.monthlyIncomeEncrypted)) {
        const valStr = cryptoService.decrypt(r.monthlyIncomeEncrypted, `${r.id}:monthlyIncome`);
        decryptedIncome = parseFloat(valStr);
      } else {
        decryptedIncome = parseFloat(r.monthlyIncomeEncrypted);
      }
    }

    const userName = r.patientProfile
      ? `${r.patientProfile.firstName || ''} ${r.patientProfile.lastName || ''}`.trim() || undefined
      : undefined;

    return {
      userId: r.userId,
      userEmail: r.user?.email || undefined,
      userName,
      optionId: r.optionId,
      partnerName: r.partnerName,
      facilityId: r.facilityId || null,
      treatmentName: r.treatmentName || null,
      requestedAmount: Number(r.requestedAmount),
      tenureMonths: r.tenureMonths,
      monthlyEstimatedEmi: Number(r.monthlyEstimatedEmi),
      monthlyIncome: decryptedIncome,
      employmentType: r.employmentType || null,
      panOrNationalId: decryptedPan,
      notes: r.notes || null,
      status: r.status,
      adminNotes: r.adminNotes || null,
      id: r.id,
      applicationNumber: r.applicationNumber,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  // 3. Preserve a timestamped JSON archive
  if (fs.existsSync(targetPath)) {
    const backupDir = path.dirname(targetPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(backupDir, `financing-applications.archive-${timestamp}.json`);
    fs.copyFileSync(targetPath, archivePath);
    console.log(`[ARCHIVE] Saved timestamped archive: ${archivePath}`);
  }

  // 4. Atomic write via temporary file
  const tempPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(formatted, null, 2), 'utf-8');
  fs.renameSync(tempPath, targetPath);

  console.log(`[ATOMIC WRITE] Successfully updated ${targetPath} with ${formatted.length} records.`);

  // 5. Verify written file
  const reloaded = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
  if (!Array.isArray(reloaded) || reloaded.length !== records.length) {
    throw new Error(`Export reconciliation error: Expected ${records.length} records, found ${reloaded?.length}`);
  }

  console.log('\n✔ Safe PostgreSQL-to-JSON export verified successfully!');
}

exportToJson()
  .catch((err) => {
    console.error('Export Error:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

