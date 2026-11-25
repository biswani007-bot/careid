import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PawPrint,
  Syringe,
  Activity,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Plus,
  Loader2,
  HeartPulse,
  Thermometer,
  Scale,
  CheckCircle2,
} from 'lucide-react';
import {
  doctorPetService,
  PetRecord,
  PetVaccination,
  PetClinicalRecord,
} from '@/services/doctorPetService';
import { useAuth } from '@/context/AuthContext';

interface FlattenedVaccineReminder {
  vaccine: PetVaccination;
  pet: PetRecord;
  isOverdue: boolean;
  isDueSoon: boolean;
}

interface FlattenedEncounter {
  encounter: PetClinicalRecord;
  pet: PetRecord;
}

export const VeterinaryDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pets, setPets] = useState<PetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await doctorPetService.getAllPets({ limit: 100 });
        if (isMounted) {
          setPets(res.data || []);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load veterinary dashboard data:', err);
          setError(err?.message || 'Failed to retrieve companion animal data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute metrics
  const totalPets = pets.length;
  const canineCount = pets.filter((p) => p.species.toUpperCase() === 'DOG').length;
  const felineCount = pets.filter((p) => p.species.toUpperCase() === 'CAT').length;
  const otherCount = totalPets - canineCount - felineCount;

  // Compute vaccinations & reminders
  const now = new Date();
  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(now.getDate() + 30);

  const allReminders: FlattenedVaccineReminder[] = [];
  const allEncounters: FlattenedEncounter[] = [];

  pets.forEach((pet) => {
    // Vaccinations
    (pet.vaccinations || []).forEach((vac) => {
      let isOverdue = false;
      let isDueSoon = false;
      if (vac.dueDate) {
        const due = new Date(vac.dueDate);
        if (due < now) {
          isOverdue = true;
        } else if (due <= thirtyDaysAhead) {
          isDueSoon = true;
        }
      }
      allReminders.push({
        vaccine: vac,
        pet,
        isOverdue,
        isDueSoon,
      });
    });

    // Clinical encounters
    (pet.clinicalRecords || []).forEach((enc) => {
      allEncounters.push({
        encounter: enc,
        pet,
      });
    });
  });

  // Sort reminders: overdue first, then due soon, then by date
  allReminders.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    const dateA = a.vaccine.dueDate ? new Date(a.vaccine.dueDate).getTime() : 0;
    const dateB = b.vaccine.dueDate ? new Date(b.vaccine.dueDate).getTime() : 0;
    return dateA - dateB;
  });

  // Sort encounters: most recent first
  allEncounters.sort((a, b) => {
    return new Date(b.encounter.createdAt).getTime() - new Date(a.encounter.createdAt).getTime();
  });

  const totalVaccinesRecorded = allReminders.length;
  const dueOrOverdueCount = allReminders.filter((r) => r.isOverdue || r.isDueSoon).length;
  const totalEncounters = allEncounters.length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Error Alert if any */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
          <AlertTriangle className="size-5 text-amber-600 shrink-0" />
          <span className="text-xs font-medium">{error}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e1e3e4] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#006971]/10 text-[#006971]">
              <PawPrint className="size-3" />
              <span>Veterinary Clinical Workspace</span>
            </span>
            <span className="text-xs text-[#79747e]">•</span>
            <span className="text-xs text-[#79747e]">Dr. {user?.fullName || 'Veterinarian'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#191c1d]">Companion Animal Clinical Overview</h1>
          <p className="text-sm text-[#494552] mt-0.5">
            Active veterinary patient cohort, immunization schedules, and longitudinal encounter records.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/veterinary/pets')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#5b14b8] text-white text-xs font-semibold hover:bg-[#3f1d8b] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b14b8] focus:ring-offset-2"
          >
            <Plus className="size-4" />
            <span>Document Encounter</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Companion Animals */}
        <div className="bg-white p-5 rounded-2xl border border-[#e1e3e4] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#494552]">Total Companion Animals</span>
            <div className="size-8 rounded-lg bg-purple-50 text-[#5b14b8] flex items-center justify-center">
              <PawPrint className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#191c1d]">
              {loading ? <Loader2 className="size-6 animate-spin text-[#5b14b8]" /> : totalPets}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-[#494552]">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">🐕 {canineCount} Dogs</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">🐈 {felineCount} Cats</span>
              {otherCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">🦜 {otherCount} Other</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Clinical Encounters */}
        <div className="bg-white p-5 rounded-2xl border border-[#e1e3e4] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#494552]">Documented Encounters</span>
            <div className="size-8 rounded-lg bg-teal-50 text-[#006971] flex items-center justify-center">
              <Activity className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#191c1d]">
              {loading ? <Loader2 className="size-6 animate-spin text-[#006971]" /> : totalEncounters}
            </div>
            <p className="text-xs text-[#494552] mt-2">Longitudinal SOAP & clinical entries</p>
          </div>
        </div>

        {/* Card 3: Immunizations Recorded */}
        <div className="bg-white p-5 rounded-2xl border border-[#e1e3e4] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#494552]">Immunization Records</span>
            <div className="size-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Syringe className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#191c1d]">
              {loading ? <Loader2 className="size-6 animate-spin text-blue-600" /> : totalVaccinesRecorded}
            </div>
            <p className="text-xs text-[#494552] mt-2">Active companion animal vaccinations</p>
          </div>
        </div>

        {/* Card 4: Due & Overdue Immunizations */}
        <div className="bg-white p-5 rounded-2xl border border-[#e1e3e4] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#494552]">Vaccine Boosters Due</span>
            <div className="size-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Calendar className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-[#191c1d]">
              {loading ? <Loader2 className="size-6 animate-spin text-amber-600" /> : dueOrOverdueCount}
            </div>
            <p className="text-xs text-amber-700 font-medium mt-2">
              {dueOrOverdueCount > 0 ? 'Requires clinical attention' : 'All scheduled immunizations current'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upcoming & Due Immunization Schedule */}
        <div className="bg-white rounded-2xl border border-[#e1e3e4] shadow-sm flex flex-col">
          <div className="p-5 border-b border-[#e1e3e4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Syringe className="size-4 text-[#5b14b8]" />
              <h2 className="text-base font-bold text-[#191c1d]">Immunization & Booster Schedule</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/veterinary/pets?tab=vaccinations')}
              className="text-xs font-semibold text-[#5b14b8] hover:text-[#3f1d8b] inline-flex items-center gap-1 transition-colors"
            >
              <span>View Registry</span>
              <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#494552]">
                <Loader2 className="size-6 animate-spin text-[#5b14b8]" />
                <span className="text-xs">Loading immunization schedules...</span>
              </div>
            ) : allReminders.length === 0 ? (
              <div className="py-12 text-center text-[#494552] space-y-2">
                <CheckCircle2 className="size-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-[#191c1d]">No immunization records on file</p>
                <p className="text-xs max-w-xs mx-auto">
                  Log vaccine administrations directly from the companion animal directory.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[360px]">
                {allReminders.slice(0, 6).map((item, idx) => (
                  <div key={item.vaccine.id || idx} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#191c1d] truncate">
                          {item.pet.name}
                        </span>
                        <span className="text-xs text-[#79747e]">
                          ({item.pet.species} • {item.pet.breed || 'Mixed'})
                        </span>
                      </div>
                      <p className="text-xs text-[#494552] mt-0.5 truncate">
                        <strong>{item.vaccine.vaccineName}</strong>
                        {item.vaccine.dueDate && (
                          <span className="ml-2 text-slate-500">
                            Due: {new Date(item.vaccine.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {item.isOverdue ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          OVERDUE
                        </span>
                      ) : item.isDueSoon ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          DUE SOON
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                          CURRENT
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Clinical Encounters */}
        <div className="bg-white rounded-2xl border border-[#e1e3e4] shadow-sm flex flex-col">
          <div className="p-5 border-b border-[#e1e3e4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[#006971]" />
              <h2 className="text-base font-bold text-[#191c1d]">Recent Clinical Encounters</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/veterinary/pets?tab=encounters')}
              className="text-xs font-semibold text-[#5b14b8] hover:text-[#3f1d8b] inline-flex items-center gap-1 transition-colors"
            >
              <span>View All Encounters</span>
              <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#494552]">
                <Loader2 className="size-6 animate-spin text-[#006971]" />
                <span className="text-xs">Loading clinical encounters...</span>
              </div>
            ) : allEncounters.length === 0 ? (
              <div className="py-12 text-center text-[#494552] space-y-2">
                <HeartPulse className="size-8 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-[#191c1d]">No encounters documented yet</p>
                <p className="text-xs max-w-xs mx-auto">
                  Click Document Encounter to log SOAP examination notes and diagnoses.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[360px]">
                {allEncounters.slice(0, 6).map((item, idx) => (
                  <div key={item.encounter.id || idx} className="py-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#191c1d]">{item.pet.name} ({item.pet.species})</span>
                      <span className="text-[#79747e]">
                        {new Date(item.encounter.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#5b14b8]">
                      Diagnosis: {item.encounter.diagnosis}
                    </p>
                    {item.encounter.treatmentPlan && (
                      <p className="text-xs text-[#494552] line-clamp-1">
                        Plan: {item.encounter.treatmentPlan}
                      </p>
                    )}
                    <div className="flex items-center gap-3 pt-0.5 text-[11px] text-[#79747e]">
                      {item.encounter.weightKg && (
                        <span className="flex items-center gap-1">
                          <Scale className="size-3" /> {item.encounter.weightKg} kg
                        </span>
                      )}
                      {item.encounter.temperatureC && (
                        <span className="flex items-center gap-1">
                          <Thermometer className="size-3" /> {item.encounter.temperatureC} °C
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
