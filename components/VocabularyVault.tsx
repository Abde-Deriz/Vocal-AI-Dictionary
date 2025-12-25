
import React, { useState, useMemo } from 'react';
import { DetectedWord, SourceLanguage } from '../types';

interface VocabularyVaultProps {
  words: DetectedWord[];
}

const LANG_CONFIG: Record<string, { flag: string; voice: string; color: string; accent: string }> = {
  'German': { flag: '🇩🇪', voice: 'de-DE', color: 'from-orange-500/20 to-yellow-600/20', accent: 'border-yellow-500/30' },
  'English': { flag: '🇬🇧', voice: 'en-US', color: 'from-blue-500/20 to-red-600/20', accent: 'border-blue-500/30' },
  'Spanish': { flag: '🇪🇸', voice: 'es-ES', color: 'from-red-500/20 to-yellow-600/20', accent: 'border-red-500/30' },
  'French': { flag: '🇫🇷', voice: 'fr-FR', color: 'from-blue-600/20 to-white/20', accent: 'border-blue-400/30' },
  'Arabic': { flag: '🇸🇦', voice: 'ar-SA', color: 'from-green-600/20 to-white/20', accent: 'border-green-500/30' },
};

const VocabularyVault: React.FC<VocabularyVaultProps> = ({ words }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<SourceLanguage | 'All' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTranslations, setShowTranslations] = useState<Record<string, boolean>>({});

  const toggleTranslation = (id: string) => {
    setShowTranslations(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const speak = (text: string, id: string, lang?: SourceLanguage) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang ? LANG_CONFIG[lang]?.voice : 'de-DE';
      utterance.rate = 0.85;
      utterance.onstart = () => setPlayingId(id);
      utterance.onend = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const languageStats = useMemo(() => {
    const stats: Record<string, number> = {};
    words.forEach(w => {
      const lang = w.sourceLanguage || 'German';
      stats[lang] = (stats[lang] || 0) + 1;
    });
    return stats;
  }, [words]);

  const availableLanguages = useMemo(() => {
    return Object.keys(languageStats) as SourceLanguage[];
  }, [languageStats]);

  const filteredWords = useMemo(() => {
    if (!selectedFolder) return [];
    return words.filter(word => {
      const matchesTab = selectedFolder === 'All' || word.sourceLanguage === selectedFolder;
      const matchesSearch = word.german.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            word.arabic.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [words, selectedFolder, searchQuery]);

  if (words.length === 0) return null;

  return (
    <section className="max-w-6xl w-full mx-auto mb-24 animate-fade-up delay-300 px-4 sm:px-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-2">Personal Word Bank</h2>
          <p className="text-xs text-slate-400 font-medium">Browse your collected vocabulary by language folders.</p>
        </div>
        
        {selectedFolder && (
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:w-64">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
              <input 
                type="text" 
                placeholder={`Search in ${selectedFolder}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-white placeholder:text-slate-600 focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 transition-all outline-none"
              />
            </div>
            <button 
              onClick={() => setSelectedFolder(null)}
              className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95 flex items-center gap-2"
            >
              <i className="fa-solid fa-folder-open text-xs"></i> Back to Folders
            </button>
          </div>
        )}
      </div>

      {!selectedFolder ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setSelectedFolder('All')}
            className="group relative flex flex-col items-start p-8 rounded-[2.5rem] bg-slate-900/40 border border-slate-800/60 hover:border-white/20 transition-all hover:bg-slate-800/60 active:scale-[0.97] text-left overflow-hidden shadow-xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform">
              📂
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">All Collections</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">{words.length} Total Words</p>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-white transition-colors">Open Master Folder <i className="fa-solid fa-chevron-right ml-1"></i></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full translate-x-16 -translate-y-16"></div>
          </button>

          {availableLanguages.map(lang => (
            <button 
              key={lang}
              onClick={() => setSelectedFolder(lang)}
              className={`group relative flex flex-col items-start p-8 rounded-[2.5rem] bg-slate-900/40 border ${LANG_CONFIG[lang]?.accent || 'border-slate-800/60'} hover:border-white/20 transition-all hover:bg-slate-800/60 active:scale-[0.97] text-left overflow-hidden shadow-xl`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${LANG_CONFIG[lang]?.color || 'from-slate-700 to-slate-800'} flex items-center justify-center text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                {LANG_CONFIG[lang]?.flag}
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">{lang} Words</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">{languageStats[lang]} Scanned Terms</p>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-white transition-colors">Explore Folder <i className="fa-solid fa-chevron-right ml-1"></i></div>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${LANG_CONFIG[lang]?.color} blur-3xl rounded-full translate-x-16 -translate-y-16 opacity-30`}></div>
            </button>
          ))}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex items-center gap-4 mb-10">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-xl bg-slate-900 border border-white/5`}>
              {selectedFolder === 'All' ? '📂' : LANG_CONFIG[selectedFolder]?.flag}
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{selectedFolder} Folder</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Viewing {filteredWords.length} results</p>
            </div>
          </div>

          {filteredWords.length === 0 ? (
            <div className="py-20 text-center glass rounded-[3rem] border-dashed border-white/10">
              <i className="fa-solid fa-ghost text-4xl text-slate-800 mb-4"></i>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No matching words found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWords.map((word) => (
                <div 
                  key={word.id}
                  className="group glass border border-white/5 rounded-[2.5rem] p-6 hover:border-white/10 transition-all hover:bg-white/5 hover:translate-y-[-4px] duration-300"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] opacity-60">{LANG_CONFIG[word.sourceLanguage || 'German']?.flag}</span>
                        <span className="text-[8px] font-black uppercase tracking-tighter text-slate-600">{word.sourceLanguage || 'German'}</span>
                      </div>
                      <h4 className="text-xl font-black text-white truncate tracking-tight uppercase leading-none mb-2">{word.german}</h4>
                      <div 
                        className={`text-sm font-bold text-green-400 transition-all duration-500 flex items-center gap-2 ${showTranslations[word.id] ? 'opacity-100 blur-0 translate-x-0' : 'opacity-0 blur-md -translate-x-2'}`}
                        dir={word.sourceLanguage === 'Arabic' ? 'ltr' : 'rtl'}
                      >
                        <i className="fa-solid fa-arrow-right-long text-[10px] opacity-40"></i>
                        {word.arabic}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => speak(word.german, word.id, word.sourceLanguage)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${playingId === word.id ? 'bg-green-600 text-white scale-90 ring-4 ring-green-600/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                      >
                        <i className={`fa-solid ${playingId === word.id ? 'fa-volume-high animate-pulse' : 'fa-book-open-reader text-[10px]'}`}></i>
                      </button>
                      <button 
                        onClick={() => toggleTranslation(word.id)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${showTranslations[word.id] ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                      >
                        <i className={`fa-solid ${showTranslations[word.id] ? 'fa-eye' : 'fa-eye-slash'} text-[10px]`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="relative p-4 rounded-2xl bg-black/30 border border-white/5 overflow-hidden">
                    <div className="flex items-start gap-4">
                      <button 
                        onClick={() => speak(word.exampleGerman, `${word.id}-sentence`, word.sourceLanguage)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${playingId === `${word.id}-sentence` ? 'bg-white text-slate-900 ring-4 ring-white/20' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                      >
                        <i className={`fa-solid ${playingId === `${word.id}-sentence` ? 'fa-volume-high animate-pulse' : 'fa-book-open text-[9px]'}`}></i>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 italic leading-relaxed mb-2 line-clamp-2">
                          "{word.exampleGerman}"
                        </p>
                        {showTranslations[word.id] && (
                          <p className="text-[11px] text-green-500/80 leading-relaxed font-bold animate-in fade-in slide-in-from-top-1" dir={word.sourceLanguage === 'Arabic' ? 'ltr' : 'rtl'}>
                            {word.exampleArabic}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default VocabularyVault;
