export type WarningStatus = 'Normal' | 'Waspada' | 'Siaga' | 'Awas';
export type TourismStatus = 'Suitable' | 'Caution' | 'Not Recommended';

export interface WeatherData {
  device_id: string;
  location: string;
  temperature: number;
  humidity: number;
  heat_index: number;
  water_level: number;
  raw_distance?: number | null;
  wind_speed: number;
  rain_raw: number;
  rain_status: string;
  rssi: number;
  warning_status: WarningStatus;
  tourism_status: TourismStatus;
  timestamp: string;
}

export interface HistoryResponse {
  data: WeatherData[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ChartDataPoint {
  timestamp: string;
  temperature?: number;
  humidity?: number;
  heat_index?: number;
  water_level?: number;
  raw_distance?: number;
  wind_speed?: number;
}

export interface ChartResponse {
  data: ChartDataPoint[];
  field: string;
  aggregation_window: string;
}

export interface SystemStatusResponse {
  backend: string;
  mqtt_connected: boolean;
  influxdb_connected: boolean;
  telegram_enabled: boolean;
  last_data_received: string | null;
  device_id: string | null;
  device_online: boolean;
  uptime_seconds: number;
}
