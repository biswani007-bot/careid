const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/components/doctors/AdminDoctorDirectory.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Replace the Edit and Suspend menu items
const targetMenu = `                                  <button
                                    type="button"
                                    className="doctors-row-menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuDoctorId(null);
                                      handleNavClick('doctors', \`/admin/doctors/\${doc.id}\`);
                                    }}
                                  >
                                    <Edit3 size={15} />
                                    <span>
                                      {t('doctors.table.editDoctor', 'Edit Doctor Info')}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className={\`doctors-row-menu-item \${
                                      doc.status !== 'Suspended' ? 'danger' : ''
                                    }\`}
                                    role="menuitem"
                                    onClick={() => handleToggleStatus(doc)}
                                  >
                                    {doc.status !== 'Suspended' ? (
                                      <UserX size={15} />
                                    ) : (
                                      <UserCheck size={15} />
                                    )}
                                    <span>
                                      {doc.status !== 'Suspended'
                                        ? t('doctors.table.suspendDoctor', 'Suspend Account')
                                        : t('doctors.table.activateDoctor', 'Activate Account')}
                                    </span>
                                  </button>`;

const replacementMenu = `                                  <button
                                    type="button"
                                    className="doctors-row-menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuDoctorId(null);
                                      setSelectedDoctorForAction(doc);
                                      setActiveModalAction('edit');
                                    }}
                                  >
                                    <Edit3 size={15} />
                                    <span>
                                      {t('doctors.table.editDoctor', 'Edit Doctor Info')}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className="doctors-row-menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuDoctorId(null);
                                      setSelectedDoctorForAction(doc);
                                      setActiveModalAction('reset');
                                    }}
                                  >
                                    <KeyRound size={15} />
                                    <span>
                                      {t('doctors.managementActions.cards.resetCardTitle', 'Reset Password')}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className={\`doctors-row-menu-item \${
                                      doc.status !== 'Suspended' ? 'danger' : ''
                                    }\`}
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenActionMenuDoctorId(null);
                                      setSelectedDoctorForAction(doc);
                                      setActiveModalAction('suspend');
                                    }}
                                  >
                                    {doc.status !== 'Suspended' ? (
                                      <UserX size={15} />
                                    ) : (
                                      <UserCheck size={15} />
                                    )}
                                    <span>
                                      {doc.status !== 'Suspended'
                                        ? t('doctors.table.suspendDoctor', 'Suspend Account')
                                        : t('doctors.table.activateDoctor', 'Activate Account')}
                                    </span>
                                  </button>`;

if (content.includes(targetMenu)) {
  content = content.replace(targetMenu, replacementMenu);
  console.log('Successfully replaced menu items!');
} else {
  console.error('targetMenu not found!');
}

// Add the modals before {/* Action Snackbar Toast */}
const targetModalsLocation = `      {/* Action Snackbar Toast */}`;
const replacementModals = `      {/* Doctor Action Modals */}
      {selectedDoctorForAction && (
        <>
          <SuspendDoctorDialog
            isOpen={activeModalAction === 'suspend'}
            doctorName={selectedDoctorForAction.name}
            isSuspended={selectedDoctorForAction.status === 'Suspended'}
            isLoading={isProcessingAction}
            onClose={() => setActiveModalAction('none')}
            onConfirm={handleConfirmSuspend}
          />

          <ResetDoctorPasswordDialog
            isOpen={activeModalAction === 'reset'}
            doctorName={selectedDoctorForAction.name}
            doctorEmail={selectedDoctorForAction.email || 'dr.vance@clinic.org'}
            isLoading={isProcessingAction}
            onClose={() => setActiveModalAction('none')}
            onConfirm={handleConfirmReset}
          />

          <EditDoctorProfileDialog
            isOpen={activeModalAction === 'edit'}
            doctor={selectedDoctorForAction}
            isLoading={isProcessingAction}
            onClose={() => setActiveModalAction('none')}
            onSave={handleSaveProfile}
          />
        </>
      )}

      {/* Action Snackbar Toast */}`;

if (content.includes(targetModalsLocation)) {
  content = content.replace(targetModalsLocation, replacementModals);
  console.log('Successfully inserted modals!');
} else {
  console.error('targetModalsLocation not found!');
}

fs.writeFileSync(targetFile, content);
console.log('Saved AdminDoctorDirectory.tsx successfully!');
