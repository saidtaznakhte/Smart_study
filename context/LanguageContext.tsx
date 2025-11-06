import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<{ [key: string]: Record<string, string> } | null>(null);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // ✅ FIXED PATHS — must start with / (absolute from public folder)
        const [enResponse, frResponse] = await Promise.all([
          fetch('/translations/en.json'),
          fetch('/translations/fr.json'),
        ]);

        if (!enResponse.ok || !frResponse.ok) {
          throw new Error('Failed to fetch translation files');
        }

        const [en, fr] = await Promise.all([enResponse.json(), frResponse.json()]);
        setTranslations({ en, fr });
      } catch (error) {
        console.error('Error loading translations:', error);
      }
    };

    loadTranslations();
  }, []);

  const t = useCallback(
    (key: string, replacements: { [key: string]: string | number } = {}) => {
      if (!translations) return key; // fallback while loading

      const langTranslations = translations[language] || translations.en || {};
      let translation = langTranslations[key] || key;

      Object.keys(replacements).forEach(rKey => {
        translation = translation.replace(`{{${rKey}}}`, String(replacements[rKey]));
      });

      return translation;
    },
    [language, translations]
  );

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
