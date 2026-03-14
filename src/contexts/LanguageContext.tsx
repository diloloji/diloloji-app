import { createContext, useCallback, useContext, useState } from 'react';
import type { AppLanguage } from '../data/verbs';

const STORAGE_KEY = 'diloloji-lang';

function readStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'es';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'es') return stored;
  } catch {
    /* ignore */
  }
  return 'es';
}

type LanguageContextValue = {
  selectedLanguage: AppLanguage;
  setSelectedLanguage: (lang: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [selectedLanguage, setSelectedLanguageState] = useState<AppLanguage>(() => readStoredLanguage());

  const setSelectedLanguage = useCallback((lang: AppLanguage) => {
    setSelectedLanguageState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
