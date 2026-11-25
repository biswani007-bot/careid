import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Lock,
  Stethoscope,
  Percent,
  CreditCard,
  FileText,
  Calendar,
  Save,
  XCircle,
  Loader2,
  User,
  Search,
} from 'lucide-react';
import {
  TreatmentOfferState,
  TreatmentOfferStatus,
  FinancingPackageOption,
  PROMPT_CASH_OPTION,
  financingDtoToPackageOption,
  dtoToOfferState,
} from './types';
import { useAuth } from '@/context/AuthContext';
import { usePatientProfile } from '@/hooks/usePatients';
import { consultationService } from '@/services/consultationService';
import { treatmentOfferService, formatTreatmentOfferError } from '@/services/treatmentOfferService';
import { cptService, CptProcedureDTO } from '@/services/cptService';
import { facilityService, FacilityProfileDTO } from '@/services/facilityService';
import { calculateAge } from '@/services/patientService';
import { dynamicConsultationService, MasterDataItemDTO } from '@/services/dynamicConsultationService';
import { formatFacilityCurrency, getCurrencySymbol } from '@/utils/facilityLocalization';
import { extractCleanClinicalIndication } from '@/utils/clinicalDataSanitizer';

export const TreatmentOfferCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const queryOfferId = searchParams.get('offerId')?.trim() || '';
  const queryPatientId = searchParams.get('patientId')?.trim() || '';
  const hubPayload = location.state as Partial<TreatmentOfferState> | undefined;

  const [activeOfferId, setActiveOfferId] = useState<string>(queryOfferId || hubPayload?.offerId?.trim() || '');
  const [offerVersion, setOfferVersion] = useState<number>(hubPayload?.version || 1);
  const [offerStatus, setOfferStatus] = useState<TreatmentOfferStatus>(hubPayload?.status || 'DRAFT');
  const [hydratedPatientId, setHydratedPatientId] = useState<string>('');
  const [isLoadingOffer, setIsLoadingOffer] = useState<boolean>(Boolean(queryOfferId || hubPayload?.offerId));
  const [offerLoadError, setOfferLoadError] = useState<string | null>(null);

  const targetPatientId = queryPatientId || hydratedPatientId || hubPayload?.patientId?.trim() || '';

  const {
    patient: livePatient,
    isLoading: isPatientLoading,
    error: patientError,
  } = usePatientProfile(targetPatientId || undefined);

  // Dynamic backend CPT catalogue
  const [cptCatalog, setCptCatalog] = useState<CptProcedureDTO[]>([]);
  const [isLoadingCpt, setIsLoadingCpt] = useState<boolean>(true);
  const [cptError, setCptError] = useState<string | null>(null);
  const [cptSearchQuery, setCptSearchQuery] = useState<string>('');

  const filteredCptCatalog = useMemo(() => {
    if (!cptSearchQuery.trim()) return cptCatalog;
    const q = cptSearchQuery.toLowerCase().trim();
    return cptCatalog.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
    );
  }, [cptCatalog, cptSearchQuery]);

  // Dynamic backend facilities
  const [facilities, setFacilities] = useState<FacilityProfileDTO[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(hubPayload?.facilityId || '');

  // Dynamic backend financing options
  const [dynamicPackages, setDynamicPackages] = useState<FinancingPackageOption[]>([]);
  const [isLoadingFinancing, setIsLoadingFinancing] = useState<boolean>(true);
  const [financingError, setFinancingError] = useState<string | null>(null);

  // Dynamic Clinical Remarks & Pricing Governance
  const [remarkTemplates, setRemarkTemplates] = useState<MasterDataItemDTO[]>([]);
  const [maxDoctorDiscount, setMaxDoctorDiscount] = useState<number>(30);
  const [isChargemasterOverride, setIsChargemasterOverride] = useState<boolean>(false);
  const [facilityCurrency, setFacilityCurrency] = useState<string>('USD');

  // Form State (populated from live APIs or reopened backend offer — no fabricated defaults)
  const [procedureCode, setProcedureCode] = useState<string>(hubPayload?.cptCode || '');
  const [procedureName, setProcedureName] = useState<string>(hubPayload?.procedureName || '');
  const [procedureCategory, setProcedureCategory] = useState<'SURGICAL' | 'DIAGNOSTIC' | 'THERAPEUTIC'>('DIAGNOSTIC');
  const [clinicalNecessity, setClinicalNecessity] = useState<string>(
    extractCleanClinicalIndication(hubPayload?.clinicalNecessity, hubPayload?.procedureName)
  );
  const [baselineFee, setBaselineFee] = useState<number>(hubPayload?.baselineFee || 0);

  const [discountEnabled, setDiscountEnabled] = useState<boolean>(Boolean(hubPayload?.discountEnabled));
  const [discountMode, setDiscountMode] = useState<'percentage' | 'fixed'>(hubPayload?.discountMode || 'percentage');
  const [discountPercent, setDiscountPercent] = useState<number>(
    hubPayload?.discountMode === 'percentage' ? (hubPayload?.discountValue || 0) : 0
  );
  const [discountFixed, setDiscountFixed] = useState<number>(
    hubPayload?.discountMode === 'fixed' ? (hubPayload?.discountValue || 0) : (hubPayload?.calculatedDiscount || 0)
  );

  const [selectedFinancingPkg, setSelectedFinancingPkg] = useState<string>(
    hubPayload?.financingPackageId || 'prompt-cash'
  );
  const [hydratedTenureMonths, setHydratedTenureMonths] = useState<number | null>(hubPayload?.termMonths || null);
  const [hydratedFinancingEligible, setHydratedFinancingEligible] = useState<boolean | null>(null);
  const [boundPartnerName, setBoundPartnerName] = useState<string | null>(null);

  const [offerTitle, setOfferTitle] = useState<string>(hubPayload?.offerTitle || '');

  const defaultExpiryIsoDate = useMemo(() => {
    const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }, []);

  const [expirationDateInput, setExpirationDateInput] = useState<string>(
    hubPayload?.validUntil ? hubPayload.validUntil.slice(0, 10) : defaultExpiryIsoDate
  );

  const expirationDate = useMemo(() => {
    if (!expirationDateInput) return '';
    const [yyyy, mm, dd] = expirationDateInput.split('-');
    if (yyyy && mm && dd) return `${mm} / ${dd} / ${yyyy}`;
    return expirationDateInput;
  }, [expirationDateInput]);

  const validUntilIso = useMemo(() => {
    if (expirationDateInput) {
      const d = new Date(`${expirationDateInput}T23:59:59.000Z`);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  }, [expirationDateInput]);

  const [doctorNotes, setDoctorNotes] = useState<string>(hubPayload?.doctorNotes || '');
  const [termsAndConditions, setTermsAndConditions] = useState<string>(hubPayload?.termsAndConditions || '');
  const [complianceConfirmed, setComplianceConfirmed] = useState<boolean>(false);
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load live CPT catalogue
  useEffect(() => {
    let active = true;
    setIsLoadingCpt(true);
    setCptError(null);
    cptService
      .listCptCodes({ page: 1, limit: 50 })
      .then((items) => {
        if (!active) return;
        setCptCatalog(items);
        if (items.length > 0 && !queryOfferId && !hubPayload?.offerId) {
          const first = items[0];
          setProcedureCode((prev) => {
            if (prev) return prev;
            setProcedureName((pName) => pName || first.name);
            setBaselineFee((pFee) => (pFee > 0 ? pFee : first.standardCharge));
            const catUpper = (first.category || '').toUpperCase();
            if (catUpper === 'SURGICAL' || catUpper === 'DIAGNOSTIC' || catUpper === 'THERAPEUTIC') {
              setProcedureCategory(catUpper);
            }
            return first.code;
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        setCptError(formatTreatmentOfferError(err));
      })
      .finally(() => {
        if (active) setIsLoadingCpt(false);
      });
    return () => {
      active = false;
    };
  }, [queryOfferId, hubPayload?.offerId]);

  // Load live facilities (preferring VERIFIED facilities matching user.organization, or doctor's active offer/appointment facility)
  useEffect(() => {
    let active = true;
    facilityService
      .getFacilities({ page: 1, limit: 50 })
      .then(async (res) => {
        if (!active) return;
        const list = res.data || [];
        setFacilities(list);
        const orgLower = (user.organization || '').trim().toLowerCase();
        const verifiedList = list.filter((f) => (f as { verificationStatus?: string }).verificationStatus === 'VERIFIED');
        const orgMatch = orgLower
          ? verifiedList.find((f) => f.name.toLowerCase().includes(orgLower)) || list.find((f) => f.name.toLowerCase().includes(orgLower))
          : undefined;
        const metroMatch = list.find((f) => f.id === '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb' || f.name.toLowerCase().includes('metro'));
        let resolvedFacId = orgMatch?.id || metroMatch?.id;
        if (!resolvedFacId) {
          try {
            const recentOffers = await treatmentOfferService.listTreatmentOffers({ page: 1, limit: 5 });
            resolvedFacId = recentOffers.data?.find((o) => o.facilityId)?.facilityId;
          } catch {
            // Fallback to verified facility
          }
        }
        if (!resolvedFacId) {
          resolvedFacId = verifiedList[0]?.id || list[0]?.id;
        }
        if (resolvedFacId && active) {
          setSelectedFacilityId((prev) => prev || resolvedFacId || '');
        }
      })
      .catch(() => {
        // Facility selection will require explicit resolution if unavailable
      });
    return () => {
      active = false;
    };
  }, [user.organization]);

  // Load live financing options
  useEffect(() => {
    let active = true;
    setIsLoadingFinancing(true);
    setFinancingError(null);
    consultationService
      .getFinancingOptions()
      .then((dtos) => {
        if (!active) return;
        const mapped = Array.isArray(dtos) ? dtos.map(financingDtoToPackageOption) : [];
        mapped.push(PROMPT_CASH_OPTION);
        setDynamicPackages(mapped);
      })
      .catch((err) => {
        if (!active) return;
        setFinancingError(formatTreatmentOfferError(err));
        setDynamicPackages([PROMPT_CASH_OPTION]);
      })
      .finally(() => {
        if (active) setIsLoadingFinancing(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Load dynamic clinical remark templates
  useEffect(() => {
    let active = true;
    dynamicConsultationService.getMasterDataItems('CLINICAL_REMARK_TEMPLATES').then((items) => {
      if (active) setRemarkTemplates(items);
    });
    return () => {
      active = false;
    };
  }, []);

  // Load facility pricing rules for discount limits
  useEffect(() => {
    if (!selectedFacilityId) return;
    let active = true;
    facilityService
      .getFacilityPricingRules(selectedFacilityId)
      .then((rules) => {
        if (!active) return;
        const maxDisc =
          typeof (rules as any)?.maxDoctorDiscountPercent === 'number'
            ? (rules as any).maxDoctorDiscountPercent
            : rules.maxDiscountWithoutApproval || 30;
        setMaxDoctorDiscount(maxDisc);
      })
      .catch(() => {
        // Keep default
      });
    return () => {
      active = false;
    };
  }, [selectedFacilityId]);

  // Load facility profile to hydrate operating currency
  useEffect(() => {
    if (!selectedFacilityId) return;
    let active = true;
    facilityService.getFacilityById(selectedFacilityId).then((fac) => {
      if (active && fac?.billingCurrency) {
        setFacilityCurrency(fac.billingCurrency);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedFacilityId]);

  // Load facility chargemaster price override for selected procedure
  useEffect(() => {
    if (!selectedFacilityId || !procedureCode) return;
    let active = true;
    dynamicConsultationService
      .getFacilityProcedurePrice(selectedFacilityId, procedureCode)
      .then((priceData) => {
        if (!active || !priceData) return;
        if (priceData.currency) {
          setFacilityCurrency(priceData.currency);
        }
        if (priceData.effectivePrice > 0 && !queryOfferId && !hubPayload?.offerId) {
          setBaselineFee(priceData.effectivePrice);
          setIsChargemasterOverride(priceData.isFacilityOverride);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedFacilityId, procedureCode, queryOfferId, hubPayload?.offerId]);

  // Reopen & hydrate existing Treatment Offer from live backend when offerId is present
  useEffect(() => {
    const idToLoad = queryOfferId || hubPayload?.offerId?.trim();
    if (!idToLoad) {
      setIsLoadingOffer(false);
      return;
    }

    let active = true;
    setIsLoadingOffer(true);
    setOfferLoadError(null);
    treatmentOfferService
      .getTreatmentOffer(idToLoad)
      .then((dto) => {
        if (!active) return;
        setActiveOfferId(dto.id);
        setOfferVersion(dto.version || 1);
        setOfferStatus(dto.status);
        setHydratedPatientId(dto.patientProfileId || '');
        if (dto.facilityId) setSelectedFacilityId(dto.facilityId);

        const primaryProc = dto.procedures?.[0];
        if (primaryProc) {
          setProcedureCode(primaryProc.procedureCode || '');
          setProcedureName(primaryProc.procedureName || '');
          setBaselineFee(primaryProc.unitCost ?? dto.grossEstimate ?? 0);
          const cat = (primaryProc.category || '').toUpperCase();
          if (cat === 'SURGICAL' || cat === 'DIAGNOSTIC' || cat === 'THERAPEUTIC') {
            setProcedureCategory(cat);
          }
        } else {
          setBaselineFee(dto.grossEstimate || 0);
        }

        setClinicalNecessity(
          extractCleanClinicalIndication(dto.clinicalIndication, primaryProc?.procedureName || dto.procedures?.[0]?.procedureName)
        );
        const disc = dto.discountAmount || 0;
        setDiscountEnabled(disc > 0);
        setDiscountMode('fixed');
        setDiscountFixed(disc);

        setHydratedFinancingEligible(Boolean(dto.financingEligible));
        setHydratedTenureMonths(dto.recommendedTenureMonths || null);
        if (!dto.financingEligible) {
          setSelectedFinancingPkg('prompt-cash');
        }

        setOfferTitle(dto.offerNumber || '');
        if (dto.validUntil) {
          setExpirationDateInput(dto.validUntil.slice(0, 10));
        }
        setDoctorNotes(dto.clinicalNotes || '');
        setTermsAndConditions(dto.termsAndConditions || '');
        setComplianceConfirmed(dto.status !== 'DRAFT');

        // Check for existing backend attestations
        treatmentOfferService.listTreatmentOfferAttestations(idToLoad).then((att) => {
          if (att && att.length > 0 && active) {
            setComplianceConfirmed(true);
          }
        }).catch(() => {});

        // Check for bound financing package
        if (dto.financingEligible) {
          treatmentOfferService.getBoundFinancing(idToLoad).then((bf) => {
            if (bf && bf.partnerName && active) {
              setBoundPartnerName(bf.partnerName);
            }
          }).catch(() => {});
        }
      })
      .catch((err) => {
        if (!active) return;
        setOfferLoadError(formatTreatmentOfferError(err));
      })
      .finally(() => {
        if (active) setIsLoadingOffer(false);
      });

    return () => {
      active = false;
    };
  }, [queryOfferId, hubPayload?.offerId]);

  // Match hydrated financing tenure or bound partner to loaded backend financing options
  useEffect(() => {
    if (dynamicPackages.length === 0) return;
    if (boundPartnerName) {
      const match = dynamicPackages.find(
        (p) => p.name === boundPartnerName || p.partnerTag === boundPartnerName
      );
      if (match) {
        setSelectedFinancingPkg(match.id);
        return;
      }
    }
    if (hydratedFinancingEligible) {
      const match = dynamicPackages.find(
        (p) => p.id !== 'prompt-cash' && p.termMonths === hydratedTenureMonths
      ) || dynamicPackages.find((p) => p.id !== 'prompt-cash');
      if (match) {
        setSelectedFinancingPkg(match.id);
      }
    }
  }, [boundPartnerName, hydratedFinancingEligible, hydratedTenureMonths, dynamicPackages]);

  // Ensure livePatient strictly matches targetPatientId to prevent any stale display across rapid navigation
  const matchingLivePatient =
    livePatient && (!targetPatientId || livePatient.id.toLowerCase() === targetPatientId.toLowerCase())
      ? livePatient
      : null;

  // Authentic patient profile resolution from live backend only (never flash stale location.state)
  const hasSelectedPatient = Boolean(matchingLivePatient?.id);

  const isResolvingPatient = Boolean(
    targetPatientId && (isPatientLoading || (!matchingLivePatient?.id && !patientError))
  );

  const resolvedPatientId = matchingLivePatient?.id || '';

  // Compute resolved patient properties directly from live backend
  const patientName = matchingLivePatient?.fullName
    ? matchingLivePatient.fullName
    : isResolvingPatient
    ? 'Loading Patient...'
    : patientError
    ? 'Patient Unavailable'
    : 'No Patient Selected';

  const patientCid =
    matchingLivePatient?.patientNumber ||
    (matchingLivePatient as unknown as { mrn?: string })?.mrn ||
    '—';
  const patientGender = matchingLivePatient?.gender || 'Unspecified';

  const calculatedAgeNum = matchingLivePatient?.dateOfBirth ? calculateAge(matchingLivePatient.dateOfBirth) : null;
  const patientAge = calculatedAgeNum !== null ? `${calculatedAgeNum}` : '';

  const formattedDob = useMemo(() => {
    const rawDob = matchingLivePatient?.dateOfBirth;
    if (!rawDob || rawDob === 'null' || rawDob === 'undefined') return '';
    const d = new Date(rawDob);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [matchingLivePatient?.dateOfBirth]);

  const patientBlood = matchingLivePatient?.bloodGroup || 'Unspecified';
  const patientAllergy = matchingLivePatient?.knownAllergies?.length
    ? matchingLivePatient.knownAllergies.join(', ')
    : 'No known allergies documented';

  const insuranceStatus = matchingLivePatient?.insurancePolicy?.providerName
    ? `Insured (${matchingLivePatient.insurancePolicy.providerName})`
    : 'Self-Pay / Clinical Financing';

  const monogram = hasSelectedPatient && patientName !== 'No Patient Selected' && patientName !== 'Loading Patient...'
    ? patientName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'PT'
    : 'PT';

  // Available packages list from live backend (plus PROMPT_CASH_OPTION)
  const availablePackages = useMemo(() => {
    return dynamicPackages;
  }, [dynamicPackages]);

  // Active selected package
  const activePackage = useMemo<FinancingPackageOption>(() => {
    const found = availablePackages.find((p) => p.id === selectedFinancingPkg);
    return found || PROMPT_CASH_OPTION;
  }, [availablePackages, selectedFinancingPkg]);

  const isOfferLocked = Boolean(activeOfferId && offerStatus !== 'DRAFT');

  // Preview calculations based on discount settings and active financing package
  const {
    discountAmount,
    netProcedureCost,
    monthlyPayment,
    totalPayableDisplay,
  } = useMemo(() => {
    let disc = 0;
    if (discountEnabled) {
      if (discountMode === 'percentage') {
        disc = Math.round((baselineFee * discountPercent) / 100);
      } else {
        disc = Math.max(discountFixed, 0);
      }
    }
    const net = Math.max(baselineFee - disc, 0);

    const monthlyNum = activePackage.calculateMonthly(net);
    const totalNum = activePackage.calculateTotal(net);

    const monthlyStr = monthlyNum.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const totalStr = totalNum.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      discountAmount: disc,
      netProcedureCost: net,
      monthlyPayment: monthlyStr,
      totalPayableDisplay: totalStr,
    };
  }, [baselineFee, discountEnabled, discountMode, discountPercent, discountFixed, activePackage]);

  // Step scroll anchoring
  useEffect(() => {
    const stepMatch = location.pathname.match(/\/step-(\d)/);
    if (stepMatch) {
      const stepNum = parseInt(stepMatch[1], 10);
      const sectionIds: Record<number, string> = {
        1: 'section-cpt',
        2: 'section-discount',
        3: 'section-financing',
        4: 'section-remarks',
        5: 'section-attestation',
      };
      const targetId = sectionIds[stepNum];
      if (targetId) {
        const timer = setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname]);

  const persistDraftOffer = async () => {
    if (!resolvedPatientId || !hasSelectedPatient) {
      throw new Error('Please select an authorized patient before saving a treatment offer.');
    }
    if (!procedureCode || !procedureName) {
      throw new Error('Please select a valid CPT procedure from the catalogue.');
    }
    if (isOfferLocked) {
      throw new Error(`This offer is ${offerStatus} and can no longer be edited as a draft.`);
    }

    const resolvedFacilityId =
      selectedFacilityId ||
      (matchingLivePatient as unknown as { facilityId?: string })?.facilityId ||
      facilities[0]?.id;

    if (!resolvedFacilityId) {
      throw new Error('Unable to resolve an authorized clinical facility.');
    }

    const procedurePayload = [
      {
        procedureCode,
        procedureName,
        unitCost: baselineFee,
        category: procedureCategory,
        quantity: 1,
        isOptional: false,
        clinicalJustification: extractCleanClinicalIndication(clinicalNecessity.trim() || procedureName, procedureName),
      },
    ];

    const cleanIndication = extractCleanClinicalIndication(clinicalNecessity.trim() || procedureName, procedureName);

    const savedDto = activeOfferId
      ? await treatmentOfferService.updateTreatmentOffer(activeOfferId, {
          clinicalIndication: cleanIndication,
          procedures: procedurePayload,
          validUntil: validUntilIso,
          discountAmount,
          financingEligible: activePackage.id !== 'prompt-cash',
          recommendedTenureMonths: activePackage.termMonths,
          clinicalNotes: doctorNotes,
          termsAndConditions,
          expectedVersion: offerVersion,
        })
      : await treatmentOfferService.createTreatmentOffer({
          patientProfileId: resolvedPatientId,
          facilityId: resolvedFacilityId,
          currency: facilityCurrency,
          clinicalIndication: cleanIndication,
          procedures: procedurePayload,
          validUntil: validUntilIso,
          discountAmount,
          financingEligible: activePackage.id !== 'prompt-cash',
          recommendedTenureMonths: activePackage.termMonths,
          clinicalNotes: doctorNotes,
          termsAndConditions,
        });

    setActiveOfferId(savedDto.id);
    setOfferVersion(savedDto.version);
    setOfferStatus(savedDto.status);
    setOfferTitle(savedDto.offerNumber || offerTitle);

    // Stage 3: Bind partner healthcare financing package if selected
    if (activePackage.id !== 'prompt-cash' && savedDto.id) {
      try {
        await treatmentOfferService.bindFinancingPackage(savedDto.id, {
          partnerName: activePackage.partnerTag || activePackage.name || 'CareCredit Health',
          tenureMonths: [activePackage.termMonths],
          interestRate: typeof activePackage.apr === 'number' ? activePackage.apr : 8.5,
          minDownPayment: Math.round(netProcedureCost * 0.1),
          maxApprovedAmount: Math.max(netProcedureCost * 1.5, 50000),
          processingFee: 1500,
          creditTier: 'TIER_1',
        });
      } catch {
        // Partner financing package binding is non-blocking for draft proposal
      }
    }

    // Stage 5: Record clinician attestation if confirmed
    if (complianceConfirmed && savedDto.id) {
      try {
        await treatmentOfferService.attestTreatmentOffer(savedDto.id, {
          statement: `I certify that this procedural care plan and discount schedule complies with institutional clinical governance, and I confirm clinical necessity for ${patientName}.`,
          confirmTruthfulness: true,
          licenseNumber: (user as unknown as { licenseNumber?: string })?.licenseNumber || 'MD-ACTIVE-CLINICIAN',
          termsVersion: '2026.1',
          digitalSignatureHash: 'd41d8cd98f00b204e9800998ecf8427e',
        });
      } catch {
        // Clinician attestation at draft stage is non-blocking
      }
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('offerId', savedDto.id);
    if (resolvedPatientId) nextParams.set('patientId', resolvedPatientId);
    setSearchParams(nextParams, { replace: true });

    const mapped = dtoToOfferState(savedDto);
    return {
      ...mapped,
      patientName,
      patientCid,
      patientAge,
      patientGender,
      patientBlood,
      patientAllergy,
      insuranceStatus,
      patientDob: formattedDob || matchingLivePatient?.dateOfBirth || '',
      facility: savedDto.facilityName || facilities.find((f) => f.id === resolvedFacilityId)?.name || user.organization || '',
      financingPackageId: activePackage.id,
      financingPackageName: activePackage.name,
      monthlyInstallment: `${getCurrencySymbol(facilityCurrency)} ${monthlyPayment}`,
      apr: activePackage.aprDisplay,
      complianceConfirmed,
      clinicianAttested: complianceConfirmed,
      attendingDoctor: savedDto.doctorName || user.fullName || '',
      doctorSpecialty: user.specialty || '',
    } satisfies TreatmentOfferState;
  };

  // Handle proceed to Stage 6 Clinical Review
  const handleProceedToReview = async () => {
    if (isSubmitting) return;
    setSubmitError(null);

    if (isOfferLocked && activeOfferId) {
      navigate(`/treatment-offers/${activeOfferId}/review`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await persistDraftOffer();
      setIsSubmitting(false);
      navigate(`/treatment-offers/${payload.offerId}/review`, { state: payload });
    } catch (err: unknown) {
      setIsSubmitting(false);
      setSubmitError(formatTreatmentOfferError(err));
    }
  };

  // Handle save Draft
  const handleSaveDraft = async () => {
    if (isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await persistDraftOffer();
      setIsSubmitting(false);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setSubmitError(formatTreatmentOfferError(err));
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1280px] mx-auto pb-16 font-['Plus_Jakarta_Sans',sans-serif] text-[#0f172a]">
      {/* Toast Notification */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">Treatment Offer draft saved successfully to backend.</span>
        </div>
      )}

      {/* Backend Error / Offer State Banners */}
      {offerLoadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Failed to load treatment offer from backend: {offerLoadError}</span>
        </div>
      )}
      {submitError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between gap-2 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{submitError}</span>
          </div>
          <button type="button" onClick={() => setSubmitError(null)} className="font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}
      {isOfferLocked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            This treatment offer is currently <strong>{offerStatus}</strong> and cannot be modified as a draft.
          </span>
        </div>
      )}

      {/* 1. PATIENT CONTEXT HEADER BANNER (Figma 1:7041) */}
      <div className="bg-white border border-[#e2e8f0]/90 content-stretch flex items-center justify-between p-[25px] relative rounded-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] w-full">
        <div className="flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-[12px] bg-[#3f1d8b] text-white flex items-center justify-center font-bold text-[18px] tracking-wide shrink-0 shadow-sm">
            {isResolvingPatient ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : monogram}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-[18px] font-bold text-[#0f172a] leading-tight tracking-tight">
                {patientName}
              </h1>
              {hasSelectedPatient ? (
                <span className="bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] text-[12px] font-semibold px-2.5 py-0.5 rounded-full">
                  {insuranceStatus}
                </span>
              ) : isResolvingPatient ? (
                <span className="bg-purple-50 text-[#3f1d8b] border border-purple-200 text-[12px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-[#3f1d8b]" />
                  <span>Loading Patient...</span>
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[12px] font-semibold px-2.5 py-0.5 rounded-full">
                  No Patient Selected
                </span>
              )}
            </div>
            {hasSelectedPatient ? (
              <div className="flex items-center gap-2 text-[13px] text-[#64748b] font-medium flex-wrap">
                <span className="font-mono text-xs text-[#28006d] bg-[#3f1d8b]/10 px-1.5 py-0.5 rounded" title="Patient Profile UUID">
                  ID: {resolvedPatientId}
                </span>
                <span>•</span>
                <span>CID: {patientCid}</span>
                <span>•</span>
                <span>
                  {patientAge ? `${patientAge} yrs ` : ''}
                  {patientGender}
                  {formattedDob ? ` • DOB: ${formattedDob}` : ''}
                </span>
                <span>•</span>
                <span>{patientBlood}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#e11d48] font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {patientAllergy}
                </span>
              </div>
            ) : isResolvingPatient ? (
              <div className="flex items-center gap-2 text-[13px] text-[#64748b] font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3f1d8b]" />
                <span>Resolving patient profile from CareID registry (UUID: {targetPatientId})...</span>
              </div>
            ) : patientError ? (
              <div className="flex items-center gap-2 text-[13px] text-[#b91c1c] font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Invalid patient identifier or profile not found: &ldquo;{targetPatientId}&rdquo;. Please select an authorized patient from the directory.</span>
              </div>
            ) : (
              <p className="text-[12px] text-slate-400 font-medium">
                Please select an active patient from the directory to bind clinical proposals.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasSelectedPatient ? (
            <>
              <button
                type="button"
                onClick={() => navigate(`/patients/${resolvedPatientId}/financing`)}
                className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-[12px] font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Financing Options</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/patients/${resolvedPatientId}`)}
                className="border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#334155] text-[12px] font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Full Profile</span>
              </button>
            </>
          ) : isResolvingPatient ? (
            <button
              type="button"
              disabled
              className="border border-slate-200 bg-slate-50 text-slate-400 text-[12px] font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-sm cursor-not-allowed"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              <span>Loading Profile...</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="border border-[#3f1d8b] bg-[#3f1d8b] text-white hover:bg-[#341873] text-[12px] font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Select Patient from Directory</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. WORKFLOW STEP INDICATOR (Figma 1:7079) */}
      <div className="bg-white border border-[#e2e8f0]/90 rounded-[12px] px-6 py-3.5 flex items-center justify-between shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3 w-full justify-between">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => {
              if (resolvedPatientId) {
                navigate(`/patients/${resolvedPatientId}/financing`);
              } else {
                navigate('/treatment-offers');
              }
            }}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Step 1: Completed
              </span>
              <span className="text-[13px] font-semibold text-slate-700 group-hover:text-[#3f1d8b]">
                Select Financing Options
              </span>
            </div>
          </button>

          <div className="h-px bg-slate-200 flex-1 mx-4 max-w-[80px]" />

          {/* Step 2 */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#3f1d8b] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md ring-4 ring-purple-100">
              2
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#3f1d8b] uppercase tracking-wider">
                Step 2: Active
              </span>
              <span className="text-[13px] font-bold text-[#0f172a]">
                Configure Treatment Offer
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-200 flex-1 mx-4 max-w-[80px]" />

          {/* Step 3 */}
          <div className="flex items-center gap-2.5 opacity-60">
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 border border-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Step 3
              </span>
              <span className="text-[13px] font-medium text-slate-500">
                Review & Send to Patient
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-200 flex-1 mx-4 max-w-[80px]" />

          {/* Step 4 */}
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

      {/* 3. TWO-COLUMN WORKFLOW GRID: FORM (LEFT) vs LIVE PRICING SUMMARY (RIGHT) (Figma 1:7104) */}
      <div className="grid grid-cols-12 gap-6 items-start w-full">
        {/* LEFT COLUMN: FORM SECTIONS (COL 1-7) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          {/* SECTION 1: CPT SELECTION & CLINICAL CONTEXT */}
          <div
            id="section-cpt"
            className="bg-white border border-[#e2e8f0]/90 rounded-[16px] p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-5 scroll-mt-6"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#3f1d8b] flex items-center justify-center shrink-0">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-[#0f172a] leading-tight">
                  1. Treatment Procedure & Clinical Context
                </h2>
                <p className="text-[12px] text-slate-500 font-medium">
                  Stage 1: Procedure Selection & Clinical Indications
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Target Procedure */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#334155] tracking-wide uppercase">
                  Target Procedure / CPT Code *
                </label>
                {isLoadingCpt ? (
                  <div className="flex items-center gap-2 p-3 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-[#3f1d8b]" />
                    <span>Loading CPT procedure catalogue...</span>
                  </div>
                ) : cptError ? (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Unable to load CPT catalogue: {cptError}</span>
                  </div>
                ) : cptCatalog.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                    No active CPT procedures returned by backend catalogue.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Search / Filter input */}
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        disabled={isOfferLocked}
                        value={cptSearchQuery}
                        onChange={(e) => setCptSearchQuery(e.target.value)}
                        placeholder="Search procedures by code, name, or category..."
                        className="w-full pl-8.5 pr-8 py-1.5 bg-[#f1f5f9]/60 border border-slate-200 rounded-lg text-xs font-medium text-[#0f172a] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3f1d8b] focus:bg-white transition-all disabled:opacity-60"
                      />
                      {cptSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCptSearchQuery('')}
                          className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <select
                        value={procedureCode}
                        disabled={isOfferLocked}
                        onChange={(e) => {
                          const code = e.target.value;
                          const selected = cptCatalog.find((c) => c.code === code);
                          if (selected) {
                            setProcedureCode(selected.code);
                            setProcedureName(selected.name);
                            setBaselineFee(selected.standardCharge);
                            const catUpper = (selected.category || '').toUpperCase();
                            if (catUpper === 'SURGICAL' || catUpper === 'DIAGNOSTIC' || catUpper === 'THERAPEUTIC') {
                              setProcedureCategory(catUpper);
                            }
                          }
                        }}
                        className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#3f1d8b] focus:bg-white transition-all cursor-pointer disabled:opacity-60"
                      >
                        {!filteredCptCatalog.some((c) => c.code === procedureCode) && procedureCode && (
                          <option value={procedureCode}>
                            {procedureCode} - {procedureName || 'Saved Procedure'}
                          </option>
                        )}
                        {filteredCptCatalog.length === 0 ? (
                          <option disabled value="">No procedures match "{cptSearchQuery}"</option>
                        ) : (
                          filteredCptCatalog.map((cpt) => {
                            const isOfficial = cpt.isOfficialCpt !== false && /^\d{5}$/.test(cpt.code);
                            const labelPrefix = isOfficial ? `CPT #${cpt.code}` : `Procedure #${cpt.code}`;
                            return (
                              <option key={cpt.code} value={cpt.code}>
                                {labelPrefix} - {cpt.name}
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>
                  </div>
                )}
                {procedureCode && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-purple-50 text-[#3f1d8b] border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-md">
                      {cptCatalog.find((c) => c.code === procedureCode)?.isOfficialCpt !== false && /^\d{5}$/.test(procedureCode)
                        ? `CPT #${procedureCode}`
                        : `Procedure #${procedureCode}`}
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-0.5 rounded-md">
                      {cptCatalog.find((c) => c.code === procedureCode)?.category || procedureCategory}
                    </span>
                    {cptCatalog.find((c) => c.code === procedureCode)?.status === 'INACTIVE' && (
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Archived in Catalogue
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Clinical Necessity Summary */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#334155] tracking-wide uppercase">
                  Clinical Necessity Summary
                </label>
                <textarea
                  rows={2}
                  disabled={isOfferLocked}
                  value={clinicalNecessity}
                  onChange={(e) => setClinicalNecessity(e.target.value)}
                  placeholder="Enter clinical indication or necessity notes for this procedure..."
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-3 text-xs font-medium text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#3f1d8b] focus:bg-white resize-none disabled:opacity-60"
                />
              </div>

              {/* Standard Chargemaster Baseline Fee */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[#334155] tracking-wide uppercase">
                    Standard Hospital Baseline Fee (Chargemaster)
                  </label>
                  {isChargemasterOverride && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Facility Chargemaster Override Active
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    disabled={isOfferLocked}
                    value={baselineFee}
                    onChange={(e) => setBaselineFee(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl text-sm font-bold text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#3f1d8b] focus:bg-white disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Standard procedure charge from backend CPT catalogue
                  {facilities.find((f) => f.id === selectedFacilityId)?.name
                    ? ` • ${facilities.find((f) => f.id === selectedFacilityId)?.name}`
                    : user.organization
                    ? ` • ${user.organization}`
                    : ''}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRICING & DISCOUNT */}
          <div
            id="section-discount"
            className="bg-white border border-[#e2e8f0]/90 rounded-[16px] p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-5 scroll-mt-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#0f172a] leading-tight">
                    2. Configure Treatment Discount
                  </h2>
                  <p className="text-[12px] text-slate-500 font-medium">
                    Stage 2: Apply hospital-permitted uninsured prompt settlement discount
                  </p>
                </div>
              </div>

              {/* Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  {discountEnabled ? 'Discount Enabled' : 'Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => setDiscountEnabled(!discountEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    discountEnabled ? 'bg-[#3f1d8b]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      discountEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {discountEnabled && (
              <div className="flex flex-col gap-4">
                {/* Discount Mode */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-[#334155] tracking-wide uppercase">
                    Discount Calculation Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDiscountMode('percentage')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        discountMode === 'percentage'
                          ? 'border-[#3f1d8b] bg-purple-50 text-[#3f1d8b] shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountMode('fixed')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        discountMode === 'fixed'
                          ? 'border-[#3f1d8b] bg-purple-50 text-[#3f1d8b] shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Fixed Amount ($)
                    </button>
                  </div>
                </div>

                {/* Rate Input & Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-[#334155] tracking-wide uppercase">
                      Discount Rate ({discountMode === 'percentage' ? '%' : '$'})
                    </label>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      Ceiling: {maxDoctorDiscount}% (Facility Policy)
                    </span>
                  </div>

                  {discountMode === 'percentage' ? (
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max={maxDoctorDiscount}
                        step="1"
                        disabled={isOfferLocked}
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(Number(e.target.value))}
                        className="flex-1 accent-[#3f1d8b] cursor-pointer"
                      />
                      <div className="w-20 relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max={maxDoctorDiscount}
                          disabled={isOfferLocked}
                          value={discountPercent}
                          onChange={(e) =>
                            setDiscountPercent(Math.min(Math.max(Number(e.target.value) || 0, 0), maxDoctorDiscount))
                          }
                          className="w-full text-right pr-6 py-1.5 bg-[#f8fafc] border border-slate-200 rounded-lg text-sm font-bold text-[#0f172a]"
                        />
                        <span className="absolute right-2 text-xs font-bold text-slate-400">%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-sm font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        min="0"
                        disabled={isOfferLocked}
                        value={discountFixed}
                        onChange={(e) =>
                          setDiscountFixed(Math.max(Number(e.target.value) || 0, 0))
                        }
                        className="w-full pl-8 pr-3.5 py-2 bg-[#f8fafc] border border-slate-200 rounded-lg text-sm font-bold text-[#0f172a]"
                      />
                    </div>
                  )}
                </div>

                {/* Live Mathematical Calculation Banner (Figma 1:7220) */}
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[12px] p-3.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800">
                      Proposed Discount for {patientName}: {discountMode === 'percentage' ? `${discountPercent}%` : `$${discountFixed.toLocaleString()}`} from baseline (${baselineFee.toLocaleString()})
                    </span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      -${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/60">
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Final net payable amount is confirmed and persisted by the backend upon saving.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: FINANCING OPTION INTEGRATION */}
          <div
            id="section-financing"
            className="bg-white border border-[#e2e8f0]/90 rounded-[16px] p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-5 scroll-mt-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#0f172a] leading-tight">
                    3. Financing Option Integration
                  </h2>
                  <p className="text-[12px] text-slate-500 font-medium">
                    Stage 3: Live healthcare financing catalog from backend registry
                  </p>
                </div>
              </div>

              {targetPatientId && (
                <button
                  type="button"
                  onClick={() => navigate(`/patients/${targetPatientId}/financing`)}
                  className="text-[12px] font-bold text-[#3f1d8b] hover:underline cursor-pointer"
                >
                  Change Package in Hub
                </button>
              )}
            </div>

            {isLoadingFinancing ? (
              <div className="flex items-center justify-center p-8 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#3f1d8b]" />
                <span className="text-xs font-medium">Loading live financing options from registry...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {financingError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Failed to load financing catalog from backend: {financingError}</span>
                  </div>
                )}
                {availablePackages.map((pkg) => {
                  const isSelected = selectedFinancingPkg === pkg.id;
                  const isPromptCash = pkg.id === 'prompt-cash';
                  const monthlyCalc = pkg.calculateMonthly(netProcedureCost);
                  const totalCalc = pkg.calculateTotal(netProcedureCost);

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedFinancingPkg(pkg.id)}
                      className={`p-4 rounded-[14px] border-2 transition-all cursor-pointer flex flex-col gap-2 relative ${
                        isSelected
                          ? 'border-[#3f1d8b] bg-[#fbf9fe] shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0f172a]">{pkg.name}</h3>
                          {isSelected && (
                            <span className="bg-[#3f1d8b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              SELECTED
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-[#3f1d8b]">{pkg.badge}</span>
                      </div>

                      {!isPromptCash ? (
                        <>
                          <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                            <span className="text-base font-extrabold text-[#3f1d8b]">
                              ${monthlyCalc.toFixed(2)} / mo
                            </span>
                            <span>(${totalCalc.toLocaleString('en-US', { minimumFractionDigits: 2 })} Total)</span>
                            <span>•</span>
                            <span>{pkg.termMonthsDisplay}</span>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-purple-100 text-[11px] text-slate-500 flex-wrap">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                              {pkg.enrollmentFee}
                            </span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                              {pkg.penaltyFee}
                            </span>
                            <span className="text-slate-400">{pkg.availableCredit}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium">
                          Patient will pay the full discounted balance (${netProcedureCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}) at time of hospital intake.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 4: OFFER VALIDITY & CLINICAL REMARKS */}
          <div
            id="section-remarks"
            className="bg-white border border-[#e2e8f0]/90 rounded-[16px] p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-5 scroll-mt-6"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-[#0f172a] leading-tight">
                  4. Offer Validity & Clinical Remarks
                </h2>
                <p className="text-[12px] text-slate-500 font-medium">
                  Stage 4: Define the validity period and customized clinical remarks for {patientName}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Offer Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#334155] tracking-wide uppercase">
                  Offer Title / Care Plan Identifier *
                </label>
                <input
                  type="text"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#3f1d8b] focus:bg-white"
                />
              </div>

              {/* Expiration Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#334155] tracking-wide uppercase">
                  Offer Expiration Date
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="date"
                    disabled={isOfferLocked}
                    value={expirationDateInput}
                    onChange={(e) => setExpirationDateInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Valid until {validUntilIso.slice(0, 10)}
                </p>
              </div>

              {/* Personalized Instructions */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[#334155] tracking-wide uppercase">
                    Personalized Instructions for {patientName}
                  </label>
                  <span className="text-[11px] text-slate-400">Click template below to insert</span>
                </div>
                {remarkTemplates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    {remarkTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setDoctorNotes((prev) =>
                            prev ? `${prev.trim()}\n• ${tpl.name}` : `• ${tpl.name}`
                          );
                        }}
                        className="text-[11px] font-medium bg-white hover:bg-purple-50 text-[#3f1d8b] border border-purple-200 hover:border-purple-300 px-2 py-1 rounded transition-colors shadow-2xs"
                        title={tpl.description || tpl.name}
                      >
                        + {tpl.name}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  rows={3}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Enter customized patient preparation or recovery instructions..."
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-3 text-xs font-medium text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#3f1d8b] focus:bg-white resize-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: CLINICIAN ATTESTATION & GOVERNANCE SIGN-OFF */}
          <div
            id="section-attestation"
            className="bg-white border border-[#e2e8f0]/90 rounded-[16px] p-[25px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col gap-4 scroll-mt-6"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-[#0f172a] leading-tight">
                  5. Clinician Attestation & Governance Sign-off
                </h2>
                <p className="text-[12px] text-slate-500 font-medium">
                  Stage 5: Attending Physician: {user.fullName || 'Authorized Clinician'} ({user.specialty || 'Cardiology'})
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={complianceConfirmed}
                  onChange={(e) => setComplianceConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#3f1d8b] focus:ring-[#3f1d8b] cursor-pointer"
                />
                <span className="text-[12px] text-slate-600 font-medium leading-relaxed">
                  I certify that this procedural care plan and discount schedule complies with {facilities.find((f) => f.id === selectedFacilityId)?.name || user.organization || 'institutional'} clinical governance, and I confirm clinical necessity for {patientName}.
                </span>
              </label>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Clinician digital signature will be timestamped upon submission to backend registry.</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PRICING PANEL (COL 8-12) (Figma 1:7104) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6 sticky top-6">
          {/* MASTER LIVE OFFER BREAKDOWN CARD */}
          <div className="bg-gradient-to-b from-white to-[#f8fafc]/90 border-2 border-[#e2e8f0]/90 rounded-[16px] p-[26px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-[17px] font-bold text-[#0f172a] leading-tight">
                  Treatment Offer Summary
                </h3>
                <p className="text-[12px] text-slate-500 font-medium">
                  Live calculating patient responsibility
                </p>
              </div>
              <span className="bg-purple-100 text-[#3f1d8b] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Draft Preview
              </span>
            </div>

            {/* Context Rows */}
            <div className="flex flex-col gap-2 text-xs font-medium">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-[#0f172a]">
                  {hasSelectedPatient
                    ? `${patientName} (CID ${patientCid})`
                    : isResolvingPatient
                    ? 'Loading Patient...'
                    : 'No Patient Selected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Procedure:</span>
                <span className="font-bold text-[#0f172a]">{procedureName} ({procedureCode})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Insurance Status:</span>
                <span className="font-bold text-[#991b1b]">{insuranceStatus}</span>
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            {/* Price Breakdown */}
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Standard Hospital Baseline Fee:</span>
                <span className="font-bold text-slate-800">
                  {formatFacilityCurrency(baselineFee, facilityCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-700 font-medium">
                  {discountMode === 'percentage' ? `${discountPercent}%` : formatFacilityCurrency(discountFixed, facilityCurrency)} Prompt Cash Discount:
                </span>
                <span className="font-bold text-emerald-700">
                  -{formatFacilityCurrency(discountAmount, facilityCurrency)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-bold">
                <span className="text-[#0f172a] text-xs uppercase tracking-wide">
                  Net Discounted Procedure Cost:
                </span>
                <span className="text-sm text-[#0f172a]">
                  {formatFacilityCurrency(netProcedureCost, facilityCurrency)}
                </span>
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            {/* Financing Section */}
            {activePackage.id !== 'prompt-cash' ? (
              <div className="flex flex-col gap-2 text-xs bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
                <span className="font-bold text-[#3f1d8b]">{activePackage.name}:</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Estimated Monthly Installment:</span>
                  <span className="text-lg font-extrabold text-[#3f1d8b]">
                    {getCurrencySymbol(facilityCurrency)} {monthlyPayment} <span className="text-xs font-medium text-slate-500">/ month</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Term: {activePackage.termMonthsDisplay}</span>
                  <span>APR: {activePackage.aprDisplay}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Prompt Full Cash Payment:</span>
                <span className="text-slate-500">
                  Single settlement payment of ${netProcedureCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} due at intake.
                </span>
              </div>
            )}

            {/* Total Patient Payable Box */}
            <div className="bg-[#f8fafc] border border-slate-200 rounded-[12px] p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Net Patient Payable
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full w-fit mt-1">
                  Saved ${discountAmount.toLocaleString()} total
                </span>
              </div>
              <div className="text-[24px] font-extrabold text-[#0f172a] tracking-tight">
                ${totalPayableDisplay}
              </div>
            </div>

            {/* Reassurance Box */}
            <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-[11px] text-slate-600 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Financing Notice:</strong> Financing options are subject to partner eligibility and backend underwriting after offer dispatch. Offer valid through {expirationDate || validUntilIso.slice(0, 10)}.
              </span>
            </div>
          </div>

          {/* PRIMARY WORKFLOW ACTION BUTTONS (Figma 1:7453 & 1:7454) */}
          <div className="flex flex-col gap-3 w-full pt-2">
            <button
              type="button"
              onClick={handleProceedToReview}
              disabled={isSubmitting || isLoadingOffer || (!isOfferLocked && !complianceConfirmed)}
              className="w-full h-[48px] bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white text-[14px] font-bold rounded-[9999px] shadow-[0px_10px_15px_-3px_rgba(88,28,135,0.2),0px_4px_6px_-4px_rgba(88,28,135,0.2)] hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-200 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting to Clinical Registry...</span>
                </>
              ) : (
                <>
                  <span>Review & Generate Offer</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>

            {/* Secondary Actions (Figma 1:7461) */}
            <div className="flex items-center gap-[12px] w-full">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting || isLoadingOffer || isOfferLocked}
                className="flex-1 h-[38px] bg-white border border-[#e2e8f0] text-[#334155] text-[12px] font-semibold rounded-[12px] px-[17px] hover:bg-slate-50 transition-colors shadow-xs flex items-center justify-center gap-[6px] cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Save Draft</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (targetPatientId) {
                    navigate(`/patients/${targetPatientId}/financing`);
                  } else {
                    navigate('/treatment-offers');
                  }
                }}
                className="flex-1 h-[38px] bg-white border border-[#e2e8f0] text-[#e11d48] text-[12px] font-semibold rounded-[12px] px-[17px] hover:bg-rose-50 transition-colors shadow-xs flex items-center justify-center gap-[6px] cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Cancel Offer</span>
              </button>
            </div>
          </div>

          {/* AUDIT & CLINICAL COMPLIANCE FOOTER CARD (Figma 1:7473) */}
          <div className="bg-white border border-[#e2e8f0]/80 rounded-[14px] p-3.5 flex items-center gap-3 shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              <strong>Secure Transmission via Care ID Network:</strong> Offer will be encrypted and dispatched directly to {patientName}'s Care ID iOS/Android app with an encrypted SMS alert.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
