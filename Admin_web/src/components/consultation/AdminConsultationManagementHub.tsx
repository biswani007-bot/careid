import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Stethoscope,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  Power,
  X,
  AlertCircle,
  CheckCircle2,
  Menu,
  Save,
  ShieldCheck,
  CheckSquare,
  AlertTriangle,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import ConsultationPagination from '../common/ConsultationPagination';
import {
  useProceduresQuery,
  useCreateProcedureMutation,
  useUpdateProcedureMutation,
  useDeleteProcedureMutation,
} from '../../services/procedureService';
import type { ProcedureCatalogueItem } from '../../services/procedureService';
import {
  useChargemasterQuery,
  useSetFacilityPriceMutation,
  useFinancingPackagesQuery,
  useCreateFinancingPackageMutation,
  useUpdateFinancingPackageMutation,
  useToggleFinancingPackageStatusMutation,
  useDeleteFinancingPackageMutation,
  useAppointmentPolicyQuery,
  useUpdateAppointmentPolicyMutation,
  useMasterDataItemsQuery,
  useCreateMasterDataItemMutation,
  useClearanceRequirementsQuery,
  useClearancePoliciesQuery,
  useCreateClearanceRequirementMutation,
  useUpdateClearanceRequirementMutation,
  useToggleClearanceRequirementStatusMutation,
  useDeleteClearanceRequirementMutation,
  useCreateClearancePolicyMutation,
  useUpdateClearancePolicyMutation,
  useDeleteClearancePolicyMutation,
  useSafetyHoldCategoriesQuery,
  useCreateSafetyHoldCategoryMutation,
  useUpdateSafetyHoldCategoryMutation,
  useToggleSafetyHoldCategoryStatusMutation,
  useDeleteSafetyHoldCategoryMutation,
  useClinicalSummaryConfigQuery,
  useUpdateClinicalSummaryConfigMutation,
  useReconciliationStatusQuery,
  useReconcileLegacySafetyHoldsMutation,
} from '../../services/consultationManagementService';
import type {
  FinancingPackageItem,
  FacilityChargemasterItem,
  ClearanceRequirementItem,
  ClearancePolicyItem,
  SafetyHoldCategoryItem,
  ClinicalSummaryConfigItem,
} from '../../services/consultationManagementService';
import { useLiveFacilitiesQuery } from '../../services/facilityService';
import { ISO_CURRENCIES } from '../../utils/facilityLocalization';
import '../settings/AdminSystemSettingsGeneral.css';
import './AdminConsultationManagementHub.css';

interface AdminConsultationManagementHubProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

type ConsultationTab =
  | 'procedures'
  | 'chargemaster'
  | 'financing'
  | 'scheduling'
  | 'master-data'
  | 'clearance-requirements'
  | 'clearance-policies'
  | 'safety-holds'
  | 'summary-config';

export const AdminConsultationManagementHub: React.FC<AdminConsultationManagementHubProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as ConsultationTab | null;
  const validTabs: ConsultationTab[] = [
    'procedures',
    'chargemaster',
    'financing',
    'scheduling',
    'master-data',
    'clearance-requirements',
    'clearance-policies',
    'safety-holds',
    'summary-config',
  ];
  const [activeTab, setActiveTabState] = useState<ConsultationTab>(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'procedures'
  );

  const setActiveTab = (tab: ConsultationTab) => {
    setActiveTabState(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─── TAB 1: Procedure Catalogue State & Pagination ─────────────────────────
  const [procedureSearch, setProcedureSearch] = useState('');
  const [debouncedProcedureSearch, setDebouncedProcedureSearch] = useState('');
  const [procedurePage, setProcedurePage] = useState(1);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedProcedureSearch(procedureSearch.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [procedureSearch]);

  const { data: proceduresData, isLoading: isProceduresLoading } = useProceduresQuery({
    search: debouncedProcedureSearch,
    page: procedurePage,
    limit: 10,
  });

  const procedures = proceduresData?.data || [];
  const totalProcRecords = proceduresData?.meta?.totalItems ?? proceduresData?.meta?.total ?? procedures.length;
  const totalProcPages = Math.max(1, Math.ceil(totalProcRecords / 10));

  useEffect(() => {
    if (!isProceduresLoading && totalProcRecords > 0 && procedurePage > totalProcPages) {
      setProcedurePage(totalProcPages);
    }
  }, [procedurePage, totalProcPages, isProceduresLoading, totalProcRecords]);

  // ─── TAB 2: Facility Chargemaster State & Pagination ───────────────────────
  const { data: facilities = [] } = useLiveFacilitiesQuery();
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [chargemasterSearch, setChargemasterSearch] = useState('');
  const [chargemasterPage, setChargemasterPage] = useState(1);

  useEffect(() => {
    if (facilities.length > 0 && !selectedFacilityId) {
      setSelectedFacilityId(facilities[0].id);
    }
  }, [facilities, selectedFacilityId]);

  const { data: chargemasterData, isLoading: isChargemasterLoading } = useChargemasterQuery(selectedFacilityId);
  const chargemasterItems = chargemasterData?.items || [];

  const filteredChargemaster = useMemo(() => {
    if (!chargemasterItems) return [];
    if (!chargemasterSearch.trim()) return chargemasterItems;
    const q = chargemasterSearch.toLowerCase().trim();
    return chargemasterItems.filter(
      (item) =>
        item.cptCode.toLowerCase().includes(q) ||
        item.procedureName.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
    );
  }, [chargemasterItems, chargemasterSearch]);

  const totalChargemasterPages = Math.max(1, Math.ceil(filteredChargemaster.length / 10));

  useEffect(() => {
    setChargemasterPage(1);
  }, [selectedFacilityId, chargemasterSearch]);

  useEffect(() => {
    if (chargemasterPage > totalChargemasterPages && totalChargemasterPages > 0) {
      setChargemasterPage(totalChargemasterPages);
    }
  }, [chargemasterPage, totalChargemasterPages]);

  const pagedChargemaster = useMemo(() => {
    const start = (chargemasterPage - 1) * 10;
    return filteredChargemaster.slice(start, start + 10);
  }, [filteredChargemaster, chargemasterPage]);

  // ─── TAB 3: Financing Packages State & Pagination ──────────────────────────
  const [financingSearch, setFinancingSearch] = useState('');
  const [financingPage, setFinancingPage] = useState(1);

  const { data: financingPackages = [], isLoading: isFinancingLoading } = useFinancingPackagesQuery();

  const filteredFinancing = useMemo(() => {
    if (!financingPackages) return [];
    if (!financingSearch.trim()) return financingPackages;
    const q = financingSearch.toLowerCase().trim();
    return financingPackages.filter(
      (pkg) =>
        pkg.code.toLowerCase().includes(q) ||
        pkg.name.toLowerCase().includes(q) ||
        pkg.provider.toLowerCase().includes(q)
    );
  }, [financingPackages, financingSearch]);

  const totalFinancingPages = Math.max(1, Math.ceil(filteredFinancing.length / 10));

  useEffect(() => {
    setFinancingPage(1);
  }, [financingSearch]);

  useEffect(() => {
    if (financingPage > totalFinancingPages && totalFinancingPages > 0) {
      setFinancingPage(totalFinancingPages);
    }
  }, [financingPage, totalFinancingPages]);

  const pagedFinancing = useMemo(() => {
    const start = (financingPage - 1) * 10;
    return filteredFinancing.slice(start, start + 10);
  }, [filteredFinancing, financingPage]);

  // ─── TAB 4: Appointment & Scheduling Policies State ───────────────────────
  const { data: policyData, isLoading: isPolicyLoading } = useAppointmentPolicyQuery(selectedFacilityId);

  const [policyForm, setPolicyForm] = useState({
    minNoticeHoursCancel: 24,
    minNoticeHoursReschedule: 12,
    maxReschedulesAllowed: 3,
    slotHoldMinutes: 45,
    maxAdvanceBookingDays: 60,
    slotGenerationDays: 14,
    defaultSlotDuration: 30,
    defaultBufferMinutes: 5,
  });

  useEffect(() => {
    if (policyData) {
      setPolicyForm({
        minNoticeHoursCancel: policyData.minNoticeHoursCancel ?? 24,
        minNoticeHoursReschedule: policyData.minNoticeHoursReschedule ?? 12,
        maxReschedulesAllowed: policyData.maxReschedulesAllowed ?? 3,
        slotHoldMinutes: policyData.slotHoldMinutes ?? 45,
        maxAdvanceBookingDays: policyData.maxAdvanceBookingDays ?? 60,
        slotGenerationDays: policyData.slotGenerationDays ?? 14,
        defaultSlotDuration: policyData.defaultSlotDuration ?? 30,
        defaultBufferMinutes: policyData.defaultBufferMinutes ?? 5,
      });
    }
  }, [policyData]);

  // ─── TAB 5: Master Data State & Pagination ─────────────────────────────────
  const [masterDataCategory, setMasterDataCategory] = useState<string>('CONSULTATION_REASONS');
  const [masterDataSearch, setMasterDataSearch] = useState('');
  const [masterDataPage, setMasterDataPage] = useState(1);

  const { data: masterDataItems = [], isLoading: isMasterDataLoading } = useMasterDataItemsQuery(masterDataCategory);

  const filteredMasterData = useMemo(() => {
    if (!masterDataItems) return [];
    if (!masterDataSearch.trim()) return masterDataItems;
    const q = masterDataSearch.toLowerCase().trim();
    return masterDataItems.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [masterDataItems, masterDataSearch]);

  const totalMasterDataPages = Math.max(1, Math.ceil(filteredMasterData.length / 10));

  useEffect(() => {
    setMasterDataPage(1);
  }, [masterDataCategory, masterDataSearch]);

  useEffect(() => {
    if (masterDataPage > totalMasterDataPages && totalMasterDataPages > 0) {
      setMasterDataPage(totalMasterDataPages);
    }
  }, [masterDataPage, totalMasterDataPages]);

  const pagedMasterData = useMemo(() => {
    const start = (masterDataPage - 1) * 10;
    return filteredMasterData.slice(start, start + 10);
  }, [filteredMasterData, masterDataPage]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createProcedureMutation = useCreateProcedureMutation();
  const updateProcedureMutation = useUpdateProcedureMutation();
  const deleteProcedureMutation = useDeleteProcedureMutation();

  const setFacilityPriceMutation = useSetFacilityPriceMutation();

  const createFinancingMutation = useCreateFinancingPackageMutation();
  const updateFinancingMutation = useUpdateFinancingPackageMutation();
  const toggleFinancingStatusMutation = useToggleFinancingPackageStatusMutation();
  const deleteFinancingMutation = useDeleteFinancingPackageMutation();

  const updatePolicyMutation = useUpdateAppointmentPolicyMutation();
  const createMasterDataItemMutation = useCreateMasterDataItemMutation();

  // ─── Modals State ──────────────────────────────────────────────────────────
  const [isAddProcedureModalOpen, setIsAddProcedureModalOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<ProcedureCatalogueItem | null>(null);

  const [isSetPriceModalOpen, setIsSetPriceModalOpen] = useState(false);
  const [selectedChargemasterItem, setSelectedChargemasterItem] = useState<FacilityChargemasterItem | null>(null);
  const [overridePrice, setOverridePrice] = useState<string>('');
  const [overrideCurrency, setOverrideCurrency] = useState<string>('USD');

  const [isAddFinancingModalOpen, setIsAddFinancingModalOpen] = useState(false);
  const [editingFinancing, setEditingFinancing] = useState<FinancingPackageItem | null>(null);

  const [isAddMasterDataModalOpen, setIsAddMasterDataModalOpen] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Procedure Add/Edit Form State
  const [procForm, setProcForm] = useState({
    code: '',
    name: '',
    category: 'CARDIOLOGY',
    standardCharge: '',
    description: '',
    isOfficialCpt: false,
  });

  const handleSaveProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProcedure) {
        await updateProcedureMutation.mutateAsync({
          code: editingProcedure.code,
          payload: {
            name: procForm.name.trim(),
            category: procForm.category.trim(),
            standardCharge: Number(procForm.standardCharge) || 0,
            description: procForm.description.trim(),
            status: editingProcedure.status,
          },
        });
        showNotification('success', `Procedure '${editingProcedure.code}' updated successfully.`);
      } else {
        await createProcedureMutation.mutateAsync({
          code: procForm.code.trim(),
          name: procForm.name.trim(),
          category: procForm.category.trim(),
          standardCharge: Number(procForm.standardCharge) || 0,
          description: procForm.description.trim(),
          isOfficialCpt: procForm.isOfficialCpt,
        });
        showNotification('success', `Procedure '${procForm.code}' created successfully.`);
      }
      setIsAddProcedureModalOpen(false);
      setEditingProcedure(null);
      setProcForm({ code: '', name: '', category: 'CARDIOLOGY', standardCharge: '', description: '', isOfficialCpt: false });
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save procedure');
    }
  };

  // Chargemaster Price Override Handler
  const handleSavePriceOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChargemasterItem || !selectedFacilityId) return;
    try {
      await setFacilityPriceMutation.mutateAsync({
        facilityId: selectedFacilityId,
        procedureCode: selectedChargemasterItem.cptCode,
        price: Number(overridePrice) || 0,
        currency: overrideCurrency,
      });
      showNotification(
        'success',
        `Facility price override of ${overrideCurrency} ${overridePrice} saved for ${selectedChargemasterItem.cptCode}.`
      );
      setIsSetPriceModalOpen(false);
      setSelectedChargemasterItem(null);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to set facility price');
    }
  };

  // Financing Package Form State
  const [finForm, setFinForm] = useState({
    code: '',
    name: '',
    provider: '',
    apr: '0',
    minDownPaymentPercent: '10',
    maxLoanMultiplier: '1.5',
    minCreditScore: '600',
    processingFee: '0',
    description: '',
  });

  const handleSaveFinancing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFinancing) {
        await updateFinancingMutation.mutateAsync({
          id: editingFinancing.id,
          payload: {
            name: finForm.name.trim(),
            provider: finForm.provider.trim(),
            apr: Number(finForm.apr) || 0,
            minDownPaymentPercent: Number(finForm.minDownPaymentPercent) || 10,
            maxLoanMultiplier: Number(finForm.maxLoanMultiplier) || 1.5,
            minCreditScore: Number(finForm.minCreditScore) || 600,
            processingFee: Number(finForm.processingFee) || 0,
            description: finForm.description.trim(),
          },
        });
        showNotification('success', `Financing package '${editingFinancing.code}' updated.`);
      } else {
        await createFinancingMutation.mutateAsync({
          code: finForm.code.trim(),
          name: finForm.name.trim(),
          provider: finForm.provider.trim(),
          apr: Number(finForm.apr) || 0,
          minDownPaymentPercent: Number(finForm.minDownPaymentPercent) || 10,
          maxLoanMultiplier: Number(finForm.maxLoanMultiplier) || 1.5,
          minCreditScore: Number(finForm.minCreditScore) || 600,
          processingFee: Number(finForm.processingFee) || 0,
          description: finForm.description.trim(),
          isActive: true,
        });
        showNotification('success', `Financing package '${finForm.code}' registered.`);
      }
      setIsAddFinancingModalOpen(false);
      setEditingFinancing(null);
      setFinForm({
        code: '',
        name: '',
        provider: '',
        apr: '0',
        minDownPaymentPercent: '10',
        maxLoanMultiplier: '1.5',
        minCreditScore: '600',
        processingFee: '0',
        description: '',
      });
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save financing package');
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePolicyMutation.mutateAsync({
        facilityId: selectedFacilityId || null,
        ...policyForm,
      });
      showNotification('success', 'Appointment booking and cancellation policies saved successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save appointment policy');
    }
  };

  // Clearance Requirements State
  const [clearanceReqSearch, setClearanceReqSearch] = useState('');
  const [clearanceReqCategory, setClearanceReqCategory] = useState('');
  const [clearanceReqPage, setClearanceReqPage] = useState(1);
  const [isAddClearanceReqModalOpen, setIsAddClearanceReqModalOpen] = useState(false);
  const [editingClearanceReq, setEditingClearanceReq] = useState<ClearanceRequirementItem | null>(null);
  const [reqForm, setReqForm] = useState({
    code: '',
    name: '',
    description: '',
    category: 'GENERAL',
    clinicalPracticeType: 'CARDIOLOGY',
    requiredEvidenceType: 'NONE',
    reviewerRole: 'ANY_CLINICIAN',
    isMandatory: true,
    isSchedulingPrerequisite: true,
    sortOrder: 1,
  });

  const { data: clearanceReqData, isLoading: isClearanceReqLoading } = useClearanceRequirementsQuery({
    search: clearanceReqSearch,
    category: clearanceReqCategory || undefined,
    page: clearanceReqPage,
    limit: 10,
  });

  const createClearanceReqMutation = useCreateClearanceRequirementMutation();
  const updateClearanceReqMutation = useUpdateClearanceRequirementMutation();
  const toggleClearanceReqMutation = useToggleClearanceRequirementStatusMutation();
  const deleteClearanceReqMutation = useDeleteClearanceRequirementMutation();

  // Clearance Policies State
  const [clearancePolicySearch, setClearancePolicySearch] = useState('');
  const [clearancePolicyFacilityId, setClearancePolicyFacilityId] = useState('');
  const [clearancePolicyPage, setClearancePolicyPage] = useState(1);
  const [isAddClearancePolicyModalOpen, setIsAddClearancePolicyModalOpen] = useState(false);
  const [editingClearancePolicy, setEditingClearancePolicy] = useState<ClearancePolicyItem | null>(null);
  const [policySelectedItems, setPolicySelectedItems] = useState<
    Array<{
      requirementId: string;
      code: string;
      name: string;
      category: string;
      isMandatory: boolean;
      sortOrder: number;
      requiredSpecialties: string[];
      validityDays: number;
      isSchedulingPrerequisite: boolean;
    }>
  >([]);

  const { data: allActiveReqsData } = useClearanceRequirementsQuery({
    limit: 100,
    status: 'ACTIVE',
  });
  const allActiveRequirements = allActiveReqsData?.data || [];

  const [policyModalForm, setPolicyModalForm] = useState({
    policyNumber: '',
    name: '',
    description: '',
    facilityId: '',
    procedureCode: '',
    clinicalPracticeType: 'CARDIOLOGY',
    workflowStage: 'PRE_PROCEDURAL',
    schedulingPrerequisites: 'REQ-FIN-AUTH,REQ-CONSENT,REQ-LAB-METABOLIC,REQ-SPEC-CLEAR',
  });

  const { data: clearancePoliciesData, isLoading: isClearancePoliciesLoading } = useClearancePoliciesQuery({
    search: clearancePolicySearch,
    facilityId: clearancePolicyFacilityId || undefined,
    page: clearancePolicyPage,
    limit: 10,
  });

  const createClearancePolicyMutation = useCreateClearancePolicyMutation();
  const updateClearancePolicyMutation = useUpdateClearancePolicyMutation();
  const deleteClearancePolicyMutation = useDeleteClearancePolicyMutation();

  const handleSaveClearanceReq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClearanceReq) {
        await updateClearanceReqMutation.mutateAsync({
          id: editingClearanceReq.id,
          payload: {
            name: reqForm.name,
            description: reqForm.description,
            category: reqForm.category,
            clinicalPracticeType: reqForm.clinicalPracticeType,
            requiredEvidenceType: reqForm.requiredEvidenceType,
            reviewerRole: reqForm.reviewerRole,
            isMandatory: reqForm.isMandatory,
            isSchedulingPrerequisite: reqForm.isSchedulingPrerequisite,
            sortOrder: Number(reqForm.sortOrder) || 1,
          },
        });
        showNotification('success', `Requirement ${editingClearanceReq.code} updated.`);
      } else {
        await createClearanceReqMutation.mutateAsync({
          code: reqForm.code.trim().toUpperCase(),
          name: reqForm.name.trim(),
          description: reqForm.description.trim(),
          category: reqForm.category,
          clinicalPracticeType: reqForm.clinicalPracticeType,
          requiredEvidenceType: reqForm.requiredEvidenceType,
          reviewerRole: reqForm.reviewerRole,
          isMandatory: reqForm.isMandatory,
          isSchedulingPrerequisite: reqForm.isSchedulingPrerequisite,
          sortOrder: Number(reqForm.sortOrder) || 1,
        });
        showNotification('success', `Requirement ${reqForm.code} added to catalogue.`);
      }
      setIsAddClearanceReqModalOpen(false);
      setEditingClearanceReq(null);
      setReqForm({
        code: '',
        name: '',
        description: '',
        category: 'GENERAL',
        clinicalPracticeType: 'CARDIOLOGY',
        requiredEvidenceType: 'NONE',
        reviewerRole: 'ANY_CLINICIAN',
        isMandatory: true,
        isSchedulingPrerequisite: true,
        sortOrder: 1,
      });
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save requirement');
    }
  };

  const handleSaveClearancePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemsPayload = policySelectedItems.map((it, idx) => ({
        requirementId: it.requirementId,
        isMandatory: it.isMandatory,
        sortOrder: idx + 1,
        requiredSpecialties: it.requiredSpecialties || [],
        validityDays: it.validityDays || 30,
      }));

      const itemPrereqCodes = policySelectedItems
        .filter((it) => it.isSchedulingPrerequisite)
        .map((it) => it.code);
      const manualPrereqs = policyModalForm.schedulingPrerequisites
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const combinedPrereqs = Array.from(new Set([...itemPrereqCodes, ...manualPrereqs]));

      if (editingClearancePolicy) {
        await updateClearancePolicyMutation.mutateAsync({
          id: editingClearancePolicy.id,
          payload: {
            name: policyModalForm.name,
            description: policyModalForm.description,
            facilityId: policyModalForm.facilityId || undefined,
            procedureCode: policyModalForm.procedureCode || undefined,
            clinicalPracticeType: policyModalForm.clinicalPracticeType,
            workflowStage: policyModalForm.workflowStage,
            schedulingPrerequisites: combinedPrereqs,
            items: itemsPayload,
          },
        });
        showNotification('success', `Policy ${editingClearancePolicy.policyNumber} updated.`);
      } else {
        await createClearancePolicyMutation.mutateAsync({
          policyNumber: policyModalForm.policyNumber.trim().toUpperCase(),
          name: policyModalForm.name.trim(),
          description: policyModalForm.description.trim(),
          facilityId: policyModalForm.facilityId || undefined,
          procedureCode: policyModalForm.procedureCode || undefined,
          clinicalPracticeType: policyModalForm.clinicalPracticeType,
          workflowStage: policyModalForm.workflowStage,
          schedulingPrerequisites: combinedPrereqs,
          items: itemsPayload,
        });
        showNotification('success', `Policy ${policyModalForm.policyNumber} created.`);
      }
      setIsAddClearancePolicyModalOpen(false);
      setEditingClearancePolicy(null);
      setPolicySelectedItems([]);
      setPolicyModalForm({
        policyNumber: '',
        name: '',
        description: '',
        facilityId: '',
        procedureCode: '',
        clinicalPracticeType: 'CARDIOLOGY',
        workflowStage: 'PRE_PROCEDURAL',
        schedulingPrerequisites: 'REQ-FIN-AUTH,REQ-CONSENT,REQ-LAB-METABOLIC,REQ-SPEC-CLEAR',
      });
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save clearance policy');
    }
  };

  // Master Data Add Form State
  const [mdForm, setMdForm] = useState({ code: '', name: '', description: '' });

  const handleCreateMasterData = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMasterDataItemMutation.mutateAsync({
        categoryCode: masterDataCategory,
        code: mdForm.code.trim().toUpperCase(),
        name: mdForm.name.trim(),
        description: mdForm.description.trim(),
      });
      showNotification('success', `Master data entry '${mdForm.name}' added.`);
      setIsAddMasterDataModalOpen(false);
      setMdForm({ code: '', name: '', description: '' });
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to add master data item');
    }
  };

  // ─── TAB 6: Safety Hold Categories State & Pagination ─────────────────────
  const [safetyHoldSearch, setSafetyHoldSearch] = useState('');
  const [safetyHoldPracticeType, setSafetyHoldPracticeType] = useState('');
  const [safetyHoldStatusFilter, setSafetyHoldStatusFilter] = useState('');
  const [safetyHoldPage, setSafetyHoldPage] = useState(1);
  const [isAddSafetyHoldModalOpen, setIsAddSafetyHoldModalOpen] = useState(false);
  const [editingSafetyHold, setEditingSafetyHold] = useState<SafetyHoldCategoryItem | null>(null);
  const [safetyHoldForm, setSafetyHoldForm] = useState({
    code: '',
    name: '',
    description: '',
    clinicalPracticeType: 'ALL',
    procedureCategories: '',
    facilityIds: '',
    sortOrder: 1,
    requiredReviewerRole: 'DOCTOR',
    requiredEvidenceType: 'NONE',
    resolutionPolicy: '',
  });

  const { data: safetyHoldCategoriesData, isLoading: isSafetyHoldCategoriesLoading } = useSafetyHoldCategoriesQuery({
    search: safetyHoldSearch || undefined,
    clinicalPracticeType: safetyHoldPracticeType || undefined,
    status: safetyHoldStatusFilter || undefined,
    page: safetyHoldPage,
    limit: 10,
  });

  const createSafetyHoldCategoryMutation = useCreateSafetyHoldCategoryMutation();
  const updateSafetyHoldCategoryMutation = useUpdateSafetyHoldCategoryMutation();
  const toggleSafetyHoldCategoryStatusMutation = useToggleSafetyHoldCategoryStatusMutation();
  const deleteSafetyHoldCategoryMutation = useDeleteSafetyHoldCategoryMutation();

  // Legacy Safety Hold Reconciliation
  const { data: reconciliationStatus, isLoading: isReconStatusLoading } = useReconciliationStatusQuery();
  const reconcileLegacyMutation = useReconcileLegacySafetyHoldsMutation();
  const [isReconciling, setIsReconciling] = useState(false);

  // ─── TAB 7: Clinical Summary Display Configuration State ──────────────────
  const { data: summaryConfigData } = useClinicalSummaryConfigQuery();
  const updateSummaryConfigMutation = useUpdateClinicalSummaryConfigMutation();
  const [summaryConfigForm, setSummaryConfigForm] = useState<ClinicalSummaryConfigItem>({
    showProcedureCode: true,
    showClinicalIndication: true,
    showFacility: true,
    showSupervisingAttending: true,
    showFinancialTerms: true,
    showProceduralHoldWindow: true,
    showSafetyHoldHistory: true,
    safetyHoldPanelCollapsedByDefault: false,
    requireClinicalReviewForHoldClearance: true,
  });

  useEffect(() => {
    if (summaryConfigData) {
      setSummaryConfigForm({
        showProcedureCode: summaryConfigData.showProcedureCode ?? true,
        showClinicalIndication: summaryConfigData.showClinicalIndication ?? true,
        showFacility: summaryConfigData.showFacility ?? true,
        showSupervisingAttending: summaryConfigData.showSupervisingAttending ?? true,
        showFinancialTerms: summaryConfigData.showFinancialTerms ?? true,
        showProceduralHoldWindow: summaryConfigData.showProceduralHoldWindow ?? true,
        showSafetyHoldHistory: summaryConfigData.showSafetyHoldHistory ?? true,
        safetyHoldPanelCollapsedByDefault: summaryConfigData.safetyHoldPanelCollapsedByDefault ?? false,
        requireClinicalReviewForHoldClearance: summaryConfigData.requireClinicalReviewForHoldClearance ?? true,
      });
    }
  }, [summaryConfigData]);

  const handleSaveSafetyHoldCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const procCats = safetyHoldForm.procedureCategories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const facIds = safetyHoldForm.facilityIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (editingSafetyHold) {
        await updateSafetyHoldCategoryMutation.mutateAsync({
          id: editingSafetyHold.id,
          payload: {
            name: safetyHoldForm.name.trim(),
            description: safetyHoldForm.description.trim(),
            clinicalPracticeType: safetyHoldForm.clinicalPracticeType,
            sortOrder: Number(safetyHoldForm.sortOrder) || 1,
          },
        });
        showNotification('success', `Safety hold category '${editingSafetyHold.code}' updated.`);
      } else {
        await createSafetyHoldCategoryMutation.mutateAsync({
          code: safetyHoldForm.code.trim().toUpperCase(),
          name: safetyHoldForm.name.trim(),
          description: safetyHoldForm.description.trim(),
          clinicalPracticeType: safetyHoldForm.clinicalPracticeType,
          procedureCategories: procCats,
          facilityIds: facIds,
          sortOrder: Number(safetyHoldForm.sortOrder) || 1,
          requiredReviewerRole: safetyHoldForm.requiredReviewerRole,
          requiredEvidenceType: safetyHoldForm.requiredEvidenceType,
          resolutionPolicy: safetyHoldForm.resolutionPolicy.trim() || undefined,
        });
        showNotification('success', `Safety hold category '${safetyHoldForm.code}' created.`);
      }
      setIsAddSafetyHoldModalOpen(false);
      setEditingSafetyHold(null);
      setSafetyHoldForm({
        code: '',
        name: '',
        description: '',
        clinicalPracticeType: 'ALL',
        procedureCategories: '',
        facilityIds: '',
        sortOrder: 1,
        requiredReviewerRole: 'DOCTOR',
        requiredEvidenceType: 'NONE',
        resolutionPolicy: '',
      });
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to save safety hold category');
    }
  };

  const handleRunLegacyReconciliation = async (dryRun: boolean = false) => {
    try {
      setIsReconciling(true);
      const res = await reconcileLegacyMutation.mutateAsync({ dryRun });
      if (dryRun) {
        showNotification('success', `Dry run complete: ${res.reconciledCount} legacy holds detected across ${res.scannedCount} offers.`);
      } else {
        showNotification('success', `Reconciliation complete: Migrated ${res.createdHoldsCount} structured holds from legacy text. Clinical indications preserved!`);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to reconcile legacy safety holds');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleSaveSummaryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSummaryConfigMutation.mutateAsync(summaryConfigForm);
      showNotification('success', 'Clinical Summary display settings updated successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update summary configuration');
    }
  };

  return (
    <div className="settings-wrapper">
      <AdminSidebar
        activeNav="consultation-management"
        isDrawerOpen={isMobileMenuOpen}
        onCloseDrawer={() => setIsMobileMenuOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      <main className="settings-main">
        {/* Top Stationary Navbar */}
        <header className="settings-top-navbar">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold text-slate-800">Consultation Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <AdminProfileAvatar />
          </div>
        </header>

        {/* Scrollable Canvas for unclipped vertical scrolling */}
        <div className="settings-scroll-canvas">
          <div className="settings-content-wrapper">
            {notification && (
              <div
                className={`mb-2 p-4 rounded-lg flex items-center gap-3 ${
                  notification.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
            )}

            <div className="consultation-hub-container">
              {/* Tabs Navigation (Horizontally scrollable on small screens) */}
              <nav className="consultation-tabs-bar" aria-label="Consultation Hub navigation tabs">
                <button
                  className={`consultation-tab-btn ${activeTab === 'procedures' ? 'active' : ''}`}
                  onClick={() => setActiveTab('procedures')}
                  aria-selected={activeTab === 'procedures'}
                  role="tab"
                >
                  <Stethoscope size={16} /> Procedure Catalogue
                </button>
                <button
                  className={`consultation-tab-btn ${activeTab === 'chargemaster' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chargemaster')}
                  aria-selected={activeTab === 'chargemaster'}
                  role="tab"
                >
                  <Building2 size={16} /> Facility Chargemaster
                </button>
                <button
                  className={`consultation-tab-btn ${activeTab === 'financing' ? 'active' : ''}`}
                  onClick={() => setActiveTab('financing')}
                  aria-selected={activeTab === 'financing'}
                  role="tab"
                >
                  <DollarSign size={16} /> Financing Packages
                </button>
                <button
                  className={`consultation-tab-btn ${activeTab === 'scheduling' ? 'active' : ''}`}
                  onClick={() => setActiveTab('scheduling')}
                  aria-selected={activeTab === 'scheduling'}
                  role="tab"
                >
                  <Calendar size={16} /> Scheduling Policies
                </button>
                <button
                  className={`consultation-tab-btn ${activeTab === 'clearance-requirements' ? 'active' : ''}`}
                  onClick={() => setActiveTab('clearance-requirements')}
                  aria-selected={activeTab === 'clearance-requirements'}
                  role="tab"
                >
                  <ShieldCheck size={16} /> Clearance Requirements
                </button>
                <button
                  className={`consultation-tab-btn ${activeTab === 'clearance-policies' ? 'active' : ''}`}
                  onClick={() => setActiveTab('clearance-policies')}
                  aria-selected={activeTab === 'clearance-policies'}
                  role="tab"
                >
                  <CheckSquare size={16} /> Clinical Policies
                </button>
                <button
                  className={`consultation-tab-btn ${activeTab === 'master-data' ? 'active' : ''}`}
                  onClick={() => setActiveTab('master-data')}
                  aria-selected={activeTab === 'master-data'}
                  role="tab"
                >
                  <FileText size={16} /> Master Data & Remarks
                </button>
                <button
                  className={`consultation-tab-btn ${activeTab === 'safety-holds' ? 'active' : ''}`}
                  onClick={() => setActiveTab('safety-holds')}
                  aria-selected={activeTab === 'safety-holds'}
                  role="tab"
                >
                  <AlertTriangle size={16} /> Safety Hold Categories
                </button>
                <button
                  className={`consultation-tab-btn ${activeTab === 'summary-config' ? 'active' : ''}`}
                  onClick={() => setActiveTab('summary-config')}
                  aria-selected={activeTab === 'summary-config'}
                  role="tab"
                >
                  <Sliders size={16} /> Clinical Summary Config
                </button>
              </nav>

              {/* TAB: CLEARANCE REQUIREMENTS CATALOGUE */}
              {activeTab === 'clearance-requirements' && (
                <div className="consultation-card">
                  <div className="consultation-card-header">
                    <div>
                      <h2>Clearance Requirements Catalogue</h2>
                      <p>Database-backed clinical readiness requirements, required evidence types, and reviewer roles (10 per page).</p>
                    </div>
                    <div className="consultation-actions-row">
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search code, name..."
                          value={clearanceReqSearch}
                          onChange={(e) => {
                            setClearanceReqSearch(e.target.value);
                            setClearanceReqPage(1);
                          }}
                          className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-52 outline-none focus:border-teal-600"
                        />
                      </div>
                      <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                        value={clearanceReqCategory}
                        onChange={(e) => {
                          setClearanceReqCategory(e.target.value);
                          setClearanceReqPage(1);
                        }}
                      >
                        <option value="">All Categories</option>
                        <option value="ADMINISTRATIVE">Administrative</option>
                        <option value="CONSENT">Consent</option>
                        <option value="LABORATORY">Laboratory</option>
                        <option value="SPECIALIST_CLEARANCE">Specialist Clearance</option>
                        <option value="LOGISTICS">Logistics</option>
                        <option value="DISCHARGE_PLANNING">Discharge Planning</option>
                      </select>
                      <button
                        className="btn-primary-action"
                        onClick={() => {
                          setEditingClearanceReq(null);
                          setReqForm({
                            code: '',
                            name: '',
                            description: '',
                            category: 'GENERAL',
                            clinicalPracticeType: 'CARDIOLOGY',
                            requiredEvidenceType: 'NONE',
                            reviewerRole: 'ANY_CLINICIAN',
                            isMandatory: true,
                            isSchedulingPrerequisite: true,
                            sortOrder: (clearanceReqData?.data?.length || 0) + 1,
                          });
                          setIsAddClearanceReqModalOpen(true);
                        }}
                      >
                        <Plus size={16} /> + Add Requirement
                      </button>
                    </div>
                  </div>

                  <div className="consultation-table-container">
                    <table className="consultation-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Name</th>
                          <th>Category</th>
                          <th>Evidence Type</th>
                          <th>Reviewer Role</th>
                          <th>Mandatory</th>
                          <th>Booking Prereq</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isClearanceReqLoading ? (
                          <tr>
                            <td colSpan={9} className="text-center py-8 text-slate-500">
                              Loading requirements catalogue...
                            </td>
                          </tr>
                        ) : !clearanceReqData?.data || clearanceReqData.data.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-8 text-slate-500">
                              No clearance requirements found.
                            </td>
                          </tr>
                        ) : (
                          clearanceReqData.data.map((req) => (
                            <tr key={req.id}>
                              <td className="font-mono font-bold text-slate-800">{req.code}</td>
                              <td>
                                <div className="font-semibold text-slate-900">{req.name}</div>
                                <div className="text-xs text-slate-500 line-clamp-1">{req.description}</div>
                              </td>
                              <td>
                                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                                  {req.category}
                                </span>
                              </td>
                              <td className="text-xs text-slate-600">{req.requiredEvidenceType}</td>
                              <td className="text-xs text-slate-600">{req.reviewerRole}</td>
                              <td>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  req.isMandatory ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {req.isMandatory ? 'MANDATORY' : 'OPTIONAL'}
                                </span>
                              </td>
                              <td>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  req.isSchedulingPrerequisite ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {req.isSchedulingPrerequisite ? 'PREREQUISITE' : 'NO'}
                                </span>
                              </td>
                              <td>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                  req.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingClearanceReq(req);
                                      setReqForm({
                                        code: req.code,
                                        name: req.name,
                                        description: req.description || '',
                                        category: req.category,
                                        clinicalPracticeType: req.clinicalPracticeType,
                                        requiredEvidenceType: req.requiredEvidenceType,
                                        reviewerRole: req.reviewerRole,
                                        isMandatory: req.isMandatory,
                                        isSchedulingPrerequisite: Boolean(req.isSchedulingPrerequisite),
                                        sortOrder: req.sortOrder,
                                      });
                                      setIsAddClearanceReqModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-teal-600 rounded"
                                    title="Edit requirement"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await toggleClearanceReqMutation.mutateAsync({
                                          id: req.id,
                                          status: req.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                        });
                                        showNotification('success', `Status toggled for ${req.code}`);
                                      } catch (err: any) {
                                        showNotification('error', err.message || 'Failed to toggle status');
                                      }
                                    }}
                                    className={`p-1.5 rounded ${
                                      req.status === 'ACTIVE' ? 'text-emerald-600 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600'
                                    }`}
                                    title="Toggle status"
                                  >
                                    <Power size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete clearance requirement ${req.code}?`)) return;
                                      try {
                                        await deleteClearanceReqMutation.mutateAsync(req.id);
                                        showNotification('success', `Requirement ${req.code} deleted.`);
                                      } catch (err: any) {
                                        showNotification('error', err.message || 'Cannot delete requirement');
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                    title="Delete requirement"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <ConsultationPagination
                    currentPage={clearanceReqPage}
                    totalRecords={clearanceReqData?.meta?.total || 0}
                    pageSize={10}
                    onPageChange={(p) => setClearanceReqPage(p)}
                    isLoading={isClearanceReqLoading}
                  />
                </div>
              )}

              {/* TAB: CLINICAL CLEARANCE POLICIES */}
              {activeTab === 'clearance-policies' && (
                <div className="consultation-card">
                  <div className="consultation-card-header">
                    <div>
                      <h2>Clinical Clearance Policies</h2>
                      <p>Configurable facility & procedure-specific readiness gatekeeper policies (10 per page).</p>
                    </div>
                    <div className="consultation-actions-row">
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search policy..."
                          value={clearancePolicySearch}
                          onChange={(e) => {
                            setClearancePolicySearch(e.target.value);
                            setClearancePolicyPage(1);
                          }}
                          className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-52 outline-none focus:border-teal-600"
                        />
                      </div>
                      <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                        value={clearancePolicyFacilityId}
                        onChange={(e) => {
                          setClearancePolicyFacilityId(e.target.value);
                          setClearancePolicyPage(1);
                        }}
                      >
                        <option value="">All Facilities</option>
                        {facilities.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn-primary-action"
                        onClick={() => {
                          setEditingClearancePolicy(null);
                          setPolicyModalForm({
                            policyNumber: '',
                            name: '',
                            description: '',
                            facilityId: '',
                            procedureCode: '',
                            clinicalPracticeType: 'CARDIOLOGY',
                            workflowStage: 'PRE_PROCEDURAL',
                            schedulingPrerequisites: 'REQ-FIN-AUTH,REQ-CONSENT,REQ-LAB-METABOLIC,REQ-SPEC-CLEAR',
                          });
                          setPolicySelectedItems(
                            allActiveRequirements.map((r, idx) => ({
                              requirementId: r.id,
                              code: r.code,
                              name: r.name,
                              category: r.category,
                              isMandatory: r.isMandatory !== false,
                              sortOrder: idx + 1,
                              requiredSpecialties: r.requiredSpecialties && r.requiredSpecialties.length > 0
                                ? r.requiredSpecialties
                                : (r.category === 'SPECIALIST_CLEARANCE' ? ['ANESTHESIA', 'CARDIOLOGY', 'MEDICAL'] : []),
                              validityDays: 30,
                              isSchedulingPrerequisite: r.isSchedulingPrerequisite || false,
                            }))
                          );
                          setIsAddClearancePolicyModalOpen(true);
                        }}
                      >
                        <Plus size={16} /> + Create Policy
                      </button>
                    </div>
                  </div>

                  <div className="consultation-table-container">
                    <table className="consultation-table">
                      <thead>
                        <tr>
                          <th>Policy Number</th>
                          <th>Policy Name</th>
                          <th>Facility Scope</th>
                          <th>Procedure Scope</th>
                          <th>Items</th>
                          <th>Scheduling Prerequisites</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isClearancePoliciesLoading ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-500">
                              Loading clearance policies...
                            </td>
                          </tr>
                        ) : !clearancePoliciesData?.data || clearancePoliciesData.data.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-500">
                              No clearance policies found.
                            </td>
                          </tr>
                        ) : (
                          clearancePoliciesData.data.map((pol) => (
                            <tr key={pol.id}>
                              <td className="font-mono font-bold text-slate-800">{pol.policyNumber}</td>
                              <td>
                                <div className="font-semibold text-slate-900">{pol.name}</div>
                                <div className="text-xs text-slate-500 line-clamp-1">{pol.description}</div>
                              </td>
                              <td className="text-xs text-slate-700">
                                {pol.facility ? pol.facility.name : <span className="italic text-slate-400">All Facilities (Global)</span>}
                              </td>
                              <td className="text-xs font-mono text-slate-700">
                                {pol.procedureCode || <span className="italic text-slate-400 font-sans">All Procedures</span>}
                              </td>
                              <td>
                                <span className="bg-purple-50 text-[#3f1d8b] text-xs font-bold px-2 py-0.5 rounded-full border border-purple-200">
                                  {pol.items?.length || 0} Requirements
                                </span>
                              </td>
                              <td>
                                <div className="text-[11px] text-slate-600 font-mono">
                                  {Array.isArray(pol.schedulingPrerequisites) && pol.schedulingPrerequisites.length > 0
                                    ? pol.schedulingPrerequisites.join(', ')
                                    : 'None'}
                                </div>
                              </td>
                              <td>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                  pol.status === 'PUBLISHED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {pol.status}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingClearancePolicy(pol);
                                      setPolicyModalForm({
                                        policyNumber: pol.policyNumber,
                                        name: pol.name,
                                        description: pol.description || '',
                                        facilityId: pol.facilityId || '',
                                        procedureCode: pol.procedureCode || '',
                                        clinicalPracticeType: pol.clinicalPracticeType,
                                        workflowStage: pol.workflowStage || 'PRE_PROCEDURAL',
                                        schedulingPrerequisites: Array.isArray(pol.schedulingPrerequisites)
                                          ? pol.schedulingPrerequisites.join(',')
                                          : '',
                                      });
                                      if (pol.items && pol.items.length > 0) {
                                        setPolicySelectedItems(
                                          pol.items.map((it, idx) => ({
                                            requirementId: it.requirement?.id || it.requirementId,
                                            code: it.requirement?.code || it.requirementId,
                                            name: it.requirement?.name || it.requirement?.code || it.requirementId,
                                            category: it.requirement?.category || 'GENERAL',
                                            isMandatory: it.isMandatory !== false,
                                            sortOrder: it.sortOrder || idx + 1,
                                            requiredSpecialties: it.requiredSpecialties || [],
                                            validityDays: it.validityDays || 30,
                                            isSchedulingPrerequisite: Array.isArray(pol.schedulingPrerequisites) && pol.schedulingPrerequisites.includes(it.requirement?.code || ''),
                                          }))
                                        );
                                      } else {
                                        setPolicySelectedItems([]);
                                      }
                                      setIsAddClearancePolicyModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-teal-600 rounded"
                                    title="Edit policy"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete policy ${pol.policyNumber}?`)) return;
                                      try {
                                        await deleteClearancePolicyMutation.mutateAsync(pol.id);
                                        showNotification('success', `Policy ${pol.policyNumber} deleted.`);
                                      } catch (err: any) {
                                        showNotification('error', err.message || 'Cannot delete policy');
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                    title="Delete policy"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <ConsultationPagination
                    currentPage={clearancePolicyPage}
                    totalRecords={clearancePoliciesData?.meta?.total || 0}
                    pageSize={10}
                    onPageChange={(p) => setClearancePolicyPage(p)}
                    isLoading={isClearancePoliciesLoading}
                  />
                </div>
              )}
              {activeTab === 'procedures' && (
                <div className="consultation-card">
                  <div className="consultation-card-header">
                    <div>
                      <h2>Standard Procedure Catalogue</h2>
                      <p>Database-backed clinical procedures, CPT codes, and baseline institutional charges (10 per page).</p>
                    </div>
                    <div className="consultation-actions-row">
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search code, name..."
                          value={procedureSearch}
                          onChange={(e) => {
                            setProcedureSearch(e.target.value);
                            setProcedurePage(1);
                          }}
                          className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 outline-none focus:border-teal-600"
                        />
                      </div>
                      <button className="btn-primary-action" onClick={() => setIsAddProcedureModalOpen(true)}>
                        <Plus size={16} /> + Add Procedure
                      </button>
                    </div>
                  </div>

                  <div className="consultation-table-container">
                    <table className="consultation-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Procedure Name</th>
                          <th>Category</th>
                          <th>Standard Charge</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isProceduresLoading ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-500">
                              Loading procedure catalogue...
                            </td>
                          </tr>
                        ) : procedures.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-500">
                              No procedures matching search criteria.
                            </td>
                          </tr>
                        ) : (
                          procedures.map((proc) => (
                            <tr key={proc.code}>
                              <td className="font-mono font-bold text-slate-800">{proc.code}</td>
                              <td>
                                <div className="font-medium text-slate-900">{proc.name}</div>
                                {proc.description && (
                                  <div className="text-xs text-slate-500 truncate max-w-md">{proc.description}</div>
                                )}
                              </td>
                              <td>
                                <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                                  {proc.category}
                                </span>
                              </td>
                              <td className="font-semibold text-slate-900">
                                ${(proc.standardCharge || 0).toLocaleString()}
                              </td>
                              <td>
                                {proc.isOfficialCpt ? (
                                  <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                    Official CPT
                                  </span>
                                ) : (
                                  <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                                    Local
                                  </span>
                                )}
                              </td>
                              <td>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    proc.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {proc.status}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <button
                                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                                    onClick={() => {
                                      setProcForm({
                                        code: proc.code,
                                        name: proc.name,
                                        category: proc.category || 'CARDIOLOGY',
                                        standardCharge: String(proc.standardCharge || 0),
                                        description: proc.description || '',
                                        isOfficialCpt: proc.isOfficialCpt || false,
                                      });
                                      setEditingProcedure(proc);
                                      setIsAddProcedureModalOpen(true);
                                    }}
                                    title="Edit Procedure"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    className="p-1.5 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50"
                                    onClick={async () => {
                                      if (confirm(`Deactivate procedure '${proc.code}'?`)) {
                                        await deleteProcedureMutation.mutateAsync(proc.code);
                                        showNotification('success', `Procedure '${proc.code}' deactivated.`);
                                      }
                                    }}
                                    title="Deactivate"
                                  >
                                    <Power size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <ConsultationPagination
                    currentPage={procedurePage}
                    totalRecords={totalProcRecords}
                    pageSize={10}
                    onPageChange={(p) => setProcedurePage(p)}
                    isLoading={isProceduresLoading}
                  />
                </div>
              )}

              {/* TAB 2: FACILITY CHARGEMASTER */}
              {activeTab === 'chargemaster' && (
                <div className="consultation-card">
                  <div className="consultation-card-header">
                    <div>
                      <h2>Facility Chargemaster & Price Overrides</h2>
                      <p>Manage facility-specific procedure prices, effective dates, and discount rates (10 per page).</p>
                    </div>
                    <div className="consultation-actions-row">
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search chargemaster..."
                          value={chargemasterSearch}
                          onChange={(e) => setChargemasterSearch(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-60 outline-none focus:border-teal-600"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-700">Facility:</label>
                        <select
                          className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                          value={selectedFacilityId}
                          onChange={(e) => setSelectedFacilityId(e.target.value)}
                        >
                          {facilities.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} {f.code ? `(${f.code})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="consultation-table-container">
                    <table className="consultation-table">
                      <thead>
                        <tr>
                          <th>CPT / Code</th>
                          <th>Procedure Name</th>
                          <th>Base Price</th>
                          <th>Effective Price</th>
                          <th>Currency</th>
                          <th>Override Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isChargemasterLoading ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-500">
                              Loading chargemaster...
                            </td>
                          </tr>
                        ) : pagedChargemaster.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-500">
                              {chargemasterItems.length === 0
                                ? 'No chargemaster items found for this facility.'
                                : 'No chargemaster items matching search criteria.'}
                            </td>
                          </tr>
                        ) : (
                          pagedChargemaster.map((item) => (
                            <tr key={item.cptCode}>
                              <td className="font-mono font-bold text-slate-800">{item.cptCode}</td>
                              <td className="font-medium text-slate-900">{item.procedureName}</td>
                              <td className="text-slate-500">
                                {item.currency} {(item.baseCharge || 0).toLocaleString()}
                              </td>
                              <td className="font-bold text-slate-900">
                                {item.currency} {(item.standardCharge || 0).toLocaleString()}
                              </td>
                              <td>
                                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                                  {item.currency}
                                </span>
                              </td>
                              <td>
                                {item.isFacilityOverride ? (
                                  <span className="badge-override">Facility Override</span>
                                ) : (
                                  <span className="badge-standard">Institutional Standard</span>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn-secondary-action"
                                  onClick={() => {
                                    setSelectedChargemasterItem(item);
                                    setOverridePrice(String(item.standardCharge));
                                    setOverrideCurrency(item.currency || 'USD');
                                    setIsSetPriceModalOpen(true);
                                  }}
                                >
                                  Override Price
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <ConsultationPagination
                    currentPage={chargemasterPage}
                    totalRecords={filteredChargemaster.length}
                    pageSize={10}
                    onPageChange={(p) => setChargemasterPage(p)}
                    isLoading={isChargemasterLoading}
                  />
                </div>
              )}

              {/* TAB 3: FINANCING PACKAGES */}
              {activeTab === 'financing' && (
                <div className="consultation-card">
                  <div className="consultation-card-header">
                    <div>
                      <h2>Healthcare Financing Packages</h2>
                      <p>Configure approved lender programs, promotional APRs, tenures, and down payment rates (10 per page).</p>
                    </div>
                    <div className="consultation-actions-row">
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search packages..."
                          value={financingSearch}
                          onChange={(e) => setFinancingSearch(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-60 outline-none focus:border-teal-600"
                        />
                      </div>
                      <button className="btn-primary-action" onClick={() => setIsAddFinancingModalOpen(true)}>
                        <Plus size={16} /> + Add Financing Package
                      </button>
                    </div>
                  </div>

                  <div className="consultation-table-container">
                    <table className="consultation-table">
                      <thead>
                        <tr>
                          <th>Package Code</th>
                          <th>Plan Name</th>
                          <th>Provider</th>
                          <th>APR (%)</th>
                          <th>Down Payment</th>
                          <th>Tenures</th>
                          <th>Processing Fee</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isFinancingLoading ? (
                          <tr>
                            <td colSpan={9} className="text-center py-8 text-slate-500">
                              Loading financing packages...
                            </td>
                          </tr>
                        ) : pagedFinancing.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-8 text-slate-500">
                              {financingPackages.length === 0
                                ? 'No financing packages registered.'
                                : 'No financing packages matching search criteria.'}
                            </td>
                          </tr>
                        ) : (
                          pagedFinancing.map((pkg) => (
                            <tr key={pkg.id}>
                              <td className="font-mono font-bold text-slate-800">{pkg.code}</td>
                              <td className="font-semibold text-slate-900">{pkg.name}</td>
                              <td className="text-slate-600">{pkg.provider}</td>
                              <td className="font-bold text-emerald-700">
                                {pkg.apr === 0 ? '0% (Promotional)' : `${pkg.apr}%`}
                              </td>
                              <td>{pkg.minDownPaymentPercent}%</td>
                              <td>
                                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                  {Array.isArray(pkg.tenureMonths) ? pkg.tenureMonths.join(', ') : '6, 12, 24'} Mo
                                </span>
                              </td>
                              <td>${pkg.processingFee}</td>
                              <td>
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                    pkg.isActive
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {pkg.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <button
                                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                                    onClick={() => {
                                      setFinForm({
                                        code: pkg.code,
                                        name: pkg.name,
                                        provider: pkg.provider,
                                        apr: String(pkg.apr ?? 0),
                                        minDownPaymentPercent: String(pkg.minDownPaymentPercent ?? 10),
                                        maxLoanMultiplier: String(pkg.maxLoanMultiplier ?? 1.5),
                                        minCreditScore: String(pkg.minCreditScore ?? 600),
                                        processingFee: String(pkg.processingFee ?? 0),
                                        description: pkg.description ?? '',
                                      });
                                      setEditingFinancing(pkg);
                                      setIsAddFinancingModalOpen(true);
                                    }}
                                    title="Edit Package"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    className={`p-1.5 rounded ${
                                      pkg.isActive
                                        ? 'text-amber-600 hover:bg-amber-50'
                                        : 'text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                    onClick={async () => {
                                      await toggleFinancingStatusMutation.mutateAsync({
                                        id: pkg.id,
                                        isActive: !pkg.isActive,
                                      });
                                      showNotification('success', `Package status toggled.`);
                                    }}
                                    title={pkg.isActive ? 'Deactivate' : 'Activate'}
                                  >
                                    <Power size={15} />
                                  </button>
                                  <button
                                    className="p-1.5 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50"
                                    onClick={async () => {
                                      if (confirm(`Delete package '${pkg.code}'?`)) {
                                        try {
                                          await deleteFinancingMutation.mutateAsync(pkg.id);
                                          showNotification('success', `Package '${pkg.code}' deleted.`);
                                        } catch (err: any) {
                                          showNotification('error', err.message || 'Cannot delete package');
                                        }
                                      }
                                    }}
                                    title="Delete Package"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <ConsultationPagination
                    currentPage={financingPage}
                    totalRecords={filteredFinancing.length}
                    pageSize={10}
                    onPageChange={(p) => setFinancingPage(p)}
                    isLoading={isFinancingLoading}
                  />
                </div>
              )}

              {/* TAB 4: SCHEDULING & APPOINTMENT POLICIES */}
              {activeTab === 'scheduling' && (
                <div className="consultation-card">
                  <div className="consultation-card-header">
                    <div>
                      <h2>Appointment & Slot Booking Policies</h2>
                      <p>Enforce lead times, booking horizons, cancellation windows, and slot parameters.</p>
                    </div>
                  </div>

                  {isPolicyLoading ? (
                    <div className="py-8 text-center text-slate-500">Loading policy settings...</div>
                  ) : (
                    <form onSubmit={handleSavePolicy}>
                      <div className="policy-form-grid">
                        <div className="policy-field-group">
                          <label>Minimum Cancellation Notice (Hours)</label>
                          <input
                            type="number"
                            value={policyForm.minNoticeHoursCancel}
                            onChange={(e) =>
                              setPolicyForm({ ...policyForm, minNoticeHoursCancel: parseInt(e.target.value, 10) || 0 })
                            }
                            min={0}
                            required
                          />
                          <span className="text-xs text-slate-500">Cancellations closer than this window require admin override.</span>
                        </div>

                        <div className="policy-field-group">
                          <label>Minimum Reschedule Notice (Hours)</label>
                          <input
                            type="number"
                            value={policyForm.minNoticeHoursReschedule}
                            onChange={(e) =>
                              setPolicyForm({ ...policyForm, minNoticeHoursReschedule: parseInt(e.target.value, 10) || 0 })
                            }
                            min={0}
                            required
                          />
                        </div>

                        <div className="policy-field-group">
                          <label>Maximum Allowed Reschedules</label>
                          <input
                            type="number"
                            value={policyForm.maxReschedulesAllowed}
                            onChange={(e) =>
                              setPolicyForm({ ...policyForm, maxReschedulesAllowed: parseInt(e.target.value, 10) || 0 })
                            }
                            min={1}
                            required
                          />
                        </div>

                        <div className="policy-field-group">
                          <label>Temporary Slot Hold Duration (Minutes)</label>
                          <input
                            type="number"
                            value={policyForm.slotHoldMinutes}
                            onChange={(e) =>
                              setPolicyForm({ ...policyForm, slotHoldMinutes: parseInt(e.target.value, 10) || 0 })
                            }
                            min={5}
                            required
                          />
                        </div>

                        <div className="policy-field-group">
                          <label>Maximum Advance Booking Window (Days)</label>
                          <input
                            type="number"
                            value={policyForm.maxAdvanceBookingDays}
                            onChange={(e) =>
                              setPolicyForm({ ...policyForm, maxAdvanceBookingDays: parseInt(e.target.value, 10) || 0 })
                            }
                            min={7}
                            required
                          />
                        </div>

                        <div className="policy-field-group">
                          <label>Default Slot Duration (Minutes)</label>
                          <input
                            type="number"
                            value={policyForm.defaultSlotDuration}
                            onChange={(e) =>
                              setPolicyForm({ ...policyForm, defaultSlotDuration: parseInt(e.target.value, 10) || 0 })
                            }
                            min={10}
                            required
                          />
                        </div>

                        <div className="policy-field-group">
                          <label>Default Slot Buffer Interval (Minutes)</label>
                          <input
                            type="number"
                            value={policyForm.defaultBufferMinutes}
                            onChange={(e) =>
                              setPolicyForm({ ...policyForm, defaultBufferMinutes: parseInt(e.target.value, 10) || 0 })
                            }
                            min={0}
                            required
                          />
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end">
                        <button type="submit" className="btn-primary-action">
                          <Save size={16} /> Save Policies
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 5: MASTER DATA & REMARK TEMPLATES */}
              {activeTab === 'master-data' && (
                <div className="consultation-card">
                  <div className="consultation-card-header">
                    <div>
                      <h2>Consultation Master Data & Templates</h2>
                      <p>Administer dynamic consultation reasons, cancellation indications, and clinical remark templates (10 per page).</p>
                    </div>
                    <div className="consultation-actions-row">
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search items..."
                          value={masterDataSearch}
                          onChange={(e) => setMasterDataSearch(e.target.value)}
                          className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-52 outline-none focus:border-teal-600"
                        />
                      </div>
                      <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                        value={masterDataCategory}
                        onChange={(e) => setMasterDataCategory(e.target.value)}
                      >
                        <option value="CONSULTATION_REASONS">Consultation Reasons</option>
                        <option value="CANCELLATION_REASONS">Cancellation Reasons</option>
                        <option value="CLINICAL_REMARK_TEMPLATES">Clinical Remark Templates</option>
                        <option value="APPOINTMENT_MODALITIES">Appointment Modalities</option>
                      </select>
                      <button className="btn-primary-action" onClick={() => setIsAddMasterDataModalOpen(true)}>
                        <Plus size={16} /> + Add Item
                      </button>
                    </div>
                  </div>

                  <div className="consultation-table-container">
                    <table className="consultation-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Name / Title</th>
                          <th>Description / Template Text</th>
                          <th>Sort Order</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isMasterDataLoading ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-500">
                              Loading master data...
                            </td>
                          </tr>
                        ) : pagedMasterData.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-500">
                              {masterDataItems.length === 0
                                ? 'No master data items found in category.'
                                : 'No master data items matching search criteria.'}
                            </td>
                          </tr>
                        ) : (
                          pagedMasterData.map((item) => (
                            <tr key={item.id}>
                              <td className="font-mono font-bold text-slate-800">{item.code}</td>
                              <td className="font-semibold text-slate-900">{item.name}</td>
                              <td className="text-slate-600 text-sm">{item.description || '—'}</td>
                              <td>{item.sortOrder || 1}</td>
                              <td>
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                    item.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <ConsultationPagination
                    currentPage={masterDataPage}
                    totalRecords={filteredMasterData.length}
                    pageSize={10}
                    onPageChange={(p) => setMasterDataPage(p)}
                    isLoading={isMasterDataLoading}
                  />
                </div>
              )}

              {/* TAB 6: CLINICAL SAFETY HOLD CATEGORIES */}
              {activeTab === 'safety-holds' && (
                <div className="consultation-card">
                  <div className="consultation-card-header">
                    <div>
                      <h2>Clinical Safety Hold Categories</h2>
                      <p>Administer dynamic clinical hazard categories, reviewer qualifications, and resolution policies (10 per page).</p>
                    </div>
                    <div className="consultation-actions-row">
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={safetyHoldSearch}
                          onChange={(e) => {
                            setSafetyHoldSearch(e.target.value);
                            setSafetyHoldPage(1);
                          }}
                          className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-48 outline-none focus:border-teal-600"
                        />
                      </div>
                      <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                        value={safetyHoldPracticeType}
                        onChange={(e) => {
                          setSafetyHoldPracticeType(e.target.value);
                          setSafetyHoldPage(1);
                        }}
                      >
                        <option value="">All Specialties</option>
                        <option value="ALL">Global / General</option>
                        <option value="CARDIOLOGY">Cardiology / Cath Lab</option>
                        <option value="SURGERY">Surgery</option>
                        <option value="ANESTHESIA">Anesthesia</option>
                      </select>
                      <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                        value={safetyHoldStatusFilter}
                        onChange={(e) => {
                          setSafetyHoldStatusFilter(e.target.value);
                          setSafetyHoldPage(1);
                        }}
                      >
                        <option value="">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                      <button
                        className="btn-primary-action"
                        onClick={() => {
                          setEditingSafetyHold(null);
                          setSafetyHoldForm({
                            code: '',
                            name: '',
                            description: '',
                            clinicalPracticeType: 'ALL',
                            procedureCategories: '',
                            facilityIds: '',
                            sortOrder: (safetyHoldCategoriesData?.data?.length || 0) + 1,
                            requiredReviewerRole: 'DOCTOR',
                            requiredEvidenceType: 'NONE',
                            resolutionPolicy: '',
                          });
                          setIsAddSafetyHoldModalOpen(true);
                        }}
                      >
                        <Plus size={16} /> + Add Category
                      </button>
                    </div>
                  </div>

                  {/* Legacy Data Integrity & Audit Banner */}
                  <div className="mx-6 my-3 p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                      <div>
                        <div className="text-sm font-bold text-amber-950">
                          Consultation Historical Integrity & Separation Governance
                        </div>
                        <p className="text-xs text-amber-800 mt-0.5">
                          {isReconStatusLoading
                            ? 'Scanning consultation offers...'
                            : reconciliationStatus
                            ? `${reconciliationStatus.contaminatedOffers} of ${reconciliationStatus.totalOffers} historical offers contain legacy inline hold markers. Structured records: ${reconciliationStatus.totalStructuredHolds}.`
                            : 'All consultation offers parsed cleanly into structured workflow holds.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        disabled={isReconciling}
                        onClick={() => handleRunLegacyReconciliation(true)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        Dry Run Check
                      </button>
                      <button
                        disabled={isReconciling}
                        onClick={() => handleRunLegacyReconciliation(false)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                      >
                        <RefreshCw size={13} className={isReconciling ? 'animate-spin' : ''} />
                        {isReconciling ? 'Reconciling...' : 'Reconcile Legacy Data'}
                      </button>
                    </div>
                  </div>

                  <div className="consultation-table-container">
                    <table className="consultation-table">
                      <thead>
                        <tr>
                          <th>Category Code</th>
                          <th>Display Name</th>
                          <th>Practice Type</th>
                          <th>Reviewer Role</th>
                          <th>Evidence Type</th>
                          <th>Sort</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isSafetyHoldCategoriesLoading ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-500">
                              Loading safety hold categories...
                            </td>
                          </tr>
                        ) : !safetyHoldCategoriesData?.data || safetyHoldCategoriesData.data.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-500">
                              No safety hold categories found.
                            </td>
                          </tr>
                        ) : (
                          safetyHoldCategoriesData.data.map((cat) => (
                            <tr key={cat.id}>
                              <td className="font-mono font-bold text-slate-800">{cat.code}</td>
                              <td>
                                <div className="font-semibold text-slate-900">{cat.name}</div>
                                {cat.description && (
                                  <div className="text-xs text-slate-500 line-clamp-1">{cat.description}</div>
                                )}
                              </td>
                              <td>
                                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                                  {cat.clinicalPracticeType || 'ALL'}
                                </span>
                              </td>
                              <td className="text-xs text-slate-600">{cat.requiredReviewerRole || 'DOCTOR'}</td>
                              <td className="text-xs text-slate-600">{cat.requiredEvidenceType || 'NONE'}</td>
                              <td className="text-xs text-slate-600">{cat.sortOrder ?? 1}</td>
                              <td>
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                    cat.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {cat.status}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingSafetyHold(cat);
                                      setSafetyHoldForm({
                                        code: cat.code,
                                        name: cat.name,
                                        description: cat.description || '',
                                        clinicalPracticeType: cat.clinicalPracticeType || 'ALL',
                                        procedureCategories: (cat.procedureCategories || []).join(', '),
                                        facilityIds: (cat.facilityIds || []).join(', '),
                                        sortOrder: cat.sortOrder ?? 1,
                                        requiredReviewerRole: cat.requiredReviewerRole || 'DOCTOR',
                                        requiredEvidenceType: cat.requiredEvidenceType || 'NONE',
                                        resolutionPolicy: cat.resolutionPolicy || '',
                                      });
                                      setIsAddSafetyHoldModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-teal-600 rounded"
                                    title="Edit category"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await toggleSafetyHoldCategoryStatusMutation.mutateAsync({
                                          id: cat.id,
                                          status: cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                        });
                                        showNotification('success', `Status updated for ${cat.code}`);
                                      } catch (err: any) {
                                        showNotification('error', err.message || 'Failed to toggle status');
                                      }
                                    }}
                                    className={`p-1.5 rounded ${
                                      cat.status === 'ACTIVE'
                                        ? 'text-emerald-600 hover:text-rose-600'
                                        : 'text-slate-400 hover:text-emerald-600'
                                    }`}
                                    title="Toggle status"
                                  >
                                    <Power size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete safety hold category ${cat.code}?`)) return;
                                      try {
                                        await deleteSafetyHoldCategoryMutation.mutateAsync(cat.id);
                                        showNotification('success', `Category ${cat.code} deleted.`);
                                      } catch (err: any) {
                                        showNotification('error', err.message || 'Cannot delete category');
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                                    title="Delete category"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <ConsultationPagination
                    currentPage={safetyHoldPage}
                    totalRecords={safetyHoldCategoriesData?.meta?.total || 0}
                    pageSize={10}
                    onPageChange={(p) => setSafetyHoldPage(p)}
                    isLoading={isSafetyHoldCategoriesLoading}
                  />
                </div>
              )}

              {/* TAB 7: CLINICAL SUMMARY DISPLAY CONFIGURATION */}
              {activeTab === 'summary-config' && (
                <div className="consultation-card">
                  <div className="consultation-card-header">
                    <div>
                      <h2>Clinical Summary & Clearance Display Configuration</h2>
                      <p>
                        Configure the visibility of technical metadata, human-readable clinical indications, and default panel collapse states across Doctor Web consultation pages.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveSummaryConfig} className="p-6 space-y-6 max-w-3xl">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                        Primary Treatment Summary Sections
                      </h3>

                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={summaryConfigForm.showProcedureCode}
                          onChange={(e) =>
                            setSummaryConfigForm({ ...summaryConfigForm, showProcedureCode: e.target.checked })
                          }
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Display Procedure CPT/Code Badge</div>
                          <div className="text-xs text-slate-500">
                            Shows procedure code badges (e.g. CPT 93458) alongside procedure name in the summary card.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={summaryConfigForm.showClinicalIndication}
                          onChange={(e) =>
                            setSummaryConfigForm({ ...summaryConfigForm, showClinicalIndication: e.target.checked })
                          }
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Display Clinical Indication / Narrative</div>
                          <div className="text-xs text-slate-500">
                            Guarantees sanitized human-readable clinical rationale is displayed in the Primary Treatment Summary.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={summaryConfigForm.showFacility}
                          onChange={(e) =>
                            setSummaryConfigForm({ ...summaryConfigForm, showFacility: e.target.checked })
                          }
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Display Facility & Operating Suite</div>
                          <div className="text-xs text-slate-500">
                            Shows facility name and specialty unit on clearance and handoff screens.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={summaryConfigForm.showSupervisingAttending}
                          onChange={(e) =>
                            setSummaryConfigForm({ ...summaryConfigForm, showSupervisingAttending: e.target.checked })
                          }
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Display Supervising Attending Clinician</div>
                          <div className="text-xs text-slate-500">
                            Shows clinician designation and NPI credentials in treatment summary.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                        Safety Hold History & Governance Panel
                      </h3>

                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={summaryConfigForm.showSafetyHoldHistory}
                          onChange={(e) =>
                            setSummaryConfigForm({ ...summaryConfigForm, showSafetyHoldHistory: e.target.checked })
                          }
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Display Clinical Safety Hold History Section</div>
                          <div className="text-xs text-slate-500">
                            Renders a dedicated, structured safety hold panel with status badges and resolution details separate from the clinical indication narrative.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={summaryConfigForm.safetyHoldPanelCollapsedByDefault}
                          onChange={(e) =>
                            setSummaryConfigForm({
                              ...summaryConfigForm,
                              safetyHoldPanelCollapsedByDefault: e.target.checked,
                            })
                          }
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Default Safety Hold Panel to Collapsed State</div>
                          <div className="text-xs text-slate-500">
                            When enabled, the safety hold panel is collapsed by default unless active unresolved holds exist.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={summaryConfigForm.requireClinicalReviewForHoldClearance}
                          onChange={(e) =>
                            setSummaryConfigForm({
                              ...summaryConfigForm,
                              requireClinicalReviewForHoldClearance: e.target.checked,
                            })
                          }
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">Require Peer Clinician Review for Safety Hold Clearance</div>
                          <div className="text-xs text-slate-500">
                            Prevents safety hold clearance without credentialed doctor review attestation.
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-end">
                      <button
                        type="submit"
                        disabled={updateSummaryConfigMutation.isPending}
                        className="btn-primary-action flex items-center gap-2"
                      >
                        <Save size={16} />
                        {updateSummaryConfigMutation.isPending ? 'Saving...' : 'Save Display Configuration'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: ADD / EDIT PROCEDURE */}
      {isAddProcedureModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800">
                {editingProcedure ? `Edit Procedure (${editingProcedure.code})` : 'Add New Procedure'}
              </h3>
              <button
                onClick={() => {
                  setIsAddProcedureModalOpen(false);
                  setEditingProcedure(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveProcedure} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure Code *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingProcedure}
                  placeholder="e.g. 93458 or LOCAL-PROC-01"
                  value={procForm.code}
                  onChange={(e) => setProcForm({ ...procForm, code: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Left Heart Catheterization"
                  value={procForm.name}
                  onChange={(e) => setProcForm({ ...procForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={procForm.category}
                    onChange={(e) => setProcForm({ ...procForm, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="CARDIOLOGY">Cardiology</option>
                    <option value="DIAGNOSTIC_CARDIOLOGY">Diagnostic Cardiology</option>
                    <option value="CARDIOVASCULAR_SURGERY">Cardiovascular Surgery</option>
                    <option value="EVALUATION_MANAGEMENT">Evaluation & Management</option>
                    <option value="LABORATORY">Laboratory</option>
                    <option value="RADIOLOGY">Radiology</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Charge ($) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="150000"
                    value={procForm.standardCharge}
                    onChange={(e) => setProcForm({ ...procForm, standardCharge: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Clinical procedural description..."
                  value={procForm.description}
                  onChange={(e) => setProcForm({ ...procForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isOfficialCpt"
                  checked={procForm.isOfficialCpt}
                  onChange={(e) => setProcForm({ ...procForm, isOfficialCpt: e.target.checked })}
                />
                <label htmlFor="isOfficialCpt" className="text-xs text-slate-700">
                  Official AMA CPT Code (uncheck for facility local procedure)
                </label>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddProcedureModalOpen(false);
                    setEditingProcedure(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  {editingProcedure ? 'Update Procedure' : 'Create Procedure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: OVERRIDE FACILITY PRICE */}
      {isSetPriceModalOpen && selectedChargemasterItem && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800">Override Facility Price</h3>
              <button onClick={() => setIsSetPriceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSavePriceOverride} className="mt-4 space-y-4">
              <div>
                <div className="text-xs text-slate-500">Procedure</div>
                <div className="font-bold text-slate-800">
                  {selectedChargemasterItem.cptCode} — {selectedChargemasterItem.procedureName}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Institutional Base Price</div>
                <div className="font-medium text-slate-600">
                  {selectedChargemasterItem.currency} {(selectedChargemasterItem.baseCharge || 0).toLocaleString()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Override Price *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={overridePrice}
                    onChange={(e) => setOverridePrice(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency (ISO 4217) *</label>
                  <select
                    required
                    value={overrideCurrency}
                    onChange={(e) => setOverrideCurrency(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    {ISO_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSetPriceModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT FINANCING PACKAGE */}
      {isAddFinancingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800">
                {editingFinancing ? `Edit Financing Package (${editingFinancing.code})` : 'Register Financing Package'}
              </h3>
              <button
                onClick={() => {
                  setIsAddFinancingModalOpen(false);
                  setEditingFinancing(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveFinancing} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Package Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingFinancing}
                    placeholder="FP-MEDPAY-0"
                    value={finForm.code}
                    onChange={(e) => setFinForm({ ...finForm, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Partner Provider *</label>
                  <input
                    type="text"
                    required
                    placeholder="CareCredit, MedPay..."
                    value={finForm.provider}
                    onChange={(e) => setFinForm({ ...finForm, provider: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="0% APR Promotional Healthcare Credit"
                  value={finForm.name}
                  onChange={(e) => setFinForm({ ...finForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">APR (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={finForm.apr}
                    onChange={(e) => setFinForm({ ...finForm, apr: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Down (%) *</label>
                  <input
                    type="number"
                    required
                    value={finForm.minDownPaymentPercent}
                    onChange={(e) => setFinForm({ ...finForm, minDownPaymentPercent: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fee ($)</label>
                  <input
                    type="number"
                    value={finForm.processingFee}
                    onChange={(e) => setFinForm({ ...finForm, processingFee: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Plan features, credit qualification..."
                  value={finForm.description}
                  onChange={(e) => setFinForm({ ...finForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddFinancingModalOpen(false);
                    setEditingFinancing(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  {editingFinancing ? 'Update Package' : 'Register Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CLEARANCE REQUIREMENT */}
      {isAddClearanceReqModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800">
                {editingClearanceReq ? `Edit Requirement (${editingClearanceReq.code})` : 'Add Clearance Requirement'}
              </h3>
              <button
                onClick={() => {
                  setIsAddClearanceReqModalOpen(false);
                  setEditingClearanceReq(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveClearanceReq} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Requirement Code *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingClearanceReq)}
                    placeholder="REQ-LAB-METABOLIC"
                    value={reqForm.code}
                    onChange={(e) => setReqForm({ ...reqForm, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 font-mono disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={reqForm.category}
                    onChange={(e) => setReqForm({ ...reqForm, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="ADMINISTRATIVE">Administrative</option>
                    <option value="CONSENT">Consent</option>
                    <option value="LABORATORY">Laboratory</option>
                    <option value="SPECIALIST_CLEARANCE">Specialist Clearance</option>
                    <option value="LOGISTICS">Logistics</option>
                    <option value="DISCHARGE_PLANNING">Discharge Planning</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pre-Procedure Metabolic & Coagulation Panel"
                  value={reqForm.name}
                  onChange={(e) => setReqForm({ ...reqForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Clinical Purpose</label>
                <textarea
                  rows={2}
                  placeholder="Clinical rationale, test guidelines, or clearance verification instructions..."
                  value={reqForm.description}
                  onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Required Evidence</label>
                  <select
                    value={reqForm.requiredEvidenceType}
                    onChange={(e) => setReqForm({ ...reqForm, requiredEvidenceType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="NONE">None (Clinical Attestation Only)</option>
                    <option value="LAB_RESULT">Verified Laboratory Report</option>
                    <option value="DOCUMENT">Uploaded Document / PDF</option>
                    <option value="SPECIALIST_NOTE">Specialist Peer Review Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reviewer Role</label>
                  <select
                    value={reqForm.reviewerRole}
                    onChange={(e) => setReqForm({ ...reqForm, reviewerRole: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="ANY_CLINICIAN">Any Authorized Clinician</option>
                    <option value="ATTENDING_PHYSICIAN">Attending Physician Only</option>
                    <option value="SPECIALIST">Credentialed Specialist</option>
                    <option value="ADMINISTRATOR">Administrative Staff</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reqForm.isMandatory}
                    onChange={(e) => setReqForm({ ...reqForm, isMandatory: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Mandatory Requirement</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reqForm.isSchedulingPrerequisite}
                    onChange={(e) => setReqForm({ ...reqForm, isSchedulingPrerequisite: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Procedural Booking Prerequisite</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddClearanceReqModalOpen(false);
                    setEditingClearanceReq(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  {editingClearanceReq ? 'Save Changes' : 'Register Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CLEARANCE POLICY */}
      {isAddClearancePolicyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-lg text-slate-800">
                  {editingClearancePolicy ? `Edit Policy (${editingClearancePolicy.policyNumber})` : 'Create Clinical Policy'}
                </h3>
                <p className="text-xs text-slate-500">Configure facility, procedure, assigned checklist gates, and scheduling prerequisites</p>
              </div>
              <button
                onClick={() => {
                  setIsAddClearancePolicyModalOpen(false);
                  setEditingClearancePolicy(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveClearancePolicy} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Number *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingClearancePolicy)}
                    placeholder="POL-CLEAR-CATHLAB"
                    value={policyModalForm.policyNumber}
                    onChange={(e) => setPolicyModalForm({ ...policyModalForm, policyNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 font-mono disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Scope</label>
                  <select
                    value={policyModalForm.facilityId}
                    onChange={(e) => setPolicyModalForm({ ...policyModalForm, facilityId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="">Global (All Facilities)</option>
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inpatient Catheterization Clearance Protocol"
                  value={policyModalForm.name}
                  onChange={(e) => setPolicyModalForm({ ...policyModalForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure Filter (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 93458 or leave blank"
                    value={policyModalForm.procedureCode}
                    onChange={(e) => setPolicyModalForm({ ...policyModalForm, procedureCode: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Practice Type</label>
                  <select
                    value={policyModalForm.clinicalPracticeType}
                    onChange={(e) => setPolicyModalForm({ ...policyModalForm, clinicalPracticeType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="CARDIOLOGY">Cardiology</option>
                    <option value="ORTHOPEDICS">Orthopedics</option>
                    <option value="SURGERY">General Surgery</option>
                    <option value="GENERAL">General Clinical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Description</label>
                <textarea
                  rows={2}
                  placeholder="Clinical purpose, facility scope, institutional guidelines..."
                  value={policyModalForm.description}
                  onChange={(e) => setPolicyModalForm({ ...policyModalForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>

              {/* Requirement Selection from Catalogue */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Assign Clearance Requirements from Catalogue
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Select checklist gates, mandatory rules, and specialist sign-offs enforced for this policy.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    {policySelectedItems.length} Gates Assigned
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {allActiveRequirements.map((catReq) => {
                    const isSelected = policySelectedItems.some((it) => it.requirementId === catReq.id || it.code === catReq.code);
                    const selectedItem = policySelectedItems.find((it) => it.requirementId === catReq.id || it.code === catReq.code);

                    return (
                      <div
                        key={catReq.id}
                        className={`p-3 rounded-lg border text-xs transition-colors ${
                          isSelected
                            ? 'bg-white border-teal-300 shadow-xs'
                            : 'bg-white/60 border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPolicySelectedItems((prev) => [
                                    ...prev,
                                    {
                                      requirementId: catReq.id,
                                      code: catReq.code,
                                      name: catReq.name,
                                      category: catReq.category,
                                      isMandatory: catReq.isMandatory !== false,
                                      sortOrder: prev.length + 1,
                                      requiredSpecialties: catReq.requiredSpecialties && catReq.requiredSpecialties.length > 0
                                        ? catReq.requiredSpecialties
                                        : (catReq.category === 'SPECIALIST_CLEARANCE' ? ['ANESTHESIA', 'CARDIOLOGY', 'MEDICAL'] : []),
                                      validityDays: 30,
                                      isSchedulingPrerequisite: catReq.isSchedulingPrerequisite || false,
                                    },
                                  ]);
                                } else {
                                  setPolicySelectedItems((prev) =>
                                    prev.filter((it) => it.requirementId !== catReq.id && it.code !== catReq.code)
                                  );
                                }
                              }}
                              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{catReq.name}</span>
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {catReq.code}
                                </span>
                                <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-semibold">
                                  {catReq.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{catReq.description}</p>
                            </div>
                          </label>

                          {isSelected && selectedItem && (
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedItem.isMandatory}
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    setPolicySelectedItems((prev) =>
                                      prev.map((it) => (it.requirementId === catReq.id || it.code === catReq.code ? { ...it, isMandatory: val } : it))
                                    );
                                  }}
                                  className="rounded text-rose-600 focus:ring-rose-500"
                                />
                                <span className={selectedItem.isMandatory ? 'font-bold text-rose-700' : 'text-slate-500'}>
                                  Mandatory
                                </span>
                              </label>

                              <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedItem.isSchedulingPrerequisite}
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    setPolicySelectedItems((prev) =>
                                      prev.map((it) => (it.requirementId === catReq.id || it.code === catReq.code ? { ...it, isSchedulingPrerequisite: val } : it))
                                    );
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className={selectedItem.isSchedulingPrerequisite ? 'font-bold text-indigo-700' : 'text-slate-500'}>
                                  Prereq
                                </span>
                              </label>
                            </div>
                          )}
                        </div>

                        {isSelected && selectedItem && catReq.category === 'SPECIALIST_CLEARANCE' && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-600">Required Specialties:</span>
                            {['ANESTHESIA', 'CARDIOLOGY', 'MEDICAL', 'PULMONOLOGY', 'NEPHROLOGY', 'NEUROLOGY'].map((spec) => {
                              const hasSpec = selectedItem.requiredSpecialties.includes(spec);
                              return (
                                <button
                                  key={spec}
                                  type="button"
                                  onClick={() => {
                                    const next = hasSpec
                                      ? selectedItem.requiredSpecialties.filter((s) => s !== spec)
                                      : [...selectedItem.requiredSpecialties, spec];
                                    setPolicySelectedItems((prev) =>
                                      prev.map((it) => (it.requirementId === catReq.id || it.code === catReq.code ? { ...it, requiredSpecialties: next } : it))
                                    );
                                  }}
                                  className={`text-[9px] px-2 py-0.5 rounded-full font-medium border transition-colors ${
                                    hasSpec
                                      ? 'bg-blue-100 text-blue-900 border-blue-300 font-bold'
                                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {spec}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Checklist Preview */}
              <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/30">
                <div className="flex items-center justify-between pb-2 border-b border-indigo-100 mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-indigo-700" />
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      Policy Dynamic Checklist Preview (Doctor Web Display)
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-full">
                    {policySelectedItems.length} Requirements • {policySelectedItems.filter((i) => i.isMandatory).length} Mandatory • {policySelectedItems.filter((i) => i.isSchedulingPrerequisite).length} Booking Prereqs
                  </span>
                </div>

                {policySelectedItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No requirements assigned. Select from catalogue above to build checklist.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {policySelectedItems.map((it, idx) => (
                      <div key={it.code || idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-indigo-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{idx + 1}. {it.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({it.code})</span>
                          {it.isMandatory ? (
                            <span className="text-[9px] font-semibold bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200">
                              Mandatory
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                              Optional
                            </span>
                          )}
                          {it.isSchedulingPrerequisite && (
                            <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                              Booking Prereq
                            </span>
                          )}
                        </div>
                        {it.requiredSpecialties && it.requiredSpecialties.length > 0 && (
                          <div className="flex items-center gap-1">
                            {it.requiredSpecialties.map((s) => (
                              <span key={s} className="text-[8px] bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded border border-blue-200">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Booking Prerequisites (Optional comma-separated codes)
                </label>
                <input
                  type="text"
                  placeholder="REQ-FIN-AUTH,REQ-CONSENT,REQ-LAB-METABOLIC,REQ-SPEC-CLEAR"
                  value={policyModalForm.schedulingPrerequisites}
                  onChange={(e) => setPolicyModalForm({ ...policyModalForm, schedulingPrerequisites: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 font-mono text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddClearancePolicyModalOpen(false);
                    setEditingClearancePolicy(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  {editingClearancePolicy ? 'Save Changes' : 'Publish Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MASTER DATA ITEM */}
      {isAddMasterDataModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800">Add Master Data Entry</h3>
              <button onClick={() => setIsAddMasterDataModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateMasterData} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unique Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POST_OP_CHECK"
                  value={mdForm.code}
                  onChange={(e) => setMdForm({ ...mdForm, code: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Label / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Post-Operative Clinical Review"
                  value={mdForm.name}
                  onChange={(e) => setMdForm({ ...mdForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Clinical Template Text</label>
                <textarea
                  rows={3}
                  placeholder="Full clinical description or remark template..."
                  value={mdForm.description}
                  onChange={(e) => setMdForm({ ...mdForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddMasterDataModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SAFETY HOLD CATEGORY */}
      {isAddSafetyHoldModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800">
                {editingSafetyHold ? `Edit Safety Hold Category (${editingSafetyHold.code})` : 'Register Safety Hold Category'}
              </h3>
              <button
                onClick={() => {
                  setIsAddSafetyHoldModalOpen(false);
                  setEditingSafetyHold(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSafetyHoldCategory} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category Code *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingSafetyHold)}
                    placeholder="e.g. RENAL_IMPAIRMENT_HOLD"
                    value={safetyHoldForm.code}
                    onChange={(e) => setSafetyHoldForm({ ...safetyHoldForm, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 font-mono disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Practice Type</label>
                  <select
                    value={safetyHoldForm.clinicalPracticeType}
                    onChange={(e) => setSafetyHoldForm({ ...safetyHoldForm, clinicalPracticeType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="ALL">All Specialties</option>
                    <option value="CARDIOLOGY">Cardiology / Cath Lab</option>
                    <option value="SURGERY">Surgery</option>
                    <option value="ANESTHESIA">Anesthesia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Renal Impairment & Contrast Risk"
                  value={safetyHoldForm.name}
                  onChange={(e) => setSafetyHoldForm({ ...safetyHoldForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Clinical Risk Rationale</label>
                <textarea
                  rows={2}
                  placeholder="Clinical reason, risk factors, or precautions..."
                  value={safetyHoldForm.description}
                  onChange={(e) => setSafetyHoldForm({ ...safetyHoldForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reviewer Role Required</label>
                  <select
                    value={safetyHoldForm.requiredReviewerRole}
                    onChange={(e) => setSafetyHoldForm({ ...safetyHoldForm, requiredReviewerRole: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="DOCTOR">Credentialed Doctor / Attending</option>
                    <option value="CARDIOLOGIST">Attending Cardiologist Only</option>
                    <option value="ANESTHESIOLOGIST">Anesthesiologist Only</option>
                    <option value="NURSE">Clinical Nurse Specialist</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Required Evidence</label>
                  <select
                    value={safetyHoldForm.requiredEvidenceType}
                    onChange={(e) => setSafetyHoldForm({ ...safetyHoldForm, requiredEvidenceType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="NONE">None (Clinical Attestation)</option>
                    <option value="LAB_RESULT">Verified Lab Result (e.g. eGFR)</option>
                    <option value="DOCUMENT">Signed Medical Clearance PDF</option>
                    <option value="SPECIALIST_NOTE">Specialist Peer Note</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Governance Policy</label>
                <input
                  type="text"
                  placeholder="e.g. Requires repeat lab within 48h and attending clearance note"
                  value={safetyHoldForm.resolutionPolicy}
                  onChange={(e) => setSafetyHoldForm({ ...safetyHoldForm, resolutionPolicy: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSafetyHoldModalOpen(false);
                    setEditingSafetyHold(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  {editingSafetyHold ? 'Update Category' : 'Register Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConsultationManagementHub;
