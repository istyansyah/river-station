import React from 'react';
import { WavesIcon } from './WavesIcon';

interface WaterLevelCardProps { waterLevelIncreaseCm: number; rawDistanceCm?: number | null; }

const WaterLevelCard: React.FC<WaterLevelCardProps> = ({ waterLevelIncreaseCm, rawDistanceCm }) => {
  const fillPercentage = Math.min(Math.max((waterLevelIncreaseCm / 90) * 100, 0), 100);
  const level = waterLevelIncreaseCm >= 90 ? 'AWAS' : waterLevelIncreaseCm >= 60 ? 'SIAGA' : waterLevelIncreaseCm >= 30 ? 'WASPADA' : 'NORMAL';
  const accent = level === 'AWAS' ? 'rose' : level === 'SIAGA' ? 'orange' : level === 'WASPADA' ? 'amber' : 'teal';

  return (
    <div className="monitor-card card-hover-effect overflow-hidden p-6"><div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="relative h-48 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950"><div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-${accent}-600 to-${accent}-400/70 transition-all duration-700`} style={{ height: `${fillPercentage}%` }}><WavesIcon className="absolute -top-3 w-full text-white/40" /></div><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="rounded-lg bg-slate-950/60 px-2 py-1 text-lg font-bold text-white">{Math.round(fillPercentage)}%</span><span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/70">level index</span></div></div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Kenaikan muka air</p><div className="mt-2 flex items-baseline gap-2"><span className="font-display text-5xl font-bold tracking-tight text-slate-900 dark:text-white">{waterLevelIncreaseCm.toFixed(1)}</span><span className="text-sm font-bold text-slate-400">cm dari normal</span></div></div><span className={`rounded-full bg-${accent}-100 px-3 py-1 text-xs font-bold text-${accent}-700 dark:bg-${accent}-950/50 dark:text-${accent}-300`}>{level}</span></div><p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">Kenaikan muka air dibandingkan kondisi normal.</p><div className="mt-5 grid grid-cols-3 gap-3 text-xs"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50"><span className="block text-slate-400">Waspada</span><strong className="mt-1 block text-amber-600 dark:text-amber-400">30 cm</strong></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50"><span className="block text-slate-400">Siaga</span><strong className="mt-1 block text-orange-600 dark:text-orange-400">60 cm</strong></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50"><span className="block text-slate-400">Awas</span><strong className="mt-1 block text-rose-600 dark:text-rose-400">90 cm</strong></div></div>{rawDistanceCm != null && <p className="mt-4 text-xs font-semibold text-slate-400">Jarak sensor saat ini: <span className="text-slate-600 dark:text-slate-300">{rawDistanceCm.toFixed(1)} cm</span></p>}</div>
    </div></div>
  );
};

export default WaterLevelCard;
