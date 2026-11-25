import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  CreditCard,
  Calendar,
  AlertTriangle,
  RotateCw,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { consultationService, ConsultationItem } from '@/services/consultationService';
import { useAuth } from '@/context/AuthContext';
import { extractCleanClinicalIndication } from '@/utils/clinicalDataSanitizer';

export const TreatmentOffersDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'accepted' | 'completed'>('all');

  const fetchConsultations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await consultationService.listConsultations();
      setConsultations(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve consultations from server.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  // Filtered consultations
  const filteredConsultations = useMemo(() => {
    let result = consultations;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          (c.patientName && c.patientName.toLowerCase().includes(q)) ||
          (c.patientMrn && c.patientMrn.toLowerCase().includes(q)) ||
          (c.procedureName && c.procedureName.toLowerCase().includes(q)) ||
          (c.cptCode && c.cptCode.toLowerCase().includes(q)) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.facilityName && c.facilityName.toLowerCase().includes(q))
      );
    }

    if (selectedTab === 'active') {
      result = result.filter((c) => c.status === 'SCHEDULED' || c.status === 'CONFIRMED' || c.status === 'IN_PROGRESS');
    } else if (selectedTab === 'accepted') {
      result = result.filter((c) => c.offerStatus === 'ACCEPTED' || c.offerStatus === 'RATIFIED_ACCEPTED' || c.offerStatus === 'PROCEDURE_READY');
    } else if (selectedTab === 'completed') {
      result = result.filter((c) => c.status === 'COMPLETED' || c.offerStatus === 'COMPLETED');
    }

    return result;
  }, [consultations, searchQuery, selectedTab]);

  // Statistics dynamically aggregated from backend consultations data
  const stats = useMemo(() => {
    return consultationService.calculateMetrics(consultations);
  }, [consultations]);

  // Resolve active offer ID dynamically for the 18-stage lifecycle navigation
  const queryOfferId = searchParams.get('offerId');
  const activeOfferId = useMemo(() => {
    if (queryOfferId) return queryOfferId;
    const withOffer = consultations.find((c) => Boolean(c.offerId));
    return withOffer?.offerId || null;
  }, [queryOfferId, consultations]);

  const lifecycleStages = useMemo(() => {
    const offerTarget = activeOfferId || '';
    return [
      { num: 1, name: 'CPT Selection', path: offerTarget ? `/treatment-offers/new/step-1?offerId=${offerTarget}` : '/treatment-offers/new/step-1' },
      { num: 2, name: 'Pricing & Discount', path: offerTarget ? `/treatment-offers/new/step-2?offerId=${offerTarget}` : '/treatment-offers/new/step-2' },
      { num: 3, name: 'Financing Package', path: offerTarget ? `/treatment-offers/new/step-3?offerId=${offerTarget}` : '/treatment-offers/new/step-3' },
      { num: 4, name: 'Terms & Remarks', path: offerTarget ? `/treatment-offers/new/step-4?offerId=${offerTarget}` : '/treatment-offers/new/step-4' },
      { num: 5, name: 'Attestation', path: offerTarget ? `/treatment-offers/new/step-5?offerId=${offerTarget}` : '/treatment-offers/new/step-5' },
      { num: 6, name: 'Clinical Review', path: offerTarget ? `/treatment-offers/${offerTarget}/review` : '/treatment-offers/new/step-1' },
      { num: 7, name: 'Dispatched Status', path: offerTarget ? `/treatment-offers/${offerTarget}/status` : '/treatment-offers/new/step-1' },
      { num: 8, name: 'Offer Accepted', path: offerTarget ? `/treatment-offers/${offerTarget}/accepted` : '/treatment-offers/new/step-1' },
      { num: 9, name: 'Pre-Op Clearance', path: offerTarget ? `/treatment-offers/${offerTarget}/clearance` : '/treatment-offers/new/step-1' },
      { num: 10, name: 'Suite Scheduling', path: offerTarget ? `/treatment-offers/${offerTarget}/schedule` : '/treatment-offers/new/step-1' },
      { num: 11, name: 'Hold Review', path: offerTarget ? `/treatment-offers/${offerTarget}/schedule/review` : '/treatment-offers/new/step-1' },
      { num: 12, name: 'Slot Confirmed', path: offerTarget ? `/treatment-offers/${offerTarget}/scheduled` : '/treatment-offers/new/step-1' },
      { num: 13, name: 'Appointment Ledger', path: offerTarget ? `/treatment-offers/${offerTarget}/appointment` : '/treatment-offers/new/step-1' },
      { num: 14, name: 'Pre-Op Readiness', path: offerTarget ? `/treatment-offers/${offerTarget}/pre-op` : '/treatment-offers/new/step-1' },
      { num: 15, name: 'Day-of-Checkin', path: offerTarget ? `/treatment-offers/${offerTarget}/check-in` : '/treatment-offers/new/step-1' },
      { num: 16, name: 'Cath Lab Safety', path: offerTarget ? `/treatment-offers/${offerTarget}/cath-lab-safety` : '/treatment-offers/new/step-1' },
      { num: 17, name: 'Encounter Induction', path: offerTarget ? `/treatment-offers/${offerTarget}/encounter` : '/treatment-offers/new/step-1' },
      { num: 18, name: 'Active Documentation', path: offerTarget ? `/treatment-offers/${offerTarget}/in-progress` : '/treatment-offers/new/step-1' },
    ];
  }, [activeOfferId]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1280px] mx-auto pb-16 font-['Plus_Jakarta_Sans',sans-serif] text-[#0f172a]">
      {/* 1. Header Banner */}
      <div className="bg-white border border-[#e2e8f0] p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-[#a44cff] to-[#3f1d8b] text-white flex items-center justify-center shadow-md shrink-0">
            <Stethoscope className="size-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0f172a]">
                Treatment Offer & Clinical Consultation Lifecycle
              </h1>
              <span className="bg-purple-100 text-[#3f1d8b] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                18-Stage Trajectory
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Physician: <strong className="text-slate-800">{user.fullName || 'Attending Clinician'}</strong> • Facility: <strong className="text-slate-800">{user.organization || '—'}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/treatment-offers/new/step-1')}
          className="h-11 px-5 rounded-full bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white font-semibold text-xs flex items-center gap-2 shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>New Consultation / Treatment Offer</span>
        </button>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Consultations
            </span>
            <span className="text-2xl font-black text-[#0f172a] mt-1 block">
              {isLoading ? '—' : stats.total}
            </span>
          </div>
          <div className="size-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Activity className="size-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active / Scheduled
            </span>
            <span className="text-2xl font-black text-[#28006d] mt-1 block">
              {isLoading ? '—' : stats.active}
            </span>
          </div>
          <div className="size-10 rounded-xl bg-purple-50 text-[#28006d] flex items-center justify-center">
            <Clock className="size-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Accepted & Financed
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {isLoading ? '—' : stats.accepted}
            </span>
          </div>
          <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard className="size-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Procedures Completed
            </span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">
              {isLoading ? '—' : stats.completed}
            </span>
          </div>
          <div className="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CheckCircle2 className="size-5" />
          </div>
        </div>
      </div>

      {/* 3. 18-Step Clinical Lifecycle Pipeline Stepper */}
      <div className="bg-white border border-[#e2e8f0] p-5 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-[#3f1d8b]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
              CareID 18-Stage Clinical & Financing Trajectory
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            Click any stage below to inspect or advance documentation
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2">
          {lifecycleStages.map((stage) => (
            <button
              key={stage.num}
              type="button"
              onClick={() => navigate(stage.path)}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 transition-all text-left flex flex-col gap-1 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="size-4 rounded-full bg-slate-200 group-hover:bg-[#3f1d8b] group-hover:text-white text-[9px] font-bold text-slate-600 flex items-center justify-center transition-colors">
                  {stage.num}
                </span>
                <ChevronRight className="size-3 text-slate-400 group-hover:text-[#3f1d8b] transition-colors" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#3f1d8b] line-clamp-1">
                {stage.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Active Consultations & Treatment Offers List */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tab Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedTab('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedTab === 'all' ? 'bg-white text-[#0f172a] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              All ({consultations.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('active')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedTab === 'active' ? 'bg-white text-[#0f172a] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Active ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('accepted')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedTab === 'accepted' ? 'bg-white text-[#0f172a] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Accepted ({stats.accepted})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('completed')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                selectedTab === 'completed' ? 'bg-white text-[#0f172a] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Completed ({stats.completed})
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, MRN, procedure..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3f1d8b]"
              />
            </div>
            <button
              type="button"
              onClick={fetchConsultations}
              disabled={isLoading}
              title="Refresh consultations from server"
              className="size-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0"
            >
              <RotateCw className={cn('size-3.5', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <div className="size-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="size-6" />
            </div>
            <p className="text-xs font-semibold text-slate-800">{error}</p>
            <button
              type="button"
              onClick={fetchConsultations}
              className="px-4 py-2 bg-[#28006d] text-white text-xs font-semibold rounded-lg hover:bg-[#3f1d8b]"
            >
              Retry
            </button>
          </div>
        ) : filteredConsultations.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="size-14 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Stethoscope className="size-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No Consultations Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no clinical consultations matching the selected criteria. Start a new consultation to initiate the 18-stage lifecycle.
            </p>
            <button
              type="button"
              onClick={() => navigate('/treatment-offers/new/step-1')}
              className="px-4 py-2 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors"
            >
              Initiate New Consultation
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredConsultations.map((item) => {
              const monogram = item.patientName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'PT';

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-[#3f1d8b] text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
                      {monogram}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-bold text-[#0f172a]">
                          {item.patientName}
                        </span>
                        <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {item.patientMrn}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'IN_PROGRESS'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-purple-50 text-[#3f1d8b] border border-purple-200'
                          )}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {item.procedureName || item.title}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {item.appointmentDate}{item.appointmentTime ? ` • ${item.appointmentTime}` : ''}
                        </span>
                        <span>•</span>
                        <span>{item.facilityName}</span>
                        {item.cptCode && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">{item.cptCode}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          item.patientProfileId
                            ? `/treatment-offers/new/step-1?patientId=${encodeURIComponent(item.patientProfileId)}`
                            : '/treatment-offers/new/step-1',
                          {
                          state: {
                            patientId: item.patientProfileId,
                            patientName: item.patientName,
                            patientCid: item.patientMrn,
                            patientGender: item.patientGender,
                            facility: item.facilityName,
                            cptCode: item.cptCode,
                            procedureName: item.procedureName || item.title,
                            clinicalNecessity: extractCleanClinicalIndication(item.chiefComplaint, item.procedureName || item.title),
                            appointmentId: item.id,
                          },
                        })
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      Create Offer
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (item.offerId) {
                          const route =
                            item.offerStatus === 'DRAFT'
                              ? `/treatment-offers/${item.offerId}/review`
                              : item.offerStatus === 'ACCEPTED' || item.offerStatus === 'RATIFIED_ACCEPTED'
                              ? `/treatment-offers/${item.offerId}/accepted`
                              : item.offerStatus === 'PROCEDURE_READY'
                              ? `/treatment-offers/${item.offerId}/pre-op`
                              : `/treatment-offers/${item.offerId}/status`;
                          navigate(route, {
                            state: {
                              offerId: item.offerId,
                              patientId: item.patientProfileId,
                              patientName: item.patientName,
                              patientCid: item.patientMrn,
                              procedureName: item.procedureName || item.title,
                              facility: item.facilityName,
                              attendingDoctor: user.fullName || 'Attending Physician',
                            },
                          });
                        } else {
                          navigate(
                            item.patientProfileId
                              ? `/treatment-offers/new/step-1?patientId=${encodeURIComponent(item.patientProfileId)}`
                              : '/treatment-offers/new/step-1',
                            {
                            state: {
                              patientId: item.patientProfileId,
                              patientName: item.patientName,
                              patientCid: item.patientMrn,
                              patientGender: item.patientGender,
                              facility: item.facilityName,
                              cptCode: item.cptCode,
                              procedureName: item.procedureName || item.title,
                              clinicalNecessity: extractCleanClinicalIndication(item.chiefComplaint, item.procedureName || item.title),
                              appointmentId: item.id,
                            },
                          });
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#28006d] hover:bg-[#3f1d8b] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Proceed Lifecycle</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
