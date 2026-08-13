import React from 'react';
import type { WeatherData } from '../../types/sensor';

interface HistoryTableProps { data: WeatherData[]; isLoading: boolean; }

const HistoryTable: React.FC<HistoryTableProps> = ({ data, isLoading }) => {
  const formatTime = (timeStr: string) => { try { return new Date(timeStr).toLocaleString(); } catch { return timeStr; } };
  const getWarningBadge = (status: string) => {
    const styles: Record<string, string> = {
      Normal: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
      Waspada: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
      Siaga: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
      Awas: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse',
    };
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || 'bg-slate-50 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400'}`}>{status}</span>;
  };

  const getTourismBadge = (status: string) => {
    const config: Record<string, { label: string; styles: string }> = {
      Suitable: { label: 'Layak', styles: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400' },
      Caution: { label: 'Hati-hati', styles: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
      'Not Recommended': { label: 'Tidak Layak', styles: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
    };
    const item = config[status] || { label: status, styles: 'bg-slate-50 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400' };
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${item.styles}`}>{item.label}</span>;
  };

  return <div className="w-full overflow-hidden rounded-t-2xl border border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="w-full min-w-[1000px] border-collapse text-left"><thead><tr className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400"><th className="px-6 py-4">Waktu Ingest</th><th className="px-6 py-4">Kenaikan Air Relatif (cm)</th><th className="px-6 py-4">Suhu (°C)</th><th className="px-6 py-4">Heat Index (°C)</th><th className="px-6 py-4">Kelembapan (%)</th><th className="px-6 py-4">Kec. Angin (km/h)</th><th className="px-6 py-4">Status Hujan</th><th className="px-6 py-4">Status Sungai</th><th className="px-6 py-4">Kelayakan Wisata</th><th className="px-6 py-4">Signal (RSSI)</th></tr></thead><tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700 dark:divide-slate-850 dark:text-slate-300">{isLoading ? <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">Memuat data histori...</td></tr> : data.length === 0 ? <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">Tidak ada catatan sensor dalam rentang waktu terpilih.</td></tr> : data.map((row, idx) => <tr key={idx} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-950/20"><td className="px-6 py-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">{formatTime(row.timestamp)}</td><td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{row.water_level.toFixed(1)}</td><td className="px-6 py-4">{row.temperature.toFixed(1)}</td><td className="px-6 py-4">{row.heat_index.toFixed(1)}</td><td className="px-6 py-4">{row.humidity.toFixed(0)}%</td><td className="px-6 py-4">{row.wind_speed.toFixed(1)}</td><td className="px-6 py-4">{row.rain_status}</td><td className="px-6 py-4">{getWarningBadge(row.warning_status)}</td><td className="px-6 py-4">{getTourismBadge(row.tourism_status)}</td><td className="px-6 py-4 font-mono text-slate-400">{row.rssi} dBm</td></tr>)}</tbody></table></div></div>;
};

export default HistoryTable;
