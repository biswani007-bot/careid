/**
 * CareID Doctor Web - Cath Lab & Interventional Cardiology Service (Stages 16-20)
 *
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * - Folder 10:
 *   - GET  /api/v1/appointments/:appointmentId/cath-lab-checklist
 *   - POST /api/v1/appointments/:appointmentId/cath-lab-checklist
 * - Folder 29 (Cath Lab & Interventional Cardiology):
 *   - POST /api/v1/cath-lab/safety-timeout
 *   - GET  /api/v1/cath-lab/safety-timeout/:appointmentId
 *   - POST /api/v1/cath-lab/safety-hold
 *   - POST /api/v1/cath-lab/safety-hold/:safetyHoldId/clear
 *   - GET  /api/v1/cath-lab/safety-hold/active?appointmentId=:appointmentId
 *   - POST /api/v1/cath-lab/telemetry/log
 *   - GET  /api/v1/cath-lab/telemetry/live?appointmentId=:appointmentId
 *   - POST /api/v1/cath-lab/encounters/:encounterId/vessel-findings
 *   - GET  /api/v1/cath-lab/encounters/:encounterId/vessel-findings
 *   - POST /api/v1/cath-lab/encounters/:encounterId/dicom-series
 *   - GET  /api/v1/cath-lab/encounters/:encounterId/dicom-series
 *   - GET  /api/v1/cath-lab/dicom-series/:seriesId/frames/:frameNumber
 * - Folder 08 (Encounter Intra-Op):
 *   - POST /api/v1/encounters/:encounterId/procedures
 *   - POST /api/v1/encounters/:encounterId/hemodynamics
 */

import { apiClient, ApiError, ApiResponse } from './apiClient';

// --- Stage 16: Cath Lab Safety Checklist & Time-Out ---

export interface CathLabChecklistDTO {
  appointmentId?: string;
  appointmentNumber?: string;
  overallStatus?: string;
  signIn: {
    patientIdentityConfirmed: boolean;
    siteMarked: boolean;
    anesthesiaSafetyCheckCompleted: boolean;
    pulseOximeterOn: boolean;
    allergiesChecked: boolean;
  };
  timeOut: {
    allTeamMembersIntroduced: boolean;
    patientNameProcedureSiteConfirmed: boolean;
    anticipatedCriticalEventsReviewed: boolean;
    antibioticProphylaxisAdministered: boolean;
    imagingDisplayed: boolean;
  };
  signOut: {
    procedureNameRecorded: boolean;
    instrumentSpongeNeedleCountsCorrect: boolean;
    specimenLabeled: boolean;
    equipmentProblemsAddressed: boolean;
    keyPostOpConcernsReviewed: boolean;
  };
  notes?: string;
  updatedAt?: string;
}

export interface SafetyTimeoutPayload {
  appointmentId: string;
  treatmentOfferId?: string;
  circulatingNurseId?: string;
  anesthesiaProviderId?: string;
  gates: {
    patientIdentityConfirmed: boolean;
    procedureConfirmed: boolean;
    accessSiteConfirmed: boolean;
    consentAndAnticoagulationVerified: boolean;
    equipmentAndEmergencyPrepared: boolean;
    radiationAndShieldingVerified: boolean;
  };
  notes?: string;
}

export interface SafetyTimeoutRecordDTO {
  id: string;
  appointmentId: string;
  treatmentOfferId?: string;
  gates: SafetyTimeoutPayload['gates'];
  notes?: string;
  ratifiedAt?: string;
  ratifiedBy?: string;
}

// --- Stage 16-17: Emergency Safety Hold ---

export interface SafetyHoldDTO {
  id: string;
  holdId?: string;
  appointmentId: string;
  holdCategory: string;
  reason: string;
  clinicalNotes?: string;
  status?: string;
  declaredAt?: string;
  clearedAt?: string | null;
  resolutionNotes?: string | null;
}

export interface ActiveSafetyHoldResponse {
  appointmentId: string;
  hasActiveHold: boolean;
  activeHold: SafetyHoldDTO | null;
}

// --- Stage 17-18: Telemetry & Radiation ---

export interface TelemetryLogPayload {
  appointmentId: string;
  fluoroscopyDurationSeconds: number;
  doseAreaProductDap: number;
  contrastVolumeMl: number;
  contrastAgent: string;
  activatedClottingTimeSeconds: number;
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  oxygenSaturation: number;
  sourceDevice?: string;
}

export interface TelemetryLiveDTO {
  appointmentId: string;
  appointmentNumber?: string;
  readingCount: number;
  dataSource?: string;
  status?: string;
  latestReading?: TelemetryLogPayload & { recordedAt?: string };
  totalFluoroscopySeconds?: number;
  totalDoseAreaProductDap?: number;
  totalContrastVolumeMl?: number;
}

// --- Stage 18: Vessel Findings (QCA) & DICOM Series ---

export interface VesselFindingInput {
  vessel: string;
  segment: string;
  stenosisPercentage: number;
  timiFlowPre: string;
  timiFlowPost: string;
  calcification?: string;
  lesionType?: string;
  interventionPerformed: boolean;
  stentDetails?: string;
}

export interface VesselFindingsPayload {
  coronaryDominance: 'RIGHT' | 'LEFT' | 'CODOMINANT' | string;
  lvefPercentage?: number;
  hemostasisMethod: string;
  findings: VesselFindingInput[];
  summary: string;
}

export interface VesselFindingsDTO extends VesselFindingsPayload {
  id?: string;
  encounterId?: string;
  createdAt?: string;
}

export interface DicomSeriesPayload {
  studyInstanceUid: string;
  seriesInstanceUid: string;
  modality: string;
  seriesDescription: string;
  numberOfFrames: number;
  keyFrameNumbers?: number[];
  kvp?: number;
  exposureTimeMs?: number;
}

export interface DicomSeriesDTO extends DicomSeriesPayload {
  id: string;
  encounterId?: string;
  createdAt?: string;
}

function unwrapData<T>(res: ApiResponse<T | { data: T }>): T {
  const payload = res.data;
  if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data: T }).data !== undefined) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const cathLabService = {
  async getCathLabChecklist(appointmentId: string): Promise<CathLabChecklistDTO> {
    const res = await apiClient.get<CathLabChecklistDTO | { data: CathLabChecklistDTO }>(
      `/api/v1/appointments/${encodeURIComponent(appointmentId)}/cath-lab-checklist`
    );
    return unwrapData(res);
  },

  async updateCathLabChecklist(
    appointmentId: string,
    payload: Omit<CathLabChecklistDTO, 'appointmentId' | 'appointmentNumber' | 'updatedAt'>
  ): Promise<CathLabChecklistDTO> {
    const res = await apiClient.post<CathLabChecklistDTO | { data: CathLabChecklistDTO }>(
      `/api/v1/appointments/${encodeURIComponent(appointmentId)}/cath-lab-checklist`,
      payload
    );
    return unwrapData(res);
  },

  async ratifySafetyTimeout(payload: SafetyTimeoutPayload): Promise<SafetyTimeoutRecordDTO> {
    const res = await apiClient.post<SafetyTimeoutRecordDTO | { data: SafetyTimeoutRecordDTO }>(
      '/api/v1/cath-lab/safety-timeout',
      payload
    );
    return unwrapData(res);
  },

  async getSafetyTimeout(appointmentId: string): Promise<SafetyTimeoutRecordDTO> {
    const res = await apiClient.get<SafetyTimeoutRecordDTO | { data: SafetyTimeoutRecordDTO }>(
      `/api/v1/cath-lab/safety-timeout/${encodeURIComponent(appointmentId)}`
    );
    return unwrapData(res);
  },

  async declareSafetyHold(payload: {
    appointmentId: string;
    holdCategory: string;
    reason: string;
    clinicalNotes?: string;
  }): Promise<SafetyHoldDTO> {
    const res = await apiClient.post<SafetyHoldDTO | { data: SafetyHoldDTO }>(
      '/api/v1/cath-lab/safety-hold',
      payload
    );
    const data = unwrapData(res);
    return { ...data, id: data.id || data.holdId || '' };
  },

  async clearSafetyHold(safetyHoldId: string, resolutionNotes: string): Promise<SafetyHoldDTO> {
    const res = await apiClient.post<SafetyHoldDTO | { data: SafetyHoldDTO }>(
      `/api/v1/cath-lab/safety-hold/${encodeURIComponent(safetyHoldId)}/clear`,
      { resolutionNotes }
    );
    const data = unwrapData(res);
    return { ...data, id: data.id || data.holdId || safetyHoldId };
  },

  async getActiveSafetyHold(appointmentId: string): Promise<ActiveSafetyHoldResponse> {
    const res = await apiClient.get<ActiveSafetyHoldResponse | { data: ActiveSafetyHoldResponse }>(
      `/api/v1/cath-lab/safety-hold/active?appointmentId=${encodeURIComponent(appointmentId)}`
    );
    const data = unwrapData(res);
    if (data.activeHold) {
      data.activeHold = {
        ...data.activeHold,
        id: data.activeHold.id || data.activeHold.holdId || '',
      };
    }
    return data;
  },

  async logTelemetry(payload: TelemetryLogPayload): Promise<TelemetryLiveDTO> {
    const res = await apiClient.post<TelemetryLiveDTO | { data: TelemetryLiveDTO }>(
      '/api/v1/cath-lab/telemetry/log',
      payload
    );
    return unwrapData(res);
  },

  async getLiveTelemetry(appointmentId: string): Promise<TelemetryLiveDTO> {
    const res = await apiClient.get<TelemetryLiveDTO | { data: TelemetryLiveDTO }>(
      `/api/v1/cath-lab/telemetry/live?appointmentId=${encodeURIComponent(appointmentId)}`
    );
    return unwrapData(res);
  },

  async addEncounterProcedure(
    encounterId: string,
    payload: { name: string; code: string; notes?: string }
  ): Promise<unknown> {
    const res = await apiClient.post<unknown>(
      `/api/v1/encounters/${encodeURIComponent(encounterId)}/procedures`,
      payload
    );
    return unwrapData(res);
  },

  async recordEncounterHemodynamics(
    encounterId: string,
    payload: {
      systolicBp: number;
      diastolicBp: number;
      pulseBpm: number;
      respirationRate: number;
      oxygenSaturation: number;
      temperatureC: number;
    }
  ): Promise<unknown> {
    const res = await apiClient.post<unknown>(
      `/api/v1/encounters/${encodeURIComponent(encounterId)}/hemodynamics`,
      payload
    );
    return unwrapData(res);
  },

  async saveVesselFindings(encounterId: string, payload: VesselFindingsPayload): Promise<VesselFindingsDTO> {
    const res = await apiClient.post<VesselFindingsDTO | { data: VesselFindingsDTO }>(
      `/api/v1/cath-lab/encounters/${encodeURIComponent(encounterId)}/vessel-findings`,
      payload
    );
    return unwrapData(res);
  },

  async getVesselFindings(encounterId: string): Promise<VesselFindingsDTO | VesselFindingsDTO[]> {
    const res = await apiClient.get<VesselFindingsDTO | VesselFindingsDTO[] | { data: VesselFindingsDTO }>(
      `/api/v1/cath-lab/encounters/${encodeURIComponent(encounterId)}/vessel-findings`
    );
    return unwrapData(res);
  },

  async registerDicomSeries(encounterId: string, payload: DicomSeriesPayload): Promise<DicomSeriesDTO> {
    const res = await apiClient.post<DicomSeriesDTO | { data: DicomSeriesDTO }>(
      `/api/v1/cath-lab/encounters/${encodeURIComponent(encounterId)}/dicom-series`,
      payload
    );
    return unwrapData(res);
  },

  async listDicomSeries(encounterId: string): Promise<DicomSeriesDTO[]> {
    const res = await apiClient.get<DicomSeriesDTO[] | { data: DicomSeriesDTO[] }>(
      `/api/v1/cath-lab/encounters/${encodeURIComponent(encounterId)}/dicom-series`
    );
    const data = unwrapData(res);
    return Array.isArray(data) ? data : [];
  },
};

export function formatCathLabError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 400 && error.messages.length > 0) {
      return error.messages.join('. ');
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred in the Cath Lab service.';
}

