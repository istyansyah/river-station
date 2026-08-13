import React from 'react';
import type { TourismStatus } from '../../types/sensor';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface TourismStatusCardProps { status: TourismStatus; }

const TourismStatusCard: React.FC<TourismStatusCardProps> = ({ status }) => {
  const config = {
    Suitable: {
      wrapper: 'border-cyan-200/80 bg-cyan-50/70 dark:border-cyan-900/60 dark:bg-cyan-950/20',
      icon: 'bg-cyan-500', Icon: CheckCircleIcon, label: 'LAYAK',
      text: 'Kondisi lingkungan mendukung aktivitas wisata sungai.',
    },
    Caution: {
      wrapper: 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
      icon: 'bg-amber-500', Icon: ExclamationTriangleIcon, label: 'HATI-HATI',
      text: 'Aktivitas wisata perlu dibatasi dan dipantau.',
    },
    'Not Recommended': {
      wrapper: 'border-rose-200/80 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20',
      icon: 'bg-rose-500 animate-pulse', Icon: XCircleIcon, label: 'TIDAK LAYAK',
      text: 'Tunda aktivitas wisata dan jauhi area sungai.',
    },
  }[status];
  const Icon = config.Icon;

  return (
    <div className={`rounded-2xl border p-5 ${config.wrapper}`}>
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.icon} text-white`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Kelayakan Wisata</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{config.label}</h3>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">{config.text}</p>
        </div>
      </div>
    </div>
  );
};

export default TourismStatusCard;
