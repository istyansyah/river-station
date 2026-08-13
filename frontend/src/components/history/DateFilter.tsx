import React, { useState } from 'react';
import { CalendarIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { WarningStatus } from '../../types/sensor';

interface DateFilterProps {
  onApply: (start: string, end: string, warningStatus: WarningStatus | '') => void;
  onClear: () => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ onApply, onClear }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [warningStatus, setWarningStatus] = useState<WarningStatus | ''>('');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert local datetime-local value to ISO strings in UTC
    const startIso = start ? new Date(start).toISOString() : '';
    const endIso = end ? new Date(end).toISOString() : '';
    onApply(startIso, endIso, warningStatus);
  };

  const handleClear = () => {
    setStart('');
    setEnd('');
    setWarningStatus('');
    onClear();
  };

  return (
    <form
      onSubmit={handleApply}
      className="flex flex-wrap items-end gap-4 p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
    >
      {/* Start Date */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Waktu Mulai (Start)
        </label>
        <div className="relative">
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full pl-3 pr-3 py-2 rounded-xl border text-xs font-semibold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white transition"
          />
        </div>
      </div>

      {/* End Date */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Waktu Selesai (End)
        </label>
        <div className="relative">
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full pl-3 pr-3 py-2 rounded-xl border text-xs font-semibold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white transition"
          />
        </div>
      </div>

      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Status Warning
        </label>
        <select
          value={warningStatus}
          onChange={(e) => setWarningStatus(e.target.value as WarningStatus | '')}
          className="w-full px-3 py-2 rounded-xl border text-xs font-semibold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-white transition"
        >
          <option value="">Semua Status</option>
          <option value="Normal">Normal</option>
          <option value="Waspada">Waspada</option>
          <option value="Siaga">Siaga</option>
          <option value="Awas">Awas</option>
        </select>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-xs font-bold transition shadow-sm"
        >
          <CalendarIcon className="w-4 h-4" />
          Filter
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition"
          title="Clear Filter"
        >
          <TrashIcon className="w-4 h-4" />
          Reset
        </button>
      </div>
    </form>
  );
};

export default DateFilter;
