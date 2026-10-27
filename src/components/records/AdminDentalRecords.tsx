import React from 'react';
import AdminCategoryHealthRecords from './AdminCategoryHealthRecords';

interface AdminDentalRecordsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminDentalRecords: React.FC<AdminDentalRecordsProps> = ({
  onNavigate,
  onLogout,
}) => {
  return (
    <AdminCategoryHealthRecords
      category="Dental"
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
};

export default AdminDentalRecords;
