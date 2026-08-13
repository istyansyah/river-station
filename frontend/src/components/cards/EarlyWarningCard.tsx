import React from 'react';
import type { WarningStatus } from '../../types/sensor';
import { ShieldCheckIcon, ExclamationTriangleIcon, FireIcon } from '@heroicons/react/24/solid';

interface EarlyWarningCardProps { status: WarningStatus; }

const EarlyWarningCard: React.FC<EarlyWarningCardProps> = ({ status }) => {
  const config = {
    Normal: { wrapper: 'border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20', icon: 'bg-emerald-500', Icon: ShieldCheckIcon, label: 'NORMAL', text: 'Kenaikan muka air dan kondisi lingkungan masih aman.' },
    Waspada: { wrapper: 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20', icon: 'bg-amber-500', Icon: ExclamationTriangleIcon, label: 'WASPADA', text: 'Muka air atau kondisi cuaca membutuhkan perhatian.' },
    Siaga: { wrapper: 'border-orange-200/80 bg-orange-50/70 dark:border-orange-900/60 dark:bg-orange-950/20', icon: 'bg-orange-500', Icon: ExclamationTriangleIcon, label: 'SIAGA', text: 'Hentikan aktivitas air dan siapkan evakuasi.' },
    Awas: { wrapper: 'border-rose-200/80 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20', icon: 'bg-rose-500 animate-pulse', Icon: FireIcon, label: 'AWAS', text: 'Tutup lokasi dan ikuti arahan evakuasi.' },
  }[status];
  const Icon = config.Icon;

  return (
    <div className={`rounded-2xl border p-5 ${config.wrapper}`}>
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.icon} text-white`}><Icon className="h-6 w-6" /></div>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status Sungai</p><h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{config.label}</h3><p className="mt-1 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">{config.text}</p></div>
      </div>
    </div>
  );
};

export default EarlyWarningCard;
