import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Calendar,
  User,
  Folder,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  ArrowLeft,
  RefreshCw,
  Video,
} from 'lucide-react';
import { usePatientList } from '@/hooks/usePatients';
import { patientService, PatientListItem, calculateAge } from '@/services/patientService';
export const PatientDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [currentPage, setCurrentPage] = useState(pageParam > 0 ? pageParam : 1);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'today'>('all');
  const [selectedAge, setSelectedAge] = useState('Any');
  const [selectedGender, setSelectedGender] = useState('All');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Recently Viewed & Recent Searches
  const [recentlyViewed, setRecentlyViewed] = useState<PatientListItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentlyViewed(patientService.getRecentlyViewed());
    setRecentSearches(patientService.getRecentSearches());

    const handleRecentlyViewedUpdate = () => {
      setRecentlyViewed(patientService.getRecentlyViewed());
    };

    window.addEventListener('careid_recently_viewed_updated', handleRecentlyViewedUpdate);
    window.addEventListener('storage', handleRecentlyViewedUpdate);

    let isMounted = true;
    patientService
      .refreshRecentlyViewed()
      .then((refreshed) => {
        if (isMounted && refreshed && refreshed.length > 0) {
          setRecentlyViewed(refreshed);
        }
      })
      .catch(() => {
        // Gracefully ignore network errors on background refresh
      });

    return () => {
      isMounted = false;
      window.removeEventListener('careid_recently_viewed_updated', handleRecentlyViewedUpdate);
      window.removeEventListener('storage', handleRecentlyViewedUpdate);
    };
  }, []);

  // Sync searchQuery with URL param
  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  // Fetch real patient list from backend API
  const { patients, meta, isLoading, error, refetch } = usePatientList({
    q: queryParam,
    page: currentPage,
    limit: 10,
    gender: selectedGender !== 'All' ? selectedGender : undefined,
    bloodGroup: selectedBloodGroup !== 'All' ? selectedBloodGroup : undefined,
    status: selectedStatus !== 'All' ? selectedStatus : undefined,
    activeTab,
  });

  // Reconcile Recently Viewed with the latest patient data from backend table
  useEffect(() => {
    if (patients && patients.length > 0) {
      const reconciled = patientService.syncRecentlyViewed(patients);
      setRecentlyViewed(reconciled);
    }
  }, [patients]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    if (searchQuery.trim()) {
      patientService.recordRecentSearch(searchQuery.trim());
      setRecentSearches(patientService.getRecentSearches());
      setSearchParams({ q: searchQuery.trim(), page: '1' });
    } else {
      setSearchParams({});
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCurrentPage(1);
    setSearchParams({});
    setActiveTab('all');
    setSelectedAge('Any');
    setSelectedGender('All');
    setSelectedBloodGroup('All');
    setSelectedStatus('All');
  };

  const handleSelectPatient = (patient: PatientListItem) => {
    patientService.recordRecentlyViewed(patient);
    navigate(`/patients/${patient.id}`);
  };

  const handleStartConsult = (patient: PatientListItem) => {
    patientService.recordRecentlyViewed(patient);
    const parsedAge = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
    navigate(`/treatment-offers/new/step-1?patientId=${encodeURIComponent(patient.id)}`, {
      state: {
        patientId: patient.id,
        patientName: patient.fullName,
        patientCid: patient.patientNumber || patient.mrn,
        patientGender: patient.gender || undefined,
        patientAge: parsedAge !== null ? `${parsedAge}` : undefined,
        patientBlood: patient.bloodGroup || undefined,
        patientDob: patient.dateOfBirth || undefined,
        insuranceStatus: patient.insurancePolicy?.providerName
          ? `Insured (${patient.insurancePolicy.providerName})`
          : undefined,
      },
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > meta.totalPages) return;
    setCurrentPage(newPage);
    const newParams: Record<string, string> = { page: String(newPage) };
    if (queryParam) newParams.q = queryParam;
    setSearchParams(newParams);
  };

  // If a search query is active and returns zero results (Figma node 1:745 - Refined Search: No Results)
  const isSearchEmptyView = queryParam.trim().length > 0 && !isLoading && !error && patients.length === 0;

  if (isSearchEmptyView) {
    return (
      <div className="w-full space-y-6" data-node-id="1:745">
        {/* Search Results Header & Filter Tags (Figma node 1:772) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-[#191c1d]">
            Patient Search Results
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#76f1ff] border border-[#76f1ff] text-[#006d76] text-xs font-medium tracking-wide rounded-full px-3 py-1.5 flex items-center gap-1.5">
              <span>Query: &quot;{queryParam}&quot;</span>
              <button
                type="button"
                onClick={handleClearFilters}
                className="hover:opacity-75 focus:outline-none"
                aria-label="Remove search query"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
            {selectedStatus !== 'All' && (
              <span className="bg-[#76f1ff] border border-[#76f1ff] text-[#006d76] text-xs font-medium tracking-wide rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <span>Status: {selectedStatus}</span>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('All')}
                  className="hover:opacity-75 focus:outline-none"
                  aria-label="Remove status filter"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Empty State Card (Figma node 1:791) */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e1e3e4] p-8 sm:p-12 flex flex-col items-center justify-center min-h-[540px]">
          <div className="max-w-[448px] w-full flex flex-col items-center text-center">
            {/* Medical Search Illustration Composition (Figma node 1:808) */}
            <div className="relative size-32 sm:size-40 flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full bg-[#e8ddff] blur-xl opacity-40" />
              <div className="absolute inset-4 rounded-full bg-[#76f1ff] blur-md opacity-25" />

              {/* White Icon Circle */}
              <div className="relative size-24 rounded-full bg-white border border-[#e7e8e9] shadow-sm flex items-center justify-center">
                <div className="relative flex items-center justify-center text-[#28006d]">
                  <Search className="size-9 stroke-[2.2]" aria-hidden="true" />
                </div>
                {/* Red Exclamation Alert Badge (Figma node 1:815) */}
                <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-[#ffdad6] border-2 border-white flex items-center justify-center text-[#93000a]">
                  <AlertCircle className="size-4" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Heading (Figma node 1:795) */}
            <h2 className="text-xl sm:text-2xl font-semibold text-[#191c1d] mb-3">
              No matching patients found.
            </h2>

            {/* Guidance Text (Figma node 1:798) */}
            <div className="text-sm sm:text-base text-[#494552] leading-relaxed mb-8">
              <p>Try searching using:</p>
              <p>• Health Vault ID / MRN</p>
              <p>• Patient Full Name</p>
              <p>• Mobile Number</p>
              <p>or adjust your filters.</p>
            </div>

            {/* Action Buttons (Figma node 1:799) */}
            <div className="w-full max-w-[328px] space-y-3">
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full h-10 border border-[#7a7583] hover:bg-slate-50 text-[#28006d] font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
              >
                <Filter className="size-4" aria-hidden="true" />
                <span>Clear Filters</span>
              </button>

              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full h-10 bg-gradient-to-b from-[#a44cff] to-[#5b14b8] hover:opacity-95 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span>Back to Patient Directory</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Primary Patient Directory View (Figma node 1:6657)
  return (
    <div className="w-full space-y-6" data-node-id="1:6657">
      {/* Top 2-Column Section: Search & Filters (Left) + Recently Viewed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Title + Search & Filters Card (Figma node 1:6785) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Page Header (Figma node 1:6786) */}
          <div className="space-y-1">
            <h1 className="text-[32px] font-semibold text-[#191c1d] leading-[40px]">
              Patients
            </h1>
            <p className="text-sm text-[#494552] leading-[20px]">
              Search and manage clinical patient records.
            </p>
          </div>

          {/* Search & Filters Card (Figma node 1:6791) */}
          <div className="bg-white border border-[#e1e3e4] rounded-xl p-[17px] shadow-sm flex flex-col gap-4">
            {/* Global Search Input Row (Figma node 1:6793) */}
            <form onSubmit={handleSearchSubmit} className="flex gap-4 items-center w-full">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#7a7583]"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Global search: Patient Name, ID, Mobile, DOB"
                  className="w-full h-11 bg-[#f3f4f5] border border-[#cbc4d4] rounded-lg pl-10 pr-4 text-sm text-[#191c1d] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#5b14b8] focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                className="bg-[#3f1d8b] hover:bg-[#28006d] text-[#ab8efd] text-sm font-medium rounded-lg px-4 h-11 flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#5b14b8] shrink-0 cursor-pointer"
              >
                <Filter className="size-4" aria-hidden="true" />
                <span>Search</span>
              </button>
            </form>

            {/* Filter Fields Row (Figma node 1:6804) */}
            <div className="bg-[#f3f4f5] border border-[#cbc4d4] rounded-lg p-[17px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {/* Age */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#494552] tracking-wide block">
                  Age
                </label>
                <select
                  value={selectedAge}
                  onChange={(e) => setSelectedAge(e.target.value)}
                  className="w-full h-8 bg-white border border-[#cbc4d4] rounded px-2 text-xs text-[#191c1d] focus:outline-none focus:ring-1 focus:ring-[#5b14b8]"
                >
                  <option value="Any">Any</option>
                  <option value="0-18">0-18</option>
                  <option value="19-40">19-40</option>
                  <option value="41-60">41-60</option>
                  <option value="60+">60+</option>
                </select>
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#494552] tracking-wide block">
                  Gender
                </label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full h-8 bg-white border border-[#cbc4d4] rounded px-2 text-xs text-[#191c1d] focus:outline-none focus:ring-1 focus:ring-[#5b14b8]"
                >
                  <option value="All">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Blood Group */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#494552] tracking-wide block">
                  Blood Group
                </label>
                <select
                  value={selectedBloodGroup}
                  onChange={(e) => setSelectedBloodGroup(e.target.value)}
                  className="w-full h-8 bg-white border border-[#cbc4d4] rounded px-2 text-xs text-[#191c1d] focus:outline-none focus:ring-1 focus:ring-[#5b14b8]"
                >
                  <option value="All">All</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              {/* Last Visit */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#494552] tracking-wide block">
                  Last Visit
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="mm/dd"
                    className="w-full h-8 bg-white border border-[#cbc4d4] rounded pl-2 pr-6 text-xs text-[#191c1d] focus:outline-none focus:ring-1 focus:ring-[#5b14b8]"
                  />
                  <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-[#7a7583] pointer-events-none" />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#494552] tracking-wide block">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-8 bg-white border border-[#cbc4d4] rounded px-2 text-xs text-[#191c1d] focus:outline-none focus:ring-1 focus:ring-[#5b14b8]"
                >
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Critical">Critical</option>
                  <option value="Waiting">Waiting</option>
                  <option value="In Consultation">In Consultation</option>
                </select>
              </div>

              {/* Reset Action */}
              <div className="space-y-1 flex flex-col justify-end">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="w-full h-8 bg-white border border-[#cbc4d4] hover:bg-slate-50 rounded px-2 text-xs text-[#494552] font-medium transition-colors focus:outline-none"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Quick Filter Tabs (Figma node 1:6857) */}
            <div className="flex gap-2.5 items-center flex-wrap pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`text-sm font-medium rounded-full px-4 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8] ${
                  activeTab === 'all'
                    ? 'bg-[#76f1ff] text-[#006d76]'
                    : 'border border-[#cbc4d4] text-[#494552] hover:bg-slate-50'
                }`}
              >
                All Patients
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`text-sm font-medium rounded-full px-4 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8] ${
                  activeTab === 'active'
                    ? 'bg-[#76f1ff] text-[#006d76]'
                    : 'border border-[#cbc4d4] text-[#494552] hover:bg-slate-50'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className={`text-sm font-medium rounded-full px-4 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#5b14b8] ${
                  activeTab === 'today'
                    ? 'bg-[#76f1ff] text-[#006d76]'
                    : 'border border-[#cbc4d4] text-[#494552] hover:bg-slate-50'
                }`}
              >
                Today&apos;s Appointments
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Recently Viewed + Recent Searches (Figma node 1:6885) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Recently Viewed Card (Figma node 1:6886) */}
          <div className="bg-white border border-[#e1e3e4] rounded-xl p-[21px] shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-[#191c1d]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#191c1d]">
                Recently Viewed
              </h2>
            </div>

            {recentlyViewed.length > 0 ? (
              <div className="space-y-3">
                {recentlyViewed.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectPatient(item)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="size-10 rounded-full bg-[#76f1ff] text-[#006d76] flex items-center justify-center font-bold text-sm shrink-0">
                      {item.firstName?.[0] || 'P'}
                      {item.lastName?.[0] || ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-base font-medium text-[#191c1d] truncate">
                          {item.fullName}
                        </p>
                        <span className="bg-[#e1e3e4] text-[#494552] text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#494552] truncate">
                        {item.mrn || item.patientNumber || 'CAREID'} • {item.phone || 'No phone'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#7a7583]">
                No recently viewed patients in this session.
              </div>
            )}
          </div>

          {/* Recent Searches Card (Figma node 1:6920) */}
          <div className="bg-white border border-[#e1e3e4] rounded-xl p-[21px] shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-[#191c1d]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[#191c1d]">
                Recent Searches
              </h2>
            </div>
            {recentSearches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSearchQuery(tag);
                      setCurrentPage(1);
                      setSearchParams({ q: tag, page: '1' });
                    }}
                    className="bg-[#f3f4f5] border border-[#cbc4d4] hover:bg-slate-200/60 rounded-full px-3 py-1 text-xs tracking-wide text-[#494552] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#5b14b8]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#7a7583]">
                Search terms you use will appear here for fast access.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4 text-red-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 shrink-0 text-red-600" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Patient Master Table (Figma node 1:6684) */}
      <div className="bg-white border border-[#e1e3e4] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f3f4f5] border-b border-[#e1e3e4]">
                <th className="px-4 py-3 text-sm sm:text-base font-medium text-[#494552] w-[218px]">
                  Patient
                </th>
                <th className="px-4 py-3 text-sm sm:text-base font-medium text-[#494552] w-[168px]">
                  Health Vault ID
                </th>
                <th className="px-4 py-3 text-sm sm:text-base font-medium text-[#494552] w-[151px]">
                  Age/Gender
                </th>
                <th className="px-4 py-3 text-sm sm:text-base font-medium text-[#494552] w-[141px]">
                  Last Visit
                </th>
                <th className="px-4 py-3 text-sm sm:text-base font-medium text-[#494552] w-[172px]">
                  Status
                </th>
                <th className="px-4 py-3 text-sm sm:text-base font-medium text-[#494552] text-right w-[106px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e3e4]">
              {isLoading ? (
                // Skeleton loading state
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-slate-200" />
                        <div className="h-4 w-28 bg-slate-200 rounded" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-16 bg-slate-200 rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-20 bg-slate-200 rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-5 w-16 bg-slate-200 rounded-full" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-block h-6 w-14 bg-slate-200 rounded" />
                    </td>
                  </tr>
                ))
              ) : patients.length > 0 ? (
                patients.map((p, idx) => {
                  const age = calculateAge(p.dateOfBirth);
                  const ageGenderStr = [
                    age !== null ? `${age} yrs` : null,
                    p.gender || null,
                  ]
                    .filter(Boolean)
                    .join(' / ') || 'Not recorded';

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        idx % 2 === 1 ? 'bg-[#f8f9fa]' : 'bg-white'
                      }`}
                    >
                      {/* Patient Name & Avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-[#3f1d8b] text-[#ab8efd] flex items-center justify-center font-bold text-xs shrink-0">
                            {p.firstName?.[0] || 'P'}
                            {p.lastName?.[0] || ''}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectPatient(p)}
                            className="text-base font-semibold text-[#191c1d] hover:text-[#5b14b8] transition-colors text-left"
                          >
                            {p.fullName}
                          </button>
                        </div>
                      </td>

                      {/* Health Vault ID */}
                      <td className="px-4 py-3.5 text-sm text-[#494552] font-mono">
                        {p.mrn || p.patientNumber || p.id.slice(0, 8)}
                      </td>

                      {/* Age / Gender */}
                      <td className="px-4 py-3.5 text-sm text-[#494552]">
                        {ageGenderStr}
                      </td>

                      {/* Last Visit */}
                      <td className="px-4 py-3.5 text-sm text-[#494552]">
                        {p.lastVisit || 'N/A'}
                      </td>

                      {/* Status Pill */}
                      <td className="px-4 py-3.5">
                        {p.status === 'Active' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide bg-[#76f1ff] text-[#006d76]">
                            Active
                          </span>
                        )}
                        {p.status === 'Critical' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide bg-[#ffdad6] text-[#93000a]">
                            Critical
                          </span>
                        )}
                        {p.status === 'Waiting' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide bg-[#fff8e1] text-[#f57f17]">
                            Waiting
                          </span>
                        )}
                        {p.status === 'In Consultation' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide bg-[#3f1d8b] text-[#ab8efd]">
                            In Consultation
                          </span>
                        )}
                        {p.status === 'Draft' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide bg-slate-200 text-slate-700">
                            Draft
                          </span>
                        )}
                        {p.status === 'Completed' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide bg-emerald-100 text-emerald-800">
                            Completed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartConsult(p)}
                            title="Start Consult"
                            aria-label="Start Consult"
                            className="p-1 rounded text-[#494552] hover:text-[#28006d] hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-[#5b14b8]"
                          >
                            <Video className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectPatient(p)}
                            title="View Patient Profile"
                            className="p-1 rounded text-[#494552] hover:text-[#28006d] hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-[#5b14b8]"
                          >
                            <User className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/records?patientId=${p.id}`)}
                            title="View Health Records"
                            className="p-1 rounded text-[#494552] hover:text-[#28006d] hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-[#5b14b8]"
                          >
                            <Folder className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#7a7583]">
                    No patient records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (Figma node 1:6864) */}
        {!isLoading && meta.totalItems > 0 && (
          <div className="px-4 py-4 border-t border-[#e1e3e4] flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
            <p className="text-sm text-[#494552]">
              Showing {Math.min((meta.page - 1) * meta.limit + 1, meta.totalItems)} to{' '}
              {Math.min(meta.page * meta.limit, meta.totalItems)} of {meta.totalItems} patients
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(meta.page - 1)}
                disabled={!meta.hasPreviousPage && meta.page <= 1}
                className={`p-1.5 rounded ${
                  meta.page > 1
                    ? 'text-[#494552] hover:bg-slate-100 cursor-pointer'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>

              {Array.from({ length: meta.totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Only render first few, current, and last if large
                if (
                  pageNum === 1 ||
                  pageNum === meta.totalPages ||
                  (pageNum >= meta.page - 1 && pageNum <= meta.page + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={`size-8 rounded-full font-medium text-sm flex items-center justify-center transition-colors ${
                        meta.page === pageNum
                          ? 'bg-[#28006d] text-white focus:ring-2 focus:ring-[#28006d]'
                          : 'text-[#494552] hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === meta.page - 2 || pageNum === meta.page + 2) {
                  return (
                    <span key={pageNum} className="px-1 text-sm text-[#7a7583]">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                type="button"
                onClick={() => handlePageChange(meta.page + 1)}
                disabled={!meta.hasNextPage && meta.page >= meta.totalPages}
                className={`p-1.5 rounded ${
                  meta.page < meta.totalPages
                    ? 'text-[#494552] hover:bg-slate-100 cursor-pointer'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
