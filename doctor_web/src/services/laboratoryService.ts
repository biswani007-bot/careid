import { apiClient } from './apiClient';

export interface LaboratoryTestItemDTO {
  id?: string;
  testName: string;
  testCategory?: string;
  numericValue?: number;
  textValue?: string;
  unit?: string;
  referenceRange: string;
  referenceLow?: number;
  referenceHigh?: number;
  flag?: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL' | string;
  clinicalNotes?: string;
}

export interface LaboratoryReportDTO {
  id: string;
  patientProfileId: string;
  doctorId?: string;
  laboratoryName: string;
  specimenType?: string;
  collectedDate: string;
  reportedDate: string;
  status: 'FINAL' | 'PRELIMINARY' | 'AMENDED' | 'CORRECTED';
  overallNotes?: string;
  attachmentId?: string;
  attachment?: {
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    url?: string;
  };
  testItems: LaboratoryTestItemDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLaboratoryReportPayload {
  laboratoryName: string;
  specimenType?: string;
  collectedDate: string;
  reportedDate?: string;
  status?: string;
  overallNotes?: string;
  testItems: Array<{
    testName: string;
    testCategory?: string;
    numericValue?: number;
    textValue?: string;
    unit?: string;
    referenceRange: string;
    referenceLow?: number;
    referenceHigh?: number;
    flag?: string;
    clinicalNotes?: string;
  }>;
}

export const laboratoryService = {
  /**
   * List laboratory & pathology reports for an authorized patient
   */
  async getPatientLabResults(patientProfileId: string): Promise<LaboratoryReportDTO[]> {
    const cleanId = patientProfileId.trim().toLowerCase();
    const res = await apiClient.get<LaboratoryReportDTO[] | { data: LaboratoryReportDTO[] }>(
      `/api/v1/doctors/patients/${encodeURIComponent(cleanId)}/lab-results`
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data && typeof res.data === 'object' && 'data' in res.data && Array.isArray((res.data as any).data)) {
      return (res.data as any).data;
    }
    return [];
  },

  /**
   * Log/Create new laboratory or pathology specimen result
   */
  async createPatientLabResult(
    patientProfileId: string,
    payload: CreateLaboratoryReportPayload
  ): Promise<LaboratoryReportDTO> {
    const cleanId = patientProfileId.trim().toLowerCase();
    const res = await apiClient.post<LaboratoryReportDTO | { data: LaboratoryReportDTO }>(
      `/api/v1/doctors/patients/${encodeURIComponent(cleanId)}/lab-results`,
      payload
    );
    if (res.data && typeof res.data === 'object') {
      if ('data' in res.data && (res.data as any).data) {
        return (res.data as any).data;
      }
      return res.data as LaboratoryReportDTO;
    }
    throw new Error('Malformed laboratory report response');
  },

  /**
   * Retrieve report details by ID
   */
  async getLabResultById(reportId: string): Promise<LaboratoryReportDTO> {
    const cleanId = reportId.trim();
    const res = await apiClient.get<LaboratoryReportDTO | { data: LaboratoryReportDTO }>(
      `/api/v1/lab-results/${encodeURIComponent(cleanId)}`
    );
    if (res.data && typeof res.data === 'object') {
      if ('data' in res.data && (res.data as any).data) {
        return (res.data as any).data;
      }
      return res.data as LaboratoryReportDTO;
    }
    throw new Error('Report not found');
  },
};
