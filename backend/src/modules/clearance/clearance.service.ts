import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import {
  CreateClearanceRequirementDto,
  UpdateClearanceRequirementDto,
  QueryClearanceRequirementsDto,
  CreateClearancePolicyDto,
  UpdateClearancePolicyDto,
  QueryClearancePoliciesDto,
  SubmitClearanceDecisionDto,
  UpdateOfferClearancePayloadDto,
} from './clearance.dto';
import {
  ClinicalDataSanitizer,
  getReadableHoldCategoryLabel,
} from '@modules/treatment-offer/domain/clinical-data-sanitizer';

@Injectable()
export class ClearanceService {
  private readonly logger = new Logger(ClearanceService.name);

  constructor(private readonly db: DatabaseService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CLEARANCE REQUIREMENT CATALOGUE (Admin Managed)
  // ═══════════════════════════════════════════════════════════════════════════

  async listRequirements(query: QueryClearanceRequirementsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.category) {
      where.category = query.category;
    }
    if (query.clinicalPracticeType) {
      where.clinicalPracticeType = {
        in: [query.clinicalPracticeType, 'ALL'],
      };
    }
    if (query.facilityId) {
      where.OR = [{ facilityId: query.facilityId }, { facilityId: null }];
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.clearanceRequirement.count({ where }),
      this.db.clearanceRequirement.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
        include: {
          facility: { select: { id: true, name: true, facilityCode: true } },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getRequirementById(id: string) {
    const req = await this.db.clearanceRequirement.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        facility: { select: { id: true, name: true, facilityCode: true } },
      },
    });
    if (!req) {
      throw new NotFoundException(`Clearance requirement '${id}' not found`);
    }
    return req;
  }

  async createRequirement(dto: CreateClearanceRequirementDto, userId?: string) {
    const existing = await this.db.clearanceRequirement.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Clearance requirement code '${dto.code}' already exists`);
    }

    return this.db.clearanceRequirement.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description || null,
        category: dto.category || 'LABORATORY',
        clinicalPracticeType: dto.clinicalPracticeType || 'ALL',
        procedureGroup: dto.procedureGroup || null,
        facilityId: dto.facilityId || null,
        requiredEvidenceType: dto.requiredEvidenceType || 'NONE',
        reviewerRole: dto.reviewerRole || 'DOCTOR',
        requiredApprovalsCount: dto.requiredApprovalsCount || 1,
        requiredSpecialties: dto.requiredSpecialties || [],
        isMandatory: dto.isMandatory !== undefined ? dto.isMandatory : true,
        dependencies: dto.dependencies || [],
        sortOrder: dto.sortOrder || 0,
        status: dto.status || 'ACTIVE',
      },
      include: {
        facility: { select: { id: true, name: true, facilityCode: true } },
      },
    });
  }

  async updateRequirement(id: string, dto: UpdateClearanceRequirementDto, userId?: string) {
    const existing = await this.getRequirementById(id);

    return this.db.clearanceRequirement.update({
      where: { id: existing.id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        category: dto.category !== undefined ? dto.category : undefined,
        clinicalPracticeType: dto.clinicalPracticeType !== undefined ? dto.clinicalPracticeType : undefined,
        procedureGroup: dto.procedureGroup !== undefined ? dto.procedureGroup : undefined,
        facilityId: dto.facilityId !== undefined ? dto.facilityId : undefined,
        requiredEvidenceType: dto.requiredEvidenceType !== undefined ? dto.requiredEvidenceType : undefined,
        reviewerRole: dto.reviewerRole !== undefined ? dto.reviewerRole : undefined,
        requiredApprovalsCount: dto.requiredApprovalsCount !== undefined ? dto.requiredApprovalsCount : undefined,
        requiredSpecialties: dto.requiredSpecialties !== undefined ? dto.requiredSpecialties : undefined,
        isMandatory: dto.isMandatory !== undefined ? dto.isMandatory : undefined,
        dependencies: dto.dependencies !== undefined ? dto.dependencies : undefined,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        version: { increment: 1 },
      },
      include: {
        facility: { select: { id: true, name: true, facilityCode: true } },
      },
    });
  }

  async toggleRequirementStatus(id: string, status: 'ACTIVE' | 'INACTIVE', userId?: string) {
    const existing = await this.getRequirementById(id);
    return this.db.clearanceRequirement.update({
      where: { id: existing.id },
      data: { status },
    });
  }

  async deleteRequirement(id: string, userId?: string) {
    const existing = await this.getRequirementById(id);

    // Safeguard: Check if any active treatment offer clearance records use this requirement
    const activeDecisions = await this.db.clearanceDecisionItem.count({
      where: {
        requirementId: existing.id,
        clearanceRecord: {
          overallStatus: { in: ['PENDING', 'PARTIALLY_CLEARED'] },
        },
      },
    });

    if (activeDecisions > 0) {
      throw new BadRequestException(
        `Cannot delete requirement '${existing.code}': Referenced by ${activeDecisions} active patient clearance workflow(s). Deactivate it instead.`
      );
    }

    await this.db.clearanceRequirement.delete({
      where: { id: existing.id },
    });

    return { success: true, message: `Clearance requirement '${existing.code}' removed successfully` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CLEARANCE POLICIES (Facility & Procedure specific)
  // ═══════════════════════════════════════════════════════════════════════════

  async listPolicies(query: QueryClearancePoliciesDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.facilityId) {
      where.facilityId = query.facilityId;
    }
    if (query.procedureCode) {
      where.procedureCode = query.procedureCode;
    }
    if (query.clinicalPracticeType) {
      where.clinicalPracticeType = query.clinicalPracticeType;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { policyNumber: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { procedureCode: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.clearancePolicy.count({ where }),
      this.db.clearancePolicy.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          facility: { select: { id: true, name: true, facilityCode: true } },
          procedure: { select: { id: true, code: true, name: true, category: true } },
          items: {
            orderBy: { sortOrder: 'asc' },
            include: { requirement: true },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPolicyById(id: string) {
    const policy = await this.db.clearancePolicy.findFirst({
      where: { OR: [{ id }, { policyNumber: id }] },
      include: {
        facility: { select: { id: true, name: true, facilityCode: true } },
        procedure: { select: { id: true, code: true, name: true, category: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { requirement: true },
        },
      },
    });
    if (!policy) {
      throw new NotFoundException(`Clearance policy '${id}' not found`);
    }
    return policy;
  }

  async createPolicy(dto: CreateClearancePolicyDto, userId?: string) {
    const existing = await this.db.clearancePolicy.findUnique({
      where: { policyNumber: dto.policyNumber },
    });
    if (existing) {
      throw new ConflictException(`Policy number '${dto.policyNumber}' already exists`);
    }

    // Resolve procedureId if procedureCode provided
    let procedureId = undefined;
    if (dto.procedureCode) {
      const proc = await this.db.procedureCatalogue.findUnique({
        where: { code: dto.procedureCode },
      });
      if (proc) procedureId = proc.id;
    }

    return this.db.$transaction(async (tx) => {
      const created = await tx.clearancePolicy.create({
        data: {
          policyNumber: dto.policyNumber.trim().toUpperCase(),
          name: dto.name.trim(),
          facilityId: dto.facilityId || null,
          procedureId: procedureId || null,
          procedureCode: dto.procedureCode || null,
          clinicalPracticeType: dto.clinicalPracticeType || 'HUMAN_HEALTHCARE',
          status: dto.status || 'PUBLISHED',
          schedulingPrerequisites: dto.schedulingPrerequisites || [],
        },
      });

      if (dto.items && dto.items.length > 0) {
        for (let i = 0; i < dto.items.length; i++) {
          const it = dto.items[i];
          // Resolve requirementId if it's a code
          const req = await tx.clearanceRequirement.findFirst({
            where: { OR: [{ id: it.requirementId }, { code: it.requirementId }] },
          });
          if (req) {
            await tx.clearancePolicyItem.create({
              data: {
                policyId: created.id,
                requirementId: req.id,
                isMandatory: it.isMandatory !== undefined ? it.isMandatory : true,
                sortOrder: it.sortOrder !== undefined ? it.sortOrder : i + 1,
                requiredSpecialties: it.requiredSpecialties || req.requiredSpecialties || [],
                validityDays: it.validityDays || 30,
              },
            });
          }
        }
      }

      return tx.clearancePolicy.findUnique({
        where: { id: created.id },
        include: {
          facility: { select: { id: true, name: true, facilityCode: true } },
          procedure: { select: { id: true, code: true, name: true, category: true } },
          items: {
            orderBy: { sortOrder: 'asc' },
            include: { requirement: true },
          },
        },
      });
    });
  }

  async updatePolicy(id: string, dto: UpdateClearancePolicyDto, userId?: string) {
    const existing = await this.getPolicyById(id);

    return this.db.$transaction(async (tx) => {
      const updated = await tx.clearancePolicy.update({
        where: { id: existing.id },
        data: {
          name: dto.name !== undefined ? dto.name.trim() : undefined,
          facilityId: dto.facilityId !== undefined ? dto.facilityId : undefined,
          procedureCode: dto.procedureCode !== undefined ? dto.procedureCode : undefined,
          clinicalPracticeType: dto.clinicalPracticeType !== undefined ? dto.clinicalPracticeType : undefined,
          status: dto.status !== undefined ? dto.status : undefined,
          schedulingPrerequisites: dto.schedulingPrerequisites !== undefined ? dto.schedulingPrerequisites : undefined,
          version: { increment: 1 },
        },
      });

      if (dto.items !== undefined) {
        // Re-assign items
        await tx.clearancePolicyItem.deleteMany({
          where: { policyId: existing.id },
        });

        for (let i = 0; i < dto.items.length; i++) {
          const it = dto.items[i];
          const req = await tx.clearanceRequirement.findFirst({
            where: { OR: [{ id: it.requirementId }, { code: it.requirementId }] },
          });
          if (req) {
            await tx.clearancePolicyItem.create({
              data: {
                policyId: existing.id,
                requirementId: req.id,
                isMandatory: it.isMandatory !== undefined ? it.isMandatory : true,
                sortOrder: it.sortOrder !== undefined ? it.sortOrder : i + 1,
                requiredSpecialties: it.requiredSpecialties || req.requiredSpecialties || [],
                validityDays: it.validityDays || 30,
              },
            });
          }
        }
      }

      return tx.clearancePolicy.findUnique({
        where: { id: existing.id },
        include: {
          facility: { select: { id: true, name: true, facilityCode: true } },
          procedure: { select: { id: true, code: true, name: true, category: true } },
          items: {
            orderBy: { sortOrder: 'asc' },
            include: { requirement: true },
          },
        },
      });
    });
  }

  async deletePolicy(id: string, userId?: string) {
    const existing = await this.getPolicyById(id);
    await this.db.clearancePolicy.delete({
      where: { id: existing.id },
    });
    return { success: true, message: `Clearance policy '${existing.policyNumber}' deleted successfully` };
  }

  /**
   * Resolves the most specific published clearance policy for a given facility, procedure, and clinical practice type.
   * Priority:
   * 1. Exact match on Facility + Procedure
   * 2. Match on Facility
   * 3. Match on Procedure
   * 4. Published Default Policy
   */
  async resolveApplicablePolicy(facilityId?: string | null, procedureCode?: string | null, clinicalPracticeType = 'HUMAN_HEALTHCARE') {
    // 1. Facility + Procedure
    if (facilityId && procedureCode) {
      const match = await this.db.clearancePolicy.findFirst({
        where: {
          facilityId,
          procedureCode,
          status: 'PUBLISHED',
        },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            include: { requirement: true },
          },
        },
      });
      if (match && match.items.length > 0) return match;
    }

    // 2. Procedure specific
    if (procedureCode) {
      const match = await this.db.clearancePolicy.findFirst({
        where: {
          procedureCode,
          facilityId: null,
          status: 'PUBLISHED',
        },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            include: { requirement: true },
          },
        },
      });
      if (match && match.items.length > 0) return match;
    }

    // 3. Facility specific
    if (facilityId) {
      const match = await this.db.clearancePolicy.findFirst({
        where: {
          facilityId,
          procedureCode: null,
          status: 'PUBLISHED',
        },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            include: { requirement: true },
          },
        },
      });
      if (match && match.items.length > 0) return match;
    }

    // 4. Default policy
    const defaultPolicy = await this.db.clearancePolicy.findFirst({
      where: {
        policyNumber: 'POL-CLEAR-DEFAULT',
        status: 'PUBLISHED',
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { requirement: true },
        },
      },
    });

    if (defaultPolicy && defaultPolicy.items.length > 0) return defaultPolicy;

    // 5. Fallback: Any published policy
    return this.db.clearancePolicy.findFirst({
      where: { status: 'PUBLISHED' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { requirement: true },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. TREATMENT OFFER CLEARANCE WORKFLOW & DYNAMIC CHECKLIST
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieves or initializes the dynamic clearance checklist for a treatment offer.
   */
  async getOfferClearance(userId: string, offerId: string, roles: string[] = []) {
    const offer = await this.db.treatmentOffer.findUnique({
      where: { id: offerId },
      include: {
        procedures: { orderBy: { sequenceOrder: 'asc' } },
        patient: true,
        facility: true,
        financingApplications: true,
      },
    });

    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const procedureCode = offer.procedures[0]?.procedureCode || null;
    const applicablePolicy = await this.resolveApplicablePolicy(offer.facilityId, procedureCode);

    // Find or create treatment offer clearance record
    let record = await this.db.treatmentOfferClearanceRecord.findUnique({
      where: { treatmentOfferId: offer.id },
      include: {
        decisions: {
          include: { requirement: true },
        },
        policy: true,
      },
    });

    if (!record) {
      record = await this.db.treatmentOfferClearanceRecord.create({
        data: {
          treatmentOfferId: offer.id,
          patientProfileId: offer.patientProfileId,
          facilityId: offer.facilityId,
          procedureId: offer.procedures[0]?.id || null,
          policyId: applicablePolicy?.id || null,
          policyVersion: applicablePolicy?.version || 1,
          overallStatus: 'PENDING',
        },
        include: {
          decisions: {
            include: { requirement: true },
          },
          policy: true,
        },
      });
    }

    // Auto-synchronize policy items into decision records if missing
    if (applicablePolicy && applicablePolicy.items) {
      const existingReqIds = new Set(record.decisions.map((d) => d.requirementId));

      for (const item of applicablePolicy.items) {
        if (!existingReqIds.has(item.requirementId)) {
          // If multi-specialty, create a decision item for each specialty or a root item
          const specialties = item.requiredSpecialties && item.requiredSpecialties.length > 0
            ? item.requiredSpecialties
            : [null];

          for (const spec of specialties) {
            await this.db.clearanceDecisionItem.create({
              data: {
                clearanceRecordId: record.id,
                requirementId: item.requirementId,
                requirementCode: item.requirement.code,
                specialty: spec,
                status: 'PENDING',
              },
            });
          }
        }
      }

      // Re-fetch record with fresh decisions
      const refreshedRecord = await this.db.treatmentOfferClearanceRecord.findUnique({
        where: { id: record.id },
        include: {
          decisions: {
            include: { requirement: true },
          },
          policy: true,
        },
      });
      if (refreshedRecord) {
        record = refreshedRecord;
      }
    }

    // Check patient's available lab reports for evidence inspection
    const patientLabReports = await this.db.laboratoryReport.findMany({
      where: { patientProfileId: offer.patientProfileId },
      orderBy: { reportedDate: 'desc' },
      take: 5,
      include: { testItems: true },
    });

    // Evaluate dynamic checklist items according to policy
    const policyItems = applicablePolicy?.items || [];
    let completedGates = 0;
    const totalGates = policyItems.length;
    const allDecisions = record?.decisions || [];

    const dynamicRequirements = policyItems.map((pItem) => {
      const req = pItem.requirement;
      const decisionsForReq = allDecisions.filter((d) => d.requirementId === req.id);

      // Determine status for this requirement
      let reqStatus = 'PENDING';
      let clearedAt: Date | null = null;
      let clearedBy: string | null = null;
      let notes: string | null = null;
      let unmetReason: string | null = null;

      // Special handling for offer lifecycle-linked requirements
      if (req.code === 'REQ-FINANCIAL') {
        const dec = decisionsForReq[0];
        if (dec) {
          reqStatus = dec.status;
          clearedAt = dec.decisionTimestamp;
          clearedBy = dec.reviewerId;
          notes = dec.clinicalRemarks;
        } else if (offer.financingApplications && offer.financingApplications.some((fa: any) => fa.status === 'APPROVED')) {
          reqStatus = 'CLEARED';
          notes = 'Healthcare financing application approved and ratified.';
        } else if ((offer.status as string) === 'ACCEPTED' || (offer.status as string) === 'RATIFIED_ACCEPTED') {
          reqStatus = 'CLEARED';
          notes = 'Financial settlement & payment plan accepted by patient.';
        } else {
          reqStatus = 'PENDING';
          unmetReason = 'Financial authorization & payment settlement pending patient acceptance.';
        }
      } else if (req.code === 'REQ-LEGAL-CONSENT') {
        const dec = decisionsForReq[0];
        if (dec) {
          reqStatus = dec.status;
          clearedAt = dec.decisionTimestamp;
          clearedBy = dec.reviewerId;
          notes = dec.clinicalRemarks;
        } else if ((offer.status as string) === 'ACCEPTED' || (offer.status as string) === 'RATIFIED_ACCEPTED') {
          reqStatus = 'CLEARED';
          notes = `Consent ratified by ${offer.patient?.firstName || 'patient'}.`;
        } else {
          reqStatus = 'PENDING';
          unmetReason = 'Informed consent not yet ratified by patient.';
        }
      } else if (req.code === 'REQ-OFFER-AGREEMENT') {
        const dec = decisionsForReq[0];
        if (dec) {
          reqStatus = dec.status;
          clearedAt = dec.decisionTimestamp;
          clearedBy = dec.reviewerId;
          notes = dec.clinicalRemarks;
        } else if ((offer.status as string) === 'ACCEPTED' || (offer.status as string) === 'RATIFIED_ACCEPTED') {
          reqStatus = 'CLEARED';
          notes = `Offer #${offer.offerNumber} v${offer.version}.0 accepted and archived.`;
        } else {
          reqStatus = 'PENDING';
          unmetReason = `Offer #${offer.offerNumber} currently ${(offer.status as string) || 'DRAFT'}. Patient acceptance required.`;
        }
      } else if (pItem.requiredSpecialties && pItem.requiredSpecialties.length > 0) {
        // Multi-specialty requirement: must have decisions for ALL required specialties
        const specStatuses: Record<string, string> = {};
        for (const spec of pItem.requiredSpecialties) {
          const specDec = decisionsForReq.find((d) => d.specialty === spec);
          specStatuses[spec] = specDec ? specDec.status : 'PENDING';
        }

        const allCleared = pItem.requiredSpecialties.every((s) => specStatuses[s] === 'CLEARED');
        const anyRejected = pItem.requiredSpecialties.some((s) => specStatuses[s] === 'REJECTED');
        const anyCleared = pItem.requiredSpecialties.some((s) => specStatuses[s] === 'CLEARED');

        if (anyRejected) {
          reqStatus = 'REJECTED';
          unmetReason = 'One or more required specialist clearances were rejected.';
        } else if (allCleared) {
          reqStatus = 'CLEARED';
          const latestDec = decisionsForReq.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))[0];
          clearedAt = latestDec?.decisionTimestamp || latestDec?.updatedAt || null;
          clearedBy = latestDec?.reviewerId || null;
          notes = `All ${pItem.requiredSpecialties.length} specialist clearances ratified.`;
        } else if (anyCleared) {
          reqStatus = 'PARTIALLY_CLEARED';
          const missing = pItem.requiredSpecialties.filter((s) => specStatuses[s] !== 'CLEARED');
          unmetReason = `Pending specialist reviews: ${missing.join(', ')}`;
        } else {
          reqStatus = 'PENDING';
          unmetReason = `Specialist approvals required: ${pItem.requiredSpecialties.join(', ')}`;
        }
      } else {
        // Single decision requirement
        const dec = decisionsForReq[0];
        if (dec) {
          reqStatus = dec.status;
          clearedAt = dec.decisionTimestamp;
          clearedBy = dec.reviewerId;
          notes = dec.clinicalRemarks;
        }

        if (reqStatus !== 'CLEARED' && req.requiredEvidenceType === 'LAB_RESULT') {
          unmetReason = patientLabReports.length > 0
            ? 'Lab evidence on file requires clinician review and attestation.'
            : 'No laboratory panel on file for this patient. Evidence required.';
        }
      }

      if (['CLEARED', 'APPROVED', 'WAIVED'].includes(reqStatus)) {
        completedGates++;
      }

      // Specialist breakdown list for UI
      const specialistReviews = (pItem.requiredSpecialties || []).map((spec) => {
        const d = decisionsForReq.find((dec) => dec.specialty === spec);
        return {
          specialty: spec,
          status: d ? d.status : 'PENDING',
          reviewerId: d?.reviewerId || null,
          decisionTimestamp: d?.decisionTimestamp?.toISOString() || null,
          clinicalRemarks: d?.clinicalRemarks || null,
        };
      });

      return {
        id: req.id,
        code: req.code,
        name: req.name,
        description: req.description,
        category: req.category,
        isMandatory: pItem.isMandatory,
        sortOrder: pItem.sortOrder,
        status: reqStatus,
        requiredEvidenceType: req.requiredEvidenceType,
        reviewerRole: req.reviewerRole,
        specialistReviews,
        clearedAt: clearedAt ? clearedAt.toISOString() : null,
        clearedBy,
        notes: notes || req.description,
        unmetReason,
      };
    });

    const readinessPercentage = totalGates > 0 ? Math.round((completedGates / totalGates) * 100) : 0;
    let overallStatus = 'PENDING';
    if (dynamicRequirements.some((r) => r.status === 'REJECTED')) {
      overallStatus = 'REJECTED';
    } else if (dynamicRequirements.every((r) => r.status === 'CLEARED' || !r.isMandatory)) {
      overallStatus = 'CLEARED';
    } else if (completedGates > 0) {
      overallStatus = 'PARTIALLY_CLEARED';
    }

    // Persist updated progress on clearance record
    await this.db.treatmentOfferClearanceRecord.update({
      where: { id: record!.id },
      data: {
        completedGatesCount: completedGates,
        totalGatesCount: totalGates,
        readinessPercentage,
        overallStatus,
      },
    });

    // Extract individual domains for backward compatibility
    const labReq = dynamicRequirements.find((r) => r.code === 'REQ-LAB-METABOLIC');
    const specReq = dynamicRequirements.find((r) => r.code === 'REQ-SPEC-CLEARANCE');
    const surgReq = dynamicRequirements.find((r) => r.code === 'REQ-SURGICAL-PREP');

    const anesthesiaSub = specReq?.specialistReviews?.find((s) => s.specialty === 'ANESTHESIA');
    const cardiologySub = specReq?.specialistReviews?.find((s) => s.specialty === 'CARDIOLOGY');
    const medicalSub = specReq?.specialistReviews?.find((s) => s.specialty === 'MEDICAL');

    // CAREID-020: Parse clinical indication and retrieve authoritative structured safety holds
    const parsedIndication = ClinicalDataSanitizer.parseClinicalIndication(
      offer.clinicalIndication,
      offer.procedures[0]?.procedureName,
    );

    let structuredSafetyHolds: any[] = [];
    try {
      const dbHolds = await this.db.safetyHoldRecord.findMany({
        where: {
          OR: [
            { treatmentOfferId: offer.id },
            { patientProfileId: offer.patientProfileId },
          ],
        },
        include: {
          declaringUser: { include: { doctorProfile: true } },
          resolvingUser: { include: { doctorProfile: true } },
        },
        orderBy: { declaredAt: 'desc' },
      });

      const categoryMap = new Map<string, string>();
      try {
        if (this.db.masterDataItem?.findMany) {
          const catItems = await this.db.masterDataItem.findMany({
            where: { category: { code: 'SAFETY_HOLD_CATEGORIES' } },
          });
          for (const ci of catItems) {
            categoryMap.set(ci.code, ci.name);
          }
        }
      } catch {}

      structuredSafetyHolds = dbHolds.map((h) => {
        const declaredByName = h.declaringUser?.doctorProfile?.fullName
          ? `${h.declaringUser.doctorProfile.fullName}, MD`
          : 'Attending Clinician';
        const resolvedByName = h.resolvingUser?.doctorProfile?.fullName
          ? `${h.resolvingUser.doctorProfile.fullName}, MD`
          : (h.resolvedBy ? 'Attending Clinician' : null);

        return {
          id: h.id,
          holdId: h.holdId,
          appointmentId: h.appointmentId,
          treatmentOfferId: h.treatmentOfferId,
          patientProfileId: h.patientProfileId,
          facilityId: h.facilityId,
          status: h.status,
          holdCategory: h.holdCategory,
          categoryLabel: categoryMap.get(h.holdCategory) || getReadableHoldCategoryLabel(h.holdCategory),
          reason: h.reason,
          clinicalNotes: h.clinicalNotes,
          declaredBy: h.declaredBy,
          declaredByName,
          declaredAt: h.declaredAt.toISOString(),
          resolvedBy: h.resolvedBy,
          resolvedByName,
          resolvedAt: h.resolvedAt ? h.resolvedAt.toISOString() : null,
          resolutionNotes: h.resolutionNotes,
          durationSeconds: h.durationSeconds,
          isLegacyParsed: false,
        };
      });
    } catch {}

    // Merge any legacy parsed safety holds from clinical indication text without duplicating
    for (const legacyHold of parsedIndication.legacySafetyHolds) {
      if (!structuredSafetyHolds.some((h) => h.holdId === legacyHold.holdId)) {
        structuredSafetyHolds.push(legacyHold);
      }
    }

    return {
      treatmentOfferId: offer.id,
      offerNumber: offer.offerNumber,
      overallStatus,
      completedGatesCount: completedGates,
      totalGatesCount: totalGates,
      readinessPercentage,
      cleanClinicalIndication: parsedIndication.cleanClinicalIndication,
      hasLegacySafetyHoldData: parsedIndication.hasLegacyData,
      hasAmbiguousLegacyData: parsedIndication.hasAmbiguousData,
      safetyHolds: structuredSafetyHolds,
      policy: {
        id: applicablePolicy?.id || 'POL-DEFAULT',
        policyNumber: applicablePolicy?.policyNumber || 'POL-CLEAR-DEFAULT',
        name: applicablePolicy?.name || 'Standard Clinical Clearance Policy',
        version: applicablePolicy?.version || 1,
        schedulingPrerequisites: applicablePolicy?.schedulingPrerequisites || [],
      },
      requirements: dynamicRequirements,
      availableLabReports: patientLabReports.map((l) => ({
        id: l.id,
        laboratoryName: l.laboratoryName,
        reportedDate: l.reportedDate.toISOString(),
        status: l.status,
        overallNotes: l.overallNotes,
        testItems: l.testItems.map((t) => ({
          testName: t.testName,
          resultValue: t.numericValue !== null && t.numericValue !== undefined ? String(t.numericValue) : (t.textValue || ''),
          unit: t.unit || '',
          referenceRange: t.referenceRange || '',
          interpretation: t.flag || 'NORMAL',
        })),
      })),

      // ─── Legacy compatibility fields ──────────────────────────────────────
      cardiologyClearance: {
        status: cardiologySub ? cardiologySub.status : (specReq?.status || 'PENDING'),
        clearedBy: cardiologySub?.reviewerId || null,
        clearedAt: cardiologySub?.decisionTimestamp || null,
        notes: cardiologySub?.clinicalRemarks || null,
      },
      anesthesiaClearance: {
        status: anesthesiaSub ? anesthesiaSub.status : (specReq?.status || 'PENDING'),
        clearedBy: anesthesiaSub?.reviewerId || null,
        clearedAt: anesthesiaSub?.decisionTimestamp || null,
        notes: anesthesiaSub?.clinicalRemarks || null,
      },
      medicalClearance: {
        status: medicalSub ? medicalSub.status : (specReq?.status || 'PENDING'),
        clearedBy: medicalSub?.reviewerId || null,
        clearedAt: medicalSub?.decisionTimestamp || null,
        notes: medicalSub?.clinicalRemarks || null,
      },
      surgicalClearance: {
        status: surgReq ? surgReq.status : 'PENDING',
        clearedBy: surgReq?.clearedBy || null,
        clearedAt: surgReq?.clearedAt || null,
        notes: surgReq?.notes || null,
      },
      labClearance: {
        status: labReq ? labReq.status : 'PENDING',
        clearedBy: labReq?.clearedBy || null,
        clearedAt: labReq?.clearedAt || null,
        notes: labReq?.notes || null,
      },
      lastUpdatedBy: userId,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  /**
   * Submits a clearance decision (or batch of decisions) for a treatment offer.
   * Supports both dynamic structured DTO and legacy keys.
   */
  async updateOfferClearance(
    userId: string,
    offerId: string,
    payload: UpdateOfferClearancePayloadDto,
    roles: string[] = ['DOCTOR'],
  ) {
    const isClinician = roles.some((r) =>
      ['DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'STAFF'].includes(r)
    );
    if (!isClinician) {
      throw new ForbiddenException('Only authorized clinical personnel can submit clearance decisions.');
    }

    const offer = await this.db.treatmentOffer.findUnique({
      where: { id: offerId },
      include: { procedures: true },
    });
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    // Ensure clearance record and baseline decisions exist
    await this.getOfferClearance(userId, offerId, roles);

    const record = await this.db.treatmentOfferClearanceRecord.findUnique({
      where: { treatmentOfferId: offer.id },
      include: { decisions: true },
    });
    if (!record) {
      throw new NotFoundException(`Clearance record for offer '${offerId}' not found`);
    }

    // Parse all decisions from payload (handling strings, objects, legacy keys, and structured decisions)
    const decisionsToApply: SubmitClearanceDecisionDto[] = [];

    // 1. Check if decisions array passed
    if (payload.decisions && Array.isArray(payload.decisions)) {
      decisionsToApply.push(...payload.decisions);
    }

    // 2. Check top-level single decision fields
    if (payload.requirementCode) {
      decisionsToApply.push({
        requirementCode: payload.requirementCode,
        status: payload.status || 'CLEARED',
        specialty: payload.specialty,
        evidenceRecordId: payload.evidenceRecordId,
        clinicalRemarks: payload.clinicalRemarks,
      });
    }

    // 3. Normalize legacy keys
    const normalizeLegacy = (fieldVal: any, code: string, specialty?: string) => {
      if (!fieldVal) return;
      let status = 'CLEARED';
      let remarks = payload.notes || undefined;
      if (typeof fieldVal === 'string') {
        status = fieldVal.trim().toUpperCase();
      } else if (typeof fieldVal === 'object' && fieldVal !== null) {
        status = (fieldVal.status || 'CLEARED').toUpperCase();
        remarks = fieldVal.notes || remarks;
      }
      decisionsToApply.push({
        requirementCode: code,
        status,
        specialty,
        clinicalRemarks: remarks,
      });
    };

    if (payload.labClearance) {
      normalizeLegacy(payload.labClearance, 'REQ-LAB-METABOLIC');
    }
    if (payload.anesthesiaClearance) {
      normalizeLegacy(payload.anesthesiaClearance, 'REQ-SPEC-CLEARANCE', 'ANESTHESIA');
    }
    if (payload.cardiologyClearance) {
      normalizeLegacy(payload.cardiologyClearance, 'REQ-SPEC-CLEARANCE', 'CARDIOLOGY');
    }
    if (payload.medicalClearance) {
      normalizeLegacy(payload.medicalClearance, 'REQ-SPEC-CLEARANCE', 'MEDICAL');
    }
    if (payload.surgicalClearance) {
      normalizeLegacy(payload.surgicalClearance, 'REQ-SURGICAL-PREP');
    }

    if (decisionsToApply.length === 0) {
      throw new BadRequestException('No clearance decisions or updates provided in payload.');
    }

    // Apply decisions in transaction
    await this.db.$transaction(async (tx) => {
      for (const dec of decisionsToApply) {
        const req = await tx.clearanceRequirement.findFirst({
          where: {
            OR: [
              { code: dec.requirementCode },
              { id: dec.requirementCode },
              ...(dec.requirementCode === 'REQ-SURG-READY' ? [{ code: 'REQ-SURGICAL-PREP' }] : []),
              ...(dec.requirementCode === 'REQ-SURGICAL-PREP' ? [{ code: 'REQ-SURG-READY' }] : []),
            ],
          },
        });
        if (!req) {
          this.logger.warn(`Clearance requirement '${dec.requirementCode}' not found. Skipping.`);
          continue;
        }

        // EVIDENCE VALIDATION:
        // For requirements requiring laboratory evidence, ensure evidence is on file or provided
        if (req.requiredEvidenceType === 'LAB_RESULT' && dec.status === 'CLEARED') {
          let hasEvidence = false;
          if (dec.evidenceRecordId) {
            const labRep = await tx.laboratoryReport.findFirst({
              where: { id: dec.evidenceRecordId, patientProfileId: offer.patientProfileId },
            });
            if (labRep) hasEvidence = true;
          } else {
            // Check if patient has any lab report on file
            const patientLabs = await tx.laboratoryReport.count({
              where: { patientProfileId: offer.patientProfileId },
            });
            if (patientLabs > 0) hasEvidence = true;
          }

          if (!hasEvidence) {
            throw new BadRequestException(
              `Evidence verification required: No laboratory report on file for patient ${offer.patientProfileId}. Laboratory evidence must be uploaded or reviewed before clearance can be ratified.`
            );
          }
        }

        const now = new Date();
        const specialtyVal = dec.specialty || null;

        // Find existing decision item for this requirement & specialty
        const existingDec = await tx.clearanceDecisionItem.findFirst({
          where: {
            clearanceRecordId: record.id,
            requirementId: req.id,
            specialty: specialtyVal,
          },
        });

        const auditEntry = {
          timestamp: now.toISOString(),
          reviewerId: userId,
          roles,
          previousStatus: existingDec ? existingDec.status : 'PENDING',
          newStatus: dec.status,
          remarks: dec.clinicalRemarks || null,
        };

        const existingAudit: any[] = (existingDec?.auditTrail as any[]) || [];
        existingAudit.push(auditEntry);

        if (existingDec) {
          await tx.clearanceDecisionItem.update({
            where: { id: existingDec.id },
            data: {
              status: dec.status,
              reviewerId: userId,
              reviewerRole: roles[0] || 'DOCTOR',
              evidenceType: dec.evidenceType || req.requiredEvidenceType,
              evidenceRecordId: dec.evidenceRecordId || existingDec.evidenceRecordId,
              evidenceMetadata: dec.evidenceMetadata || existingDec.evidenceMetadata,
              clinicalRemarks: dec.clinicalRemarks || existingDec.clinicalRemarks || `Cleared by ${roles[0] || 'Clinician'}`,
              decisionTimestamp: now,
              auditTrail: existingAudit,
            },
          });
        } else {
          await tx.clearanceDecisionItem.create({
            data: {
              clearanceRecordId: record.id,
              requirementId: req.id,
              requirementCode: req.code,
              specialty: specialtyVal,
              status: dec.status,
              reviewerId: userId,
              reviewerRole: roles[0] || 'DOCTOR',
              evidenceType: dec.evidenceType || req.requiredEvidenceType,
              evidenceRecordId: dec.evidenceRecordId || null,
              evidenceMetadata: dec.evidenceMetadata || null,
              clinicalRemarks: dec.clinicalRemarks || `Cleared by ${roles[0] || 'Clinician'}`,
              decisionTimestamp: now,
              auditTrail: existingAudit,
            },
          });
        }
      }

      // Record to TreatmentOfferHistory for auditable record
      await tx.treatmentOfferHistory.create({
        data: {
          treatmentOfferId: offer.id,
          action: 'PRE_OP_CLEARANCE_UPDATE',
          previousStatus: offer.status,
          newStatus: offer.status,
          performedBy: userId,
          performerRole: roles[0] || 'DOCTOR',
          notes: payload.notes || `Clinical clearance decision submitted: ${decisionsToApply.map((d) => `${d.requirementCode}${d.specialty ? ` (${d.specialty})` : ''}=${d.status}`).join(', ')}`,
          metadata: {
            updatedAt: new Date().toISOString(),
            appliedDecisions: decisionsToApply,
          } as any,
        },
      });
    });

    // Re-evaluate and return the full updated clearance state
    return this.getOfferClearance(userId, offerId, roles);
  }

  /**
   * Validates whether an offer has satisfied all required clearances to proceed with slot booking.
   * Enforced in appointment creation.
   */
  async validateOfferReadinessForBooking(offerId: string) {
    const offer = await this.db.treatmentOffer.findUnique({
      where: { id: offerId },
      include: { procedures: true },
    });
    if (!offer) {
      throw new NotFoundException(`Treatment offer '${offerId}' not found`);
    }

    const clearance = await this.getOfferClearance('SYSTEM', offerId, ['ADMIN']);
    const policy = clearance.policy;
    const prerequisites = policy.schedulingPrerequisites || [];

    const missingPrerequisites: string[] = [];

    for (const req of clearance.requirements) {
      const isPrereq = prerequisites.includes(req.code) || (req.isMandatory && prerequisites.length === 0);
      if (isPrereq && !['CLEARED', 'APPROVED', 'WAIVED'].includes(req.status)) {
        missingPrerequisites.push(`${req.name} (${req.code}): ${req.unmetReason || req.status}`);
      }
    }

    if (missingPrerequisites.length > 0) {
      throw new BadRequestException(
        `Cannot schedule appointment: Pre-treatment clinical clearance prerequisites are incomplete:\n- ${missingPrerequisites.join('\n- ')}`
      );
    }

    return {
      isEligible: true,
      overallStatus: clearance.overallStatus,
      completedGatesCount: clearance.completedGatesCount,
      totalGatesCount: clearance.totalGatesCount,
    };
  }
}
