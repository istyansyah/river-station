import React from 'react';
import type { TourismStatus, WarningStatus } from '../../types/sensor';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface TouristRecommendationCardProps {
  status: TourismStatus;
  warningStatus: WarningStatus;
  waterLevel: number;
  heatIndex: number;
  rainStatus: string;
  windSpeed: number;
}

const TouristRecommendationCard: React.FC<TouristRecommendationCardProps> = ({
  status,
  warningStatus,
  waterLevel,
  heatIndex,
  rainStatus,
  windSpeed,
}) => {
  const normalizedRain = rainStatus.toLowerCase();
  const conditions: string[] = [];
  const recommendations: string[] = [];

  if (waterLevel >= 30) {
    conditions.push('Muka Air Naik');
    recommendations.push('Jangan masuk sungai dan batasi akses ke tepi sungai.');
  }
  if (normalizedRain !== 'no rain') {
    conditions.push('Hujan');
    recommendations.push('Hindari aliran sungai dan batu yang licin saat hujan.');
  }
  if (heatIndex > 32.2) {
    conditions.push('Panas');
    recommendations.push('Minum air, beristirahat di tempat teduh, dan kurangi aktivitas berat.');
  }
  if (windSpeed >= 45) {
    conditions.push('Angin Kencang');
    recommendations.push('Jauhi pohon, tebing, dan benda yang mudah jatuh.');
  }
  if (warningStatus === 'Waspada') {
    conditions.push('Muka Air Naik');
    recommendations.push('Batasi akses ke tepi sungai dan jangan masuk ke aliran sungai.');
  }
  if (warningStatus === 'Siaga' || warningStatus === 'Awas') {
    conditions.push(warningStatus);
    recommendations.push('Hentikan wisata dan ikuti arahan evakuasi petugas.');
  }

  const conditionLabel = conditions.length ? conditions.join(' • ') : 'Kondisi Normal';

  const config = {
    Suitable: {
      wrapper: 'from-cyan-500 to-teal-600',
      Icon: CheckCircleIcon,
      title: 'Aman untuk wisata',
      text: recommendations.length ? recommendations.join(' ') : 'Kondisi sungai dan cuaca mendukung aktivitas rekreasi.',
      action: recommendations.length ? 'Ikuti rekomendasi kondisi dan tetap pantau perubahan lingkungan.' : 'Nikmati wisata dengan tetap mengikuti arahan petugas.',
    },
    Caution: {
      wrapper: 'from-amber-500 to-orange-500',
      Icon: ExclamationTriangleIcon,
      title: 'Wisata dengan hati-hati',
      text: recommendations.length ? recommendations.join(' ') : 'Kondisi lingkungan kurang ideal untuk aktivitas air.',
      action: 'Batasi aktivitas di air dan awasi anak-anak.',
    },
    'Not Recommended': {
      wrapper: 'from-rose-500 to-red-600',
      Icon: XCircleIcon,
      title: 'Tidak disarankan berwisata',
      text: recommendations.length ? recommendations.join(' ') : 'Kondisi sungai berisiko bagi keselamatan pengunjung.',
      action: 'Jauhi area sungai dan ikuti instruksi petugas.',
    },
  }[status];
  const Icon = config.Icon;

  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.wrapper} p-6 text-white shadow-lg sm:p-8`}>
      <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-black/10" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Rekomendasi untuk pengunjung</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{config.title}</h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-white/80">Kondisi: {conditionLabel}</p>
            <p className="mt-2 max-w-xl text-sm font-medium text-white/85">{config.text}</p>
          </div>
        </div>
        <div className="max-w-xs rounded-2xl bg-black/10 p-4 text-sm font-semibold leading-6 backdrop-blur-sm">
          {config.action}
        </div>
      </div>
    </section>
  );
};

export default TouristRecommendationCard;
