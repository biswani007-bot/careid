import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Video,
  Check,
  AlertTriangle,
  Activity,
  Flag,
  Clock,
  Heart,
  Thermometer,
  Wind,
  Gauge,
  Scale,
  ShieldAlert,
  User,
  ArrowLeft,
  RotateCw,
  Pencil,
  Plus,
  X,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { usePatientProfile, usePatientAvatar } from '@/hooks/usePatients';
import { patientService, calculateAge } from '@/services/patientService';
import patientAvatarHero from '@/assets/avatars/patient-avatar-hero.png';
import patientAvatarMale from '@/assets/avatars/patient-avatar-male.png';

function formatDobAndAge(dob?: string | null, gender?: string | null): string {
  if (!dob || !dob.trim() || dob === 'null' || dob === 'undefined') {
    return gender ? `${gender} • Age unknown` : 'Not recorded';
  }
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) {
    return gender ? `${gender} • Age unknown` : 'Not recorded';
  }
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }
  const formattedDob = birthDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const genderCode = gender ? gender.charAt(0).toUpperCase() : '';
  const parts = [
    age >= 0 ? `${age}` : '',
    genderCode,
    formattedDob !== 'Invalid Date' ? formattedDob : '',
  ].filter(Boolean);
  return parts.join(' • ') || 'Not recorded';
}

export const PatientProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { patient, isLoading, error, refetch } = usePatientProfile(id);
  const avatarSrc = usePatientAvatar(patient?.photoUrl, patient?.gender);

  // Clinical Alerts & Conditions Editing State
  const [isEditingAlerts, setIsEditingAlerts] = useState(false);
  const [editAllergies, setEditAllergies] = useState<string[]>([]);
  const [editChronic, setEditChronic] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [chronicInput, setChronicInput] = useState('');
  const [isSavingAlerts, setIsSavingAlerts] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAlertsModal = () => {
    setEditAllergies(patient?.knownAllergies || []);
    setEditChronic(patient?.chronicConditions || []);
    setAllergyInput('');
    setChronicInput('');
    setAlertsError(null);
    setIsEditingAlerts(true);
  };

  const handleSaveAlerts = async () => {
    if (!patient) return;
    setIsSavingAlerts(true);
    setAlertsError(null);
    try {
      await patientService.updateClinicalAlerts(patient.id, {
        knownAllergies: editAllergies,
        chronicConditions: editChronic,
      });
      setIsEditingAlerts(false);
      triggerToast('Clinical alerts & conditions updated successfully.');
      refetch();
    } catch (err: any) {
      setAlertsError(err?.message || 'Failed to update clinical alerts.');
    } finally {
      setIsSavingAlerts(false);
    }
  };

  // Synchronize latest profile data with Recently Viewed
  useEffect(() => {
    if (patient) {
      patientService.updateRecentlyViewedPatient(patient, { addIfMissing: true });
    }
  }, [patient]);

  // Loading skeleton matching Figma layout 1:473
  if (isLoading) {
    return (
      <div className="w-full space-y-6 animate-pulse" aria-busy="true">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-9 flex flex-col gap-4">
            {/* Header skeleton */}
            <div className="bg-white border border-[#cbc4d4] rounded-xl p-[21px] flex flex-col sm:flex-row gap-6 items-start">
              <div className="size-24 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-3 w-full">
                <div className="h-8 bg-slate-200 rounded w-1/3" />
                <div className="flex gap-2">
                  <div className="h-5 bg-slate-200 rounded w-24" />
                  <div className="h-5 bg-slate-200 rounded w-20" />
                </div>
                <div className="border-t border-slate-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="h-10 bg-slate-100 rounded" />
                  <div className="h-10 bg-slate-100 rounded" />
                  <div className="h-10 bg-slate-100 rounded" />
                  <div className="h-10 bg-slate-100 rounded" />
                </div>
              </div>
            </div>

            {/* Medical alerts skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-24 bg-slate-100 rounded-lg" />
              <div className="h-24 bg-slate-100 rounded-lg" />
              <div className="h-24 bg-slate-100 rounded-lg" />
            </div>

            {/* Vitals skeleton */}
            <div className="bg-white border border-[#cbc4d4] rounded-xl p-[21px] space-y-4">
              <div className="h-6 bg-slate-200 rounded w-32" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-20 bg-slate-100 rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          {/* Quick facts skeleton */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-[#cbc4d4] rounded-xl p-[21px] space-y-4">
              <div className="h-5 bg-slate-200 rounded w-24" />
              <div className="space-y-3">
                <div className="h-12 bg-slate-100 rounded" />
                <div className="h-12 bg-slate-100 rounded" />
                <div className="h-12 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-rose-50 text-[#ba1a1a] mx-auto flex items-center justify-center">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Failed to Load Patient Profile</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors flex items-center gap-1.5"
          >
            <RotateCw className="size-3.5" />
            <span>Retry</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Patient Directory</span>
          </button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!patient) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
          <User className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Patient Profile Not Found</h2>
        <p className="text-xs text-slate-500">
          No patient record found matching identifier <span className="font-mono font-semibold text-slate-700">{id}</span> in the clinical registry.
        </p>
        <button
          type="button"
          onClick={() => navigate('/patients')}
          className="px-5 py-2.5 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors"
        >
          Return to Patient Directory
        </button>
      </div>
    );
  }



  const allergiesText =
    patient.knownAllergies && patient.knownAllergies.length > 0
      ? patient.knownAllergies.join(', ')
      : 'No known allergies documented';

  const chronicText =
    patient.chronicConditions && patient.chronicConditions.length > 0
      ? patient.chronicConditions.join(', ')
      : 'No chronic conditions reported';

  const highRiskText =
    patient.disabilities && patient.disabilities.length > 0
      ? patient.disabilities.join(', ')
      : 'None reported';

  const insuranceLabel =
    patient.insurancePolicy?.status || (patient.healthCard ? 'Active' : 'Uninsured');

  const emergencyName = patient.emergencyContact
    ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship || 'Contact'})`
    : 'Not recorded';

  const emergencyPhone =
    patient.emergencyContact?.phone || patient.phone || '—';

  return (
    <div className="w-full space-y-6" data-node-id="1:473">
      {/* 12-Column Main Workspace Grid (Figma node 1:509) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left / Main Content Column (Span 9) (Figma node 1:510) */}
        <div className="lg:col-span-9 flex flex-col gap-4">
          {/* 1. Patient Header Card (Figma node 1:511) */}
          <div className="bg-white border border-[#cbc4d4] rounded-xl p-[21px] shadow-sm relative overflow-hidden flex flex-col sm:flex-row gap-6 items-start">
            {/* Decorative Corner Overlay (Figma node 1:512) */}
            <div
              className="absolute -top-16 -right-16 size-32 rounded-bl-full bg-[#28006d]/5 pointer-events-none"
              aria-hidden="true"
            />

            {/* Patient Avatar with Verified Badge (Figma node 1:513) */}
            <div className="relative shrink-0">
              <div className="size-24 rounded-full border-4 border-[#f8f9fa] shadow-sm overflow-hidden bg-slate-100">
                <img
                  src={avatarSrc}
                  alt={patient.fullName}
                  className="size-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback =
                      patient.gender?.toLowerCase() === 'female'
                        ? patientAvatarHero
                        : patientAvatarMale;
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                />
              </div>
              <div
                className="absolute -bottom-1 -right-1 size-7 rounded-full bg-[#dcfce7] border-2 border-[#f8f9fa] shadow-sm flex items-center justify-center text-[#15803d]"
                title="Verified Identity"
              >
                <Check className="size-4 stroke-[2.5]" aria-hidden="true" />
              </div>
            </div>

            {/* Patient Header Details & Actions (Figma node 1:518) */}
            <div className="flex-1 min-w-0 w-full">
              {/* Top Row: Name + Badges + Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-[32px] font-semibold text-[#191c1d] leading-tight">
                    {patient.fullName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="bg-[#3f1d8b]/20 text-[#28006d] text-sm font-medium tracking-[0.1px] rounded px-2 py-0.5">
                      {patient.patientNumber}
                    </span>
                    <span className="bg-[#76f1ff]/30 text-[#006971] text-xs font-medium tracking-[0.5px] rounded-full px-2 py-0.5 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-[#006971]" />
                      <span>{patient.profileStatus || 'Active'}</span>
                    </span>
                  </div>
                </div>

                {/* Header Action Buttons (Figma node 1:530) */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                      }
                    }}
                    className="border border-[#28006d] hover:bg-purple-50 text-[#28006d] text-sm font-medium rounded-lg px-[17px] py-[9px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#28006d]"
                  >
                    Share Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = patient?.id || id;
                      if (targetId) {
                        navigate(`/communication/chat?patientId=${encodeURIComponent(targetId)}`);
                      } else {
                        navigate('/communication/chat');
                      }
                    }}
                    className="border border-[#006971] hover:bg-teal-50 text-[#006971] text-sm font-medium rounded-lg px-3.5 py-[9px] flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#006971]"
                    title="Send a secure clinical message to this patient"
                  >
                    <MessageSquare className="size-4" aria-hidden="true" />
                    <span>Message Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = patient?.id || id;
                      if (targetId) {
                        const parsedAge = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
                        navigate(`/treatment-offers/new/step-1?patientId=${encodeURIComponent(targetId)}`, {
                          state: {
                            patientId: targetId,
                            patientName: patient?.fullName,
                            patientCid: patient?.patientNumber || (patient as unknown as { mrn?: string })?.mrn,
                            patientGender: patient?.gender,
                            patientAge: parsedAge !== null ? `${parsedAge}` : undefined,
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
                    className="bg-[#28006d] hover:bg-[#3f1d8b] text-white text-sm font-medium rounded-lg px-4 py-[9px] flex items-center gap-2 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#28006d]"
                  >
                    <Video className="size-4" aria-hidden="true" />
                    <span>Start Consult</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Demographics Row (Figma node 1:538) */}
              <div className="border-t border-[#cbc4d4]/50 pt-4 mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Age / Gender / DOB */}
                <div>
                  <p className="text-xs font-medium text-[#494552] tracking-[0.5px]">
                    Age / Gender / DOB
                  </p>
                  <p className="text-sm font-medium text-[#191c1d] mt-0.5 leading-snug">
                    {formatDobAndAge(patient.dateOfBirth, patient.gender)}
                  </p>
                </div>

                {/* Blood Group */}
                <div>
                  <p className="text-xs font-medium text-[#494552] tracking-[0.5px]">
                    Blood Group
                  </p>
                  <p className="text-sm font-medium text-[#4c0010] mt-0.5 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[#ba1a1a]" />
                    <span>{patient.bloodGroup || 'Not specified'}</span>
                  </p>
                </div>

                {/* Primary Physician */}
                <div>
                  <p className="text-xs font-medium text-[#494552] tracking-[0.5px]">
                    Primary Physician
                  </p>
                  <p className="text-sm font-medium text-[#191c1d] mt-0.5">
                    Attending Physician
                  </p>
                </div>

                {/* Insurance Status */}
                <div>
                  <p className="text-xs font-medium text-[#494552] tracking-[0.5px]">
                    Insurance Status
                  </p>
                  <p className="text-sm font-medium text-[#15803d] mt-0.5 flex items-center gap-1">
                    <Check className="size-3.5 stroke-[2.5]" aria-hidden="true" />
                    <span>{insuranceLabel}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Medical Alerts Row (Figma node 1:561) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#494552]">
                Clinical Alerts &amp; Safety Warnings
              </span>
              <button
                type="button"
                onClick={handleOpenAlertsModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#006971] bg-[#006971]/10 hover:bg-[#006971]/20 rounded-lg transition-colors"
                title="Edit allergies and chronic conditions"
              >
                <Pencil className="size-3" />
                <span>Edit Alerts</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Known Allergies (Figma node 1:562) */}
              <div className="bg-[#ffdad6]/30 border border-[#ffdad6] rounded-lg p-[17px] flex items-start gap-3">
                <div className="text-[#ba1a1a] shrink-0 mt-0.5">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[#191c1d]">
                    Known Allergies
                  </h2>
                  <p className="text-sm text-[#494552] leading-snug">
                    {allergiesText}
                  </p>
                </div>
              </div>

              {/* Chronic Conditions (Figma node 1:569) */}
              <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-lg p-[17px] flex items-start gap-3">
                <div className="text-[#ea580c] shrink-0 mt-0.5">
                  <Activity className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[#191c1d]">
                    Chronic Conditions
                  </h2>
                  <p className="text-sm text-[#494552] leading-snug">
                    {chronicText}
                  </p>
                </div>
              </div>

              {/* High Risk Indicators (Figma node 1:576) */}
              <div className="bg-[#f3f4f5] border border-[#cbc4d4] rounded-lg p-[17px] flex items-start gap-3">
                <div className="text-[#006971] shrink-0 mt-0.5">
                  <Flag className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[#191c1d]">
                    High Risk Indicators
                  </h2>
                  <p className="text-sm text-[#494552] leading-snug">
                    {highRiskText}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Current Vitals Card (Figma node 1:583) */}
          <div className="bg-white border border-[#cbc4d4] rounded-xl p-[21px] shadow-sm space-y-4">
            {/* Vitals Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-[#28006d]" aria-hidden="true" />
                <h2 className="text-xl font-semibold text-[#191c1d]">
                  Current Vitals
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#494552] tracking-[0.5px]">
                <Clock className="size-3.5" aria-hidden="true" />
                <span>Last Updated: {patient.vitals?.lastUpdated || 'No recent telemetry recorded'}</span>
              </div>
            </div>

            {/* 6 Physiological Telemetry Tiles (Figma node 1:593) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {/* BP */}
              <div className="bg-[#f3f4f5] border border-[#e1e3e4] rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1 text-xs font-medium text-[#494552] tracking-[0.5px]">
                  <Gauge className="size-3.5" aria-hidden="true" />
                  <span>BP</span>
                </div>
                <div>
                  <span className="text-xl font-semibold text-[#191c1d]">
                    {patient.vitals?.bp || '—'}
                  </span>
                  {patient.vitals?.bpUnit && (
                    <span className="text-xs text-[#494552] ml-1 font-normal">
                      {patient.vitals.bpUnit}
                    </span>
                  )}
                </div>
              </div>

              {/* HR */}
              <div className="bg-[#f3f4f5] border border-[#e1e3e4] rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1 text-xs font-medium text-[#494552] tracking-[0.5px]">
                  <Heart className="size-3.5 text-[#ba1a1a]" aria-hidden="true" />
                  <span>HR</span>
                </div>
                <div>
                  <span className="text-xl font-semibold text-[#191c1d]">
                    {patient.vitals?.hr || '—'}
                  </span>
                  {patient.vitals?.hrUnit && (
                    <span className="text-xs text-[#494552] ml-1 font-normal">
                      {patient.vitals.hrUnit}
                    </span>
                  )}
                </div>
              </div>

              {/* Temp */}
              <div className="bg-[#f3f4f5] border border-[#e1e3e4] rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1 text-xs font-medium text-[#494552] tracking-[0.5px]">
                  <Thermometer className="size-3.5 text-[#ea580c]" aria-hidden="true" />
                  <span>Temp</span>
                </div>
                <div>
                  <span className="text-xl font-semibold text-[#191c1d]">
                    {patient.vitals?.temp || '—'}
                  </span>
                  {patient.vitals?.tempUnit && (
                    <span className="text-xs text-[#494552] ml-1 font-normal">
                      {patient.vitals.tempUnit}
                    </span>
                  )}
                </div>
              </div>

              {/* SpO2 */}
              <div className="bg-[#f3f4f5] border border-[#e1e3e4] rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1 text-xs font-medium text-[#494552] tracking-[0.5px]">
                  <Wind className="size-3.5 text-[#006971]" aria-hidden="true" />
                  <span>SpO2</span>
                </div>
                <div>
                  <span className="text-xl font-semibold text-[#191c1d]">
                    {patient.vitals?.spo2 || '—'}
                  </span>
                  {patient.vitals?.spo2Unit && (
                    <span className="text-xs text-[#494552] ml-1 font-normal">
                      {patient.vitals.spo2Unit}
                    </span>
                  )}
                </div>
              </div>

              {/* Resp */}
              <div className="bg-[#f3f4f5] border border-[#e1e3e4] rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1 text-xs font-medium text-[#494552] tracking-[0.5px]">
                  <Activity className="size-3.5" aria-hidden="true" />
                  <span>Resp</span>
                </div>
                <div>
                  <span className="text-xl font-semibold text-[#191c1d]">
                    {patient.vitals?.resp || '—'}
                  </span>
                  {patient.vitals?.respUnit && (
                    <span className="text-xs text-[#494552] ml-1 font-normal">
                      {patient.vitals.respUnit}
                    </span>
                  )}
                </div>
              </div>

              {/* BMI */}
              <div className="bg-[#f3f4f5] border border-[#e1e3e4] rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1 text-xs font-medium text-[#494552] tracking-[0.5px]">
                  <Scale className="size-3.5" aria-hidden="true" />
                  <span>BMI</span>
                </div>
                <div>
                  <span className="text-xl font-semibold text-[#191c1d]">
                    {patient.vitals?.bmi || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Panel (Span 3) (Figma node 1:636) */}
        <div className="lg:col-span-3">
          {/* Quick Facts Card (Figma node 1:637) */}
          <div className="bg-white border border-[#cbc4d4] rounded-xl p-[21px] shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-[#191c1d] pb-[9px] border-b border-[#cbc4d4]">
              Quick Facts
            </h2>

            <div className="space-y-4">
              {/* Emergency Contact */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#494552] tracking-[0.5px]">
                  Emergency Contact
                </p>
                <p className="text-sm text-[#191c1d]">
                  {emergencyName}
                </p>
                {emergencyPhone !== '—' ? (
                  <a
                    href={`tel:${emergencyPhone}`}
                    className="text-base text-[#28006d] font-normal hover:underline block"
                  >
                    {emergencyPhone}
                  </a>
                ) : (
                  <span className="text-sm text-[#494552] block">—</span>
                )}
              </div>

              {/* Assigned Nurse */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#494552] tracking-[0.5px]">
                  Assigned Nurse
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="size-6 rounded-full bg-[#e1e3e4] flex items-center justify-center text-[#494552] shrink-0">
                    <User className="size-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-sm text-[#191c1d]">
                    Care Team RN
                  </span>
                </div>
              </div>

              {/* Primary Hospital */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#494552] tracking-[0.5px]">
                  Primary Hospital
                </p>
                <p className="text-sm text-[#191c1d]">
                  {patient.currentCity ? `${patient.currentCity} Medical Center` : 'CareID Health Center'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action CTA Button (Figma node 1:662) */}
      <button
        type="button"
        onClick={() => navigate(`/patients/${patient.id}/financing`)}
        className="w-full h-12 rounded-full bg-gradient-to-b from-[#a44cff] to-[#5b14b8] hover:opacity-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0px_4px_6px_-1px_rgba(63,29,139,0.3),0px_2px_4px_-2px_rgba(63,29,139,0.3)] transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
      >
        <ShieldAlert className="size-4" aria-hidden="true" />
        <span>Insurance &amp; Financing Hub</span>
      </button>

      {/* Clinical Alerts & Conditions Edit Modal */}
      {isEditingAlerts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Update Clinical Alerts</h3>
                <p className="text-xs text-slate-500">Document allergies and chronic conditions for patient clinical safety</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingAlerts(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {alertsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{alertsError}</span>
              </div>
            )}

            {/* Known Allergies section */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-rose-500" />
                Known Allergies
              </label>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                {editAllergies.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No allergies documented</span>
                ) : (
                  editAllergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => setEditAllergies(editAllergies.filter((_, i) => i !== idx))}
                        className="hover:text-rose-950"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Peanuts, Latex..."
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = allergyInput.trim();
                      if (val && !editAllergies.includes(val)) {
                        setEditAllergies([...editAllergies, val]);
                        setAllergyInput('');
                      }
                    }
                  }}
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#006971]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = allergyInput.trim();
                    if (val && !editAllergies.includes(val)) {
                      setEditAllergies([...editAllergies, val]);
                      setAllergyInput('');
                    }
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Chronic Conditions section */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Activity className="size-3.5 text-amber-500" />
                Chronic Conditions
              </label>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                {editChronic.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No chronic conditions reported</span>
                ) : (
                  editChronic.map((cond, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200"
                    >
                      {cond}
                      <button
                        type="button"
                        onClick={() => setEditChronic(editChronic.filter((_, i) => i !== idx))}
                        className="hover:text-amber-950"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Asthma, CAD..."
                  value={chronicInput}
                  onChange={(e) => setChronicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = chronicInput.trim();
                      if (val && !editChronic.includes(val)) {
                        setEditChronic([...editChronic, val]);
                        setChronicInput('');
                      }
                    }
                  }}
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#006971]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = chronicInput.trim();
                    if (val && !editChronic.includes(val)) {
                      setEditChronic([...editChronic, val]);
                      setChronicInput('');
                    }
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                disabled={isSavingAlerts}
                onClick={() => setIsEditingAlerts(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingAlerts}
                onClick={handleSaveAlerts}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#006971] hover:bg-[#005259] disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isSavingAlerts ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <Check className="size-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
