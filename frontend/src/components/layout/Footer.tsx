import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-5 px-6 border-t bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-colors text-center text-xs text-slate-500 dark:text-slate-400">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
        <p>
          &copy; {new Date().getFullYear()} River Station IoT. All rights reserved.
        </p>
        <p>
          Rancang Bangun Sistem Monitoring & Early Warning Kawasan Wisata Sungai
        </p>
      </div>
    </footer>
  );
};

export default Footer;
