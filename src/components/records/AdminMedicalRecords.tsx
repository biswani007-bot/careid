import React from 'react';
import AdminCategoryHealthRecords from './AdminCategoryHealthRecords';

interface AdminMedicalRecordsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminMedicalRecords: React.FC<AdminMedicalRecordsProps> = ({
  onNavigate,
  onLogout,
}) => {
  return (
    <AdminCategoryHealthRecords
      category="Medical"
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
};

export default AdminMedicalRecords;
