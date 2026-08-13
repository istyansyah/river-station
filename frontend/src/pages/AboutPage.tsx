import React from 'react';
import { useSystemStatus } from '../hooks/useWeatherQuery';
import SystemStatusCard from '../components/cards/SystemStatusCard';
import {
  ChartBarIcon,
  CpuChipIcon,
  CircleStackIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  SignalIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const AboutPage: React.FC = () => {
  const { data: systemStatus, isLoading: isStatusLoading } = useSystemStatus();

  return (
    <div className="space-y-5">
      <section className="monitor-card overflow-hidden p-6 sm:p-8">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            River Station / About System
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sistem Monitoring dan Early Warning Sungai
          </h1>
          <p className="mt-4 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
            River Station adalah sistem monitoring lingkungan berbasis IoT untuk kawasan wisata sungai. Sistem mengumpulkan data sensor dari ESP32, mengirimkannya melalui MQTT, memproses status sungai dan kelayakan wisata di backend, lalu menyimpan serta menampilkan data secara realtime.
          </p>
        </div>
      </section>

       <section className="grid grid-cols-1 gap-4">
         <SystemStatusCard status={systemStatus} isLoading={isStatusLoading} />
       </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: CpuChipIcon, title: 'Sensor Node', text: 'ESP32 membaca suhu, kelembapan, hujan, angin, dan jarak muka air.' },
          { icon: SignalIcon, title: 'Realtime Data', text: 'Data dikirim melalui MQTT dan diteruskan ke dashboard menggunakan WebSocket.' },
          { icon: CircleStackIcon, title: 'Data Storage', text: 'InfluxDB menyimpan histori pengukuran dan data agregasi grafik.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="monitor-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-300">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-2 text-xs font-medium leading-6 text-slate-500 dark:text-slate-400">{text}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="monitor-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
              <ChartBarIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Primary measurement</p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Relative Water Level</h2>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-950/60">
            <p className="font-mono text-lg font-bold text-teal-600 dark:text-teal-300">ΔH = Dnormal − Dcurrent</p>
          </div>
          <dl className="mt-5 space-y-3 text-xs">
            <div className="flex justify-between gap-4"><dt className="font-semibold text-slate-500">ΔH</dt><dd className="text-right text-slate-700 dark:text-slate-300">Kenaikan muka air relatif</dd></div>
            <div className="flex justify-between gap-4"><dt className="font-semibold text-slate-500">Dnormal</dt><dd className="text-right text-slate-700 dark:text-slate-300">Jarak pada kondisi normal</dd></div>
            <div className="flex justify-between gap-4"><dt className="font-semibold text-slate-500">Dcurrent</dt><dd className="text-right text-slate-700 dark:text-slate-300">Jarak pengukuran saat ini</dd></div>
          </dl>
          <p className="mt-5 text-xs font-medium leading-6 text-slate-500 dark:text-slate-400">
            JSN-SR04T mengukur jarak sensor ke permukaan air. Nilai jarak tidak digunakan langsung untuk klasifikasi; sistem terlebih dahulu menghitung kenaikan relatif dari kondisi normal.
          </p>
        </div>

        <div className="monitor-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <ExclamationTriangleIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">River classification</p>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Level Indikator Sungai</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
             <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/20"><div><p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">NORMAL</p><p className="mt-1 text-xs text-slate-500">ΔH &lt; 30 cm</p></div><span className="h-3 w-3 rounded-full bg-emerald-500" /></div>
             <div className="flex items-center justify-between rounded-xl bg-amber-50 p-4 dark:bg-amber-950/20"><div><p className="text-sm font-bold text-amber-700 dark:text-amber-300">WASPADA</p><p className="mt-1 text-xs text-slate-500">30 cm ≤ ΔH &lt; 60 cm</p></div><span className="h-3 w-3 rounded-full bg-amber-500" /></div>
             <div className="flex items-center justify-between rounded-xl bg-orange-50 p-4 dark:bg-orange-950/20"><div><p className="text-sm font-bold text-orange-700 dark:text-orange-300">SIAGA</p><p className="mt-1 text-xs text-slate-500">60 cm ≤ ΔH &lt; 90 cm</p></div><span className="h-3 w-3 rounded-full bg-orange-500" /></div>
             <div className="flex items-center justify-between rounded-xl bg-rose-50 p-4 dark:bg-rose-950/20"><div><p className="text-sm font-bold text-rose-700 dark:text-rose-300">AWAS</p><p className="mt-1 text-xs text-slate-500">ΔH ≥ 90 cm</p></div><span className="h-3 w-3 rounded-full bg-rose-500" /></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="monitor-card p-6">
          <div className="flex items-center gap-3"><ShieldCheckIcon className="h-5 w-5 text-teal-500" /><h2 className="text-lg font-bold text-slate-900 dark:text-white">Level Kelayakan Wisata</h2></div>
          <div className="mt-5 space-y-3 text-xs">
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20"><p className="font-bold text-cyan-700 dark:text-cyan-300">LAYAK / SUITABLE</p><p className="mt-1 text-slate-600 dark:text-slate-400">Status sungai Normal dan kondisi cuaca mendukung.</p></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"><p className="font-bold text-amber-700 dark:text-amber-300">HATI-HATI / CAUTION</p><p className="mt-1 text-slate-600 dark:text-slate-400">Status sungai Normal tetapi terdapat hujan, panas, atau angin kuat, atau status sungai Waspada.</p></div>
             <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/20"><p className="font-bold text-orange-700 dark:text-orange-300">TIDAK LAYAK / NOT RECOMMENDED</p><p className="mt-1 text-slate-600 dark:text-slate-400">Status sungai Siaga atau Awas. Aktivitas wisata tidak disarankan.</p></div>
          </div>
        </div>

        <div className="monitor-card p-6">
          <div className="flex items-center gap-3"><CloudIcon className="h-5 w-5 text-teal-500" /><h2 className="text-lg font-bold text-slate-900 dark:text-white">Parameter Pendukung</h2></div>
          <div className="mt-5 space-y-4 text-xs">
            <div><p className="font-bold text-slate-700 dark:text-slate-200">AHT10</p><p className="mt-1 leading-5 text-slate-500">Suhu, kelembapan, dan heat index. Heat index &gt;32.2°C menjadi kondisi panas.</p></div>
            <div><p className="font-bold text-slate-700 dark:text-slate-200">Raindrop Sensor</p><p className="mt-1 leading-5 text-slate-500">Nilai ADC mentah `rain_raw` untuk menentukan status hujan.</p></div>
            <div><p className="font-bold text-slate-700 dark:text-slate-200">Anemometer</p><p className="mt-1 leading-5 text-slate-500">Kecepatan angin dalam km/jam.</p></div>
            <div><p className="font-bold text-slate-700 dark:text-slate-200">Notifikasi</p><p className="mt-1 leading-5 text-slate-500">Telegram dikirim hanya saat status sungai Siaga atau Awas.</p></div>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-5 text-xs font-medium leading-6 text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-teal-200">
        <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Nilai `normal_distance` dan threshold harus dikalibrasi berdasarkan kondisi lapangan. Perubahan posisi sensor atau kondisi sungai yang signifikan memerlukan kalibrasi ulang.</p>
      </div>

      <div className="flex items-center justify-center gap-2 pb-2 text-[11px] font-semibold text-slate-400"><SparklesIcon className="h-4 w-4 text-teal-500" /> River Station IoT Monitoring System</div>
    </div>
  );
};

export default AboutPage;
