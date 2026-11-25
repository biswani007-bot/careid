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

async function backfill() {
  console.log('========================================================================');
  console.log('CAREID FINANCING APPLICATIONS: SECURE POSTGRESQL BACKFILL');
  console.log('========================================================================\n');

  const jsonPath = path.resolve(process.cwd(), 'data', 'financing-applications.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Critical Error: Source file not found: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const records = JSON.parse(raw);

  if (!Array.isArray(records) || records.length !== 11) {
    throw new Error(`Expected exactly 11 records in source JSON, found ${records?.length}`);
  }

  console.log(`[PRE-FLIGHT] Source JSON contains ${records.length} records.`);

  let importedCount = 0;
  let highestSeqNumber = 0;

  for (const item of records) {
    if (!item.id || !item.applicationNumber || !item.userId || !item.requestedAmount) {
      throw new Error(`Malformed historical record: ${JSON.stringify(item)}`);
    }

    // Extract sequence number for sequence synchronization
    const match = item.applicationNumber.match(/^FIN-\d{4}-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highestSeqNumber) {
        highestSeqNumber = num;
      }
    }

    // Resolve patient profile relation from userId if not explicitly set
    let patientProfileId = item.patientProfileId || null;
    if (!patientProfileId && item.userId) {
      const patient = await prisma.patientProfile.findUnique({
        where: { userId: item.userId },
        select: { id: true },
      });
      if (patient) {
        patientProfileId = patient.id;
      }
    }

    // Encrypt sensitive fields using AES-256-GCM with context AAD
    let encryptedPan: string | null = null;
    if (item.panOrNationalId) {
      const aad = `${item.id}:panOrNationalId`;
      encryptedPan = cryptoService.encrypt(String(item.panOrNationalId), aad);

      // In-memory round-trip verification without printing sensitive value
      const decrypted = cryptoService.decrypt(encryptedPan, aad);
      if (decrypted !== String(item.panOrNationalId)) {
        throw new Error(`Integrity check failed during encryption round-trip for record ${item.id}`);
      }
    }

    let encryptedIncome: string | null = null;
    if (item.monthlyIncome !== null && item.monthlyIncome !== undefined) {
      const aad = `${item.id}:monthlyIncome`;
      encryptedIncome = cryptoService.encrypt(String(item.monthlyIncome), aad);

      // In-memory round-trip verification without printing sensitive value
      const decrypted = cryptoService.decrypt(encryptedIncome, aad);
      if (decrypted !== String(item.monthlyIncome)) {
        throw new Error(`Integrity check failed during income encryption round-trip for record ${item.id}`);
      }
    }

    // Idempotent upsert into PostgreSQL
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "financing_applications" (
        "id", "application_number", "user_id", "patient_profile_id", "facility_id",
        "treatment_offer_id", "financing_offer_id", "option_id", "partner_name",
        "treatment_name", "requested_amount", "tenure_months", "monthly_estimated_emi",
        "monthly_income_encrypted", "employment_type", "pan_or_national_id", "notes",
        "status", "admin_notes", "version", "submitted_at", "created_at", "updated_at"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18::"FinancingApplicationStatus", $19, 1, $20, $20, $21
      )
      ON CONFLICT ("id") DO UPDATE SET
        "application_number" = EXCLUDED."application_number",
        "status" = EXCLUDED."status",
        "admin_notes" = EXCLUDED."admin_notes",
        "updated_at" = EXCLUDED."updated_at";
      `,
      item.id,
      item.applicationNumber,
      item.userId,
      patientProfileId,
      item.facilityId || null,
      null, // treatment_offer_id
      null, // financing_offer_id
      item.optionId,
      item.partnerName,
      item.treatmentName || null,
      item.requestedAmount,
      item.tenureMonths,
      item.monthlyEstimatedEmi,
      encryptedIncome,
      item.employmentType || null,
      encryptedPan,
      item.notes || null,
      item.status,
      item.adminNotes || null,
      new Date(item.createdAt),
      new Date(item.updatedAt)
    );

    // Initial audit log entry
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "financing_application_history" (
        "id", "application_id", "previous_status", "new_status", "action",
        "performed_by", "performer_role", "notes", "created_at"
      ) VALUES (
        gen_random_uuid(), $1, NULL, $2::"FinancingApplicationStatus", 'MIGRATED_FROM_JSON',
        $3, 'SYSTEM', 'Historical application imported from JSON store', $4
      )
      ON CONFLICT DO NOTHING;
      `,
      item.id,
      item.status,
      item.userId,
      new Date(item.createdAt)
    );

    importedCount++;
  }

  // Synchronize PostgreSQL atomic sequence to start past highest valid existing number
  const nextSeq = highestSeqNumber + 1;
  await prisma.$executeRawUnsafe(`SELECT setval('financing_application_seq', $1, false);`, nextSeq);

  console.log(`[SUCCESS] Imported ${importedCount} historical records.`);
  console.log(`[SUCCESS] Sequence 'financing_application_seq' synchronized to next value: ${nextSeq}.`);

  // Verification: Count rows in table
  const countResult: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "financing_applications";`);
  const finalCount = countResult[0]?.count || 0;
  console.log(`[VERIFY] Total records in PostgreSQL 'financing_applications': ${finalCount}`);

  if (finalCount !== 11) {
    throw new Error(`Verification mismatch: Expected 11 records in DB, found ${finalCount}`);
  }

  console.log('\n✔ Historical JSON backfill verified successfully!');
}

backfill()
  .catch((err) => {
    console.error('Backfill Error:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
