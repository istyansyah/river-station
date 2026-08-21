import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import AboutPage from './pages/AboutPage';
import { useSystemStatus } from './hooks/useWeatherQuery';

// Create a client for TanStack Query caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { data: systemStatus } = useSystemStatus();

  return (
    <Layout isDeviceOnline={systemStatus?.device_online ?? false}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
};

export default App;
