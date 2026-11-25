import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileText, CheckCircle2, Download } from 'lucide-react';
import '../patients/PatientActionDialogs.css';

export interface ViewDoctorDocDialogProps {
  isOpen: boolean;
  docTitle: string;
  doctorName: string;
  onClose: () => void;
}

export const ViewDoctorDocDialog: React.FC<ViewDoctorDocDialogProps> = ({
  isOpen,
  docTitle,
  doctorName,
  onClose,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="patient-dialog-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="patient-dialog-card view-doc"
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-doc-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '100%' }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#e1e2e4]">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[#28006d]/10 flex items-center justify-center text-[#28006d]">
              <FileText size={16} />
            </div>
            <div>
              <h3 id="view-doc-title" className="text-base font-bold text-[#191c1e] font-['Plus_Jakarta_Sans']">
                {docTitle}
              </h3>
              <p className="text-xs text-[#494552]">{doctorName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#494552] hover:text-[#191c1e] transition-colors p-1 rounded-md"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="my-6 p-6 bg-[#f8f9fb] border border-[#e1e2e4] rounded-xl flex flex-col items-center justify-center text-center">
          <div className="size-16 rounded-full bg-[#006a60]/10 flex items-center justify-center text-[#006a60] mb-3">
            <CheckCircle2 size={32} />
          </div>
          <h4 className="text-sm font-semibold text-[#191c1e] mb-1">
            Verified Electronic Record
          </h4>
          <p className="text-xs text-[#494552] max-w-xs">
            Document verified by CareID Admin verification system and cryptographically certified.
          </p>
          <div className="mt-4 px-3 py-1.5 bg-white border border-[#e1e2e4] rounded-lg text-xs font-mono text-[#494552]">
            SHA-256: 8f4a1c...e3d94b
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[#e1e2e4]">
          <button
            type="button"
            className="px-4 py-2 text-xs font-medium text-[#494552] border border-[#e1e2e4] rounded-full hover:bg-[#f8f9fb]"
            onClick={onClose}
          >
            {t('doctors.profile.dialogs.close', 'Close')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#28006d] rounded-full hover:bg-[#200057] transition-colors"
            onClick={onClose}
          >
            <Download size={13} />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewDoctorDocDialog;
