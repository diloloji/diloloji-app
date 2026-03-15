import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Star, Plus } from 'lucide-react';
import PronunciationButton from '../components/PronunciationButton';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import {
  POPULAR_SEARCHES,
  getWordsOfTheDay,
  getAutocompleteWords,
  type DictDirection,
  type SearchResult,
} from '../data/mockDictionary';
import { getVerbListForLang } from '../conjugation/helpers';
import { getTranslationOrPlaceholder } from '../data/dictionary';
import { fetchFromGroq, groqToSourceTarget, type GroqExampleItem, type GroqCommonPhrase, type WordMatrix, type GroqEtymology } from '../services/dictionaryApi';
import { getFlashcardDecks, addCardToDeck, type FlashcardDeck } from '../utils/flashcardDecks';
import { sanitizeForDisplay } from '../utils/sanitize';

/** Örnek cümle: cümle, çeviri, CEFR seviye (badge renkleri için). */
export interface ExampleSentence {
  sentence: string;
  translation: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

/** Groq examples (GroqExampleItem[]) → state formatı: original + translation + level (varsayılan B1). */
function groqExamplesToState(examples: GroqExampleItem[]): ExampleSentence[] {
  return examples
    .map((ex) => ({
      sentence: sanitizeForDisplay(ex.original ?? ''),
      translation: ex.turkish ? sanitizeForDisplay(ex.turkish) : '',
      level: (ex as GroqExampleItem & { level?: string }).level as ExampleSentence['level'] | undefined || 'B1',
    }))
    .filter((p) => p.sentence.length > 0) as ExampleSentence[];
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
    case 'tr-en':
      return 'en-tr';
    case 'en-tr':
      return 'tr-en';
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

/** "kelime (anlam)" formatını ayırır; parantez yoksa tümü word. Boş veya '-' değeri null döner. */
function parseWordMatrixEntry(value: string | null): { word: string; meaning: string } | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-' || /^-+$/.test(trimmed)) return null;
  const open = trimmed.indexOf(' (');
  if (open === -1) return { word: trimmed, meaning: '' };
  const close = trimmed.lastIndexOf(')');
  if (close === -1 || close <= open) return { word: trimmed, meaning: '' };
  const word = trimmed.slice(0, open).trim();
  if (!word || word === '-') return null;
  return {
    word,
    meaning: trimmed.slice(open + 2, close).trim(),
  };
}

export default function Dictionary() {
  useTranslation();
  const { selectedLanguage } = useLanguage();
  const [direction, setDirection] = useState<DictDirection>(selectedLanguage === 'es' ? 'tr-es' : 'tr-fr');
  const isEnglish = direction === 'tr-en' || direction === 'en-tr';
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
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const autocompleteListRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchFormRef = useRef<HTMLFormElement>(null);
  const [groqExamples, setGroqExamples] = useState<ExampleSentence[] | null>(null);
  const [exampleDisplayCount, setExampleDisplayCount] = useState(3);
  const [groqCommonPhrases, setGroqCommonPhrases] = useState<GroqCommonPhrase[] | null>(null);
  const [groqWordMatrix, setGroqWordMatrix] = useState<WordMatrix | null>(null);
  const [groqEtymology, setGroqEtymology] = useState<GroqEtymology | null>(null);
  const [groqSemanticShift, setGroqSemanticShift] = useState<string | null>(null);
  const [isFavourite, setIsFavourite] = useState(false);

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

  const autocompleteFullList = useMemo(() => {
    const mock = getAutocompleteWords(direction);
    const lang: 'fr' | 'es' =
      direction === 'tr-fr' || direction === 'fr-tr' ? 'fr'
      : direction === 'tr-es' || direction === 'es-tr' ? 'es'
      : null;
    if (lang) {
      const verbs = getVerbListForLang(lang);
      const seen = new Set(mock.map((x) => x.word.toLowerCase()));
      verbs.forEach((v) => {
        if (!seen.has(v.toLowerCase())) {
          mock.push({ word: v, meaning: getTranslationOrPlaceholder(v, lang) });
          seen.add(v.toLowerCase());
        }
      });
    }
    return mock;
  }, [direction]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const autocompleteSuggestions = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return [];
    return autocompleteFullList
      .filter((x) => x.word.toLowerCase().startsWith(q) || x.word.toLowerCase().includes(q))
      .slice(0, 8);
  }, [autocompleteFullList, debouncedQuery]);

  useEffect(() => {
    setAutocompleteSelectedIndex(0);
  }, [autocompleteSuggestions.length]);

  useEffect(() => {
    if (!autocompleteOpen || autocompleteSuggestions.length === 0) return;
    const el = autocompleteListRef.current;
    const child = el?.children[autocompleteSelectedIndex] as HTMLElement | undefined;
    child?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [autocompleteOpen, autocompleteSelectedIndex, autocompleteSuggestions.length]);

  useEffect(() => {
    if (!autocompleteOpen) return;
    const handle = (e: MouseEvent) => {
      if (searchFormRef.current && !searchFormRef.current.contains(e.target as Node)) {
        setAutocompleteOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [autocompleteOpen]);

  useEffect(() => {
    if (!result) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setResult(null);
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setAddToSetOpen((o) => !o);
        }
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const text = direction === 'tr-fr' || direction === 'tr-es' || direction === 'tr-en' ? result.target : result.source;
          const lang = result.lang === 'fr' ? 'fr-FR' : result.lang === 'es' ? 'es-ES' : 'en-US';
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = lang;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
          }
        }
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [result, direction]);

  const langSlug = result?.lang === 'fr' ? 'fransizca' : result?.lang === 'es' ? 'ispanyolca' : 'ingilizce';
  const pageUrl = result
    ? `${SITE_URL}/sozluk/${langSlug}/${encodeURIComponent(result.source)}`
    : `${SITE_URL}/sozluk`;
  const pageTitle = result
    ? `${result.target} Türkçe anlamı - Diloloji`
    : 'Diloloji Sözlük: İspanyolca, Fransızca ve İngilizce Kelime Analizi';
  const pageDescription = result
    ? `${result.source} kelimesinin Türkçe karşılığı: ${result.target}. ${result.phonetic ? 'IPA: ' + result.phonetic + '. ' : ''}Diloloji sözlük.`
    : 'İspanyolca, Fransızca ve İngilizce kelime analizi, anlam, IPA telaffuz ve phrasal verb. Ücretsiz çeviri ve kelime öğrenme araçları.';
  const jsonLd = result
    ? {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: result.source,
        description: result.target,
        inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Diloloji Sözlük' },
      }
    : null;

  const doSearch = useCallback(async (q: string, dir: DictDirection) => {
    const trimmed = sanitizeForDisplay(q);
    if (!trimmed) return;
    setIsLoading(true);
    setResult(undefined);
    setGroqExamples(null);
    setGroqCommonPhrases(null);
    setGroqWordMatrix(null);
    setGroqEtymology(null);
    setGroqSemanticShift(null);
    const langLabel = dir === 'tr-fr' || dir === 'fr-tr' ? 'Fransızca' : dir === 'tr-en' || dir === 'en-tr' ? 'İngilizce' : 'İspanyolca';
    try {
      const groq = await fetchFromGroq(trimmed, langLabel);
      const st = groqToSourceTarget(groq, dir) ?? (groq.word && groq.translation ? { source: groq.word, target: groq.translation } : null);
      if (st) {
        const lang: 'fr' | 'es' | 'en' = dir === 'tr-fr' || dir === 'fr-tr' ? 'fr' : dir === 'tr-en' || dir === 'en-tr' ? 'en' : 'es';
        const r: SearchResult = {
          source: sanitizeForDisplay(st.source),
          target: sanitizeForDisplay(st.target),
          type: 'kelime',
          lang,
          phonetic: groq.phonetic ? sanitizeForDisplay(groq.phonetic) : undefined,
          exampleSource: undefined,
          exampleTarget: undefined,
          synonyms: groq.synonyms ? sanitizeForDisplay(groq.synonyms) : undefined,
          antonyms: groq.antonyms ? sanitizeForDisplay(groq.antonyms) : undefined,
          level: groq.level ? sanitizeForDisplay(groq.level) : undefined,
          targetVerb:
            groq.wordMatrix?.verb &&
            st.source.trim().toLowerCase() === groq.wordMatrix.verb.trim().toLowerCase()
              ? sanitizeForDisplay(st.source)
              : undefined,
        };
        setResult(r);
        const pairs =
          Array.isArray(groq.examples) && groq.examples.length > 0
            ? groqExamplesToState(groq.examples)
            : null;
        setGroqExamples(pairs);
        setExampleDisplayCount(3);
        const phrases =
          Array.isArray(groq.commonPhrases) && groq.commonPhrases.length > 0
            ? groq.commonPhrases
                .filter((p): p is GroqCommonPhrase => typeof p?.phrase === 'string' && typeof p?.meaning === 'string')
                .map((p) => ({ phrase: sanitizeForDisplay(p.phrase), meaning: sanitizeForDisplay(p.meaning) }))
            : null;
        setGroqCommonPhrases(phrases);
        if (groq.wordMatrix && typeof groq.wordMatrix === 'object') {
          setGroqWordMatrix(groq.wordMatrix);
        } else {
          setGroqWordMatrix(null);
        }
        if (groq.etymology && typeof groq.etymology === 'object' && typeof groq.etymology.root === 'string') {
          setGroqEtymology(groq.etymology);
        } else {
          setGroqEtymology(null);
        }
        setGroqSemanticShift(typeof groq.semanticShift === 'string' && groq.semanticShift.trim() ? groq.semanticShift.trim() : null);
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
        setGroqWordMatrix(null);
        setGroqEtymology(null);
        setGroqSemanticShift(null);
      }
    } catch (err) {
      console.warn('[Sözlük] Groq istek hatası:', err);
      setResult(null);
      setGroqExamples(null);
      setGroqCommonPhrases(null);
      setGroqWordMatrix(null);
      setGroqEtymology(null);
      setGroqSemanticShift(null);
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
        {jsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
      </Helmet>
      <DictionaryBackground />
      <Navbar />

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 py-10 sm:py-14 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl mx-auto">
          {/* Dil seçici — arama kutusunun hemen üstünde, pill segmented control (Fransızca, İspanyolca, İngilizce) */}
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
                className={`relative flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-night-950 min-w-[90px] sm:min-w-[100px] ${direction === 'tr-fr' || direction === 'fr-tr' ? 'text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}
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
                <span className="relative z-10 hidden sm:inline">Fransızca</span>
                <span className="relative z-10 sm:hidden">FR</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={direction === 'tr-es' || direction === 'es-tr'}
                onClick={() => setDirection(direction === 'tr-es' || direction === 'es-tr' ? swapDirection(direction) : 'tr-es')}
                className={`relative flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-night-950 min-w-[90px] sm:min-w-[100px] ${direction === 'tr-es' || direction === 'es-tr' ? 'text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}
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
                <span className="relative z-10 hidden sm:inline">İspanyolca</span>
                <span className="relative z-10 sm:hidden">ES</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isEnglish}
                onClick={() => setDirection(isEnglish ? swapDirection(direction) : 'tr-en')}
                className={`relative flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-night-950 min-w-[90px] sm:min-w-[100px] ${isEnglish ? 'text-white' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}
              >
                {isEnglish && (
                  <motion.span
                    layoutId="dict-lang-pill"
                    className="absolute inset-0 rounded-full bg-indigo-500/90 dark:bg-indigo-500"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    style={{ zIndex: 0 }}
                  />
                )}
                <span className="relative z-10" aria-hidden>🇬🇧</span>
                <span className="relative z-10 hidden sm:inline">İngilizce</span>
                <span className="relative z-10 sm:hidden">EN</span>
              </button>
            </motion.div>
          </div>

          {/* Command Bar — sayfa ortasında yüzen, ince border + derin gölge + autocomplete */}
          <form ref={searchFormRef} onSubmit={handleSearch} className="mb-4 relative">
            <motion.div
              className="relative rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/5 shadow-2xl overflow-visible focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500/20 transition-all duration-300"
              initial={false}
            >
              <div className="flex items-center min-h-[64px] sm:min-h-[72px] px-4 sm:px-5 gap-3">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 dark:text-slate-500 shrink-0" strokeWidth={2} aria-hidden />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setAutocompleteOpen(true);
                  }}
                  onFocus={() => debouncedQuery.trim().length >= 1 && setAutocompleteOpen(true)}
                  onKeyDown={(e) => {
                    if (!autocompleteOpen || autocompleteSuggestions.length === 0) {
                      if (e.key === 'Escape') setAutocompleteOpen(false);
                      return;
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setAutocompleteSelectedIndex((i) => Math.min(i + 1, autocompleteSuggestions.length));
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setAutocompleteSelectedIndex((i) => Math.max(i - 1, 0));
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (autocompleteSelectedIndex < autocompleteSuggestions.length) {
                        const sel = autocompleteSuggestions[autocompleteSelectedIndex];
                        if (sel) {
                          handleSearchQuery(sel.word, direction);
                          setAutocompleteOpen(false);
                        }
                      } else {
                        handleSearchQuery(query.trim(), direction);
                        setAutocompleteOpen(false);
                      }
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setAutocompleteOpen(false);
                    }
                  }}
                  placeholder={isEnglish ? 'İngilizce veya Türkçe kelime...' : direction === 'tr-fr' || direction === 'fr-tr' ? 'Fransızca veya Türkçe kelime...' : 'İspanyolca veya Türkçe kelime...'}
                  className="flex-1 min-w-0 bg-transparent border-0 py-3 text-xl sm:text-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                  aria-label={direction.startsWith('tr') ? 'Hangi kelimenin anlamına bakalım?' : 'Arama'}
                  aria-autocomplete="list"
                  aria-expanded={autocompleteOpen && autocompleteSuggestions.length > 0}
                  aria-controls="dict-autocomplete-list"
                />
                {query.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setResult(undefined); setAutocompleteOpen(false); }}
                    className="p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/10 transition-colors shrink-0"
                    aria-label="Temizle"
                  >
                    <X className="w-5 h-5" strokeWidth={2} />
                  </button>
                )}
              </div>
            </motion.div>
            {autocompleteOpen && debouncedQuery.trim().length >= 1 && (
              <ul
                id="dict-autocomplete-list"
                ref={autocompleteListRef}
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl overflow-hidden max-h-72 overflow-y-auto"
              >
                {autocompleteSuggestions.map((item, i) => (
                  <li
                    key={`${item.word}-${i}`}
                    role="option"
                    aria-selected={i === autocompleteSelectedIndex}
                    className={`flex items-center justify-between gap-2 px-4 py-3 text-left cursor-pointer transition-colors ${
                      i === autocompleteSelectedIndex ? 'bg-indigo-500/15 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-200' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200'
                    }`}
                    onMouseEnter={() => setAutocompleteSelectedIndex(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSearchQuery(item.word, direction);
                      setAutocompleteOpen(false);
                    }}
                  >
                    <span className="font-medium truncate">{item.word}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm truncate shrink-0">— {item.meaning}</span>
                  </li>
                ))}
                <li
                  role="option"
                  aria-selected={autocompleteSuggestions.length === autocompleteSelectedIndex}
                  className="flex items-center justify-between gap-2 px-4 py-3 text-left cursor-pointer border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-medium"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSearchQuery(query.trim(), direction);
                    setAutocompleteOpen(false);
                  }}
                >
                  Tüm sonuçları göster →
                </li>
              </ul>
            )}
          </form>

          {/* Son aramalar — dil bayrağı + kelime, tek tek silinebilir */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-6 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 self-center mr-1">Son aramalar</span>
              {recentSearches.map(({ query: q, dir }) => {
                const flag = dir === 'tr-fr' || dir === 'fr-tr' ? '🇫🇷' : dir === 'tr-es' || dir === 'es-tr' ? '🇪🇸' : '🇬🇧';
                return (
                  <span
                    key={`${dir}-${q}`}
                    className="inline-flex items-center gap-1 rounded-md bg-white/5 dark:bg-white/5 border border-slate-200/50 dark:border-slate-600/50 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(q);
                        setDirection(dir);
                        doSearch(q, dir);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/10 dark:hover:bg-white/10 transition-colors text-left"
                    >
                      <span aria-hidden>{flag}</span>
                      <span className="ml-1">{q}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecentSearches((prev) => {
                          const next = prev.filter((x) => !(x.query === q && x.dir === dir));
                          try {
                            window.localStorage.setItem('dictionary_recent', JSON.stringify(next));
                          } catch {
                            // ignore
                          }
                          return next;
                        });
                      }}
                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
                      aria-label={`${q} aramasını sil`}
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </span>
                );
              })}
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
                {/* Günün Kelimeleri — minimal: ikon + kelime + anlam (FR, ES, EN) */}
                <div className="pt-8 border-t border-slate-200/50 dark:border-white/10">
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-5 text-center">Günün Kelimeleri</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-6">
                    {(() => {
                      const { fr, es, en } = getWordsOfTheDay();
                      return (
                        <>
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 }}
                            className="relative group flex items-start gap-3 text-left rounded-lg py-1 -mx-1 hover:bg-white/5 dark:hover:bg-white/5 transition-colors duration-200"
                          >
                            <span className="absolute top-0 right-0 z-10" onClick={(e) => e.stopPropagation()}>
                              <PronunciationButton word={fr.label} lang="fr-FR" size="sm" />
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSearchQuery(fr.word, fr.dir)}
                              className="flex items-start gap-3 text-left w-full focus:outline-none focus:ring-0 rounded-lg"
                            >
                              <span className="text-xl mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden>🌟</span>
                              <div className="min-w-0 pr-10">
                                <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{fr.label}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{fr.translation}</p>
                              </div>
                            </button>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="relative group flex items-start gap-3 text-left rounded-lg py-1 -mx-1 hover:bg-white/5 dark:hover:bg-white/5 transition-colors duration-200"
                          >
                            <span className="absolute top-0 right-0 z-10" onClick={(e) => e.stopPropagation()}>
                              <PronunciationButton word={es.label} lang="es-ES" size="sm" />
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSearchQuery(es.word, es.dir)}
                              className="flex items-start gap-3 text-left w-full focus:outline-none focus:ring-0 rounded-lg"
                            >
                              <span className="text-xl mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden>🌟</span>
                              <div className="min-w-0 pr-10">
                                <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{es.label}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{es.translation}</p>
                              </div>
                            </button>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.15 }}
                            className="relative group flex items-start gap-3 text-left rounded-lg py-1 -mx-1 hover:bg-white/5 dark:hover:bg-white/5 transition-colors duration-200"
                          >
                            <span className="absolute top-0 right-0 z-10" onClick={(e) => e.stopPropagation()}>
                              <PronunciationButton word={en.label} lang="en-US" size="sm" />
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSearchQuery(en.word, en.dir)}
                              className="flex items-start gap-3 text-left w-full focus:outline-none focus:ring-0 rounded-lg"
                            >
                              <span className="text-xl mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden>🌟</span>
                              <div className="min-w-0 pr-10">
                                <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{en.label}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{en.translation}</p>
                              </div>
                            </button>
                          </motion.div>
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="mt-14 sm:mt-18"
              >
                {/* Üst satır: Kapat + Favori yıldızı + klavye ipucu */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 opacity-60" aria-hidden>
                    [Esc] kapat · [S] kaydet · [P] seslendir
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsFavourite((f) => !f)}
                      className="p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      aria-label={isFavourite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                    >
                      <Star
                        className={`w-5 h-5 ${isFavourite ? 'fill-amber-400 text-amber-400 dark:fill-amber-500 dark:text-amber-500' : 'fill-none'}`}
                        strokeWidth={2}
                        aria-hidden
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      className="p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      aria-label="Kapat"
                    >
                      <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Kelime başlığı: çok büyük + tür (küçük italik gri) + ses + anlam */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 capitalize tracking-tight">
                    {result.source}
                  </h2>
                  <span className="text-xs sm:text-sm font-medium italic text-slate-400 dark:text-slate-500">
                    {result.type}
                  </span>
                  {/* CEFR seviye badge: A1/A2 yeşil, B1/B2 sarı, C1/C2 kırmızı */}
                  {result.level && (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        /^A[12]$/i.test(result.level)
                          ? 'bg-green-900/80 text-green-300 dark:bg-green-900/60 dark:text-green-300 border-green-500/40'
                          : /^B[12]$/i.test(result.level)
                            ? 'bg-yellow-900/80 text-yellow-300 dark:bg-yellow-900/60 dark:text-yellow-300 border-yellow-500/40'
                            : /^C[12]$/i.test(result.level)
                              ? 'bg-red-900/80 text-red-300 dark:bg-red-900/60 dark:text-red-300 border-red-500/40'
                              : 'bg-slate-700/60 text-slate-300 border-slate-500/40'
                      }`}
                      title="Kelime seviyesi (A1–C2)"
                    >
                      {result.level.toUpperCase()}
                    </span>
                  )}
                  <PronunciationButton
                    word={direction === 'tr-fr' || direction === 'tr-es' || direction === 'tr-en' ? result.target : result.source}
                    lang={result.lang === 'en' ? 'en-US' : result.lang === 'fr' ? 'fr-FR' : 'es-ES'}
                    size="md"
                  />
                </div>
                {result.phonetic && (
                  <p className={`mt-1 font-mono text-slate-500 dark:text-slate-400 ${result.lang === 'en' ? 'text-sm tracking-wide' : 'text-base'}`}>
                    {result.phonetic}
                  </p>
                )}
                <p className="mt-2 text-xl sm:text-2xl font-medium text-indigo-600 dark:text-indigo-400">
                  {result.target}
                </p>

                {/* Fiil Laboratuvarında Aç — sadece fiilse */}
                {result.targetVerb && (
                  <Link
                    to={`/fiil-laboratuvari?verb=${encodeURIComponent(result.targetVerb)}&lang=${result.lang}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-300/60 dark:border-indigo-500/50 bg-indigo-50/80 dark:bg-indigo-500/15 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <span aria-hidden>⚗</span>
                    Fiil Laboratuvarında Aç →
                  </Link>
                )}
                {/* Set'e Ekle — transparan çerçeveli buton + Plus ikonu */}
                <div className="relative mt-4 inline-block" ref={addToSetRef}>
                  <button
                    type="button"
                    onClick={() => setAddToSetOpen((o) => !o)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300/60 dark:border-white/10 bg-transparent dark:bg-white/5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-[#0a0e17]"
                  >
                    <Plus className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
                    Set&apos;e Ekle
                  </button>
                  {addToSetOpen && (
                    <div className="absolute left-0 top-full mt-1 min-w-[14rem] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl py-2 z-50 max-h-72 overflow-y-auto">
                      <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                        Hangi sete ekleyeceksiniz?
                      </p>
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
                      <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                        <Link
                          to="/ezber-makinesi"
                          className="block px-4 py-2.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                          onClick={() => setAddToSetOpen(false)}
                        >
                          + Yeni Set Oluştur
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Kelime formülü */}
                {(result.prefix || result.root) && (
                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-slate-500 dark:text-slate-500">Formül:</span>{' '}
                    {result.prefix && <span className="text-indigo-600 dark:text-indigo-400">{result.prefix}</span>}
                    {result.prefix && result.root && ' + '}
                    {result.root && <span>{result.root}</span>}
                  </p>
                )}

                {/* Örnek Cümleler — seviye badge, italik cümle (mavi/mor), çeviri, Daha Fazla Göster */}
                {groqExamples && groqExamples.length > 0 && (
                  <div className="mt-8">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-3">
                      Örnek Cümleler
                    </p>
                    <div className="space-y-4">
                      {groqExamples.slice(0, exampleDisplayCount).map((item, i) => {
                        const levelClass =
                          item.level === 'A1' || item.level === 'A2'
                            ? 'bg-green-900/80 text-green-300 dark:bg-green-900/60 dark:text-green-300'
                            : item.level === 'B1' || item.level === 'B2'
                              ? 'bg-yellow-900/80 text-yellow-300 dark:bg-yellow-900/60 dark:text-yellow-300'
                              : 'bg-red-900/80 text-red-300 dark:bg-red-900/60 dark:text-red-300';
                        return (
                          <div key={i} className="flex gap-3">
                            <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${levelClass}`}>
                              {item.level}
                            </span>
                            <blockquote className="flex-1 min-w-0 border-l-2 border-indigo-500/60 dark:border-indigo-400/50 pl-3 py-0.5">
                              <p className="text-indigo-700 dark:text-indigo-300 italic leading-relaxed">
                                {highlightWord(item.sentence, (direction === 'tr-fr' || direction === 'tr-es' || direction === 'tr-en') ? result.target : result.source)}
                              </p>
                              {item.translation && (
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                                  {item.translation}
                                </p>
                              )}
                            </blockquote>
                          </div>
                        );
                      })}
                    </div>
                    {groqExamples.length > exampleDisplayCount && (
                      <button
                        type="button"
                        onClick={() => setExampleDisplayCount((c) => Math.min(c + 3, groqExamples.length))}
                        className="mt-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded"
                      >
                        Daha Fazla Göster
                      </button>
                    )}
                  </div>
                )}

                {/* Kelime Matrisi — arka plansız, ince ayırıcı, simetrik grid; N V A Adv */}
                <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-white/10">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-3">
                    Kelime Matrisi
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-slate-200/50 dark:border-white/10 rounded-lg divide-x divide-y divide-slate-200/50 dark:divide-white/10">
                    {[
                      { key: 'noun', letter: 'N', label: 'İsim', value: groqWordMatrix?.noun ?? null },
                      { key: 'verb', letter: 'V', label: 'Fiil', value: groqWordMatrix?.verb ?? null },
                      { key: 'adjective', letter: 'A', label: 'Sıfat', value: groqWordMatrix?.adjective ?? null },
                      { key: 'adverb', letter: 'Adv', label: 'Zarf', value: groqWordMatrix?.adverb ?? null },
                    ].map(({ key, letter, label, value }) => {
                      const parsed = parseWordMatrixEntry(value);
                      const isEmpty = !parsed || !parsed.word || parsed.word === '-';
                      return (
                        <div
                          key={key}
                          className={`p-3 transition-opacity ${isEmpty ? 'opacity-50' : ''}`}
                        >
                          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-slate-200/50 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                              {letter}
                            </span>
                            {label}
                          </p>
                          {isEmpty ? (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">—</p>
                          ) : (
                            <>
                              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5">{parsed.word}</p>
                              {parsed.meaning && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{parsed.meaning}</p>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sık Kullanılan Kalıplar / Yaygın Kullanımlar (EN: phrasal verbs) — minimal */}
                {groqCommonPhrases && groqCommonPhrases.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-white/10">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-3">
                      {result.lang === 'en' ? 'Yaygın Kullanımlar' : 'Sık Kullanılan Kalıplar'}
                    </p>
                    <div className="space-y-2">
                      {groqCommonPhrases.map((item, i) => (
                        <p key={i} className="text-sm">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{item.phrase}</span>
                          <span className="text-slate-500 dark:text-slate-400 italic ml-2">{item.meaning}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Etimoloji Dedektifi — köken + görsel ağaç + eğlenceli bilgi */}
                {(groqEtymology?.root || groqSemanticShift) && (
                  <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-white/10">
                    <div
                      className="relative rounded-2xl border border-amber-200/30 dark:border-amber-900/50 overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(254,243,199,0.12) 0%, rgba(253,230,138,0.06) 50%, rgba(251,191,36,0.08) 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* Laboratuvar grid / parşömen dokusu */}
                      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none" aria-hidden>
                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <pattern id="etym-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.4" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#etym-grid)" className="text-amber-800 dark:text-amber-600" />
                        </svg>
                      </div>
                      <div className="relative p-5 sm:p-6">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400/90 mb-4">
                          Etimoloji Dedektifi
                        </p>

                        {/* Görsel soy ağacı: kök merkez, dallar = akraba kelimeler */}
                        {groqEtymology?.root && (
                          <div className="mb-6">
                            <div className="relative flex flex-col items-center min-h-[140px]">
                              {/* Üst satır: akraba kelimeler (dalların uçları) */}
                              {groqEtymology.connections.length > 0 && (
                                <>
                                  <div className="flex flex-col md:flex-row justify-center gap-3 mb-2">
                                    {groqEtymology.connections.map((conn, i) => (
                                      <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1, duration: 0.3 }}
                                        className="flex flex-col items-center rounded-lg border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 px-3 py-2 shadow-sm"
                                      >
                                        <span className="text-[10px] font-medium uppercase text-amber-600 dark:text-amber-500/80">
                                          {conn.lang === 'Fr' ? '🇫🇷 Fr' : conn.lang === 'Es' ? '🇪🇸 Es' : conn.lang === 'En' ? '🇬🇧 En' : conn.lang}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                          {conn.word}
                                        </span>
                                        {conn.relation && (
                                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[100px] text-center leading-tight line-clamp-2">
                                            {conn.relation}
                                          </span>
                                        )}
                                      </motion.div>
                                    ))}
                                  </div>
                                  {/* Dal çizgileri: köke doğru (dekoratif) */}
                                  <div className="w-0.5 h-4 rounded-full bg-gradient-to-b from-amber-400/40 to-amber-500/50 dark:from-amber-500/30 dark:to-amber-600/40" aria-hidden />
                                </>
                              )}
                              {/* Merkez: kök */}
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.35 }}
                                className="rounded-xl bg-amber-500/25 dark:bg-amber-600/30 border-2 border-amber-400/50 dark:border-amber-500/50 px-5 py-3 shadow-md mt-1"
                              >
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200/90 block text-center">
                                  Köken
                                </span>
                                <span className="text-lg font-bold text-amber-900 dark:text-amber-100 block text-center mt-1">
                                  {groqEtymology.root}
                                </span>
                              </motion.div>
                            </div>
                          </div>
                        )}

                        {/* Eğlenceli Bilgi: anlam kayması */}
                        {groqSemanticShift && (
                          <div className="rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/10 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                              Eğlenceli Bilgi
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                              {groqSemanticShift}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Eş anlamlılar / Zıt anlamlılar — tıklanınca o kelimeyi ara */}
                {(result.synonyms || result.antonyms) && (
                  <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-white/10 space-y-4">
                    {result.synonyms && result.synonyms !== '—' && (() => {
                      const words = result.synonyms!.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
                      if (words.length === 0) return null;
                      return (
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">
                            Eş anlamlılar
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {words.map((word) => (
                              <button
                                key={word}
                                type="button"
                                onClick={() => handleSearchQuery(word, direction)}
                                className="rounded-full border border-indigo-300/60 dark:border-indigo-500/50 bg-indigo-50/80 dark:bg-indigo-500/15 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              >
                                {word}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {result.antonyms && result.antonyms !== '—' && (() => {
                      const words = result.antonyms!.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
                      if (words.length === 0) return null;
                      return (
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">
                            Zıt anlamlılar
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {words.map((word) => (
                              <button
                                key={word}
                                type="button"
                                onClick={() => handleSearchQuery(word, direction)}
                                className="rounded-full border border-slate-300/60 dark:border-slate-500/50 bg-slate-100/80 dark:bg-slate-600/30 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                              >
                                {word}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
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
