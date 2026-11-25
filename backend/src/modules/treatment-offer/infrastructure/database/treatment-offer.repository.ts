import { Injectable, ConflictException, NotFoundException, InternalServerErrorException, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import {
  ITreatmentOfferRepository,
  CreateTreatmentOfferData,
  UpdateTreatmentOfferData,
} from '../../domain/repositories/treatment-offer.repository.interface';
import { TreatmentOfferStatus } from '@prisma/client';

@Injectable()
export class TreatmentOfferRepository implements ITreatmentOfferRepository, OnModuleInit {
  private readonly logger = new Logger(TreatmentOfferRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.db.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS treatment_offer_seq START WITH 1 INCREMENT BY 1;`);
      await this.db.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS financing_offer_seq START WITH 1 INCREMENT BY 1;`);
      // Synchronize sequences using an advisory transaction lock. Never moves sequences backwards.
      await this.db.$executeRawUnsafe(`
        DO $$
        DECLARE
          max_to_num BIGINT;
          curr_to_val BIGINT;
          max_fo_num BIGINT;
          curr_fo_val BIGINT;
        BEGIN
          -- Advisory lock to prevent race conditions during concurrent multi-instance application startups
          PERFORM pg_advisory_xact_lock(2147483647);

          SELECT COALESCE(MAX(NULLIF(regexp_replace(offer_number, '^TO-[0-9]{4}-0*', ''), ''))::bigint, 0)
          INTO max_to_num FROM treatment_offers WHERE offer_number LIKE 'TO-%';

          SELECT last_value INTO curr_to_val FROM treatment_offer_seq;

          IF max_to_num > curr_to_val THEN
            PERFORM setval('treatment_offer_seq', max_to_num, true);
          END IF;

          SELECT COALESCE(MAX(NULLIF(regexp_replace(offer_number, '^FO-[0-9]{4}-0*', ''), ''))::bigint, 0)
          INTO max_fo_num FROM financing_offers WHERE offer_number LIKE 'FO-%';

          SELECT last_value INTO curr_fo_val FROM financing_offer_seq;

          IF max_fo_num > curr_fo_val THEN
            PERFORM setval('financing_offer_seq', max_fo_num, true);
          END IF;
        END $$;
      `);
      this.logger.log('Offer sequence generators initialized and synchronized safely (forward-only, concurrency-locked)');
    } catch (err: any) {
      this.logger.warn(`Controlled sequence initialization: ${err.message}`);
    }
  }

  private offerInclude() {
    return {
      doctor: {
        select: {
          id: true,
          fullName: true,
          primarySpecialization: true,
          userId: true,
          clinicalPracticeType: true,
        },
      },
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
        },
      },
      facility: {
        select: {
          id: true,
          name: true,
          city: true,
        },
      },
      procedures: {
        orderBy: { sequenceOrder: 'asc' as const },
      },
      history: {
        orderBy: { createdAt: 'desc' as const },
      },
    };
  }

  async findOfferById(id: string): Promise<any | null> {
    return this.db.treatmentOffer.findUnique({
      where: { id },
      include: this.offerInclude(),
    });
  }

  async findOfferByNumber(offerNumber: string): Promise<any | null> {
    return this.db.treatmentOffer.findUnique({
      where: { offerNumber },
      include: this.offerInclude(),
    });
  }

  async generateOfferNumber(): Promise<string> {
    const year = new Date().getFullYear();
    let seqNum: number;
    try {
      const result: any = await this.db.$queryRaw`SELECT nextval('treatment_offer_seq')::text AS seq`;
      seqNum = result[0]?.seq ? parseInt(result[0].seq, 10) : 1;
    } catch (err: any) {
      // Attempt idempotent initialization and forward-only synchronization
      try {
        await this.db.$executeRawUnsafe(`
          CREATE SEQUENCE IF NOT EXISTS treatment_offer_seq START WITH 1 INCREMENT BY 1;
          DO $$
          DECLARE
            max_to_num BIGINT;
            curr_to_val BIGINT;
          BEGIN
            PERFORM pg_advisory_xact_lock(2147483647);
            SELECT COALESCE(MAX(NULLIF(regexp_replace(offer_number, '^TO-[0-9]{4}-0*', ''), ''))::bigint, 0)
            INTO max_to_num FROM treatment_offers WHERE offer_number LIKE 'TO-%';

            SELECT last_value INTO curr_to_val FROM treatment_offer_seq;
            IF max_to_num > curr_to_val THEN
              PERFORM setval('treatment_offer_seq', max_to_num, true);
            END IF;
          END $$;
        `);
        const result: any = await this.db.$queryRaw`SELECT nextval('treatment_offer_seq')::text AS seq`;
        seqNum = result[0]?.seq ? parseInt(result[0].seq, 10) : 1;
      } catch (innerErr: any) {
        this.logger.error(`Treatment offer sequence failure: ${innerErr?.message || err?.message}`);
        throw new InternalServerErrorException(
          `Atomic offer number sequence 'treatment_offer_seq' is unavailable or permissions prevent creation/access: ${innerErr?.message || err?.message}. Concurrency-unsafe fallback is prohibited.`,
        );
      }
    }

    const seq = seqNum.toString().padStart(5, '0');
    return `TO-${year}-${seq}`;
  }

  async generateFinancingOfferNumber(): Promise<string> {
    const year = new Date().getFullYear();
    let seqNum: number;
    try {
      const result: any = await this.db.$queryRaw`SELECT nextval('financing_offer_seq')::text AS seq`;
      seqNum = result[0]?.seq ? parseInt(result[0].seq, 10) : 1;
    } catch (err: any) {
      try {
        await this.db.$executeRawUnsafe(`
          CREATE SEQUENCE IF NOT EXISTS financing_offer_seq START WITH 1 INCREMENT BY 1;
          DO $$
          DECLARE
            max_fo_num BIGINT;
            curr_fo_val BIGINT;
          BEGIN
            PERFORM pg_advisory_xact_lock(2147483647);
            SELECT COALESCE(MAX(NULLIF(regexp_replace(offer_number, '^FO-[0-9]{4}-0*', ''), ''))::bigint, 0)
            INTO max_fo_num FROM financing_offers WHERE offer_number LIKE 'FO-%';

            SELECT last_value INTO curr_fo_val FROM financing_offer_seq;
            IF max_fo_num > curr_fo_val THEN
              PERFORM setval('financing_offer_seq', max_fo_num, true);
            END IF;
          END $$;
        `);
        const result: any = await this.db.$queryRaw`SELECT nextval('financing_offer_seq')::text AS seq`;
        seqNum = result[0]?.seq ? parseInt(result[0].seq, 10) : 1;
      } catch (innerErr: any) {
        this.logger.error(`Financing offer sequence failure: ${innerErr?.message || err?.message}`);
        throw new InternalServerErrorException(
          `Atomic financing offer number sequence 'financing_offer_seq' is unavailable or permissions prevent creation/access: ${innerErr?.message || err?.message}. Concurrency-unsafe fallback is prohibited.`,
        );
      }
    }

    const seq = seqNum.toString().padStart(5, '0');
    return `FO-${year}-${seq}`;
  }

  async findOffersForDoctor(
    doctorProfileId: string,
    filter: { status?: TreatmentOfferStatus; patientId?: string; search?: string; page: number; limit: number },
  ): Promise<{ items: any[]; total: number }> {
    const where: any = { doctorProfileId };
    if (filter.status) where.status = filter.status;
    if (filter.patientId) where.patientProfileId = filter.patientId;
    if (filter.search) {
      where.OR = [
        { offerNumber: { contains: filter.search, mode: 'insensitive' } },
        { clinicalIndication: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.treatmentOffer.findMany({
        where,
        include: this.offerInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.db.treatmentOffer.count({ where }),
    ]);

    return { items, total };
  }

  async findOffersForPatient(
    patientProfileId: string,
    filter: { status?: TreatmentOfferStatus; search?: string; page: number; limit: number },
  ): Promise<{ items: any[]; total: number }> {
    const where: any = {
      patientProfileId,
      status: { not: TreatmentOfferStatus.DRAFT }, // Patients cannot see drafts
    };
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { offerNumber: { contains: filter.search, mode: 'insensitive' } },
        { clinicalIndication: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.treatmentOffer.findMany({
        where,
        include: this.offerInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.db.treatmentOffer.count({ where }),
    ]);

    return { items, total };
  }

  async createOffer(data: CreateTreatmentOfferData): Promise<any> {
    return this.db.$transaction(async (tx) => {
      const offer = await tx.treatmentOffer.create({
        data: {
          offerNumber: data.offerNumber,
          doctorProfileId: data.doctorProfileId,
          patientProfileId: data.patientProfileId,
          facilityId: data.facilityId,
          encounterId: data.encounterId,
          clinicalIndication: data.clinicalIndication,
          grossEstimate: data.grossEstimate,
          discountAmount: data.discountAmount,
          netPayable: data.netPayable,
          currency: data.currency || 'PKR',
          financingEligible: data.financingEligible || false,
          recommendedTenureMonths: data.recommendedTenureMonths,
          status: TreatmentOfferStatus.DRAFT,
          validUntil: data.validUntil,
          clinicalNotes: data.clinicalNotes,
          termsAndConditions: data.termsAndConditions,
          version: 1,
          procedures: {
            create: data.procedures.map((p, idx) => ({
              procedureCode: p.procedureCode,
              procedureName: p.procedureName,
              category: p.category || 'SURGICAL',
              quantity: p.quantity || 1,
              unitCost: p.unitCost,
              totalCost: p.totalCost,
              isOptional: p.isOptional || false,
              sequenceOrder: p.sequenceOrder !== undefined ? p.sequenceOrder : idx,
              clinicalJustification: p.clinicalJustification,
            })),
          },
          history: {
            create: {
              previousStatus: null,
              newStatus: TreatmentOfferStatus.DRAFT,
              action: 'CREATED_DRAFT',
              performedBy: data.createdById,
              performerRole: data.performerRole || 'DOCTOR',
              notes: 'Draft treatment offer created',
            },
          },
        },
        include: this.offerInclude(),
      });

      return offer;
    });
  }

  async updateOffer(id: string, data: UpdateTreatmentOfferData): Promise<any> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.treatmentOffer.findUnique({
        where: { id },
        select: { status: true, version: true },
      });

      if (!existing) throw new NotFoundException('Treatment offer not found');
      if (existing.status !== TreatmentOfferStatus.DRAFT) {
        throw new ConflictException(`Cannot edit offer in '${existing.status}' status. Only DRAFT offers can be edited.`);
      }

      if (data.expectedVersion !== undefined && data.expectedVersion !== existing.version) {
        throw new ConflictException('The treatment offer was modified concurrently by another session. Please refresh.');
      }

      // If procedures updated, replace them
      if (data.procedures) {
        await tx.treatmentOfferProcedure.deleteMany({
          where: { treatmentOfferId: id },
        });

        await tx.treatmentOfferProcedure.createMany({
          data: data.procedures.map((p, idx) => ({
            treatmentOfferId: id,
            procedureCode: p.procedureCode,
            procedureName: p.procedureName,
            category: p.category || 'SURGICAL',
            quantity: p.quantity || 1,
            unitCost: p.unitCost,
            totalCost: p.totalCost,
            isOptional: p.isOptional || false,
            sequenceOrder: p.sequenceOrder !== undefined ? p.sequenceOrder : idx,
            clinicalJustification: p.clinicalJustification,
          })),
        });
      }

      const updated = await tx.treatmentOffer.update({
        where: { id },
        data: {
          clinicalIndication: data.clinicalIndication,
          grossEstimate: data.grossEstimate,
          discountAmount: data.discountAmount,
          netPayable: data.netPayable,
          financingEligible: data.financingEligible,
          recommendedTenureMonths: data.recommendedTenureMonths,
          validUntil: data.validUntil,
          clinicalNotes: data.clinicalNotes,
          termsAndConditions: data.termsAndConditions,
          version: { increment: 1 },
          history: {
            create: {
              previousStatus: TreatmentOfferStatus.DRAFT,
              newStatus: TreatmentOfferStatus.DRAFT,
              action: 'UPDATED_DRAFT',
              performedBy: data.updatedById,
              performerRole: data.performerRole || 'DOCTOR',
              notes: 'Draft procedures and estimate updated',
            },
          },
        },
        include: this.offerInclude(),
      });

      return updated;
    });
  }

  async dispatchOffer(
    id: string,
    offerNumber: string,
    userId: string,
    role?: string,
    expectedVersion?: number,
  ): Promise<any> {
    const dispatched = await this.db.$transaction(async (tx) => {
      // Row-level lock (FOR UPDATE) to prevent race conditions during simultaneous dispatches
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, status, version
        FROM treatment_offers
        WHERE id = ${id}
        FOR UPDATE
      `;

      const existing = lockedRows[0];
      if (!existing) throw new NotFoundException('Treatment offer not found');
      if (existing.status !== TreatmentOfferStatus.DRAFT) {
        throw new ConflictException(`Offer cannot be dispatched from status '${existing.status}'. Must be DRAFT.`);
      }

      if (expectedVersion !== undefined && existing.version !== expectedVersion) {
        throw new ConflictException('The treatment offer was modified concurrently by another session. Please refresh.');
      }

      const updated = await tx.treatmentOffer.update({
        where: { id },
        data: {
          offerNumber,
          status: TreatmentOfferStatus.DISPATCHED,
          dispatchedAt: new Date(),
          version: { increment: 1 },
          history: {
            create: {
              previousStatus: TreatmentOfferStatus.DRAFT,
              newStatus: TreatmentOfferStatus.DISPATCHED,
              action: 'DISPATCHED_TO_PATIENT',
              performedBy: userId,
              performerRole: role || 'DOCTOR',
              notes: `Offer finalized and dispatched to patient with reference ${offerNumber}`,
            },
          },
        },
        include: this.offerInclude(),
      });

      // Dual-write platform audit log
      try {
        await tx.securityPlatformAuditLog.create({
          data: {
            userId,
            action: 'DISPATCH_TREATMENT_OFFER',
            resource: 'treatment_offers',
            resourceId: id,
            result: 'SUCCESS',
            details: JSON.stringify({
              offerNumber,
              patientProfileId: updated.patientProfileId,
              grossEstimate: updated.grossEstimate,
              netPayable: updated.netPayable,
            }),
          },
        });
      } catch {
        try {
          await (tx as any).auditLog.create({
            data: {
              userId,
              action: 'DISPATCH_TREATMENT_OFFER',
              details: `Dispatched offer ${offerNumber} for patient ${updated.patientProfileId}`,
            },
          });
        } catch {
          // Gracefully continue
        }
      }

      return updated;
    });

    // Patient Notification Outbox Dispatch (post-commit, truly non-blocking)
    try {
      const patientUser = await this.db.patientProfile.findUnique({
        where: { id: dispatched.patientProfileId },
        select: { userId: true },
      });
      if (patientUser && patientUser.userId) {
        const targetUserId: string = patientUser.userId;
        await this.db.notification.create({
          data: {
            recipientUserId: targetUserId,
            title: 'New Treatment Proposal Ready for Review',
            message: `Your physician has prepared a formal treatment proposal (${offerNumber}). Please review and ratify before ${new Date(dispatched.validUntil).toLocaleDateString()}.`,
            notificationType: 'PATIENT' as any,
            priority: 'HIGH' as any,
            channel: 'IN_APP' as any,
            status: 'PENDING' as any,
            metadata: JSON.stringify({
              treatmentOfferId: dispatched.id,
              offerNumber,
              facilityId: dispatched.facilityId,
            }),
          },
        });
      }
    } catch {
      // Non-blocking notification dispatch
    }

    return dispatched;
  }

  async cancelOffer(
    id: string,
    reason: string,
    userId: string,
    role?: string,
    expectedVersion?: number,
  ): Promise<any> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.treatmentOffer.findUnique({
        where: { id },
        select: { status: true, version: true },
      });

      if (!existing) throw new NotFoundException('Treatment offer not found');
      if (['RATIFIED_ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(existing.status)) {
        throw new ConflictException(`Cannot cancel treatment offer in terminal '${existing.status}' status`);
      }

      if (expectedVersion !== undefined && existing.version !== expectedVersion) {
        throw new ConflictException('The treatment offer was modified concurrently by another session. Please refresh.');
      }

      return tx.treatmentOffer.update({
        where: { id },
        data: {
          status: TreatmentOfferStatus.CANCELLED,
          cancellationReason: reason,
          version: { increment: 1 },
          history: {
            create: {
              previousStatus: existing.status,
              newStatus: TreatmentOfferStatus.CANCELLED,
              action: 'DOCTOR_CANCELLED',
              performedBy: userId,
              performerRole: role || 'DOCTOR',
              notes: reason,
            },
          },
        },
        include: this.offerInclude(),
      });
    });
  }

  async markOfferReviewing(id: string, userId: string): Promise<any> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.treatmentOffer.findUnique({
        where: { id },
        select: { status: true, patientViewedAt: true },
      });

      if (!existing) throw new NotFoundException('Treatment offer not found');

      if (existing.status === TreatmentOfferStatus.DISPATCHED) {
        return tx.treatmentOffer.update({
          where: { id },
          data: {
            status: TreatmentOfferStatus.PATIENT_REVIEWING,
            patientViewedAt: existing.patientViewedAt || new Date(),
            version: { increment: 1 },
            history: {
              create: {
                previousStatus: TreatmentOfferStatus.DISPATCHED,
                newStatus: TreatmentOfferStatus.PATIENT_REVIEWING,
                action: 'PATIENT_OPENED_OFFER',
                performedBy: userId,
                performerRole: 'PATIENT',
                notes: 'Patient viewed treatment offer details',
              },
            },
          },
          include: this.offerInclude(),
        });
      }

      return tx.treatmentOffer.findUnique({
        where: { id },
        include: this.offerInclude(),
      });
    });
  }

  async ratifyOffer(
    id: string,
    notes: string | undefined,
    userId: string,
    expectedVersion?: number,
  ): Promise<any> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.treatmentOffer.findUnique({
        where: { id },
        select: { status: true, validUntil: true, version: true },
      });

      if (!existing) throw new NotFoundException('Treatment offer not found');
      if (existing.status === TreatmentOfferStatus.RATIFIED_ACCEPTED) {
        throw new ConflictException('Treatment offer has already been accepted');
      }
      if (![TreatmentOfferStatus.DISPATCHED, TreatmentOfferStatus.PATIENT_REVIEWING].includes(existing.status as any)) {
        throw new ConflictException(`Cannot accept offer in '${existing.status}' status`);
      }

      if (expectedVersion !== undefined && existing.version !== expectedVersion) {
        throw new ConflictException('The treatment offer was modified concurrently by another session. Please refresh.');
      }

      if (new Date() > existing.validUntil) {
        await tx.treatmentOffer.update({
          where: { id },
          data: { status: TreatmentOfferStatus.EXPIRED, version: { increment: 1 } },
        });
        throw new ConflictException('Treatment offer has expired and can no longer be accepted');
      }

      return tx.treatmentOffer.update({
        where: { id },
        data: {
          status: TreatmentOfferStatus.RATIFIED_ACCEPTED,
          patientRespondedAt: new Date(),
          patientResponseNotes: notes || 'Accepted by patient with informed consent',
          version: { increment: 1 },
          history: {
            create: {
              previousStatus: existing.status,
              newStatus: TreatmentOfferStatus.RATIFIED_ACCEPTED,
              action: 'PATIENT_RATIFIED_ACCEPTED',
              performedBy: userId,
              performerRole: 'PATIENT',
              notes: notes || 'Patient ratified and accepted treatment proposal',
            },
          },
        },
        include: this.offerInclude(),
      });
    });
  }

  async declineOffer(
    id: string,
    reason: string,
    userId: string,
    expectedVersion?: number,
  ): Promise<any> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.treatmentOffer.findUnique({
        where: { id },
        select: { status: true, version: true },
      });

      if (!existing) throw new NotFoundException('Treatment offer not found');
      if (existing.status === TreatmentOfferStatus.DECLINED) {
        throw new ConflictException('Treatment offer has already been declined');
      }
      if (![TreatmentOfferStatus.DISPATCHED, TreatmentOfferStatus.PATIENT_REVIEWING].includes(existing.status as any)) {
        throw new ConflictException(`Cannot decline offer in '${existing.status}' status`);
      }

      if (expectedVersion !== undefined && existing.version !== expectedVersion) {
        throw new ConflictException('The treatment offer was modified concurrently by another session. Please refresh.');
      }

      return tx.treatmentOffer.update({
        where: { id },
        data: {
          status: TreatmentOfferStatus.DECLINED,
          patientRespondedAt: new Date(),
          patientResponseNotes: reason,
          version: { increment: 1 },
          history: {
            create: {
              previousStatus: existing.status,
              newStatus: TreatmentOfferStatus.DECLINED,
              action: 'PATIENT_DECLINED',
              performedBy: userId,
              performerRole: 'PATIENT',
              notes: reason,
            },
          },
        },
        include: this.offerInclude(),
      });
    });
  }

  async expireOffer(id: string): Promise<any> {
    return this.db.treatmentOffer.update({
      where: { id },
      data: {
        status: TreatmentOfferStatus.EXPIRED,
        version: { increment: 1 },
        history: {
          create: {
            newStatus: TreatmentOfferStatus.EXPIRED,
            action: 'EXPIRED_AUTOMATICALLY',
            performedBy: 'SYSTEM',
            notes: 'Offer exceeded validity period',
          },
        },
      },
      include: this.offerInclude(),
    });
  }

  async createHistory(
    treatmentOfferId: string,
    action: string,
    previousStatus: TreatmentOfferStatus | null,
    newStatus: TreatmentOfferStatus,
    performedBy: string,
    performerRole?: string,
    notes?: string,
    metadata?: any,
  ): Promise<any> {
    return this.db.treatmentOfferHistory.create({
      data: {
        treatmentOfferId,
        action,
        previousStatus,
        newStatus,
        performedBy,
        performerRole,
        notes,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  }

  async findFinancingOffersForPatient(patientProfileId: string): Promise<any[]> {
    return this.db.financingOffer.findMany({
      where: { patientProfileId },
      include: {
        treatmentOffer: {
          select: {
            id: true,
            offerNumber: true,
            clinicalIndication: true,
            status: true,
            netPayable: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findFinancingOfferById(id: string): Promise<any | null> {
    return this.db.financingOffer.findUnique({
      where: { id },
      include: {
        treatmentOffer: {
          select: {
            id: true,
            offerNumber: true,
            clinicalIndication: true,
            status: true,
            netPayable: true,
          },
        },
      },
    });
  }

  async createFinancingOffer(data: any): Promise<any> {
    return this.db.financingOffer.create({
      data,
    });
  }

  async findFinancingOfferByTreatmentOfferId(treatmentOfferId: string): Promise<any | null> {
    return this.db.financingOffer.findFirst({
      where: { treatmentOfferId },
      include: {
        treatmentOffer: {
          select: {
            id: true,
            offerNumber: true,
            clinicalIndication: true,
            status: true,
            netPayable: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertFinancingOffer(treatmentOfferId: string, data: any): Promise<any> {
    const existing = await this.db.financingOffer.findFirst({
      where: { treatmentOfferId },
    });
    if (existing) {
      return this.db.financingOffer.update({
        where: { id: existing.id },
        data: {
          partnerName: data.partnerName,
          creditTier: data.creditTier,
          maxApprovedAmount: data.maxApprovedAmount,
          minDownPayment: data.minDownPayment,
          tenureMonths: data.tenureMonths,
          interestRate: data.interestRate,
          processingFee: data.processingFee,
          status: data.status || 'AVAILABLE',
          expiresAt: data.expiresAt,
        },
        include: {
          treatmentOffer: {
            select: {
              id: true,
              offerNumber: true,
              clinicalIndication: true,
              status: true,
              netPayable: true,
            },
          },
        },
      });
    }

    return this.db.financingOffer.create({
      data: {
        treatmentOfferId,
        ...data,
      },
      include: {
        treatmentOffer: {
          select: {
            id: true,
            offerNumber: true,
            clinicalIndication: true,
            status: true,
            netPayable: true,
          },
        },
      },
    });
  }

  async findOfferHistoryByAction(treatmentOfferId: string, action: string): Promise<any[]> {
    return this.db.treatmentOfferHistory.findMany({
      where: { treatmentOfferId, action },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatestOfferHistoryByAction(treatmentOfferId: string, action: string): Promise<any | null> {
    return this.db.treatmentOfferHistory.findFirst({
      where: { treatmentOfferId, action },
      orderBy: { createdAt: 'desc' },
    });
  }
}
