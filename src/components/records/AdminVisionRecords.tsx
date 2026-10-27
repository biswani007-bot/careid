import React from 'react';
import AdminCategoryHealthRecords from './AdminCategoryHealthRecords';

interface AdminVisionRecordsProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const AdminVisionRecords: React.FC<AdminVisionRecordsProps> = ({
  onNavigate,
  onLogout,
}) => {
  return (
    <AdminCategoryHealthRecords
      category="Vision"
      onNavigate={onNavigate}
      onLogout={onLogout}
    />
  );
};

export default AdminVisionRecords;
