
export type SourceLanguage = 'German' | 'English' | 'Arabic' | 'Spanish' | 'French';

export interface LanguageOption {
  name: SourceLanguage;
  code: string;
  flag: string;
}

export interface DetectedWord {
  id: string;
  german: string; // This field stores the source word regardless of language
  arabic: string;
  exampleGerman: string; // This field stores the source example
  exampleArabic: string;
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  sourceLanguage?: SourceLanguage; // Added to track word origin
}

export interface BookPage {
  id: number;
  driveId: string;
  title: string;
  imageUrl: string;
  category: string;
}

export interface StoredLibrary {
  id: string;
  name: string;
  pages: BookPage[];
  timestamp: number;
  sourceUrl?: string;
}

export interface AppState {
  currentPage: BookPage | null;
  detectedWords: DetectedWord[];
  isAnalyzing: boolean;
  error: string | null;
}
