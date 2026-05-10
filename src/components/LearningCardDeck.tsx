import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppLanguage } from '../data/verbs';
import {
  recordMasteryCorrect,
  recordMasteryWrong,
} from '../data/masterySystem';
import { getVerbExample } from '../data/verbExamples';

type StaticExample = {
  es?: string;
  fr?: string;
  tr?: string;
  person?: string;
} | null;

const QUIZ_EXAMPLE_PRONOUN_TOKENS: Record<string, string[]> = {
  yo: ['yo'],
  tu: ['tu', 'tú'],
  el: ['el', 'él', 'ella', 'usted'],
  nosotros: ['nosotros', 'nosotras'],
  vosotros: ['vosotros', 'vosotras'],
  ellos: ['ellos', 'ellas', 'ustedes'],
};

const QUIZ_EXAMPLE_PRONOUN_TOKENS_FR: Record<string, string[]> = {
  je: ['je'],
  tu: ['tu'],
  il: ['il', 'elle', 'il/elle'],
  nous: ['nous'],
  vous: ['vous'],
  ils: ['ils', 'elles', 'ils/elles'],
};

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function examplePersonMatches(
  examplePerson: string | undefined,
  pronounId: string,
  lang: AppLanguage
): boolean {
  if (!examplePerson?.trim()) return true;
  const segments = examplePerson
    .split(/\s*\/\s*|\s*,\s*|\s+(?:et|y)\s+/i)
    .map(norm)
    .filter(Boolean);
  const table = lang === 'fr' ? QUIZ_EXAMPLE_PRONOUN_TOKENS_FR : QUIZ_EXAMPLE_PRONOUN_TOKENS;
  const allowed = (table[pronounId] ?? []).map(norm);
  if (allowed.length === 0) return false;
  return segments.some((seg) => allowed.some((a) => seg === a));
}

/** Kısa Türkçe özne ipucu — arka yüz alt satırı */
const PERSON_HINT_TR: Record<string, string> = {
  yo: 'ben',
  tu: 'sen',
  tú: 'sen',
  el: 'o',
  él: 'o',
  nosotros: 'biz',
  vosotros: 'siz',
  ellos: 'onlar',
  je: 'ben',
  il: 'o',
  nous: 'biz',
  vous: 'siz',
  ils: 'onlar',
};

const COMPLETION_BONUS_XP = 15;

export type LearningCardDeckProps = {
  verbKey: string;
  tenseLabel: string;
  tenseId: string;
  pronouns: { id: string; label: string }[];
  conjugations: Record<string, string>;
  lang: AppLanguage;
  verbMeaningTr: string;
  staticExample: StaticExample;
  addXP: (amount: number) => number;
  onGoQuiz: () => void;
  onFinishSession?: () => void;
};

export default function LearningCardDeck({
  verbKey,
  tenseLabel,
  tenseId,
  pronouns,
  conjugations,
  lang,
  verbMeaningTr,
  staticExample,
  addXP,
  onGoQuiz,
  onFinishSession,
}: LearningCardDeckProps) {
  const cards = useMemo(() => {
    const out: { id: string; label: string; form: string }[] = [];
    for (const { id, label } of pronouns) {
      const raw = conjugations[id]?.trim() ?? '';
      if (!raw || raw === '—') continue;
      out.push({ id, label, form: raw });
    }
    return out;
  }, [pronouns, conjugations]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [totalSessionXp, setTotalSessionXp] = useState(0);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const busyRef = useRef(false);

  const total = cards.length;
  const current = cards[index];

  const resetDeck = useCallback(() => {
    setIndex(0);
    setFlipped(false);
    setPhase('playing');
    setKnown(0);
    setUnknown(0);
    setTotalSessionXp(0);
    busyRef.current = false;
  }, []);

  const advance = useCallback(
    (direction: 'known' | 'unknown') => {
      if (!current || phase !== 'playing' || busyRef.current) return;
      busyRef.current = true;

      if (direction === 'known') {
        setKnown((k) => k + 1);
        let xpAdd = 0;
        if (lang === 'es' || lang === 'fr') {
          const r = recordMasteryCorrect(lang, verbKey, tenseId, current.id);
          xpAdd += r.xpGained;
        }
        if (xpAdd > 0) {
          addXP(xpAdd);
          setTotalSessionXp((x) => x + xpAdd);
        }
      } else {
        setUnknown((u) => u + 1);
        if (lang === 'es' || lang === 'fr') {
          recordMasteryWrong(lang, verbKey, tenseId, current.id);
        }
      }

      setFlipped(false);

      window.setTimeout(() => {
        setIndex((i) => {
          const next = i + 1;
          if (next >= cards.length) {
            setPhase('done');
            addXP(COMPLETION_BONUS_XP);
            setTotalSessionXp((x) => x + COMPLETION_BONUS_XP);
            onFinishSession?.();
            return i;
          }
          return next;
        });
        busyRef.current = false;
      }, 200);
    },
    [current, phase, lang, verbKey, tenseId, addXP, cards.length, onFinishSession]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing' || !current) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        advance('known');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        advance('unknown');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, current, advance]);

  const cardExample = useMemo(() => {
    if (!staticExample?.tr) return null;
    const line =
      lang === 'fr' ? staticExample.fr?.trim() : staticExample.es?.trim();
    if (!line) return null;
    if (!examplePersonMatches(staticExample.person, current?.id ?? '', lang)) return null;
    return { sentence: line, tr: staticExample.tr };
  }, [staticExample, lang, current?.id]);

  const fallbackExample = useMemo(() => {
    if (cardExample) return null;
    if (lang !== 'es' && lang !== 'fr') return null;
    return getVerbExample(lang, verbKey);
  }, [cardExample, lang, verbKey]);

  const turkishHint = useMemo(() => {
    if (!current) return '';
    const p =
      PERSON_HINT_TR[current.id] ??
      PERSON_HINT_TR[current.label.trim().toLowerCase()] ??
      current.label;
    const meaning = verbMeaningTr.trim() || verbKey;
    return `${meaning} — ${p}`;
  }, [current, verbMeaningTr, verbKey]);

  const pointerDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const pointerUp = (e: React.PointerEvent) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start || phase !== 'playing') return;
    const dx = e.clientX - start.x;
    const dy = Math.abs(e.clientY - start.y);
    if (Math.abs(dx) < 56 || dy > 90) return;
    if (dx > 0) advance('known');
    else advance('unknown');
  };

  const toggleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busyRef.current) return;
    setFlipped((f) => !f);
  };

  if (total === 0) {
    return (
      <div className="mx-4 sm:mx-0 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-6 text-center text-sm text-amber-900 dark:text-amber-100">
        Bu zaman için gösterilecek çekim yok.
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="mx-4 sm:mx-0 max-w-lg mx-auto rounded-2xl border border-violet-300/60 dark:border-violet-500/40 bg-gradient-to-b from-violet-50/90 to-white dark:from-violet-950/40 dark:to-slate-900/80 px-6 py-10 text-center shadow-lg shadow-violet-500/10">
        <p className="text-3xl mb-2" aria-hidden>
          🎉
        </p>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          {total}/{total} çekim tamamlandı!
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
          Bildim: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{known}</span>
          {' · '}
          Bilmedim: <span className="font-semibold text-rose-600 dark:text-rose-400">{unknown}</span>
        </p>
        <p className="text-lg font-semibold text-violet-600 dark:text-violet-300 mb-8">
          +{totalSessionXp} XP kazanıldı
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={resetDeck}
            className="rounded-xl border-2 border-violet-500/60 dark:border-violet-400/50 px-5 py-3 font-semibold text-violet-700 dark:text-violet-200 hover:bg-violet-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            Tekrar
          </button>
          <button
            type="button"
            onClick={onGoQuiz}
            className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-5 py-3 font-semibold shadow-md shadow-violet-500/25 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            Alıştırmaya Geç
          </button>
        </div>
      </div>
    );
  }

  const pct = total ? Math.round((index / total) * 100) : 0;

  return (
    <div className="mx-4 sm:mx-0 max-w-lg mx-auto pb-8">
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
            {Math.min(index + 1, total)} / {total} çekim
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="text-emerald-600 dark:text-emerald-400">✓ {known}</span>
            {' · '}
            <span className="text-rose-600 dark:text-rose-400">✗ {unknown}</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
          Sağa kaydır / → Bildim · Sola kaydır / ← Bilmedim · Karta tıkla çevir
        </p>
      </div>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={`${current.id}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="relative [perspective:1200px]"
            onPointerDown={pointerDown}
            onPointerUp={pointerUp}
            onPointerCancel={() => {
              dragStart.current = null;
            }}
            style={{ touchAction: 'pan-y' }}
          >
            <button
              type="button"
              onClick={toggleFlip}
              className="w-full text-left focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded-2xl"
              aria-label={flipped ? 'Ön yüze dön' : 'Arka yüzü göster'}
            >
              <motion.div
                className="relative w-full min-h-[280px]"
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-violet-400/50 dark:border-violet-500/40 bg-white dark:bg-slate-800/90 shadow-xl shadow-violet-500/10 px-6 py-8"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(0deg)',
                  }}
                >
                  <p className="text-sm font-medium text-violet-600 dark:text-violet-300 capitalize mb-1">{verbKey}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{tenseLabel}</p>
                  <p className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800 dark:text-white text-center">
                    {current.label}
                  </p>
                </div>
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-violet-400/50 dark:border-violet-500/40 bg-violet-50/95 dark:bg-slate-900/95 shadow-xl px-6 py-8"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <p className="text-3xl sm:text-4xl font-bold text-center text-violet-800 dark:text-violet-100 mb-3 break-words max-w-full">
                    {current.form}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 text-center px-1">
                    Türkçe: <span className="font-medium">{turkishHint}</span>
                  </p>
                  {(cardExample || fallbackExample) && (
                    <div className="mt-auto pt-4 border-t border-violet-200/80 dark:border-violet-500/30 w-full text-center">
                      <p className="text-sm italic text-slate-700 dark:text-slate-200 px-1">
                        {cardExample?.sentence ?? fallbackExample?.sentence}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {cardExample?.tr ?? fallbackExample?.translation}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => advance('unknown')}
          className="rounded-xl border-2 border-rose-400/60 px-4 py-2.5 text-sm font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        >
          Bilmedim ✗
        </button>
        <button
          type="button"
          onClick={() => advance('known')}
          className="rounded-xl border-2 border-emerald-500/60 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        >
          Bildim ✓
        </button>
      </div>
    </div>
  );
}
