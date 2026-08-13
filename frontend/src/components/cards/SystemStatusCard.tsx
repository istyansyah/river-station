import React from 'react';
import type { SystemStatusResponse } from '../../types/sensor';
import { CpuChipIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface SystemStatusCardProps { status: SystemStatusResponse | undefined; isLoading: boolean; }

const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ status, isLoading }) => {
  const formatTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return 'Belum ada data';
    const seconds = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 1000));
    return seconds < 5 ? 'Baru saja' : seconds < 60 ? `${seconds} detik lalu` : `${Math.floor(seconds / 60)} menit lalu`;
  };

  const statusRow = (label: string, online: boolean) => (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`flex items-center gap-1.5 text-[10px] font-bold ${online ? 'text-emerald-500' : 'text-rose-500'}`}>
        {online ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
        {online ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  );

  return (
    <div className="monitor-card h-full p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-300"><CpuChipIcon className="h-5 w-5" /></div>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">System health</p><h3 className="text-base font-bold text-slate-900 dark:text-white">Infrastruktur</h3></div>
      </div>
      {isLoading ? <div className="py-8 text-center text-xs text-slate-400">Memuat status...</div> : <div>
        {statusRow('FastAPI Backend', status?.backend === 'online')}
        {statusRow('MQTT Broker', !!status?.mqtt_connected)}
        {statusRow('InfluxDB', !!status?.influxdb_connected)}
        <div className="flex items-center justify-between border-b border-slate-100 py-3 dark:border-slate-800"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Telegram</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{status?.telegram_enabled ? 'ENABLED' : 'DISABLED'}</span></div>
        <div className="flex items-center justify-between pt-3"><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Last update</span><span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{formatTimeAgo(status?.last_data_received || null)}</span></div>
      </div>}
    </div>
  );
};

export default SystemStatusCard;
