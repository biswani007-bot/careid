import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Hospital,
  Pill,
  Plus,
  ShieldAlert,
  X,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Building2,
  Calendar,
  User,
  Bell,
  BellOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatientList, usePatientProfile, usePatientRecords } from '@/hooks/usePatients';
import { useAuth } from '@/context/AuthContext';
import {
  prescriptionService,
  PrescriptionItem,
  BackendPrescription,
  HospitalAdmission,
  parseTreatmentPlan,
  CreatePrescriptionPayload,
  triggerBrowserDownload,
} from '@/services/prescriptionService';

export const PrescriptionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId') || searchParams.get('id');
  const { user } = useAuth();

  const { patients: patientList, isLoading: isPatientListLoading } = usePatientList({ limit: 1 });
  const activePatientId = queryPatientId || (patientList.length > 0 ? patientList[0].id : undefined);

  useEffect(() => {
    if (!queryPatientId && patientList.length > 0) {
      setSearchParams({ patientId: patientList[0].id }, { replace: true });
    }
  }, [queryPatientId, patientList, setSearchParams]);

  const { patient, isLoading: isProfileLoading, error: profileError } = usePatientProfile(activePatientId);
  const {
    records,
    timeline,
    isLoading: isRecordsLoading,
    error: recordsError,
    refetch: refetchRecords,
  } = usePatientRecords(activePatientId);

  // Dedicated Backend Prescriptions State
  const [backendPrescriptions, setBackendPrescriptions] = useState<BackendPrescription[]>([]);
  const [isPrescriptionsLoading, setIsPrescriptionsLoading] = useState(false);
  const [prescriptionsError, setPrescriptionsError] = useState<string | null>(null);

  // Dedicated Hospital Admissions State
  const [admissions, setAdmissions] = useState<HospitalAdmission[]>([]);
  const [isAdmissionsLoading, setIsAdmissionsLoading] = useState(false);
  const [admissionsError, setAdmissionsError] = useState<string | null>(null);

  // Pagination State (10 items per page max)
  const [prescriptionsPage, setPrescriptionsPage] = useState(1);
  const PRESCRIPTIONS_PER_PAGE = 10;
  const [timelinePage, setTimelinePage] = useState(1);
  const TIMELINE_PER_PAGE = 10;

  // Modals & UI State
  const [selectedRefillItem, setSelectedRefillItem] = useState<PrescriptionItem | null>(null);
  const [refillModalError, setRefillModalError] = useState<string | null>(null);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Prescription Form State
  const [formMedication, setFormMedication] = useState('');
  const [formDosage, setFormDosage] = useState('');
  const [formFrequency, setFormFrequency] = useState('Once daily');
  const [formDuration, setFormDuration] = useState('30 days');
  const [formIndication, setFormIndication] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formPickupReminder, setFormPickupReminder] = useState(false);
  const [formPickupReminderHours, setFormPickupReminderHours] = useState(2);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refill State
  const [isAuthorizingRefill, setIsAuthorizingRefill] = useState(false);

  // Discontinuation State
  const [selectedDiscontinueItem, setSelectedDiscontinueItem] = useState<PrescriptionItem | null>(null);
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [discontinueNotes, setDiscontinueNotes] = useState('');
  const [isDiscontinuing, setIsDiscontinuing] = useState(false);
  const [discontinueError, setDiscontinueError] = useState<string | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [downloadingRxId, setDownloadingRxId] = useState<string | null>(null);
  const [markingCollectedId, setMarkingCollectedId] = useState<string | null>(null);
  const [updatingReminderId, setUpdatingReminderId] = useState<string | null>(null);

  const handleDownloadPrescriptionPdf = async (rxId: string) => {
    if (!rxId) return;
    try {
      setDownloadingRxId(rxId);
      triggerToast('Generating official prescription PDF...');
      await prescriptionService.downloadPrescriptionPdf(rxId);
      triggerToast('Prescription PDF downloaded successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download prescription PDF.';
      triggerToast(`Download error: ${msg}`);
    } finally {
      setDownloadingRxId(null);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const doctorDisplayName = user?.fullName
    ? (user.fullName.startsWith('Dr.') ? user.fullName : `Dr. ${user.fullName}`)
    : 'Attending Physician';

  // Fetch dedicated prescriptions from GET /api/v1/doctors/patients/:id/prescriptions
  const fetchPrescriptions = useCallback(async () => {
    if (!activePatientId) {
      setBackendPrescriptions([]);
      return;
    }
    setIsPrescriptionsLoading(true);
    setPrescriptionsError(null);
    try {
      const data = await prescriptionService.getPatientPrescriptions(activePatientId);
      setBackendPrescriptions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve patient prescriptions';
      setPrescriptionsError(msg);
    } finally {
      setIsPrescriptionsLoading(false);
    }
  }, [activePatientId]);

  // Fetch hospital admissions from GET /api/v1/doctors/patients/:id/admissions
  const fetchAdmissions = useCallback(async () => {
    if (!activePatientId) {
      setAdmissions([]);
      return;
    }
    setIsAdmissionsLoading(true);
    setAdmissionsError(null);
    try {
      const data = await prescriptionService.getPatientAdmissions(activePatientId);
      setAdmissions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve hospital admissions';
      setAdmissionsError(msg);
    } finally {
      setIsAdmissionsLoading(false);
    }
  }, [activePatientId]);

  useEffect(() => {
    fetchPrescriptions();
    fetchAdmissions();
    setPrescriptionsPage(1);
    setTimelinePage(1);
  }, [fetchPrescriptions, fetchAdmissions]);

  // Handle Manual Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        refetchRecords(),
        fetchPrescriptions(),
        fetchAdmissions(),
      ]);
      triggerToast('Prescription and clinical records refreshed from backend.');
    } catch {
      triggerToast('Unable to refresh records. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchRecords, fetchPrescriptions, fetchAdmissions]);

  // Unified Prescription Items for Table Display
  const prescriptions: PrescriptionItem[] = useMemo(() => {
    const list: PrescriptionItem[] = [];
    const seenIds = new Set<string>();

    // 1. Map dedicated backend prescriptions from GET /doctors/patients/:id/prescriptions
    if (backendPrescriptions && backendPrescriptions.length > 0) {
      for (let rxIdx = 0; rxIdx < backendPrescriptions.length; rxIdx++) {
        const rx = backendPrescriptions[rxIdx];
        const prescriber = rx.prescribedBy || rx.doctorName || rx.providerName || doctorDisplayName;
        const statusType = (rx.status === 'UPLOADED' || rx.status === 'VERIFIED' || rx.status === 'ACTIVE' || rx.status === 'FINAL') ? 'active' : 'completed';
        const displayStatus = rx.status === 'UPLOADED' || rx.status === 'VERIFIED' ? 'Active' : rx.status;

        seenIds.add(rx.id);

        const medItems = (rx.medications && rx.medications.length > 0)
          ? rx.medications
          : ((rx as any).items && (rx as any).items.length > 0)
            ? (rx as any).items
            : null;

        if (medItems && medItems.length > 0) {
          for (let i = 0; i < medItems.length; i++) {
            const med = medItems[i];
            const medName = med.name || med.drugName || rx.title || 'Prescription Order';
            const medDose = med.dosage || '—';
            const medFreq = med.frequency || 'Once daily';
            const medDur = med.duration || (med.durationDays ? `${med.durationDays} days` : '—');
            const medInst = med.instructions || rx.notes;
            const uniqueRowKey = `rx-${rx.id}-${medName}-${i}`;
            list.push({
              id: uniqueRowKey,
              prescriptionId: rx.id,
              recordId: rx.id,
              patientProfileId: rx.patientProfileId || activePatientId,
              patientName: patient?.fullName,
              isElectronicRx: true,
              medicine: medName,
              dose: medDose,
              frequency: medFreq,
              duration: medDur,
              status: displayStatus,
              statusType,
              prescriber,
              date: rx.reportDate || rx.createdAt ? new Date(rx.reportDate || rx.createdAt).toLocaleDateString() : undefined,
              notes: rx.notes || medInst,
              instructions: medInst,
              facilityName: rx.facilityName,
              pickupReminderEnabled: rx.pickupReminderEnabled,
              pickupReminderHours: rx.pickupReminderHours,
              collected: rx.collected,
              collectedAt: rx.collectedAt,
            });
          }
        } else {
          const uniqueRowKey = `rx-${rx.id}-${rxIdx}`;
          list.push({
            id: uniqueRowKey,
            prescriptionId: rx.id,
            recordId: rx.id,
            patientProfileId: rx.patientProfileId || activePatientId,
            patientName: patient?.fullName,
            isElectronicRx: true,
            medicine: rx.title,
            dose: '—',
            frequency: 'As directed',
            duration: '—',
            status: displayStatus,
            statusType,
            prescriber,
            date: rx.reportDate || rx.createdAt ? new Date(rx.reportDate || rx.createdAt).toLocaleDateString() : undefined,
            notes: rx.notes,
            instructions: rx.description,
            facilityName: rx.facilityName,
            pickupReminderEnabled: rx.pickupReminderEnabled,
            pickupReminderHours: rx.pickupReminderHours,
            collected: rx.collected,
            collectedAt: rx.collectedAt,
          });
        }
      }
    }

    // 2. Fallback merge: Include clinical treatment plan prescriptions from medical records if not already represented
    if (records && records.length > 0) {
      for (let recIdx = 0; recIdx < records.length; recIdx++) {
        const r = records[recIdx];
        if (!seenIds.has(r.id) && r.treatmentPlan && r.treatmentPlan.trim().length > 0) {
          const parsed = parseTreatmentPlan(r.treatmentPlan || '', r.title);
          const encounterDoctor = (r.encounters as Array<{ providerName?: string }>)?.[0]?.providerName;
          const prescriber = encounterDoctor || doctorDisplayName;
          const statusType = (r.status === 'FINAL' || r.status === 'ACTIVE') ? 'active' : 'completed';
          const displayStatus = r.status === 'FINAL' ? 'Active' : r.status === 'COMPLETED' ? 'Completed' : 'Pending';

          list.push({
            id: `rec-rx-${r.id}-${recIdx}`,
            prescriptionId: '', // Explicitly empty: Not a registered e-Rx order in backend prescriptions table
            recordId: r.id,
            patientProfileId: r.patientProfileId || activePatientId,
            patientName: patient?.fullName,
            isElectronicRx: false,
            medicine: parsed.medicine,
            dose: parsed.dose,
            frequency: parsed.frequency,
            duration: parsed.duration,
            status: displayStatus,
            statusType,
            prescriber,
            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : undefined,
            notes: r.clinicalNotes,
            instructions: r.followUpInstructions,
          });
        }
      }
    }

    return list;
  }, [backendPrescriptions, records, doctorDisplayName, patient?.fullName, activePatientId]);

  // Derived pagination for Prescription History Table (10 items max per page)
  const totalPrescriptionPages = Math.max(1, Math.ceil(prescriptions.length / PRESCRIPTIONS_PER_PAGE));
  const safePrescriptionsPage = Math.min(Math.max(1, prescriptionsPage), totalPrescriptionPages);
  const paginatedPrescriptions = useMemo(() => {
    const startIdx = (safePrescriptionsPage - 1) * PRESCRIPTIONS_PER_PAGE;
    return prescriptions.slice(startIdx, startIdx + PRESCRIPTIONS_PER_PAGE);
  }, [prescriptions, safePrescriptionsPage]);

  // Chronologically sorted records for Clinical Timeline & Notes
  const sortedRecords = useMemo(() => {
    if (!records || records.length === 0) return [];
    return [...records].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [records]);

  // Derived combined timeline entries (Clinical Notes + Historical Attachments)
  type TimelineEntryItem =
    | { kind: 'record'; id: string; data: (typeof sortedRecords)[0]; dateNum: number }
    | { kind: 'attachment'; id: string; data: NonNullable<typeof timeline>[0]; dateNum: number };

  const timelineEntries = useMemo<TimelineEntryItem[]>(() => {
    const list: TimelineEntryItem[] = [];

    if (sortedRecords && sortedRecords.length > 0) {
      for (let i = 0; i < sortedRecords.length; i++) {
        const r = sortedRecords[i];
        const dateNum = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        list.push({ kind: 'record', id: `timeline-rec-${r.id || i}-${i}`, data: r, dateNum });
      }
    }

    if (timeline && timeline.length > 0) {
      for (let i = 0; i < timeline.length; i++) {
        const att = timeline[i];
        if (att.eventType === 'ATTACHMENT') {
          const dateNum = att.date ? new Date(att.date).getTime() : 0;
          list.push({ kind: 'attachment', id: `timeline-att-${att.id || i}-${i}`, data: att, dateNum });
        }
      }
    }

    return list.sort((a, b) => b.dateNum - a.dateNum);
  }, [sortedRecords, timeline]);

  // Derived pagination for Clinical Timeline & Notes (10 items max per page)
  const totalTimelinePages = Math.max(1, Math.ceil(timelineEntries.length / TIMELINE_PER_PAGE));
  const safeTimelinePage = Math.min(Math.max(1, timelinePage), totalTimelinePages);
  const paginatedTimelineEntries = useMemo(() => {
    const startIdx = (safeTimelinePage - 1) * TIMELINE_PER_PAGE;
    return timelineEntries.slice(startIdx, startIdx + TIMELINE_PER_PAGE);
  }, [timelineEntries, safeTimelinePage]);

  // Handle New Prescription Form Submission
  const handleCreatePrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!activePatientId) {
      setFormError('No active patient selected.');
      return;
    }

    if (!formMedication.trim()) {
      setFormError('Please enter medication name.');
      return;
    }

    if (!formDosage.trim()) {
      setFormError('Please enter dosage (e.g. 20mg, 500mg).');
      return;
    }

    if (!formIndication.trim()) {
      setFormError('Please enter clinical indication or diagnosis for prescription.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreatePrescriptionPayload = {
        title: `Prescription for ${formIndication.trim()}`,
        medicationName: formMedication.trim(),
        dosage: formDosage.trim(),
        frequency: formFrequency.trim(),
        duration: formDuration.trim() || undefined,
        indication: formIndication.trim(),
        instructions: formInstructions.trim() || undefined,
        facilityName: 'CareID Heart Institute',
        providerName: doctorDisplayName,
        pickupReminderEnabled: formPickupReminder,
        pickupReminderHours: formPickupReminder ? formPickupReminderHours : undefined,
      };

      await prescriptionService.createPrescription(activePatientId, payload);
      
      // Reset form
      setFormMedication('');
      setFormDosage('');
      setFormFrequency('Once daily');
      setFormDuration('30 days');
      setFormIndication('');
      setFormInstructions('');
      setFormPickupReminder(false);
      setFormPickupReminderHours(2);
      setShowNewEntryModal(false);

      await handleRefresh();
      triggerToast('Prescription order successfully committed to medical record.');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create prescription entry.';
      setFormError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Authorize Refill
  const handleConfirmRefill = async () => {
    if (!selectedRefillItem || !activePatientId) return;

    if (!selectedRefillItem.isElectronicRx || !selectedRefillItem.prescriptionId) {
      setRefillModalError(
        'This regimen is recorded as a clinical encounter note without an active electronic prescription ID in the backend registry. To authorize electronic refills via the e-Rx gateway, please submit an official medication order using "+ New Entry".'
      );
      return;
    }

    setIsAuthorizingRefill(true);
    setRefillModalError(null);
    try {
      await prescriptionService.authorizeRefill(
        selectedRefillItem.prescriptionId,
        1,
        `Standard 30-day refill authorized by ${doctorDisplayName}`
      );

      setSelectedRefillItem(null);
      await handleRefresh();
      triggerToast(`Refill authorization transmitted for ${selectedRefillItem.medicine}.`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Refill authorization failed.';
      setRefillModalError(`Refill Authorization Error: ${errorMsg}`);
    } finally {
      setIsAuthorizingRefill(false);
    }
  };

  // Handle Discontinue Prescription
  const handleConfirmDiscontinue = async () => {
    if (!selectedDiscontinueItem || !activePatientId) return;
    if (!discontinueReason.trim()) {
      setDiscontinueError('Please provide a clinical reason for discontinuing this medication.');
      return;
    }

    if (!selectedDiscontinueItem.prescriptionId) {
      setDiscontinueError(
        'This medication order does not have an electronic prescription record registered in the e-Rx gateway.'
      );
      return;
    }

    setIsDiscontinuing(true);
    setDiscontinueError(null);
    try {
      await prescriptionService.discontinuePrescription(
        selectedDiscontinueItem.prescriptionId,
        discontinueReason.trim(),
        discontinueNotes.trim() || undefined
      );

      triggerToast(`Prescription for ${selectedDiscontinueItem.medicine} discontinued.`);
      setSelectedDiscontinueItem(null);
      await handleRefresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Discontinuation failed.';
      setDiscontinueError(`Discontinuation Error: ${errorMsg}`);
    } finally {
      setIsDiscontinuing(false);
    }
  };

  // Handle Mark as Collected (CR-08)
  const handleMarkCollected = async (rxId: string) => {
    if (!rxId || !activePatientId || markingCollectedId) return;
    setMarkingCollectedId(rxId);
    try {
      triggerToast('Marking prescription as collected by patient...');
      await prescriptionService.markPrescriptionCollected(activePatientId, rxId);
      await handleRefresh();
      triggerToast('Prescription marked as collected. Automated pickup reminders terminated.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark prescription as collected.';
      triggerToast(`Collection Error: ${msg}`);
    } finally {
      setMarkingCollectedId(null);
    }
  };

  // Handle Toggle Pickup Reminder (CR-08 enable/disable)
  const handleToggleReminder = async (rxId: string, enabled: boolean, hours = 2) => {
    if (!rxId || updatingReminderId) return;
    setUpdatingReminderId(rxId);
    try {
      triggerToast(enabled ? 'Enabling prescription pickup reminders...' : 'Pausing prescription pickup reminders...');
      await prescriptionService.updateReminderSettings(rxId, enabled, hours);
      await handleRefresh();
      triggerToast(enabled ? 'Pickup reminders enabled successfully.' : 'Pickup reminders paused successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update reminder settings.';
      triggerToast(`Reminder Error: ${msg}`);
    } finally {
      setUpdatingReminderId(null);
    }
  };

  // Handle Export Record: Complete Patient Medical Record CSV Export
  const handleExportRecord = async () => {
    if (!activePatientId) {
      triggerToast('No active patient selected for export.');
      return;
    }

    if (isExporting) return; // Prevent duplicate concurrent requests

    setIsExporting(true);
    try {
      const result = await prescriptionService.exportPatientMedicalRecordCsv(
        activePatientId,
        patient?.fullName
      );
      triggerBrowserDownload(result.blob, result.filename);
      triggerToast(`Medical record CSV downloaded (${result.totalRows} records): ${result.filename}`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to export patient clinical record from backend.';
      triggerToast(`Export Error: ${errorMsg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = isProfileLoading || isRecordsLoading || isPrescriptionsLoading || isPatientListLoading;
  const patientDisplayName = patient
    ? `${patient.fullName} (ID: #${patient.patientNumber})`
    : activePatientId
      ? `Patient #${activePatientId.substring(0, 8)}`
      : 'No Patient Selected';

  return (
    <div className="w-full space-y-6" data-node-id="1:6396">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Bar with Patient Context & Actions (Figma node 1:6418) */}
      <div className="space-y-3 pb-2 border-b border-[#e1e3e4]">
        <div className="text-sm font-medium text-[#191c1d]">
          {isLoading && !patient ? (
            <span className="inline-block w-48 h-4 bg-slate-200 animate-pulse rounded" />
          ) : (
            `Patient Medical Record: ${patientDisplayName}`
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#191c1d] leading-tight">
              Prescription &amp; Clinical History
            </h1>
            <p className="text-xs text-[#7a7583]">
              Comprehensive chronological timeline and active treatments.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportRecord}
              className="h-10 px-4 rounded-lg bg-white border border-[#cbc4d4] text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Export complete patient clinical record"
            >
              {isExporting ? (
                <>
                  <Loader2 className="size-4 animate-spin text-[#5b14b8]" aria-hidden="true" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="size-4 text-[#494552]" aria-hidden="true" />
                  <span>Export Record</span>
                </>
              )}
            </button>

            {/* Canonical Primary Action Button (Figma node 1:40) */}
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setShowNewEntryModal(true);
              }}
              className="h-10 px-5 rounded-lg bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white text-xs font-semibold hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <Plus className="size-4 stroke-[2.5]" aria-hidden="true" />
              <span>New Entry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Error Banner */}
      {profileError && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-rose-600 shrink-0" />
            <span>Patient identification error: {profileError}</span>
          </div>
          <Link
            to="/patients"
            className="px-3 py-1 bg-white border border-rose-300 text-rose-700 font-semibold rounded-lg hover:bg-rose-100 transition-colors"
          >
            Select from Directory
          </Link>
        </div>
      )}

      {/* Records Error Banner */}
      {recordsError && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-rose-600 shrink-0" />
            <span>Unable to load medical records: {recordsError}</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-1 bg-white border border-rose-300 text-rose-700 font-semibold rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Span 8): Prescriptions Table + Clinical SOAP Notes */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section: Prescription History Table Card (Figma node 1:6435) */}
          <section
            aria-label="Prescription History Table"
            className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xs font-bold">
                  +
                </span>
                <h2 className="text-base font-bold text-[#191c1d]">Prescription History</h2>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-xs font-semibold text-[#00838f] hover:underline flex items-center gap-1 disabled:opacity-60 cursor-pointer"
              >
                <RotateCw className={`size-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            {prescriptionsError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2">
                <span>Prescription query notice: {prescriptionsError}</span>
                <button
                  type="button"
                  onClick={fetchPrescriptions}
                  className="font-semibold underline hover:text-amber-950"
                >
                  Retry
                </button>
              </div>
            )}

            {isPrescriptionsLoading || (isLoading && prescriptions.length === 0) ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="size-6 animate-spin text-[#5b14b8]" />
                <span className="text-xs">Loading patient prescription records...</span>
              </div>
            ) : prescriptions.length > 0 ? (
              <>
                <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-left border-collapse min-w-[620px]">
                  <thead>
                    <tr className="border-b border-[#e1e3e4] text-xs font-medium text-[#7a7583]">
                      <th className="py-2.5 px-3">Medicine / Regimen</th>
                      <th className="py-2.5 px-3">Dose</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Prescribed By</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedPrescriptions.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-[#191c1d]">
                          <div>{item.medicine}</div>
                          {item.isElectronicRx && item.prescriptionId ? (
                            <>
                              <div className="text-[10px] text-slate-400 font-mono font-normal">
                                e-Rx #{item.prescriptionId.substring(0, 8).toUpperCase()}
                              </div>
                              {item.collected ? (
                                <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                                    ✓ Collected {item.collectedAt ? `(${new Date(item.collectedAt).toLocaleDateString()})` : ''}
                                  </span>
                                </div>
                              ) : item.pickupReminderEnabled ? (
                                <div className="text-[10px] text-purple-700 font-medium flex items-center gap-1 mt-0.5">
                                  <span>🔔 Pickup Reminder ({item.pickupReminderHours || 2}h)</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">
                                    🔕 Reminder Paused
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-[10px] text-amber-600 font-normal">
                              Clinical Note Regimen
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#191c1d]">{item.dose}</td>
                        <td className="py-3 px-3 text-[#494552]">{item.frequency}</td>
                        <td className="py-3 px-3 text-[#494552]">{item.duration}</td>
                        <td className="py-3 px-3">
                          {item.statusType === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e0f7fa] text-[#00838f]">
                              <span className="size-1.5 rounded-full bg-[#00838f]" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              <span>✓ Completed</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#494552]">{item.prescriber}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.isElectronicRx && item.prescriptionId && !item.collected && (
                              <button
                                type="button"
                                onClick={() => handleMarkCollected(item.prescriptionId)}
                                disabled={markingCollectedId === item.prescriptionId}
                                className="px-2 py-1 rounded-lg border border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
                                title="Mark prescription as collected by patient (CR-08)"
                              >
                                {markingCollectedId === item.prescriptionId ? (
                                  <Loader2 className="size-3 animate-spin text-emerald-600" />
                                ) : (
                                  <CheckCircle2 className="size-3 text-emerald-600" />
                                )}
                                <span>Mark Collected</span>
                              </button>
                            )}
                            {item.isElectronicRx && item.prescriptionId && !item.collected && (
                              <button
                                type="button"
                                onClick={() => handleToggleReminder(item.prescriptionId, !item.pickupReminderEnabled, item.pickupReminderHours || 2)}
                                disabled={updatingReminderId === item.prescriptionId}
                                className={cn(
                                  "px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60",
                                  item.pickupReminderEnabled
                                    ? "border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-purple-700"
                                    : "border-slate-300 hover:border-purple-400 hover:bg-purple-50 text-slate-600"
                                )}
                                title={item.pickupReminderEnabled ? "Pause reminder (CR-08)" : "Enable reminder (CR-08)"}
                              >
                                {updatingReminderId === item.prescriptionId ? (
                                  <Loader2 className="size-3 animate-spin text-purple-600" />
                                ) : item.pickupReminderEnabled ? (
                                  <BellOff className="size-3 text-purple-600" />
                                ) : (
                                  <Bell className="size-3 text-slate-500" />
                                )}
                                <span>{item.pickupReminderEnabled ? "Pause Reminder" : "Enable Reminder"}</span>
                              </button>
                            )}
                            {item.isElectronicRx && item.prescriptionId && (
                              <button
                                type="button"
                                onClick={() => handleDownloadPrescriptionPdf(item.prescriptionId)}
                                disabled={downloadingRxId === item.prescriptionId}
                                className="px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
                                title="Download official digital prescription PDF"
                              >
                                {downloadingRxId === item.prescriptionId ? (
                                  <Loader2 className="size-3 animate-spin text-[#5b14b8]" />
                                ) : (
                                  <Download className="size-3 text-slate-500" />
                                )}
                                <span>PDF</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setRefillModalError(null);
                                setSelectedRefillItem(item);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#5b14b8] hover:bg-purple-50 text-[#5b14b8] text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Authorize Refill
                            </button>
                            {item.status.toLowerCase() !== 'discontinued' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDiscontinueItem(item);
                                  setDiscontinueReason('');
                                  setDiscontinueNotes('');
                                  setDiscontinueError(null);
                                }}
                                className="px-2 py-1 rounded-lg border border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Discontinue medication regimen"
                              >
                                Discontinue
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Prescription History Pagination Controls (10 items max per page) */}
              {prescriptions.length > PRESCRIPTIONS_PER_PAGE && (
                <nav
                  aria-label="Prescription History Pagination"
                  className="pt-3 border-t border-[#e1e3e4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
                >
                  <p className="text-[#494552] font-medium">
                    Showing{' '}
                    <span className="font-bold text-[#191c1d]">
                      {(safePrescriptionsPage - 1) * PRESCRIPTIONS_PER_PAGE + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-bold text-[#191c1d]">
                      {Math.min(safePrescriptionsPage * PRESCRIPTIONS_PER_PAGE, prescriptions.length)}
                    </span>{' '}
                    of <span className="font-bold text-[#191c1d]">{prescriptions.length}</span> prescriptions
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPrescriptionsPage((p) => Math.max(1, p - 1))}
                      disabled={safePrescriptionsPage <= 1}
                      className={cn(
                        'h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors',
                        safePrescriptionsPage <= 1
                          ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                          : 'border-[#cbc4d4] text-[#191c1d] bg-white hover:bg-slate-50 cursor-pointer shadow-sm'
                      )}
                      aria-label="Previous prescriptions page"
                    >
                      <ChevronLeft className="size-3.5" aria-hidden="true" />
                      <span>Previous</span>
                    </button>

                    <div className="px-2.5 py-1 text-xs font-semibold text-[#191c1d] whitespace-nowrap">
                      Page <span className="text-[#5b14b8] font-bold">{safePrescriptionsPage}</span> of {totalPrescriptionPages}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPrescriptionsPage((p) => Math.min(totalPrescriptionPages, p + 1))}
                      disabled={safePrescriptionsPage >= totalPrescriptionPages}
                      className={cn(
                        'h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors',
                        safePrescriptionsPage >= totalPrescriptionPages
                          ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                          : 'border-[#cbc4d4] text-[#191c1d] bg-white hover:bg-slate-50 cursor-pointer shadow-sm'
                      )}
                      aria-label="Next prescriptions page"
                    >
                      <span>Next</span>
                      <ChevronRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </nav>
              )}
            </>
            ) : (
              <div className="py-10 text-center space-y-2">
                <div className="size-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <Pill className="size-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-700">No Active Prescriptions</h3>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  No active pharmaceutical orders or drug regimens have been committed to this patient&apos;s medical record.
                </p>
              </div>
            )}
          </section>

          {/* Section: Clinical Timeline & SOAP Notes (Figma node 1:6505) */}
          <section
            aria-label="Clinical SOAP Notes"
            className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-5"
          >
            <div className="flex items-center gap-2 pb-2">
              <Clock className="size-4.5 text-[#191c1d]" aria-hidden="true" />
              <h2 className="text-base font-bold text-[#191c1d]">Clinical Timeline &amp; Notes</h2>
            </div>

            <div className="space-y-4">
              {isLoading && timelineEntries.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="size-5 animate-spin text-[#5b14b8]" />
                  <span className="text-xs">Loading clinical timeline...</span>
                </div>
              ) : timelineEntries.length > 0 ? (
                <>
                  {/* Render paginated timeline entries */}
                  {paginatedTimelineEntries.map((entry) => {
                    if (entry.kind === 'record') {
                      const r = entry.data;
                      const encounterDoctor = (r.encounters as Array<{ providerName?: string }>)?.[0]?.providerName;
                      const author = encounterDoctor || doctorDisplayName;

                      return (
                        <div key={entry.id} className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-[#5b14b8]" />
                              <span className="font-bold text-[#191c1d]">{r.title}</span>
                            </div>
                            <span className="text-[#7a7583]">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'} • {author}
                            </span>
                          </div>

                          <div className="p-4 rounded-xl border border-[#e1e3e4] bg-[#fbfcfd] space-y-2 text-xs text-[#191c1d] leading-relaxed">
                            {r.chiefComplaint && (
                              <p><strong className="text-[#191c1d]">S:</strong> {r.chiefComplaint}</p>
                            )}
                            {r.clinicalNotes && (
                              <p><strong className="text-[#191c1d]">O:</strong> {r.clinicalNotes}</p>
                            )}
                            {r.treatmentPlan && (
                              <p className="text-[#00838f] font-semibold">
                                <strong className="text-[#00838f]">P:</strong> Plan: {r.treatmentPlan}
                              </p>
                            )}
                            {r.followUpInstructions && (
                              <p className="text-[#494552]">
                                <strong>Follow-up:</strong> {r.followUpInstructions}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Historical Attachments from Timeline
                    const att = entry.data;
                    return (
                      <div key={entry.id} className="p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <FileText className="size-4 text-[#5b14b8] shrink-0" />
                          <div>
                            <div className="font-bold text-slate-800">{att.details?.originalName || att.title}</div>
                            <div className="text-[11px] text-slate-500">
                              {att.category || 'Diagnostic Attachment'} • {att.date ? new Date(att.date).toLocaleDateString() : 'Historical'}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-[#5b14b8] border border-purple-100">
                          Attachment
                        </span>
                      </div>
                    );
                  })}

                  {/* Clinical Timeline & Notes Pagination Controls (10 items max per page) */}
                  {timelineEntries.length > TIMELINE_PER_PAGE && (
                    <nav
                      aria-label="Clinical Timeline Pagination"
                      className="pt-3 border-t border-[#e1e3e4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
                    >
                      <p className="text-[#494552] font-medium">
                        Showing{' '}
                        <span className="font-bold text-[#191c1d]">
                          {(safeTimelinePage - 1) * TIMELINE_PER_PAGE + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-bold text-[#191c1d]">
                          {Math.min(safeTimelinePage * TIMELINE_PER_PAGE, timelineEntries.length)}
                        </span>{' '}
                        of <span className="font-bold text-[#191c1d]">{timelineEntries.length}</span> entries
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTimelinePage((p) => Math.max(1, p - 1))}
                          disabled={safeTimelinePage <= 1}
                          className={cn(
                            'h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors',
                            safeTimelinePage <= 1
                              ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                              : 'border-[#cbc4d4] text-[#191c1d] bg-white hover:bg-slate-50 cursor-pointer shadow-sm'
                          )}
                          aria-label="Previous timeline page"
                        >
                          <ChevronLeft className="size-3.5" aria-hidden="true" />
                          <span>Previous</span>
                        </button>

                        <div className="px-2.5 py-1 text-xs font-semibold text-[#191c1d] whitespace-nowrap">
                          Page <span className="text-[#5b14b8] font-bold">{safeTimelinePage}</span> of {totalTimelinePages}
                        </div>

                        <button
                          type="button"
                          onClick={() => setTimelinePage((p) => Math.min(totalTimelinePages, p + 1))}
                          disabled={safeTimelinePage >= totalTimelinePages}
                          className={cn(
                            'h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors',
                            safeTimelinePage >= totalTimelinePages
                              ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                              : 'border-[#cbc4d4] text-[#191c1d] bg-white hover:bg-slate-50 cursor-pointer shadow-sm'
                          )}
                          aria-label="Next timeline page"
                        >
                          <span>Next</span>
                          <ChevronRight className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </nav>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-xs text-[#7a7583]">
                  No clinical notes documented for this patient.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column (Span 4): Hospital Admissions Card (Figma node 1:6558) */}
        <aside className="lg:col-span-4" aria-label="Hospital Admissions">
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded bg-rose-50 text-[#ba1a1a] border border-rose-200 flex items-center justify-center text-xs font-bold">
                  +
                </span>
                <h2 className="text-base font-bold text-[#191c1d]">Hospital Admissions</h2>
              </div>
              {admissions.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-[#ba1a1a] border border-rose-100">
                  {admissions.length} Record{admissions.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {isAdmissionsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 min-h-[240px]">
                <Loader2 className="size-6 animate-spin text-[#ba1a1a]" />
                <span className="text-xs">Loading admission records...</span>
              </div>
            ) : admissionsError ? (
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-rose-600 shrink-0" />
                  <span>{admissionsError}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchAdmissions}
                  className="px-2.5 py-1 bg-white border border-rose-300 text-rose-700 font-semibold rounded text-[11px] hover:bg-rose-100 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : admissions.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {admissions.map((adm, idx) => (
                  <div
                    key={`adm-${adm.id || idx}-${idx}`}
                    className="p-3.5 rounded-xl border border-[#e1e3e4] bg-[#fbfcfd] space-y-2 text-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-[#191c1d] leading-snug">{adm.title}</div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {adm.status === 'FINAL' ? 'Completed' : adm.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#7a7583] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3 text-slate-400 shrink-0" />
                        <span>{adm.facilityName || 'CareID Health Center'}</span>
                      </div>
                      {adm.ward && (
                        <div className="flex items-center gap-1.5">
                          <Hospital className="size-3 text-slate-400 shrink-0" />
                          <span>{adm.ward} {adm.roomBed ? `• ${adm.roomBed}` : ''}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-slate-400 shrink-0" />
                        <span>
                          {adm.encounterDate ? new Date(adm.encounterDate).toLocaleDateString() : 'Recorded'}
                          {adm.dischargeDate ? ` → ${new Date(adm.dischargeDate).toLocaleDateString()}` : ''}
                        </span>
                      </div>
                      {adm.providerName && (
                        <div className="flex items-center gap-1.5">
                          <User className="size-3 text-slate-400 shrink-0" />
                          <span>{adm.providerName}</span>
                        </div>
                      )}
                    </div>
                    {adm.diagnoses && adm.diagnoses.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-100 text-[11px] text-[#ba1a1a] font-medium">
                        <strong>Diagnosis:</strong> {adm.diagnoses[0].description}
                      </div>
                    )}
                    {adm.chiefComplaint && (
                      <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                        &quot;{adm.chiefComplaint}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-[#cbc4d4] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[380px]">
                <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center text-[#7a7583]">
                  <Hospital className="size-7 text-[#7a7583]" />
                </div>
                <h3 className="text-sm font-bold text-[#191c1d]">No Recent Admissions</h3>
                <p className="text-xs text-[#7a7583] max-w-[220px] leading-relaxed">
                  There are no inpatient hospital admissions recorded for this patient in the clinical registry.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Electronic Prescription Refill Authorization Modal */}
      {selectedRefillItem && (
        <div
          data-testid="refill-authorization-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-labelledby="refill-modal-title"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-[#5b14b8]">
                <Pill className="size-5" />
                <div>
                  <h3 id="refill-modal-title" className="text-base font-bold text-slate-900">
                    Electronic Refill Authorization (e-Rx)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedRefillItem.isElectronicRx && selectedRefillItem.prescriptionId
                      ? `Prescription UUID: ${selectedRefillItem.prescriptionId.substring(0, 8)}...`
                      : 'Clinical Regimen (Unregistered in e-Rx Gateway)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRefillItem(null);
                  setRefillModalError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {refillModalError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Refill Authorization Notice</div>
                  <div className="text-[11px] leading-relaxed mt-0.5">{refillModalError}</div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900">{patientDisplayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medication:</span>
                <span className="font-bold text-slate-900">{selectedRefillItem.medicine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dose &amp; Frequency:</span>
                <span className="text-slate-800 font-medium">{selectedRefillItem.dose} • {selectedRefillItem.frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="text-slate-800 font-medium">{selectedRefillItem.duration}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Supervising Physician:</span>
                <span className="font-semibold text-[#5b14b8]">{selectedRefillItem.prescriber || doctorDisplayName}</span>
              </div>
            </div>

            {/* If the item is a clinical consultation note rather than a genuine backend e-Rx entity */}
            {!selectedRefillItem.isElectronicRx && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-2 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldAlert className="size-4 text-amber-700 shrink-0" />
                  <span>Clinical Note Regimen (No Active e-Rx Order)</span>
                </div>
                <p>
                  This medication regimen was parsed from a clinical consultation note and does not have an electronic prescription record registered in the e-Rx gateway. Electronic refills require an active e-Rx order.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFormMedication(selectedRefillItem.medicine);
                    setFormDosage(selectedRefillItem.dose !== '—' ? selectedRefillItem.dose : '');
                    setFormFrequency(selectedRefillItem.frequency !== 'As directed' ? selectedRefillItem.frequency : 'Once daily');
                    setFormDuration(selectedRefillItem.duration !== '—' ? selectedRefillItem.duration : '30 days');
                    setFormIndication(`Prescription for ${selectedRefillItem.medicine}`);
                    setSelectedRefillItem(null);
                    setRefillModalError(null);
                    setShowNewEntryModal(true);
                  }}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="size-3.5" />
                  <span>Create Electronic Prescription (e-Rx)</span>
                </button>
              </div>
            )}

            {/* Truthful Clinical Notice */}
            {selectedRefillItem.isElectronicRx && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldAlert className="size-4 text-amber-700 shrink-0" />
                  <span>e-Rx Surescripts Gateway Notice</span>
                </div>
                <p>
                  Transmitting an electronic prescription refill registers an authorized clinical order in the patient&apos;s EHR ledger.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedRefillItem(null);
                  setRefillModalError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              {selectedRefillItem.isElectronicRx && (
                <button
                  type="button"
                  disabled={isAuthorizingRefill}
                  onClick={handleConfirmRefill}
                  className="px-5 py-2 rounded-xl bg-gradient-to-b from-[#a44cff] to-[#5b14b8] hover:opacity-95 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isAuthorizingRefill ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <span>Authorize &amp; Transmit Refill</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Electronic Prescription Discontinuation Modal */}
      {selectedDiscontinueItem && (
        <div
          data-testid="discontinue-prescription-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-labelledby="discontinue-modal-title"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="size-5" />
                <div>
                  <h3 id="discontinue-modal-title" className="text-base font-bold text-slate-900">
                    Discontinue Prescription
                  </h3>
                  <p className="text-xs text-slate-500">
                    Document clinical reason for stopping {selectedDiscontinueItem.medicine}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDiscontinueItem(null);
                  setDiscontinueError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {discontinueError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{discontinueError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="font-semibold text-slate-900">{selectedDiscontinueItem.medicine}</div>
              <div className="text-slate-600">
                {selectedDiscontinueItem.dose} • {selectedDiscontinueItem.frequency} ({selectedDiscontinueItem.duration})
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Clinical Justification / Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={discontinueReason}
                  onChange={(e) => setDiscontinueReason(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                >
                  <option value="">Select clinical reason...</option>
                  <option value="Therapy completed / Condition resolved">Therapy completed / Condition resolved</option>
                  <option value="Adverse drug reaction / Intolerance">Adverse drug reaction / Intolerance</option>
                  <option value="Ineffective / Sub-therapeutic response">Ineffective / Sub-therapeutic response</option>
                  <option value="Switched to alternative regimen">Switched to alternative regimen</option>
                  <option value="Patient request / Non-adherence">Patient request / Non-adherence</option>
                  <option value="Other clinical rationale">Other clinical rationale</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Clinical Notes (Optional)
                </label>
                <textarea
                  value={discontinueNotes}
                  onChange={(e) => setDiscontinueNotes(e.target.value)}
                  placeholder="Document specific clinical rationale or follow-up instructions..."
                  rows={3}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedDiscontinueItem(null);
                  setDiscontinueError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDiscontinuing || !discontinueReason}
                onClick={handleConfirmDiscontinue}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isDiscontinuing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Discontinuing...</span>
                  </>
                ) : (
                  <span>Discontinue Medication</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Prescription Entry Modal */}
      {showNewEntryModal && (
        <div
          data-testid="new-entry-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-labelledby="new-entry-title"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-[#5b14b8]">
                <Pill className="size-5" />
                <div>
                  <h3 id="new-entry-title" className="text-base font-bold text-slate-900">
                    New Medication Order
                  </h3>
                  <p className="text-xs text-slate-500">
                    Issue prescription for {patientDisplayName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewEntryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePrescriptionSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Medication Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formMedication}
                  onChange={(e) => setFormMedication(e.target.value)}
                  placeholder="e.g. Atorvastatin Calcium, Amoxicillin, Metformin"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5b14b8] focus:ring-1 focus:ring-[#5b14b8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Dosage <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formDosage}
                    onChange={(e) => setFormDosage(e.target.value)}
                    placeholder="e.g. 20mg, 500mg, 10ml"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5b14b8] focus:ring-1 focus:ring-[#5b14b8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Frequency <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#5b14b8] focus:ring-1 focus:ring-[#5b14b8]"
                  >
                    <option value="Once daily">Once daily</option>
                    <option value="Once daily at bedtime">Once daily at bedtime</option>
                    <option value="Twice daily (BID)">Twice daily (BID)</option>
                    <option value="Three times daily (TID)">Three times daily (TID)</option>
                    <option value="Four times daily (QID)">Four times daily (QID)</option>
                    <option value="Every 8 hours">Every 8 hours</option>
                    <option value="As needed (PRN)">As needed (PRN)</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="e.g. 30 days, 90 days, Ongoing"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5b14b8] focus:ring-1 focus:ring-[#5b14b8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Clinical Indication / Diagnosis <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formIndication}
                    onChange={(e) => setFormIndication(e.target.value)}
                    placeholder="e.g. Hyperlipidemia, Angina"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5b14b8] focus:ring-1 focus:ring-[#5b14b8]"
                  />
                </div>
              </div>

              {/* CR-08: Prescription Pickup Reminder Configuration */}
              <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 text-xs">
                    <input
                      type="checkbox"
                      checked={formPickupReminder}
                      onChange={(e) => setFormPickupReminder(e.target.checked)}
                      className="rounded border-slate-300 text-[#5b14b8] focus:ring-[#5b14b8]"
                    />
                    <span>Patient Pharmacy Pickup Reminder (CR-08)</span>
                  </label>
                  <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-medium">
                    Automated Alert
                  </span>
                </div>
                {formPickupReminder && (
                  <div className="flex items-center gap-2 pt-1 pl-6">
                    <span className="text-slate-600 text-xs">Reminder Trigger:</span>
                    <select
                      value={formPickupReminderHours}
                      onChange={(e) => setFormPickupReminderHours(Number(e.target.value))}
                      className="px-2.5 py-1 rounded-lg border border-purple-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#5b14b8]"
                    >
                      <option value={1}>1 hour post-consultation</option>
                      <option value={2}>2 hours post-consultation (Standard)</option>
                      <option value={4}>4 hours post-consultation</option>
                      <option value={12}>12 hours post-consultation</option>
                      <option value={24}>24 hours post-consultation</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">
                  Instructions &amp; Follow-up (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="e.g. Take with evening meal. Follow-up blood panel in 8 weeks."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#5b14b8] focus:ring-1 focus:ring-[#5b14b8] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewEntryModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white text-xs font-bold hover:opacity-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving Order...</span>
                    </>
                  ) : (
                    <span>Save &amp; Issue Prescription</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionsPage;
