import React from 'react';
import { FolderTree, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const Header: React.FC = () => {
  return (
    <header className="border-b-2 border-slate-200 bg-white/90 backdrop-blur-2xl sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 group cursor-pointer"
        >
          <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/10 group-hover:scale-105 transition-transform duration-300">
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 bg-white rounded-sm rotate-45" />
              <div className="absolute inset-0 bg-white/20 rounded-sm scale-125 blur-[2px]" />
            </div>
          </div>
          <div className="flex flex-col -space-y-1">
            <h1 className="text-slate-900 font-black text-xl tracking-tighter">
              NGUYEN <span className="text-orange-600">IVAL</span>
            </h1>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Vision Intelligence</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-6"
        >
          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            System Active
          </div>
        </motion.div>
      </div>
    </header>
  );
};
