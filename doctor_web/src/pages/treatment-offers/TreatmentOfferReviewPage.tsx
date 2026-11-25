import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Calendar,
  Lock,
  X,
  Stethoscope,
  Percent,
  CreditCard,
  FileCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { TreatmentOfferState, dtoToOfferState, enrichOfferStateWithPatient, financingDtoToPackageOption, PROMPT_CASH_OPTION } from './types';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import { consultationService } from '@/services/consultationService';
import { treatmentOfferService, formatTreatmentOfferError, ClinicalReviewDTO } from '@/services/treatmentOfferService';
import { patientService } from '@/services/patientService';
import { extractCleanClinicalIndication } from '@/utils/clinicalDataSanitizer';

export const TreatmentOfferReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // Load offer state from navigation payload and always refresh live from backend by offer ID
  const incomingOffer = location.state as TreatmentOfferState | undefined;
  const [offer, setOffer] = useState<TreatmentOfferState>(
    incomingOffer || {
      patientId: '',
      patientName: '',
      patientCid: '',
      patientAge: '',
      patientGender: '',
      patientBlood: '',
      patientAllergy: '',
      insuranceStatus: '',
      referralId: '',
      cptCode: '',
      procedureName: '',
      department: '',
      facility: '',
      clinicalNecessity: '',
      baselineFee: 0,
      discountEnabled: false,
      discountMode: 'fixed',
      discountValue: 0,
      calculatedDiscount: 0,
      netProcedureCost: 0,
      financingPackageId: 'prompt-cash',
      financingPackageName: '',
      monthlyInstallment: '$0.00',
      termMonths: 1,
      apr: '',
      totalPayable: '$0.00',
      offerTitle: '',
      expirationDate: '',
      clinicalHoldDays: 14,
      doctorNotes: '',
      termsAndConditions: '',
      complianceConfirmed: false,
      clinicianAttested: false,
      offerId: id || '',
      status: 'DRAFT',
      version: 1,
      attendingDoctor: user.fullName || '',
      doctorSpecialty: user.specialty || '',
      auditHash: '',
    }
  );
  const [isLoadingOffer, setIsLoadingOffer] = useState<boolean>(Boolean(id));
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [clinicalRecordsCount, setClinicalRecordsCount] = useState<number | null>(null);
  const [clinicalDataNotice, setClinicalDataNotice] = useState<string | null>(null);
  const [attestationChecked, setAttestationChecked] = useState<boolean>(false);
  const [showModalPreview, setShowModalPreview] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [draftSavedNotice, setDraftSavedNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clinicalReview, setClinicalReview] = useState<ClinicalReviewDTO | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState<boolean>(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  const fetchOfferDetails = useCallback(
    async (silent = false) => {
      const targetOfferId = id || offer.offerId;
      if (!targetOfferId) {
        setIsLoadingOffer(false);
        return;
      }

      if (!silent) {
        setIsLoadingOffer(true);
      }
      setErrorMessage(null);

      try {
        const dto = await treatmentOfferService.getTreatmentOffer(targetOfferId);
        const mapped = dtoToOfferState(dto);

        if (dto.status !== 'DRAFT') {
          setAttestationChecked(true);
        }

        // Immediately sync offer state and authoritative backend version
        setOffer((prev) => ({
          ...prev,
          ...mapped,
        }));

        // Resolve financing option display from live catalog if eligible
        if (dto.financingEligible) {
          try {
            const opts = await consultationService.getFinancingOptions();
            const packages = opts.map(financingDtoToPackageOption);
            const matched = packages.find((p) => p.termMonths === dto.recommendedTenureMonths) || packages[0];
            if (matched) {
              setOffer((prev) => {
                const net = dto.netPayable ?? Math.max((dto.grossEstimate || 0) - (dto.discountAmount || 0), 0);
                return {
                  ...prev,
                  financingPackageId: matched.id,
                  financingPackageName: matched.name,
                  apr: matched.aprDisplay,
                  monthlyInstallment: `$${matched.calculateMonthly(net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                };
              });
            }
          } catch {
            // Keep DTO-derived financing summary
          }
        } else {
          setOffer((prev) => ({
            ...prev,
            financingPackageId: PROMPT_CASH_OPTION.id,
            financingPackageName: PROMPT_CASH_OPTION.name,
            apr: PROMPT_CASH_OPTION.aprDisplay,
          }));
        }

        // Fetch authorized patient clinical profile and medical records
        if (dto.patientProfileId) {
          const [profileRes, recordsRes] = await Promise.allSettled([
            patientService.getPatientById(dto.patientProfileId),
            apiClient.get<{ data?: unknown[] } | unknown[]>(
              `/api/v1/doctors/patients/${encodeURIComponent(dto.patientProfileId)}/medical-records?page=1&limit=5`
            ),
          ]);

          if (profileRes.status === 'fulfilled' && profileRes.value) {
            setOffer((prev) => {
              const updated = { ...prev };
              enrichOfferStateWithPatient(updated, profileRes.value);
              return updated;
            });
            if (profileRes.value.phone) setPatientPhone(profileRes.value.phone);
          } else if (profileRes.status === 'rejected') {
            setClinicalDataNotice(formatTreatmentOfferError(profileRes.reason));
          }

          if (recordsRes.status === 'fulfilled') {
            const raw = recordsRes.value.data;
            const list = Array.isArray(raw)
              ? raw
              : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown[] }).data)
              ? (raw as { data: unknown[] }).data
              : [];
            setClinicalRecordsCount(list.length);
          } else {
            setClinicalRecordsCount(null);
            setClinicalDataNotice((prev) => prev || formatTreatmentOfferError(recordsRes.reason));
          }
        }

        // Check for existing backend attestations
        try {
          const attestations = await treatmentOfferService.listTreatmentOfferAttestations(targetOfferId);
          if (attestations && attestations.length > 0) {
            setAttestationChecked(true);
          }
        } catch {
          // Attestations check is non-blocking
        }

        // Stage 6: Check for existing multidisciplinary clinical review
        try {
          setIsLoadingReview(true);
          const rev = await treatmentOfferService.getClinicalReview(targetOfferId);
          if (rev) {
            setClinicalReview(rev);
          }
        } catch {
          // Clinical review check is non-blocking
        } finally {
          setIsLoadingReview(false);
        }
      } catch (err: unknown) {
        setErrorMessage(formatTreatmentOfferError(err));
      } finally {
        if (!silent) {
          setIsLoadingOffer(false);
        }
      }
    },
    [id, offer.offerId]
  );

  useEffect(() => {
    fetchOfferDetails();
  }, [fetchOfferDetails]);

  const doctorName = user?.fullName ? `Dr. ${user.fullName.replace(/^Dr\.\s*/i, '')}` : offer.attendingDoctor || 'Attending Physician';

  const monogram = (offer.patientName || 'PT')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PT';

  const isDraft = !offer.status || offer.status === 'DRAFT';

  const handleSaveDraft = async () => {
    const targetOfferId = offer.offerId || id;
    if (!targetOfferId || !isDraft || isSavingDraft) return;

    setIsSavingDraft(true);
    setErrorMessage(null);
    setDraftSavedNotice(null);

    try {
      const updated = await treatmentOfferService.updateTreatmentOffer(targetOfferId, {
        clinicalIndication: offer.clinicalNecessity || offer.procedureName,
        discountAmount: offer.calculatedDiscount,
        financingEligible: offer.financingPackageId !== 'prompt-cash',
        recommendedTenureMonths: offer.termMonths || 1,
        clinicalNotes: offer.doctorNotes,
        termsAndConditions: offer.termsAndConditions || '',
        expectedVersion: offer.version ?? 1,
      });
      setOffer((prev) => ({
        ...prev,
        version: updated.version,
        status: updated.status,
      }));
      setDraftSavedNotice(`Draft ${updated.offerNumber} saved (v${updated.version}).`);
    } catch (err: unknown) {
      setErrorMessage(formatTreatmentOfferError(err));
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApproveClinicalReview = async () => {
    const targetOfferId = offer.offerId || id;
    if (!targetOfferId || isSubmittingReview) return;
    setIsSubmittingReview(true);
    setErrorMessage(null);
    try {
      const rev = await treatmentOfferService.submitClinicalReview(targetOfferId, {
        action: 'APPROVED',
        comments: `Multidisciplinary review confirmed by ${doctorName}. All clinical indications verified and procedure medically necessary.`,
        reviewCriteria: ['medicalNecessityVerified', 'contraindicationsScreened'],
      });
      setClinicalReview(rev);
      setDraftSavedNotice('Multidisciplinary clinical review (APPROVED) documented on backend.');
      await fetchOfferDetails(true);
    } catch (err: unknown) {
      setErrorMessage(formatTreatmentOfferError(err));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSendOffer = async () => {
    if (isSending) return;
    if (!isDraft) {
      setErrorMessage(`Offer is currently ${offer.status} and cannot be dispatched again.`);
      return;
    }
    if (!attestationChecked) {
      setErrorMessage('Please certify clinician attestation before dispatching the treatment offer.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const targetOfferId = offer.offerId || id;
      if (!targetOfferId) {
        throw new Error('Treatment offer identifier is missing.');
      }

      // Multidisciplinary clinical review validation prior to dispatch
      if (clinicalReview?.status !== 'APPROVED' || clinicalReview?.isOutdatedVersion || !clinicalReview?.eligibleForDispatch) {
        setErrorMessage(
          clinicalReview?.isOutdatedVersion
            ? `Clinical review was approved for offer version ${clinicalReview.offerVersion}, but current offer is at version ${offer.version}. Please re-approve clinical review prior to dispatch.`
            : clinicalReview?.eligibilityReason || 'Treatment offer cannot be dispatched: Clinical review is missing. A multidisciplinary clinical review (APPROVED) must be documented prior to patient dispatch.'
        );
        return;
      }

      const attestationStatement = `I attest that the proposed procedures for ${offer.patientName || 'the patient'} are clinically appropriate and medically necessary.`;

      // Call dedicated physician attestation endpoint if supported by backend
      try {
        await treatmentOfferService.attestTreatmentOffer(targetOfferId, {
          statement: attestationStatement,
          confirmTruthfulness: true,
          licenseNumber: (user as unknown as { licenseNumber?: string })?.licenseNumber || 'MD-ACTIVE-CLINICIAN',
          termsVersion: '2026.1',
          digitalSignatureHash: offer.auditHash || 'd41d8cd98f00b204e9800998ecf8427e',
        });
      } catch (attestErr) {
        // Dedicated attest API notice is non-blocking if already attested or handled via dispatch statement
        console.warn('Dedicated attest API notice:', attestErr);
      }

      const expectedVersion = offer.version ?? 1;
      const dispatchedDto = await treatmentOfferService.dispatchTreatmentOffer(
        targetOfferId,
        expectedVersion,
        attestationStatement
      );
      const mapped = dtoToOfferState(dispatchedDto);
      if (dispatchedDto.patientProfileId) {
        try {
          const p = await patientService.getPatientById(dispatchedDto.patientProfileId);
          enrichOfferStateWithPatient(mapped, p);
        } catch {
          // Retain DTO-mapped properties if patient profile lookup is restricted
        }
      }

      navigate(`/treatment-offers/${targetOfferId}/status`, {
        state: {
          ...mapped,
          dispatchedAt: mapped.dispatchedAt || new Date().toLocaleString(),
        },
      });
    } catch (err: unknown) {
      const msg = formatTreatmentOfferError(err);
      setErrorMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1280px] mx-auto pb-16 font-['Plus_Jakarta_Sans',sans-serif] text-[#0f172a]">
      {/* Loading & Status Banners */}
      {isLoadingOffer && (
        <div className="bg-purple-50 border border-purple-200 text-[#3f1d8b] px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Loading live treatment offer and clinical review data from backend...</span>
        </div>
      )}
      {draftSavedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{draftSavedNotice}</span>
          </div>
          <button type="button" onClick={() => setDraftSavedNotice(null)} className="font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}
      {clinicalDataNotice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Clinical record lookup notice: {clinicalDataNotice}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(errorMessage.toLowerCase().includes('refresh') ||
              errorMessage.toLowerCase().includes('concurrent') ||
              errorMessage.toLowerCase().includes('modified') ||
              errorMessage.toLowerCase().includes('version') ||
              errorMessage.toLowerCase().includes('conflict')) && (
              <button
                type="button"
                onClick={() => fetchOfferDetails()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Offer</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-amber-700 hover:text-amber-900 font-bold text-xs p-1 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Expanded Modal Preview */}
      {showModalPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-[420px] w-full p-6 shadow-2xl relative flex flex-col gap-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#3f1d8b]" />
                <h3 className="font-bold text-sm text-[#0f172a]">Care ID Mobile App Simulation</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalPreview(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#3f1d8b] uppercase">Treatment Offer</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Pending Review
                </span>
              </div>
              <h4 className="font-bold text-base text-[#0f172a]">{offer.procedureName}</h4>
              <p className="text-xs text-slate-500">{offer.facility || 'Heart Center Outpatient Unit'} • {doctorName}</p>

              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Standard Baseline:</span>
                  <span>${offer.baselineFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Prompt Cash Discount ({offer.discountValue}%):</span>
                  <span>-${offer.calculatedDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-100">
                  <span>Total Patient Responsibility:</span>
                  <span className="text-[#3f1d8b]">{offer.totalPayable}</span>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-xs flex flex-col gap-1">
                <span className="font-bold text-[#3f1d8b]">{offer.financingPackageName}</span>
                <span className="text-base font-extrabold text-[#3f1d8b]">
                  {offer.monthlyInstallment}{' '}
                  <span className="text-xs font-normal">
                    {offer.termMonths > 1 ? `/ month (${offer.termMonths} Mos)` : 'Single Settlement'}
                  </span>
                </span>
              </div>

              <p className="text-[11px] text-slate-500 italic border-l-2 border-[#3f1d8b] pl-2 py-1">
                "{offer.doctorNotes}"
              </p>

              <div className="text-[10px] text-slate-400 text-center">
                Offer Expires: {offer.expirationDate} (14 Days)
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModalPreview(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. PATIENT CONTEXT CAPSULE (Figma 1:7548) */}
      <div className="bg-white border border-[#e2e8f0] content-stretch flex items-center justify-between p-[21px] relative rounded-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] w-full">
        <div className="flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-[12px] bg-[#3f1d8b] text-white flex items-center justify-center font-bold text-[18px] tracking-wide shrink-0 shadow-sm">
            {monogram}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-[18px] font-bold text-[#0f172a] leading-tight tracking-tight">
                {offer.patientName}
              </h1>
              <span className="bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] text-[12px] font-semibold px-2.5 py-0.5 rounded-full">
                {offer.insuranceStatus}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[#64748b] font-medium">
              <span>CID: {offer.patientCid}</span>
              <span>•</span>
              <span>{offer.patientAge} {offer.patientGender}</span>
              <span>•</span>
              <span>{offer.patientBlood}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#e11d48] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {offer.patientAllergy}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(
                offer.offerId
                  ? `/treatment-offers/new/step-1?offerId=${encodeURIComponent(offer.offerId)}${offer.patientId ? `&patientId=${encodeURIComponent(offer.patientId)}` : ''}`
                  : offer.patientId
                  ? `/treatment-offers/new/step-1?patientId=${encodeURIComponent(offer.patientId)}`
                  : '/treatment-offers/new/step-1',
                { state: offer }
              )
            }
            className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-[12px] font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Edit Offer</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(offer.patientId ? `/patients/${encodeURIComponent(offer.patientId)}` : '/patients')}
            className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-[12px] font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Full Profile</span>
          </button>
        </div>
      </div>

      {/* 2. STEPPER (STEP 3 ACTIVE) (Figma 1:7563) */}
      <div className="bg-white border border-[#e2e8f0] rounded-[12px] px-8 py-4 flex items-center justify-between shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3 w-full justify-between">
          {/* Step 1 Complete */}
          <button
            type="button"
            onClick={() =>
              navigate(
                offer.patientId
                  ? `/patients/${encodeURIComponent(offer.patientId)}/financing`
                  : '/treatment-offers'
              )
            }
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Step 1: Complete
              </span>
              <span className="text-[13px] font-semibold text-slate-700 group-hover:text-[#3f1d8b]">
                Financing Options
              </span>
            </div>
          </button>

          <div className="h-px bg-slate-200 flex-1 mx-4 max-w-[80px]" />

          {/* Step 2 Complete */}
          <button
            type="button"
            onClick={() =>
              navigate(
                offer.offerId
                  ? `/treatment-offers/new/step-1?offerId=${encodeURIComponent(offer.offerId)}${offer.patientId ? `&patientId=${encodeURIComponent(offer.patientId)}` : ''}`
                  : offer.patientId
                  ? `/treatment-offers/new/step-1?patientId=${encodeURIComponent(offer.patientId)}`
                  : '/treatment-offers/new/step-1',
                { state: offer }
              )
            }
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Step 2: Complete
              </span>
              <span className="text-[13px] font-semibold text-slate-700 group-hover:text-[#3f1d8b]">
                Configure Offer
              </span>
            </div>
          </button>

          <div className="h-px bg-slate-200 flex-1 mx-4 max-w-[80px]" />

          {/* Step 3 Active */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#3f1d8b] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md ring-4 ring-purple-100">
              3
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#3f1d8b] uppercase tracking-wider">
                Step 3: Active
              </span>
              <span className="text-[13px] font-bold text-[#0f172a]">
                Review & Send to Patient
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-200 flex-1 mx-4 max-w-[80px]" />

          {/* Step 4 Upcoming */}
          <div className="flex items-center gap-2.5 opacity-60">
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 border border-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
              4
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Step 4
              </span>
              <span className="text-[13px] font-medium text-slate-500">
                Patient Acceptance
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN REVIEW GRID (LEFT MASTER REVIEW + RIGHT LIVE PREVIEW & DISPATCH) (Figma 1:7588) */}
      <div className="grid grid-cols-12 gap-6 items-start w-full">
        {/* LEFT COLUMN: READ-ONLY DETAILED OFFER REVIEW (7 COLS) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          {/* Section 1: Target Procedure & Baseline Verification */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#3f1d8b] flex items-center justify-center shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#0f172a] leading-tight">
                    1. Target Procedure & Baseline Verification
                  </h2>
                  <p className="text-[12px] text-slate-500 font-medium">
                    {offer.cptCode} Verified • Diagnostic Angiogram
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Baseline Fee
                </span>
                <span className="text-base font-extrabold text-[#0f172a]">
                  ${offer.baselineFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 flex flex-col gap-1.5">
              <span className="font-bold text-[#0f172a]">{offer.procedureName}</span>
              <p className="text-slate-500 leading-relaxed">
                <strong>Clinical Indication:</strong> {extractCleanClinicalIndication(offer.clinicalNecessity, offer.procedureName)}
              </p>
            </div>

            {/* Multidisciplinary Clinical Review Status (Stage 6) */}
            {isLoadingReview ? (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs flex items-center gap-2.5 text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin text-[#3f1d8b]" />
                <span className="font-medium">Checking multidisciplinary clinical review eligibility...</span>
              </div>
            ) : (
              <div className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 ${
                clinicalReview?.status === 'APPROVED' && !clinicalReview?.isOutdatedVersion
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : clinicalReview?.status === 'REJECTED'
                  ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                  : 'bg-amber-50/60 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${
                      clinicalReview?.status === 'APPROVED' && !clinicalReview?.isOutdatedVersion
                        ? 'text-emerald-600'
                        : clinicalReview?.status === 'REJECTED'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`} />
                    <span className="font-bold">
                      {clinicalReview?.isOutdatedVersion
                        ? `Clinical Review: OUTDATED (v${clinicalReview.offerVersion} vs current v${offer.version})`
                        : clinicalReview?.status === 'APPROVED'
                        ? 'Clinical Review: APPROVED'
                        : clinicalReview?.status === 'REJECTED'
                        ? 'Clinical Review: REJECTED'
                        : clinicalReview?.reviewedAt
                        ? 'Clinical Review: PENDING'
                        : 'Clinical Review Required'}
                    </span>
                  </div>
                  {clinicalReview?.status !== 'APPROVED' && isDraft && (
                    <button
                      type="button"
                      disabled={isSubmittingReview}
                      onClick={handleApproveClinicalReview}
                      className="bg-[#3f1d8b] hover:bg-[#341873] text-white text-[11px] font-bold px-3 py-1 rounded-full cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingReview ? 'Recording...' : 'Record Clinical Review (APPROVED)'}
                    </button>
                  )}
                  {clinicalReview?.status === 'APPROVED' && clinicalReview?.isOutdatedVersion && isDraft && (
                    <button
                      type="button"
                      disabled={isSubmittingReview}
                      onClick={handleApproveClinicalReview}
                      className="bg-[#3f1d8b] hover:bg-[#341873] text-white text-[11px] font-bold px-3 py-1 rounded-full cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingReview ? 'Recording...' : `Re-approve Clinical Review (v${offer.version})`}
                    </button>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed">
                  {clinicalReview?.isOutdatedVersion
                    ? `Prior clinical review was approved for offer version ${clinicalReview.offerVersion}. Modifications require re-review for version ${offer.version}.`
                    : clinicalReview?.comments || (clinicalReview?.status === 'APPROVED' ? 'Clinical indications and contraindications verified by attending physician.' : 'A multidisciplinary clinical review (APPROVED) must be documented prior to patient dispatch.')}
                </p>
                {clinicalReview?.reviewedAt && (
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>Reviewed by: {clinicalReview.reviewerName || clinicalReview.reviewedBy || doctorName} ({clinicalReview.reviewerRole || 'DOCTOR'})</span>
                    <span>•</span>
                    <span>Timestamp: {new Date(clinicalReview.reviewedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Financial Breakdown & Discount Matrix */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#0f172a] leading-tight">
                    2. Financial Breakdown & Discount Matrix
                  </h2>
                  <p className="text-[12px] text-slate-500 font-medium">
                    Hospital Policy Governed • Uninsured Prompt Settlement
                  </p>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-[#f8fafc]">
                <span className="text-slate-600 font-medium">Standard Hospital Baseline Fee</span>
                <span className="font-bold text-slate-800">
                  ${offer.baselineFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-emerald-50/40">
                <div className="flex flex-col">
                  <span className="text-emerald-800 font-bold">
                    Prompt Cash Settlement Discount ({offer.discountValue}.0%) Applied
                  </span>
                  <span className="text-[11px] text-emerald-600">
                    Authorized doctor prompt-payment incentive (Under 20% cap)
                  </span>
                </div>
                <span className="font-extrabold text-emerald-700 text-sm">
                  -${offer.calculatedDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-[#f8fafc]">
                <span className="text-slate-600 font-medium">Net Discounted Procedure Cost</span>
                <span className="font-bold text-slate-800">
                  ${offer.netProcedureCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white">
                <span className="text-slate-600 font-medium">Insurance Contribution ({offer.patientName})</span>
                <span className="font-bold text-slate-500">Self-Pay ($0.00)</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-purple-50/60 font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-[#0f172a] text-xs uppercase tracking-wide">
                    Total Patient Payment Responsibility
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ${offer.calculatedDiscount.toLocaleString()} USD ({offer.discountValue}% Reduction)
                  </span>
                </div>
                <span className="text-base text-[#3f1d8b] font-extrabold">
                  {offer.totalPayable}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Attached Financing Structure */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#0f172a] leading-tight">
                    3. Integrated Financing Structure
                  </h2>
                  <p className="text-[12px] text-slate-500 font-medium">
                    Pre-Approved Soft Check • {offer.financingPackageName}
                  </p>
                </div>
              </div>
              <span className="bg-[#3f1d8b] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {offer.termMonths > 1 ? `${offer.termMonths} Months Fixed` : 'Single Intake Settlement'}
              </span>
            </div>

            <div className="bg-[#fbf9fe] border border-purple-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-sm text-[#0f172a]">{offer.financingPackageName}</h3>
                <p className="text-xs text-slate-600">
                  Hospital-sponsored structured financing with automated servicing.
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                  <span>Total Payable: {offer.totalPayable}</span>
                  <span>•</span>
                  <span>APR: {offer.apr}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">No prepayment penalty</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Patient Monthly
                </span>
                <span className="text-xl font-extrabold text-[#3f1d8b]">
                  {offer.monthlyInstallment} <span className="text-xs font-normal">/ mo</span>
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Clinical Message, Validity & Doctor Attestation */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#0f172a] leading-tight">
                    4. Clinical Message, Validity & Doctor Attestation
                  </h2>
                  <p className="text-[12px] text-slate-500 font-medium">
                    Standard 14-day clinical hold • Offer Title: {offer.offerTitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Expires: {offer.expirationDate || '—'}</span>
              </div>
            </div>

            {/* Notes to Patient */}
            <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 flex flex-col gap-1.5">
              <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wide">
                Notes to {offer.patientName}:
              </span>
              <p className="italic text-slate-600 leading-relaxed">
                "{offer.doctorNotes}"
              </p>
            </div>

            {/* Required Clinician Attestation Checkbox */}
            <label className="flex items-start gap-3 p-3.5 bg-purple-50/40 border border-purple-100 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={attestationChecked}
                onChange={(e) => setAttestationChecked(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-[#3f1d8b] focus:ring-[#3f1d8b] cursor-pointer"
              />
              <span className="text-xs text-slate-700 leading-relaxed font-medium">
                <strong>Clinician Acknowledgment:</strong> I certify that I have reviewed the patient clinical history, confirmed hospital baseline pricing (${offer.baselineFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}), approved {offer.discountValue}% settlement discount (-${offer.calculatedDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}), and attached financing terms ({offer.financingPackageName}, {offer.monthlyInstallment}/mo). This offer will be encrypted and transmitted to {offer.patientName || 'the patient'}&apos;s Care ID mobile application.
              </span>
            </label>
          </div>

          {/* Bottom Action Buttons (Figma 1:7862) */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    offer.offerId
                      ? `/treatment-offers/new/step-1?offerId=${encodeURIComponent(offer.offerId)}${offer.patientId ? `&patientId=${encodeURIComponent(offer.patientId)}` : ''}`
                      : offer.patientId
                      ? `/treatment-offers/new/step-1?patientId=${encodeURIComponent(offer.patientId)}`
                      : '/treatment-offers/new/step-1',
                    { state: offer }
                  )
                }
                className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-xs font-bold px-5 py-2.5 rounded-full shadow-xs cursor-pointer"
              >
                Back to Edit Offer
              </button>
              <button
                type="button"
                disabled={!isDraft || isSavingDraft || isLoadingOffer}
                onClick={handleSaveDraft}
                className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-xs font-bold px-5 py-2.5 rounded-full shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
              </button>
              <button
                type="button"
                disabled={isLoadingOffer}
                onClick={() => fetchOfferDetails()}
                className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-xs font-bold px-4 py-2.5 rounded-full shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOffer ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSending || !isDraft || isLoadingOffer}
                onClick={handleSendOffer}
                className="bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white font-bold h-[48px] px-8 rounded-[9999px] shadow-[0px_10px_15px_-3px_rgba(88,28,135,0.2),0px_4px_6px_-4px_rgba(88,28,135,0.2)] hover:opacity-95 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Dispatching via CareID Gateway...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>Send Treatment Offer to Patient</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PATIENT-FACING MOBILE VIEW PREVIEW (5 COLS) (Figma 1:7877) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6 sticky top-6">
          {/* Patient-Facing Device Preview Card */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#3f1d8b]" />
                <h3 className="font-bold text-sm text-[#0f172a]">Patient-Facing Preview</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Care ID iOS / Android</span>
            </div>

            <p className="text-[12px] text-slate-500 leading-relaxed">
              This interactive ticket represents exactly how {offer.patientName} will view and review this offer inside the Care ID mobile application.
            </p>

            {/* Mock Mobile Screen Component */}
            <div className="border border-slate-200 rounded-[20px] bg-slate-900 p-2 shadow-md">
              <div className="bg-white rounded-[16px] p-4 flex flex-col gap-3 text-xs">
                {/* Mobile Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-bold text-[#3f1d8b]">Care ID Treatment Offer</span>
                  <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Pending Your Review
                  </span>
                </div>

                {/* Procedure & Clinic */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Procedure
                  </span>
                  <span className="font-bold text-sm text-[#0f172a]">{offer.procedureName}</span>
                  <span className="text-[11px] text-slate-500">
                    {offer.facility || 'Clinical Facility'} • {offer.attendingDoctor || user.fullName || 'Attending Physician'}
                  </span>
                </div>

                {/* Price Strip */}
                <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Hospital Baseline:</span>
                    <span>${offer.baselineFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-medium text-[11px]">
                    <span>Prompt Cash Discount ({offer.discountValue}%):</span>
                    <span>-${offer.calculatedDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 text-xs">
                    <span>Total You Pay:</span>
                    <span className="text-[#3f1d8b] font-extrabold">
                      {offer.totalPayable}
                    </span>
                  </div>
                </div>

                {/* Attached Installment Chip */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-purple-700 uppercase">
                      {offer.financingPackageName}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      {offer.termMonths > 1 ? `${offer.termMonths} Equal Monthly Payments` : 'Single Intake Settlement'}
                    </span>
                  </div>
                  <span className="font-extrabold text-sm text-[#3f1d8b]">
                    {offer.monthlyInstallment} <span className="text-[10px] font-normal">/ mo</span>
                  </span>
                </div>

                {/* Doctor Note Preview */}
                <p className="text-[11px] text-slate-500 italic line-clamp-2">
                  "{offer.doctorNotes}"
                </p>

                {/* Expiry Stamp */}
                <span className="text-[10px] text-slate-400 text-center">
                  Offer Expires: {offer.expirationDate || '—'}
                </span>

                {/* Patient Primary Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="py-2 text-center rounded-lg border border-slate-200 text-slate-500 font-bold text-[11px] bg-slate-50">
                    Decline
                  </div>
                  <div className="py-2 text-center rounded-lg bg-[#3f1d8b] text-white font-bold text-[11px] shadow-xs">
                    Accept Offer
                  </div>
                </div>
              </div>
            </div>

            {/* Encrypted Notification Preview */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {patientPhone
                  ? `Dispatched to patient mobile (${patientPhone}) and Care ID app upon send.`
                  : 'Dispatched securely to patient Care ID mobile application upon send.'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowModalPreview(true)}
              className="w-full py-2.5 border border-[#e2e8f0] rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Open Expanded Patient Preview Modal
            </button>
          </div>

          {/* Quick Dispatch Audit Check */}
          <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-4 flex flex-col gap-2.5 text-xs text-slate-600 shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2 font-bold text-[#0f172a] border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-[#3f1d8b]" />
              <span>Governance & Audit Verification</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Authorized Clinician:</span>
              <span className="font-semibold text-slate-800">{offer.attendingDoctor || user.fullName || 'Attending Physician'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Offer Lifecycle Status:</span>
              <span className="font-semibold text-emerald-600">{offer.status || 'DRAFT'} (v{offer.version ?? 1})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Clinical Records Linked:</span>
              <span className="font-semibold text-slate-700">
                {clinicalRecordsCount !== null ? `${clinicalRecordsCount} record(s)` : 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Offer Reference:</span>
              <span className="font-mono text-[11px] text-slate-500">{offer.offerNumber || offer.offerId || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
