
import React from 'react';

interface LibraryCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick: () => void;
  isLoading?: boolean;
}

const LibraryCard: React.FC<LibraryCardProps> = ({ title, description, icon, color, onClick, isLoading }) => {
  return (
    <button 
      onClick={onClick}
      disabled={isLoading}
      className="group relative flex flex-col text-left bg-slate-900/40 border border-slate-800/60 rounded-[2rem] p-6 sm:p-8 transition-all hover:border-slate-600 hover:bg-slate-800/80 active:scale-[0.96] overflow-hidden shadow-2xl"
    >
      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl ${color} flex items-center justify-center text-white text-xl sm:text-2xl mb-5 sm:mb-6 shadow-xl shadow-black/20 group-hover:scale-110 transition-transform duration-500`}>
        {isLoading ? (
          <i className="fa-solid fa-spinner animate-spin"></i>
        ) : (
          <i className={`fa-solid ${icon}`}></i>
        )}
      </div>
      
      <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-2 uppercase">{title}</h3>
      <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6 line-clamp-2">{description}</p>
      
      <div className="mt-auto flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">
        <span className="relative">
          {isLoading ? "Processing..." : "Open Library"}
          <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300"></span>
        </span>
        <i className="fa-solid fa-arrow-right-long group-hover:translate-x-2 transition-transform duration-300"></i>
      </div>

      {/* Modern glow effect */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.03] group-hover:opacity-[0.1] blur-3xl transition-opacity duration-700 ${color}`}></div>
    </button>
  );
};

export default LibraryCard;