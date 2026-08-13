import React from 'react';
import type { WeatherData } from '../../types/sensor';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface ExportCSVProps {
  data: WeatherData[];
  filename?: string;
}

const ExportCSV: React.FC<ExportCSVProps> = ({ data, filename = 'river_station_history' }) => {
  const escapeCell = (value: unknown) => {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const formatNumber = (value: number | null | undefined, digits = 2) => (
    value == null || !Number.isFinite(value) ? '' : value.toFixed(digits)
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? timestamp : date.toISOString();
  };

  const convertToCSV = (records: WeatherData[]) => {
    if (!records.length) return '';

    const headers = [
      'Timestamp UTC',
      'Device ID',
      'Location',
      'Temperature (°C)',
      'Humidity (%)',
      'Heat Index (°C)',
      'Water Level Increase (cm)',
      'Raw Distance (cm)',
      'Wind Speed (km/h)',
      'Rain Raw (ADC)',
      'Rain Status',
      'River Status',
      'Tourism Suitability',
      'RSSI (dBm)',
    ];

    const rows = records.map((item) => [
      formatTimestamp(item.timestamp),
      item.device_id,
      item.location,
      formatNumber(item.temperature),
      formatNumber(item.humidity),
      formatNumber(item.heat_index),
      formatNumber(item.water_level),
      formatNumber(item.raw_distance),
      formatNumber(item.wind_speed),
      item.rain_raw,
      item.rain_status,
      item.warning_status,
      item.tourism_status,
      item.rssi,
    ]);

    return [headers, ...rows]
      .map((row) => row.map(escapeCell).join(';'))
      .join('\r\n');
  };

  const handleDownload = () => {
    const csvContent = convertToCSV(data);
    if (!csvContent) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    link.href = url;
    link.download = `${filename}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={data.length === 0}
      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-400 dark:disabled:bg-slate-800"
      title="Download data sebagai file Excel/CSV"
    >
      <ArrowDownTrayIcon className="h-4 w-4" />
      Ekspor CSV
    </button>
  );
};

export default ExportCSV;
