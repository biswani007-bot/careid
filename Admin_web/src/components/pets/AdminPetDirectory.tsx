import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Search,
  Plus,
  PawPrint,
  Syringe,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Loader2,
  Filter,
} from 'lucide-react';

import '../dashboard/AdminDashboard.css';
import '../patients/AdminPatientDirectory.css';

import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import {
  petService,
  type PetRecord,
  type PetVaccination,
  type CreatePetDto,
  type AddVaccinationDto,
} from '../../services/petService';

export interface AdminPetDirectoryProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminPetDirectory: React.FC<AdminPetDirectoryProps> = ({
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isVaccinationsOpen, setIsVaccinationsOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<PetRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Register form state
  const [newPet, setNewPet] = useState<CreatePetDto>({
    name: '',
    species: 'DOG',
    breed: '',
    age: undefined,
    dob: '',
    gender: 'MALE',
    weight: undefined,
    microchipId: '',
    ownerUserId: '',
    notes: '',
  });

  // Vaccination form state
  const [vaccinations, setVaccinations] = useState<PetVaccination[]>([]);
  const [newVac, setNewVac] = useState<AddVaccinationDto>({
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
      const res = await petService.listPets({
        search: search || undefined,
        species: speciesFilter !== 'ALL' ? speciesFilter : undefined,
        page: 1,
        limit: 100,
      });
      setPets(res.data || []);
    } catch (err: any) {
      console.error('Failed to load pets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPets();
  }, [speciesFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPets();
  };

  const handleRegisterPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPet.name || !newPet.ownerUserId) {
      setModalError('Pet name and Owner User ID are required.');
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    try {
      await petService.createPet(newPet);
      setIsRegisterOpen(false);
      setNewPet({
        name: '',
        species: 'DOG',
        breed: '',
        age: undefined,
        dob: '',
        gender: 'MALE',
        weight: undefined,
        microchipId: '',
        ownerUserId: '',
        notes: '',
      });
      triggerToast('Companion animal registered successfully in Pet Health Vault.');
      loadPets();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to register pet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenVaccinations = async (pet: PetRecord) => {
    setSelectedPet(pet);
    setIsVaccinationsOpen(true);
    try {
      const list = await petService.getVaccinations(pet.id);
      setVaccinations(list || []);
    } catch (err) {
      setVaccinations(pet.vaccinations || []);
    }
  };

  const handleAddVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet || !newVac.vaccineName || !newVac.administeredDate) {
      return;
    }
    setIsSubmitting(true);
    try {
      const v = await petService.addVaccination(selectedPet.id, newVac);
      setVaccinations([v, ...vaccinations]);
      setNewVac({
        vaccineName: '',
        administeredDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        batchNumber: '',
        veterinarian: '',
        clinicName: '',
        notes: '',
      });
      triggerToast('Vaccination recorded successfully.');
      loadPets();
    } catch (err: any) {
      alert(err?.message || 'Failed to add vaccination.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePet = async (petId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from Pet Health Vault?`)) {
      return;
    }
    try {
      await petService.deletePet(petId);
      triggerToast(`${name} removed from registry.`);
      loadPets();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove pet.');
    }
  };

  // KPIs
  const totalPets = pets.length;
  const totalDogs = pets.filter((p) => p.species?.toUpperCase() === 'DOG').length;
  const totalCats = pets.filter((p) => p.species?.toUpperCase() === 'CAT').length;
  const totalVaccinations = pets.reduce((acc, p) => acc + (p.vaccinations?.length || 0), 0);

  return (
    <div className="careid-dashboard-layout">
      <AdminSidebar
        activeNav="pets"
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <div className="careid-main-content">
        {/* Header */}
        <header className="careid-topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Toggle Navigation Drawer"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{t('dashboard.nav.dashboard', 'Dashboard')}</span>
              <span>/</span>
              <span className="text-slate-800 font-semibold flex items-center gap-1">
                <PawPrint className="size-3.5 text-[#28006d]" />
                Pet Health Vault
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AdminProfileAvatar />
          </div>
        </header>

        {/* Content Body */}
        <main className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Title & Primary Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <PawPrint className="size-6 text-[#28006d]" />
                Companion Animal Health Directory
              </h1>
              <p className="text-xs text-slate-500">
                CareID Pet Module — Registry, Microchip Tracking, and Veterinary Immunization Records
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setModalError(null);
                setIsRegisterOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#28006d] text-white text-xs font-semibold hover:bg-[#3f1d8b] shadow-sm transition-all"
            >
              <Plus className="size-4" />
              <span>Register Companion Animal</span>
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Total Registered</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalPets}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Canines (Dogs)</span>
              <p className="text-2xl font-bold text-indigo-900 mt-1">{totalDogs}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Felines (Cats)</span>
              <p className="text-2xl font-bold text-purple-900 mt-1">{totalCats}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Vaccine Records</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{totalVaccinations}</p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, breed, or microchip ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#28006d]"
              />
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="size-4 text-slate-400 shrink-0" />
              <select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#28006d]"
              >
                <option value="ALL">All Species</option>
                <option value="DOG">Canine (Dog)</option>
                <option value="CAT">Feline (Cat)</option>
                <option value="BIRD">Avian (Bird)</option>
                <option value="OTHER">Other Companion</option>
              </select>
            </div>
          </div>

          {/* Pets Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-xs">Loading companion animal registry...</span>
              </div>
            ) : pets.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <PawPrint className="size-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-700">No companion animals found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No pets match the current search or filter criteria. Register a new pet using the button above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Companion Animal</th>
                      <th className="py-3 px-4">Owner ID</th>
                      <th className="py-3 px-4">Microchip ID</th>
                      <th className="py-3 px-4">Age / Gender</th>
                      <th className="py-3 px-4">Weight</th>
                      <th className="py-3 px-4">Vaccinations</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pets.map((pet) => (
                      <tr key={pet.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-purple-50 text-[#28006d] flex items-center justify-center font-bold text-sm shrink-0">
                              <PawPrint className="size-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{pet.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {pet.species} {pet.breed ? `• ${pet.breed}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                          {pet.ownerUserId ? `${pet.ownerUserId.slice(0, 12)}...` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                          {pet.microchipId || 'Not chipped'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {pet.age ? `${pet.age} yrs` : 'Unknown'} • {pet.gender || 'Unknown'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {pet.weight ? `${pet.weight} kg` : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleOpenVaccinations(pet)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <Syringe className="size-3" />
                            <span>{pet.vaccinations?.length || 0} Records</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenVaccinations(pet)}
                              title="Vaccinations & Clinical"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            >
                              <Syringe className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePet(pet.id, pet.name)}
                              title="Delete Record"
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Register Pet Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <PawPrint className="size-5 text-[#28006d]" />
                  Register Companion Animal
                </h3>
                <p className="text-xs text-slate-500">Add pet record to CareID Health Vault</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
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

            <form onSubmit={handleRegisterPet} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Pet Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Luna, Milo, Bella"
                  value={newPet.name}
                  onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#28006d]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Species *</label>
                  <select
                    value={newPet.species}
                    onChange={(e) => setNewPet({ ...newPet, species: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="DOG">Canine (Dog)</option>
                    <option value="CAT">Feline (Cat)</option>
                    <option value="BIRD">Avian (Bird)</option>
                    <option value="OTHER">Other Companion</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Breed</label>
                  <input
                    type="text"
                    placeholder="e.g. Labrador Retriever"
                    value={newPet.breed || ''}
                    onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Gender</label>
                  <select
                    value={newPet.gender || 'MALE'}
                    onChange={(e) => setNewPet({ ...newPet, gender: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="NEUTERED_MALE">Neutered Male</option>
                    <option value="SPAYED_FEMALE">Spayed Female</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Approx. Age (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    placeholder="e.g. 3"
                    value={newPet.age || ''}
                    onChange={(e) => setNewPet({ ...newPet, age: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 14.5"
                    value={newPet.weight || ''}
                    onChange={(e) => setNewPet({ ...newPet, weight: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Microchip ID (15-digit ISO)</label>
                  <input
                    type="text"
                    placeholder="e.g. 985141002341592"
                    value={newPet.microchipId || ''}
                    onChange={(e) => setNewPet({ ...newPet, microchipId: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Owner User ID / Patient UUID *</label>
                <input
                  type="text"
                  required
                  placeholder="UUID of registered owner / patient account"
                  value={newPet.ownerUserId}
                  onChange={(e) => setNewPet({ ...newPet, ownerUserId: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Clinical / Dietary Notes</label>
                <textarea
                  rows={2}
                  placeholder="Allergies, chronic conditions, behavioral notes..."
                  value={newPet.notes || ''}
                  onChange={(e) => setNewPet({ ...newPet, notes: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-semibold text-white bg-[#28006d] hover:bg-[#3f1d8b] disabled:opacity-50 rounded-lg flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Register Companion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vaccinations Modal */}
      {isVaccinationsOpen && selectedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Syringe className="size-5 text-emerald-600" />
                  Immunization Dossier — {selectedPet.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedPet.species} • Microchip: {selectedPet.microchipId || 'None'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVaccinationsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Existing records */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Vaccination History</h4>
              {vaccinations.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-500 italic">
                  No immunization records documented for this companion animal.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {vaccinations.map((vac) => (
                    <div
                      key={vac.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{vac.vaccineName}</p>
                        <p className="text-[11px] text-slate-500">
                          Administered: {vac.administeredDate}
                          {vac.dueDate ? ` • Due: ${vac.dueDate}` : ''}
                          {vac.veterinarian ? ` • Dr. ${vac.veterinarian}` : ''}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {vac.batchNumber ? `Batch #${vac.batchNumber}` : 'Verified'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add vaccination form */}
            <form onSubmit={handleAddVaccination} className="space-y-3 text-xs pt-3 border-t">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Record New Vaccination</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Vaccine Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rabies 3-Year, DHPP Booster"
                    value={newVac.vaccineName}
                    onChange={(e) => setNewVac({ ...newVac, vaccineName: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Date Administered *</label>
                  <input
                    type="date"
                    required
                    value={newVac.administeredDate}
                    onChange={(e) => setNewVac({ ...newVac, administeredDate: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Next Due Date</label>
                  <input
                    type="date"
                    value={newVac.dueDate || ''}
                    onChange={(e) => setNewVac({ ...newVac, dueDate: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Batch / Serial #</label>
                  <input
                    type="text"
                    placeholder="e.g. RB-9921"
                    value={newVac.batchNumber || ''}
                    onChange={(e) => setNewVac({ ...newVac, batchNumber: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Veterinarian</label>
                  <input
                    type="text"
                    placeholder="Dr. Specialist"
                    value={newVac.veterinarian || ''}
                    onChange={(e) => setNewVac({ ...newVac, veterinarian: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVaccinationsOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Add Vaccination
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

export default AdminPetDirectory;
