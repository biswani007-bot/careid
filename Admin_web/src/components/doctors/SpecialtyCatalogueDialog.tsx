import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Search,
  Edit2,
  Check,
  Stethoscope,
  Power,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  useSpecialtiesQuery,
  useAddSpecialtyMutation,
  useUpdateSpecialtyMutation,
  useDeleteSpecialtyMutation,
  type SpecialtyItem,
} from '../../services/doctorService';

export interface SpecialtyCatalogueDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpecialtyCatalogueDialog: React.FC<SpecialtyCatalogueDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: specialties = [], isLoading, error } = useSpecialtiesQuery();
  const addMutation = useAddSpecialtyMutation();
  const updateMutation = useUpdateSpecialtyMutation();
  const deleteMutation = useDeleteSpecialtyMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const filteredSpecialties = useMemo(() => {
    if (!searchTerm.trim()) return specialties;
    const q = searchTerm.toLowerCase();
    return specialties.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [specialties, searchTerm]);

  if (!isOpen) return null;

  const handleAddSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setIsError(false);
      await addMutation.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      setNewName('');
      setNewDesc('');
      setShowAddForm(false);
      setStatusMessage(`Specialty "${newName.trim()}" added successfully.`);
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(err?.message || 'Failed to add specialty.');
    }
  };

  const handleStartEdit = (item: SpecialtyItem) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      setIsError(false);
      await updateMutation.mutateAsync({
        id,
        name: editName.trim(),
      });
      setEditingId(null);
      setStatusMessage(`Specialty updated to "${editName.trim()}".`);
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(err?.message || 'Failed to update specialty.');
    }
  };

  const handleToggleStatus = async (item: SpecialtyItem) => {
    try {
      setIsError(false);
      const nextActive = !item.isActive;
      await updateMutation.mutateAsync({
        id: item.id,
        isActive: nextActive,
      });
      setStatusMessage(
        `Specialty "${item.name}" ${nextActive ? 'activated' : 'deactivated'}.`
      );
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(err?.message || 'Failed to toggle status.');
    }
  };

  const handleDelete = async (item: SpecialtyItem) => {
    if (!window.confirm(`Are you sure you want to delete/deactivate "${item.name}"?`)) {
      return;
    }
    try {
      setIsError(false);
      await deleteMutation.mutateAsync(item.id);
      setStatusMessage(`Specialty "${item.name}" removed from active catalogue.`);
    } catch (err: any) {
      setIsError(true);
      setStatusMessage(err?.message || 'Failed to delete specialty.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] max-h-[700px] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#2049ec]">
              <Stethoscope size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Medical Specialties Catalogue</h2>
              <p className="text-xs text-gray-500">
                Manage dynamic doctor specialties. Changes reflect immediately across doctor onboarding.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="border-b border-gray-100 px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search specialties (e.g. Pulmonology)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#2049ec] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={15} />
              <span>{showAddForm ? 'Close Form' : 'Add Specialty'}</span>
            </button>
          </div>

          {/* Feedback banner */}
          {statusMessage && (
            <div
              className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
                isError
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span>{statusMessage}</span>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-xs opacity-75 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Add Inline Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddSpecialty}
              className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3"
            >
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                New Specialty Details
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-medium text-gray-600 block mb-0.5">
                    Specialty Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pulmonology"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-600 block mb-0.5">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Respiratory and lung specialist"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-2.5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending || !newName.trim()}
                  className="rounded-md bg-[#2049ec] px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {addMutation.isPending ? 'Saving...' : 'Save to Catalogue'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Specialty List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="animate-spin text-blue-600" size={18} />
              <span>Loading catalogue...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-xs text-red-600">
              Failed to load specialties: {(error as any)?.message || 'Unknown error'}
            </div>
          ) : filteredSpecialties.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No specialties found matching "{searchTerm}".
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSpecialties.map((item) => {
                const isEditing = editingId === item.id;
                const isActive = item.isActive !== false;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 transition-colors hover:bg-gray-50/60 px-2 rounded-lg"
                  >
                    <div className="flex-1 pr-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="rounded-md border border-blue-400 px-2 py-1 text-xs font-medium focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={updateMutation.isPending}
                            className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                            title="Save"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-sm font-semibold ${
                              isActive ? 'text-gray-900' : 'text-gray-400 line-through'
                            }`}
                          >
                            {item.name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Edit Name"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        disabled={updateMutation.isPending}
                        className={`rounded p-1.5 ${
                          isActive
                            ? 'text-gray-400 hover:bg-amber-50 hover:text-amber-600'
                            : 'text-emerald-500 hover:bg-emerald-50'
                        }`}
                        title={isActive ? 'Deactivate' : 'Activate'}
                      >
                        <Power size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deleteMutation.isPending}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete / Deactivate"
                      >
                        <AlertCircle size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3 rounded-b-2xl">
          <span className="text-xs text-gray-500">
            Total Specialities: {specialties.length} (Active:{' '}
            {specialties.filter((s) => s.isActive !== false).length})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
