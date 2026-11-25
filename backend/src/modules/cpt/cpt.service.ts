import { Injectable, NotFoundException, ConflictException, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { CptItemDto, CptQueryDto, CreateProcedureDto, UpdateProcedureDto } from './cpt.dto';
import { buildPaginationMeta } from '@common/dto/pagination.dto';
import * as crypto from 'crypto';

export const STANDARD_CPT_CATALOGUE: CptItemDto[] = [
  {
    code: '93458',
    name: 'Left Heart Catheterization with Coronary Angiography',
    category: 'CARDIOLOGY',
    description: 'Left heart catheterization including intraprocedural coronary angiography and left ventriculography',
    standardCharge: 150000,
    rvu: 6.8,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '93454',
    name: 'Coronary Angiography (Isolated)',
    category: 'CARDIOLOGY',
    description: 'Catheter placement in coronary artery(s) for coronary angiography without left ventriculography',
    standardCharge: 120000,
    rvu: 5.2,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '92928',
    name: 'Percutaneous Transcatheter Coronary Stent Placement',
    category: 'CARDIOLOGY',
    description: 'Percutaneous transcatheter placement of intracoronary stent(s), with coronary angioplasty when performed; single major coronary artery or branch',
    standardCharge: 275000,
    rvu: 14.5,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '92929',
    name: 'Coronary Stent Placement (Each Additional Branch)',
    category: 'CARDIOLOGY',
    description: 'Percutaneous transcatheter placement of intracoronary stent(s); each additional branch',
    standardCharge: 125000,
    rvu: 6.0,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '93000',
    name: '12-Lead Electrocardiogram (ECG/EKG)',
    category: 'DIAGNOSTIC_CARDIOLOGY',
    description: 'Electrocardiogram, routine ECG with at least 12 leads; with interpretation and report',
    standardCharge: 3500,
    rvu: 0.5,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '93306',
    name: 'Transthoracic Echocardiography (TTE)',
    category: 'DIAGNOSTIC_CARDIOLOGY',
    description: 'Echocardiography, transthoracic, real-time with image documentation, include Doppler and color flow Doppler',
    standardCharge: 18000,
    rvu: 2.1,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '33533',
    name: 'Coronary Artery Bypass Graft (CABG), Single Arterial',
    category: 'CARDIOVASCULAR_SURGERY',
    description: 'Coronary artery bypass, using arterial graft(s); single arterial graft',
    standardCharge: 750000,
    rvu: 38.0,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '99213',
    name: 'Outpatient Clinical Consultation (Level 3)',
    category: 'EVALUATION_MANAGEMENT',
    description: 'Office or other outpatient visit for evaluation and management of established patient, low-to-moderate severity',
    standardCharge: 4000,
    rvu: 1.3,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '99214',
    name: 'Outpatient Clinical Consultation (Level 4)',
    category: 'EVALUATION_MANAGEMENT',
    description: 'Office or other outpatient visit for evaluation and management of established patient, moderate-to-high severity',
    standardCharge: 6500,
    rvu: 1.9,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '99285',
    name: 'Emergency Department Visit (High Severity)',
    category: 'EMERGENCY',
    description: 'Emergency department visit for evaluation and management of patient, high severity with immediate threat',
    standardCharge: 15000,
    rvu: 4.2,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '80053',
    name: 'Comprehensive Metabolic Panel (CMP)',
    category: 'LABORATORY',
    description: 'Comprehensive metabolic panel blood test assessing organ function, electrolytes, and kidney markers',
    standardCharge: 5500,
    rvu: 0.4,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '85025',
    name: 'Complete Blood Count (CBC) with Differential',
    category: 'LABORATORY',
    description: 'Complete blood count (CBC) with automated differential count',
    standardCharge: 2500,
    rvu: 0.3,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
  {
    code: '71046',
    name: 'Chest X-Ray (2 Views)',
    category: 'RADIOLOGY',
    description: 'Radiologic examination, chest; 2 views frontal and lateral',
    standardCharge: 4500,
    rvu: 0.8,
    status: 'ACTIVE',
    isOfficialCpt: true,
  },
];

@Injectable()
export class CptService implements OnModuleInit {
  private readonly logger = new Logger(CptService.name);
  private isTableInitialized = false;

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    await this.ensureCatalogueTable();
  }

  /**
   * Non-destructive schema check and migration for procedure_catalogue table
   */
  private async ensureCatalogueTable(): Promise<void> {
    try {
      await this.db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "procedure_catalogue" (
          "id" TEXT PRIMARY KEY,
          "code" TEXT UNIQUE NOT NULL,
          "name" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "description" TEXT,
          "standard_charge" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "rvu" DOUBLE PRECISION,
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "is_official_cpt" BOOLEAN NOT NULL DEFAULT true,
          "sort_order" INTEGER NOT NULL DEFAULT 0,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "idx_procedure_catalogue_code" ON "procedure_catalogue"("code");
        CREATE INDEX IF NOT EXISTS "idx_procedure_catalogue_category" ON "procedure_catalogue"("category");
        CREATE INDEX IF NOT EXISTS "idx_procedure_catalogue_status" ON "procedure_catalogue"("status");
      `);

      // Seed baseline items if table is empty
      const countResult: any = await this.db.$queryRawUnsafe(`
        SELECT COUNT(*)::int as count FROM "procedure_catalogue"
      `);
      const rowCount = countResult?.[0]?.count ?? 0;

      if (rowCount === 0) {
        this.logger.log('Seeding procedure_catalogue with standard baseline procedures...');
        for (let i = 0; i < STANDARD_CPT_CATALOGUE.length; i++) {
          const item = STANDARD_CPT_CATALOGUE[i];
          await this.db.$executeRawUnsafe(
            `INSERT INTO "procedure_catalogue" 
              ("id", "code", "name", "category", "description", "standard_charge", "rvu", "status", "is_official_cpt", "sort_order", "created_at", "updated_at")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
             ON CONFLICT ("code") DO NOTHING`,
            crypto.randomUUID(),
            item.code,
            item.name,
            item.category,
            item.description || null,
            item.standardCharge || 0,
            item.rvu || null,
            item.status || 'ACTIVE',
            item.isOfficialCpt ?? true,
            i + 1,
          );
        }
        this.logger.log(`Successfully seeded ${STANDARD_CPT_CATALOGUE.length} baseline procedures.`);
      }

      this.isTableInitialized = true;
    } catch (err: any) {
      this.logger.warn(`Could not initialize database procedure_catalogue table (using memory catalogue): ${err.message}`);
    }
  }

  private mapDbRowToDto(row: any): CptItemDto {
    return {
      code: String(row.code),
      name: String(row.name),
      category: String(row.category),
      description: row.description ? String(row.description) : undefined,
      standardCharge: row.standard_charge !== null ? Number(row.standard_charge) : 0,
      rvu: row.rvu !== null && row.rvu !== undefined ? Number(row.rvu) : undefined,
      status: String(row.status || 'ACTIVE'),
      isOfficialCpt: row.is_official_cpt !== undefined ? Boolean(row.is_official_cpt) : true,
    };
  }

  async getCptCodes(query: CptQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 20), 100);
    const skip = (page - 1) * limit;

    try {
      if (this.isTableInitialized) {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        const statusFilter = (query.status || 'ACTIVE').toUpperCase();
        if (statusFilter !== 'ALL') {
          conditions.push(`"status" = $${paramIdx++}`);
          params.push(statusFilter);
        }

        if (query.category) {
          conditions.push(`UPPER("category") = $${paramIdx++}`);
          params.push(query.category.toUpperCase());
        }

        if (query.search) {
          const q = `%${query.search.toLowerCase()}%`;
          conditions.push(`(LOWER("code") LIKE $${paramIdx} OR LOWER("name") LIKE $${paramIdx} OR LOWER(COALESCE("description", '')) LIKE $${paramIdx})`);
          params.push(q);
          paramIdx++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*)::int as count FROM "procedure_catalogue" ${whereClause}`;
        const countRes: any = await this.db.$queryRawUnsafe(countQuery, ...params);
        const total = countRes?.[0]?.count ?? 0;

        const dataQuery = `
          SELECT * FROM "procedure_catalogue"
          ${whereClause}
          ORDER BY "sort_order" ASC, "code" ASC
          LIMIT $${paramIdx++} OFFSET $${paramIdx++}
        `;
        params.push(limit, skip);

        const rows: any[] = await this.db.$queryRawUnsafe(dataQuery, ...params);
        const data = rows.map((r) => this.mapDbRowToDto(r));

        return {
          data,
          meta: buildPaginationMeta(total, page, limit),
        };
      }
    } catch (err: any) {
      this.logger.warn(`Database query failed for getCptCodes, falling back to memory catalogue: ${err.message}`);
    }

    // In-memory fallback
    let filtered = [...STANDARD_CPT_CATALOGUE];
    const statusFilter = (query.status || 'ACTIVE').toUpperCase();
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((c) => (c.status || 'ACTIVE').toUpperCase() === statusFilter);
    }
    if (query.category) {
      filtered = filtered.filter(
        (c) => c.category.toUpperCase() === query.category?.toUpperCase(),
      );
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)),
      );
    }

    const total = filtered.length;
    const data = filtered.slice(skip, skip + limit);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async searchCptCodes(searchTerm: string, limit = 20) {
    const q = (searchTerm || '').trim().toLowerCase();

    try {
      if (this.isTableInitialized) {
        let rows: any[];
        if (!q) {
          rows = await this.db.$queryRawUnsafe(
            `SELECT * FROM "procedure_catalogue" WHERE "status" = 'ACTIVE' ORDER BY "sort_order" ASC, "code" ASC LIMIT $1`,
            limit,
          );
        } else {
          const searchPattern = `%${q}%`;
          rows = await this.db.$queryRawUnsafe(
            `SELECT * FROM "procedure_catalogue" 
             WHERE "status" = 'ACTIVE' AND (LOWER("code") LIKE $1 OR LOWER("name") LIKE $1 OR LOWER(COALESCE("description", '')) LIKE $1)
             ORDER BY "sort_order" ASC, "code" ASC LIMIT $2`,
            searchPattern,
            limit,
          );
        }
        return rows.map((r) => this.mapDbRowToDto(r));
      }
    } catch (err: any) {
      this.logger.warn(`Database query failed for searchCptCodes, using fallback: ${err.message}`);
    }

    if (!q) {
      return STANDARD_CPT_CATALOGUE.filter((c) => c.status === 'ACTIVE').slice(0, limit);
    }

    return STANDARD_CPT_CATALOGUE.filter(
      (c) =>
        c.status === 'ACTIVE' &&
        (c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))),
    ).slice(0, limit);
  }

  async getCptByCode(code: string): Promise<CptItemDto> {
    const cleanCode = (code || '').trim();

    try {
      if (this.isTableInitialized) {
        const rows: any[] = await this.db.$queryRawUnsafe(
          `SELECT * FROM "procedure_catalogue" WHERE LOWER("code") = LOWER($1) LIMIT 1`,
          cleanCode,
        );
        if (rows && rows.length > 0) {
          return this.mapDbRowToDto(rows[0]);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Database lookup failed for CPT code '${cleanCode}': ${err.message}`);
    }

    const item = STANDARD_CPT_CATALOGUE.find(
      (c) => c.code.toLowerCase() === cleanCode.toLowerCase(),
    );
    if (!item) {
      throw new NotFoundException(`Procedure / CPT code '${cleanCode}' not found in catalogue`);
    }
    return item;
  }

  /**
   * Administrative Catalogue Management: Register New Procedure
   */
  async createProcedure(dto: CreateProcedureDto): Promise<CptItemDto> {
    const cleanCode = dto.code.trim();
    
    // Check for existing duplicate code
    try {
      if (this.isTableInitialized) {
        const existing: any[] = await this.db.$queryRawUnsafe(
          `SELECT "id" FROM "procedure_catalogue" WHERE LOWER("code") = LOWER($1) LIMIT 1`,
          cleanCode,
        );
        if (existing && existing.length > 0) {
          throw new ConflictException(`Procedure code '${cleanCode}' already exists in catalogue`);
        }

        const id = crypto.randomUUID();
        const isOfficial = dto.isOfficialCpt !== undefined ? Boolean(dto.isOfficialCpt) : (/^\d{5}$/.test(cleanCode));
        await this.db.$executeRawUnsafe(
          `INSERT INTO "procedure_catalogue"
            ("id", "code", "name", "category", "description", "standard_charge", "rvu", "status", "is_official_cpt", "sort_order", "created_at", "updated_at")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 99, NOW(), NOW())`,
          id,
          cleanCode,
          dto.name.trim(),
          dto.category.trim().toUpperCase(),
          dto.description?.trim() || null,
          dto.standardCharge || 0,
          dto.rvu || null,
          dto.status || 'ACTIVE',
          isOfficial,
        );

        return this.getCptByCode(cleanCode);
      }
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      this.logger.error(`Failed to create procedure in database: ${err.message}`);
    }

    // In-memory update if DB is bypassed
    const exists = STANDARD_CPT_CATALOGUE.some((c) => c.code.toLowerCase() === cleanCode.toLowerCase());
    if (exists) {
      throw new ConflictException(`Procedure code '${cleanCode}' already exists in catalogue`);
    }

    const newDto: CptItemDto = {
      code: cleanCode,
      name: dto.name.trim(),
      category: dto.category.trim().toUpperCase(),
      description: dto.description?.trim(),
      standardCharge: dto.standardCharge || 0,
      rvu: dto.rvu,
      status: dto.status || 'ACTIVE',
      isOfficialCpt: dto.isOfficialCpt !== undefined ? dto.isOfficialCpt : (/^\d{5}$/.test(cleanCode)),
    };
    STANDARD_CPT_CATALOGUE.push(newDto);
    return newDto;
  }

  /**
   * Administrative Catalogue Management: Update Procedure
   */
  async updateProcedure(code: string, dto: UpdateProcedureDto): Promise<CptItemDto> {
    const cleanCode = code.trim();
    await this.getCptByCode(cleanCode); // Ensures existence

    try {
      if (this.isTableInitialized) {
        const updates: string[] = ['"updated_at" = NOW()'];
        const params: any[] = [];
        let paramIdx = 1;

        if (dto.name !== undefined) {
          updates.push(`"name" = $${paramIdx++}`);
          params.push(dto.name.trim());
        }
        if (dto.category !== undefined) {
          updates.push(`"category" = $${paramIdx++}`);
          params.push(dto.category.trim().toUpperCase());
        }
        if (dto.description !== undefined) {
          updates.push(`"description" = $${paramIdx++}`);
          params.push(dto.description.trim());
        }
        if (dto.standardCharge !== undefined) {
          updates.push(`"standard_charge" = $${paramIdx++}`);
          params.push(dto.standardCharge);
        }
        if (dto.rvu !== undefined) {
          updates.push(`"rvu" = $${paramIdx++}`);
          params.push(dto.rvu);
        }
        if (dto.status !== undefined) {
          updates.push(`"status" = $${paramIdx++}`);
          params.push(dto.status);
        }
        if (dto.isOfficialCpt !== undefined) {
          updates.push(`"is_official_cpt" = $${paramIdx++}`);
          params.push(Boolean(dto.isOfficialCpt));
        }

        const updateQuery = `
          UPDATE "procedure_catalogue"
          SET ${updates.join(', ')}
          WHERE LOWER("code") = LOWER($${paramIdx})
        `;
        params.push(cleanCode);

        await this.db.$executeRawUnsafe(updateQuery, ...params);
        return this.getCptByCode(cleanCode);
      }
    } catch (err: any) {
      this.logger.error(`Failed to update procedure in database: ${err.message}`);
    }

    // In-memory fallback
    const item = STANDARD_CPT_CATALOGUE.find((c) => c.code.toLowerCase() === cleanCode.toLowerCase());
    if (item) {
      if (dto.name !== undefined) item.name = dto.name.trim();
      if (dto.category !== undefined) item.category = dto.category.trim().toUpperCase();
      if (dto.description !== undefined) item.description = dto.description.trim();
      if (dto.standardCharge !== undefined) item.standardCharge = dto.standardCharge;
      if (dto.rvu !== undefined) item.rvu = dto.rvu;
      if (dto.status !== undefined) item.status = dto.status;
      if (dto.isOfficialCpt !== undefined) item.isOfficialCpt = dto.isOfficialCpt;
      return item;
    }
    throw new NotFoundException(`Procedure code '${cleanCode}' not found`);
  }

  /**
   * Administrative Catalogue Management: Soft Deactivate Procedure
   */
  async deleteProcedure(code: string): Promise<{ success: boolean; message: string }> {
    const cleanCode = code.trim();
    await this.updateProcedure(cleanCode, { status: 'INACTIVE' });
    return {
      success: true,
      message: `Procedure '${cleanCode}' has been deactivated successfully. Historical records remain preserved.`,
    };
  }
}
