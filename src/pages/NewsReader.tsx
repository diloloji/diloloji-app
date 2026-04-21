/**
 * Okuma Modu (Haberler) — Wikinews (es) makalelerini okuma deneyimi.
 *
 * Akış:
 *  1. Liste — son 20 haberin başlıklarını gösterir. API hata verirse
 *     `FALLBACK_ARTICLES` listesi gösterilir.
 *  2. Okuyucu — makale metnini kelime kelime tokenize eder.
 *     - Bilinen fiiller (çekimli halleriyle birlikte): sarı vurgu, tooltip'te
 *       mastar + Türkçe anlam + (varsa) zaman bilgisi.
 *     - Tıklanan herhangi bir kelime: Anthropic/Groq çevirisi, tooltip'te
 *       Türkçe anlam.
 *
 * Tooltip parent'a göre absolute konumludur (position:fixed değil).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
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

/* ───────────────────── Yardımcılar ───────────────────── */

type Phase = 'list' | 'reader';

interface ReaderArticle {
  title: string;
  extract: string;
  sourceUrl: string;
  level: ReadingLevel;
  /** Fallback mi, Wikinews mi (sadece bilgi amaçlı). */
  source: 'wikinews' | 'fallback';
}

const LEVEL_BADGE: Record<ReadingLevel, string> = {
  A2: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  B1: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  B2: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
};

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
        level: estimateLevel(fb.extract),
        source: 'fallback',
      });
    } finally {
      setReaderLoading(false);
    }
  }, []);

  const openFallback = useCallback((idx: number) => {
    const fb = FALLBACK_ARTICLES[idx] ?? FALLBACK_ARTICLES[0];
    setPhase('reader');
    setReaderLoading(false);
    setReader({
      title: fb.title,
      extract: fb.extract,
      sourceUrl: fb.sourceUrl,
      level: estimateLevel(fb.extract),
      source: 'fallback',
    });
  }, []);

  const backToList = useCallback(() => {
    setPhase('list');
    setReader(null);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100">
      <Helmet>
        <title>Okuma Modu — Conjume</title>
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
                onOpenFallback={openFallback}
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
  onOpenFallback,
}: {
  items: NewsListItem[] | null;
  loading: boolean;
  error: string | null;
  onOpen: (item: NewsListItem) => void;
  onReload: () => void;
  onOpenFallback: (idx: number) => void;
}) {
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
          Gerçek İspanyolca haber metinleri — Wikinews'ten. Fiiller sarı
          vurgulanır; diğer kelimelere tıklayarak Türkçe çevirisini alırsın.
        </p>
      </header>

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
            {FALLBACK_ARTICLES.map((fb, idx) => (
              <button
                key={fb.id}
                onClick={() => onOpenFallback(idx)}
                className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-3 transition group"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                    {fb.title}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-slate-400">
                    yedek
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && items && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Son {items.length} haber
            </p>
            <button
              onClick={onReload}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Yenile
            </button>
          </div>
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.title}>
                <button
                  onClick={() => onOpen(it)}
                  className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-3 transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {it.title}
                    </span>
                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
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
        </>
      )}
    </div>
  );
}

/* ───────────────────── Kelime span'i + tooltip ───────────────────── */

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

  const [tip, setTip] = useState<WordTip | null>(() => {
    if (verbMatch) {
      return {
        tr: verbMatch.tr,
        isVerb: true,
        infinitive: verbMatch.infinitive,
        tenseLabel: verbMatch.tenseLabel,
        person: verbMatch.pronounLabel,
      };
    }
    return null;
  });
  const [loadingTip, setLoadingTip] = useState(false);

  useEffect(() => {
    if (verbMatch) {
      setTip({
        tr: verbMatch.tr,
        isVerb: true,
        infinitive: verbMatch.infinitive,
        tenseLabel: verbMatch.tenseLabel,
        person: verbMatch.pronounLabel,
      });
    }
  }, [verbMatch]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isOpen) {
        setActiveTip(null);
        return;
      }
      setActiveTip(tokenKey);
      if (!verbMatch && !tip) {
        const clean = normalizeWord(value);
        if (!clean) return;
        setLoadingTip(true);
        translateWordToTr(clean, context)
          .then((res) => {
            if (res) {
              const inf = res.infinitive?.toLowerCase();
              const trFromDict = inf ? getTurkishForInfinitive(inf) : undefined;
              // LLM "?" döndürdüyse curated sözlüğe düş.
              const tr = res.tr === '?' && trFromDict ? trFromDict : res.tr;
              setTip({ ...res, tr });
            } else {
              setTip({ tr: '(çeviri alınamadı)' });
            }
          })
          .catch(() => setTip({ tr: '(çeviri alınamadı)' }))
          .finally(() => setLoadingTip(false));
      }
    },
    [isOpen, setActiveTip, tokenKey, verbMatch, tip, value, context]
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
          {loadingTip && !tip && (
            <span className="block mt-0.5 text-slate-500 dark:text-slate-400 italic">…</span>
          )}
          {tip && (
            <>
              <span
                className={
                  'block mt-0.5 ' +
                  (tip.tr === '?'
                    ? 'text-slate-400 dark:text-slate-500 italic'
                    : 'text-slate-700 dark:text-slate-200')
                }
              >
                {tip.tr === '?' ? 'anlam belirsiz' : tip.tr}
              </span>
              {tip.isVerb && tip.infinitive && (
                <span className="block mt-1 text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  mastar: {tip.infinitive}
                  {tip.irregular ? ' · düzensiz' : ''}
                </span>
              )}
              {tip.isVerb && (tip.tenseLabel || tip.person) && (
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {[tip.tenseLabel, tip.person].filter(Boolean).join(' · ')}
                </span>
              )}
            </>
          )}
        </span>
      )}
    </span>
  );
}
