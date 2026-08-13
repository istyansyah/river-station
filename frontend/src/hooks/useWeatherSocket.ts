import { useEffect, useState, useRef, useCallback } from 'react';
import type { WeatherData } from '../types/sensor';
import { API_BASE_URL } from '../api/axiosInstance';

export const useWeatherSocket = () => {
  const [liveData, setLiveData] = useState<WeatherData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    // Clean up existing connections
    if (socketRef.current) {
      socketRef.current.close();
    }

    const wsUrl = API_BASE_URL
      ? `${API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/ws/weather`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/weather`;
    
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket stream opened.');
      setIsConnected(true);
      setError(null);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('WebSocket received update type:', payload.type);
        
        if (payload.type === 'welcome' || payload.type === 'weather_update') {
          if (payload.data) {
            setLiveData(payload.data);
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket JSON payload:', err);
      }
    };

    socket.onclose = (event) => {
      console.log(`WebSocket stream closed: ${event.reason}. Retrying connection...`);
      setIsConnected(false);
      
      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    socket.onerror = (err) => {
      console.error('WebSocket stream encountered error:', err);
      setError('Connection error occurred');
      socket.close();
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return { liveData, isConnected, error };
};
export default useWeatherSocket;
