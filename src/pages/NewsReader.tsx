/**
 * Okuma Modu (Haberler) — Wikinews (es) makalelerini okuma deneyimi.
 *
 * Akış:
 *  1. Liste — son 20 haberin başlıklarını gösterir. API hata verirse
 *     `FALLBACK_ARTICLES` listesi gösterilir.
 *  2. Okuyucu — kelimeler tıklanınca Anthropic analizi (bellek önbelleği);
 *     bilinen fiiller ayrıca sarı vurgulanır. Metin sonunda scroll ile mini quiz
 *     ve yanlış fiillerin SRS (mistake bank) ile işlenmesi.
 *
 * Tooltip parent'a göre absolute konumludur (position:fixed değil).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Home,
  Newspaper,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  estimateLevel,
  fetchArticleExtract,
  listRecentArticles,
  type NewsArticle,
  type NewsListItem,
  type ReadingLevel,
} from '../services/wikinewsApi';
import { FALLBACK_ARTICLES } from '../data/readingFallbackTexts';
import {
  buildConjugationMap,
  getTurkishForInfinitive,
  normalizeWord,
  type VerbMatch,
} from '../data/readingVerbList';
import { translateWordToTr, type WordTip } from '../services/wordTranslate';
import {
  analyzeWordForReading,
  generateReadingQuiz,
  hasAnthropicKey,
  type ReadingQuizItem,
  type ReadingWordAnalysis,
} from '../services/readingLLM';
import { addMistake } from '../utils/mistakeBank';

/* ───────────────────── Yardımcılar ───────────────────── */

type Phase = 'list' | 'reader';

interface ReaderArticle {
  title: string;
  extract: string;
  sourceUrl: string;
  level: ReadingLevel;
  /** Fallback mi, Wikinews mi (sadece bilgi amaçlı). */
  source: 'wikinews' | 'fallback';
  theme?: string;
}

const LEVEL_BADGE: Record<ReadingLevel, string> = {
  A2: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  B1: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  B2: 'bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/35',
};

type LevelFilter = 'all' | ReadingLevel;

interface Token {
  key: string;
  value: string;
  isWord: boolean;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /([\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*)|([^\p{L}\p{M}]+)/gu;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    const [full, wordPart] = match;
    tokens.push({ key: `${i}-${match.index}`, value: full, isWord: Boolean(wordPart) });
    i += 1;
  }
  return tokens;
}

/** Paragrafları böl (boş satırlar \n\n) + ardından token'lara ayır. */
function paragraphize(text: string): Token[][] {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+\n/g, '\n').trim())
    .filter(Boolean);
  return paras.map((p) => tokenize(p));
}

function readingAnswerNorm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ReadingQuizSection({ title, extract }: { title: string; extract: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [endVisible, setEndVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ReadingQuizItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [missOnce, setMissOnce] = useState(false);
  const [justCorrect, setJustCorrect] = useState(false);
  const [complete, setComplete] = useState(false);
  const [correctTotal, setCorrectTotal] = useState(0);
  const [wrongVerbs, setWrongVerbs] = useState<string[]>([]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setEndVisible(true);
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px 64px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [title, extract]);

  const startQuiz = useCallback(async () => {
    setQError(null);
    setQLoading(true);
    setStarted(true);
    try {
      if (!hasAnthropicKey()) {
        setQError('Quiz için .env üzerinde VITE_ANTHROPIC_API_KEY tanımlanmalı.');
        setStarted(false);
        return;
      }
      const qs = await generateReadingQuiz(title, extract);
      const three = qs.slice(0, 3);
      if (three.length < 1) {
        setQError('Soru üretilemedi.');
        setStarted(false);
        return;
      }
      setQuestions(three);
      setIdx(0);
      setInput('');
      setMissOnce(false);
      setJustCorrect(false);
      setComplete(false);
      setCorrectTotal(0);
      setWrongVerbs([]);
    } catch (e) {
      setQError(e instanceof Error ? e.message : 'Quiz yüklenemedi');
      setStarted(false);
    } finally {
      setQLoading(false);
    }
  }, [title, extract]);

  const current = questions?.[idx];
  const totalQ = questions?.length ?? 0;

  const checkAnswer = useCallback(() => {
    if (!current || !questions) return;
    const len = questions.length;
    const ok = readingAnswerNorm(input) === readingAnswerNorm(current.answer);
    if (ok) {
      setCorrectTotal((c) => c + 1);
      setJustCorrect(true);
      window.setTimeout(() => {
        setInput('');
        setMissOnce(false);
        setJustCorrect(false);
        setIdx((i) => {
          if (i >= len - 1) {
            setComplete(true);
            return i;
          }
          return i + 1;
        });
      }, 700);
    } else {
      if (!missOnce) {
        setMissOnce(true);
      } else {
        addMistake(current.verb, current.tense, 'okuma-quiz');
        setWrongVerbs((w) => [...w, current.verb]);
        window.setTimeout(() => {
          setInput('');
          setMissOnce(false);
          setJustCorrect(false);
          setIdx((i) => {
            if (i >= len - 1) {
              setComplete(true);
              return i;
            }
            return i + 1;
          });
        }, 600);
      }
    }
  }, [current, questions, input, missOnce]);

  if (complete && questions) {
    const u = [...new Set(wrongVerbs)];
    return (
      <div
        ref={sentinelRef}
        className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3"
      >
        {correctTotal === totalQ && totalQ > 0 ? (
          <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            {totalQ}/{totalQ} doğru — harika!
          </p>
        ) : (
          <p className="text-slate-800 dark:text-slate-200">
            <span className="font-semibold">
              {correctTotal}/{totalQ}
            </span>
            {u.length > 0
              ? ` — şu fiiller tekrar: ${u.join(', ')}`
              : ' — iyi gitti.'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={sentinelRef}
      className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4"
    >
      {endVisible && !started && !qLoading && (
        <button
          type="button"
          onClick={startQuiz}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm shadow"
        >
          Quiz Başlat
        </button>
      )}

      {qLoading && <p className="text-sm text-slate-500">Quiz hazırlanıyor…</p>}
      {qError && <p className="text-sm text-rose-600 dark:text-rose-400">{qError}</p>}

      {started && questions && current && !complete && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Soru {idx + 1} / {totalQ}
          </p>
          <p className="text-base text-slate-900 dark:text-slate-100 leading-relaxed">{current.sentence}</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') checkAnswer();
              }}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              placeholder="Cevabını yaz"
              disabled={justCorrect}
            />
            <button
              type="button"
              onClick={checkAnswer}
              disabled={justCorrect}
              className="px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-200 dark:text-slate-900 text-white text-sm font-medium disabled:opacity-50"
            >
              Kontrol
            </button>
          </div>
          {justCorrect && <p className="text-sm font-medium text-emerald-600">Doğru!</p>}
          {missOnce && !justCorrect && (
            <div className="space-y-1">
              <p className="text-sm text-rose-600">Yanlış — tekrar dene (son hak).</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">İpucu:</span> {current.hint}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Sayfa ───────────────────── */

export default function NewsReader() {
  const [phase, setPhase] = useState<Phase>('list');
  const [listItems, setListItems] = useState<NewsListItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [reader, setReader] = useState<ReaderArticle | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);

  const [conjMap, setConjMap] = useState<Map<string, VerbMatch> | null>(null);

  useEffect(() => {
    buildConjugationMap().then(setConjMap).catch(() => setConjMap(null));
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const items = await listRecentArticles(30);
      if (!items || items.length === 0) {
        throw new Error('Liste boş');
      }
      setListItems(items);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Bilinmeyen hata');
      setListItems(null);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openArticle = useCallback(async (item: NewsListItem) => {
    setPhase('reader');
    setReader(null);
    setReaderLoading(true);
    try {
      const art: NewsArticle = await fetchArticleExtract(item.title);
      if (!art.extract || art.extract.trim().length === 0) {
        throw new Error('İçerik yok');
      }
      setReader({
        title: art.title,
        extract: art.extract,
        sourceUrl: art.pageUrl,
        level: estimateLevel(art.extract),
        source: 'wikinews',
      });
    } catch {
      const fb = FALLBACK_ARTICLES[0];
      setReader({
        title: fb.title,
        extract: fb.extract,
        sourceUrl: fb.sourceUrl,
        level: fb.level,
        source: 'fallback',
        theme: fb.theme,
      });
    } finally {
      setReaderLoading(false);
    }
  }, []);

  const openFallback = useCallback((id: string) => {
    const fb = FALLBACK_ARTICLES.find((a) => a.id === id) ?? FALLBACK_ARTICLES[0];
    setPhase('reader');
    setReaderLoading(false);
    setReader({
      title: fb.title,
      extract: fb.extract,
      sourceUrl: fb.sourceUrl,
      level: fb.level,
      source: 'fallback',
      theme: fb.theme,
    });
  }, []);

  const backToList = useCallback(() => {
    setPhase('list');
    setReader(null);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100">
      <Helmet>
        <title>Okuma Modu — Diloloji</title>
      </Helmet>
      <Navbar />

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-6 pb-28">
        <AnimatePresence mode="wait">
          {phase === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ListView
                items={listItems}
                loading={listLoading}
                error={listError}
                onOpen={openArticle}
                onReload={loadList}
                onOpenFallbackById={openFallback}
              />
            </motion.div>
          ) : (
            <motion.div
              key="reader"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ReaderView
                article={reader}
                loading={readerLoading}
                onBack={backToList}
                conjMap={conjMap}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ───────────────────── Liste görünümü ───────────────────── */

function ListView({
  items,
  loading,
  error,
  onOpen,
  onReload,
  onOpenFallbackById,
}: {
  items: NewsListItem[] | null;
  loading: boolean;
  error: string | null;
  onOpen: (item: NewsListItem) => void;
  onReload: () => void;
  onOpenFallbackById: (id: string) => void;
}) {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');

  const filteredItems = useMemo(() => {
    if (!items) return null;
    if (levelFilter === 'all') return items;
    return items.filter((it) => it.level === levelFilter);
  }, [items, levelFilter]);

  const filteredFallbacks = useMemo(() => {
    if (levelFilter === 'all') return FALLBACK_ARTICLES;
    return FALLBACK_ARTICLES.filter((fb) => fb.level === levelFilter);
  }, [levelFilter]);

  const levelFilterBar = (
    <div className="level-filter flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
      {(
        [
          { k: 'all' as const, l: 'Tümü' },
          { k: 'A2' as const, l: 'A2' },
          { k: 'B1' as const, l: 'B1' },
          { k: 'B2' as const, l: 'B2' },
        ] as const
      ).map(({ k, l }) => (
        <button
          key={k}
          type="button"
          data-level={k}
          onClick={() => setLevelFilter(k)}
          className={
            'lvl-btn px-3 py-1.5 rounded-lg text-sm font-medium transition ' +
            (levelFilter === k
              ? 'active bg-amber-500/25 text-amber-900 dark:text-amber-100 border border-amber-500/40'
              : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50')
          }
        >
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <Home className="w-4 h-4" />
            Ana ekran
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Newspaper className="w-7 h-7 text-amber-500" />
          Okuma Modu
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Gerçek İspanyolca haber metinleri — Wikinews (proxy) üzerinden. Fiiller
          sarı vurgulanır; kelimeye tıklayınca analiz, metni bitirince mini quiz.
        </p>
      </header>

      {levelFilterBar}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Haberler şu an yüklenemedi.
              </p>
              <p className="text-amber-700/80 dark:text-amber-300/80">
                Yedek metinleri okuyarak devam edebilirsin.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onReload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-sm font-medium transition"
            >
              <RefreshCw className="w-4 h-4" />
              Tekrar dene
            </button>
          </div>
          <div className="pt-2 space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Yedek metinler
            </p>
            {filteredFallbacks.length === 0 && (
              <p className="text-sm text-slate-500">Bu seviyede yedek metin yok.</p>
            )}
            {filteredFallbacks.map((fb) => (
              <button
                key={fb.id}
                onClick={() => onOpenFallbackById(fb.id)}
                className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-3 transition group relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug pr-14">
                    {fb.title}
                  </span>
                  <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
                    <span
                      className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${LEVEL_BADGE[fb.level]}`}
                    >
                      {fb.level}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">yedek</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 capitalize">{fb.theme}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && items && filteredItems && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {levelFilter === 'all' ? `Son ${filteredItems.length} haber` : `${filteredItems.length} haber (filtre)`}
            </p>
            <button
              onClick={onReload}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Yenile
            </button>
          </div>
          {filteredItems.length === 0 && (
            <p className="text-sm text-slate-500">Bu seviyede haber yok; filtreyi veya sekmeyi değiştir.</p>
          )}
          <ul className="space-y-2">
            {filteredItems.map((it) => (
              <li key={it.title}>
                <button
                  onClick={() => onOpen(it)}
                  className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-3 transition group relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug pr-12 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {it.title}
                    </span>
                    <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${LEVEL_BADGE[it.level]}`}
                      >
                        {it.level}
                      </span>
                      <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  </div>
                  {it.timestamp && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
                      {new Date(it.timestamp).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Okuyucu görünümü ───────────────────── */

function ReaderView({
  article,
  loading,
  onBack,
  conjMap,
}: {
  article: ReaderArticle | null;
  loading: boolean;
  onBack: () => void;
  conjMap: Map<string, VerbMatch> | null;
}) {
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const paragraphs = useMemo(
    () => (article?.extract ? paragraphize(article.extract) : []),
    [article?.extract]
  );

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Haberlere Dön
        </button>
        {article && (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${LEVEL_BADGE[article.level]}`}
          >
            {article.level}
          </span>
        )}
      </header>

      {loading && (
        <div className="space-y-3">
          <div className="h-8 w-3/4 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          <div className="h-4 w-1/3 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          <div className="pt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-4 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {!loading && article && (
        <>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
              {article.title}
            </h1>
            {article.theme && (
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                Tema: {article.theme}
              </p>
            )}
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Kaynak: {article.source === 'wikinews' ? 'Wikinews' : 'Yedek metin'}
            </a>
          </div>

          <article
            className="prose prose-slate dark:prose-invert max-w-none"
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest('[data-word-span]')) {
                setActiveTip(null);
              }
            }}
          >
            <div
              className="space-y-5 text-slate-800 dark:text-slate-100"
              style={{ fontSize: '17px', lineHeight: 1.8 }}
            >
              {paragraphs.map((tokens, pi) => {
                const paraText = tokens.map((t) => t.value).join('');
                return (
                  <p key={pi} className="m-0">
                    {tokens.map((tok) =>
                      tok.isWord ? (
                        <WordSpan
                          key={tok.key}
                          value={tok.value}
                          tokenKey={tok.key}
                          activeTip={activeTip}
                          setActiveTip={setActiveTip}
                          conjMap={conjMap}
                          context={paraText}
                        />
                      ) : (
                        <span key={tok.key}>{tok.value}</span>
                      )
                    )}
                  </p>
                );
              })}
            </div>
          </article>

          <ReadingQuizSection title={article.title} extract={article.extract} />
        </>
      )}
    </div>
  );
}

/* ───────────────────── Kelime span'i + tooltip ───────────────────── */

function mapWordTipToAnalysis(t: WordTip): ReadingWordAnalysis {
  return {
    turkish: t.tr,
    is_verb: Boolean(t.isVerb),
    infinitive: t.infinitive ?? null,
    tense: (t.tenseLabel as string) ?? null,
    person: (t.person as string) ?? null,
    irregular: t.irregular ?? false,
  };
}

interface WordSpanProps {
  value: string;
  tokenKey: string;
  activeTip: string | null;
  setActiveTip: (k: string | null) => void;
  conjMap: Map<string, VerbMatch> | null;
  context?: string;
}

function WordSpan({
  value,
  tokenKey,
  activeTip,
  setActiveTip,
  conjMap,
  context,
}: WordSpanProps) {
  const isOpen = activeTip === tokenKey;

  const verbMatch: VerbMatch | undefined = useMemo(() => {
    if (!conjMap) return undefined;
    const n = normalizeWord(value);
    if (!n) return undefined;
    return conjMap.get(n);
  }, [conjMap, value]);

  const isVerb = Boolean(verbMatch);

  const [analysis, setAnalysis] = useState<ReadingWordAnalysis | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isOpen) {
        setActiveTip(null);
        return;
      }
      setActiveTip(tokenKey);
      setAnalysis(null);

      const clean = normalizeWord(value);
      if (!clean) return;

      void (async () => {
        setLoadingTip(true);
        try {
          if (hasAnthropicKey()) {
            const a = await analyzeWordForReading(clean);
            setAnalysis(a);
          } else {
            const t = await translateWordToTr(clean, context);
            if (t) {
              const tr =
                t.tr === '?' && t.isVerb && t.infinitive
                  ? getTurkishForInfinitive(t.infinitive) ?? t.tr
                  : t.tr;
              setAnalysis(mapWordTipToAnalysis({ ...t, tr }));
            } else {
              setAnalysis({
                turkish: '—',
                is_verb: false,
                infinitive: null,
                tense: null,
                person: null,
                irregular: false,
              });
            }
          }
        } catch {
          const t = await translateWordToTr(clean, context);
          if (t) {
            const tr =
              t.tr === '?' && t.isVerb && t.infinitive
                ? getTurkishForInfinitive(t.infinitive) ?? t.tr
                : t.tr;
            setAnalysis(mapWordTipToAnalysis({ ...t, tr }));
          } else {
            setAnalysis({
              turkish: '—',
              is_verb: false,
              infinitive: null,
              tense: null,
              person: null,
              irregular: false,
            });
          }
        } finally {
          setLoadingTip(false);
        }
      })();
    },
    [isOpen, setActiveTip, tokenKey, value, context]
  );

  return (
    <span className="relative inline-block">
      <span
        data-word-span
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as unknown as React.MouseEvent);
          }
        }}
        className={
          'cursor-pointer rounded-sm px-[1px] transition-colors ' +
          (isVerb
            ? 'bg-amber-300/40 hover:bg-amber-300/70 dark:bg-amber-400/20 dark:hover:bg-amber-400/40 text-amber-900 dark:text-amber-100'
            : 'hover:bg-sky-200/60 dark:hover:bg-sky-400/25') +
          (isOpen
            ? isVerb
              ? ' ring-1 ring-amber-500'
              : ' bg-sky-200/60 dark:bg-sky-400/25 ring-1 ring-sky-400'
            : '')
        }
      >
        {value}
      </span>

      {isOpen && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1 z-20 block w-max max-w-[260px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg text-left"
          style={{ fontSize: '13px', lineHeight: 1.5 }}
        >
          <span className="block font-semibold text-slate-900 dark:text-slate-100">
            {value}
          </span>
          {loadingTip && (
            <span className="block mt-1 text-slate-500 dark:text-slate-400">Analiz ediliyor…</span>
          )}
          {!loadingTip && analysis && (
            <>
              {!analysis.is_verb && (
                <span
                  className={
                    'block mt-0.5 ' +
                    (analysis.turkish === '?'
                      ? 'text-slate-400 dark:text-slate-500 italic'
                      : 'text-slate-700 dark:text-slate-200')
                  }
                >
                  {analysis.turkish === '?' ? 'anlam belirsiz' : analysis.turkish}
                </span>
              )}
              {analysis.is_verb && (
                <>
                  {analysis.infinitive && (
                    <span className="block mt-1 font-bold text-amber-800 dark:text-amber-200">
                      {analysis.infinitive}
                    </span>
                  )}
                  <span
                    className={
                      'block ' +
                      (analysis.turkish === '?'
                        ? 'mt-1 text-slate-400 dark:text-slate-500 italic'
                        : 'mt-0.5 text-slate-700 dark:text-slate-200')
                    }
                  >
                    {analysis.turkish === '?' ? 'anlam belirsiz' : analysis.turkish}
                  </span>
                  <span className="block mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {[analysis.tense, analysis.person].filter(Boolean).join(' · ')}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {analysis.irregular ? 'düzensiz' : 'düzenli'}
                  </span>
                </>
              )}
            </>
          )}
        </span>
      )}
    </span>
  );
}
