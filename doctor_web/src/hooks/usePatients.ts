/**
 * CareID Doctor Web - Patient Module React Hooks
 * 
 * Provides clean reactive state for:
 * - Patient Directory listing & server-side pagination/filtering
 * - Patient Profile details & clinical summary
 * - Medical Records & Timeline
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  patientService,
  PatientListItem,
  PatientFilterParams,
  PatientPaginationMeta,
  PatientProfileDetail,
  MedicalRecord,
  TimelineEvent,
  VitalSignsDTO,
  extractLatestVitalsFromVitalsList,
  timelineEventToMedicalRecord,
  resolvePatientPhotoUrl,
  loadAuthenticatedPhotoUrl,
  getDefaultPatientAvatar,
} from '@/services/patientService';

/**
 * Hook to resolve patient avatar image.
 * Uses authenticated blob loader if photoUrl is a backend protected endpoint.
 * Falls back to gender-appropriate avatar if photoUrl is absent or fails.
 */
export function usePatientAvatar(photoUrl?: string | null, gender?: string | null): string {
  const defaultAvatar = getDefaultPatientAvatar(gender);
  const [avatar, setAvatar] = useState<string>(() => {
    if (!photoUrl) return defaultAvatar;
    if (photoUrl.startsWith('blob:') || photoUrl.startsWith('data:')) return photoUrl;
    const resolved = resolvePatientPhotoUrl(photoUrl);
    if (!resolved) return defaultAvatar;
    return defaultAvatar;
  });

  useEffect(() => {
    let active = true;
    const defaultAv = getDefaultPatientAvatar(gender);

    if (!photoUrl) {
      setAvatar(defaultAv);
      return;
    }

    if (photoUrl.startsWith('blob:') || photoUrl.startsWith('data:')) {
      setAvatar(photoUrl);
      return;
    }

    const resolved = resolvePatientPhotoUrl(photoUrl);
    if (!resolved) {
      setAvatar(defaultAv);
      return;
    }

    loadAuthenticatedPhotoUrl(resolved).then((loaded) => {
      if (active) {
        setAvatar(loaded || defaultAv);
      }
    });

    return () => {
      active = false;
    };
  }, [photoUrl, gender]);

  return avatar;
}

export interface UsePatientListReturn {
  patients: PatientListItem[];
  meta: PatientPaginationMeta;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePatientList(filters: PatientFilterParams = {}): UsePatientListReturn {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [meta, setMeta] = useState<PatientPaginationMeta>({
    totalItems: 0,
    page: filters.page || 1,
    limit: filters.limit || 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const {
    q,
    page = 1,
    limit = 20,
    gender,
    bloodGroup,
    status,
    activeTab,
  } = filters;

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await patientService.listPatients({
        q,
        page,
        limit,
        gender,
        bloodGroup,
        status,
        activeTab,
      });
      setPatients(response.data);
      setMeta(response.meta);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load patient records from server. Please try again.';
      setError(message);
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, [q, page, limit, gender, bloodGroup, status, activeTab]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return {
    patients,
    meta,
    isLoading,
    error,
    refetch: fetchPatients,
  };
}

export interface UsePatientProfileReturn {
  patient: PatientProfileDetail | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePatientProfile(patientId?: string): UsePatientProfileReturn {
  const [patient, setPatient] = useState<PatientProfileDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(patientId?.trim()));
  const [error, setError] = useState<string | null>(null);
  const [prevPatientId, setPrevPatientId] = useState<string | undefined>(patientId);

  // Synchronously reset state during render when patientId changes to prevent rendering stale patient data across rapid transitions
  if (patientId !== prevPatientId) {
    setPrevPatientId(patientId);
    setPatient(null);
    setError(null);
    setIsLoading(Boolean(patientId?.trim()));
  }

  const fetchPatient = useCallback(async () => {
    if (!patientId || !patientId.trim()) {
      setPatient(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await patientService.getPatientById(patientId.trim());
      setPatient(data);
      if (data) {
        patientService.updateRecentlyViewedPatient(data, { addIfMissing: false });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : `Failed to load details for patient #${patientId}`;
      setError(message);
      setPatient(null);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    // Immediately clear previous patient data to avoid stale state across transitions
    setPatient(null);
    setError(null);
    let active = true;

    if (!patientId || !patientId.trim()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    patientService
      .getPatientById(patientId.trim())
      .then((data) => {
        if (!active) return;
        setPatient(data);
        if (data) {
          patientService.updateRecentlyViewedPatient(data, { addIfMissing: false });
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message =
          err instanceof Error
            ? err.message
            : `Failed to load details for patient #${patientId}`;
        setError(message);
        setPatient(null);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [patientId]);

  const cleanId = patientId?.trim();
  const safePatient = patient && cleanId && patient.id.toLowerCase() === cleanId.toLowerCase() ? patient : null;

  return {
    patient: safePatient,
    isLoading,
    error,
    refetch: fetchPatient,
  };
}

export interface UsePatientRecordsReturn {
  records: MedicalRecord[];
  timeline: TimelineEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePatientRecords(patientId?: string): UsePatientRecordsReturn {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(patientId));
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!patientId) {
      setRecords([]);
      setTimeline([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [recordsData, timelineData] = await Promise.allSettled([
        patientService.getPatientMedicalRecords(patientId),
        patientService.getPatientTimeline(patientId),
      ]);

      const recordsList: MedicalRecord[] =
        recordsData.status === 'fulfilled' ? [...recordsData.value] : [];
      const timelineList: TimelineEvent[] =
        timelineData.status === 'fulfilled' ? [...timelineData.value] : [];

      if (recordsData.status === 'rejected') {
        const reason = recordsData.reason;
        const msg = reason instanceof Error ? reason.message : 'Failed to retrieve patient medical records';
        setError(msg);
      } else {
        setError(null);
      }

      // Unified synchronization: Merge any timeline records/events not already in recordsList
      const existingIds = new Set(recordsList.map((r) => r.id));
      for (const event of timelineList) {
        if (!existingIds.has(event.id) && (event.eventType === 'MEDICAL_RECORD' || event.details)) {
          recordsList.push(timelineEventToMedicalRecord(event, patientId));
          existingIds.add(event.id);
        }
      }

      setRecords(recordsList);
      setTimeline(timelineList);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to retrieve patient medical records';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    records,
    timeline,
    isLoading,
    error,
    refetch: fetchRecords,
  };
}

export interface UsePatientVitalsReturn {
  vitals: VitalSignsDTO[];
  latestVitals: PatientProfileDetail['vitals'] | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Dedicated hook to retrieve structured patient vital signs telemetry
 * Endpoint: GET /api/v1/doctors/patients/:patientProfileId/vitals
 */
export function usePatientVitals(patientId?: string): UsePatientVitalsReturn {
  const [vitals, setVitals] = useState<VitalSignsDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(patientId));
  const [error, setError] = useState<string | null>(null);

  const fetchVitals = useCallback(async () => {
    if (!patientId) {
      setVitals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await patientService.getPatientVitals(patientId);
      setVitals(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve patient vitals';
      setError(msg);
      setVitals([]);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchVitals();
  }, [fetchVitals]);

  const latest = useMemo(() => extractLatestVitalsFromVitalsList(vitals), [vitals]);

  return {
    vitals,
    latestVitals: latest,
    isLoading,
    error,
    refetch: fetchVitals,
  };
}
