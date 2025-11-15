import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  text: string;
  children?: React.ReactNode; // Optional children to wrap, if not just an icon
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative flex items-center">
      {children}
      <div
        className="ml-1 cursor-help"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <HelpCircle size={16} className="text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" />
      </div>
      {isVisible && (
        <div className="absolute z-10 w-64 px-3 py-2 text-sm font-medium text-white bg-slate-800 dark:bg-slate-700 rounded-lg shadow-sm -top-2 left-full ml-3 transform -translate-y-1/2 animate-in fade-in duration-200">
          {text}
          <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-slate-800 dark:border-r-slate-700"></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;