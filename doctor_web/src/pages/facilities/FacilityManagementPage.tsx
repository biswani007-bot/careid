/**
 * CareID Doctor Web — Facility Management Page
 * PRD §4.2 — Workstream C (CR-05)
 *
 * Shows the doctor's affiliated facility cards, departments, rooms,
 * and associated doctors. Read-only view for DOCTOR role (admin actions
 * are reserved for FACILITY_ADMIN/ADMIN roles in the backend).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  Layers,
  DoorOpen,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';
import {
  facilityService,
  FacilityProfileDTO,
  FacilityDepartmentDTO,
  FacilityRoomDTO,
  FacilityDoctorDTO,
} from '@/services/facilityService';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FacilityDetail extends FacilityProfileDTO {
  departments: FacilityDepartmentDTO[];
  rooms: FacilityRoomDTO[];
  doctors: FacilityDoctorDTO[];
  _loading: boolean;
  _expanded: boolean;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const s = (status || 'UNKNOWN').toUpperCase();
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    ACTIVE:    { label: 'Active',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',    icon: <CheckCircle2 size={12} /> },
    VERIFIED:  { label: 'Verified',  cls: 'bg-blue-50 text-blue-700 border-blue-200',              icon: <CheckCircle2 size={12} /> },
    PENDING:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200',           icon: <Clock size={12} /> },
    SUSPENDED: { label: 'Suspended', cls: 'bg-red-50 text-red-700 border-red-200',                icon: <AlertCircle size={12} /> },
    INACTIVE:  { label: 'Inactive',  cls: 'bg-slate-50 text-slate-500 border-slate-200',           icon: <Info size={12} /> },
    UNKNOWN:   { label: status || '—', cls: 'bg-slate-50 text-slate-500 border-slate-200',        icon: <Info size={12} /> },
  };
  const cfg = map[s] ?? map['UNKNOWN'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ─── Facility Card ─────────────────────────────────────────────────────────────

const FacilityCard: React.FC<{
  facility: FacilityDetail;
  onToggle: (id: string) => void;
}> = ({ facility, onToggle }) => {
  return (
    <div className="bg-white rounded-2xl border border-[#e1e3e4] shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4 p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => onToggle(facility.id)}
        role="button"
        aria-expanded={facility._expanded}
      >
        <div className="flex items-start gap-4 min-w-0">
          <div className="shrink-0 size-12 rounded-xl bg-[#006666]/10 flex items-center justify-center">
            <Building2 size={24} className="text-[#006666]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[#1a1a2e] truncate">{facility.name}</h3>
            {facility.code && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{facility.code}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {facility.type && (
                <span className="inline-flex px-2 py-0.5 rounded-md bg-[#5b14b8]/10 text-[#5b14b8] text-xs font-medium">
                  {facility.type}
                </span>
              )}
              <StatusBadge status={facility.status} />
            </div>
          </div>
        </div>
        <div className="shrink-0 mt-1 text-slate-400">
          {facility._expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Meta row */}
      <div className="px-5 pb-4 flex flex-wrap gap-4 text-sm text-slate-600 border-t border-[#e1e3e4]/60 pt-3">
        {facility.city && (
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-slate-400" />
            {facility.city}
          </span>
        )}
        {facility.phone && (
          <span className="flex items-center gap-1.5">
            <Phone size={14} className="text-slate-400" />
            {facility.phone}
          </span>
        )}
        {facility.email && (
          <span className="flex items-center gap-1.5">
            <Mail size={14} className="text-slate-400" />
            {facility.email}
          </span>
        )}
        {facility.address && (
          <span className="flex items-center gap-1.5 max-w-xs truncate">
            <MapPin size={14} className="text-slate-400 shrink-0" />
            <span className="truncate">{facility.address}</span>
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {facility._expanded && (
        <div className="border-t border-[#e1e3e4] bg-slate-50/40">
          {facility._loading ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <RefreshCw size={18} className="animate-spin mr-2" />
              Loading facility details…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#e1e3e4]">
              {/* Departments */}
              <div className="p-4">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  <Layers size={14} />
                  Departments ({facility.departments.length})
                </h4>
                {facility.departments.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No departments listed</p>
                ) : (
                  <ul className="space-y-1.5">
                    {facility.departments.map((dept) => (
                      <li key={dept.id} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="size-1.5 mt-2 rounded-full bg-[#006666] shrink-0" />
                        <span>
                          <span className="font-medium">{dept.name}</span>
                          {dept.code && <span className="text-slate-400 ml-1">({dept.code})</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Rooms */}
              <div className="p-4">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  <DoorOpen size={14} />
                  Rooms ({facility.rooms.length})
                </h4>
                {facility.rooms.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No rooms listed</p>
                ) : (
                  <ul className="space-y-1.5">
                    {facility.rooms.slice(0, 8).map((room) => (
                      <li key={room.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">
                          <span className="font-medium">{room.roomName || room.roomNumber}</span>
                          {room.roomNumber && room.roomName && (
                            <span className="text-slate-400 ml-1">#{room.roomNumber}</span>
                          )}
                        </span>
                        {room.isOperational !== undefined && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${room.isOperational ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {room.isOperational ? 'Open' : 'Closed'}
                          </span>
                        )}
                      </li>
                    ))}
                    {facility.rooms.length > 8 && (
                      <li className="text-xs text-slate-400">+{facility.rooms.length - 8} more rooms</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Doctors */}
              <div className="p-4">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  <Users size={14} />
                  Doctors ({facility.doctors.length})
                </h4>
                {facility.doctors.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No doctors listed</p>
                ) : (
                  <ul className="space-y-2">
                    {facility.doctors.slice(0, 6).map((doc) => (
                      <li key={doc.id} className="flex items-start gap-2 text-sm">
                        <div className="size-7 rounded-full bg-[#3f1d8b]/10 flex items-center justify-center shrink-0 text-xs font-semibold text-[#3f1d8b]">
                          {(doc.fullName || 'DR').replace(/^Dr\.?\s*/i, '').trim().slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{doc.fullName}</p>
                          {doc.specialization && (
                            <p className="text-xs text-slate-500 truncate">{doc.specialization}</p>
                          )}
                          {doc.assignmentType && (
                            <span className="text-xs text-[#006666]">{doc.assignmentType}</span>
                          )}
                        </div>
                      </li>
                    ))}
                    {facility.doctors.length > 6 && (
                      <li className="text-xs text-slate-400">+{facility.doctors.length - 6} more doctors</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const FacilityManagementPage: React.FC = () => {
  const [facilities, setFacilities] = useState<FacilityDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFacilities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const res = await facilityService.getFacilities({ limit: 50 });
      const list: FacilityDetail[] = (res.data || []).map((f) => ({
        ...f,
        departments: [],
        rooms: [],
        doctors: [],
        _loading: false,
        _expanded: false,
      }));
      setFacilities(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load facilities';
      setError(msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const handleToggle = useCallback(async (facilityId: string) => {
    setFacilities((prev) =>
      prev.map((f) => {
        if (f.id !== facilityId) return f;
        // Toggle expansion
        const willExpand = !f._expanded;
        // If already has data, just toggle
        const hasData = f.departments.length > 0 || f.rooms.length > 0 || f.doctors.length > 0;
        return { ...f, _expanded: willExpand, _loading: willExpand && !hasData };
      })
    );

    // Lazy-load detail only if expanding for first time
    setFacilities((prev) => {
      const target = prev.find((f) => f.id === facilityId);
      if (!target || !target._expanded) return prev;
      const hasData = target.departments.length > 0 || target.rooms.length > 0 || target.doctors.length > 0;
      if (hasData) return prev;
      return prev; // We'll fetch below
    });

    // Fetch detail for the facility
    const target = facilities.find((f) => f.id === facilityId);
    if (!target) return;
    const willExpand = !target._expanded;
    if (!willExpand) return;
    const hasData = target.departments.length > 0 || target.rooms.length > 0 || target.doctors.length > 0;
    if (hasData) return;

    try {
      const [departments, rooms, doctors] = await Promise.allSettled([
        facilityService.getFacilityDepartments(facilityId),
        facilityService.getFacilityRooms(facilityId),
        facilityService.getFacilityDoctors(facilityId),
      ]);

      setFacilities((prev) =>
        prev.map((f) => {
          if (f.id !== facilityId) return f;
          return {
            ...f,
            _loading: false,
            departments: departments.status === 'fulfilled' ? departments.value : [],
            rooms: rooms.status === 'fulfilled' ? rooms.value : [],
            doctors: doctors.status === 'fulfilled' ? doctors.value : [],
          };
        })
      );
    } catch {
      setFacilities((prev) =>
        prev.map((f) => (f.id === facilityId ? { ...f, _loading: false } : f))
      );
    }
  }, [facilities]);

  // Filtered list
  const filtered = facilities.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.code?.toLowerCase().includes(q) ||
      f.city?.toLowerCase().includes(q) ||
      f.type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Facility Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registered facilities and affiliated clinical infrastructure
          </p>
        </div>
        <button
          onClick={() => loadFacilities(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e1e3e4] bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="mb-5 relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, city or type…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e1e3e4] bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006666]/30 focus:border-[#006666]"
        />
      </div>

      {/* Stats strip */}
      {!loading && !error && (
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#e1e3e4] text-sm text-slate-600">
            <Building2 size={14} className="text-[#006666]" />
            <span className="font-semibold text-slate-800">{facilities.length}</span> Facilities
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#e1e3e4] text-sm text-slate-600">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="font-semibold text-slate-800">
              {facilities.filter((f) => ['ACTIVE', 'VERIFIED'].includes((f.status || '').toUpperCase())).length}
            </span> Active
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <RefreshCw size={22} className="animate-spin mr-3" />
          Loading facilities…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle size={24} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={() => loadFacilities()}
            className="mt-3 text-sm text-[#006666] underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Facility list */}
      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Building2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {search ? 'No facilities match your search.' : 'No facilities found.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((facility) => (
                <FacilityCard
                  key={facility.id}
                  facility={facility}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FacilityManagementPage;
