import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useThemeContext } from '../contexts/ThemeContext';

const SITE_URL = 'https://diloloji.com';
import {
  searchDictionary,
  DIRECTION_LABELS,
  DIRECTIONS,
  type DictDirection,
  type SearchResult,
} from '../data/mockDictionary';

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
    case 'tr-fr': return 'fr-tr';
    case 'fr-tr': return 'tr-fr';
    case 'tr-es': return 'es-tr';
    case 'es-tr': return 'tr-es';
    default: return dir;
  }
}

export default function Dictionary() {
  const { isDark, toggleTheme, mounted } = useThemeContext();
  const [direction, setDirection] = useState<DictDirection>('tr-fr');
  const pageUrl = `${SITE_URL}/sozluk`;
  const pageTitle = 'Sözlük | Diloloji';
  const pageDescription = 'Türkçe–Fransızca ve Türkçe–İspanyolca sözlük. Kelime arayın, çevirileri ve telaffuzu dinleyin.';
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null | undefined>(undefined);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) {
        setResult(undefined);
        return;
      }
      const r = searchDictionary(q, direction);
      setResult(r ?? null);
    },
    [query, direction]
  );

  const handleSpeak = useCallback(
    (result: SearchResult) => {
      const lang = result.lang === 'fr' ? 'fr-FR' : 'es-ES';
      const wordToSpeak = direction === 'tr-fr' || direction === 'tr-es' ? result.target : result.source;
      speakWord(wordToSpeak, lang);
    },
    [direction]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
      </Helmet>
      <header className="w-full flex justify-between items-center py-3 px-4 sm:px-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-50 transition-colors duration-300">
        <div className="min-w-0 flex items-center gap-2 sm:gap-3 flex-1">
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 shrink-0 transition-all duration-300 hover:opacity-90 hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-lg"
            aria-label="Ana sayfa"
          >
            <img src="/logo.svg" alt="Diloloji" className="h-8 sm:h-10 w-auto shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:hidden shrink-0">Diloloji</span>
            <span className="text-slate-400 dark:text-slate-500 text-sm italic hidden md:inline shrink-0">Dilin matematiğini çöz.</span>
          </Link>
          <div className="ml-2 md:ml-4 hidden md:flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-600 shrink-0" role="tablist" aria-label="Uygulama modu">
            <Link to="/fiil-laboratuvari" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50" aria-label="Fiil Laboratuvarı">Fiil Laboratuvarı</Link>
            <Link to="/ezber-makinesi" className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50" aria-label="Ezber Makinesi">Ezber Makinesi</Link>
            <Link to="/sozluk" className="rounded-lg px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" aria-current="page">📖 Sözlük</Link>
          </div>
        </div>
        <div className="flex items-center shrink-0 gap-2">
          {mounted && (
            <button type="button" onClick={toggleTheme} className="p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50" aria-label={isDark ? 'Açık moda geç' : 'Karanlık moda geç'}>
              <span className="text-sm md:text-base leading-none" aria-hidden>{isDark ? '☀️' : '🌙'}</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 md:px-8 py-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">Sözlük</h1>

          {/* Dil yönü seçici */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {DIRECTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  direction === d
                    ? 'bg-indigo-600 text-white dark:bg-indigo-500 shadow-md'
                    : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {DIRECTION_LABELS[d]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDirection(swapDirection(direction))}
              className="p-2 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              title="Yönü değiştir"
              aria-label="Yönü değiştir"
            >
              <span className="text-lg" aria-hidden>⇄</span>
            </button>
          </div>

          {/* Arama çubuğu */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={direction.startsWith('tr') ? 'Kelime girin...' : direction.startsWith('fr') ? 'Entrez un mot...' : 'Introduce una palabra...'}
                className="w-full rounded-2xl bg-slate-800/50 dark:bg-slate-800/70 border border-slate-600 dark:border-slate-600 p-4 pr-12 text-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                aria-label="Arama"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" aria-label="Ara">
                <span className="text-xl" aria-hidden>🔍</span>
              </button>
            </div>
          </form>

          {/* Sonuç kartı veya bulunamadı */}
          {result === undefined ? null : result === null ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl bg-slate-900/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-700 dark:border-slate-600 p-8 text-center"
            >
              <p className="text-slate-500 dark:text-slate-400 text-lg">Kelime bulunamadı</p>
              <p className="text-slate-400 dark:text-slate-500 text-4xl mt-2" aria-hidden>🕵️‍♂️</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl bg-slate-900/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-700 dark:border-slate-600 p-6"
            >
              <div className="flex items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 capitalize">{result.source}</h2>
                  <p className="text-sm italic text-slate-500 dark:text-slate-400 mt-0.5">{result.type}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSpeak(result)}
                  className="p-2.5 rounded-xl bg-slate-700/60 dark:bg-slate-700/80 text-slate-300 dark:text-slate-300 hover:bg-indigo-500/30 dark:hover:bg-indigo-500/30 hover:text-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  title="Sesli oku"
                  aria-label="Sesli oku"
                >
                  <span className="text-xl" aria-hidden>🔊</span>
                </button>
              </div>
              <p className="mt-4 text-xl font-semibold text-indigo-600 dark:text-indigo-400">{result.target}</p>
              {(result.exampleSource || result.exampleTarget) && (
                <div className="mt-4 pt-4 border-t border-slate-700/80 dark:border-slate-600/80 space-y-2">
                  {result.exampleSource && <p className="text-sm text-slate-400 dark:text-slate-500 italic">{result.exampleSource}</p>}
                  {result.exampleTarget && <p className="text-sm text-slate-500 dark:text-slate-400 italic">{result.exampleTarget}</p>}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
