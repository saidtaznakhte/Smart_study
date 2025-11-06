// LanguageContext.tx
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
  t: (key: string, replacements?: { [k: string]: string | number }) => string;
}

/* --------------------------------------------------------------- */
/* 1. CONTEXT & PROVIDER                                            */
/* --------------------------------------------------------------- */
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [language, setLanguage] = useState<Language>("en");
  const [translations, setTranslations] = useState<
    { en: Record<string, string>; fr: Record<string, string> } | null
  >(null);

  /* Load translation files once */
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
        console.error("Translation load error:", e);
      }
    };
    load();
  }, []);

  /* ----------------------------------------------------------- */
  /* 2. Fallback – clean camelCase → Title Case                 */
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

      // Replace {{placeholder}}
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
/* 4. LANGUAGE TOGGLE – REPLACE YOUR EN/FR PILLS WITH THIS        */
/* --------------------------------------------------------------- */
export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const switchTo = (target: Language) => {
    if (language !== target) setLanguage(target);
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <button
        onClick={() => switchTo("en")}
        style={{
          padding: "0.4rem 0.8rem",
          background: language === "en" ? "#4a90e2" : "transparent",
          color: language === "en" ? "#fff" : "#aaa",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: language === "en" ? "bold" : "normal",
        }}
      >
        EN
      </button>

      <button
        onClick={() => switchTo("fr")}
        style={{
          padding: "0.4rem 0.8rem",
          background: language === "fr" ? "#9b59b6" : "transparent",
          color: language === "fr" ? "#fff" : "#aaa",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: language === "fr" ? "bold" : "normal",
        }}
      >
        FR
      </button>
    </div>
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
