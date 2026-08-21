import React from 'react';
import useWeatherSocket from '../hooks/useWeatherSocket';
import { useLatestWeather, useSystemStatus } from '../hooks/useWeatherQuery';
import EarlyWarningCard from '../components/cards/EarlyWarningCard';
import TourismStatusCard from '../components/cards/TourismStatusCard';
import TouristRecommendationCard from '../components/cards/TouristRecommendationCard';
import WaterLevelCard from '../components/cards/WaterLevelCard';
import WeatherCard from '../components/cards/WeatherCard';
import RealtimeChart from '../components/charts/RealtimeChart';
import { Spinner } from '../components/ui/Spinner';

import {
  SunIcon,
  CloudIcon,
  FireIcon,
  FlagIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  // 1. Establish WebSocket Stream hook
  const { liveData, isConnected: isSocketConnected } = useWeatherSocket();

  // 2. Fetch fallback REST latest reading in case socket is waiting/offline
  const { data: restLatest, isLoading: isLatestLoading, isError: isLatestError } = useLatestWeather();
  const { data: systemStatus } = useSystemStatus();

  const data = isSocketConnected ? liveData || restLatest : restLatest || liveData;
  const isDeviceOnline = systemStatus?.device_online ?? isSocketConnected;

  if (isLatestLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner className="w-10 h-10 text-brand-500" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Memulai dasbor river station...
        </p>
      </div>
    );
  }

  if (!data && (isLatestError || !isLatestLoading)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Sensor offline</p>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
          Belum ada data sensor yang tersedia. Dashboard akan diperbarui otomatis ketika ESP32 kembali terhubung.
        </p>
      </div>
    );
  }

  const currentData = data || { device_id: 'river-node-01',
    location: 'Lubuk Minturun',
    temperature: 0,
    humidity: 0,
    heat_index: 0,
     water_level: 0,
     raw_distance: null,
     wind_speed: 0,
    rain_raw: 0,
    rain_status: 'No Rain',
    rssi: 0,
    warning_status: 'Normal' as const,
    tourism_status: 'Suitable' as const,
    timestamp: new Date().toISOString(),
  };

  return (
    <div className="space-y-5">
      
      {/* Page Title & Location Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
         <div>
           <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">Panduan Wisata Sungai</p>
           <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
             Selamat datang di {currentData.location}
           </h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className={`h-2 w-2 rounded-full ${isDeviceOnline ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]'}`} />
              {isDeviceOnline ? 'Informasi keselamatan wisata secara realtime' : 'Sensor offline — menampilkan data terakhir'}
            </p>
         </div>
        
        {/* Local time clock ticker badge */}
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 sm:self-center font-mono">
          Last Packet: {new Date(currentData.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <TouristRecommendationCard
        status={currentData.tourism_status}
        warningStatus={currentData.warning_status}
        waterLevel={currentData.water_level}
        heatIndex={currentData.heat_index}
        rainStatus={currentData.rain_status}
        windSpeed={currentData.wind_speed}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <EarlyWarningCard status={currentData.warning_status} />
        <TourismStatusCard status={currentData.tourism_status} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <WaterLevelCard
          waterLevelIncreaseCm={currentData.water_level}
          rawDistanceCm={currentData.raw_distance}
        />
      </div>

      {/* Secondary Row: Metrics Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        <WeatherCard
           title="Suhu sekitar"
           value={currentData.temperature}
           unit="°C"
           icon={SunIcon}
           details="Suhu udara lokasi wisata"
          colorClass="bg-red-500"
        />

        <WeatherCard
           title="Kelembapan udara"
           value={currentData.humidity}
           unit="%"
           icon={CloudIcon}
           details="Kondisi udara sekitar"
          colorClass="bg-sky-500"
        />

        <WeatherCard
           title="Suhu terasa"
           value={currentData.heat_index}
           unit="°C"
           icon={FireIcon}
           details="Perkiraan suhu yang dirasakan"
          colorClass="bg-amber-500"
        />

        <WeatherCard
           title="Kecepatan angin"
           value={currentData.wind_speed}
           unit="km/jam"
           icon={FlagIcon}
           details="Angin di sekitar lokasi wisata"
          colorClass="bg-emerald-500"
        />

      </div>

      {/* Tertiary Row: Rain status fullbanner card */}
      <div className="monitor-card card-hover-effect flex items-center justify-between p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500 text-white">
            <BoltIcon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kondisi hujan
            </h4>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
              {currentData.rain_status}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400">Intensitas sensor</span>
          <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
            {currentData.rain_raw} / 4095
          </p>
        </div>
      </div>

      {/* 📊 Recharts Line/Area Plot */}
      <RealtimeChart />

    </div>
  );
};

export default DashboardPage;
