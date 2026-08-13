import React, { useEffect, useState } from 'react';
import { Bars3Icon, SunIcon, MoonIcon, SignalIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isDeviceOnline: boolean;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen, isDeviceOnline }) => {
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 border-b border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-[#07111f]/85 glass transition-colors">
      <div className="flex items-center gap-4">
{/* Toggle Sidebar Button */}
         <button
           onClick={() => setSidebarOpen(!sidebarOpen)}
           className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
           aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
           title={sidebarOpen ? 'Tutup menu' : 'Buka menu'}
         >
           <Bars3Icon className="w-6 h-6" />
         </button>
        
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Monitoring Hub
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Realtime Stream Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 transition-all">
          {isDeviceOnline ? (
            <>
              <SignalIcon className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span className="text-slate-600 dark:text-slate-300">ESP32 ONLINE</span>
            </>
          ) : (
            <>
              <SignalSlashIcon className="w-4 h-4 text-rose-500" />
              <span className="text-slate-400 dark:text-slate-500">ESP32 OFFLINE</span>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? (
            <SunIcon className="w-5 h-5 text-amber-500 animate-spin-slow" />
          ) : (
            <MoonIcon className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
