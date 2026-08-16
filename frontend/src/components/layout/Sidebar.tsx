import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChartBarIcon,
  ClockIcon,
  CircleStackIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: ChartBarIcon,
    },
     {
       name: 'History Data',
       path: '/history',
       icon: ClockIcon,
     },
     {
       name: 'About System',
       path: '/about',
       icon: InformationCircleIcon,
     },
   ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 flex flex-col w-64 bg-[#091827] text-slate-100 border-r border-slate-800 transition-transform duration-300 transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Identity */}
      <div className="flex items-center justify-between gap-3 px-6 h-16 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <CircleStackIcon className="w-8 h-8 text-brand-400 animate-pulse-slow" />
          <div>
            <h1 className="font-bold text-sm leading-tight text-white tracking-wide uppercase">
              River Station
            </h1>
            <span className="text-[10px] text-slate-400 font-medium">
              Early Warning System
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close navigation menu"
        >
          <span className="text-xl leading-none" aria-hidden="true">×</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2 px-2 text-[11px] text-slate-400">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
          <span>River Station</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
