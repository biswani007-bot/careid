import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowLeft,
  Search,
  Check,
  AlertTriangle,
  Lock,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Building2,
  CheckCircle2,
  Info,
} from 'lucide-react';

// Shell & Local Styles
import '../dashboard/AdminDashboard.css';
import './AdminMapDoctor.css';

// Shared Shell Components
import AdminSidebar from '../common/AdminSidebar';

// Services & Queries
import {
  useFacilityQuery,
  useFacilitiesQuery,
  useDoctorFacilityMappingsQuery,
  useMapDoctorMutation,
  type FacilityItem,
  type MappedDoctor,
} from '../../services/facilityService';
import {
  useDoctorQuery,
  useDoctorsQuery,
  useAssignDoctorToFacilityMutation,
  type DoctorItem,
} from '../../services/doctorService';

// Validation Schema
const mapDoctorSchema = z.object({
  privilegeLevel: z.string().optional(),
  assignmentType: z.enum(['PRIMARY', 'SECONDARY', 'CONSULTANT']).default('PRIMARY'),
  department: z.string().min(1, 'Department assignment is required'),
  operatingSuites: z.array(z.string()).optional(),
  privileges: z.array(z.string()).min(1, 'Please select at least one clinical privilege'),
  effectiveDate: z.string().min(1, 'Effective start date is required'),
  notes: z.string().optional(),
});

type MapDoctorFormValues = z.infer<typeof mapDoctorSchema>;

interface SessionAssignmentInfo {
  id: string;
  doctorId: string;
  facilityId: string;
  facilityName: string;
  assignmentType: string;
  privileges: string[];
  startDate: string;
  isActive: boolean;
  updatedAt: string;
}

export interface AdminMapDoctorProps {
  onNavigate?: (path: string, state?: any) => void;
  onLogout?: () => void;
}

export const AdminMapDoctor: React.FC<AdminMapDoctorProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { facilityId, doctorId } = useParams<{ facilityId?: string; doctorId?: string }>();

  // Determine Mode:
  // If doctorId is provided, we are mapping a Doctor to a Facility (/admin/doctors/:doctorId/map-facility)
  // If facilityId is provided, we are mapping Doctors to a Facility (/admin/facilities/:facilityId/map-doctor)
  const isDoctorMode = Boolean(doctorId);

  // Shell State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeOrSpecialty, setSelectedTypeOrSpecialty] = useState('All');
  const [affiliationFilter, setAffiliationFilter] = useState('All');

  // Selection States
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctorId || '');

  // Session assignments cache for preserving exact metadata after POST in Doctor Mode
  const [sessionAssignments, setSessionAssignments] = useState<Record<string, SessionAssignmentInfo>>({});

  // Load session assignments for doctor on mount / doctorId change
  useEffect(() => {
    if (doctorId) {
      const loaded: Record<string, SessionAssignmentInfo> = {};
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(`careid_assign_${doctorId}_`)) {
            const raw = sessionStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.facilityId) {
                loaded[parsed.facilityId] = parsed;
              }
            }
          }
        }
      } catch {
        // Storage access error handling in restricted sandbox
      }
      setSessionAssignments(loaded);
    }
  }, [doctorId]);

  // 1. Doctor Query (Active when in Doctor Mode)
  const {
    data: doctor,
    isLoading: isDoctorLoading,
    isError: isDoctorError,
  } = useDoctorQuery(doctorId || '');

  // 2. Facility Query (Active when in Facility Mode)
  const {
    data: facility,
    isLoading: isFacilityLoading,
    isError: isFacilityError,
  } = useFacilityQuery(facilityId || '');

  // 3. Live Facilities Query
  const {
    data: allFacilities = [],
    isLoading: isFacilitiesLoading,
  } = useFacilitiesQuery();

  // 4. Live Doctors Query
  const {
    data: doctorsData,
    isLoading: isDoctorsLoading,
  } = useDoctorsQuery({ limit: 50 });
  const allDoctors = doctorsData?.doctors || [];

  // 5. Mappings for the doctor across all facilities
  const {
    data: doctorMappedFacilityIds = new Set<string>(),
  } = useDoctorFacilityMappingsQuery(doctorId);

  // Mutations
  const assignDoctorMutation = useAssignDoctorToFacilityMutation();
  const mapDoctorMutation = useMapDoctorMutation();

  const handleNav = (path: string, state?: any) => {
    setIsDrawerOpen(false);
    if (onNavigate) {
      onNavigate(path, state);
    } else {
      navigate(path, { state });
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Set default selected facility when facilities load in doctor mode
  useEffect(() => {
    if (isDoctorMode && allFacilities.length > 0 && !selectedFacilityId) {
      // Prefer the first unmapped facility, or the first facility
      const unmapped = allFacilities.find((f) => !doctorMappedFacilityIds.has(f.id));
      setSelectedFacilityId(unmapped ? unmapped.id : allFacilities[0].id);
    }
  }, [isDoctorMode, allFacilities, doctorMappedFacilityIds, selectedFacilityId]);

  // Set default selected doctor when doctors load in facility mode
  useEffect(() => {
    if (!isDoctorMode && allDoctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(allDoctors[0].id);
    }
  }, [isDoctorMode, allDoctors, selectedDoctorId]);

  // Active facility mapped doctor IDs (for facility mode)
  const facilityMappedDoctorIds = useMemo(() => {
    if (!facility?.mappedDoctors) return new Set<string>();
    return new Set(facility.mappedDoctors.map((d) => d.id || d.npi));
  }, [facility]);

  // Selected entities
  const selectedFacility: FacilityItem | undefined = useMemo(() => {
    return allFacilities.find((f) => f.id === selectedFacilityId) || allFacilities[0];
  }, [allFacilities, selectedFacilityId]);

  const selectedDoctor: DoctorItem | undefined = useMemo(() => {
    if (isDoctorMode) return doctor || undefined;
    return allDoctors.find((d) => d.id === selectedDoctorId) || allDoctors[0];
  }, [isDoctorMode, doctor, allDoctors, selectedDoctorId]);

  const doctorDisplayName = useMemo(() => {
    if (!doctor?.name) return '';
    return doctor.name.startsWith('Dr.') || doctor.name.startsWith('Dr ')
      ? doctor.name
      : `Dr. ${doctor.name}`;
  }, [doctor]);

  // Mapped check for the currently selected facility/doctor
  const isTargetAlreadyMapped = useMemo(() => {
    if (isDoctorMode) {
      if (!selectedFacility) return false;
      return doctorMappedFacilityIds.has(selectedFacility.id);
    } else {
      if (!selectedDoctor) return false;
      return (
        facilityMappedDoctorIds.has(selectedDoctor.id) ||
        Boolean(selectedDoctor.npi && facilityMappedDoctorIds.has(selectedDoctor.npi)) ||
        selectedDoctor.privilegeStatus === 'Currently Mapped'
      );
    }
  }, [isDoctorMode, selectedFacility, doctorMappedFacilityIds, selectedDoctor, facilityMappedDoctorIds]);

  // Mapped facilities list for this doctor
  const mappedFacilities = useMemo(() => {
    if (!isDoctorMode) return [];
    return allFacilities.filter((f) => doctorMappedFacilityIds.has(f.id));
  }, [isDoctorMode, allFacilities, doctorMappedFacilityIds]);

  const unmappedFacilitiesCount = useMemo(() => {
    if (!isDoctorMode) return 0;
    return allFacilities.filter((f) => !doctorMappedFacilityIds.has(f.id)).length;
  }, [isDoctorMode, allFacilities, doctorMappedFacilityIds]);

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MapDoctorFormValues>({
    resolver: zodResolver(mapDoctorSchema),
    defaultValues: {
      privilegeLevel: 'Attending Surgeon (Full Operating Rights)',
      assignmentType: 'PRIMARY',
      department: doctor?.department || 'Department of Cardiology',
      operatingSuites: ['Cath Lab Suites 1–4', 'Interventional OR 1–2'],
      privileges: ['OPD_CONSULTATION', 'SURGERY'],
      effectiveDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const watchAssignmentType = watch('assignmentType');

  // Update default department when doctor loads
  useEffect(() => {
    if (doctor?.department) {
      setValue('department', doctor.department);
    }
  }, [doctor, setValue]);

  // Sync form defaults if selected facility has session assignment
  useEffect(() => {
    if (isDoctorMode && selectedFacility && sessionAssignments[selectedFacility.id]) {
      const sess = sessionAssignments[selectedFacility.id];
      if (sess.assignmentType === 'PRIMARY' || sess.assignmentType === 'SECONDARY' || sess.assignmentType === 'CONSULTANT') {
        setValue('assignmentType', sess.assignmentType);
      }
      if (Array.isArray(sess.privileges) && sess.privileges.length > 0) {
        setValue('privileges', sess.privileges);
      }
    }
  }, [isDoctorMode, selectedFacility, sessionAssignments, setValue]);

  // Governance check: check if practitioner already holds another mapped facility
  const hasOtherMappedFacilities = useMemo(() => {
    if (!isDoctorMode || !selectedFacility) return false;
    return allFacilities.some(
      (f) => doctorMappedFacilityIds.has(f.id) && f.id !== selectedFacility.id
    );
  }, [isDoctorMode, selectedFacility, allFacilities, doctorMappedFacilityIds]);

  // Handler: "Update Assignment" click on mapped facility chip
  const handleEditFacilityAssignment = (facId: string) => {
    setSelectedFacilityId(facId);
    setAffiliationFilter('All');
  };

  // Filtered Facilities (Doctor Mode)
  const filteredFacilities = useMemo(() => {
    return allFacilities.filter((fac) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (fac.legalName || '').toLowerCase().includes(q);
        const matchesCode = (fac.facilityId || '').toLowerCase().includes(q);
        const matchesCity = (fac.city || '').toLowerCase().includes(q);
        const matchesType = (fac.facilityType || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesCity && !matchesType) {
          return false;
        }
      }

      // Type filter
      if (selectedTypeOrSpecialty !== 'All') {
        if (!fac.facilityType.toLowerCase().includes(selectedTypeOrSpecialty.toLowerCase())) {
          return false;
        }
      }

      // Affiliation filter
      const isMapped = doctorMappedFacilityIds.has(fac.id);
      if (affiliationFilter === 'Unmapped' && isMapped) return false;
      if (affiliationFilter === 'Mapped' && !isMapped) return false;

      return true;
    });
  }, [allFacilities, searchQuery, selectedTypeOrSpecialty, affiliationFilter, doctorMappedFacilityIds]);

  // Filtered Doctors (Facility Mode)
  const filteredDoctors = useMemo(() => {
    return allDoctors.filter((doc) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesNpi = (doc.npi || '').includes(q);
        const matchesLic = (doc.license || '').toLowerCase().includes(q);
        const matchesSpec = doc.specialty.toLowerCase().includes(q);
        const matchesDept = (doc.department || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNpi && !matchesLic && !matchesSpec && !matchesDept) {
          return false;
        }
      }

      // Specialty filter
      if (selectedTypeOrSpecialty !== 'All') {
        if (!doc.specialty.toLowerCase().includes(selectedTypeOrSpecialty.toLowerCase())) {
          return false;
        }
      }

      // Affiliation filter
      const isMapped =
        facilityMappedDoctorIds.has(doc.id) ||
        Boolean(doc.npi && facilityMappedDoctorIds.has(doc.npi));
      if (affiliationFilter === 'Unmapped' && isMapped) return false;
      if (affiliationFilter === 'Mapped' && !isMapped) return false;

      return true;
    });
  }, [allDoctors, searchQuery, selectedTypeOrSpecialty, affiliationFilter, facilityMappedDoctorIds]);

  // Form Submission
  const onSubmit = async (values: MapDoctorFormValues) => {
    if (isDoctorMode) {
      if (!doctor || !selectedFacility) return;

      try {
        const result = await assignDoctorMutation.mutateAsync({
          facilityId: selectedFacility.id,
          doctorId: doctor.id,
          assignmentType: values.assignmentType,
          privileges: values.privileges,
          departmentId: undefined,
        });

        const returnedAssignmentId = result?.id || result?.assignmentId || '';
        const wasAlreadyMapped = isTargetAlreadyMapped;

        const successMsg = wasAlreadyMapped
          ? `Assignment updated for ${doctorDisplayName} at ${selectedFacility.legalName}.${
              returnedAssignmentId ? ` (ID: ${returnedAssignmentId.substring(0, 8)}...)` : ''
            }`
          : `${doctorDisplayName} successfully mapped to ${selectedFacility.legalName}.${
              returnedAssignmentId ? ` (ID: ${returnedAssignmentId.substring(0, 8)}...)` : ''
            }`;

        showToast(successMsg);

        // Store exact returned metadata in session cache
        const sessionKey = `careid_assign_${doctor.id}_${selectedFacility.id}`;
        const sessionItem: SessionAssignmentInfo = {
          id: returnedAssignmentId || `ASG-${Date.now()}`,
          doctorId: doctor.id,
          facilityId: selectedFacility.id,
          facilityName: selectedFacility.legalName,
          assignmentType: result?.assignmentType || values.assignmentType,
          privileges: Array.isArray(result?.privileges) ? result.privileges : values.privileges,
          startDate: result?.startDate || values.effectiveDate,
          isActive: result?.isActive ?? true,
          updatedAt: new Date().toISOString(),
        };

        try {
          sessionStorage.setItem(sessionKey, JSON.stringify(sessionItem));
        } catch {
          // Ignore sandbox storage write error
        }

        setSessionAssignments((prev) => ({
          ...prev,
          [selectedFacility.id]: sessionItem,
        }));

        // Automatic redirect to Doctor Directory after brief confirmation display
        setTimeout(() => {
          handleNav('/admin/doctors', { toastMessage: successMsg });
        }, 1200);
      } catch (err: any) {
        showToast(err?.message || 'Failed to assign doctor to facility. Please try again.');
      }
    } else {
      // Facility mode
      if (!facility || !selectedDoctor) return;

      if (isTargetAlreadyMapped) {
        showToast(`Dr. ${selectedDoctor.name} is already mapped to ${facility.legalName}.`);
        return;
      }

      try {
        const payload: MappedDoctor = {
          id: selectedDoctor.id,
          name: selectedDoctor.name,
          hvId: selectedDoctor.hvId,
          npi: selectedDoctor.npi || '1447812903',
          specialty: selectedDoctor.specialty,
          licenseNumber: selectedDoctor.license,
          clinicalRole: values.privilegeLevel || 'Attending Surgeon (Full Operating Rights)',
          status: 'Verified & Active',
          initials: selectedDoctor.initials || 'MD',
          avatarBg: selectedDoctor.avatarBg || 'rgba(40, 0, 109, 0.1)',
          avatarColor: selectedDoctor.avatarColor || '#28006d',
          avatarUrl: selectedDoctor.avatarUrl,
        };

        await mapDoctorMutation.mutateAsync({
          facilityId: facility.id,
          doctor: payload,
        });

        const successMsg = `Dr. ${selectedDoctor.name} has been successfully mapped to ${facility.legalName}.`;
        showToast(successMsg);

        setTimeout(() => {
          handleNav('/admin/facilities', { toastMessage: successMsg });
        }, 1200);
      } catch (err: any) {
        showToast(err?.message || 'Failed to map doctor to facility. Please try again.');
      }
    }
  };

  // -------------------------------------------------------------
  // Loading & Error States
  // -------------------------------------------------------------

  if (isDoctorMode && (isDoctorLoading || isFacilitiesLoading)) {
    return (
      <div className="mapdoc-shell">
        <AdminSidebar
          activeNav="doctors"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="mapdoc-main-area">
          <div className="mapdoc-content-container flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 size={32} className="animate-spin text-[#28006d]" />
              <p className="text-sm font-semibold text-slate-700">
                Loading Doctor Profile and Healthcare Facility Registry...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isDoctorMode && (isFacilityLoading || isDoctorsLoading)) {
    return (
      <div className="mapdoc-shell">
        <AdminSidebar
          activeNav="facilities"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="mapdoc-main-area">
          <div className="mapdoc-content-container flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 size={32} className="animate-spin text-[#28006d]" />
              <p className="text-sm font-semibold text-slate-700">
                Loading Facility Profile and Accredited Practitioner Registry...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Doctor Not Found (Doctor Mode)
  if (isDoctorMode && (isDoctorError || !doctor)) {
    return (
      <div className="mapdoc-shell">
        <AdminSidebar
          activeNav="doctors"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="mapdoc-main-area">
          <div className="mapdoc-content-container">
            <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-lg mx-auto text-center mt-12 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Doctor Not Found</h2>
              <p className="text-sm text-slate-600 mb-6">
                Unable to locate the specified doctor record for ID &quot;{doctorId}&quot;.
              </p>
              <button
                type="button"
                onClick={() => handleNav('/admin/doctors')}
                className="mapdoc-return-btn"
              >
                Return to Doctor Directory
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Facility Not Found (Facility Mode)
  if (!isDoctorMode && (isFacilityError || !facility)) {
    return (
      <div className="mapdoc-shell">
        <AdminSidebar
          activeNav="facilities"
          isDrawerOpen={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          onNavigate={handleNav}
          onLogout={onLogout}
        />
        <div className="mapdoc-main-area">
          <div className="mapdoc-content-container">
            <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-lg mx-auto text-center mt-12 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Facility Not Found</h2>
              <p className="text-sm text-slate-600 mb-6">
                Unable to locate the specified healthcare facility record for ID &quot;{facilityId}&quot;.
              </p>
              <button
                type="button"
                onClick={() => handleNav('/admin/facilities')}
                className="mapdoc-return-btn"
              >
                Return to Facility Directory
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN RENDER
  // -------------------------------------------------------------

  return (
    <div className="mapdoc-shell">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-[#0b1c30] text-white rounded-xl shadow-2xl border border-slate-700 animate-slide-in-right"
        >
          <div className="w-6 h-6 rounded-full bg-[#006a60] flex items-center justify-center text-white shrink-0">
            <Check size={14} />
          </div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Shared Admin Sidebar */}
      <AdminSidebar
        activeNav={isDoctorMode ? 'doctors' : 'facilities'}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      <div className="mapdoc-main-area">
        <div className="mapdoc-content-container">
          {/* Top Breadcrumb & Return Bar */}
          <div className="mapdoc-nav-bar">
            <div className="mapdoc-breadcrumb" aria-label="Breadcrumb">
              <button
                type="button"
                className="mapdoc-breadcrumb-link"
                onClick={() => handleNav('/admin/dashboard')}
              >
                Admin
              </button>
              <span className="mapdoc-breadcrumb-sep">/</span>
              {isDoctorMode ? (
                <>
                  <button
                    type="button"
                    className="mapdoc-breadcrumb-link"
                    onClick={() => handleNav('/admin/doctors')}
                  >
                    Doctors
                  </button>
                  <span className="mapdoc-breadcrumb-sep">/</span>
                  <button
                    type="button"
                    className="mapdoc-breadcrumb-link"
                    onClick={() => handleNav(`/admin/doctors/${doctor!.id}`)}
                  >
                    {doctor!.name}
                  </button>
                  <span className="mapdoc-breadcrumb-sep">/</span>
                  <span className="mapdoc-breadcrumb-current">Map to Facility</span>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="mapdoc-breadcrumb-link"
                    onClick={() => handleNav('/admin/facilities')}
                  >
                    Facilities
                  </button>
                  <span className="mapdoc-breadcrumb-sep">/</span>
                  <button
                    type="button"
                    className="mapdoc-breadcrumb-link"
                    onClick={() => handleNav(`/admin/facilities/${facility!.id}`)}
                  >
                    {facility!.legalName}
                  </button>
                  <span className="mapdoc-breadcrumb-sep">/</span>
                  <span className="mapdoc-breadcrumb-current">Map Doctors</span>
                </>
              )}
            </div>

            <button
              type="button"
              id="btn-return"
              className="mapdoc-return-btn"
              onClick={() =>
                handleNav(isDoctorMode ? `/admin/doctors/${doctor!.id}` : `/admin/facilities/${facility!.id}`)
              }
            >
              <ArrowLeft size={14} />
              <span>
                {isDoctorMode
                  ? t('doctors.mapFacilityScreen.returnDoctor', 'Return to Doctor Profile')
                  : t('facilities.mapDoctorScreen.returnBtn', 'Return to Facility Details')}
              </span>
            </button>
          </div>

          {/* Hero Context Banner (Streamlined Height & Padding) */}
          <section className="mapdoc-hero-banner" aria-label="Privileges Workspace Header">
            <div className="mapdoc-hero-text">
              <div className="mapdoc-hero-badge">
                <span className="mapdoc-hero-dot" />
                <span>
                  {isDoctorMode
                    ? 'DOCTOR MULTI-FACILITY CREDENTIALING • LIVE REPOSITORY'
                    : 'CLINICAL PRIVILEGES WORKSPACE • ACCREDITATION ENGINE V4.2'}
                </span>
              </div>
              <h1 className="mapdoc-hero-title">
                {isDoctorMode
                  ? `Map ${doctorDisplayName} to Healthcare Facilities`
                  : t('facilities.mapDoctorScreen.title', 'Map Doctors to Facility')}
              </h1>
              <p className="mapdoc-hero-desc">
                {isDoctorMode
                  ? `Credential ${doctorDisplayName} across multiple healthcare facilities concurrently. Assign institutional departments, configure facility-scoped clinical privileges, and register dual-practice agreements.`
                  : t(
                      'facilities.mapDoctorScreen.subtitle',
                      'Credential certified medical doctors, assign operating suite clinical privileges, and register institutional dual-practice agreements.'
                    )}
              </p>
            </div>

            <div className="mapdoc-hero-quota-card" aria-label="Doctor or Facility Details">
              {isDoctorMode ? (
                <>
                  <span className="mapdoc-quota-label">DOCTOR SPECIALTY</span>
                  <span className="mapdoc-quota-val">{doctor!.specialty || 'General Practice'}</span>
                  <div className="mapdoc-quota-status">
                    <span className="mapdoc-quota-dot" />
                    <span>
                      {doctorMappedFacilityIds.size}{' '}
                      {doctorMappedFacilityIds.size === 1 ? 'Facility' : 'Facilities'} Credentialed
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <span className="mapdoc-quota-label">QUOTA CAPACITY</span>
                  <span className="mapdoc-quota-val">24 / 30 Specialists</span>
                  <div className="mapdoc-quota-status">
                    <span className="mapdoc-quota-dot" />
                    <span>Live Capacity Verified</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Doctor Mode: Compact Doctor Information Bar with Facility Chips */}
          {isDoctorMode && doctor && (
            <div className="mapdoc-doctor-infobar">
              <div className="mapdoc-doc-profile-group">
                <div
                  className="mapdoc-avatar-wrap"
                  style={{
                    backgroundColor: doctor.avatarBg || 'rgba(40, 0, 109, 0.1)',
                    color: doctor.avatarColor || '#28006d',
                  }}
                >
                  {doctor.initials || 'DR'}
                </div>
                <div className="mapdoc-doc-text-meta">
                  <div className="mapdoc-doc-title-row">
                    <span className="mapdoc-doc-title">{doctorDisplayName}</span>
                    <span className="mapdoc-verified-pill">
                      <CheckCircle2 size={11} /> {doctor.status || 'Verified & Active'}
                    </span>
                  </div>
                  <div className="mapdoc-doc-sub-meta">
                    <span>CareID: {doctor.hvId || doctor.id.substring(0, 12)}</span>
                    <span className="meta-sep">•</span>
                    <span>NPI: {doctor.npi || '1043928192'}</span>
                    <span className="meta-sep">•</span>
                    <span>LIC: {doctor.license || 'NY-29401'}</span>
                    <span className="meta-sep">•</span>
                    <span>Specialty: {doctor.specialty || 'General Practice'}</span>
                    <span className="meta-sep">•</span>
                    <span className="text-[#28006d] font-semibold">{doctor.department || 'Clinical Services'}</span>
                  </div>
                </div>
              </div>

              {/* Current Facility Mappings as Readable Wrapping Chips */}
              <div className="mapdoc-doc-facilities-group">
                <div className="mapdoc-facilities-chips-header">
                  <span className="mapdoc-facilities-label">
                    Credentialed Facilities ({mappedFacilities.length}):
                  </span>
                </div>
                <div className="mapdoc-facilities-chips-wrap">
                  {mappedFacilities.length > 0 ? (
                    mappedFacilities.map((fac) => {
                      const isSelected = selectedFacility?.id === fac.id;
                      const sessionInfo = sessionAssignments[fac.id];
                      return (
                        <button
                          key={fac.id}
                          type="button"
                          id={`chip-facility-${fac.id}`}
                          onClick={() => handleEditFacilityAssignment(fac.id)}
                          className={`mapdoc-facility-chip ${isSelected ? 'active' : ''}`}
                          title="Click to view or update credentials at this facility"
                        >
                          <Building2 size={12} />
                          <span className="mapdoc-chip-name">{fac.legalName}</span>
                          <span className="mapdoc-chip-badge">
                            {sessionInfo?.assignmentType || 'Active'}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-[12px] text-slate-400 italic">No facilities currently credentialed</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Command & Filter Bar (Single Aligned Row) */}
          <section className="mapdoc-filter-strip" aria-label="Search and Filter Controls">
            <div className="mapdoc-search-box">
              <Search size={16} className="text-[#94a3b8] shrink-0" />
              <input
                id={isDoctorMode ? 'search-facilities-input' : 'search-doctors-input'}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isDoctorMode
                    ? 'Search facilities by name, code, city, or facility type...'
                    : t(
                        'facilities.mapDoctorScreen.filters.searchPlaceholder',
                        'Search doctors by name, NPI, or clinical specialization...'
                      )
                }
              />
            </div>

            <div className="mapdoc-filter-group">
              <select
                id="filter-category-select"
                className="mapdoc-filter-select"
                value={selectedTypeOrSpecialty}
                onChange={(e) => setSelectedTypeOrSpecialty(e.target.value)}
                aria-label={isDoctorMode ? 'Filter by Facility Type' : 'Filter by Specialty'}
              >
                <option value="All">{isDoctorMode ? 'All Facility Types' : 'All Specialties'}</option>
                {isDoctorMode ? (
                  <>
                    <option value="Hospital Campus">Hospital Campus</option>
                    <option value="Diagnostic Center">Diagnostic Center</option>
                    <option value="Ambulatory Surgical Center">Ambulatory Surgical Center</option>
                    <option value="Specialty Clinic">Specialty Clinic</option>
                    <option value="Urgent Care Center">Urgent Care Center</option>
                  </>
                ) : (
                  <>
                    <option value="Interventional Cardiology">Interventional Cardiology</option>
                    <option value="Vascular Surgery">Vascular Surgery</option>
                    <option value="Cardiology Specialist">Cardiology Specialist</option>
                    <option value="Radiology & Imaging">Radiology & Imaging</option>
                    <option value="Endocrinology">Endocrinology</option>
                  </>
                )}
              </select>

              <select
                id="filter-affiliation-select"
                className="mapdoc-filter-select"
                value={affiliationFilter}
                onChange={(e) => setAffiliationFilter(e.target.value)}
                aria-label="Filter by Affiliation"
              >
                <option value="All">{isDoctorMode ? `All Facilities (${allFacilities.length})` : 'All Doctors'}</option>
                <option value="Unmapped">
                  {isDoctorMode ? `Available for Mapping (${unmappedFacilitiesCount})` : 'Available / Unassigned'}
                </option>
                <option value="Mapped">
                  {isDoctorMode ? `Already Credentialed (${mappedFacilities.length})` : 'Already Credentialed'}
                </option>
              </select>
            </div>
          </section>

          {/* Two-Column Balanced Workspace (62% Left Directory / 38% Right Panel) */}
          <div className="mapdoc-workspace-grid">
            {/* Left Column: Authorized Healthcare Facilities Directory */}
            <section
              className="mapdoc-directory-card"
              aria-label={isDoctorMode ? 'Healthcare Facilities Directory' : 'Accredited Practitioner Directory'}
            >
              <div className="mapdoc-directory-header">
                <h2 className="mapdoc-directory-title">
                  {isDoctorMode
                    ? 'Authorized Healthcare Facilities Directory'
                    : t('facilities.mapDoctorScreen.directory.title', 'Accredited Practitioner Directory')}
                </h2>
                <div className="mapdoc-directory-badge">
                  <span className="mapdoc-directory-badge-dot" />
                  <span>
                    {isDoctorMode
                      ? `${filteredFacilities.length} Facilities Available Live State`
                      : `${filteredDoctors.length} Available Live Real-time State`}
                  </span>
                </div>
              </div>

              <div className="mapdoc-table-container">
                <table className="mapdoc-table">
                  <colgroup>
                    <col style={{ width: '44%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '26%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">
                        {isDoctorMode ? 'FACILITY & IDENTIFIERS' : 'DOCTOR & IDENTIFIERS'}
                      </th>
                      <th scope="col">
                        {isDoctorMode ? 'FACILITY TYPE & LOCATION' : 'PRIMARY SPECIALTY'}
                      </th>
                      <th scope="col">
                        {isDoctorMode ? 'MAPPING STATUS' : 'PRIMARY FACILITY'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isDoctorMode ? (
                      /* Doctor Mode: Facilities List */
                      filteredFacilities.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="mapdoc-empty-state">
                            No healthcare facilities match your criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredFacilities.map((fac) => {
                          const isMapped = doctorMappedFacilityIds.has(fac.id);
                          const isSelected = selectedFacility?.id === fac.id;
                          const sessionInfo = sessionAssignments[fac.id];

                          return (
                            <tr
                              key={fac.id}
                              id={`facility-row-${fac.id}`}
                              className={`mapdoc-row ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedFacilityId(fac.id)}
                            >
                              <td>
                                <div className="mapdoc-doc-cell">
                                  <div
                                    className="mapdoc-avatar-wrap"
                                    style={{
                                      backgroundColor: isMapped ? 'rgba(40, 0, 109, 0.08)' : 'rgba(0, 106, 96, 0.08)',
                                      color: isMapped ? '#28006d' : '#006a60',
                                    }}
                                  >
                                    <Building2 size={16} />
                                  </div>
                                  <div className="mapdoc-doc-info">
                                    <span className="mapdoc-doc-name">{fac.legalName}</span>
                                    <span className="mapdoc-doc-identifiers">
                                      CODE: {fac.facilityId || 'FAC-ID'} • {fac.city}, {fac.state}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span className="mapdoc-spec-title">{fac.facilityType}</span>
                                <span className="mapdoc-subspec-title">
                                  {fac.streetAddress1 ? `${fac.streetAddress1}, ` : ''}{fac.city}
                                </span>
                              </td>

                              <td>
                                {isMapped ? (
                                  <div className="mapdoc-status-cell-wrap">
                                    <span className="mapdoc-status-badge mapped">
                                      <Check size={11} />
                                      <span>Currently Mapped</span>
                                    </span>
                                    <span className="mapdoc-role-subtext">
                                      {sessionInfo?.assignmentType ? `${sessionInfo.assignmentType} • Click to Edit` : 'Active • Click to Edit'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="mapdoc-status-cell-wrap">
                                    <span className="mapdoc-status-badge available">
                                      Available for Mapping
                                    </span>
                                    <span className="mapdoc-role-subtext">Eligible Institution</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : (
                      /* Facility Mode: Doctors List */
                      filteredDoctors.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="mapdoc-empty-state">
                            {t('facilities.mapDoctorScreen.directory.empty', 'No accredited doctors match your criteria.')}
                          </td>
                        </tr>
                      ) : (
                        filteredDoctors.map((doc) => {
                          const isMapped =
                            facilityMappedDoctorIds.has(doc.id) ||
                            Boolean(doc.npi && facilityMappedDoctorIds.has(doc.npi)) ||
                            doc.privilegeStatus === 'Currently Mapped';
                          const isSelected = selectedDoctor?.id === doc.id;

                          return (
                            <tr
                              key={doc.id}
                              id={`doctor-row-${doc.id}`}
                              className={`mapdoc-row ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedDoctorId(doc.id)}
                            >
                              <td>
                                <div className="mapdoc-doc-cell">
                                  <div
                                    className="mapdoc-avatar-wrap"
                                    style={{
                                      backgroundColor: doc.avatarBg || 'rgba(40, 0, 109, 0.1)',
                                      color: doc.avatarColor || '#28006d',
                                    }}
                                  >
                                    {doc.avatarUrl ? (
                                      <img
                                        src={doc.avatarUrl}
                                        alt={doc.name}
                                        className="mapdoc-avatar-img"
                                      />
                                    ) : (
                                      <span>{doc.initials || 'MD'}</span>
                                    )}
                                  </div>
                                  <div className="mapdoc-doc-info">
                                    <span className="mapdoc-doc-name">{doc.name}</span>
                                    <span className="mapdoc-doc-identifiers">
                                      NPI: {doc.npi || '1043928192'} • LIC: {doc.license || 'NY-29401'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <span className="mapdoc-spec-title">{doc.specialty}</span>
                                <span className="mapdoc-subspec-title">
                                  {doc.subSpecialty || doc.department || 'Clinical Specialist'}
                                </span>
                              </td>

                              <td>
                                {isMapped ? (
                                  <div className="mapdoc-status-cell-wrap">
                                    <span className="mapdoc-status-badge mapped">
                                      <Check size={11} />
                                      <span>Currently Mapped</span>
                                    </span>
                                    <span className="mapdoc-role-subtext">
                                      {doc.affiliationStatus || 'Primary Lead'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="mapdoc-status-cell-wrap">
                                    <span className="mapdoc-status-badge available">
                                      Available Immediately
                                    </span>
                                    <span className="mapdoc-role-subtext">
                                      {doc.primaryFacility || doc.hospital || 'Unassigned / Independent'}
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Notice */}
              <div className="mapdoc-table-footer-notice">
                <Info size={13} className="shrink-0 text-[#28006d] mt-0.5" />
                <span>
                  Multiple concurrent facility assignments are supported by CareID Vault. Updating credentials at one facility modifies that facility only and preserves all other credentials.
                </span>
              </div>
            </section>

            {/* Right Column: Facility Assignment & Privileges Panel */}
            <aside className="mapdoc-drawer-card" aria-label="Privilege Specification Configuration">
              <div className="mapdoc-drawer-header">
                <div className="mapdoc-drawer-title-group">
                  <span
                    className={`mapdoc-stage-badge ${
                      isTargetAlreadyMapped ? 'config' : 'ready'
                    }`}
                  >
                    {isDoctorMode
                      ? isTargetAlreadyMapped
                        ? 'EXISTING CREDENTIAL • UPDATE MODE'
                        : 'NEW FACILITY ASSIGNMENT • READY TO COMMIT'
                      : isTargetAlreadyMapped
                      ? 'ALREADY CREDENTIALED'
                      : 'READY TO COMMIT'}
                  </span>
                  <h2 className="mapdoc-drawer-title">
                    {isDoctorMode
                      ? isTargetAlreadyMapped
                        ? 'Update Facility Assignment'
                        : 'Assign to Facility'
                      : 'Privilege Specification'}
                  </h2>
                  <p className="mapdoc-drawer-subtitle">
                    {isDoctorMode
                      ? isTargetAlreadyMapped
                        ? `Modify role and clinical privileges for ${doctorDisplayName} at this facility only.`
                        : `Credential ${doctorDisplayName} at ${selectedFacility?.legalName || 'selected facility'}.`
                      : 'Configure clinical privileges and operating suite access.'}
                  </p>
                </div>
              </div>

              {/* Identity Box */}
              {isDoctorMode ? (
                selectedFacility ? (
                  <>
                    <div className="mapdoc-doc-identity-box">
                      <div
                        className="mapdoc-identity-avatar"
                        style={{
                          backgroundColor: 'rgba(40, 0, 109, 0.08)',
                          color: '#28006d',
                        }}
                      >
                        <Building2 size={18} />
                      </div>
                      <div className="mapdoc-identity-details">
                        <span className="mapdoc-identity-name">{selectedFacility.legalName}</span>
                        <div className="mapdoc-identity-meta">
                          <span>CODE: {selectedFacility.facilityId}</span>
                          <span>•</span>
                          <span>{selectedFacility.facilityType}</span>
                          <span>•</span>
                          <span>{selectedFacility.city}, {selectedFacility.state}</span>
                        </div>
                      </div>
                    </div>

                    {isTargetAlreadyMapped ? (
                      <div className="mapdoc-alert-box" role="alert">
                        <AlertTriangle size={15} className="mapdoc-alert-icon" />
                        <div>
                          <h4 className="mapdoc-alert-title">Existing Credential Update</h4>
                          <p className="mapdoc-alert-desc">
                            {doctorDisplayName} already holds an active clinical credential at {selectedFacility.legalName}. Submitting below updates their configuration for this facility only and preserves all other facility assignments.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mapdoc-concurrent-advisory" role="status">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="mapdoc-concurrent-title">Concurrent Credential Assignment</h4>
                          <p className="mapdoc-concurrent-text">
                            Assigning {doctorDisplayName} to {selectedFacility.legalName} creates an independent institutional credential. All other facility associations remain active and unaffected.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-sm text-slate-500">
                    Select a facility from the directory to configure clinical privileges.
                  </div>
                )
              ) : selectedDoctor ? (
                <>
                  <div className="mapdoc-doc-identity-box">
                    <div
                      className="mapdoc-identity-avatar"
                      style={{
                        backgroundColor: selectedDoctor.avatarBg || 'rgba(0, 106, 96, 0.15)',
                        color: selectedDoctor.avatarColor || '#006a60',
                      }}
                    >
                      {selectedDoctor.avatarUrl ? (
                        <img
                          src={selectedDoctor.avatarUrl}
                          alt={selectedDoctor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{selectedDoctor.initials || 'MD'}</span>
                      )}
                    </div>
                    <div className="mapdoc-identity-details">
                      <span className="mapdoc-identity-name">{selectedDoctor.name}</span>
                      <div className="mapdoc-identity-meta">
                        <span>NPI: {selectedDoctor.npi || '1447812903'}</span>
                        <span>•</span>
                        <span>{selectedDoctor.primaryFacility || 'Unassigned / Independent'}</span>
                      </div>
                    </div>
                  </div>

                  {isTargetAlreadyMapped && (
                    <div className="mapdoc-alert-box" role="alert">
                      <AlertTriangle size={15} className="mapdoc-alert-icon" />
                      <div>
                        <h4 className="mapdoc-alert-title">Doctor Already Credentialed</h4>
                        <p className="mapdoc-alert-desc">
                          This doctor already holds an active clinical mapping at {facility!.legalName}.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : null}

              {/* Form Body */}
              {((isDoctorMode && selectedFacility) || (!isDoctorMode && selectedDoctor)) && (
                <form onSubmit={handleSubmit(onSubmit)} className="mapdoc-form">
                  {/* Assignment Role Category */}
                  <div className="mapdoc-form-group">
                    <label htmlFor="assignment-type-select" className="mapdoc-form-label">
                      <span>Assignment Role Category</span>
                      <span className="mapdoc-required-star">*</span>
                    </label>
                    <select
                      id="assignment-type-select"
                      {...register('assignmentType')}
                      className="mapdoc-form-select"
                    >
                      <option value="PRIMARY">PRIMARY (Main Institutional Practice)</option>
                      <option value="SECONDARY">SECONDARY (Affiliated Attending)</option>
                      <option value="CONSULTANT">CONSULTANT (Visiting Specialist)</option>
                    </select>
                    {errors.assignmentType && (
                      <span className="mapdoc-form-error">{errors.assignmentType.message}</span>
                    )}

                    {/* Multi-PRIMARY Advisory Notice */}
                    {hasOtherMappedFacilities && watchAssignmentType === 'PRIMARY' && (
                      <div className="mapdoc-governance-advisory" role="alert">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="mapdoc-governance-title">Institutional Governance Advisory</h4>
                          <p className="mapdoc-governance-text">
                            {doctorDisplayName} already holds an active credentialed facility assignment. While multiple concurrent PRIMARY assignments are permitted by the backend, healthcare governance standard recommends one PRIMARY and subsequent facilities as SECONDARY or CONSULTANT.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirmed Backend Clinical Privileges */}
                  <div className="mapdoc-form-group">
                    <span className="mapdoc-form-label">
                      <span>Clinical Privileges (Confirmed Backend Scope)</span>
                      <span className="mapdoc-required-star">*</span>
                    </span>

                    <Controller
                      name="privileges"
                      control={control}
                      render={({ field }) => {
                        const current = field.value || [];
                        const togglePrivilege = (priv: string) => {
                          if (current.includes(priv)) {
                            field.onChange(current.filter((p) => p !== priv));
                          } else {
                            field.onChange([...current, priv]);
                          }
                        };

                        return (
                          <div className="mapdoc-suites-grid">
                            <label
                              className={`mapdoc-suite-checkbox ${
                                current.includes('OPD_CONSULTATION') ? 'checked' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                id="privilege-opd"
                                checked={current.includes('OPD_CONSULTATION')}
                                onChange={() => togglePrivilege('OPD_CONSULTATION')}
                              />
                              <div className="mapdoc-suite-info">
                                <span className="mapdoc-suite-name">OPD Consultation & Review</span>
                                <span className="mapdoc-suite-desc">
                                  Outpatient clinics, diagnostic evaluations & patient rounds
                                </span>
                              </div>
                            </label>

                            <label
                              className={`mapdoc-suite-checkbox ${
                                current.includes('INPATIENT_ADMISSION') ? 'checked' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                id="privilege-inpatient"
                                checked={current.includes('INPATIENT_ADMISSION')}
                                onChange={() => togglePrivilege('INPATIENT_ADMISSION')}
                              />
                              <div className="mapdoc-suite-info">
                                <span className="mapdoc-suite-name">Inpatient Admissions & Care</span>
                                <span className="mapdoc-suite-desc">
                                  Ward admissions, critical care coverage & bedside management
                                </span>
                              </div>
                            </label>

                            <label
                              className={`mapdoc-suite-checkbox ${
                                current.includes('SURGERY') ? 'checked' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                id="privilege-surgery"
                                checked={current.includes('SURGERY')}
                                onChange={() => togglePrivilege('SURGERY')}
                              />
                              <div className="mapdoc-suite-info">
                                <span className="mapdoc-suite-name">Operating Suite & Surgical Privileges</span>
                                <span className="mapdoc-suite-desc">
                                  Cath labs, interventional procedures & operative theater access
                                </span>
                              </div>
                            </label>
                          </div>
                        );
                      }}
                    />
                    {errors.privileges && (
                      <span className="mapdoc-form-error">{errors.privileges.message}</span>
                    )}
                  </div>

                  {/* Department Assignment */}
                  <div className="mapdoc-form-group">
                    <label htmlFor="input-department" className="mapdoc-form-label">
                      <span>Department Assignment</span>
                      <span className="mapdoc-required-star">*</span>
                    </label>
                    <input
                      id="input-department"
                      type="text"
                      {...register('department')}
                      placeholder="e.g. Department of Cardiology"
                      className="mapdoc-form-input"
                    />
                    {errors.department && (
                      <span className="mapdoc-form-error">{errors.department.message}</span>
                    )}
                  </div>

                  {/* Effective Start Date */}
                  <div className="mapdoc-form-group">
                    <label htmlFor="input-effective-date" className="mapdoc-form-label">
                      <span>Effective Start Date</span>
                      <span className="mapdoc-required-star">*</span>
                    </label>
                    <input
                      id="input-effective-date"
                      type="date"
                      {...register('effectiveDate')}
                      className="mapdoc-form-input"
                    />
                    <span className="mapdoc-form-helper">
                      Immediately active after institutional sign-off
                    </span>
                    {errors.effectiveDate && (
                      <span className="mapdoc-form-error">{errors.effectiveDate.message}</span>
                    )}
                  </div>

                  {/* Compliance & Audit Note */}
                  <div className="mapdoc-compliance-box">
                    <Lock size={14} className="text-[#28006d] shrink-0 mt-0.5" />
                    <p className="mapdoc-compliance-text">
                      This credential action initiates an automated HL7 credential notification to facility credentialing board and updates state NPI registry associations.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="mapdoc-actions-container">
                    <button
                      type="submit"
                      id="btn-confirm-map-doctor"
                      disabled={isSubmitting || assignDoctorMutation.isPending || mapDoctorMutation.isPending}
                      className="mapdoc-btn-submit"
                    >
                      {assignDoctorMutation.isPending || mapDoctorMutation.isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Processing Credentialing...</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {isDoctorMode
                              ? isTargetAlreadyMapped
                                ? `Update Assignment at ${selectedFacility?.legalName || 'Facility'}`
                                : `Confirm & Add Facility Assignment`
                              : isTargetAlreadyMapped
                              ? 'Already Credentialed at this Facility'
                              : 'Confirm & Map Doctor to Facility'}
                          </span>
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      id="btn-cancel-mapping"
                      onClick={() =>
                        handleNav(
                          isDoctorMode
                            ? `/admin/doctors/${doctor!.id}`
                            : `/admin/facilities/${facility!.id}`
                        )
                      }
                      className="mapdoc-btn-cancel"
                    >
                      Cancel Selection
                    </button>
                  </div>
                </form>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMapDoctor;
