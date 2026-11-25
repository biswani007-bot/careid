import React, { useState, useEffect } from 'react';
import {
  PawPrint,
  Search,
  Plus,
  Syringe,
  Activity,
  Calendar,
  AlertTriangle,
  Check,
  X,
  Loader2,
  FileText,
  Thermometer,
  Scale,
  ShieldAlert,
  UserCheck,
  Clock,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  doctorPetService,
  PetRecord,
  PetClinicalRecord,
  PetVaccination,
  PetTimelineItem,
  CreatePetClinicalRecordDto,
  AddPetVaccinationDto,
} from '@/services/doctorPetService';

export const VeterinaryPetPage: React.FC = () => {
  const { user } = useAuth();

  // Role verification: Allow only accredited veterinarians (VETERINARIAN, DOCTOR_VET, ADMIN, SUPER_ADMIN)
  // Strict Option A separation: Human healthcare DOCTOR and ATTENDING are barred from companion animal records.
  const userRoles = (user?.roles || [user?.role || '']).map((r) => r.toUpperCase());
  const isVeterinaryAuthorized =
    user?.isVeterinarian ?? (
      userRoles.some((r) =>
        ['VETERINARIAN', 'DOCTOR_VET', 'ADMIN', 'SUPER_ADMIN'].includes(r)
      ) || Boolean(user?.specialty?.toLowerCase().includes('vet'))
    );

  const [pets, setPets] = useState<PetRecord[]>([]);
  const [selectedPet, setSelectedPet] = useState<PetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('ALL');
  const [clinicalRecords, setClinicalRecords] = useState<PetClinicalRecord[]>([]);
  const [vaccinations, setVaccinations] = useState<PetVaccination[]>([]);
  const [timelineItems, setTimelineItems] = useState<PetTimelineItem[]>([]);
  const [activeTab, setActiveTab] = useState<'encounters' | 'vaccinations' | 'timeline'>('encounters');

  // Modal State - Encounter
  const [isEncounterModalOpen, setIsEncounterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State - Vaccination
  const [isVaccinationModalOpen, setIsVaccinationModalOpen] = useState(false);
  const [isSubmittingVaccination, setIsSubmittingVaccination] = useState(false);
  const [vaccinationModalError, setVaccinationModalError] = useState<string | null>(null);

  const [encounterForm, setEncounterForm] = useState<CreatePetClinicalRecordDto>({
    diagnosis: '',
    treatmentPlan: '',
    notes: '',
    weightKg: undefined,
    temperatureC: undefined,
  });

  const [vaccinationForm, setVaccinationForm] = useState<AddPetVaccinationDto>({
    vaccineName: '',
    administeredDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    batchNumber: '',
    veterinarian: '',
    clinicName: '',
    notes: '',
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPets = async () => {
    setLoading(true);
    try {
      const res = await doctorPetService.getAllPets({
        search: search || undefined,
        species: speciesFilter !== 'ALL' ? speciesFilter : undefined,
      });
      setPets(res.data || []);
      if (res.data?.length && !selectedPet) {
        setSelectedPet(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to load veterinary companion records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPets();
  }, [speciesFilter]);

  useEffect(() => {
    if (selectedPet) {
      doctorPetService
        .getClinicalRecords(selectedPet.id)
        .then((records) => setClinicalRecords(records || []))
        .catch(() => setClinicalRecords(selectedPet.clinicalRecords || []));

      doctorPetService
        .getVaccinations(selectedPet.id)
        .then((vaxes) => setVaccinations(vaxes || []))
        .catch(() => setVaccinations(selectedPet.vaccinations || []));

      doctorPetService
        .getPetTimeline(selectedPet.id)
        .then((timeline) => setTimelineItems(timeline || []))
        .catch(() => setTimelineItems([]));
    }
  }, [selectedPet]);

  const handleSelectPet = (pet: PetRecord) => {
    setSelectedPet(pet);
  };

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet || !encounterForm.diagnosis.trim()) {
      setModalError('Clinical diagnosis is required.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      const rec = await doctorPetService.addClinicalRecord(selectedPet.id, encounterForm);
      setClinicalRecords([rec, ...clinicalRecords]);
      doctorPetService.getPetTimeline(selectedPet.id).then(setTimelineItems).catch(() => {});
      setIsEncounterModalOpen(false);
      setEncounterForm({
        diagnosis: '',
        treatmentPlan: '',
        notes: '',
        weightKg: undefined,
        temperatureC: undefined,
      });
      triggerToast('Veterinary clinical encounter documented successfully.');
    } catch (err: any) {
      setModalError(err?.message || 'Failed to document clinical encounter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet || !vaccinationForm.vaccineName.trim() || !vaccinationForm.administeredDate) {
      setVaccinationModalError('Vaccine name and administration date are required.');
      return;
    }

    setIsSubmittingVaccination(true);
    setVaccinationModalError(null);
    try {
      const vac = await doctorPetService.addVaccination(selectedPet.id, vaccinationForm);
      setVaccinations((prev) => [vac, ...prev]);
      setSelectedPet((prev) => (prev ? { ...prev, vaccinations: [vac, ...(prev.vaccinations || [])] } : null));
      doctorPetService.getPetTimeline(selectedPet.id).then(setTimelineItems).catch(() => {});
      setIsVaccinationModalOpen(false);
      setVaccinationForm({
        vaccineName: '',
        administeredDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        batchNumber: '',
        veterinarian: '',
        clinicName: '',
        notes: '',
      });
      triggerToast('Veterinary vaccination administered & recorded successfully.');
    } catch (err: any) {
      setVaccinationModalError(err?.message || 'Failed to record veterinary vaccination.');
    } finally {
      setIsSubmittingVaccination(false);
    }
  };

  if (!isVeterinaryAuthorized) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Veterinary Role Guard Required</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Access to Companion Animal Clinical Records requires an active veterinary credential
          (VETERINARIAN or DOCTOR_VET authorization role) on the CareID clinical network.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#cbc4d4] rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-[#3f1d8b]">
              <PawPrint className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Veterinary Health Vault</h1>
              <p className="text-xs text-slate-500">
                Companion Animal EHR, Microchip Verification, and Clinical Immunization Tracking
              </p>
            </div>
          </div>
        </div>

        {selectedPet && (
          <button
            type="button"
            onClick={() => {
              setModalError(null);
              setIsEncounterModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3f1d8b] text-white text-xs font-semibold hover:bg-[#5b14b8] shadow-sm transition-all"
          >
            <Plus className="size-4" />
            <span>Document Clinical Encounter</span>
          </button>
        )}
      </div>

      {/* Main Grid: Left Pet Directory (Span 4), Right Clinical Chart (Span 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Pet List */}
        <div className="lg:col-span-4 bg-white border border-[#cbc4d4] rounded-xl p-4 shadow-sm space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search companion animals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadPets();
                }}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3f1d8b]"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {['ALL', 'DOG', 'CAT', 'BIRD', 'OTHER'].map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setSpeciesFilter(spec)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    speciesFilter === spec
                      ? 'bg-[#3f1d8b] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-xs">Loading companion records...</span>
              </div>
            ) : pets.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No companion animals found.
              </div>
            ) : (
              pets.map((pet) => {
                const isSelected = selectedPet?.id === pet.id;
                return (
                  <div
                    key={pet.id}
                    onClick={() => handleSelectPet(pet)}
                    className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-50/80 border border-purple-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-purple-100 text-[#3f1d8b] flex items-center justify-center font-bold text-xs shrink-0">
                        <PawPrint className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-slate-900">{pet.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {pet.species} {pet.breed ? `• ${pet.breed}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      {pet.vaccinations?.length || 0} vax
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Pet Clinical Chart */}
        <div className="lg:col-span-8 space-y-6">
          {selectedPet ? (
            <>
              {/* Pet Demographic & Vitals Summary */}
              <div className="bg-white border border-[#cbc4d4] rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                      {selectedPet.name}
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-[#3f1d8b] font-semibold">
                        {selectedPet.species}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedPet.breed || 'Mixed / Unknown Breed'} • {selectedPet.gender || 'Unknown Gender'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Microchip ID</span>
                    <p className="font-mono text-xs font-bold text-slate-800">
                      {selectedPet.microchipId || 'NOT CHIPPED'}
                    </p>
                  </div>
                </div>

                {/* Vitals Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                      <Scale className="size-3 text-slate-400" />
                      Weight
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {selectedPet.weight ? `${selectedPet.weight} kg` : '—'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                      <Calendar className="size-3 text-slate-400" />
                      Age
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {selectedPet.age ? `${selectedPet.age} years` : 'Unknown'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                      <Syringe className="size-3 text-slate-400" />
                      Immunizations
                    </span>
                    <p className="text-sm font-bold text-emerald-700 mt-0.5">
                      {vaccinations.length || selectedPet.vaccinations?.length || 0} Recorded
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                      <Activity className="size-3 text-slate-400" />
                      Encounters
                    </span>
                    <p className="text-sm font-bold text-[#3f1d8b] mt-0.5">
                      {clinicalRecords.length} Recorded
                    </p>
                  </div>
                </div>

                {/* Owner / Guardian Contact Details Card */}
                <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#3f1d8b] uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="size-3.5 text-[#3f1d8b]" />
                      Owner / Guardian Contact Information
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Account UID: {selectedPet.ownerUserId ? `${selectedPet.ownerUserId.slice(0, 10)}...` : 'Linked'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    <div className="flex items-center gap-2">
                      <User className="size-3.5 text-purple-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">Owner Name</span>
                        <p className="font-semibold text-slate-900">{selectedPet.ownerName || 'Verified Pet Guardian'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-purple-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">Phone</span>
                        <p className="font-semibold text-slate-900">{selectedPet.ownerPhone || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-purple-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">Email</span>
                        <p className="font-semibold text-slate-900 truncate">{selectedPet.ownerEmail || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedPet.notes && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900">
                    <span className="font-semibold">Special Notes: </span>
                    {selectedPet.notes}
                  </div>
                )}
              </div>

              {/* Tab Navigation for Clinical Sections */}
              <div className="flex items-center justify-between border-b border-[#cbc4d4]/60 bg-white px-6 pt-3 rounded-xl shadow-sm">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('encounters')}
                    className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'encounters'
                        ? 'border-[#3f1d8b] text-[#3f1d8b]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Activity className="size-4" />
                    <span>Clinical Encounters ({clinicalRecords.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('vaccinations')}
                    className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'vaccinations'
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Syringe className="size-4" />
                    <span>Immunizations ({vaccinations.length || selectedPet.vaccinations?.length || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('timeline')}
                    className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                      activeTab === 'timeline'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Clock className="size-4" />
                    <span>Longitudinal Timeline ({timelineItems.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pb-3">
                  {activeTab === 'vaccinations' && (
                    <button
                      type="button"
                      onClick={() => {
                        setVaccinationModalError(null);
                        setIsVaccinationModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-all"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Vaccination</span>
                    </button>
                  )}
                  {activeTab === 'encounters' && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setIsEncounterModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3f1d8b] text-white text-xs font-semibold hover:bg-[#5b14b8] shadow-sm transition-all"
                    >
                      <Plus className="size-3.5" />
                      <span>Document Encounter</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Content: Clinical Encounters */}
              {activeTab === 'encounters' && (
                <div className="bg-white border border-[#cbc4d4] rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Activity className="size-4 text-[#3f1d8b]" />
                      Clinical Encounters &amp; Treatment Plans
                    </h3>
                    <span className="text-xs text-slate-400">{clinicalRecords.length} recorded</span>
                  </div>

                  {clinicalRecords.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                      <FileText className="size-8 mx-auto text-slate-300" />
                      <p>No veterinary clinical encounters documented yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clinicalRecords.map((rec) => (
                        <div
                          key={rec.id}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900 text-sm">{rec.diagnosis}</p>
                            <span className="text-[11px] text-slate-400">
                              {new Date(rec.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {rec.treatmentPlan && (
                            <div>
                              <span className="text-[11px] font-semibold text-slate-600">Treatment Plan:</span>
                              <p className="text-slate-700 mt-0.5">{rec.treatmentPlan}</p>
                            </div>
                          )}

                          {rec.notes && (
                            <div>
                              <span className="text-[11px] font-semibold text-slate-600">Clinical Notes:</span>
                              <p className="text-slate-700 mt-0.5">{rec.notes}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                            {rec.weightKg && <span>Weight: {rec.weightKg} kg</span>}
                            {rec.temperatureC && <span>Temp: {rec.temperatureC} °C</span>}
                            {rec.doctorName && <span>Clinician: Dr. {rec.doctorName}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Immunizations */}
              {activeTab === 'vaccinations' && (
                <div className="bg-white border border-[#cbc4d4] rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Syringe className="size-4 text-emerald-600" />
                      Immunization History &amp; Vaccinations
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setVaccinationModalError(null);
                        setIsVaccinationModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-all"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Vaccination</span>
                    </button>
                  </div>

                  {vaccinations.length > 0 || (selectedPet.vaccinations && selectedPet.vaccinations.length > 0) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(vaccinations.length > 0 ? vaccinations : selectedPet.vaccinations || []).map((vac) => (
                        <div
                          key={vac.id}
                          className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900 text-sm">{vac.vaccineName}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                              Administered
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Administered: <span className="font-medium text-slate-800">{vac.administeredDate}</span>
                            {vac.dueDate ? ` • Due: ${vac.dueDate}` : ''}
                          </p>
                          {vac.clinicName && (
                            <p className="text-[11px] text-slate-500">Clinic: {vac.clinicName}</p>
                          )}
                          {vac.batchNumber && (
                            <p className="text-[10px] font-mono text-slate-400">Batch #{vac.batchNumber}</p>
                          )}
                          {vac.notes && (
                            <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">{vac.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                      <Syringe className="size-8 mx-auto text-slate-300" />
                      <p>No immunization records on file for this companion animal.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Longitudinal Timeline */}
              {activeTab === 'timeline' && (
                <div className="bg-white border border-[#cbc4d4] rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="size-4 text-blue-600" />
                      Longitudinal Veterinary Timeline
                    </h3>
                    <span className="text-xs text-slate-400">{timelineItems.length} events</span>
                  </div>

                  {timelineItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                      <Clock className="size-8 mx-auto text-slate-300" />
                      <p>No timeline events recorded yet.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {timelineItems.map((item) => {
                        const isVaccination = item.eventType === 'VACCINATION';
                        return (
                          <div key={item.id} className="relative group">
                            {/* Dot / Icon */}
                            <div
                              className={`absolute -left-6 top-0.5 size-4 rounded-full border-2 border-white flex items-center justify-center ${
                                isVaccination ? 'bg-emerald-600' : 'bg-[#3f1d8b]'
                              }`}
                            />
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                    isVaccination
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-purple-100 text-[#3f1d8b]'
                                  }`}
                                >
                                  {item.eventType}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {new Date(item.date).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                              {item.details && (
                                <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200/60">
                                  {item.details.treatmentPlan && (
                                    <p><span className="font-semibold">Treatment:</span> {item.details.treatmentPlan}</p>
                                  )}
                                  {item.details.clinicName && (
                                    <p><span className="font-semibold">Clinic:</span> {item.details.clinicName}</p>
                                  )}
                                  {item.details.dueDate && (
                                    <p><span className="font-semibold">Due:</span> {item.details.dueDate}</p>
                                  )}
                                  {item.details.notes && (
                                    <p><span className="font-semibold">Notes:</span> {item.details.notes}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white border border-[#cbc4d4] rounded-xl p-12 text-center text-slate-400 space-y-2">
              <PawPrint className="size-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Select a companion animal</p>
              <p className="text-xs">Choose a pet from the directory on the left to review the medical chart.</p>
            </div>
          )}
        </div>
      </div>

      {/* Document Clinical Encounter Modal */}
      {isEncounterModalOpen && selectedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="size-5 text-[#3f1d8b]" />
                  Veterinary Encounter — {selectedPet.name}
                </h3>
                <p className="text-xs text-slate-500">Document clinical diagnosis and treatment</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEncounterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEncounter} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Diagnosis / Clinical Finding *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Canine Atopic Dermatitis, Otitis Externa, Routine Wellness"
                  value={encounterForm.diagnosis}
                  onChange={(e) => setEncounterForm({ ...encounterForm, diagnosis: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#3f1d8b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <Scale className="size-3.5 text-slate-400" />
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 15.2"
                    value={encounterForm.weightKg || ''}
                    onChange={(e) =>
                      setEncounterForm({
                        ...encounterForm,
                        weightKg: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <Thermometer className="size-3.5 text-slate-400" />
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 38.6"
                    value={encounterForm.temperatureC || ''}
                    onChange={(e) =>
                      setEncounterForm({
                        ...encounterForm,
                        temperatureC: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Treatment Plan / Medications</label>
                <textarea
                  rows={3}
                  placeholder="Prescribed therapies, dosage, dietary advice, follow-up timeline..."
                  value={encounterForm.treatmentPlan || ''}
                  onChange={(e) => setEncounterForm({ ...encounterForm, treatmentPlan: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Clinical &amp; Behavioral Notes</label>
                <textarea
                  rows={2}
                  placeholder="Physical exam observations, coat condition, behavior during exam..."
                  value={encounterForm.notes || ''}
                  onChange={(e) => setEncounterForm({ ...encounterForm, notes: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEncounterModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-semibold text-white bg-[#3f1d8b] hover:bg-[#5b14b8] disabled:opacity-50 rounded-lg flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Ratify Encounter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vaccination Modal */}
      {isVaccinationModalOpen && selectedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Syringe className="size-5 text-emerald-600" />
                  Administer Vaccination — {selectedPet.name}
                </h3>
                <p className="text-xs text-slate-500">Record veterinary immunization to PostgreSQL Health Vault</p>
              </div>
              <button
                type="button"
                onClick={() => setIsVaccinationModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {vaccinationModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{vaccinationModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVaccination} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Vaccine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rabies Booster (1-Year), DHPP, Bordetella, FVRCP"
                  value={vaccinationForm.vaccineName}
                  onChange={(e) => setVaccinationForm({ ...vaccinationForm, vaccineName: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Administered Date *</label>
                  <input
                    type="date"
                    required
                    value={vaccinationForm.administeredDate}
                    onChange={(e) => setVaccinationForm({ ...vaccinationForm, administeredDate: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Next Due Date</label>
                  <input
                    type="date"
                    value={vaccinationForm.dueDate || ''}
                    onChange={(e) => setVaccinationForm({ ...vaccinationForm, dueDate: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Batch / Lot Number</label>
                  <input
                    type="text"
                    placeholder="e.g. RAB-2026-99"
                    value={vaccinationForm.batchNumber || ''}
                    onChange={(e) => setVaccinationForm({ ...vaccinationForm, batchNumber: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Clinic / Hospital</label>
                  <input
                    type="text"
                    placeholder="e.g. City Veterinary Hospital"
                    value={vaccinationForm.clinicName || ''}
                    onChange={(e) => setVaccinationForm({ ...vaccinationForm, clinicName: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Clinical Administration Notes</label>
                <textarea
                  rows={2}
                  placeholder="Injection site (e.g. subcutaneous right hind leg), dosage, manufacturer, patient tolerance..."
                  value={vaccinationForm.notes || ''}
                  onChange={(e) => setVaccinationForm({ ...vaccinationForm, notes: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsVaccinationModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVaccination}
                  className="px-5 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5"
                >
                  {isSubmittingVaccination ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Ratify Immunization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
          <Check className="size-4 text-emerald-400" />
          <span>{toastMessage}</span>
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

export default VeterinaryPetPage;
