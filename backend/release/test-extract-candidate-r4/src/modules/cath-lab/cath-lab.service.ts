import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '@database/database.service';
import {
  SubmitSafetyTimeoutDto,
  DeclareSafetyHoldDto,
  ClearSafetyHoldDto,
  LogTelemetryDto,
  CreateVesselFindingsDto,
  RegisterDicomSeriesDto,
} from './cath-lab.dto';

const APPROVED_CORONARY_CPT_CODES = new Set([
  '92920', '92921', '92924', '92925', '92928', '92929',
  '92933', '92934', '92937', '92938', '92941', '92943',
  '92944', '92973', '92974', '92977', '92978', '92979',
  '93451', '93452', '93453', '93454', '93455', '93456',
  '93457', '93458', '93459', '93460', '93461', '93462',
  '93463', '93464', '93571', '93572',
]);

@Injectable()
export class CathLabService {
  constructor(private readonly db: DatabaseService) {}

  // In-memory dual registry for high-speed active hold lookups & telemetry streaming
  private static activeSafetyHolds = new Map<string, any>(); // holdId -> holdObj
  private static telemetryStore = new Map<string, any[]>(); // appointmentId -> telemetryPoints[]
  private static vesselFindingsStore = new Map<string, any>(); // encounterId -> findingsDoc
  private static dicomSeriesStore = new Map<string, any[]>(); // encounterId -> series[]
  private static safetyTimeoutStore = new Map<string, any>(); // appointmentId -> timeoutDoc

  // ─── 1. Surgical Safety Time-Out (Stage 16) ─────────────────────────────────

  async submitSafetyTimeout(
    callerUserId: string,
    callerRoles: string[] = [],
    dto: SubmitSafetyTimeoutDto,
  ): Promise<any> {
    const appointment = await this.db.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { patientProfile: true },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment '${dto.appointmentId}' not found`);
    }

    // Safety Hold Check: Prevent safety time-out while an emergency safety hold is active
    const activeHold = await this.getActiveSafetyHold(appointment.id);
    if (activeHold.hasActiveHold) {
      throw new ConflictException(
        `Cannot submit surgical safety time-out: Appointment '${appointment.id}' is currently under an active emergency safety hold (${activeHold.activeHold.holdId}) declared at ${activeHold.activeHold.declaredAt}. Active hold must be cleared first.`,
      );
    }

    // Validate all 6 clinical safety gates are verified
    const g = dto.gates;
    const allGatesPassed = Boolean(
      g &&
        g.patientIdentityConfirmed &&
        g.procedureConfirmed &&
        g.accessSiteConfirmed &&
        g.consentAndAnticoagulationVerified &&
        g.equipmentAndEmergencyPrepared &&
        g.radiationAndShieldingVerified,
    );

    if (!allGatesPassed) {
      throw new BadRequestException(
        'Surgical safety time-out rejected: All 6 mandatory safety gates must be explicitly confirmed before vascular access is permitted.',
      );
    }

    // Check for existing ratification
    const existing =
      CathLabService.safetyTimeoutStore.get(appointment.id) ||
      this.extractSection(appointment.notes, 'CATH_LAB_SAFETY_TIMEOUT');

    if (existing && !dto.isAmendment) {
      throw new ConflictException(
        `Safety time-out has already been ratified for appointment '${appointment.id}' at ${existing.ratifiedAt}. An amendment workflow with isAmendment=true and amendmentReason is required to modify sign-off.`,
      );
    }

    if (dto.isAmendment && !dto.amendmentReason) {
      throw new BadRequestException(
        'Amendment reason is mandatory when amending a previously ratified surgical safety time-out.',
      );
    }

    const now = new Date().toISOString();
    const timeoutId = crypto.randomUUID();

    // Cryptographic server-side integrity hash (SHA-256)
    const rawDataToHash = `${appointment.id}:${appointment.patientProfileId}:${callerUserId}:${now}:${JSON.stringify(dto.gates)}`;
    const integrityHash = crypto.createHash('sha256').update(rawDataToHash).digest('hex');

    const timeoutRecord = {
      timeoutId,
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      patientProfileId: appointment.patientProfileId,
      facilityId: appointment.facilityId,
      treatmentOfferId: dto.treatmentOfferId || null,
      encounterId: dto.encounterId || null,
      status: 'RATIFIED',
      ratifiedAt: now,
      interventionalistId: callerUserId,
      circulatingNurseId: dto.circulatingNurseId || null,
      anesthesiaProviderId: dto.anesthesiaProviderId || null,
      integrityHash,
      gates: dto.gates,
      notes: dto.notes || null,
      isAmendment: Boolean(dto.isAmendment),
      amendmentReason: dto.amendmentReason || null,
    };

    CathLabService.safetyTimeoutStore.set(appointment.id, timeoutRecord);

    // Persist to appointment notes under designated section
    await this.persistSection(appointment.id, 'CATH_LAB_SAFETY_TIMEOUT', timeoutRecord);

    try {
      await this.db.auditLog.create({
        data: {
          userId: callerUserId,
          action: dto.isAmendment ? 'CATH_LAB_TIMEOUT_AMENDED' : 'CATH_LAB_TIMEOUT_RATIFIED',
          details: `Safety time-out ratified for appointment ${appointment.appointmentNumber}. Hash: ${integrityHash}`,
        },
      });
    } catch {}

    return timeoutRecord;
  }

  async getSafetyTimeout(appointmentId: string): Promise<any> {
    const appointment = await this.db.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment '${appointmentId}' not found`);
    }

    const record =
      CathLabService.safetyTimeoutStore.get(appointmentId) ||
      this.extractSection(appointment.notes, 'CATH_LAB_SAFETY_TIMEOUT');

    if (!record) {
      throw new NotFoundException(
        `No surgical safety time-out ratification found for appointment '${appointmentId}'`,
      );
    }

    return record;
  }

  // ─── 2. Emergency Safety Hold (Stage 16–17) ─────────────────────────────────

  async declareSafetyHold(
    callerUserId: string,
    callerRoles: string[] = [],
    dto: DeclareSafetyHoldDto,
  ): Promise<any> {
    const appointment = await this.db.appointment.findUnique({
      where: { id: dto.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment '${dto.appointmentId}' not found`);
    }

    // Check for existing unresolved safety hold
    const activeHold = await this.getActiveSafetyHold(appointment.id);
    if (activeHold.hasActiveHold) {
      throw new ConflictException(
        `Appointment '${appointment.id}' already has an active emergency safety hold (${activeHold.activeHold.holdId}) declared at ${activeHold.activeHold.declaredAt}. Active hold must be cleared before a new hold can be initiated.`,
      );
    }

    const holdId = crypto.randomUUID();
    const now = new Date().toISOString();

    const holdRecord = {
      holdId,
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      encounterId: dto.encounterId || null,
      patientProfileId: appointment.patientProfileId,
      facilityId: appointment.facilityId,
      status: 'ACTIVE',
      holdCategory: dto.holdCategory,
      reason: dto.reason,
      clinicalNotes: dto.clinicalNotes || null,
      declaredBy: callerUserId,
      declaredAt: now,
      resolvedBy: null,
      resolvedAt: null,
      resolutionNotes: null,
      durationSeconds: null,
    };

    CathLabService.activeSafetyHolds.set(holdId, holdRecord);

    await this.persistSection(appointment.id, 'ACTIVE_SAFETY_HOLD', holdRecord);

    try {
      await this.db.auditLog.create({
        data: {
          userId: callerUserId,
          action: 'CATH_LAB_SAFETY_HOLD_DECLARED',
          details: `Emergency Safety Hold declared for appointment ${appointment.appointmentNumber}. Category: ${dto.holdCategory}. Reason: ${dto.reason}`,
        },
      });
    } catch {}

    return holdRecord;
  }

  async clearSafetyHold(
    callerUserId: string,
    holdId: string,
    dto: ClearSafetyHoldDto,
  ): Promise<any> {
    let hold = CathLabService.activeSafetyHolds.get(holdId);

    // If not in memory, look across appointments
    if (!hold) {
      const appointments = await this.db.appointment.findMany({
        where: { notes: { contains: holdId } },
      });
      for (const apt of appointments) {
        const h = this.extractSection(apt.notes, 'ACTIVE_SAFETY_HOLD');
        if (h && h.holdId === holdId && h.status === 'ACTIVE') {
          hold = h;
          break;
        }
      }
    }

    if (!hold || hold.status !== 'ACTIVE') {
      throw new NotFoundException(
        `Active emergency safety hold '${holdId}' not found or already resolved.`,
      );
    }

    const now = new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.round((new Date(now).getTime() - new Date(hold.declaredAt).getTime()) / 1000),
    );

    const resolvedRecord = {
      ...hold,
      status: 'RESOLVED',
      resolvedBy: callerUserId,
      resolvedAt: now,
      resolutionNotes: dto.resolutionNotes,
      durationSeconds,
    };

    CathLabService.activeSafetyHolds.delete(holdId);

    // Update appointment notes: remove active hold and append to hold history
    const apt = await this.db.appointment.findUnique({ where: { id: hold.appointmentId } });
    if (apt) {
      const existingHistory = this.extractSection(apt.notes, 'SAFETY_HOLD_HISTORY') || [];
      const updatedHistory = [...existingHistory, resolvedRecord];

      const activeRegex = /--- ACTIVE_SAFETY_HOLD ---[\s\S]*?(?=(\n--- [A-Z0-9_]+ ---|$))/;
      const historyRegex = /--- SAFETY_HOLD_HISTORY ---[\s\S]*?(?=(\n--- [A-Z0-9_]+ ---|$))/;
      let notes = (apt.notes || '').replace(activeRegex, '').trim();
      notes = notes.replace(historyRegex, '').trim();
      notes = `${notes ? notes + '\n\n' : ''}--- SAFETY_HOLD_HISTORY ---\n${JSON.stringify(updatedHistory, null, 2)}`.trim();
      await this.db.appointment.update({ where: { id: apt.id }, data: { notes } });
    }

    try {
      await this.db.auditLog.create({
        data: {
          userId: callerUserId,
          action: 'CATH_LAB_SAFETY_HOLD_CLEARED',
          details: `Safety Hold ${holdId} resolved after ${durationSeconds}s by ${callerUserId}. Resolution: ${dto.resolutionNotes}`,
        },
      });
    } catch {}

    return resolvedRecord;
  }

  async getActiveSafetyHold(appointmentId: string): Promise<any> {
    for (const hold of CathLabService.activeSafetyHolds.values()) {
      if (hold.appointmentId === appointmentId && hold.status === 'ACTIVE') {
        return { appointmentId, hasActiveHold: true, activeHold: hold };
      }
    }

    const appointment = await this.db.appointment.findUnique({ where: { id: appointmentId } });
    if (appointment) {
      const active = this.extractSection(appointment.notes, 'ACTIVE_SAFETY_HOLD');
      if (active && active.status === 'ACTIVE') {
        return { appointmentId, hasActiveHold: true, activeHold: active };
      }
    }

    return { appointmentId, hasActiveHold: false, activeHold: null };
  }

  // ─── 3. Telemetry & Fluoroscopy (Stage 17–18) ───────────────────────────────

  async logTelemetry(
    callerUserId: string,
    callerRoles: string[] = [],
    dto: LogTelemetryDto,
  ): Promise<any> {
    const appointment = await this.db.appointment.findUnique({
      where: { id: dto.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment '${dto.appointmentId}' not found`);
    }

    const pointId = crypto.randomUUID();
    const now = new Date().toISOString();

    const telemetryPoint = {
      pointId,
      appointmentId: appointment.id,
      encounterId: dto.encounterId || null,
      patientProfileId: appointment.patientProfileId,
      facilityId: appointment.facilityId,
      readingType: dto.readingType || 'INCREMENTAL',
      fluoroscopyDurationSeconds: dto.fluoroscopyDurationSeconds,
      doseAreaProductDap: dto.doseAreaProductDap,
      cumulativeAirKerma: dto.cumulativeAirKerma ?? null,
      contrastVolumeMl: dto.contrastVolumeMl,
      contrastAgent: dto.contrastAgent || 'STANDARD_ISO_OSMOLAR',
      activatedClottingTimeSeconds: dto.activatedClottingTimeSeconds ?? null,
      systolicBp: dto.systolicBp,
      diastolicBp: dto.diastolicBp,
      meanArterialPressure:
        dto.meanArterialPressure || Math.round((2 * dto.diastolicBp + dto.systolicBp) / 3),
      heartRate: dto.heartRate,
      oxygenSaturation: dto.oxygenSaturation,
      sourceDevice: dto.sourceDevice || 'MANUAL_ENTRY',
      notes: dto.notes || null,
      recordedBy: callerUserId,
      observationTimestamp: now,
    };

    let points: any[] = CathLabService.telemetryStore.get(appointment.id) || [];
    if (points.length === 0) {
      points = this.extractSection(appointment.notes, 'CATH_LAB_TELEMETRY') || [];
    }
    points.push(telemetryPoint);
    CathLabService.telemetryStore.set(appointment.id, points);

    // Dual-persist to appointment notes under designated section
    await this.persistSection(appointment.id, 'CATH_LAB_TELEMETRY', points);

    // Asynchronously log to audit log
    try {
      await this.db.auditLog.create({
        data: {
          userId: callerUserId,
          action: 'CATH_LAB_TELEMETRY_LOGGED',
          details: `Telemetry logged for apt ${appointment.appointmentNumber}: Fluoro ${dto.fluoroscopyDurationSeconds}s, DAP ${dto.doseAreaProductDap}, Contrast ${dto.contrastVolumeMl}ml`,
        },
      });
    } catch {}

    return telemetryPoint;
  }

  async getLiveTelemetry(appointmentId: string): Promise<any> {
    const appointment = await this.db.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment '${appointmentId}' not found`);
    }

    let points: any[] = CathLabService.telemetryStore.get(appointmentId) || [];
    if (points.length === 0) {
      points = this.extractSection(appointment.notes, 'CATH_LAB_TELEMETRY') || [];
      if (points.length > 0) {
        CathLabService.telemetryStore.set(appointmentId, points);
      }
    }

    if (points.length === 0) {
      return {
        appointmentId,
        appointmentNumber: appointment.appointmentNumber,
        readingCount: 0,
        dataSource: 'MANUAL_LOG_FEED',
        status: 'AWAITING_TELEMETRY_LOGS',
        totals: {
          totalFluoroscopyDurationSeconds: 0,
          totalDoseAreaProductDap_mGy_cm2: 0,
          totalDoseAreaProductDap_Gy_cm2: 0,
          totalDoseAreaProductDap: 0,
          totalContrastVolumeMl: 0,
          cumulativeAirKerma_mGy: null,
        },
        latestTelemetry: null,
      };
    }

    const latest = points[points.length - 1];
    const totalContrast = points.reduce((acc, p) => acc + (p.contrastVolumeMl || 0), 0);

    const hasCumulativeSnapshots = points.some((p) => p.readingType === 'CUMULATIVE_SNAPSHOT');
    let totalFluoro = 0;
    let totalDap_mGy = 0;
    let aggregationMode = 'INCREMENTAL_EVENT_SUM';

    if (hasCumulativeSnapshots) {
      aggregationMode = 'CUMULATIVE_SNAPSHOT_MAX';
      totalFluoro = Math.max(...points.map((p) => p.fluoroscopyDurationSeconds || 0));
      totalDap_mGy = Math.max(...points.map((p) => p.doseAreaProductDap || 0));
    } else {
      const durations = points.map((p) => p.fluoroscopyDurationSeconds || 0);
      const isMonotonic = durations.every((val, idx) => idx === 0 || val >= durations[idx - 1]);
      if (isMonotonic && durations.length > 1) {
        aggregationMode = 'MONOTONIC_CLOCK_MAX';
        totalFluoro = Math.max(...durations);
      } else {
        aggregationMode = 'INCREMENTAL_EVENT_SUM';
        totalFluoro = durations.reduce((a, b) => a + b, 0);
      }
      totalDap_mGy = points.reduce((acc, p) => acc + (p.doseAreaProductDap || 0), 0);
    }

    const latestAirKerma = latest?.cumulativeAirKerma ?? null;

    return {
      appointmentId,
      appointmentNumber: appointment.appointmentNumber,
      readingCount: points.length,
      dataSource: 'MANUAL_LOG_FEED',
      aggregationMode,
      note: 'Telemetry represents cumulative logs from procedural reporting. Direct continuous hardware C-arm streaming is not active.',
      totals: {
        aggregationMode,
        totalFluoroscopyDurationSeconds: totalFluoro,
        totalDoseAreaProductDap_mGy_cm2: totalDap_mGy,
        totalDoseAreaProductDap_Gy_cm2: Number((totalDap_mGy / 10000).toFixed(4)),
        totalDoseAreaProductDap: totalDap_mGy,
        totalContrastVolumeMl: totalContrast,
        cumulativeAirKerma_mGy: latestAirKerma,
      },
      latestTelemetry: latest,
    };
  }

  // ─── 4. Coronary Vessel Findings / QCA (Stage 18) ───────────────────────────

  async createVesselFindings(
    callerUserId: string,
    encounterId: string,
    dto: CreateVesselFindingsDto,
  ): Promise<any> {
    // Encounter check
    const encounter = await this.db.medicalEncounter.findUnique({
      where: { id: encounterId },
      include: { medicalRecord: true },
    });

    let targetRecordId: string;
    if (encounter) {
      targetRecordId = encounter.medicalRecordId;
    } else {
      const record = await this.db.medicalRecord.findUnique({ where: { id: encounterId } });
      if (!record) {
        throw new NotFoundException(`Encounter or Medical Record '${encounterId}' not found`);
      }
      targetRecordId = record.id;
    }

    // Safety Hold Check: Check if an active safety hold exists for this encounter's linked appointment
    const linkedApt = await this.db.appointment.findFirst({
      where: { notes: { contains: encounterId } },
    });
    if (linkedApt) {
      const activeHold = await this.getActiveSafetyHold(linkedApt.id);
      if (activeHold.hasActiveHold) {
        throw new ConflictException(
          `Cannot record QCA vessel findings: Linked appointment '${linkedApt.id}' is under an active emergency safety hold (${activeHold.activeHold.holdId}).`,
        );
      }
    }

    if (!dto.findings || dto.findings.length === 0) {
      throw new BadRequestException('At least one coronary vessel lesion finding is required');
    }

    const now = new Date().toISOString();
    const findingsDoc = {
      findingsId: crypto.randomUUID(),
      encounterId,
      medicalRecordId: targetRecordId,
      coronaryDominance: dto.coronaryDominance,
      lvefPercentage: dto.lvefPercentage ?? null,
      hemostasisMethod: dto.hemostasisMethod || null,
      findings: dto.findings,
      summary: dto.summary || null,
      recordedBy: callerUserId,
      recordedAt: now,
    };

    // Database transaction for related QCA and procedure writes
    await this.db.$transaction(async (tx) => {
      // Synchronize procedures based on actual procedure performed without guessing CPT 92928
      for (const f of dto.findings) {
        if (f.interventionPerformed || f.procedureType === 'DIAGNOSTIC_ANGIOGRAPHY') {
          let code: string;
          let name: string;
          let notes: string;

          if (f.cptCode) {
            const rawCode = f.cptCode.trim();
            if (!APPROVED_CORONARY_CPT_CODES.has(rawCode)) {
              throw new BadRequestException(
                `Unsupported or invalid coronary CPT code '${f.cptCode}'. Procedure code must be an approved interventional/diagnostic coronary code.`,
              );
            }
            code = rawCode;
            name = `Coronary Procedure (${code}) on ${f.vessel} (${f.segment})`;
            notes = f.notes || f.stentDetails || `CPT ${code} performed on ${f.vessel}.`;
          } else if (f.procedureType === 'BALLOON_ANGIOPLASTY') {
            code = '92920'; // PTCA single vessel (NOT 92928)
            name = `PTCA (Balloon Angioplasty) of ${f.vessel} (${f.segment})`;
            notes = f.notes || `PTCA performed without stent deployment. Pre-TIMI: ${f.timiFlowPre}, Post-TIMI: ${f.timiFlowPost || 'TIMI_3'}`;
          } else if (f.procedureType === 'STENT_PLACEMENT' || f.stentDetails) {
            code = '92928'; // Stent placement
            name = `Coronary Stent Placement in ${f.vessel} (${f.segment})`;
            notes = f.stentDetails || `Intracoronary stent deployed. Pre-TIMI: ${f.timiFlowPre}, Post-TIMI: ${f.timiFlowPost || 'TIMI_3'}`;
          } else if (f.procedureType === 'ATHERECTOMY') {
            code = '92924'; // Atherectomy
            name = `Coronary Atherectomy in ${f.vessel} (${f.segment})`;
            notes = f.notes || `Rotational/orbital atherectomy performed on ${f.vessel}.`;
          } else if (f.procedureType === 'THROMBECTOMY') {
            code = '92973'; // Thrombectomy
            name = `Coronary Thrombectomy in ${f.vessel} (${f.segment})`;
            notes = f.notes || `Aspiration thrombectomy performed on ${f.vessel}.`;
          } else if (f.procedureType === 'DIAGNOSTIC_ANGIOGRAPHY' || f.isDiagnosticOnly) {
            code = '93454'; // Diagnostic coronary angiography
            name = `Diagnostic Coronary Angiography of ${f.vessel}`;
            notes = f.notes || `Diagnostic catheterization without intervention. Pre-TIMI: ${f.timiFlowPre}`;
          } else {
            code = 'PENDING_CLINICAL_CODING';
            name = `Unspecified PCI of ${f.vessel} (${f.segment})`;
            notes = f.notes || `Intervention marked performed without specific procedure type or implant details. Pending coding review.`;
          }

          // Duplicate check: Prevent creating duplicate procedure for same record, code, and vessel
          const existingProc = await tx.medicalProcedure.findFirst({
            where: {
              medicalRecordId: targetRecordId,
              name,
              code,
            },
          });

          if (!existingProc) {
            await tx.medicalProcedure.create({
              data: {
                medicalRecordId: targetRecordId,
                name,
                code,
                performedAt: new Date(now),
                notes,
              },
            });
          }
        }
      }

      // Persist findings document in MedicalRecord.clinicalNotes
      const rec = await tx.medicalRecord.findUnique({ where: { id: targetRecordId } });
      if (rec) {
        const regex = /--- CATH_LAB_VESSEL_FINDINGS ---[\s\S]*?(?=(\n--- [A-Z0-9_]+ ---|$))/;
        let baseNotes = (rec.clinicalNotes || '').replace(regex, '').trim();
        const newNotes = `${baseNotes ? baseNotes + '\n\n' : ''}--- CATH_LAB_VESSEL_FINDINGS ---\n${JSON.stringify(findingsDoc, null, 2)}`.trim();
        await tx.medicalRecord.update({
          where: { id: targetRecordId },
          data: { clinicalNotes: newNotes },
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: callerUserId,
          action: 'CORONARY_VESSEL_FINDINGS_RECORDED',
          details: `Coronary vessel findings recorded for encounter ${encounterId}. Dominance: ${dto.coronaryDominance}, Lesions: ${dto.findings.length}`,
        },
      });
    });

    CathLabService.vesselFindingsStore.set(encounterId, findingsDoc);
    return findingsDoc;
  }

  async getVesselFindings(encounterId: string): Promise<any> {
    let findings = CathLabService.vesselFindingsStore.get(encounterId);
    if (!findings) {
      const encounter = await this.db.medicalEncounter.findUnique({
        where: { id: encounterId },
        include: { medicalRecord: true },
      });
      const record = encounter
        ? encounter.medicalRecord
        : await this.db.medicalRecord.findUnique({ where: { id: encounterId } });

      if (!encounter && !record) {
        throw new NotFoundException(`Encounter or Medical Record '${encounterId}' not found`);
      }

      if (record && record.clinicalNotes) {
        findings = this.extractSection(record.clinicalNotes, 'CATH_LAB_VESSEL_FINDINGS');
        if (findings) {
          CathLabService.vesselFindingsStore.set(encounterId, findings);
          return findings;
        }
      }

      throw new NotFoundException(`No coronary vessel findings recorded for encounter '${encounterId}'`);
    }

    return findings;
  }

  // ─── 5. DICOM / PACS (Stage 18) ─────────────────────────────────────────────

  async registerDicomSeries(
    callerUserId: string,
    encounterId: string,
    dto: RegisterDicomSeriesDto,
  ): Promise<any> {
    const encounter = await this.db.medicalEncounter.findUnique({
      where: { id: encounterId },
      include: { medicalRecord: true },
    });
    const record = encounter
      ? encounter.medicalRecord
      : await this.db.medicalRecord.findUnique({ where: { id: encounterId } });

    if (!encounter && !record) {
      throw new NotFoundException(`Encounter or Medical Record '${encounterId}' not found`);
    }
    const targetRecordId = encounter ? encounter.medicalRecordId : record!.id;

    // Validate keyFrameNumbers within range
    if (dto.keyFrameNumbers && dto.keyFrameNumbers.length > 0) {
      for (const kf of dto.keyFrameNumbers) {
        if (kf < 1 || kf > dto.numberOfFrames) {
          throw new BadRequestException(
            `Keyframe index ${kf} is out of bounds. Must be between 1 and total frames (${dto.numberOfFrames}).`,
          );
        }
      }
    }

    // Uniqueness check: prevent duplicate seriesInstanceUid for this encounter
    const existingSeriesList = await this.getDicomSeries(encounterId);
    if (existingSeriesList.some((s) => s.seriesInstanceUid === dto.seriesInstanceUid)) {
      throw new ConflictException(
        `DICOM Series Instance UID '${dto.seriesInstanceUid}' is already registered for this encounter.`,
      );
    }

    const seriesId = crypto.randomUUID();
    const now = new Date().toISOString();

    const seriesRecord = {
      seriesId,
      encounterId,
      medicalRecordId: targetRecordId,
      studyInstanceUid: dto.studyInstanceUid,
      seriesInstanceUid: dto.seriesInstanceUid,
      modality: dto.modality || 'XA',
      seriesDescription: dto.seriesDescription,
      numberOfFrames: dto.numberOfFrames,
      storageKey: dto.storageKey || null,
      storageUrl: dto.storageUrl || null,
      keyFrameNumbers: dto.keyFrameNumbers || [],
      kvp: dto.kvp ?? null,
      exposureTimeMs: dto.exposureTimeMs ?? null,
      registeredBy: callerUserId,
      registeredAt: now,
    };

    const list = [...existingSeriesList, seriesRecord];
    CathLabService.dicomSeriesStore.set(encounterId, list);

    // Dual-persist to MedicalRecord.clinicalNotes
    const targetRecord =
      (encounter && encounter.medicalRecord)
        ? encounter.medicalRecord
        : await this.db.medicalRecord.findUnique({ where: { id: targetRecordId } });

    if (targetRecord) {
      const regex = /--- CATH_LAB_DICOM_SERIES ---[\s\S]*?(?=(\n--- [A-Z0-9_]+ ---|$))/;
      let baseNotes = (targetRecord.clinicalNotes || '').replace(regex, '').trim();
      const newNotes = `${baseNotes ? baseNotes + '\n\n' : ''}--- CATH_LAB_DICOM_SERIES ---\n${JSON.stringify(list, null, 2)}`.trim();
      await this.db.medicalRecord.update({
        where: { id: targetRecordId },
        data: { clinicalNotes: newNotes },
      });
    }

    try {
      await this.db.auditLog.create({
        data: {
          userId: callerUserId,
          action: 'DICOM_SERIES_REGISTERED',
          details: `Registered DICOM series '${dto.seriesDescription}' (${dto.seriesInstanceUid}) for encounter ${encounterId}`,
        },
      });
    } catch {}

    return seriesRecord;
  }

  async getDicomSeries(encounterId: string): Promise<any[]> {
    let list: any[] = CathLabService.dicomSeriesStore.get(encounterId) || [];
    if (list.length === 0) {
      const encounter = await this.db.medicalEncounter.findUnique({
        where: { id: encounterId },
        include: { medicalRecord: true },
      });
      const record = encounter
        ? encounter.medicalRecord
        : await this.db.medicalRecord.findUnique({ where: { id: encounterId } });

      if (!encounter && !record) {
        throw new NotFoundException(`Encounter or Medical Record '${encounterId}' not found`);
      }

      if (record && record.clinicalNotes) {
        const extracted = this.extractSection(record.clinicalNotes, 'CATH_LAB_DICOM_SERIES');
        if (extracted && Array.isArray(extracted) && extracted.length > 0) {
          list = extracted;
          CathLabService.dicomSeriesStore.set(encounterId, list);
        }
      }
    }

    return list;
  }

  async getDicomFrame(seriesId: string, frameNumber: number): Promise<any> {
    const pacsUrl = process.env.PACS_URL || process.env.DICOMWEB_URL;

    if (!pacsUrl) {
      return {
        status: 'BLOCKED_BY_EXTERNAL_DEPENDENCY',
        message:
          'Direct PACS/DICOMweb frame streaming requires an active PACS archive (Orthanc/dcm4chee) configured via PACS_URL.',
        seriesId,
        frameNumber: Number(frameNumber),
        configuredPacsHost: null,
      };
    }

    return {
      status: 'AVAILABLE',
      seriesId,
      frameNumber: Number(frameNumber),
      pacsUrl: `${pacsUrl}/series/${seriesId}/frames/${frameNumber}`,
    };
  }

  // ─── Internal Helper Methods ──────────────────────────────────────────────

  private extractSection(notes: string | null | undefined, sectionName: string): any | null {
    if (!notes || !notes.includes(`--- ${sectionName} ---`)) return null;
    try {
      const parts = notes.split(`--- ${sectionName} ---`);
      if (parts.length < 2) return null;
      const jsonStr = parts[1].split(/\n--- [A-Z0-9_]+ ---/)[0].trim();
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  private async persistSection(appointmentId: string, sectionName: string, data: any): Promise<void> {
    const apt = await this.db.appointment.findUnique({ where: { id: appointmentId } });
    if (!apt) return;

    const regex = new RegExp(`--- ${sectionName} ---[\\s\\S]*?(?=(\\n--- [A-Z0-9_]+ ---|$))`, 'g');
    let baseNotes = (apt.notes || '').replace(regex, '').trim();
    const newNotes = `${baseNotes ? baseNotes + '\n\n' : ''}--- ${sectionName} ---\n${JSON.stringify(data, null, 2)}`.trim();

    await this.db.appointment.update({
      where: { id: appointmentId },
      data: { notes: newNotes },
    });
  }
}
