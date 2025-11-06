import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";

type Language = "en" | "fr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

/* --------------------------------------------------------------- */
/* 1. CONTEXT & PROVIDER                                            */
/* --------------------------------------------------------------- */
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>("en");
  const [translations, setTranslations] = useState<
    { [key: string]: Record<string, string> } | null
  >(null);

  /* Load JSON files once */
  useEffect(() => {
    const load = async () => {
      try {
        const [enRes, frRes] = await Promise.all([
          fetch("/translations/en.json"),
          fetch("/translations/fr.json"),
        ]);

        if (!enRes.ok || !frRes.ok) throw new Error("Failed to load translations");

        const [en, fr] = await Promise.all([enRes.json(), frRes.json()]);
        setTranslations({ en, fr });
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  /* ----------------------------------------------------------- */
  /* 2. Fallback formatter – adds spaces only where needed      */
  /* ----------------------------------------------------------- */
  const formatFallbackKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, " $1")           // space before every capital
      .replace(/^./, (s) => s.toUpperCase()) // capitalise first letter
      .trim();                              // remove possible leading space
  };

  const t = useCallback(
    (
      key: string,
      replacements: { [k: string]: string | number } = {}
    ): string => {
      if (!translations) return formatFallbackKey(key);

      const dict = translations[language] ?? translations.en ?? {};
      let text = dict[key] ?? formatFallbackKey(key);

      // {{placeholder}} → value
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      });

      return text;
    },
    [language, translations]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

/* --------------------------------------------------------------- */
/* 3. HOOK                                                          */
/* --------------------------------------------------------------- */
export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
};

/* --------------------------------------------------------------- */
/* 4. OPTIONAL QUICK SWITCHER (add wherever you want)              */
/* --------------------------------------------------------------- */
export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const toggle = () => setLanguage(language === "en" ? "fr" : "en");

  return (
    <button
      onClick={toggle}
      style={{
        padding: "0.4rem 0.8rem",
        background: language === "en" ? "#4a90e2" : "#9b59b6",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
      }}
    >
      {language.toUpperCase()}
    </button>
  );
};        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
      }}
    >
      {language.toUpperCase()}
    </button>
  );
};
