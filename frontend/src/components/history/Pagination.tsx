import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl transition-colors">
      
      {/* Mobile view compact text */}
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50 transition"
        >
          Sebelumnya
        </button>
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50 transition"
        >
          Berikutnya
        </button>
      </div>

      {/* Desktop view full controls */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Menampilkan halaman{' '}
            <span className="font-extrabold text-slate-900 dark:text-white">
              {currentPage}
            </span>{' '}
            dari{' '}
            <span className="font-extrabold text-slate-900 dark:text-white">
              {totalPages}
            </span>
          </p>
        </div>

        <div>
          <nav className="relative z-0 inline-flex rounded-xl shadow-sm gap-1.5" aria-label="Pagination">
            {/* Prev button */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50 transition"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Page number button loops can be added, but simple page metrics with limit indicators works beautifully */}
            <span className="relative inline-flex items-center px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300">
              Halaman {currentPage}
            </span>

            {/* Next button */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="relative inline-flex items-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50 transition"
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>

    </div>
  );
};

export default Pagination;
