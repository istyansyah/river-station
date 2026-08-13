import React from 'react';

interface WeatherCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>;
  details?: string;
  colorClass: string;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ title, value, unit, icon: Icon, details, colorClass }) => (
  <div className="monitor-card card-hover-effect relative overflow-hidden p-5">
    <div className={`absolute inset-x-0 top-0 h-1 ${colorClass}`} />
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          {title}
        </p>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</span>
          <span className="text-sm font-semibold text-slate-400">{unit}</span>
        </div>
        {details && <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">{details}</p>}
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorClass} bg-opacity-15 text-teal-600 dark:text-teal-300`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

export default WeatherCard;
