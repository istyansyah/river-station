import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '../api/weatherApi';
import type { WarningStatus } from '../types/sensor';

export const useLatestWeather = (deviceId?: string) => {
  return useQuery({
    queryKey: ['weather', 'latest', deviceId],
    queryFn: () => weatherApi.getLatest(deviceId),
    refetchInterval: 5000, // Background polling backup in case WebSocket drops
    staleTime: 4000,
  });
};

export const useWeatherHistory = (params: {
  start?: string;
  end?: string;
  page?: number;
  page_size?: number;
  deviceId?: string;
  warningStatus?: WarningStatus;
}) => {
  return useQuery({
    queryKey: ['weather', 'history', params],
    queryFn: () => weatherApi.getHistory(params),
    staleTime: 30000, // Caches history for longer
  });
};

export const useWeatherChart = (field: string, start = '-1h', window = '1m') => {
  return useQuery({
    queryKey: ['weather', 'chart', field, start, window],
    queryFn: () => weatherApi.getChart(field, start, window),
    staleTime: 5000,
    refetchInterval: 10000, // Periodically update chart datasets
  });
};

export const useSystemStatus = () => {
  return useQuery({
    queryKey: ['system', 'status'],
    queryFn: () => weatherApi.getSystemStatus(),
    refetchInterval: 5000, // Auto refresh system health badges
    staleTime: 4000,
  });
};
