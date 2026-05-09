import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AppLanguage } from '../data/verbs';
import i18n from '../i18n/index';
import type { UILocale } from '../i18n/index';

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

  /** Öğrenilen dil (es/fr) ile arayüz dilini eşleştir — kullanıcı Navbar'dan manuel seçmediyse */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem('diloloji_ui_manual') === '1') return;
      const ui: UILocale = selectedLanguage === 'es' ? 'es' : 'fr';
      const cur = (i18n.language || 'tr').slice(0, 2);
      if (cur !== ui) void i18n.changeLanguage(ui);
    } catch {
      /* ignore */
    }
  }, [selectedLanguage]);

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
