/**
 * Uygulama arayüzü i18n — varsayılan Türkçe; öğrenilen dil ile otomatik eşleşme (LanguageContext).
 * Manuel seçim: localStorage diloloji_ui_manual + diloloji_ui_locale
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import tr from './locales/tr.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

export type UILocale = 'tr' | 'en' | 'es' | 'fr';

const STORAGE_UI_LOCALE = 'diloloji_ui_locale';
const STORAGE_UI_MANUAL = 'diloloji_ui_manual';
const STORAGE_LEARN_LANG = 'diloloji-lang';

export function getInitialUILanguage(): UILocale {
  if (typeof window === 'undefined') return 'tr';
  try {
    if (localStorage.getItem(STORAGE_UI_MANUAL) === '1') {
      const v = localStorage.getItem(STORAGE_UI_LOCALE);
      if (v === 'tr' || v === 'en' || v === 'fr' || v === 'es') return v;
    }
    const learn = localStorage.getItem(STORAGE_LEARN_LANG);
    if (learn === 'es') return 'es';
    if (learn === 'fr') return 'fr';
    return 'tr';
  } catch {
    return 'tr';
  }
}

/** Navbar bayrak seçimi — manuel mod + kalıcı locale */
export function persistManualUiLocale(lng: UILocale): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_UI_MANUAL, '1');
    localStorage.setItem(STORAGE_UI_LOCALE, lng);
  } catch {
    /* ignore */
  }
}

/** Öğrenilen dil değişince otomatik arayüz (manuel seçim yoksa) */
export function clearManualUiLocaleFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_UI_MANUAL);
    localStorage.removeItem(STORAGE_UI_LOCALE);
  } catch {
    /* ignore */
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr as Record<string, unknown> },
    en: { translation: en as Record<string, unknown> },
    es: { translation: es as Record<string, unknown> },
    fr: { translation: fr as Record<string, unknown> },
  },
  lng: getInitialUILanguage(),
  fallbackLng: 'tr',
  supportedLngs: ['tr', 'en', 'fr', 'es'],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  returnNull: false,
});

export default i18n;
