import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ConsultationPaginationProps {
  currentPage: number;
  totalRecords: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export const ConsultationPagination: React.FC<ConsultationPaginationProps> = ({
  currentPage,
  totalRecords,
  pageSize = 10,
  onPageChange,
  isLoading = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <nav
      className="consultation-pagination-wrapper"
      aria-label="Table pagination navigation"
    >
      <div className="consultation-pagination-summary">
        Showing{' '}
        <span className="font-semibold text-slate-800">
          {startRecord}–{endRecord}
        </span>{' '}
        of <span className="font-semibold text-slate-800">{totalRecords}</span> records
      </div>

      <div className="consultation-pagination-controls">
        <button
          type="button"
          className="pagination-btn pagination-nav-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        <div className="pagination-page-numbers">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis" aria-hidden="true">
                  …
                </span>
              );
            }
            const pageNum = p as number;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                className={`pagination-btn pagination-num-btn ${isActive ? 'active' : ''}`}
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                aria-label={`Page ${pageNum}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="pagination-btn pagination-nav-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
};

export default ConsultationPagination;
