import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

// These paths are correct based on your project structure:
// from 'context/' -> up one level '..' -> into 'translations/'
import enTranslations from '../translations/en.json';
import frTranslations from '../translations/fr.json';

type Language = 'en' | 'fr';

// This defines the shape of your translations
interface Translations {
  [key: string]: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// This object holds your imported translations
const allTranslations = {
  en: enTranslations as Translations,
  fr: frTranslations as Translations,
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  // We have removed the `useEffect` and `fetch` code.
  // The translations are now loaded directly with `import`.

  const t = useCallback((key: string, replacements: { [key: string]: string | number } = {}) => {
    // Get translations for the current language, or default to English
    const langTranslations = allTranslations[language] || allTranslations.en;
    
    // Find the translation for the key, or default to the key itself if not found
    let translation = langTranslations[key] || key;
    
    // Replace any placeholders like {{name}}
    Object.keys(replacements).forEach(rKey => {
      translation = translation.replace(`{{${rKey}}}`, String(replacements[rKey]));
    });
    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
