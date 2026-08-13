import React, { useState } from 'react';
import { useWeatherHistory } from '../hooks/useWeatherQuery';
import type { WarningStatus } from '../types/sensor';
import DateFilter from '../components/history/DateFilter';
import HistoryTable from '../components/history/HistoryTable';
import Pagination from '../components/history/Pagination';
import ExportCSV from '../components/history/ExportCSV';

const HistoryPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [warningStatus, setWarningStatus] = useState<WarningStatus | ''>('');

  const pageSize = 50;

  // Fetch historical data
  const { data: historyResponse, isLoading, isError, error, refetch } = useWeatherHistory({
    start: startDate || undefined,
    end: endDate || undefined,
    page,
    page_size: pageSize,
    warningStatus: warningStatus || undefined,
  });

  const handleApplyFilter = (start: string, end: string, status: WarningStatus | '') => {
    setStartDate(start);
    setEndDate(end);
    setWarningStatus(status);
    setPage(1);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setWarningStatus('');
    setPage(1);
  };

  const weatherRecords = historyResponse?.data || [];
  const totalPages = historyResponse?.pages || 1;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Data Riwayat Sensor
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Lihat, filter, dan unduh data histori pembacaan stasiun sungai
          </p>
        </div>

        {/* Export CSV Button */}
        <div>
          <ExportCSV data={weatherRecords} filename="river_station_sensor_logs" />
        </div>
      </div>

      {/* Date Search Filters */}
      <DateFilter onApply={handleApplyFilter} onClear={handleClearFilter} />

      {/* Table Data */}
      <div className="flex flex-col">
        {isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
            <p className="font-bold">Data histori gagal dimuat.</p>
            <p className="mt-1 text-xs">{error instanceof Error ? error.message : 'Periksa koneksi backend.'}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              Coba lagi
            </button>
          </div>
        ) : (
          <HistoryTable data={weatherRecords} isLoading={isLoading} />
        )}
        
        {/* Pagination Toolbar */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
         />
       </div>
    </div>
  );
};

export default HistoryPage;
