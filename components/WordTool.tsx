
import React, { useState } from 'react';
import { DetectedWord } from '../types';

interface WordToolProps {
  word: DetectedWord;
  onClose: () => void;
  placement: 'top' | 'bottom';
  sourceLangCode: string;
  targetLangCode: string;
}

const WordTool: React.FC<WordToolProps> = ({ word, onClose, placement, sourceLangCode, targetLangCode }) => {
  const [isWordPlaying, setIsWordPlaying] = useState(false);
  const [isSentencePlaying, setIsSentencePlaying] = useState(false);
  const [showAr, setShowAr] = useState(false);

  const speak = (text: string, type: 'word' | 'sentence') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const langMap: Record<string, string> = {
        'Gr': 'de-DE', 'En': 'en-US', 'Es': 'es-ES', 'Fr': 'fr-FR', 'Ar': 'ar-SA'
      };
      utterance.lang = langMap[sourceLangCode] || 'de-DE';
      utterance.rate = 0.85;
      utterance.onstart = () => {
        if (type === 'word') setIsWordPlaying(true);
        else setIsSentencePlaying(true);
      };
      utterance.onend = () => {
        setIsWordPlaying(false);
        setIsSentencePlaying(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  /**
   * horizontalPos clamps the center of the tool so it doesn't overflow.
   * On mobile (200px width), it needs at least 35% margin.
   */
  const horizontalPos = Math.min(Math.max(word.xmin / 10, 40), 60);

  return (
    <div 
      className={`absolute z-[100] glass rounded-[1.2rem] sm:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2.5 sm:p-5 w-[200px] sm:w-[320px] animate-in fade-in zoom-in slide-in-from-top-4 duration-300 select-none border border-white/10`}
      style={{
        top: placement === 'bottom' ? `${word.ymax / 10 + 1}%` : `${word.ymin / 10 - 1}%`,
        left: `${horizontalPos}%`,
        transform: placement === 'bottom' ? 'translateX(-50%)' : 'translate(-50%, -100%)'
      }}
    >
      <div className="flex justify-between items-center mb-1.5 sm:mb-4 px-1">
        <span className="text-[7px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Dictionary</span>
        <button onClick={onClose} className="w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-red-500 hover:text-white transition-all active:scale-75">
          <i className="fa-solid fa-xmark text-[9px] sm:text-xs"></i>
        </button>
      </div>

      <div className="space-y-2 sm:space-y-4">
        {/* Term Section */}
        <div className="flex flex-col gap-1.5 sm:gap-3 p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => speak(word.german, 'word')}
              className={`w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shadow-xl flex-shrink-0 ${
                isWordPlaying 
                  ? 'bg-green-500 text-white scale-90 ring-4 ring-green-500/20' 
                  : 'bg-slate-800 text-green-400 hover:bg-green-600 hover:text-white'
              }`}
            >
              <span className="font-bold text-[8px] sm:text-xs">{sourceLangCode}</span>
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] sm:text-[18px] font-black text-white leading-tight truncate uppercase">{word.german}</div>
              <div className="text-[7px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider hidden sm:block">Source</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 mt-0.5 border-t border-white/5 pt-1.5 sm:pt-3">
            <button 
              onClick={() => setShowAr(!showAr)}
              className={`w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shadow-xl flex-shrink-0 ${
                showAr 
                  ? 'bg-blue-600 text-white ring-4 ring-blue-500/20' 
                  : 'bg-slate-800 text-blue-400 hover:bg-blue-600 hover:text-white'
              }`}
            >
              <span className="font-bold text-[8px] sm:text-xs">{targetLangCode}</span>
            </button>
            <div className="flex-1 text-right" dir={targetLangCode === 'Ar' ? "rtl" : "ltr"}>
              <div className={`text-[13px] sm:text-[20px] font-bold text-white transition-all duration-500 ${showAr ? 'opacity-100 blur-0' : 'opacity-10 blur-[6px]'}`}>
                {word.arabic}
              </div>
            </div>
          </div>
        </div>

        {/* Example Section */}
        <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/40 border border-white/5">
          <div className="flex items-start gap-1.5 sm:gap-3">
            <button 
              onClick={() => speak(word.exampleGerman, 'sentence')}
              className={`w-6 h-6 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all shadow-lg flex-shrink-0 mt-0.5 ${
                isSentencePlaying 
                  ? 'bg-white text-slate-900 animate-pulse' 
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <i className="fa-solid fa-volume-high text-[8px] sm:text-[10px]"></i>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] sm:text-[13px] text-slate-300 italic leading-tight">"{word.exampleGerman}"</p>
              {showAr && (
                <p className="text-[10px] sm:text-[14px] text-green-400 font-semibold mt-1 leading-tight animate-in fade-in slide-in-from-bottom-1" dir={targetLangCode === 'Ar' ? "rtl" : "ltr"}>
                  {word.exampleArabic}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Arrow Indicator */}
      <div 
        className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 glass rotate-45 border-white/10 shadow-sm ${
          placement === 'bottom' 
            ? '-top-1.5 border-t border-l' 
            : '-bottom-1.5 border-r border-b'
        }`}
      ></div>
    </div>
  );
};

export default WordTool;
