import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Pill,
  Search,
  TrendingUp,
  Upload,
  RotateCw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatientList, usePatientProfile, usePatientRecords, usePatientVitals, usePatientAvatar } from '@/hooks/usePatients';
import { patientService, MedicalRecord, extractLatestVitalsFromRecords, calculateAge } from '@/services/patientService';
import { parseTreatmentPlan } from '@/services/prescriptionService';
import patientAvatarHero from '@/assets/avatars/patient-avatar-hero.png';
import patientAvatarMale from '@/assets/avatars/patient-avatar-male.png';

const RECORDS_PER_PAGE = 5;
const MEDICATIONS_PER_PAGE = 5;

type RecordCategory = 'all' | 'lab' | 'radiology' | 'consultations';

interface RecordClassification {
  isLab: boolean;
  isRadiology: boolean;
  isClinical: boolean;
  isPrescription: boolean;
  primaryCategory: 'Lab Report' | 'Radiology' | 'Prescription' | 'Clinical Note';
  primaryType: 'lab' | 'radiology' | 'consultations';
}

function classifyRecord(r: MedicalRecord): RecordClassification {
  const titleLower = (r.title || '').toLowerCase();

  const hasLabAttachment = Boolean(
    r.attachments?.some(
      (a) =>
        a.category?.toLowerCase().includes('lab') ||
        (a.fileName?.toLowerCase().includes('lab') && a.mimeType?.toLowerCase().includes('pdf'))
    )
  );

  const isLab =
    hasLabAttachment ||
    titleLower.includes('lab') ||
    titleLower.includes('panel') ||
    titleLower.includes('blood') ||
    titleLower.includes('metabolic') ||
    titleLower.includes('lipid') ||
    titleLower.includes('ecg');

  const hasRadioAttachment = Boolean(
    r.attachments?.some(
      (a) =>
        a.category?.toLowerCase().includes('radio') ||
        a.category?.toLowerCase().includes('image') ||
        a.category?.toLowerCase().includes('dicom')
    )
  );

  const isRadiology =
    hasRadioAttachment ||
    titleLower.includes('x-ray') ||
    titleLower.includes('mri') ||
    titleLower.includes('ct') ||
    titleLower.includes('scan') ||
    titleLower.includes('ultrasound') ||
    titleLower.includes('radiology') ||
    titleLower.includes('fluoroscopy');

  const isPrescription = Boolean(
    (r.treatmentPlan &&
      (r.treatmentPlan.toLowerCase().includes('mg') ||
        r.treatmentPlan.toLowerCase().includes('daily') ||
        r.treatmentPlan.toLowerCase().includes('tablet') ||
        r.treatmentPlan.toLowerCase().includes('aspirin') ||
        r.treatmentPlan.toLowerCase().includes('medication') ||
        r.treatmentPlan.toLowerCase().includes('prescription') ||
        r.treatmentPlan.toLowerCase().includes('dose') ||
        r.treatmentPlan.toLowerCase().includes('therapy'))) ||
      titleLower.includes('prescription') ||
      titleLower.includes('medication') ||
      titleLower.includes('rx')
  );

  const isClinical = Boolean(
    r.clinicalNotes ||
      r.chiefComplaint ||
      r.followUpInstructions ||
      (r.diagnoses && r.diagnoses.length > 0) ||
      (r.encounters && r.encounters.length > 0) ||
      (r.vitalSigns && r.vitalSigns.length > 0) ||
      (r.procedures && r.procedures.length > 0) ||
      titleLower.includes('consultation') ||
      titleLower.includes('encounter') ||
      titleLower.includes('checkup') ||
      titleLower.includes('clinical') ||
      titleLower.includes('note') ||
      titleLower.includes('health') ||
      titleLower.includes('routine') ||
      titleLower.includes('admission') ||
      titleLower.includes('record') ||
      (!isLab && !isRadiology)
  );

  let primaryCategory: 'Lab Report' | 'Radiology' | 'Prescription' | 'Clinical Note' = 'Clinical Note';
  let primaryType: 'lab' | 'radiology' | 'consultations' = 'consultations';

  if (isLab) {
    primaryCategory = 'Lab Report';
    primaryType = 'lab';
  } else if (isRadiology) {
    primaryCategory = 'Radiology';
    primaryType = 'radiology';
  } else if (isPrescription) {
    primaryCategory = 'Prescription';
    primaryType = 'consultations';
  } else {
    primaryCategory = 'Clinical Note';
    primaryType = 'consultations';
  }

  return {
    isLab,
    isRadiology,
    isClinical,
    isPrescription,
    primaryCategory,
    primaryType,
  };
}

export const MedicalRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<RecordCategory>('all');
  const [selectedFacility, setSelectedFacility] = useState('All Facilities');
  const [dateRange, setDateRange] = useState('All Time');
  const [recordTypeCheckboxes, setRecordTypeCheckboxes] = useState({
    labs: false,
    radiology: false,
    clinical: false,
    prescriptions: false,
  });

  // Dynamic facilities list from API
  const [facilities, setFacilities] = useState<string[]>(['All Facilities']);

  // Independent pagination states (10 items per page max)
  const [recordsPage, setRecordsPage] = useState(1);
  const [medicationsPage, setMedicationsPage] = useState(1);

  // 1. Resolve patient ID: from query params or first available patient from API
  const queryPatientId = searchParams.get('patientId') || searchParams.get('id');
  const { patients: patientList, isLoading: isListLoading } = usePatientList({ limit: 1 });

  const activePatientId = queryPatientId || (patientList.length > 0 ? patientList[0].id : undefined);

  // Sync active patient ID into search params if not present
  useEffect(() => {
    if (!queryPatientId && patientList.length > 0) {
      setSearchParams({ patientId: patientList[0].id }, { replace: true });
    }
  }, [queryPatientId, patientList, setSearchParams]);

  // Load facilities from backend API
  useEffect(() => {
    async function loadFacilities() {
      try {
        const facList = await patientService.getFacilities();
        setFacilities(['All Facilities', ...facList]);
      } catch {
        setFacilities(['All Facilities']);
      }
    }
    loadFacilities();
  }, []);

  // 2. Fetch active patient profile & records from live backend
  const {
    patient,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = usePatientProfile(activePatientId);

  const {
    records,
    isLoading: isRecordsLoading,
    error: recordsError,
    refetch: refetchRecords,
  } = usePatientRecords(activePatientId);

  const {
    latestVitals: vitalsFromEndpoint,
    isLoading: isVitalsLoading,
  } = usePatientVitals(activePatientId);

  const isLoading = isListLoading || isProfileLoading || isRecordsLoading || isVitalsLoading;

  // Strict patient isolation: Ensure records strictly match activePatientId or associated patient userId
  const patientRecords = useMemo(() => {
    if (!activePatientId) return records;
    const targetId = activePatientId.toLowerCase();
    const patientUserId = patient?.userId?.toLowerCase();
    const patientId = patient?.id?.toLowerCase();
    return records.filter((r) => {
      const recId =
        r.patientProfileId ||
        (r as unknown as { patientId?: string }).patientId ||
        (r as unknown as { patient?: { id?: string } }).patient?.id;
      if (!recId) return true;
      const cleanRecId = recId.toLowerCase();
      return (
        cleanRecId === targetId ||
        (patientUserId && cleanRecId === patientUserId) ||
        (patientId && cleanRecId === patientId)
      );
    });
  }, [records, activePatientId, patient]);

  // Determine primary associated facility name without hardcoding placeholders
  const defaultFacilityName = patient?.currentCity || 'Authorized Facility';

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(searchQuery.trim()) ||
      selectedType !== 'all' ||
      selectedFacility !== 'All Facilities' ||
      dateRange !== 'All Time' ||
      recordTypeCheckboxes.labs ||
      recordTypeCheckboxes.radiology ||
      recordTypeCheckboxes.clinical ||
      recordTypeCheckboxes.prescriptions
    );
  }, [searchQuery, selectedType, selectedFacility, dateRange, recordTypeCheckboxes]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedFacility('All Facilities');
    setDateRange('All Time');
    setRecordTypeCheckboxes({
      labs: false,
      radiology: false,
      clinical: false,
      prescriptions: false,
    });
    setRecordsPage(1);
  };

  // Reset pagination when search / filter criteria change
  useEffect(() => {
    setRecordsPage(1);
  }, [searchQuery, selectedType, selectedFacility, dateRange, recordTypeCheckboxes]);

  // Reset pagination when active patient changes
  useEffect(() => {
    setRecordsPage(1);
    setMedicationsPage(1);
  }, [activePatientId]);

  // Comprehensive multi-criteria filtering on authentic patient records
  const filteredRecords = useMemo(() => {
    return patientRecords.filter((r) => {
      const cats = classifyRecord(r);

      // A. Category Tab Filter (All, Lab, Radiology, Consultations)
      if (selectedType === 'lab' && !cats.isLab) return false;
      if (selectedType === 'radiology' && !cats.isRadiology) return false;
      if (selectedType === 'consultations' && !cats.isClinical && !cats.isPrescription) return false;

      // B. Record Type Checkboxes (Lab Reports, Radiology, Clinical Notes, Prescriptions)
      const anyCheckboxActive =
        recordTypeCheckboxes.labs ||
        recordTypeCheckboxes.radiology ||
        recordTypeCheckboxes.clinical ||
        recordTypeCheckboxes.prescriptions;

      if (anyCheckboxActive) {
        const matchesSelectedCheckboxes =
          (recordTypeCheckboxes.labs && cats.isLab) ||
          (recordTypeCheckboxes.radiology && cats.isRadiology) ||
          (recordTypeCheckboxes.clinical && cats.isClinical) ||
          (recordTypeCheckboxes.prescriptions && cats.isPrescription);

        if (!matchesSelectedCheckboxes) return false;
      }

      // C. Search Record Text (Title, Diagnoses, Clinical Notes, Complaints, Treatment Plans, Attachments)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const titleMatch = (r.title || '').toLowerCase().includes(q);
        const categoryMatch = cats.primaryCategory.toLowerCase().includes(q);
        const complaintMatch = (r.chiefComplaint || '').toLowerCase().includes(q);
        const notesMatch = (r.clinicalNotes || '').toLowerCase().includes(q);
        const planMatch = (r.treatmentPlan || '').toLowerCase().includes(q);
        const followUpMatch = (r.followUpInstructions || '').toLowerCase().includes(q);
        const diagnosesMatch = Boolean(
          r.diagnoses?.some(
            (d) =>
              (d.description || '').toLowerCase().includes(q) ||
              (d.code || '').toLowerCase().includes(q)
          )
        );
        const attachmentsMatch = Boolean(
          r.attachments?.some(
            (a) =>
              (a.fileName || '').toLowerCase().includes(q) ||
              (a.category || '').toLowerCase().includes(q)
          )
        );

        const anySearchMatch =
          titleMatch ||
          categoryMatch ||
          complaintMatch ||
          notesMatch ||
          planMatch ||
          followUpMatch ||
          diagnosesMatch ||
          attachmentsMatch;

        if (!anySearchMatch) return false;
      }

      // D. Date Range Filter (Past 1 Month, Past 3 Months, Past 6 Months, Past Year, All Time)
      if (dateRange && dateRange !== 'All Time' && dateRange !== 'All History') {
        const recDate = new Date(r.createdAt || Date.now());
        const now = new Date();
        let days = 180; // Default 6 months
        if (dateRange === 'Past 1 Month' || dateRange === 'Past 30 Days') days = 30;
        else if (dateRange === 'Past 3 Months') days = 90;
        else if (dateRange === 'Past 6 Months') days = 180;
        else if (dateRange === 'Past Year' || dateRange === 'Past 1 Year') days = 365;

        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        if (recDate < cutoff) return false;
      }

      // E. Hospital / Clinic Facility Filter
      if (selectedFacility && selectedFacility !== 'All Facilities') {
        const assignedFacility = (r.facilityName || r.facility || defaultFacilityName).toLowerCase();
        if (!assignedFacility.includes(selectedFacility.toLowerCase())) return false;
      }

      return true;
    });
  }, [
    patientRecords,
    selectedType,
    recordTypeCheckboxes,
    searchQuery,
    dateRange,
    selectedFacility,
    defaultFacilityName,
  ]);

  // Format filtered records for view display using authentic backend fields
  const mappedRecords = useMemo(() => {
    return filteredRecords.map((r) => {
      const cats = classifyRecord(r);
      const isNormal = r.status === 'FINAL' || r.status === 'COMPLETED' || r.status === 'ACTIVE';
      const displayStatus =
        r.status === 'FINAL'
          ? 'Final'
          : r.status === 'COMPLETED'
          ? 'Completed'
          : r.status === 'ACTIVE'
          ? 'Active'
          : r.status === 'DRAFT'
          ? 'Draft'
          : r.status === 'AMENDED'
          ? 'Amended'
          : r.status === 'ARCHIVED'
          ? 'Archived'
          : r.status || 'Active';

      const isVerified = Boolean(
        r.isVerified === true ||
        r.verificationStatus === 'VERIFIED' ||
        r.status === 'VERIFIED'
      );

      const encounterFacility = r.encounters?.[0]?.facilityName;
      const facilityDisplay = r.facilityName || r.facility || encounterFacility || defaultFacilityName;
      const encounterPhysician = r.encounters?.[0]?.providerName;
      const physicianDisplay = r.doctorName || r.providerName || encounterPhysician;
      const locationString = physicianDisplay ? `${facilityDisplay} • ${physicianDisplay}` : facilityDisplay;

      return {
        id: r.id,
        title: r.title || 'Clinical Encounter Note',
        category: cats.primaryCategory,
        type: cats.primaryType,
        date: r.createdAt
          ? new Date(r.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Date unavailable',
        facility: locationString,
        status: displayStatus,
        statusType: isNormal ? 'normal' : 'review',
        badge: isVerified ? 'Verified' : 'Unverified',
        badgeType: isVerified ? 'verified' : 'unverified',
        accentColor: isNormal ? 'border-l-[#00c5df]' : 'border-l-[#ba1a1a]',
        actionUrl: `/records/${r.id}?patientId=${activePatientId}`,
      };
    });
  }, [filteredRecords, defaultFacilityName, activePatientId]);

  // Latest Vitals genuinely extracted from dedicated vitals endpoint, authentic patient records, or profile
  const latestVitals = useMemo(() => {
    if (vitalsFromEndpoint && (vitalsFromEndpoint.bp || vitalsFromEndpoint.hr || vitalsFromEndpoint.spo2 || vitalsFromEndpoint.temp)) {
      return vitalsFromEndpoint;
    }
    const fromRecords = extractLatestVitalsFromRecords(patientRecords);
    if (fromRecords && (fromRecords.bp || fromRecords.hr || fromRecords.spo2 || fromRecords.temp)) {
      return fromRecords;
    }
    if (patient?.vitals && (patient.vitals.bp || patient.vitals.hr || patient.vitals.spo2 || patient.vitals.temp)) {
      return patient.vitals;
    }
    return fromRecords || vitalsFromEndpoint;
  }, [vitalsFromEndpoint, patientRecords, patient?.vitals]);

  // Current Medications genuinely derived from authentic patient records and treatment plans
  const currentMedications = useMemo(() => {
    const meds: Array<{
      id: string;
      medicine: string;
      dose: string;
      frequency: string;
      duration: string;
      status: string;
      statusType: 'active' | 'completed';
    }> = [];

    for (const r of patientRecords) {
      if (r.treatmentPlan && r.treatmentPlan.trim()) {
        const parsed = parseTreatmentPlan(r.treatmentPlan, r.title);
        const isAct = r.status === 'FINAL' || r.status === 'ACTIVE';
        meds.push({
          id: r.id,
          medicine: parsed.medicine,
          dose: parsed.dose,
          frequency: parsed.frequency,
          duration: parsed.duration,
          status: isAct ? 'Active' : 'Completed',
          statusType: isAct ? 'active' : 'completed',
        });
      }
    }
    return meds;
  }, [patientRecords]);

  // Derived pagination for Medical Records (10 items max per page)
  const totalRecordPages = Math.max(1, Math.ceil(mappedRecords.length / RECORDS_PER_PAGE));
  const safeRecordsPage = Math.min(Math.max(1, recordsPage), totalRecordPages);
  const paginatedRecords = useMemo(() => {
    const startIdx = (safeRecordsPage - 1) * RECORDS_PER_PAGE;
    return mappedRecords.slice(startIdx, startIdx + RECORDS_PER_PAGE);
  }, [mappedRecords, safeRecordsPage]);

  // Derived pagination for Current Medications (10 items max per page)
  const totalMedicationPages = Math.max(1, Math.ceil(currentMedications.length / MEDICATIONS_PER_PAGE));
  const safeMedicationsPage = Math.min(Math.max(1, medicationsPage), totalMedicationPages);
  const paginatedMedications = useMemo(() => {
    const startIdx = (safeMedicationsPage - 1) * MEDICATIONS_PER_PAGE;
    return currentMedications.slice(startIdx, startIdx + MEDICATIONS_PER_PAGE);
  }, [currentMedications, safeMedicationsPage]);

  const isPatientVerified = Boolean(
    patient?.profileStatus === 'VERIFIED' ||
    patient?.userStatus === 'VERIFIED' ||
    (patient as Record<string, unknown> | null)?.isVerified === true
  );

  const healthVaultId =
    patient?.healthCard?.cardNumber ||
    (patient?.patientNumber && !patient.patientNumber.startsWith('PT-CAREID-2026') ? patient.patientNumber : null);

  // Determine avatar with authenticated streaming resolver & gender fallback
  const avatarSrc = usePatientAvatar(patient?.photoUrl, patient?.gender);

  if (isLoading && !patient) {
    return (
      <div className="w-full space-y-6 animate-pulse" aria-busy="true">
        <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 h-24" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 bg-white border border-[#cbc4d4] rounded-2xl h-80" />
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-[#cbc4d4] rounded-2xl h-32" />
            <div className="bg-white border border-[#cbc4d4] rounded-2xl h-32" />
          </div>
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-white border border-[#cbc4d4] rounded-2xl h-44" />
            <div className="bg-white border border-[#cbc4d4] rounded-2xl h-44" />
          </div>
        </div>
      </div>
    );
  }

  if (profileError && !patient) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-rose-50 text-[#ba1a1a] mx-auto flex items-center justify-center">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Failed to Load Patient Records</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">{profileError}</p>
        <button
          type="button"
          onClick={() => {
            refetchProfile();
            refetchRecords();
          }}
          className="px-4 py-2 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors inline-flex items-center gap-1.5"
        >
          <RotateCw className="size-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6" data-node-id="1:6023">
      {/* 1. Patient Summary Bar (Figma node 1:6288) */}
      <section
        aria-label="Patient Summary"
        className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-sm bg-slate-100">
            <img
              src={avatarSrc}
              alt={patient?.fullName || 'Patient'}
              className="size-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                const fallback =
                  patient?.gender?.toLowerCase() === 'female'
                    ? patientAvatarHero
                    : patientAvatarMale;
                if (target.src !== fallback) {
                  target.src = fallback;
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-[#191c1d] leading-7">
                {patient?.fullName || 'Patient Medical Records'}
              </h1>
              {isPatientVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e0f7fa] text-[#00838f]">
                  <Check className="size-3 stroke-[3]" aria-hidden="true" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-[#494552] border border-slate-200">
                  <span>Unverified Profile</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#494552] flex-wrap">
              {activePatientId && (
                <>
                  <span className="text-[#191c1d] font-semibold">
                    ID: {activePatientId.slice(0, 8)}
                  </span>
                  <span>•</span>
                </>
              )}
              {healthVaultId && (
                <>
                  <span className="text-[#00838f] font-semibold">
                    HV-ID: {healthVaultId}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{patient?.gender || 'Gender unrecorded'}</span>
              <span>•</span>
              <span className="inline-flex items-center text-emerald-700 font-semibold">
                <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5" aria-hidden="true" />
                {patient?.profileStatus || patient?.userStatus || 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls on Summary Bar (Figma node 1:6304) */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              refetchProfile();
              refetchRecords();
            }}
            disabled={isLoading}
            className="h-10 px-4 rounded-lg bg-white border border-[#cbc4d4] text-sm font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b14b8] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reload records and patient telemetry"
          >
            <RotateCw className={cn("size-4 text-[#5b14b8]", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </button>

          {activePatientId && (
            <button
              type="button"
              onClick={() => navigate(`/patients/${activePatientId}`)}
              className="h-10 px-5 rounded-lg bg-white border border-[#cbc4d4] text-sm font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b14b8] cursor-pointer"
            >
              <span>Back to Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/records/upload')}
            className="h-10 px-5 rounded-lg bg-white border border-[#cbc4d4] text-sm font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b14b8] flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="size-4 text-[#5b14b8]" />
            <span>Upload Record</span>
          </button>

          {/* Canonical Primary Action Button (Figma node 1:40) */}
          <button
            type="button"
            onClick={() => {
              if (activePatientId) {
                const recAge = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
                navigate(`/treatment-offers/new/step-1?patientId=${encodeURIComponent(activePatientId)}`, {
                  state: {
                    patientId: activePatientId,
                    patientName: patient?.fullName,
                    patientCid: patient?.patientNumber,
                    patientGender: patient?.gender,
                    patientAge: recAge !== null ? `${recAge}` : undefined,
                    patientBlood: patient?.bloodGroup || undefined,
                    patientDob: patient?.dateOfBirth || undefined,
                    patientAllergy: patient?.knownAllergies?.join(', '),
                    insuranceStatus: patient?.insurancePolicy?.providerName
                      ? `Insured (${patient.insurancePolicy.providerName})`
                      : undefined,
                  },
                });
              } else {
                navigate('/treatment-offers/new/step-1');
              }
            }}
            className="h-10 px-6 rounded-lg bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white text-sm font-semibold hover:opacity-95 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b14b8] cursor-pointer"
          >
            <span>Start Consultation</span>
          </button>
        </div>
      </section>

      {/* 2. Main Content Grid: 3-Column Layout (Figma node 1:6068) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filter Records (Span 3) (Figma node 1:6069) */}
        <aside className="lg:col-span-3 space-y-4" aria-label="Record Filters">
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2 text-base font-bold text-[#191c1d]">
                <Filter className="size-4 text-[#191c1d]" aria-hidden="true" />
                <h2>Filter Records</h2>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-[#5b14b8] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Reset all filters to defaults"
                >
                  <X className="size-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Keyword Search Input */}
            <div className="relative">
              <Search className="size-4 absolute left-3 top-3 text-[#7a7583]" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, notes, diagnosis..."
                className="w-full h-10 pl-9 pr-8 rounded-lg bg-[#f3f4f5] border border-[#cbc4d4] text-sm text-[#191c1d] placeholder:text-[#7a7583] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#7a7583] hover:text-[#191c1d] p-0.5"
                  title="Clear search query"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter: Record Type */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#191c1d]">
                  Record Type
                </label>
                {(recordTypeCheckboxes.labs ||
                  recordTypeCheckboxes.radiology ||
                  recordTypeCheckboxes.clinical ||
                  recordTypeCheckboxes.prescriptions) && (
                  <button
                    type="button"
                    onClick={() =>
                      setRecordTypeCheckboxes({
                        labs: false,
                        radiology: false,
                        clinical: false,
                        prescriptions: false,
                      })
                    }
                    className="text-[11px] text-[#5b14b8] hover:underline"
                  >
                    Reset Types
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {[
                  { id: 'labs', label: 'Lab Reports' },
                  { id: 'radiology', label: 'Radiology' },
                  { id: 'clinical', label: 'Clinical Notes' },
                  { id: 'prescriptions', label: 'Prescriptions' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2.5 text-sm text-[#191c1d] hover:text-[#5b14b8] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={recordTypeCheckboxes[item.id as keyof typeof recordTypeCheckboxes]}
                      onChange={(e) => {
                        setRecordTypeCheckboxes((prev) => ({
                          ...prev,
                          [item.id]: e.target.checked,
                        }));
                      }}
                      className="size-4 rounded border-slate-300 text-[#5b14b8] focus:ring-[#5b14b8] cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter: Date Range */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#191c1d]">
                Date Range
              </label>
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full h-10 px-3 bg-[#f8f9fa] border border-[#cbc4d4] rounded-lg text-sm text-[#191c1d] appearance-none focus:outline-none focus:ring-2 focus:ring-[#5b14b8] cursor-pointer"
                >
                  <option value="Past 6 Months">Past 6 Months</option>
                  <option value="Past 3 Months">Past 3 Months</option>
                  <option value="Past 1 Month">Past 1 Month</option>
                  <option value="Past Year">Past Year</option>
                  <option value="All Time">All Time</option>
                </select>
                <ChevronDown className="size-4 absolute right-3 top-3 text-[#494552] pointer-events-none" aria-hidden="true" />
              </div>
            </div>

            {/* Filter: Hospital / Clinic */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#191c1d]">
                Hospital / Clinic
              </label>
              <div className="relative">
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="w-full h-10 px-3 bg-[#f8f9fa] border border-[#cbc4d4] rounded-lg text-sm text-[#191c1d] appearance-none focus:outline-none focus:ring-2 focus:ring-[#5b14b8] cursor-pointer"
                >
                  {facilities.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
                <ChevronDown className="size-4 absolute right-3 top-3 text-[#494552] pointer-events-none" aria-hidden="true" />
              </div>
            </div>
          </div>
        </aside>

        {/* Middle Column: Records Timeline (Span 6) (Figma node 1:6134) */}
        <main className="lg:col-span-6 space-y-4" aria-label="Chronological Records Timeline">
          {/* Filter Chips Row (Figma node 1:6125) */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All' },
                { id: 'lab', label: 'Lab' },
                { id: 'radiology', label: 'Radiology' },
                { id: 'consultations', label: 'Consultations' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedType(chip.id as RecordCategory)}
                  className={cn(
                    'h-8 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8] cursor-pointer',
                    selectedType === chip.id
                      ? 'bg-[#00c5df] text-[#002f34] shadow-sm'
                      : 'bg-white border border-[#cbc4d4] text-[#494552] hover:bg-slate-50'
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-medium text-[#7a7583] whitespace-nowrap">
              {mappedRecords.length > 0 ? (
                <>
                  Showing{' '}
                  <span className="font-bold text-[#191c1d]">
                    {(safeRecordsPage - 1) * RECORDS_PER_PAGE + 1}–
                    {Math.min(safeRecordsPage * RECORDS_PER_PAGE, mappedRecords.length)}
                  </span>{' '}
                  of <span className="font-bold text-[#191c1d]">{mappedRecords.length}</span> records
                </>
              ) : (
                <>Showing <span className="font-bold text-[#191c1d]">0</span> records</>
              )}
            </div>
          </div>

          {/* Chronological List of Cards */}
          <div className="space-y-3.5">
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((record) => (
                <article
                  key={record.id}
                  className={cn(
                    "bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-3.5 border-l-4",
                    record.accentColor
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#191c1d]">
                          {record.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#f3f4f5] text-[#494552] border border-[#e1e3e4]">
                          {record.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#7a7583] flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#191c1d]">⊞</span>
                        <span>{record.facility}</span>
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-xs font-medium text-[#7a7583]">
                        {record.date}
                      </div>
                      {record.statusType === 'normal' ? (
                        <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1 justify-end">
                          <CheckCircle2 className="size-3.5" />
                          <span>{record.status}</span>
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-[#ba1a1a] flex items-center gap-1 justify-end">
                          <AlertCircle className="size-3.5" />
                          <span>{record.status}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Card Footer: Badge on Left, Open Button on Right */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    {record.badgeType === 'verified' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-[#5b14b8] border border-purple-200">
                        <Check className="size-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-[#494552] border border-slate-200">
                        <span>Unverified</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate(record.actionUrl)}
                      className="h-8 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#191c1d] flex items-center gap-1.5 transition-colors focus:outline-none cursor-pointer"
                    >
                      <span>Open</span>
                      <ArrowRight className="size-3.5 text-[#5b14b8]" />
                    </button>
                  </div>
                </article>
              ))
            ) : recordsError ? (
              <div className="bg-white border border-rose-200 rounded-2xl p-10 text-center space-y-3">
                <div className="size-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                  <AlertCircle className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Failed to Load Medical Records</h3>
                <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">
                  {recordsError}
                </p>
                <button
                  type="button"
                  onClick={refetchRecords}
                  className="px-4 py-2 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="size-3.5" />
                  <span>Retry Query</span>
                </button>
              </div>
            ) : (
              <div className="bg-white border border-[#cbc4d4] rounded-2xl p-10 text-center space-y-3">
                <div className="size-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <Activity className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-[#191c1d]">No Medical Records Match Your Filters</h3>
                <p className="text-xs text-[#7a7583] max-w-sm mx-auto">
                  No records match your active search criteria, category filters, facility, or selected date range.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-4 py-2 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="size-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Medical Records Pagination Controls (10 items max per page) */}
          {mappedRecords.length > RECORDS_PER_PAGE && (
            <nav
              aria-label="Medical Records Pagination"
              className="bg-white border border-[#cbc4d4] rounded-2xl px-5 py-3.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
            >
              <p className="text-[#494552] font-medium">
                Showing{' '}
                <span className="font-bold text-[#191c1d]">
                  {(safeRecordsPage - 1) * RECORDS_PER_PAGE + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-[#191c1d]">
                  {Math.min(safeRecordsPage * RECORDS_PER_PAGE, mappedRecords.length)}
                </span>{' '}
                of <span className="font-bold text-[#191c1d]">{mappedRecords.length}</span> records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                  disabled={safeRecordsPage <= 1}
                  className={cn(
                    'h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors',
                    safeRecordsPage <= 1
                      ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'border-[#cbc4d4] text-[#191c1d] bg-white hover:bg-slate-50 cursor-pointer shadow-sm'
                  )}
                  aria-label="Previous records page"
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                  <span>Previous</span>
                </button>

                <div className="px-2.5 py-1 text-xs font-semibold text-[#191c1d] whitespace-nowrap">
                  Page <span className="text-[#5b14b8] font-bold">{safeRecordsPage}</span> of {totalRecordPages}
                </div>

                <button
                  type="button"
                  onClick={() => setRecordsPage((p) => Math.min(totalRecordPages, p + 1))}
                  disabled={safeRecordsPage >= totalRecordPages}
                  className={cn(
                    'h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors',
                    safeRecordsPage >= totalRecordPages
                      ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'border-[#cbc4d4] text-[#191c1d] bg-white hover:bg-slate-50 cursor-pointer shadow-sm'
                  )}
                  aria-label="Next records page"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </main>

        {/* Right Column: Vitals & Medications (Span 3) (Figma node 1:6228 / 1:6259) */}
        <aside className="lg:col-span-3 space-y-5" aria-label="Clinical Metrics and Medications">
          {/* Latest Vitals Card (Figma node 1:6228) */}
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-[#ba1a1a]" aria-hidden="true" />
                <h2 className="text-sm font-bold text-[#191c1d]">Latest Vitals</h2>
              </div>
              <span className="text-[11px] text-[#7a7583]">
                {latestVitals?.lastUpdated || 'No recent readings'}
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* 2-column top: Blood Pressure and Heart Rate */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4] space-y-1">
                  <div className="text-[11px] text-[#7a7583] font-medium leading-none">Blood Pressure</div>
                  <div className="text-base font-bold text-[#191c1d] pt-1">
                    {latestVitals?.bp || '—'}
                  </div>
                  <div className="text-[10px] text-[#7a7583]">
                    {latestVitals?.bpUnit || 'mmHg'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4] space-y-1">
                  <div className="text-[11px] text-[#7a7583] font-medium leading-none">Heart Rate</div>
                  <div className="text-base font-bold text-[#191c1d] pt-1">
                    {latestVitals?.hr || '—'}{' '}
                    <span className="text-xs font-normal text-[#7a7583]">
                      {latestVitals?.hrUnit || 'bpm'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1-column bottom: SpO2 */}
              <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e1e3e4] flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-[#7a7583] font-medium">SpO2</div>
                  <div className="text-base font-bold text-[#00838f]">
                    {latestVitals?.spo2 ? `${latestVitals.spo2}%` : '—'}
                  </div>
                </div>
                <TrendingUp className="size-4 text-emerald-600" />
              </div>
            </div>

            {activePatientId && (
              <button
                type="button"
                onClick={() => navigate(`/patients/${activePatientId}`)}
                className="w-full py-2 rounded-lg bg-white border border-[#cbc4d4] text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors shadow-sm focus:outline-none cursor-pointer"
              >
                View History
              </button>
            )}
          </div>

          {/* Current Medications Card (Figma node 1:6259) */}
          <div className="bg-white border border-[#cbc4d4] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Pill className="size-4 text-[#5b14b8]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[#191c1d]">Current Medications</h2>
            </div>

            <div className="space-y-3 pt-1">
              {paginatedMedications.length > 0 ? (
                paginatedMedications.map((med, idx) => (
                  <div key={med.id || idx} className="flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-purple-50 text-[#5b14b8] flex items-center justify-center shrink-0 border border-purple-100">
                      <Pill className="size-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="text-xs font-bold text-[#191c1d] truncate">
                          {med.medicine}
                        </div>
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.2 rounded-full shrink-0',
                            med.statusType === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {med.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#494552] truncate">
                        {[
                          med.dose !== '—' ? med.dose : '',
                          med.frequency && med.frequency !== 'As directed' ? med.frequency : '',
                          med.duration !== '—' ? med.duration : '',
                        ]
                          .filter(Boolean)
                          .join(' • ') || 'Dosage as clinically prescribed'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-[#7a7583]">
                  No active prescription therapy documented.
                </div>
              )}
            </div>

            {/* Current Medications Pagination Controls (10 items max per page) */}
            {currentMedications.length > MEDICATIONS_PER_PAGE && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#7a7583]">
                  Page <strong className="text-[#191c1d]">{safeMedicationsPage}</strong> of {totalMedicationPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMedicationsPage((p) => Math.max(1, p - 1))}
                    disabled={safeMedicationsPage <= 1}
                    className={cn(
                      'p-1.5 rounded-md border text-xs flex items-center justify-center transition-colors',
                      safeMedicationsPage <= 1
                        ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                        : 'border-[#cbc4d4] text-[#191c1d] hover:bg-slate-50 cursor-pointer shadow-sm'
                    )}
                    aria-label="Previous medications page"
                    title="Previous medications"
                  >
                    <ChevronLeft className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMedicationsPage((p) => Math.min(totalMedicationPages, p + 1))}
                    disabled={safeMedicationsPage >= totalMedicationPages}
                    className={cn(
                      'p-1.5 rounded-md border text-xs flex items-center justify-center transition-colors',
                      safeMedicationsPage >= totalMedicationPages
                        ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                        : 'border-[#cbc4d4] text-[#191c1d] hover:bg-slate-50 cursor-pointer shadow-sm'
                    )}
                    aria-label="Next medications page"
                    title="Next medications"
                  >
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                navigate(
                  activePatientId
                    ? `/records/prescriptions?patientId=${activePatientId}`
                    : '/records/prescriptions'
                )
              }
              className="w-full py-2 rounded-lg bg-white border border-[#cbc4d4] text-xs font-semibold text-[#191c1d] hover:bg-slate-50 transition-colors shadow-sm focus:outline-none cursor-pointer"
            >
              Manage Prescriptions
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default MedicalRecordsPage;
