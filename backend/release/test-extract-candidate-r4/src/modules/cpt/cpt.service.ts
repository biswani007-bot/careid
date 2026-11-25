import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { CptItemDto, CptQueryDto } from './cpt.dto';
import { buildPaginationMeta } from '@common/dto/pagination.dto';

const STANDARD_CPT_CATALOGUE: CptItemDto[] = [
  {
    code: '93458',
    name: 'Left Heart Catheterization with Coronary Angiography',
    category: 'CARDIOLOGY',
    description: 'Left heart catheterization including intraprocedural coronary angiography and left ventriculography',
    standardCharge: 150000,
    rvu: 6.8,
    status: 'ACTIVE',
  },
  {
    code: '93454',
    name: 'Coronary Angiography (Isolated)',
    category: 'CARDIOLOGY',
    description: 'Catheter placement in coronary artery(s) for coronary angiography without left ventriculography',
    standardCharge: 120000,
    rvu: 5.2,
    status: 'ACTIVE',
  },
  {
    code: '92928',
    name: 'Percutaneous Transcatheter Coronary Stent Placement',
    category: 'CARDIOLOGY',
    description: 'Percutaneous transcatheter placement of intracoronary stent(s), with coronary angioplasty when performed; single major coronary artery or branch',
    standardCharge: 275000,
    rvu: 14.5,
    status: 'ACTIVE',
  },
  {
    code: '92929',
    name: 'Coronary Stent Placement (Each Additional Branch)',
    category: 'CARDIOLOGY',
    description: 'Percutaneous transcatheter placement of intracoronary stent(s); each additional branch',
    standardCharge: 125000,
    rvu: 6.0,
    status: 'ACTIVE',
  },
  {
    code: '93000',
    name: '12-Lead Electrocardiogram (ECG/EKG)',
    category: 'DIAGNOSTIC_CARDIOLOGY',
    description: 'Electrocardiogram, routine ECG with at least 12 leads; with interpretation and report',
    standardCharge: 3500,
    rvu: 0.5,
    status: 'ACTIVE',
  },
  {
    code: '93306',
    name: 'Transthoracic Echocardiography (TTE)',
    category: 'DIAGNOSTIC_CARDIOLOGY',
    description: 'Echocardiography, transthoracic, real-time with image documentation, include Doppler and color flow Doppler',
    standardCharge: 18000,
    rvu: 2.1,
    status: 'ACTIVE',
  },
  {
    code: '33533',
    name: 'Coronary Artery Bypass Graft (CABG), Single Arterial',
    category: 'CARDIOVASCULAR_SURGERY',
    description: 'Coronary artery bypass, using arterial graft(s); single arterial graft',
    standardCharge: 750000,
    rvu: 38.0,
    status: 'ACTIVE',
  },
  {
    code: '99213',
    name: 'Outpatient Clinical Consultation (Level 3)',
    category: 'EVALUATION_MANAGEMENT',
    description: 'Office or other outpatient visit for evaluation and management of established patient, low-to-moderate severity',
    standardCharge: 4000,
    rvu: 1.3,
    status: 'ACTIVE',
  },
  {
    code: '99214',
    name: 'Outpatient Clinical Consultation (Level 4)',
    category: 'EVALUATION_MANAGEMENT',
    description: 'Office or other outpatient visit for evaluation and management of established patient, moderate-to-high severity',
    standardCharge: 6500,
    rvu: 1.9,
    status: 'ACTIVE',
  },
  {
    code: '99285',
    name: 'Emergency Department Visit (High Severity)',
    category: 'EMERGENCY',
    description: 'Emergency department visit for evaluation and management of patient, high severity with immediate threat',
    standardCharge: 15000,
    rvu: 4.2,
    status: 'ACTIVE',
  },
  {
    code: '80053',
    name: 'Comprehensive Metabolic Panel (CMP)',
    category: 'LABORATORY',
    description: 'Comprehensive metabolic panel blood test assessing organ function, electrolytes, and kidney markers',
    standardCharge: 5500,
    rvu: 0.4,
    status: 'ACTIVE',
  },
  {
    code: '85025',
    name: 'Complete Blood Count (CBC) with Differential',
    category: 'LABORATORY',
    description: 'Complete blood count (CBC) with automated differential count',
    standardCharge: 2500,
    rvu: 0.3,
    status: 'ACTIVE',
  },
  {
    code: '71046',
    name: 'Chest X-Ray (2 Views)',
    category: 'RADIOLOGY',
    description: 'Radiologic examination, chest; 2 views frontal and lateral',
    standardCharge: 4500,
    rvu: 0.8,
    status: 'ACTIVE',
  },
];

@Injectable()
export class CptService {
  constructor(private readonly db: DatabaseService) {}

  async getCptCodes(query: CptQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 20), 100);

    let filtered = [...STANDARD_CPT_CATALOGUE];

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
    const skip = (page - 1) * limit;
    const data = filtered.slice(skip, skip + limit);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async searchCptCodes(searchTerm: string) {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) {
      return STANDARD_CPT_CATALOGUE.slice(0, 20);
    }

    return STANDARD_CPT_CATALOGUE.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)),
    );
  }

  async getCptByCode(code: string): Promise<CptItemDto> {
    const item = STANDARD_CPT_CATALOGUE.find(
      (c) => c.code.toLowerCase() === code.trim().toLowerCase(),
    );
    if (!item) {
      throw new NotFoundException(`CPT procedure code '${code}' not found in catalogue`);
    }
    return item;
  }
}

