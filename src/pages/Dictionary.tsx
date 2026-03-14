import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X } from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  searchDictionary,
  DIRECTION_LABELS,
  DIRECTIONS,
  POPULAR_SEARCHES,
  getWordOfTheDay,
  type DictDirection,
  type SearchResult,
} from '../data/mockDictionary';

const SITE_URL = 'https://diloloji.com';

function getSegmentsForDirection(direction: DictDirection): { dir: DictDirection; label: string; flag: string }[] {
  const isFr = direction === 'tr-fr' || direction === 'fr-tr';
  return isFr
    ? [
        { dir: 'tr-fr', label: 'TR → FR', flag: '🇫🇷' },
        { dir: 'fr-tr', label: 'FR → TR', flag: '🇫🇷' },
        { dir: 'tr-es', label: 'TR → ES', flag: '🇪🇸' },
        { dir: 'es-tr', label: 'ES → TR', flag: '🇪🇸' },
      ]
    : [
        { dir: 'tr-es', label: 'TR → ES', flag: '🇪🇸' },
        { dir: 'es-tr', label: 'ES → TR', flag: '🇪🇸' },
        { dir: 'tr-fr', label: 'TR → FR', flag: '🇫🇷' },
        { dir: 'fr-tr', label: 'FR → TR', flag: '🇫🇷' },
      ];
}

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
  const { selectedLanguage } = useLanguage();
  const [direction, setDirection] = useState<DictDirection>(selectedLanguage === 'es' ? 'tr-es' : 'tr-fr');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null | undefined>(undefined);

  const pageUrl = `${SITE_URL}/sozluk`;
  const pageTitle = 'Sözlük | Diloloji';
  const pageDescription = 'Kelime Analiz Paneli — Fransızca ve İspanyolca kelime anlamları, örnek cümleler ve ilişkili denklemler.';

  useEffect(() => {
    const newDir: DictDirection = selectedLanguage === 'es' ? 'tr-es' : 'tr-fr';
    setDirection(newDir);
    setResult(undefined);
    if (query.trim()) {
      const r = searchDictionary(query.trim(), newDir);
      setResult(r ?? null);
    }
  }, [selectedLanguage]);

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
    const r = searchDictionary(q.trim(), dir);
    setResult(r ?? null);
  }, []);

  const segments = getSegmentsForDirection(direction);

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

      <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 py-8 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">Kelime Analiz Paneli</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">Anlam, örnek cümleler ve ilişkili denklemler</p>

          {/* Dil seçici — arama çubuğunun hemen üstü, segmented control + neon + alt çizgi */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4 overflow-x-auto pb-1">
            <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600" role="tablist" aria-label="Dil yönü">
              {segments.map((seg) => (
                <button
                  key={seg.dir}
                  type="button"
                  role="tab"
                  aria-selected={direction === seg.dir}
                  onClick={() => setDirection(seg.dir)}
                  className={`relative rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-1 dark:focus:ring-offset-slate-800 whitespace-nowrap ${
                    direction === seg.dir
                      ? 'bg-indigo-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.5)] dark:shadow-[0_0_20px_rgba(129,140,248,0.4)] border-b-2 border-indigo-300 dark:border-indigo-400'
                      : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 opacity-80'
                  }`}
                >
                  <span className="mr-1.5" aria-hidden>{seg.flag}</span>
                  {DIRECTION_LABELS[seg.dir]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDirection(swapDirection(direction))}
              className="p-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              title="Yönü değiştir"
              aria-label="Yönü değiştir"
            >
              <span className="text-lg" aria-hidden>⇄</span>
            </button>
          </div>

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
                  placeholder={direction.startsWith('tr') ? 'Kelime girin...' : direction.startsWith('fr') ? 'Entrez un mot...' : 'Introduce una palabra...'}
                  className="flex-1 min-w-0 bg-transparent border-0 py-4 pl-2 pr-12 text-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0"
                  aria-label="Arama"
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
                  <button type="submit" className="p-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors duration-200" aria-label="Ara">
                    <span className="text-xl" aria-hidden>🔍</span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* İçerik: Boş durum / Sonuç / Bulunamadı */}
          <AnimatePresence mode="wait">
            {result === undefined && !query.trim() && (
              <motion.section
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Bugünün Kelimesi */}
                {(() => {
                  const wotd = getWordOfTheDay();
                  return (
                    <div className="rounded-2xl bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/80 dark:border-slate-600/60 p-6 shadow-lg">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Bugünün Kelimesi</h2>
                      <button
                        type="button"
                        onClick={() => handleSearchQuery(wotd.word, wotd.dir)}
                        className="text-xl font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors text-left"
                      >
                        {wotd.label}
                      </button>
                    </div>
                  );
                })()}
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

            {result === undefined && query.trim() ? null : result === null ? (
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
            ) : result ? (
              <motion.div
                key="result"
                layoutId="dict-result-card"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-3xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-600/80 shadow-xl overflow-hidden"
              >
                {/* Başlık: Kelime + fonetik + TTS */}
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
                  {/* Tür etiketleri */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-medium ${typeBadgeClass(result.type)}`}>
                      {result.type}
                    </span>
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
                          {result.type === 'fiil' && result.targetVerb && (
                            <Link
                              to="/fiil-laboratuvari"
                              state={result.targetVerb ? { openVerb: result.targetVerb } : undefined}
                              className="inline-flex items-center gap-2 mt-3 rounded-lg border border-indigo-500/40 dark:border-indigo-400/50 bg-indigo-500/10 dark:bg-indigo-500/20 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 transition-colors"
                            >
                              Fiil Lab'da Çöz
                              <span aria-hidden>→</span>
                            </Link>
                          )}
                        </div>
                      )}
                      {result.exampleTarget && (
                        <div className="rounded-xl bg-slate-100/80 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50 p-4">
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            {highlightWord(result.exampleTarget, result.target)}
                          </p>
                          {result.type === 'fiil' && result.targetVerb && (
                            <Link
                              to="/fiil-laboratuvari"
                              state={result.targetVerb ? { openVerb: result.targetVerb } : undefined}
                              className="inline-flex items-center gap-2 mt-3 rounded-lg border border-indigo-500/40 dark:border-indigo-400/50 bg-indigo-500/10 dark:bg-indigo-500/20 px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 transition-colors"
                            >
                              Fiil Lab'da Çöz
                              <span aria-hidden>→</span>
                            </Link>
                          )}
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
    </div>
  );
}
