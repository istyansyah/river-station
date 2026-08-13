import axiosInstance from './axiosInstance';
import type { WarningStatus, WeatherData, HistoryResponse, ChartResponse, SystemStatusResponse } from '../types/sensor';

export const weatherApi = {
  getLatest: async (deviceId?: string): Promise<WeatherData> => {
    const response = await axiosInstance.get<WeatherData>('/api/weather/latest', {
      params: deviceId ? { device_id: deviceId } : {},
    });
    return response.data;
  },

  getHistory: async (params: {
    start?: string;
    end?: string;
    page?: number;
    page_size?: number;
    deviceId?: string;
    warningStatus?: WarningStatus;
  }): Promise<HistoryResponse> => {
    const response = await axiosInstance.get<HistoryResponse>('/api/weather/history', {
      params: {
        start: params.start || undefined,
        end: params.end || undefined,
        page: params.page || 1,
        page_size: params.page_size || 50,
         device_id: params.deviceId || undefined,
         warning_status: params.warningStatus || undefined,
       },
    });
    return response.data;
  },

  getChart: async (field: string, start = '-1h', window = '1m'): Promise<ChartResponse> => {
    const response = await axiosInstance.get<ChartResponse>('/api/weather/chart', {
      params: { field, start, window },
    });
    return response.data;
  },

  getSystemStatus: async (): Promise<SystemStatusResponse> => {
    const response = await axiosInstance.get<SystemStatusResponse>('/api/status');
    return response.data;
  },
};
