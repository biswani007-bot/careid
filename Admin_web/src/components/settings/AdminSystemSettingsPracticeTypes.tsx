import React, { useState } from 'react';
import {
  Building2,
  Palette,
  ShieldCheck,
  UserCheck,
  Bell,
  Database,
  Stethoscope,
  Search,
  Plus,
  Edit2,
  Trash2,
  Power,
  X,
  AlertCircle,
  Menu,
} from 'lucide-react';
import AdminSidebar from '../common/AdminSidebar';
import AdminProfileAvatar from '../common/AdminProfileAvatar';
import {
  useAdminClinicalPracticeTypesQuery,
  useCreateClinicalPracticeTypeMutation,
  useUpdateClinicalPracticeTypeMutation,
  useToggleClinicalPracticeTypeStatusMutation,
  useDeleteClinicalPracticeTypeMutation,
} from '../../services/clinicalPracticeTypeService';
import type { ClinicalPracticeTypeItem } from '../../services/clinicalPracticeTypeService';
import './AdminSystemSettingsGeneral.css';
import './AdminSystemSettingsPracticeTypes.css';

interface AdminSystemSettingsPracticeTypesProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminSystemSettingsPracticeTypes: React.FC<AdminSystemSettingsPracticeTypesProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClinicalPracticeTypeItem | null>(null);
  const [deactivatingItem, setDeactivatingItem] = useState<ClinicalPracticeTypeItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ClinicalPracticeTypeItem | null>(null);

  // Form states for Add
  const [addCode, setAddCode] = useState('');
  const [addDisplayName, setAddDisplayName] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addAuthMapping, setAddAuthMapping] = useState('UNMAPPED');
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Edit
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAuthMapping, setEditAuthMapping] = useState('UNMAPPED');

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Delete rejection message
  const [deleteRejectionMessage, setDeleteRejectionMessage] = useState<string | null>(null);

  // Queries & Mutations
  const {
    data: practiceTypes = [],
    isLoading,
    refetch,
  } = useAdminClinicalPracticeTypesQuery({
    search: search.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  const createMutation = useCreateClinicalPracticeTypeMutation();
  const updateMutation = useUpdateClinicalPracticeTypeMutation();
  const toggleStatusMutation = useToggleClinicalPracticeTypeStatusMutation();
  const deleteMutation = useDeleteClinicalPracticeTypeMutation();

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openAddModal = () => {
    setAddCode('');
    setAddDisplayName('');
    setAddDescription('');
    setAddAuthMapping('UNMAPPED');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!addCode.trim() || !addDisplayName.trim()) {
      setFormError('Code and Display Name are required.');
      return;
    }
    try {
      await createMutation.mutateAsync({
        code: addCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
        displayName: addDisplayName.trim(),
        description: addDescription.trim() || undefined,
        clinicalAuthorizationMapping: addAuthMapping,
      });
      setIsAddModalOpen(false);
      showToast('Clinical practice type created successfully.');
      refetch();
    } catch (err: any) {
      const msg = err?.message || err?.error || 'Failed to create clinical practice type.';
      setFormError(msg);
      showToast(msg, true);
    }
  };

  const openEditModal = (item: ClinicalPracticeTypeItem) => {
    setEditingItem(item);
    setEditDisplayName(item.displayName);
    setEditDescription(item.description || '');
    setEditAuthMapping(item.clinicalAuthorizationMapping || 'UNMAPPED');
    setFormError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setFormError(null);
    if (!editDisplayName.trim()) {
      setFormError('Display Name is required.');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editingItem.id,
        displayName: editDisplayName.trim(),
        description: editDescription.trim() || undefined,
        clinicalAuthorizationMapping: editingItem.isCanonical
          ? editingItem.clinicalAuthorizationMapping
          : editAuthMapping,
      });
      setEditingItem(null);
      showToast('Clinical practice type updated successfully.');
      refetch();
    } catch (err: any) {
      const msg = err?.message || err?.error || 'Failed to update clinical practice type.';
      setFormError(msg);
      showToast(msg, true);
    }
  };

  const handleToggleStatus = async (item: ClinicalPracticeTypeItem) => {
    if (item.isCanonical) {
      showToast('Canonical practice types cannot be deactivated.', true);
      return;
    }
    if (item.status === 'ACTIVE') {
      setDeactivatingItem(item);
    } else {
      try {
        await toggleStatusMutation.mutateAsync({ id: item.id, status: 'ACTIVE' });
        showToast(`Practice type "${item.displayName}" activated.`);
        refetch();
      } catch (err: any) {
        showToast(err?.message || 'Failed to activate practice type.', true);
      }
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivatingItem) return;
    try {
      await toggleStatusMutation.mutateAsync({ id: deactivatingItem.id, status: 'INACTIVE' });
      showToast(`Practice type "${deactivatingItem.displayName}" deactivated.`);
      setDeactivatingItem(null);
      refetch();
    } catch (err: any) {
      showToast(err?.message || 'Failed to deactivate practice type.', true);
      setDeactivatingItem(null);
    }
  };

  const openDeleteDialog = (item: ClinicalPracticeTypeItem) => {
    setDeleteRejectionMessage(null);
    if (item.isCanonical) {
      setDeleteRejectionMessage('Canonical clinical practice types cannot be deleted.');
      setDeletingItem(item);
      return;
    }
    const doctorsCount = item._count?.doctors ?? 0;
    const specialtiesCount = item._count?.specialties ?? 0;
    if (doctorsCount > 0 || specialtiesCount > 0) {
      setDeleteRejectionMessage(
        `Cannot delete clinical practice type "${item.code}": Assigned to ${doctorsCount} active doctor profile(s) and ${specialtiesCount} specialty item(s). Please deactivate instead.`
      );
    }
    setDeletingItem(item);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      showToast(`Practice type "${deletingItem.displayName}" deleted successfully.`);
      setDeletingItem(null);
      refetch();
    } catch (err: any) {
      const msg = err?.message || 'Cannot delete in-use clinical practice type.';
      setDeleteRejectionMessage(msg);
      showToast(msg, true);
    }
  };

  return (
    <div className="settings-wrapper">
      <AdminSidebar
        activeNav="settings"
        isDrawerOpen={isMobileMenuOpen}
        onCloseDrawer={() => setIsMobileMenuOpen(false)}
        onNavigate={handleNav}
        onLogout={onLogout}
      />

      <main className="settings-main">
        {/* Top Navbar */}
        <header className="settings-top-navbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-slate-800">System Settings</h1>
          </div>
          <div className="flex items-center gap-4">
            <AdminProfileAvatar />
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="settings-scroll-container">
          <div className="settings-content-wrap">
            {/* Header Card */}
            <div className="settings-header-card">
              <div className="settings-header-text">
                <h1>Clinical Practice Types Management</h1>
                <p>
                  Manage database-backed clinical practice types, authorization scopes, and active doctor
                  registration classifications.
                </p>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <nav className="settings-tabs-card" aria-label="Settings categories navigation">
              <div className="settings-tabs-list" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="settings-tab-btn"
                  onClick={() => handleNav('/admin/settings/general')}
                >
                  <Building2 size={15} aria-hidden="true" />
                  <span>General & Organization</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="settings-tab-btn"
                  onClick={() => handleNav('/admin/settings/branding')}
                >
                  <Palette size={15} aria-hidden="true" />
                  <span>Branding & Identity</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="settings-tab-btn"
                  onClick={() => handleNav('/admin/settings/security')}
                >
                  <ShieldCheck size={15} aria-hidden="true" />
                  <span>Security Policies</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="settings-tab-btn"
                  onClick={() => handleNav('/admin/settings/roles')}
                >
                  <UserCheck size={15} aria-hidden="true" />
                  <span>Roles & Permissions</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="settings-tab-btn"
                  onClick={() => handleNav('/admin/settings/ocr')}
                >
                  <Bell size={15} aria-hidden="true" />
                  <span>OCR & Notifications</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={false}
                  className="settings-tab-btn"
                  onClick={() => handleNav('/admin/settings/integrations')}
                >
                  <Database size={15} aria-hidden="true" />
                  <span>Integrations & Backup</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  data-tab="clinical-practice-types"
                  aria-selected={true}
                  className="settings-tab-btn active"
                  onClick={() => handleNav('/admin/settings/clinical-practice-types')}
                >
                  <Stethoscope size={15} aria-hidden="true" />
                  <span>Clinical Practice Types</span>
                </button>
              </div>
            </nav>

            {/* Practice Types Content */}
            <div className="practice-types-container">
              {/* Controls Header */}
              <div className="practice-types-header-card">
                <div className="practice-types-header-left">
                  <h1>Practice Type Master Catalogue</h1>
                  <p>Configure dynamic practice types and observe clinical authorization mappings.</p>
                </div>
                <div className="practice-types-controls">
                  <div className="practice-types-search-box">
                    <Search size={16} className="practice-types-search-icon" />
                    <input
                      id="practice-type-search"
                      type="text"
                      className="practice-types-search-input"
                      placeholder="Search practice types..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    id="practice-type-status-filter"
                    className="practice-types-status-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <button
                    id="btn-add-practice-type"
                    type="button"
                    className="btn-add-practice-type"
                    onClick={openAddModal}
                  >
                    <Plus size={16} />
                    <span>Add Practice Type</span>
                  </button>
                </div>
              </div>

              {/* Table Card */}
              <div className="practice-types-table-card">
                <div className="practice-types-table-wrap">
                  <table
                    className="practice-types-table"
                    data-table="clinical-practice-types"
                  >
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Display Name</th>
                        <th>Description</th>
                        <th>Auth Mapping</th>
                        <th>Doctors</th>
                        <th>Specialties</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-500">
                            Loading clinical practice types catalogue...
                          </td>
                        </tr>
                      ) : practiceTypes.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-slate-500">
                            No clinical practice types found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        practiceTypes.map((item) => (
                          <tr key={item.id} data-id={item.id} data-code={item.code}>
                            <td>
                              <span className="code-badge">{item.code}</span>
                              {item.isCanonical && (
                                <span className="canonical-tag">Canonical</span>
                              )}
                            </td>
                            <td className="font-semibold text-slate-900">{item.displayName}</td>
                            <td className="text-slate-600 text-xs max-w-xs truncate">
                              {item.description || '—'}
                            </td>
                            <td>
                              <span className="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                {item.clinicalAuthorizationMapping || 'UNMAPPED'}
                              </span>
                            </td>
                            <td className="text-slate-700 font-medium">
                              {item._count?.doctors ?? 0}
                            </td>
                            <td className="text-slate-700 font-medium">
                              {item._count?.specialties ?? 0}
                            </td>
                            <td>
                              <span
                                className={`status-badge ${
                                  item.status === 'ACTIVE' ? 'active' : 'inactive'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons-cell">
                                <button
                                  type="button"
                                  className="action-icon-btn practice-type-row-edit"
                                  title="Edit Practice Type"
                                  onClick={() => openEditModal(item)}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="action-icon-btn practice-type-row-status"
                                  title={item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                  disabled={item.isCanonical}
                                  onClick={() => handleToggleStatus(item)}
                                >
                                  <Power size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="action-icon-btn danger practice-type-row-delete"
                                  title="Delete Practice Type"
                                  onClick={() => openDeleteDialog(item)}
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
              </div>
            </div>
          </div>
        </div>

        {/* Add Modal */}
        {isAddModalOpen && (
          <div className="modal-overlay">
            <div className="practice-type-modal-card" role="dialog" aria-modal="true">
              <div className="modal-header">
                <h2>Add Clinical Practice Type</h2>
                <button
                  type="button"
                  className="modal-close-btn practice-type-modal-cancel"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {formError && <div className="modal-error-banner">{formError}</div>}

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-form-group">
                  <label htmlFor="practice-type-code">Unique Code *</label>
                  <input
                    id="practice-type-code"
                    name="code"
                    type="text"
                    className="modal-form-input font-mono"
                    placeholder="e.g. OPHTHALMIC_SURGERY"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-form-group">
                  <label htmlFor="practice-type-display-name">Display Name *</label>
                  <input
                    id="practice-type-display-name"
                    name="displayName"
                    type="text"
                    className="modal-form-input"
                    placeholder="e.g. Ophthalmic Surgery"
                    value={addDisplayName}
                    onChange={(e) => setAddDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-form-group">
                  <label htmlFor="practice-type-description">Description</label>
                  <textarea
                    id="practice-type-description"
                    name="description"
                    rows={3}
                    className="modal-form-textarea"
                    placeholder="Scope description and clinical operational notes..."
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                  />
                </div>

                <div className="modal-form-group">
                  <label htmlFor="practice-type-auth-mapping">Clinical Authorization Scope *</label>
                  <select
                    id="practice-type-auth-mapping"
                    name="clinicalAuthorizationMapping"
                    className="modal-form-select"
                    value={addAuthMapping}
                    onChange={(e) => setAddAuthMapping(e.target.value)}
                  >
                    <option value="UNMAPPED">UNMAPPED (Non-clinical / Administrative)</option>
                    <option value="HUMAN_HEALTHCARE">HUMAN_HEALTHCARE (Human Doctor Workspace)</option>
                    <option value="VETERINARY_MEDICINE">VETERINARY_MEDICINE (Veterinary Workspace)</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-modal-cancel practice-type-modal-cancel"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-modal-submit practice-type-modal-submit"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Practice Type'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingItem && (
          <div className="modal-overlay">
            <div className="practice-type-edit-modal-card" role="dialog" aria-modal="true">
              <div className="modal-header">
                <h2>Edit Clinical Practice Type</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setEditingItem(null)}
                >
                  <X size={18} />
                </button>
              </div>

              {formError && <div className="modal-error-banner">{formError}</div>}

              <form onSubmit={handleEditSubmit}>
                <div className="modal-form-group">
                  <label htmlFor="edit-practice-type-code">Code (Immutable)</label>
                  <input
                    id="edit-practice-type-code"
                    name="code"
                    type="text"
                    className="modal-form-input font-mono"
                    value={editingItem.code}
                    disabled
                  />
                </div>

                <div className="modal-form-group">
                  <label htmlFor="edit-practice-type-display-name">Display Name *</label>
                  <input
                    id="edit-practice-type-display-name"
                    name="displayName"
                    type="text"
                    className="modal-form-input"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-form-group">
                  <label htmlFor="edit-practice-type-description">Description</label>
                  <textarea
                    id="edit-practice-type-description"
                    name="description"
                    rows={3}
                    className="modal-form-textarea"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>

                <div className="modal-form-group">
                  <label>Clinical Authorization Scope</label>
                  <input
                    type="text"
                    className="modal-form-input font-mono"
                    value={editingItem.clinicalAuthorizationMapping || 'UNMAPPED'}
                    disabled
                  />
                  {editingItem.isCanonical && (
                    <p className="text-xs text-slate-500 mt-1">
                      Canonical clinical authorization mapping cannot be altered.
                    </p>
                  )}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setEditingItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-modal-submit practice-type-edit-submit"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deactivate Confirmation Dialog */}
        {deactivatingItem && (
          <div className="modal-overlay">
            <div
              className="deactivate-confirmation-dialog"
              role="alertdialog"
              aria-modal="true"
            >
              <div className="modal-header">
                <h2>Confirm Deactivation</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setDeactivatingItem(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Are you sure you want to deactivate{' '}
                <strong>{deactivatingItem.displayName}</strong>?
                Deactivated practice types cannot be selected for new doctor registrations, but existing
                doctors will retain their historical classification.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel btn-cancel-deactivate"
                  onClick={() => setDeactivatingItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-modal-danger btn-confirm-deactivate"
                  onClick={confirmDeactivate}
                  disabled={toggleStatusMutation.isPending}
                >
                  {toggleStatusMutation.isPending ? 'Deactivating...' : 'Confirm Deactivate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal / In-Use Rejection Dialog */}
        {deletingItem && (
          <div className="modal-overlay">
            <div
              className={`practice-type-delete-dialog ${
                deleteRejectionMessage ? 'delete-rejection-dialog action-error-toast' : ''
              }`}
              role="alertdialog"
              aria-modal="true"
            >
              <div className="modal-header">
                <h2>{deleteRejectionMessage ? 'Cannot Delete Practice Type' : 'Confirm Deletion'}</h2>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => {
                    setDeletingItem(null);
                    setDeleteRejectionMessage(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {deleteRejectionMessage ? (
                <>
                  <div className="modal-error-banner flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{deleteRejectionMessage}</span>
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      onClick={() => {
                        setDeletingItem(null);
                        setDeleteRejectionMessage(null);
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-4">
                    Are you sure you want to delete practice type{' '}
                    <strong>{deletingItem.displayName}</strong> ({deletingItem.code})?
                    This action is permanent and cannot be undone.
                  </p>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-modal-cancel btn-cancel-delete"
                      onClick={() => setDeletingItem(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-modal-danger btn-confirm-delete"
                      onClick={confirmDelete}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Toast */}
        {toastMessage && (
          <div className={`action-toast ${toastMessage.isError ? 'error' : ''}`} role="status">
            {toastMessage.text}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminSystemSettingsPracticeTypes;
