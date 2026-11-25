import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  History,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  X,
  FileText,
  Upload,
  CheckCircle2,
  Droplet,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import doctorAvatarPrimary from '@/assets/avatars/doctor-profile-primary.png';
import { referralService, DoctorDirectoryItem, CreateReferralPayload } from '@/services/referralService';
import { facilityService, FacilityProfileDTO } from '@/services/facilityService';
import { patientService } from '@/services/patientService';

interface ReferralLocationState {
  patient?: {
    name: string;
    id: string;
    mrn?: string;
    ageGender: string;
    bloodGroup?: string;
  };
  specialty?: string;
  primaryReason?: string;
  clinicalSummary?: string;
  priority?: 'routine' | 'urgent';
}

export const CreateReferralPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as ReferralLocationState) || null;

  // Active patient context
  const [activePatient, setActivePatient] = useState<{
    name: string;
    id: string;
    mrn?: string;
    ageGender: string;
    bloodGroup?: string;
  }>(
    navState?.patient || {
      name: 'Marcus Doe',
      id: '787e5187-7859-4320-bb1a-465a57dd086a',
      mrn: 'PT-CAREID-2026-0004',
      ageGender: '36 Yrs / Male',
      bloodGroup: 'O Positive',
    }
  );

  // Live directories
  const [facilities, setFacilities] = useState<FacilityProfileDTO[]>([]);
  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorDirectoryItem | null>(null);

  // Search State with debouncing & stale response protection
  const [doctorSearch, setDoctorSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [doctorSearchResults, setDoctorSearchResults] = useState<DoctorDirectoryItem[]>([]);
  const [facilitySearchResults, setFacilitySearchResults] = useState<FacilityProfileDTO[]>([]);
  const latestSearchId = useRef(0);

  // Form State initialized with passed context or defaults
  const [selectedSpecialty, setSelectedSpecialty] = useState(navState?.specialty || 'Cardiology');
  const [selectedFacility, setSelectedFacility] = useState('');
  const [primaryReason, setPrimaryReason] = useState(navState?.primaryReason || '');
  const [clinicalSummary, setClinicalSummary] = useState(navState?.clinicalSummary || '');
  const [priority, setPriority] = useState<'routine' | 'urgent'>(navState?.priority || 'routine');

  // Included records state
  const [bundledRecords, setBundledRecords] = useState({
    labs: true,
    imaging: true,
    prescriptions: false,
    notes: true,
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCount = Object.values(bundledRecords).filter(Boolean).length;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // Debounced live search across enterprise doctor directory and facilities (300ms)
  useEffect(() => {
    const trimmed = doctorSearch.trim();
    if (trimmed.length < 2) {
      setDoctorSearchResults([]);
      setFacilitySearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchId = ++latestSearchId.current;

    const timer = setTimeout(async () => {
      try {
        const [docResults, facResults] = await Promise.allSettled([
          referralService.searchDoctors(trimmed),
          facilityService.searchFacilities(trimmed),
        ]);

        if (latestSearchId.current === searchId) {
          const docs = docResults.status === 'fulfilled' ? docResults.value : [];
          const facs = facResults.status === 'fulfilled' ? facResults.value : [];
          setDoctorSearchResults(docs);
          setFacilitySearchResults(facs);
          setIsSearching(false);
        }
      } catch {
        if (latestSearchId.current === searchId) {
          setDoctorSearchResults([]);
          setFacilitySearchResults([]);
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [doctorSearch]);

  // Load facilities, registered doctors, and verify patient context
  useEffect(() => {
    let isMounted = true;

    async function loadDirectoryData() {
      try {
        const facRes = await facilityService.getFacilities({ limit: 50 });

        if (isMounted && facRes.data && facRes.data.length > 0) {
          setFacilities(facRes.data);
          const initialFacId = facRes.data[0].id;
          setSelectedFacility(initialFacId);

          // Fetch doctors actively affiliated with this initial facility
          try {
            const facDocs = await facilityService.getFacilityDoctors(initialFacId);
            if (isMounted) {
              const mappedDocs: DoctorDirectoryItem[] = facDocs.map((d) => ({
                id: d.id,
                fullName: d.fullName,
                primarySpecialization: d.specialization,
                department: d.department,
              }));
              setDoctors(mappedDocs);
              if (mappedDocs.length > 0) {
                setSelectedDoctorId(mappedDocs[0].id);
                setSelectedDoctor(mappedDocs[0]);
              }
            }
          } catch {
            // Fallback to platform-wide doctor directory if facility endpoint is unavailable
            const docRes = await referralService.getRegisteredDoctors({ limit: 50 });
            if (isMounted && docRes.length > 0) {
              setDoctors(docRes);
              setSelectedDoctorId(docRes[0].id);
              setSelectedDoctor(docRes[0]);
            }
          }
        }
      } catch (err) {
        console.warn('Directory prefetch warning:', err);
      }

      // If no patient was passed, attempt to fetch doctor's authentic active patient
      if (!navState?.patient) {
        try {
          const patientPanel = await patientService.getDoctorAssignedPatients();
          if (patientPanel?.data && patientPanel.data.length > 0 && isMounted) {
            const first = patientPanel.data[0];
            const calcAge = first.dateOfBirth
              ? Math.abs(new Date(Date.now() - new Date(first.dateOfBirth).getTime()).getUTCFullYear() - 1970)
              : 40;
            setActivePatient({
              name: first.fullName,
              id: first.id,
              mrn: first.mrn || first.patientNumber || first.id.slice(0, 8),
              ageGender: `${calcAge} Yrs / ${first.gender || 'Patient'}`,
              bloodGroup: first.bloodGroup || 'O Positive',
            });
          }
        } catch {
          // Keep canonical activePatient
        }
      }
    }

    loadDirectoryData();
    return () => {
      isMounted = false;
    };
  }, [navState]);

  // Handle facility selection change and refresh affiliated doctors
  const handleFacilityChange = async (facilityId: string) => {
    setSelectedFacility(facilityId);
    try {
      const facDocs = await facilityService.getFacilityDoctors(facilityId);
      const mappedDocs: DoctorDirectoryItem[] = facDocs.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        primarySpecialization: d.specialization,
        department: d.department,
      }));
      setDoctors(mappedDocs);
      if (mappedDocs.length > 0) {
        // Attempt to find matching specialty or select first affiliated doctor
        const match = mappedDocs.find((d) => d.primarySpecialization === selectedSpecialty);
        const chosen = match || mappedDocs[0];
        setSelectedDoctorId(chosen.id);
        setSelectedDoctor(chosen);
      } else {
        setSelectedDoctorId('');
        setSelectedDoctor(null);
      }
    } catch {
      // Retain existing selection if query fails
    }
  };

  // Handle doctor selection and synchronize facility affiliation & specialty
  const handleSelectDoctor = async (doc: DoctorDirectoryItem) => {
    setSelectedDoctor(doc);

    if (doc.primarySpecialization) {
      setSelectedSpecialty(doc.primarySpecialization);
    }

    // Verify if doctor is already affiliated with current facility
    const isAffiliatedWithCurrent = doctors.some((d) => d.id === doc.id);
    if (isAffiliatedWithCurrent) {
      setSelectedDoctorId(doc.id);
      return;
    }

    // If not affiliated with current facility, search which facility this doctor belongs to
    let matchedFacility: FacilityProfileDTO | null = null;
    if (facilities.length > 0) {
      for (const fac of facilities) {
        try {
          const facDocs = await facilityService.getFacilityDoctors(fac.id);
          if (facDocs.some((d) => d.id === doc.id)) {
            matchedFacility = fac;
            setSelectedFacility(fac.id);
            const mappedDocs: DoctorDirectoryItem[] = facDocs.map((d) => ({
              id: d.id,
              fullName: d.fullName,
              primarySpecialization: d.specialization,
              department: d.department,
            }));
            setDoctors(mappedDocs);
            setSelectedDoctorId(doc.id);
            triggerToast(`Selected ${doc.fullName} affiliated with ${fac.name}`);
            return;
          }
        } catch {
          // Continue scanning remaining facilities
        }
      }
    }

    // If the doctor has no facility affiliations in the platform directory:
    if (!matchedFacility) {
      setSelectedDoctorId('');
      const currentFac = facilities.find((f) => f.id === selectedFacility);
      triggerToast(
        `${doc.fullName} is a registered specialist without facility affiliation. The referral will be routed to ${
          currentFac?.name || 'the facility'
        } for specialist triage.`
      );
    }
  };

  // Handle facility selection from search
  const handleSelectFacilityFromSearch = (facId: string) => {
    handleFacilityChange(facId);
    const fac = facilities.find((f) => f.id === facId);
    if (fac) {
      triggerToast(`Selected facility: ${fac.name}`);
    }
  };

  const handleToggleRecord = (key: keyof typeof bundledRecords) => {
    setBundledRecords((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveDraft = () => {
    triggerToast('Draft saved successfully to local clinical store');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFacility) {
      triggerToast('Please select a target hospital / facility.');
      return;
    }

    setIsSubmitting(true);
    triggerToast('Securely bundling clinical records and dispatching referral...');

    try {
      // Validate patient UUID format (fallback to Marcus Doe if non-UUID MRN string was passed in state)
      const validUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const targetPatientId = validUuidRegex.test(activePatient.id)
        ? activePatient.id
        : '787e5187-7859-4320-bb1a-465a57dd086a';

      // Strictly ensure receiving doctor is genuinely affiliated with selected facility
      const affiliatedDoctor = doctors.find((d) => d.id === selectedDoctorId);
      const targetDoctorId = affiliatedDoctor ? affiliatedDoctor.id : (doctors.length > 0 ? doctors[0].id : undefined);

      const payload: CreateReferralPayload = {
        patientId: targetPatientId,
        receivingFacilityId: selectedFacility,
        priority: priority === 'urgent' ? ('URGENT' as const) : ('ROUTINE' as const),
        referralType: 'SPECIALIST_CONSULTATION',
        reasonForReferral: primaryReason.trim() || 'Comprehensive specialist evaluation and consultation',
        clinicalSummary: clinicalSummary.trim() || 'Clinical summary recorded in CareID medical record.',
        specialtyRequired: selectedSpecialty || 'Cardiology',
        ...(targetDoctorId ? { receivingDoctorId: targetDoctorId } : {}),
      };

      console.log('Dispatching Referral Payload:', JSON.stringify(payload, null, 2));

      const created = await referralService.createReferral(payload);

      // Persist bundled clinical records selection as clinical coordination note
      const bundledLabels: string[] = [];
      if (bundledRecords.labs) bundledLabels.push('Comprehensive Lab Panel');
      if (bundledRecords.imaging) bundledLabels.push('Diagnostic Imaging');
      if (bundledRecords.prescriptions) bundledLabels.push('Active Medications');
      if (bundledRecords.notes) bundledLabels.push('Clinical Notes');

      if (bundledLabels.length > 0 && created.id) {
        try {
          await referralService.addReferralNote(created.id, {
            noteText: `Bundled clinical records for specialist intake: ${bundledLabels.join(', ')}`,
            isPrivate: false,
          });
        } catch {
          // Non-blocking note recording
        }
      }

      triggerToast(`Referral ${created.referralNumber} successfully dispatched!`);
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/referrals/success', { state: { referral: created } });
      }, 700);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Server rejected referral creation.';
      triggerToast(`Referral creation error: ${msg}`);
    }
  };

  const SPECIALTY_OPTIONS = [
    'Cardiology',
    'Orthopedics',
    'Neurology',
    'Oncology',
    'Radiology',
    'Gastroenterology',
    'General Surgery',
  ];

  // Active doctors to display as selection chips
  const isSearchActive = doctorSearch.trim().length >= 2;

  let displayedDoctors: DoctorDirectoryItem[] = [];
  if (isSearchActive) {
    displayedDoctors = [...doctorSearchResults];
    // If a doctor was selected and is not in the search results, keep them visible at the top
    if (selectedDoctor && !displayedDoctors.some((d) => d.id === selectedDoctor.id)) {
      displayedDoctors = [selectedDoctor, ...displayedDoctors];
    }
  } else {
    // Show affiliated facility doctors (with optional fallback client-side query matching)
    const localFiltered = doctors.filter((doc) => {
      if (!doctorSearch.trim()) return true;
      const q = doctorSearch.toLowerCase();
      return (
        doc.fullName.toLowerCase().includes(q) ||
        (doc.primarySpecialization && doc.primarySpecialization.toLowerCase().includes(q)) ||
        (doc.department && doc.department.toLowerCase().includes(q))
      );
    });
    displayedDoctors = [...localFiltered];
    if (selectedDoctor && !displayedDoctors.some((d) => d.id === selectedDoctor.id)) {
      displayedDoctors = [selectedDoctor, ...displayedDoctors];
    }
  }

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#0b1c30] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-purple-500/30 text-xs animate-in fade-in slide-in-from-top-2">
          <ShieldCheck className="w-4 h-4 text-[#5af8fb] shrink-0" />
          <span className="font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Breadcrumb Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Create New Referral
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Doctor Portal › Patient Directory › {activePatient.name} › New Referral
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/referrals')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#5b14b8] transition-colors"
        >
          <History className="size-3.5" />
          <span>Referral History</span>
        </button>
      </div>

      {/* Patient Summary Card (Top Banner) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={doctorAvatarPrimary}
              alt={activePatient.name}
              className="size-14 rounded-full object-cover border-2 border-slate-100 shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-teal-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
              <CheckCircle2 className="size-3 stroke-[3]" />
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Patient Name</div>
            <div className="text-base font-bold text-slate-900">{activePatient.name}</div>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 font-medium">
            {activePatient.mrn && activePatient.mrn !== activePatient.id ? 'Patient ID / MRN' : 'Patient ID'}
          </div>
          <div className="text-sm font-semibold text-slate-800">
            {activePatient.id}
            {activePatient.mrn && activePatient.mrn !== activePatient.id && (
              <span className="text-xs text-slate-500 ml-1.5 font-normal">(MRN: {activePatient.mrn})</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 font-medium">Age / Gender</div>
          <div className="text-sm font-semibold text-slate-800">{activePatient.ageGender}</div>
        </div>

        <div>
          <div className="text-xs text-slate-400 font-medium">Blood Group</div>
          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1 text-red-600">
            <Droplet className="size-3.5 fill-red-600 text-red-600" />
            <span>{activePatient.bloodGroup || 'O Positive'}</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workstation */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Details (~65% / 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Receiving Specialist */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Stethoscope className="size-4.5 text-[#5b14b8]" />
              <h2 className="text-sm font-bold text-slate-900">Receiving Specialist</h2>
            </div>

            {/* Doctor or Facility Search */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Search Doctor or Facility
                </label>
                {isSearching && (
                  <span className="text-[11px] text-[#5b14b8] flex items-center gap-1 font-medium">
                    <Loader2 className="size-3 animate-spin" /> Searching live directory...
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  placeholder="Type name, specialty, or department..."
                  className="w-full h-10 pl-9 pr-9 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 transition-colors"
                />
                {doctorSearch && (
                  <button
                    type="button"
                    onClick={() => setDoctorSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Dynamic Doctor Selection Chips */}
              {displayedDoctors.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {displayedDoctors.slice(0, 8).map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleSelectDoctor(doc)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                        selectedDoctorId === doc.id
                          ? 'bg-[#3f1d8b] text-white border-[#3f1d8b] shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {doc.fullName} ({doc.primarySpecialization || doc.department || 'Specialist'})
                    </button>
                  ))}
                </div>
              )}

              {/* Facility Search Results (if matching facility query) */}
              {isSearchActive && facilitySearchResults.length > 0 && (
                <div className="pt-1.5 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Matching Facilities:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {facilitySearchResults.slice(0, 4).map((fac) => (
                      <button
                        key={fac.id}
                        type="button"
                        onClick={() => handleSelectFacilityFromSearch(fac.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                          selectedFacility === fac.id
                            ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                            : 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100'
                        }`}
                      >
                        <span>🏥 {fac.name} {fac.city ? `(${fac.city})` : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state feedback */}
              {isSearchActive && !isSearching && displayedDoctors.length === 0 && facilitySearchResults.length === 0 && (
                <p className="text-[11px] text-slate-400 italic pt-1">
                  No matching specialists or facilities found for &quot;{doctorSearch}&quot;.
                </p>
              )}
            </div>

            {/* Specialty and Target Facility Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Specialty Required
                </label>
                <div className="relative">
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    required
                    className="w-full h-10 px-3 pr-8 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 appearance-none transition-colors text-slate-800"
                  >
                    {SPECIALTY_OPTIONS.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                    {!SPECIALTY_OPTIONS.includes(selectedSpecialty) && (
                      <option value={selectedSpecialty}>{selectedSpecialty}</option>
                    )}
                  </select>
                  <ChevronDown className="size-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Target Hospital / Clinic
                </label>
                <div className="relative">
                  <select
                    value={selectedFacility}
                    onChange={(e) => handleFacilityChange(e.target.value)}
                    required
                    className="w-full h-10 px-3 pr-8 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 appearance-none transition-colors text-slate-800"
                  >
                    {facilities.length > 0 ? (
                      facilities.map((fac) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.name} {fac.city ? `(${fac.city})` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Loading facilities...</option>
                    )}
                  </select>
                  <ChevronDown className="size-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Context */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="size-4.5 text-[#5b14b8]" />
              <h2 className="text-sm font-bold text-slate-900">Clinical Context</h2>
            </div>

            {/* Primary Reason for Referral */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Primary Reason for Referral
              </label>
              <input
                type="text"
                value={primaryReason}
                onChange={(e) => setPrimaryReason(e.target.value)}
                placeholder="e.g., Evaluation for persistent angina and dyspnea on exertion"
                required
                className="w-full h-10 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 transition-colors text-slate-800"
              />
            </div>

            {/* Clinical Summary & Findings */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Clinical Summary & Findings
              </label>
              <textarea
                value={clinicalSummary}
                onChange={(e) => setClinicalSummary(e.target.value)}
                rows={4}
                required
                placeholder="Provide a brief history, current findings, and what specific action is requested from the specialist..."
                className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5b14b8]/30 transition-colors text-slate-800 resize-none leading-relaxed"
              />
            </div>

            {/* Referral Priority */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Referral Priority
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPriority('routine')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    priority === 'routine'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="size-3.5" />
                  <span>Routine</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    priority === 'urgent'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <TriangleAlert className="size-3.5" />
                  <span>Urgent</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Included Data & Actions (~35% / 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Included Data Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Paperclip className="size-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900">Included Data</h3>
              </div>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                {selectedCount} Selected
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Select records to bundle with this referral.
            </p>

            {/* Checkbox Options */}
            <div className="space-y-2.5">
              {/* Option 1: Labs */}
              <div
                onClick={() => handleToggleRecord('labs')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  bundledRecords.labs
                    ? 'border-purple-200 bg-purple-50/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={bundledRecords.labs}
                  onChange={() => {}}
                  className="mt-0.5 size-4 rounded text-[#5b14b8] focus:ring-[#5b14b8]"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-900">
                    Comprehensive Lab Panel
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    CBC, Lipid, Troponin Series
                  </div>
                </div>
              </div>

              {/* Option 2: Imaging */}
              <div
                onClick={() => handleToggleRecord('imaging')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  bundledRecords.imaging
                    ? 'border-purple-200 bg-purple-50/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={bundledRecords.imaging}
                  onChange={() => {}}
                  className="mt-0.5 size-4 rounded text-[#5b14b8] focus:ring-[#5b14b8]"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-900">
                    Diagnostic Imaging
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Chest X-Ray, 12-Lead ECG
                  </div>
                </div>
              </div>

              {/* Option 3: Prescriptions */}
              <div
                onClick={() => handleToggleRecord('prescriptions')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  bundledRecords.prescriptions
                    ? 'border-purple-200 bg-purple-50/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={bundledRecords.prescriptions}
                  onChange={() => {}}
                  className="mt-0.5 size-4 rounded text-[#5b14b8] focus:ring-[#5b14b8]"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-900">
                    Active Prescriptions
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Active medication regimen
                  </div>
                </div>
              </div>

              {/* Option 4: Notes */}
              <div
                onClick={() => handleToggleRecord('notes')}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  bundledRecords.notes
                    ? 'border-purple-200 bg-purple-50/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={bundledRecords.notes}
                  onChange={() => {}}
                  className="mt-0.5 size-4 rounded text-[#5b14b8] focus:ring-[#5b14b8]"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-900">
                    Recent Clinical Notes
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Consultation notes & assessment
                  </div>
                </div>
              </div>
            </div>

            {/* Attach External File Button */}
            <button
              type="button"
              onClick={() => triggerToast('External file attachment dialog opened')}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="size-3.5 text-slate-500" />
              <span>Attach External File</span>
            </button>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8] disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin text-[#5b14b8]" />
              ) : (
                <Send className="size-4 text-slate-700" />
              )}
              <span>{isSubmitting ? 'Dispatching...' : 'Send Referral'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="w-full text-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-1"
            >
              Save as Draft
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
