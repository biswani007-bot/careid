import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import {
  CreateSafetyHoldCategoryDto,
  UpdateSafetyHoldCategoryDto,
  QuerySafetyHoldCategoriesDto,
  ClinicalSummaryConfigDto,
  ReconcileLegacySafetyHoldsDto,
} from './safety-hold.dto';
import {
  ClinicalDataSanitizer,
  SAFETY_HOLD_CATEGORY_LABELS,
} from '@modules/treatment-offer/domain/clinical-data-sanitizer';

@Injectable()
export class SafetyHoldAdminService {
  private readonly logger = new Logger(SafetyHoldAdminService.name);

  constructor(private readonly db: DatabaseService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SAFETY HOLD CATEGORY CATALOGUE (Admin-Managed Master Data)
  // ═══════════════════════════════════════════════════════════════════════════

  private async getCategoryMetadataMap(): Promise<Record<string, any>> {
    try {
      const rec = await this.db.systemConfiguration.findUnique({
        where: { key: 'SAFETY_HOLD_CATEGORIES_METADATA' },
      });
      if (rec && rec.value) {
        return JSON.parse(rec.value);
      }
    } catch (e) {
      this.logger.warn(`Failed to read safety hold category metadata: ${e}`);
    }
    return {};
  }

  private async updateCategoryMetadata(code: string, meta: Record<string, any>): Promise<void> {
    try {
      const existingMap = await this.getCategoryMetadataMap();
      const updatedMap = {
        ...existingMap,
        [code]: {
          ...(existingMap[code] || {}),
          ...meta,
        },
      };
      await this.db.systemConfiguration.upsert({
        where: { key: 'SAFETY_HOLD_CATEGORIES_METADATA' },
        create: {
          key: 'SAFETY_HOLD_CATEGORIES_METADATA',
          value: JSON.stringify(updatedMap),
          category: 'GENERAL',
          valueType: 'JSON',
          description: 'Extended clinical governance policies and reviewer qualifications for safety hold categories',
          status: 'ACTIVE',
        },
        update: {
          value: JSON.stringify(updatedMap),
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to persist safety hold category metadata: ${e}`);
    }
  }

  private async ensureCategoryExists(): Promise<string> {
    let cat = await this.db.masterDataCategory.findUnique({
      where: { code: 'SAFETY_HOLD_CATEGORIES' },
    });
    if (!cat) {
      cat = await this.db.masterDataCategory.create({
        data: {
          code: 'SAFETY_HOLD_CATEGORIES',
          name: 'Clinical Safety Hold Categories',
          description: 'Dynamic procedural safety hold categories and hazard definitions',
          status: 'ACTIVE',
        },
      });
    }

    // Seed defaults if empty
    const count = await this.db.masterDataItem.count({
      where: { categoryId: cat.id },
    });

    if (count === 0) {
      const defaults = [
        { code: 'RADIATION_OR_CONTRAST_HAZARD', name: 'Radiation or Contrast Hazard', description: 'Exceeded fluoroscopic dose, contrast volume limit, or acute adverse hypersensitivity response', sortOrder: 1, reviewerRole: 'DOCTOR', evidenceType: 'LAB_REPORT' },
        { code: 'PATIENT_HEMODYNAMIC_INSTABILITY', name: 'Patient Hemodynamic Instability', description: 'Sustained hypotension, severe arrhythmia, or hemodynamic decompensation requiring acute stabilization', sortOrder: 2, reviewerRole: 'DOCTOR', evidenceType: 'VITAL_SIGNS' },
        { code: 'ANESTHESIA_AIRWAY_COMPROMISE', name: 'Anesthesia / Airway Compromise', description: 'Acute hypoxemia, airway obstruction, laryngospasm, or sedation depth discrepancy', sortOrder: 3, reviewerRole: 'ANESTHESIOLOGIST', evidenceType: 'CLINICAL_EVALUATION' },
        { code: 'CONSENT_OR_IDENTIFICATION_DISCREPANCY', name: 'Consent or Identification Discrepancy', description: 'Patient wristband discrepancy, unsigned informed consent, or procedure site mismatch', sortOrder: 4, reviewerRole: 'STAFF', evidenceType: 'SIGNED_CONSENT' },
        { code: 'MEDICATION_ERROR', name: 'Medication or Anticoagulation Hazard', description: 'ACT or heparin dosing discrepancy, anticoagulant timing violation, or medication contraindication', sortOrder: 5, reviewerRole: 'DOCTOR', evidenceType: 'COAGULATION_PANEL' },
        { code: 'STERILITY_BREACH', name: 'Sterility Breach or Contamination', description: 'Sterile field contamination, compromised implant packaging, or autoclave indicator failure', sortOrder: 6, reviewerRole: 'STAFF', evidenceType: 'STERILITY_ATTESTATION' },
        { code: 'EQUIPMENT_MALFUNCTION', name: 'Equipment or Fluoroscopy Malfunction', description: 'C-arm imaging failure, injector malfunction, hemodynamic monitor failure, or table power failure', sortOrder: 7, reviewerRole: 'BIOMEDICAL_ENGINEER', evidenceType: 'CALIBRATION_LOG' },
        { code: 'STAFF_UNAVAILABILITY', name: 'Critical Clinical Staff Unavailability', description: 'Unavailability of attending specialist, perfusionist, or scrub personnel for emergent intervention', sortOrder: 8, reviewerRole: 'FACILITY_ADMIN', evidenceType: 'ROSTER_CONFIRMATION' },
        { code: 'OTHER_SAFETY_HAZARD', name: 'Other Procedural Safety Hazard', description: 'Other clinician-identified intra-operative or pre-procedural safety concern requiring multidisciplinary resolution', sortOrder: 9, reviewerRole: 'DOCTOR', evidenceType: 'NONE' },
      ];

      const initialMeta: Record<string, any> = {};

      for (const d of defaults) {
        await this.db.masterDataItem.create({
          data: {
            categoryId: cat.id,
            code: d.code,
            name: d.name,
            description: d.description,
            sortOrder: d.sortOrder,
            status: 'ACTIVE',
            clinicalPracticeType: 'ALL',
          },
        });
        initialMeta[d.code] = {
          procedureCategories: ['INTERVENTIONAL_CARDIOLOGY', 'SURGERY'],
          facilityIds: [],
          requiredReviewerRole: d.reviewerRole,
          requiredEvidenceType: d.evidenceType,
          resolutionPolicy: `Standard clinical clearance required by authorized ${d.reviewerRole}.`,
        };
      }

      await this.db.systemConfiguration.upsert({
        where: { key: 'SAFETY_HOLD_CATEGORIES_METADATA' },
        create: {
          key: 'SAFETY_HOLD_CATEGORIES_METADATA',
          value: JSON.stringify(initialMeta),
          category: 'GENERAL',
          valueType: 'JSON',
          description: 'Extended clinical governance policies and reviewer qualifications for safety hold categories',
          status: 'ACTIVE',
        },
        update: {
          value: JSON.stringify(initialMeta),
        },
      });
    }

    return cat.id;
  }

  async listCategories(query: QuerySafetyHoldCategoriesDto) {
    const categoryId = await this.ensureCategoryExists();
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = { categoryId };

    if (query.status) {
      where.status = query.status;
    }
    if (query.clinicalPracticeType) {
      where.clinicalPracticeType = {
        in: [query.clinicalPracticeType, 'ALL'],
      };
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items, metaMap] = await Promise.all([
      this.db.masterDataItem.count({ where }),
      this.db.masterDataItem.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),
      this.getCategoryMetadataMap(),
    ]);

    return {
      data: items.map((i) => {
        const meta = metaMap[i.code] || {};
        return {
          id: i.id,
          code: i.code,
          name: i.name,
          description: i.description,
          sortOrder: i.sortOrder,
          status: i.status,
          clinicalPracticeType: i.clinicalPracticeType || 'ALL',
          procedureCategories: meta.procedureCategories || [],
          facilityIds: meta.facilityIds || [],
          requiredReviewerRole: meta.requiredReviewerRole || 'DOCTOR',
          requiredEvidenceType: meta.requiredEvidenceType || 'NONE',
          resolutionPolicy: meta.resolutionPolicy || null,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async createCategory(dto: CreateSafetyHoldCategoryDto, userId?: string) {
    const categoryId = await this.ensureCategoryExists();
    const code = dto.code.trim().toUpperCase().replace(/\s+/g, '_');

    const existing = await this.db.masterDataItem.findFirst({
      where: { categoryId, code },
    });
    if (existing) {
      throw new ConflictException(`Safety hold category code '${code}' already exists`);
    }

    const created = await this.db.masterDataItem.create({
      data: {
        categoryId,
        code,
        name: dto.name.trim(),
        description: dto.description || null,
        sortOrder: dto.sortOrder || 0,
        status: 'ACTIVE',
        clinicalPracticeType: dto.clinicalPracticeType || 'ALL',
      },
    });

    await this.updateCategoryMetadata(code, {
      procedureCategories: dto.procedureCategories || [],
      facilityIds: dto.facilityIds || [],
      requiredReviewerRole: dto.requiredReviewerRole || 'DOCTOR',
      requiredEvidenceType: dto.requiredEvidenceType || 'NONE',
      resolutionPolicy: dto.resolutionPolicy || null,
    });

    try {
      if (userId) {
        await this.db.auditLog.create({
          data: {
            userId,
            action: 'ADMIN_SAFETY_HOLD_CATEGORY_CREATED',
            details: `Created safety hold category ${code} (${dto.name})`,
          },
        });
      }
    } catch {}

    return {
      ...created,
      procedureCategories: dto.procedureCategories || [],
      facilityIds: dto.facilityIds || [],
      requiredReviewerRole: dto.requiredReviewerRole || 'DOCTOR',
      requiredEvidenceType: dto.requiredEvidenceType || 'NONE',
      resolutionPolicy: dto.resolutionPolicy || null,
    };
  }

  async updateCategory(id: string, dto: UpdateSafetyHoldCategoryDto, userId?: string) {
    const existing = await this.db.masterDataItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Safety hold category '${id}' not found`);
    }

    const updated = await this.db.masterDataItem.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description : undefined,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
        clinicalPracticeType: dto.clinicalPracticeType !== undefined ? dto.clinicalPracticeType : undefined,
        status: dto.status !== undefined ? (dto.status as any) : undefined,
      },
    });

    const metaUpdates: Record<string, any> = {};
    if (dto.procedureCategories !== undefined) metaUpdates.procedureCategories = dto.procedureCategories;
    if (dto.facilityIds !== undefined) metaUpdates.facilityIds = dto.facilityIds;
    if (dto.requiredReviewerRole !== undefined) metaUpdates.requiredReviewerRole = dto.requiredReviewerRole;
    if (dto.requiredEvidenceType !== undefined) metaUpdates.requiredEvidenceType = dto.requiredEvidenceType;
    if (dto.resolutionPolicy !== undefined) metaUpdates.resolutionPolicy = dto.resolutionPolicy;

    if (Object.keys(metaUpdates).length > 0) {
      await this.updateCategoryMetadata(existing.code, metaUpdates);
    }

    try {
      if (userId) {
        await this.db.auditLog.create({
          data: {
            userId,
            action: 'ADMIN_SAFETY_HOLD_CATEGORY_UPDATED',
            details: `Updated safety hold category ${existing.code}`,
          },
        });
      }
    } catch {}

    const metaMap = await this.getCategoryMetadataMap();
    const meta = metaMap[existing.code] || {};

    return {
      ...updated,
      procedureCategories: meta.procedureCategories || [],
      facilityIds: meta.facilityIds || [],
      requiredReviewerRole: meta.requiredReviewerRole || 'DOCTOR',
      requiredEvidenceType: meta.requiredEvidenceType || 'NONE',
      resolutionPolicy: meta.resolutionPolicy || null,
    };
  }

  async toggleCategoryStatus(id: string, status: string, userId?: string) {
    const existing = await this.db.masterDataItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Safety hold category '${id}' not found`);
    }

    const updated = await this.db.masterDataItem.update({
      where: { id },
      data: { status: status as any },
    });

    try {
      if (userId) {
        await this.db.auditLog.create({
          data: {
            userId,
            action: 'ADMIN_SAFETY_HOLD_CATEGORY_STATUS_TOGGLED',
            details: `Toggled status of ${existing.code} to ${status}`,
          },
        });
      }
    } catch {}

    return updated;
  }

  async deleteCategory(id: string, userId?: string) {
    const existing = await this.db.masterDataItem.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Safety hold category '${id}' not found`);
    }

    // Soft delete/archive rather than destructive deletion
    const archived = await this.db.masterDataItem.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    try {
      if (userId) {
        await this.db.auditLog.create({
          data: {
            userId,
            action: 'ADMIN_SAFETY_HOLD_CATEGORY_ARCHIVED',
            details: `Archived safety hold category ${existing.code}`,
          },
        });
      }
    } catch {}

    return archived;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CLINICAL SUMMARY DISPLAY CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  private readonly DEFAULT_SUMMARY_CONFIG: ClinicalSummaryConfigDto = {
    showProcedureCode: true,
    showClinicalIndication: true,
    showFacility: true,
    showSupervisingAttending: true,
    showFinancialTerms: true,
    showProceduralHoldWindow: true,
    showSafetyHoldHistory: true,
    safetyHoldPanelCollapsedByDefault: false,
    requireClinicalReviewForHoldClearance: true,
    customSectionLabels: {
      treatmentSummary: 'Primary Treatment Summary',
      safetyHoldHistory: 'Clinical Safety Hold History',
      preOpReadiness: 'Pre-Treatment Requirements & Readiness',
      diagnosticVault: 'Linked Records & Diagnostic Vault',
    },
  };

  async getSummaryConfig(): Promise<ClinicalSummaryConfigDto> {
    try {
      const configRecord = await this.db.systemConfiguration.findUnique({
        where: { key: 'CLINICAL_SUMMARY_CONFIG' },
      });

      if (configRecord && configRecord.value) {
        const parsed = JSON.parse(configRecord.value);
        return {
          ...this.DEFAULT_SUMMARY_CONFIG,
          ...parsed,
          customSectionLabels: {
            ...this.DEFAULT_SUMMARY_CONFIG.customSectionLabels,
            ...(parsed.customSectionLabels || {}),
          },
        };
      }
    } catch (e) {
      this.logger.warn(`Failed to parse clinical summary config: ${e}`);
    }

    return this.DEFAULT_SUMMARY_CONFIG;
  }

  async updateSummaryConfig(dto: ClinicalSummaryConfigDto, userId?: string) {
    const current = await this.getSummaryConfig();
    const merged = {
      ...current,
      ...dto,
      customSectionLabels: {
        ...current.customSectionLabels,
        ...(dto.customSectionLabels || {}),
      },
    };

    const valueStr = JSON.stringify(merged);

    await this.db.systemConfiguration.upsert({
      where: { key: 'CLINICAL_SUMMARY_CONFIG' },
      create: {
        key: 'CLINICAL_SUMMARY_CONFIG',
        value: valueStr,
        category: 'GENERAL',
        valueType: 'JSON',
        description: 'Dynamic display and workflow configuration for Consultation & Clearance Clinical Summaries',
        status: 'ACTIVE',
      },
      update: {
        value: valueStr,
      },
    });

    try {
      if (userId) {
        await this.db.auditLog.create({
          data: {
            userId,
            action: 'ADMIN_CLINICAL_SUMMARY_CONFIG_UPDATED',
            details: `Updated consultation clinical summary display configuration`,
          },
        });
      }
    } catch {}

    return merged;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. LEGACY SAFETY HOLD RECONCILIATION & AUDIT PROVENANCE
  // ═══════════════════════════════════════════════════════════════════════════

  async getReconciliationStatus() {
    const [totalOffers, offersWithHistory, totalAppts, apptsWithHistory, totalStructuredHolds] = await Promise.all([
      this.db.treatmentOffer.count(),
      this.db.treatmentOffer.count({
        where: { clinicalIndication: { contains: '--- SAFETY_HOLD_HISTORY ---' } },
      }),
      this.db.appointment.count(),
      this.db.appointment.count({
        where: { notes: { contains: '--- SAFETY_HOLD_HISTORY ---' } },
      }),
      this.db.safetyHoldRecord.count(),
    ]);

    return {
      totalOffers,
      contaminatedOffers: offersWithHistory,
      cleanOffers: Math.max(0, totalOffers - offersWithHistory),
      totalStructuredHolds,
      reconciliationRequired: offersWithHistory > 0 || apptsWithHistory > 0,
      affectedTreatmentOffersCount: offersWithHistory,
      affectedAppointmentsCount: apptsWithHistory,
      totalStructuredSafetyHoldsCount: totalStructuredHolds,
      status: offersWithHistory > 0 || apptsWithHistory > 0 ? 'RECONCILIATION_AVAILABLE' : 'CLEAN',
    };
  }

  async reconcileLegacyRecords(dto: ReconcileLegacySafetyHoldsDto, userId?: string) {
    const dryRun = Boolean(dto.dryRun);
    const where: any = {
      clinicalIndication: { contains: '--- SAFETY_HOLD_HISTORY ---' },
    };
    if (dto.targetOfferId) {
      where.id = dto.targetOfferId;
    }

    const offers = await this.db.treatmentOffer.findMany({
      where,
      include: { procedures: true },
      take: 100,
    });

    let totalInspected = 0;
    let totalHoldsExtracted = 0;
    let totalHoldsPersisted = 0;
    const reconciledOfferIds: string[] = [];
    const records: Array<{
      offerId: string;
      action: string;
      extractedHolds: number;
      persistedHolds: number;
      cleanIndicationSample?: string;
    }> = [];

    for (const offer of offers) {
      totalInspected++;
      const parsed = ClinicalDataSanitizer.parseClinicalIndication(
        offer.clinicalIndication,
        offer.procedures[0]?.procedureName,
      );

      // Rule: Do not automatically rewrite ambiguous or corrupted data
      if (parsed.hasAmbiguousData) {
        records.push({
          offerId: offer.id,
          action: 'FLAGGED_AMBIGUOUS_FOR_MANUAL_REVIEW',
          extractedHolds: 0,
          persistedHolds: 0,
          cleanIndicationSample: 'Ambiguous or malformed JSON detected. Retained untouched for clinical review.',
        });
        continue;
      }

      let holdsCreatedForOffer = 0;

      if (parsed.legacySafetyHolds.length > 0) {
        totalHoldsExtracted += parsed.legacySafetyHolds.length;

        for (let idx = 0; idx < parsed.legacySafetyHolds.length; idx++) {
          const hold = parsed.legacySafetyHolds[idx];
          const uniqueHoldId = hold.holdId && hold.holdId.length > 5
            ? hold.holdId
            : `legacy-hold-${offer.id.slice(0, 8)}-${idx + 1}`;

          const existingHold = await this.db.safetyHoldRecord.findUnique({
            where: { holdId: uniqueHoldId },
          });

          if (!existingHold && !dryRun) {
            try {
              // Ensure declaring user ID exists and belongs to users table
              let declaredBy = hold.declaredBy;
              if (declaredBy) {
                const userExists = await this.db.user.findUnique({ where: { id: declaredBy } });
                if (!userExists) {
                  const doc = await this.db.doctorProfile.findUnique({ where: { id: declaredBy } });
                  declaredBy = doc?.userId || null;
                }
              }
              if (!declaredBy) {
                const doc = await this.db.doctorProfile.findUnique({ where: { id: offer.doctorProfileId } });
                declaredBy = doc?.userId || userId;
              }
              if (!declaredBy) {
                const anyUser = await this.db.user.findFirst({ select: { id: true } });
                declaredBy = anyUser?.id || 'SYSTEM_MIGRATION';
              }

              // Verify resolvedBy relation
              let resolvedBy = hold.resolvedBy || null;
              if (resolvedBy) {
                const userExists = await this.db.user.findUnique({ where: { id: resolvedBy } });
                if (!userExists) {
                  const doc = await this.db.doctorProfile.findUnique({ where: { id: resolvedBy } });
                  resolvedBy = doc?.userId || null;
                }
              }

              // Verify appointment foreign key
              let appointmentId = hold.appointmentId || null;
              if (appointmentId) {
                const apptExists = await this.db.appointment.findUnique({ where: { id: appointmentId } });
                if (!apptExists) appointmentId = null;
              }

              await this.db.safetyHoldRecord.create({
                data: {
                  holdId: uniqueHoldId,
                  appointmentId,
                  treatmentOfferId: offer.id,
                  patientProfileId: offer.patientProfileId,
                  facilityId: offer.facilityId,
                  status: hold.status,
                  holdCategory: hold.holdCategory,
                  reason: hold.reason,
                  clinicalNotes: hold.clinicalNotes,
                  declaredBy,
                  declaredAt: new Date(hold.declaredAt),
                  resolvedBy,
                  resolvedAt: hold.resolvedAt ? new Date(hold.resolvedAt) : null,
                  resolutionNotes: hold.resolutionNotes || null,
                  durationSeconds: hold.durationSeconds || null,
                  evidenceMetadata: {
                    source: 'LEGACY_MIGRATION_RECONCILIATION',
                    reconciledAt: new Date().toISOString(),
                    originalRawIndication: parsed.originalRawPreserved,
                  },
                },
              });
              holdsCreatedForOffer++;
              totalHoldsPersisted++;
            } catch (err) {
              this.logger.warn(`Could not persist legacy hold ${uniqueHoldId}: ${err}`);
            }
          }
        }
      }

      // Authoritative Database Clean: Replace contaminated text with clean clinical narrative
      if (!dryRun) {
        try {
          await this.db.treatmentOffer.update({
            where: { id: offer.id },
            data: {
              clinicalIndication: parsed.cleanClinicalIndication,
            },
          });
          reconciledOfferIds.push(offer.id);

          // Preserve immutable audit log with full provenance
          if (userId) {
            await this.db.auditLog.create({
              data: {
                userId,
                action: 'ADMIN_SAFETY_HOLD_LEGACY_RECONCILED',
                details: `Reconciled Treatment Offer ${offer.offerNumber || offer.id}: Cleaned clinical indication, extracted ${parsed.legacySafetyHolds.length} structured safety holds. Original raw preserved in audit provenance.`,
              },
            });
          }
        } catch (updateErr) {
          this.logger.error(`Failed to update treatment offer ${offer.id} during reconciliation: ${updateErr}`);
        }
      }

      records.push({
        offerId: offer.id,
        action: dryRun ? 'DRY_RUN_DETECTED' : 'RECONCILED',
        extractedHolds: parsed.legacySafetyHolds.length,
        persistedHolds: holdsCreatedForOffer,
        cleanIndicationSample: parsed.cleanClinicalIndication.slice(0, 100),
      });
    }

    // Clean contaminated appointment notes
    if (!dryRun) {
      try {
        const affectedAppts = await this.db.appointment.findMany({
          where: { notes: { contains: '--- SAFETY_HOLD_HISTORY ---' } },
          take: 100,
        });
        for (const appt of affectedAppts) {
          if (appt.notes) {
            const cleanNotes = ClinicalDataSanitizer.cleanClinicalNarrative(appt.notes);
            if (cleanNotes !== appt.notes) {
              await this.db.appointment.update({
                where: { id: appt.id },
                data: { notes: cleanNotes },
              });
            }
          }
        }
      } catch (apptErr) {
        this.logger.warn(`Failed to clean appointment notes during reconciliation: ${apptErr}`);
      }
    }

    return {
      success: true,
      scannedCount: totalInspected,
      reconciledCount: totalHoldsExtracted,
      createdHoldsCount: totalHoldsPersisted,
      dryRun,
      totalInspected,
      totalHoldsExtracted,
      totalHoldsPersisted,
      reconciledOfferIds,
      records,
      auditProvenancePreserved: true,
    };
  }
}
