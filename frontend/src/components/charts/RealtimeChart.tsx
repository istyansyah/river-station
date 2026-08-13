import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useWeatherChart } from '../../hooks/useWeatherQuery';
import { Spinner } from '../ui/Spinner'; // We will build this custom UI component next

const fields = [
  { key: 'water_level', label: 'Tren Kenaikan Air', unit: 'cm', color: '#14b8a6', fill: 'url(#colorWater)' },
  { key: 'temperature', label: 'Suhu', unit: '°C', color: '#ef4444', fill: 'url(#colorTemp)' },
  { key: 'humidity', label: 'Kelembapan', unit: '%', color: '#0ea5e9', fill: 'url(#colorHum)' },
  { key: 'heat_index', label: 'Heat Index', unit: '°C', color: '#f59e0b', fill: 'url(#colorHeat)' },
  { key: 'wind_speed', label: 'Kecepatan Angin', unit: 'km/h', color: '#10b981', fill: 'url(#colorWind)' },
];

const ranges = [
  { label: '1 Jam Terakhir', value: '-1h', window: '1m' },
  { label: '6 Jam Terakhir', value: '-6h', window: '5m' },
  { label: '24 Jam Terakhir', value: '-24h', window: '15m' },
];

const RealtimeChart: React.FC = () => {
  const [selectedField, setSelectedField] = useState('water_level');
  const [selectedRange, setSelectedRange] = useState('-1h');
  const activeRange = ranges.find((r) => r.value === selectedRange) || ranges[0];

  // Fetch aggregated data
  const { data: chartResponse, isLoading, isError, error, refetch } = useWeatherChart(
    selectedField,
    activeRange.value,
    activeRange.window
  );

  const activeField = fields.find((f) => f.key === selectedField) || fields[0];
  const chartData = useMemo(
    () => (chartResponse?.data || [])
      .map((point) => ({ ...point, timestampMs: new Date(point.timestamp).getTime() }))
      .filter((point) => Number.isFinite(point.timestampMs))
      .sort((a, b) => a.timestampMs - b.timestampMs),
    [chartResponse?.data]
  );

  const visibleTicks = useMemo(() => {
    const tickCount = selectedRange === '-1h' ? 10 : 12;
    if (chartData.length <= tickCount) {
      return chartData.map((point) => point.timestampMs);
    }

    return Array.from({ length: tickCount }, (_, index) => {
      const dataIndex = Math.round((index * (chartData.length - 1)) / (tickCount - 1));
      return chartData[dataIndex].timestampMs;
    });
  }, [chartData, selectedRange]);

  const pad2 = (n: number) => String(n).padStart(2, '0');

  const formatXAxis = (timestampMs: number) => {
    const d = new Date(timestampMs);
    if (!Number.isFinite(d.getTime())) return '';

    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const formatTooltipTime = (timestamp: number) => {
    const d = new Date(timestamp);
    if (!Number.isFinite(d.getTime())) return '';

    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  };

  const formatTooltipValue = (value: any) => {
    return [`${Number(value || 0).toFixed(1)} ${activeField.unit}`, activeField.label];
  };

  return (
    <div className="monitor-card card-hover-effect p-5">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Grafik Monitoring Berkala
          </h3>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Analisis tren data sensor real-time
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-1 self-start sm:self-auto select-none">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelectedRange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                selectedRange === r.value
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sensor Metric Selector Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {fields.map((f) => (
          <button
            key={f.key}
            onClick={() => setSelectedField(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-150 ${
              selectedField === f.key
                ? 'bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-slate-950 dark:border-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Chart container */}
      <div className="h-72 w-full relative flex items-center justify-center">
         {isLoading ? (
           <div className="flex flex-col items-center gap-2">
             <Spinner className="w-8 h-8 text-slate-400" />
             <span className="text-xs font-semibold text-slate-400">Memuat data grafik...</span>
           </div>
         ) : isError ? (
           <div className="text-center text-sm text-rose-600 dark:text-rose-300">
             <p className="font-bold">Grafik gagal dimuat</p>
             <p className="mt-1 text-xs">{error instanceof Error ? error.message : 'Periksa koneksi backend.'}</p>
             <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">
               Coba lagi
             </button>
           </div>
         ) : !chartResponse?.data?.length ? (
           <span className="text-sm font-semibold text-slate-400">Belum ada data grafik.</span>
         ) : (
            <ResponsiveContainer width="100%" height="100%" key={selectedRange + '-' + selectedField}>
              <AreaChart
                 data={chartData}

                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
              <defs>
                {/* Visual gradients for Area under lines */}
                <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorHeat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                 <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                   <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                 </linearGradient>


              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
              
                <XAxis
                  dataKey="timestampMs"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  ticks={visibleTicks}
                  tickFormatter={(value) => formatXAxis(Number(value))}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                />

                <YAxis
                  domain={
                    selectedField === 'temperature' ? [0, 85] :
                    selectedField === 'humidity' || selectedField === 'wind_speed' ? [0, 100] :
                    ['auto', 'auto']
                  }
                  tickLine={false}
                  axisLine={false}
                 tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
               />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                }}
                labelStyle={{ color: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                itemStyle={{ color: '#fff', fontSize: 12, fontWeight: 600 }}
                  labelFormatter={(label) => formatTooltipTime(Number(label))}
                  formatter={formatTooltipValue}
              />

               <Area
                 type="monotone"
                 dataKey={selectedField}
                 stroke={activeField.color}
                 strokeWidth={2.5}
                 fillOpacity={1}
                 fill={activeField.fill}
               />
             </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RealtimeChart;
