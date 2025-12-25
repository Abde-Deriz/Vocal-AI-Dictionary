
export interface PresetDocument {
  id: string;
  name: string;
  url: string;
}

export interface LanguageGroup {
  id: string;
  name: string;
  code: string;
  icon: string;
  color: string;
  documents: PresetDocument[];
}

export const PRESET_LIBRARIES: LanguageGroup[] = [
  { 
    id: 'group-de',
    name: 'German', 
    code: 'German',
    icon: '🇩🇪',
    color: 'bg-green-600',
    documents: [
      { id: 'de-1', name: 'ELI Bildwörterbuch A1', url: 'https://giftscoupon.com/gr/Dizionario Senior Francese_sample.pdf' },
      { id: 'de-2', name: 'Themen Aktuell 1', url: 'https://giftscoupon.com/gr/German Picture Dictionary.pdf' },
    ]
  },
  { 
    id: 'group-en',
    name: 'English', 
    code: 'English',
    icon: '🇬🇧',
    color: 'bg-blue-600',
    documents: [
      { id: 'en-1', name: 'Oxford Dictionary', url: 'https://giftscoupon.com/eng/English_for_Everyone_Illustrated_English_Dictionary.pdf' },
      { id: 'en-2', name: 'Cambridge Grammar', url: 'https://giftscoupon.com/eng/Word_by_Word_Picture_Dictionary_NEW.pdf' }
    ]
  },
  { 
    id: 'group-fr',
    name: 'French', 
    code: 'French',
    icon: '🇫🇷',
    color: 'bg-purple-600',
    documents: [
      { id: 'fr-1', name: 'Bescherelle Français', url: 'https://giftscoupon.com/fr/Dizionario%20Senior%20Francese_sample.pdf' }
    ]
  }
];
