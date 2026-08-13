import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  isDeviceOnline: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, isDeviceOnline }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Navigation Drawer */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-10 bg-slate-950/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Container */}
      <div className={`flex flex-col min-h-screen transition-[padding] duration-300 ${sidebarOpen ? 'md:pl-64' : ''}`}>
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isDeviceOnline={isDeviceOnline}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Layout;
