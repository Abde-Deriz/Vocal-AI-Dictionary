
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PRESET_LIBRARIES, LanguageGroup, PresetDocument } from './constants';
import { DetectedWord, BookPage, StoredLibrary, SourceLanguage, LanguageOption } from './types';
import { GeminiService } from './services/geminiService';
import { PDFService } from './services/pdfService';
import { StorageService } from './services/storageService';
import WordTool from './components/WordTool';
import LibraryCard from './components/LibraryCard';
import CircularProgress from './components/CircularProgress';
import VocabularyVault from './components/VocabularyVault';

type ViewState = 'HOME' | 'STUDY';
type HomeSubView = 'MAIN' | 'GROUPS' | 'DOCS';

const LANGUAGES: LanguageOption[] = [
  { name: 'German', code: 'Gr', flag: '🇩🇪' },
  { name: 'English', code: 'En', flag: '🇬🇧' },
  { name: 'Arabic', code: 'Ar', flag: '🇸🇦' },
  { name: 'Spanish', code: 'Es', flag: '🇪🇸' },
  { name: 'French', code: 'Fr', flag: '🇫🇷' },
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [homeSubView, setHomeSubView] = useState<HomeSubView>('MAIN');
  const [selectedGroup, setSelectedGroup] = useState<LanguageGroup | null>(null);
  
  const [activePages, setActivePages] = useState<BookPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [detectedWords, setDetectedWords] = useState<DetectedWord[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeWord, setActiveWord] = useState<DetectedWord | null>(null);
  const [showGridView, setShowGridView] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [recentLibraries, setRecentLibraries] = useState<StoredLibrary[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>('German');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  
  const [scannedCache, setScannedCache] = useState<Record<string, DetectedWord[]>>(() => {
    const saved = localStorage.getItem('deutsch_lernapp_v2_cache');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeWordCache, setActiveWordCache] = useState<Record<string, string | null>>(() => {
    const saved = localStorage.getItem('vocalflow_active_word_cache');
    return saved ? JSON.parse(saved) : {};
  });

  const [imgLoadError, setImgLoadError] = useState(false);
  const [isImgLoading, setIsImgLoading] = useState(true);

  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gemini = useRef(new GeminiService());
  const currentPage = activePages[currentPageIndex];

  // Flatten all unique words from cache for the Home screen
  const allSavedWords = useMemo(() => {
    const words: DetectedWord[] = [];
    const seen = new Set<string>();
    
    Object.values(scannedCache).forEach(pageWords => {
      pageWords.forEach(word => {
        const key = word.german.toLowerCase().trim();
        if (!seen.has(key)) {
          words.push(word);
          seen.add(key);
        }
      });
    });
    
    return words.sort((a, b) => a.german.localeCompare(b.german));
  }, [scannedCache]);

  // FIX: Define isPageScanned to check if the current page has already been scanned
  const isPageScanned = !!(currentPage && scannedCache[currentPage.driveId]);

  useEffect(() => {
    localStorage.setItem('deutsch_lernapp_v2_cache', JSON.stringify(scannedCache));
  }, [scannedCache]);

  useEffect(() => {
    localStorage.setItem('vocalflow_active_word_cache', JSON.stringify(activeWordCache));
  }, [activeWordCache]);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const libs = await StorageService.getAllLibraries();
        setRecentLibraries(libs.sort((a, b) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error("Failed to load recent libraries", e);
      }
    };
    loadRecent();
  }, []);

  useEffect(() => {
    if (view === 'STUDY' && currentPage) {
      setImgLoadError(false);
      // We don't set isImgLoading here because it causes a flash if not careful
      // Instead we handle it in the navigation functions and image key
      const cachedWords = scannedCache[currentPage.driveId];
      if (cachedWords) {
        setDetectedWords(cachedWords);
        const lastWordId = activeWordCache[currentPage.driveId];
        if (lastWordId) {
          const word = cachedWords.find(w => w.id === lastWordId);
          setActiveWord(word || null);
        } else {
          setActiveWord(null);
        }
      } else {
        setDetectedWords([]);
        setActiveWord(null);
      }
    }
  }, [currentPageIndex, view, currentPage?.driveId]);

  const handleSetActiveWord = useCallback((word: DetectedWord | null) => {
    setActiveWord(word);
    if (currentPage) {
      setActiveWordCache(prev => ({
        ...prev,
        [currentPage.driveId]: word ? word.id : null
      }));
    }
  }, [currentPage]);

  const processPdfFile = async (
    file: File | Blob,
    fileName: string,
    options?: { sourceUrl?: string }
  ) => {
    setIsPdfLoading(true);
    setPdfProgress(0);
    const libId = `lib-${Date.now()}`;
    let allProcessedPages: BookPage[] = [];
    let isStudyViewInitiated = false;

    try {
      const pdfFile = file instanceof File ? file : new File([file], fileName, { type: 'application/pdf' });
      await PDFService.convertPdfToImages(pdfFile, async (chunkPages, progress, isComplete) => {
        allProcessedPages = [...allProcessedPages, ...chunkPages];
        setPdfProgress(progress);
        
        if (!isStudyViewInitiated && (allProcessedPages.length >= 5 || isComplete)) {
          setActivePages([...allProcessedPages]);
          setCurrentPageIndex(0);
          setIsImgLoading(true);
          setView('STUDY');
          isStudyViewInitiated = true;
        } else if (isStudyViewInitiated) {
          setActivePages([...allProcessedPages]);
        }
        
        if (isComplete) {
          const finalLib: StoredLibrary = {
            id: libId,
            name: fileName,
            pages: allProcessedPages,
            timestamp: Date.now(),
            sourceUrl: options?.sourceUrl
          };
          await StorageService.saveLibrary(finalLib);
          const updatedLibs = await StorageService.getAllLibraries();
          setRecentLibraries(updatedLibs.sort((a, b) => b.timestamp - a.timestamp));
          setIsPdfLoading(false);
        }
      }, 10); // Smaller chunks for faster initial render
    } catch (err) {
      console.error("PDF Processing Error:", err);
      alert("Failed to process PDF.");
      setIsPdfLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert("Please upload a PDF file.");
      return;
    }
    await processPdfFile(file, file.name);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openLibrary = (library: StoredLibrary) => {
    setActivePages(library.pages);
    setCurrentPageIndex(0);
    setIsImgLoading(true);
    setView('STUDY');
  };

  const loadPresetDoc = async (doc: PresetDocument, lang: SourceLanguage) => {
    setSourceLanguage(lang);
    const matchesPreset = (lib: StoredLibrary) =>
      lib.sourceUrl === doc.url || (!lib.sourceUrl && lib.name === doc.name);

    let existingLibrary = recentLibraries.find(matchesPreset);

    if (!existingLibrary) {
      try {
        const libs = await StorageService.getAllLibraries();
        existingLibrary = libs.find(matchesPreset);
        if (libs.length) {
          setRecentLibraries(libs.sort((a, b) => b.timestamp - a.timestamp));
        }
      } catch (e) {
        console.error("Failed to check existing libraries", e);
      }
    }

    if (existingLibrary) {
      openLibrary(existingLibrary);
      return;
    }

    setIsPdfLoading(true);
    setPdfProgress(0);
    try {
      const response = await fetch(doc.url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const blob = await response.blob();
      await processPdfFile(blob, doc.name, { sourceUrl: doc.url });
    } catch (err) {
      console.error("Failed to load document:", err);
      alert(`Could not load document: ${err instanceof Error ? err.message : 'Fetch failed'}`);
      setIsPdfLoading(false);
    }
  };

  const deleteLibrary = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this library from history?")) {
      try {
        await StorageService.deleteLibrary(id);
        setRecentLibraries(prev => prev.filter(l => l.id !== id));
      } catch (e) {
        alert("Delete failed.");
      }
    }
  };

  const handleScan = async () => {
    if (imgLoadError || isImgLoading || !currentPage) return;
    setIsAnalyzing(true);
    try {
      let blob: Blob;
      if (currentPage.imageUrl.startsWith('data:')) {
        const response = await fetch(currentPage.imageUrl);
        blob = await response.blob();
      } else {
        const response = await fetch(currentPage.imageUrl);
        // Fix: Changed 'ok' to 'response.ok' to fix the reference error.
        if (!response.ok) throw new Error("Fetch failed");
        blob = await response.blob();
      }
      const results = await gemini.current.analyzePage(blob, sourceLanguage);
      setDetectedWords(results);
      setScannedCache(prev => ({ ...prev, [currentPage.driveId]: results }));
    } catch (err) {
      console.error("Scan Error:", err);
      alert("Analysis Failed. Check connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const goToPage = (index: number) => {
    if (index === currentPageIndex) return;
    setIsImgLoading(true);
    setCurrentPageIndex(index);
  };

  const currentLangOption = LANGUAGES.find(l => l.name === sourceLanguage)!;

  return (
    <div className="flex flex-col h-full bg-[#020617] overflow-hidden text-slate-100 font-sans safe-top safe-bottom">
      {/* Global Loading Overlay */}
      {isPdfLoading && view === 'HOME' && (
        <div className="fixed inset-0 z-[300] bg-[#020617]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <CircularProgress progress={pdfProgress} label={`Processing PDF...`} />
          <p className="mt-8 text-sm text-slate-400 max-w-[240px] leading-relaxed font-medium">
            Generating interactive pages. This may take a moment.
          </p>
        </div>
      )}

      {view === 'HOME' ? (
        <div className="fixed inset-0 bg-[#020617] text-white overflow-y-auto no-scrollbar flex flex-col safe-top safe-bottom">
          <div className="flex-1 w-full p-4 sm:p-10 md:p-16">
            <header className="mb-10 sm:mb-16 animate-fade-up">
              <div className="flex items-center gap-3 sm:gap-5 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-600 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-green-900/20">
                  <i className="fa-solid fa-graduation-cap text-xl sm:text-2xl"></i>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-none mb-1 sm:mb-2">VocalFlow AI</h1>
                  <div className="h-1 w-12 bg-green-500 rounded-full"></div>
                </div>
              </div>
              <p className="text-slate-400 text-sm sm:text-lg font-medium max-w-xl leading-relaxed">
                Revolutionize how you learn. Interaction-driven language dictionaries powered by Gemini AI.
              </p>
            </header>

            {homeSubView === 'MAIN' && (
              <>
                <section className="max-w-6xl w-full mx-auto mb-10 sm:mb-16 animate-fade-up delay-100">
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-500">Learning Portals</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                    <LibraryCard 
                      title="Explore Groups"
                      description="Pre-curated collections organized by language level."
                      icon="fa-layer-group"
                      color="bg-green-600"
                      onClick={() => setHomeSubView('GROUPS')}
                    />
                    
                    <LibraryCard 
                      title="Upload PDF"
                      description="Use your own study materials. Any PDF becomes interactive."
                      icon="fa-cloud-arrow-up"
                      color="bg-slate-700"
                      onClick={() => fileInputRef.current?.click()}
                    />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                </section>

                {recentLibraries.length > 0 && (
                  <section className="max-w-6xl w-full mx-auto mb-16 animate-fade-up delay-200">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-500">Recently Studied</h2>
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{recentLibraries.length} Items</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {recentLibraries.map((lib) => (
                        <div 
                          key={lib.id} 
                          onClick={() => { setActivePages(lib.pages); setCurrentPageIndex(0); setIsImgLoading(true); setView('STUDY'); }}
                          className="group relative flex items-center gap-4 bg-slate-900/40 border border-slate-800/60 rounded-3xl p-4 sm:p-5 transition-all hover:bg-slate-800/60 hover:border-slate-700 cursor-pointer overflow-hidden shadow-lg active:scale-[0.98]"
                        >
                          <div className="w-12 h-16 sm:w-16 sm:h-20 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                            {lib.pages[0] && <img src={lib.pages[0].imageUrl} alt="T" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate mb-1 tracking-tight uppercase">{lib.name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{lib.pages.length} Pages</span>
                              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                              <span className="text-[9px] text-slate-600 uppercase font-black">{new Date(lib.timestamp).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => deleteLibrary(e, lib.id)}
                            className="w-8 h-8 rounded-full bg-red-500/10 text-red-500/40 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all sm:opacity-0 group-hover:opacity-100"
                          >
                            <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Vocabulary Vault Section */}
                <VocabularyVault words={allSavedWords} />
              </>
            )}

            {homeSubView === 'GROUPS' && (
              <section className="max-w-6xl w-full mx-auto pb-20 animate-in slide-in-from-right-8 duration-500">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setHomeSubView('MAIN')} className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center hover:bg-slate-700 transition-all border border-slate-700/50 active:scale-90">
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                  <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-500">Choose a Language</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                  {PRESET_LIBRARIES.map((group) => (
                    <button 
                      key={group.id} 
                      onClick={() => { setSelectedGroup(group); setHomeSubView('DOCS'); }}
                      className="group relative flex flex-col bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 text-left hover:border-slate-600 transition-all active:scale-95 shadow-xl"
                    >
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${group.color} flex items-center justify-center text-3xl mb-6 shadow-2xl`}>
                        {group.icon}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-2">{group.name}</h3>
                      <p className="text-slate-500 text-xs sm:text-sm font-medium mb-6">{group.documents.length} Curated Documents</p>
                      <div className="mt-auto text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 group-hover:text-white transition-colors flex items-center">
                        Enter Portal <i className="fa-solid fa-chevron-right ml-2 group-hover:translate-x-1 transition-transform"></i>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {homeSubView === 'DOCS' && selectedGroup && (
              <section className="max-w-6xl w-full mx-auto pb-20 animate-in slide-in-from-right-8 duration-500">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setHomeSubView('GROUPS')} className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center hover:bg-slate-700 transition-all border border-slate-700/50 active:scale-90">
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                  <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-500">{selectedGroup.name} Collection</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedGroup.documents.map((doc) => (
                    <button 
                      key={doc.id}
                      onClick={() => loadPresetDoc(doc, selectedGroup.code as SourceLanguage)}
                      className="flex items-center gap-5 sm:gap-6 bg-slate-900/40 border border-slate-800 p-5 sm:p-6 rounded-[2rem] text-left hover:bg-slate-800/50 hover:border-slate-600 transition-all group active:scale-[0.98]"
                    >
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${selectedGroup.color} flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform`}>
                        <i className="fa-solid fa-file-pdf"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-md font-bold uppercase tracking-tight text-white mb-1 truncate">{doc.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Ready for AI Scanning</p>
                      </div>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-green-600 group-hover:text-white transition-all text-slate-600">
                        <i className="fa-solid fa-play text-xs"></i>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full bg-[#020617] overflow-hidden text-slate-100 font-sans safe-top safe-bottom">
          {/* Dynamic Header */}
          <header className="h-14 sm:h-16 glass border-b border-white/5 flex items-center justify-between px-4 sm:px-6 z-50">
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => { setView('HOME'); setHomeSubView('MAIN'); }} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all bg-white/5 active:scale-90">
                <i className="fa-solid fa-chevron-left sm:hidden"></i>
                <i className="fa-solid fa-house text-sm hidden sm:block"></i>
              </button>
              <div className="flex flex-col">
                <h1 className="text-[10px] sm:text-xs font-black uppercase tracking-tighter leading-none text-slate-500">Learning Session</h1>
                <p className="text-[11px] sm:text-sm text-green-500 font-bold truncate max-w-[120px] sm:max-w-none mt-1">
                  Page {currentPageIndex + 1}
                  {isPdfLoading && <span className="ml-2 text-[9px] text-slate-500 opacity-60 animate-pulse font-medium">({pdfProgress.toFixed(0)}% Background Load)</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative">
                <button onClick={() => setShowLangDropdown(!showLangDropdown)} className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2 hover:bg-white/10 transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest active:scale-95">
                  <span className="text-lg leading-none">{currentLangOption.flag}</span>
                  <span className="hidden md:inline">{currentLangOption.name}</span>
                </button>
                {showLangDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 glass border border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 z-[100]">
                    {LANGUAGES.map((lang) => (
                      <button key={lang.name} onClick={() => { setSourceLanguage(lang.name); setShowLangDropdown(false); if (sourceLanguage !== lang.name) setDetectedWords([]); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${sourceLanguage === lang.name ? 'bg-green-600 text-white' : 'hover:bg-white/5 text-slate-300'}`}>
                        <span className="text-lg">{lang.flag}</span>{lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => setShowGridView(true)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all bg-white/5 active:scale-90">
                <i className="fa-solid fa-grip-vertical"></i>
              </button>
              
              <button onClick={handleScan} disabled={isAnalyzing || isImgLoading || imgLoadError} className={`flex items-center justify-center sm:gap-3 w-9 h-9 sm:w-auto sm:px-6 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${isPageScanned && !isAnalyzing ? 'bg-white/10 text-slate-200' : 'bg-green-600 text-white shadow-xl shadow-green-900/20'}`}>
                {isAnalyzing ? <i className="fa-solid fa-spinner animate-spin"></i> : isPageScanned ? <i className="fa-solid fa-arrows-rotate"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                <span className="hidden sm:inline ml-2">{isAnalyzing ? "Scanning" : isPageScanned ? "Re-scan" : "AI Scan"}</span>
              </button>
            </div>
          </header>

          <main className="flex-1 relative bg-[radial-gradient(circle_at_center,_#111827_0%,_#020617_100%)] overflow-hidden flex flex-col">
            <div className="flex-1 relative flex items-center justify-center p-2 sm:p-10">
              {/* Force re-render with key when page changes */}
              <div 
                key={currentPage?.driveId}
                className={`relative max-w-full max-h-full transition-all duration-500 ease-out ${isImgLoading ? 'opacity-0 scale-[0.98] blur-xl' : 'opacity-100 scale-100 blur-0'}`}
              >
                {currentPage && (
                  <div className="relative rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/5 bg-slate-900">
                    <img 
                      ref={imageRef} 
                      src={currentPage.imageUrl} 
                      alt={currentPage.title} 
                      crossOrigin="anonymous" 
                      className="max-h-[70vh] sm:max-h-[80vh] w-auto object-contain select-none pointer-events-none" 
                      onLoad={() => { setIsImgLoading(false); setImgLoadError(false); }} 
                      onError={() => { setIsImgLoading(false); setImgLoadError(true); }} 
                    />
                    
                    {/* Visual Anchors for OCR Words */}
                    {detectedWords.map((word) => (
                      <div 
                        key={word.id} 
                        className={`absolute border-2 transition-all rounded-[1px] z-30 group cursor-pointer ${activeWord?.id === word.id ? 'border-green-400 bg-green-500/20 scale-105' : 'border-green-500/20 bg-green-500/5 hover:border-green-500/50 hover:bg-green-500/10'}`} 
                        style={{ top: `${word.ymin / 10}%`, left: `${word.xmin / 10}%`, width: `${(word.xmax - word.xmin) / 10}%`, height: `${(word.ymax - word.ymin) / 10}%` }} 
                        onClick={() => handleSetActiveWord(word)}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg uppercase tracking-tighter">
                          {word.german}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeWord && (
                  <WordTool 
                    word={activeWord} 
                    onClose={() => handleSetActiveWord(null)} 
                    placement={activeWord.ymin < 300 ? 'bottom' : (activeWord.ymax > 750 ? 'top' : 'top')} 
                    sourceLangCode={currentLangOption.code}
                    targetLangCode={sourceLanguage === 'Arabic' ? 'En' : 'Ar'}
                  />
                )}
                
                {isAnalyzing && (
                  <div className="absolute inset-0 z-40 bg-green-500/10 pointer-events-none overflow-hidden rounded-2xl">
                    <div className="w-full h-1 bg-green-400 shadow-[0_0_30px_#22c55e] absolute animate-scanline"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile-Friendly Navigation Bar */}
            <div className="glass h-16 sm:h-20 flex items-center justify-between px-6 sm:px-12 border-t border-white/5 safe-bottom">
               <button onClick={() => goToPage(Math.max(0, currentPageIndex - 1))} disabled={currentPageIndex === 0} className="w-12 h-12 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-10 transition-all active:scale-75">
                 <i className="fa-solid fa-chevron-left"></i>
               </button>
               
               <div className="flex flex-col items-center">
                 <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-1">Navigation</div>
                 <div className="text-xs sm:text-sm font-black text-white/90">
                   {currentPageIndex + 1} <span className="text-slate-600 px-1">/</span> {activePages.length}
                 </div>
               </div>

               <button onClick={() => goToPage(Math.min(activePages.length - 1, currentPageIndex + 1))} disabled={currentPageIndex === activePages.length - 1} className="w-12 h-12 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-10 transition-all active:scale-75">
                 <i className="fa-solid fa-chevron-right"></i>
               </button>
            </div>
          </main>

          {/* Modern Grid View / Page Explorer */}
          {showGridView && (
            <div className="fixed inset-0 z-[100] glass animate-in fade-in duration-300 flex flex-col safe-top safe-bottom">
              <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                  <i className="fa-solid fa-grip text-green-500"></i> Page Explorer
                </h2>
                <button onClick={() => setShowGridView(false)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all active:scale-90">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 max-w-7xl mx-auto">
                  {activePages.map((page, index) => {
                    const isScanned = !!scannedCache[page.driveId];
                    const isActive = currentPageIndex === index;
                    return (
                      <button 
                        key={page.id} 
                        onClick={() => { goToPage(index); setShowGridView(false); }} 
                        className={`group relative aspect-[3/4.5] rounded-2xl overflow-hidden border transition-all hover:scale-[1.03] active:scale-95 ${isActive ? 'border-green-500 ring-4 ring-green-500/20 shadow-2xl' : isScanned ? 'border-white/10' : 'border-green-500/30'}`}
                      >
                        <img src={page.imageUrl} alt={page.title} className={`w-full h-full object-cover transition-all duration-500 ${isActive ? 'scale-110' : 'opacity-60 group-hover:opacity-100'}`} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-transparent transition-all">
                          <div className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${isScanned ? 'bg-slate-900 text-slate-500' : 'bg-green-600 text-white'}`}>P. {page.id}</div>
                          {isScanned && <div className="mt-2 text-green-500 drop-shadow-lg"><i className="fa-solid fa-circle-check"></i></div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <style dangerouslySetInnerHTML={{ __html: `@keyframes scanline { 0% { top: 0% } 100% { top: 100% } } .animate-scanline { animation: scanline 4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }` }} />
        </div>
      )}
    </div>
  );
};

export default App;
