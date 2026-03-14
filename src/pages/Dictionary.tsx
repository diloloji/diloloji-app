import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X } from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import {
  searchDictionary,
  POPULAR_SEARCHES,
  getWordsOfTheDay,
  type DictDirection,
  type SearchResult,
} from '../data/mockDictionary';
import { translateWord } from '../services/dictionaryApi';
import { getFlashcardDecks, addCardToDeck, type FlashcardDeck } from '../utils/flashcardDecks';

const SITE_URL = 'https://diloloji.com';

function DictionaryBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#0f172a] via-40% to-[#1e1b4b] to-[#312e81] transition-colors duration-500 dark:from-[#0b1220] dark:via-[#0f172a] dark:via-[#1e1b4b] dark:to-[#1e1b4b] opacity-0 dark:opacity-100"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200/80 dark:opacity-0 transition-opacity duration-500 opacity-100"
        aria-hidden
      />
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none select-none" aria-hidden>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dict-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dict-grid)" className="text-slate-600 dark:text-white" />
        </svg>
      </div>
    </>
  );
}

function speakWord(text: string, lang: 'fr-FR' | 'es-ES') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

function swapDirection(dir: DictDirection): DictDirection {
  switch (dir) {
    case 'tr-fr':
      return 'fr-tr';
    case 'fr-tr':
      return 'tr-fr';
    case 'tr-es':
      return 'es-tr';
    case 'es-tr':
      return 'tr-es';
    default:
      return dir;
  }
}

/** Cümlede ana kelimeyi bold vurgula (case-insensitive, tam kelime) */
function highlightWord(sentence: string, word: string): React.ReactNode {
  if (!word || !sentence) return sentence;
  const parts = sentence.split(new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === word.toLowerCase() ? (
          <strong key={i} className="text-indigo-600 dark:text-indigo-400 font-bold">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

/** Tür etiketi rengi */
function typeBadgeClass(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('fiil')) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40';
  if (t.includes('isim') || t.includes('ad')) return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-400/40';
  if (t.includes('sıfat') || t.includes('adjective')) return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40';
  return 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400/40';
}

export default function Dictionary() {
  const { isDark, toggleTheme, mounted } = useThemeContext();
  const { t, i18n } = useTranslation();
  const { selectedLanguage, setSelectedLanguage } = useLanguage();
  const navigate = useNavigate();
  const [uiLangDropdownOpen, setUiLangDropdownOpen] = useState(false);
  const uiLangDropdownRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<DictDirection>(selectedLanguage === 'es' ? 'tr-es' : 'tr-fr');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null | undefined>(undefined);
  const [recentSearches, setRecentSearches] = useState<{ query: string; dir: DictDirection }[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('dictionary_recent');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x): x is { query: string; dir: DictDirection } => typeof x === 'object' && x !== null && 'query' in x && 'dir' in x)
        .slice(0, 5);
    } catch {
      return [];
    }
  });
  const [addToSetOpen, setAddToSetOpen] = useState(false);
  const addToSetRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!uiLangDropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (uiLangDropdownRef.current && !uiLangDropdownRef.current.contains(e.target as Node)) {
        setUiLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [uiLangDropdownOpen]);

  useEffect(() => {
    if (!addToSetOpen) return;
    const handle = (e: MouseEvent) => {
      if (addToSetRef.current && !addToSetRef.current.contains(e.target as Node)) {
        setAddToSetOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [addToSetOpen]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const pageUrl = `${SITE_URL}/sozluk`;
  const pageTitle = 'Sözlük | Diloloji';
  const pageDescription = 'Kelime Analiz Paneli — Fransızca ve İspanyolca kelime anlamları, örnek cümleler ve ilişkili denklemler.';

  const doSearch = useCallback(async (q: string, dir: DictDirection) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setResult(undefined);
    try {
      let r: SearchResult | null = null;
      try {
        r = await translateWord(trimmed, dir);
      } catch {
        r = null;
      }
      if (!r) r = searchDictionary(trimmed, dir) ?? searchDictionary(trimmed, swapDirection(dir)) ?? null;
      setResult(r);
      if (r) {
        setRecentSearches((prev) => {
          const next = [{ query: trimmed, dir }, ...prev.filter((x) => !(x.query === trimmed && x.dir === dir))].slice(0, 5);
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem('dictionary_recent', JSON.stringify(next));
            } catch {
              // ignore
            }
          }
          return next;
        });
      }
    } catch {
      const fallback = searchDictionary(trimmed, dir) ?? searchDictionary(trimmed, swapDirection(dir)) ?? null;
      setResult(fallback);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const newDir: DictDirection = selectedLanguage === 'es' ? 'tr-es' : 'tr-fr';
    setDirection(newDir);
    setResult(undefined);
    if (query.trim()) {
      doSearch(query.trim(), newDir);
    }
  }, [selectedLanguage, doSearch]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) {
        setResult(undefined);
        return;
      }
      doSearch(q, direction);
    },
    [query, direction, doSearch]
  );

  const handleSpeak = useCallback(
    (res: SearchResult) => {
      const lang = res.lang === 'fr' ? 'fr-FR' : 'es-ES';
      const wordToSpeak = direction === 'tr-fr' || direction === 'tr-es' ? res.target : res.source;
      speakWord(wordToSpeak, lang);
    },
    [direction]
  );

  const handleSearchQuery = useCallback((q: string, dir: DictDirection) => {
    setQuery(q);
    setDirection(dir);
    doSearch(q, dir);
  }, [doSearch]);

  const decks: FlashcardDeck[] = typeof window !== 'undefined' ? getFlashcardDecks() : [];
  const mockDecksIfEmpty = decks.length === 0
    ? [
        { id: 'mock-1', title: 'Seyahat Kelimeleri', cards: [] },
        { id: 'mock-2', title: 'Zor Fiiller', cards: [] },
      ] as { id: string; title: string; cards: unknown[] }[]
    : decks;

  const handleAddToSet = useCallback(
    (deckId: string, deckTitle: string, res: SearchResult) => {
      if (deckId.startsWith('mock-')) {
        setToastMessage(`Önce Ezber Makinesi'nden bir set oluşturun. 🎯`);
        setAddToSetOpen(false);
        return;
      }
      const ok = addCardToDeck(deckId, {
        front: res.source,
        back: res.target,
        example: res.exampleSource || res.exampleTarget,
      });
      if (ok) {
        setToastMessage(`Kelime başarıyla "${deckTitle}" setine eklendi! 🎉`);
        setAddToSetOpen(false);
      }
    },
    []
  );

  return (
    <div className="min-h-screen relative bg-slate-50 dark:bg-transparent transition-colors duration-300">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
      </Helmet>
      <DictionaryBackground />
      <header className="relative z-20 w-full flex justify-between items-center py-3 px-4 sm:px-5 bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 sticky top-0 z-50 transition-colors duration-300">
        <div className="min-w-0 flex items-center gap-2 sm:gap-3 flex-1">
          <Link
            to="/fiil-laboratuvari"
            className="flex items-center gap-2 sm:gap-3 shrink-0 transition-all duration-300 hover:opacity-90 hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-lg"
            aria-label="Ana sayfa"
          >
            <img src="/logo.svg" alt="Diloloji" className="h-8 sm:h-10 w-auto shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:hidden shrink-0">Diloloji</span>
            <span className="text-slate-400 dark:text-slate-500 text-sm italic hidden md:inline shrink-0">Dilin matematiğini çöz.</span>
          </Link>
          <div className="ml-2 md:ml-4 hidden md:flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-600 shrink-0" role="tablist">
            <Link to="/fiil-laboratuvari" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" aria-label="Fiil Laboratuvarı">Fiil Laboratuvarı</Link>
            <Link to="/ezber-makinesi" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" aria-label="Ezber Makinesi">Ezber Makinesi</Link>
            <Link to="/sozluk" className="rounded-lg px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" aria-current="page">📖 Sözlük</Link>
            <Link to="/ogrenme" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" aria-label="Öğrenme">{t('ogrenme')}</Link>
          </div>
        </div>
        <div className="flex items-center shrink-0 gap-2">
          <div className="relative shrink-0" ref={uiLangDropdownRef}>
            <button
              type="button"
              onClick={() => setUiLangDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-slate-200/80 dark:border-slate-600/80"
              title={t('arayuz_dili')}
              aria-label={t('dil_secin')}
              aria-expanded={uiLangDropdownOpen}
              aria-haspopup="listbox"
            >
              <span aria-hidden>🌐</span>
              <span className="uppercase tabular-nums">{['tr', 'en', 'fr', 'es'].includes((i18n.language || 'tr').slice(0, 2)) ? (i18n.language || 'tr').slice(0, 2).toUpperCase() : 'TR'}</span>
            </button>
            {uiLangDropdownOpen && (
              <div
                role="listbox"
                aria-label={t('dil_secin')}
                className="absolute right-0 top-full mt-1.5 w-max min-w-[120px] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl py-1 z-50"
              >
                {(['tr', 'en', 'fr', 'es'] as const).map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    role="option"
                    aria-selected={i18n.language === lng}
                    onClick={() => {
                      i18n.changeLanguage(lng);
                      setUiLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                      i18n.language === lng
                        ? 'bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                    }`}
                  >
                    {t(lng === 'tr' ? 'lang_turkce' : lng === 'en' ? 'lang_english' : lng === 'fr' ? 'lang_francais' : 'lang_espanol')}
                  </button>
                ))}
              </div>
            )}
          </div>
          {mounted && (
            <button type="button" onClick={toggleTheme} className="p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50" aria-label={isDark ? 'Açık moda geç' : 'Karanlık moda geç'}>
              <span className="text-sm md:text-base leading-none" aria-hidden>{isDark ? '☀️' : '🌙'}</span>
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 py-8 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">Kelime Analiz Paneli</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">Anlam, örnek cümleler ve ilişkili denklemler</p>

          {/* Arama çubuğu — temizle (X) + bayrak ikonu */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 dark:from-indigo-400/30 dark:via-purple-400/30 dark:to-indigo-400/30 shadow-[0_0_24px_rgba(99,102,241,0.15)] dark:shadow-[0_0_32px_rgba(99,102,241,0.2)]">
              <div className="relative rounded-[14px] bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-600/80 overflow-hidden flex items-center">
                <span className="pl-4 text-2xl shrink-0" aria-hidden title={direction.startsWith('fr') ? 'Fransızca' : 'İspanyolca'}>
                  {direction === 'tr-fr' || direction === 'fr-tr' ? '🇫🇷' : '🇪🇸'}
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={direction === 'tr-fr' || direction === 'fr-tr' ? 'Fransızca veya Türkçe bir kelime arat...' : 'İspanyolca veya Türkçe bir kelime arat...'}
                  className="flex-1 min-w-0 bg-transparent border-0 py-4 pl-2 pr-12 text-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0"
                  aria-label={direction.startsWith('tr') ? 'Hangi kelimenin anlamına bakalım?' : 'Arama'}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {query.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setQuery(''); setResult(undefined); }}
                      className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      aria-label="Temizle"
                    >
                      <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                  )}
                  <button type="submit" disabled={isLoading} className="p-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Ara">
                    <span className="text-xl" aria-hidden>🔍</span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Dil seçici — iOS tarzı segmented control (Fransızca | İspanyolca), arama kutusunun hemen altında */}
          <div className="flex items-center gap-2 mb-6" role="tablist" aria-label="Sözlük dili">
            <div className="flex w-full bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-full p-1">
              <button
                type="button"
                role="tab"
                aria-selected={direction === 'tr-fr' || direction === 'fr-tr'}
                onClick={() => setDirection(direction === 'tr-fr' || direction === 'fr-tr' ? swapDirection(direction) : 'tr-fr')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full transition-all duration-300 ease-in-out text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  direction === 'tr-fr' || direction === 'fr-tr'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span aria-hidden>🇫🇷</span>
                Fransızca
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={direction === 'tr-es' || direction === 'es-tr'}
                onClick={() => setDirection(direction === 'tr-es' || direction === 'es-tr' ? swapDirection(direction) : 'tr-es')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full transition-all duration-300 ease-in-out text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  direction === 'tr-es' || direction === 'es-tr'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span aria-hidden>🇪🇸</span>
                İspanyolca
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDirection(swapDirection(direction))}
              className="shrink-0 p-2.5 rounded-full bg-slate-800/60 dark:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              title="Yönü değiştir (TR↔FR / TR↔ES)"
              aria-label="Yönü değiştir"
            >
              <span className="text-lg" aria-hidden>⇄</span>
            </button>
          </div>

          {/* Arama Geçmişi — tıklanabilir chips */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 mb-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 self-center mr-1">Son aramalar:</span>
              {recentSearches.map(({ query: q, dir }) => (
                <button
                  key={`${dir}-${q}`}
                  type="button"
                  onClick={() => {
                    setQuery(q);
                    setDirection(dir);
                    doSearch(q, dir);
                  }}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-slate-200/80 dark:bg-slate-800/50 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500/80 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200/80 dark:border-slate-600/50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* İçerik: Boş durum / Yükleniyor (Skeleton) / Sonuç / Bulunamadı */}
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="bg-slate-800/50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl h-48 w-full p-6 flex flex-col gap-4 animate-pulse"
                aria-busy="true"
                aria-label="Yükleniyor"
              >
                <div className="h-8 bg-slate-600/50 dark:bg-slate-600/50 rounded-lg w-3/4 max-w-xs" />
                <div className="h-5 bg-slate-600/40 dark:bg-slate-600/40 rounded w-1/2 max-w-[10rem]" />
                <div className="h-6 bg-slate-600/40 dark:bg-slate-600/40 rounded-lg w-full max-w-sm mt-2" />
                <div className="flex gap-2 mt-auto">
                  <div className="h-8 bg-slate-600/40 dark:bg-slate-600/40 rounded-full w-20" />
                  <div className="h-8 bg-slate-600/40 dark:bg-slate-600/40 rounded-full w-24" />
                </div>
              </motion.div>
            )}
            {result === undefined && !query.trim() && !isLoading && (
              <motion.section
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Günün Kelimeleri — iki kart (FR + ES) */}
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 text-center">Günün Kelimeleri</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(() => {
                      const { fr, es } = getWordsOfTheDay();
                      return (
                        <>
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 }}
                            onClick={() => handleSearchQuery(fr.word, fr.dir)}
                            className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-600/60 p-6 shadow-lg hover:shadow-xl hover:border-indigo-300/50 dark:hover:border-indigo-500/40 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                          >
                            <span className="text-2xl mb-2 block" aria-hidden>🌟</span>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{fr.label}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{fr.translation}</p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">🇫🇷 Fransızca</p>
                          </motion.button>
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            onClick={() => handleSearchQuery(es.word, es.dir)}
                            className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-600/60 p-6 shadow-lg hover:shadow-xl hover:border-indigo-300/50 dark:hover:border-indigo-500/40 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                          >
                            <span className="text-2xl mb-2 block" aria-hidden>🌟</span>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{es.label}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{es.translation}</p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">🇪🇸 İspanyolca</p>
                          </motion.button>
                        </>
                      );
                    })()}
                  </div>
                </div>
                {/* Popüler Aramalar */}
                <div className="rounded-2xl bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/80 dark:border-slate-600/60 p-6 shadow-lg">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Popüler Aramalar</h2>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map(({ label, query: q, dir }) => (
                      <button
                        key={`${dir}-${q}`}
                        type="button"
                        onClick={() => handleSearchQuery(q, dir)}
                        className="rounded-xl px-4 py-2.5 text-sm font-medium bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-600 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}

            {!isLoading && result === undefined && query.trim() ? null : !isLoading && result === null ? (
              <motion.div
                key="notfound"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-2xl border border-amber-500/30 dark:border-amber-400/20 bg-amber-500/5 dark:bg-slate-800/80 backdrop-blur-xl p-8 text-center shadow-[0_0_40px_rgba(251,191,36,0.08)] dark:shadow-[0_0_40px_rgba(251,191,36,0.06)]"
              >
                <p className="text-amber-700 dark:text-amber-300 font-medium text-lg">Veritabanında bu denkleme uygun sonuç çıkmadı</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Farklı bir kelime veya yazım deneyin.</p>
                <p className="text-4xl mt-4 opacity-60" aria-hidden>∫</p>
              </motion.div>
            ) : !isLoading && result ? (
              <motion.div
                key="result"
                layoutId="dict-result-card"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-3xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-600/80 shadow-xl overflow-hidden relative"
              >
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="absolute top-2 right-2 z-10 p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
                {/* Başlık: Kelime + fonetik (sadece gerçek IPA varsa) + TTS */}
                <div className="p-6 sm:p-8 border-b border-slate-200/80 dark:border-slate-600/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 capitalize tracking-tight">
                        {result.source}
                      </h2>
                      {result.phonetic && (
                        <p className="mt-1 text-lg text-slate-500 dark:text-slate-400 font-mono">{result.phonetic}</p>
                      )}
                      <p className="mt-2 text-xl font-semibold text-indigo-600 dark:text-indigo-400">{result.target}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSpeak(result)}
                      className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
                      title="Telaffuzu dinle"
                      aria-label="Telaffuzu dinle"
                    >
                      <Volume2 className="w-6 h-6" strokeWidth={2} />
                    </button>
                  </div>
                  {/* Tür etiketleri + Set'e Ekle */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-medium ${typeBadgeClass(result.type)}`}>
                        {result.type}
                      </span>
                    </div>
                    <div className="relative shrink-0" ref={addToSetRef}>
                      <button
                        type="button"
                        onClick={() => setAddToSetOpen((o) => !o)}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                      >
                        <span aria-hidden>➕</span>
                        Set&apos;e Ekle
                      </button>
                      {addToSetOpen && (
                        <div className="absolute right-0 top-full mt-2 min-w-[12rem] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl py-2 z-50 max-h-64 overflow-y-auto">
                          {mockDecksIfEmpty.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Henüz set yok.</p>
                          ) : (
                            mockDecksIfEmpty.map((deck) => (
                              <button
                                key={deck.id}
                                type="button"
                                onClick={() => handleAddToSet(deck.id, deck.title, result)}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-500/15 dark:hover:bg-indigo-500/20 transition-colors"
                              >
                                {deck.title}
                              </button>
                            ))
                          )}
                          {decks.length === 0 && (
                            <Link
                              to="/ezber-makinesi"
                              className="block px-4 py-2.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                              onClick={() => setAddToSetOpen(false)}
                            >
                              Ezber Makinesi’nde set oluştur →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kelime formülü: önek + kök */}
                {(result.prefix || result.root) && (
                  <div className="px-6 sm:px-8 py-4 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-600/60">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Kelime formülü</p>
                    <p className="text-slate-700 dark:text-slate-200 font-medium">
                      {result.prefix && <span className="text-indigo-600 dark:text-indigo-400">{result.prefix}</span>}
                      {result.prefix && result.root && ' + '}
                      {result.root && <span>{result.root}</span>}
                    </p>
                  </div>
                )}

                {/* Örnek cümleler — gri kutu, vurgu, Fiil Lab'da Çöz */}
                {(result.exampleSource || result.exampleTarget) && (
                  <div className="px-6 sm:px-8 py-5 border-b border-slate-200/80 dark:border-slate-600/60">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Örnek cümleler</p>
                    <div className="space-y-4">
                      {result.exampleSource && (
                        <div className="rounded-xl bg-slate-100/80 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50 p-4">
                          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                            {highlightWord(result.exampleSource, result.source)}
                          </p>
                          {result.type === 'fiil' && result.targetVerb && (() => {
                            const verbLabLang = direction === 'tr-fr' || direction === 'fr-tr' ? 'fr' : 'es';
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLanguage(verbLabLang);
                                  navigate(`/fiil-laboratuvari?verb=${encodeURIComponent(result.targetVerb!)}&lang=${verbLabLang}`);
                                }}
                                className="inline-flex items-center gap-2 mt-3 rounded-lg border border-indigo-500/40 dark:border-indigo-400/50 bg-indigo-500/10 dark:bg-indigo-500/20 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 transition-colors"
                              >
                                Fiil Lab'da Çöz
                                <span aria-hidden>→</span>
                              </button>
                            );
                          })()}
                        </div>
                      )}
                      {result.exampleTarget && (
                        <div className="rounded-xl bg-slate-100/80 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50 p-4">
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            {highlightWord(result.exampleTarget, result.target)}
                          </p>
                          {result.type === 'fiil' && result.targetVerb && (() => {
                            const verbLabLang = direction === 'tr-fr' || direction === 'fr-tr' ? 'fr' : 'es';
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLanguage(verbLabLang);
                                  navigate(`/fiil-laboratuvari?verb=${encodeURIComponent(result.targetVerb!)}&lang=${verbLabLang}`);
                                }}
                                className="inline-flex items-center gap-2 mt-3 rounded-lg border border-indigo-500/40 dark:border-indigo-400/50 bg-indigo-500/10 dark:bg-indigo-500/20 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 transition-colors"
                              >
                                Fiil Lab'da Çöz
                                <span aria-hidden>→</span>
                              </button>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* İlişkili Denklemler: eş / zıt anlamlılar — tıklanabilir */}
                {(result.synonyms || result.antonyms) && (
                  <div className="px-6 sm:px-8 py-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">İlişkili denklemler</p>
                    <div className="flex flex-wrap gap-2">
                      {result.synonyms && result.synonyms !== '—' && result.synonyms.split(/[,;]/).map((s) => s.trim()).filter(Boolean).map((word) => (
                        <button
                          key={word}
                          type="button"
                          onClick={() => handleSearchQuery(word, direction)}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30 hover:bg-indigo-500/25 dark:hover:bg-indigo-500/35 transition-colors"
                        >
                          {word}
                        </button>
                      ))}
                      {result.antonyms && result.antonyms !== '—' && result.antonyms.split(/[,;]/).map((s) => s.trim()).filter(Boolean).map((word) => (
                        <button
                          key={word}
                          type="button"
                          onClick={() => handleSearchQuery(word, direction)}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium bg-slate-200/80 dark:bg-slate-600/50 text-slate-700 dark:text-slate-300 border border-slate-300/50 dark:border-slate-500/50 hover:bg-slate-300/80 dark:hover:bg-slate-600/70 transition-colors"
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Toast: Set'e eklendi / uyarı */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] rounded-xl bg-slate-800 dark:bg-slate-700 text-white px-5 py-3 shadow-xl border border-slate-600/50 dark:border-slate-500/50 text-sm font-medium"
            role="status"
            aria-live="polite"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
