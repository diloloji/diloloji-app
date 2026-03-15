import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import {
  POPULAR_SEARCHES,
  getWordsOfTheDay,
  type DictDirection,
  type SearchResult,
} from '../data/mockDictionary';
import { fetchFromGroq, groqToSourceTarget, type GroqExampleItem, type GroqCommonPhrase } from '../services/dictionaryApi';
import { getFlashcardDecks, addCardToDeck, type FlashcardDeck } from '../utils/flashcardDecks';
import { sanitizeForDisplay } from '../utils/sanitize';

/** Groq examples (GroqExampleItem[]) → state formatı: original + translation (turkish) */
function groqExamplesToState(examples: GroqExampleItem[]): Array<{ original: string; translation?: string }> {
  return examples
    .map((ex) => ({
      original: sanitizeForDisplay(ex.original ?? ''),
      translation: ex.turkish ? sanitizeForDisplay(ex.turkish) : undefined,
    }))
    .filter((p) => p.original.length > 0);
}

const SITE_URL = 'https://diloloji.com';

function DictionaryBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0a0e17] via-[#0d1117] via-40% to-[#151d2e] to-[#1e293b] transition-colors duration-500 dark:from-[#0a0e17] dark:via-[#0d1117] dark:via-[#151d2e] dark:to-[#1e293b] opacity-0 dark:opacity-100"
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
  useTranslation();
  const { selectedLanguage } = useLanguage();
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
  const [groqExamples, setGroqExamples] = useState<Array<{ original: string; translation?: string }> | null>(null);
  const [groqCommonPhrases, setGroqCommonPhrases] = useState<GroqCommonPhrase[] | null>(null);

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
    const trimmed = sanitizeForDisplay(q);
    if (!trimmed) return;
    setIsLoading(true);
    setResult(undefined);
    setGroqExamples(null);
    setGroqCommonPhrases(null);
    const langLabel = dir === 'tr-fr' || dir === 'fr-tr' ? 'Fransızca' : 'İspanyolca';
    try {
      const groq = await fetchFromGroq(trimmed, langLabel);
      const st = groqToSourceTarget(groq, dir) ?? (groq.word && groq.translation ? { source: groq.word, target: groq.translation } : null);
      if (st) {
        const lang: 'fr' | 'es' = dir === 'tr-fr' || dir === 'fr-tr' ? 'fr' : 'es';
        const r: SearchResult = {
          source: sanitizeForDisplay(st.source),
          target: sanitizeForDisplay(st.target),
          type: 'kelime',
          lang,
          phonetic: groq.phonetic ? sanitizeForDisplay(groq.phonetic) : undefined,
          exampleSource: undefined,
          exampleTarget: undefined,
        };
        setResult(r);
        const pairs =
          Array.isArray(groq.examples) && groq.examples.length > 0
            ? groqExamplesToState(groq.examples)
            : null;
        setGroqExamples(pairs);
        const phrases =
          Array.isArray(groq.commonPhrases) && groq.commonPhrases.length > 0
            ? groq.commonPhrases
                .filter((p): p is GroqCommonPhrase => typeof p?.phrase === 'string' && typeof p?.meaning === 'string')
                .map((p) => ({ phrase: sanitizeForDisplay(p.phrase), meaning: sanitizeForDisplay(p.meaning) }))
            : null;
        setGroqCommonPhrases(phrases);
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
      } else {
        setResult(null);
        setGroqExamples(null);
        setGroqCommonPhrases(null);
      }
    } catch (err) {
      console.warn('[Sözlük] Groq istek hatası:', err);
      setResult(null);
      setGroqExamples(null);
      setGroqCommonPhrases(null);
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

  /** TTS: Hedef dildeki kelimeyi (ekranda büyük yazan) sesli okur; dil selectedLanguage/direction'a göre fr-FR veya es-ES. */
  const playAudio = useCallback(() => {
    if (!result) return;
    const lang: 'fr-FR' | 'es-ES' = result.lang === 'fr' ? 'fr-FR' : 'es-ES';
    const wordToSpeak = direction === 'tr-fr' || direction === 'tr-es' ? result.target : result.source;
    speakWord(wordToSpeak, lang);
  }, [result, direction]);

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
      <Navbar />

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 py-10 sm:py-14 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl mx-auto">
          {/* Dil seçici — arama kutusunun hemen üstünde, pill segmented control */}
          <div className="flex justify-center mb-4" role="tablist" aria-label="Sözlük dili">
            <motion.div
              layout
              className="inline-flex rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-sm p-0.5 border border-slate-200/30 dark:border-white/10"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={direction === 'tr-fr' || direction === 'fr-tr'}
                onClick={() => setDirection(direction === 'tr-fr' || direction === 'fr-tr' ? swapDirection(direction) : 'tr-fr')}
                className={`relative flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-night-950 min-w-[100px] ${direction === 'tr-fr' || direction === 'fr-tr' ? 'text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}
              >
                {(direction === 'tr-fr' || direction === 'fr-tr') && (
                  <motion.span
                    layoutId="dict-lang-pill"
                    className="absolute inset-0 rounded-full bg-indigo-500/90 dark:bg-indigo-500"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    style={{ zIndex: 0 }}
                  />
                )}
                <span className="relative z-10" aria-hidden>🇫🇷</span>
                <span className="relative z-10">Fransızca</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={direction === 'tr-es' || direction === 'es-tr'}
                onClick={() => setDirection(direction === 'tr-es' || direction === 'es-tr' ? swapDirection(direction) : 'tr-es')}
                className={`relative flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-night-950 min-w-[100px] ${direction === 'tr-es' || direction === 'es-tr' ? 'text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}
              >
                {(direction === 'tr-es' || direction === 'es-tr') && (
                  <motion.span
                    layoutId="dict-lang-pill"
                    className="absolute inset-0 rounded-full bg-indigo-500/90 dark:bg-indigo-500"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    style={{ zIndex: 0 }}
                  />
                )}
                <span className="relative z-10" aria-hidden>🇪🇸</span>
                <span className="relative z-10">İspanyolca</span>
              </button>
            </motion.div>
          </div>

          {/* Hero arama kutusu — underline / hafif glow, büyük yazı, odak parlama */}
          <form onSubmit={handleSearch} className="mb-4">
            <motion.div
              className="relative rounded-xl bg-white/30 dark:bg-white/5 backdrop-blur-sm overflow-hidden border-b-2 border-slate-200/60 dark:border-white/10 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] dark:focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.2)] transition-all duration-300"
              initial={false}
              animate={{ boxShadow: undefined }}
            >
              <div className="flex items-center min-h-[72px] sm:min-h-[80px] px-4 sm:px-5">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={direction === 'tr-fr' || direction === 'fr-tr' ? 'Fransızca veya Türkçe kelime...' : 'İspanyolca veya Türkçe kelime...'}
                  className="flex-1 min-w-0 bg-transparent border-0 py-3 text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0"
                  aria-label={direction.startsWith('tr') ? 'Hangi kelimenin anlamına bakalım?' : 'Arama'}
                />
                <div className="flex items-center gap-1 ml-2">
                  {query.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setQuery(''); setResult(undefined); }}
                      className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
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
            </motion.div>
          </form>

          {/* Son aramalar — küçük, kenarlıksız, çok hafif arka plan */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 self-center mr-1">Son aramalar</span>
              {recentSearches.map(({ query: q, dir }) => (
                <button
                  key={`${dir}-${q}`}
                  type="button"
                  onClick={() => {
                    setQuery(q);
                    setDirection(dir);
                    doSearch(q, dir);
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
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
                key="loading"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mt-16 sm:mt-20 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-600/60 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-8 sm:p-12 flex flex-col items-center justify-center gap-6 min-h-[200px]"
                aria-busy="true"
                aria-live="polite"
                role="status"
              >
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce [animation-delay:300ms]" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-medium text-lg">Yapay zeka analiz ediyor...</p>
              </motion.div>
            )}
            {result === undefined && !query.trim() && !isLoading && (
              <motion.section
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="space-y-12 mt-16 sm:mt-20"
              >
                {/* Günün Kelimeleri — minimal: ikon + kelime + anlam, ince üst çizgi */}
                <div className="pt-8 border-t border-slate-200/50 dark:border-white/10">
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-5 text-center">Günün Kelimeleri</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                    {(() => {
                      const { fr, es } = getWordsOfTheDay();
                      return (
                        <>
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 }}
                            onClick={() => handleSearchQuery(fr.word, fr.dir)}
                            className="group flex items-start gap-3 text-left focus:outline-none focus:ring-0 rounded-lg py-1 -mx-1 hover:bg-white/5 dark:hover:bg-white/5 transition-colors duration-200"
                          >
                            <span className="text-xl mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden>🌟</span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{fr.label}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{fr.translation}</p>
                            </div>
                          </motion.button>
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            onClick={() => handleSearchQuery(es.word, es.dir)}
                            className="group flex items-start gap-3 text-left focus:outline-none focus:ring-0 rounded-lg py-1 -mx-1 hover:bg-white/5 dark:hover:bg-white/5 transition-colors duration-200"
                          >
                            <span className="text-xl mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden>🌟</span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{es.label}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{es.translation}</p>
                            </div>
                          </motion.button>
                        </>
                      );
                    })()}
                  </div>
                </div>
                {/* Popüler Aramalar — hafif chip tarzı */}
                <div className="pt-6 border-t border-slate-200/50 dark:border-white/10">
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">Popüler Aramalar</h2>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map(({ label, query: q, dir }) => (
                      <button
                        key={`${dir}-${q}`}
                        type="button"
                        onClick={() => handleSearchQuery(q, dir)}
                        className="rounded-md px-2.5 py-1 text-xs font-medium bg-white/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
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
                className="mt-16 sm:mt-20 rounded-2xl border border-slate-200/80 dark:border-slate-600/60 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-8 text-center"
              >
                <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">Sonuç bulunamadı</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Farklı bir kelime veya yazım deneyin.</p>
              </motion.div>
            ) : !isLoading && result ? (
              <motion.div
                key="result"
                layoutId="dict-result-card"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mt-16 sm:mt-20 rounded-2xl backdrop-blur-md bg-white/70 dark:bg-white/[0.07] border border-slate-200/70 dark:border-white/10 shadow-glass dark:shadow-glass-dark overflow-hidden relative"
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
                      onClick={playAudio}
                      className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-500 active:scale-95 active:text-blue-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
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

                {/* Örnek cümleler — sadece Groq (AI) verisi */}
                <div className="px-6 sm:px-8 py-5 border-b border-slate-200/80 dark:border-slate-600/60">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    Örnek cümleler
                  </p>
                  {groqExamples && groqExamples.length > 0 ? (
                    <div className="space-y-4">
                      {groqExamples.map((item, i) => (
                        <div key={i} className="rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 p-4">
                          <p className="text-slate-800 dark:text-slate-100 font-semibold leading-relaxed">
                            {highlightWord(item.original, (direction === 'tr-fr' || direction === 'tr-es') ? result.target : result.source)}
                          </p>
                          {item.translation && (
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 italic leading-relaxed">
                              {item.translation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-sm italic py-2">
                      Örnekler hazırlanıyor...
                    </p>
                  )}
                </div>

                {/* Sık Kullanılan Kalıplar (collocations) — Groq commonPhrases */}
                <div className="px-6 sm:px-8 py-5 border-b border-slate-200/80 dark:border-slate-600/60">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    Sık Kullanılan Kalıplar
                  </p>
                  {groqCommonPhrases && groqCommonPhrases.length > 0 ? (
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                      {groqCommonPhrases.map((item, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-4 py-3 min-w-0"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">
                            {item.phrase}
                          </span>
                          <span className="text-sm italic text-slate-500 dark:text-slate-400">
                            {item.meaning}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-sm italic py-2">
                      Kalıplar hazırlanıyor...
                    </p>
                  )}
                </div>

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
