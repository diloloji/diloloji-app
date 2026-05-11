import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { AppLanguage } from '../data/verbs';
import {
  recordMasteryCorrect,
  recordMasteryWrong,
} from '../data/masterySystem';
import { getVerbExample } from '../data/verbExamples';
import { speak, ttsSupported } from '../utils/speech';

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

function displayVerbTitle(verbKey: string): string {
  const v = verbKey.trim();
  if (!v) return '';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

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
  const completionConfettiFired = useRef(false);

  const total = cards.length;
  const current = cards[index];

  const ttsLang = lang === 'fr' ? 'fr-FR' : 'es-ES';

  const speakForm = useCallback(() => {
    if (!current?.form?.trim()) return;
    speak(current.form, { lang: ttsLang });
  }, [current, ttsLang]);

  const resetDeck = useCallback(() => {
    setIndex(0);
    setFlipped(false);
    setPhase('playing');
    setKnown(0);
    setUnknown(0);
    setTotalSessionXp(0);
    busyRef.current = false;
    completionConfettiFired.current = false;
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
    if (phase !== 'done') {
      completionConfettiFired.current = false;
      return;
    }
    if (completionConfettiFired.current) return;
    completionConfettiFired.current = true;

    const duration = 2600;
    const end = Date.now() + duration;
    const colors = ['#10b981', '#a855f7', '#f59e0b', '#ec4899', '#38bdf8'];
    const frame = () => {
      void confetti({
        particleCount: 4,
        angle: 60,
        spread: 56,
        origin: { x: 0, y: 0.65 },
        colors,
      });
      void confetti({
        particleCount: 4,
        angle: 120,
        spread: 56,
        origin: { x: 1, y: 0.65 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing' || !current) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!busyRef.current) setFlipped((f) => !f);
        return;
      }
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

  const meaningQuoted = useMemo(() => {
    const m = verbMeaningTr.trim() || verbKey;
    return `"${m}"`;
  }, [verbMeaningTr, verbKey]);

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
    if (busyRef.current) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-card-no-flip="true"]')) return;
    setFlipped((f) => !f);
  };

  const toggleFlipKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
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
      <div className="mx-4 sm:mx-0 max-w-lg mx-auto rounded-2xl border border-emerald-300/50 dark:border-emerald-500/35 bg-gradient-to-b from-emerald-50/95 via-white to-violet-50/80 dark:from-emerald-950/50 dark:via-slate-900/90 dark:to-violet-950/40 px-6 py-10 text-center shadow-xl shadow-emerald-500/10">
        <motion.p
          className="text-6xl mb-3 select-none"
          aria-hidden
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          🎉
        </motion.p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
          {total}/{total} tamamlandı!
        </h3>
        <p className="text-base text-slate-700 dark:text-slate-300 mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>
            Bildim:{' '}
            <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{known}</span>
          </span>
          <span className="text-slate-400">·</span>
          <span>
            Bilmedim:{' '}
            <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">{unknown}</span>
          </span>
        </p>
        <motion.p
          className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 mb-10"
          initial={{ opacity: 0, y: 16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        >
          +{totalSessionXp} XP
        </motion.p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            type="button"
            onClick={resetDeck}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl border-2 border-violet-500/60 dark:border-violet-400/50 px-6 py-3 min-h-[52px] font-semibold text-violet-700 dark:text-violet-200 hover:bg-violet-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            🔄 Tekrar
          </motion.button>
          <motion.button
            type="button"
            onClick={onGoQuiz}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 min-h-[52px] font-semibold shadow-lg shadow-violet-500/25 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            ✏️ Alıştırmaya Geç
          </motion.button>
        </div>
      </div>
    );
  }

  const pct = total ? Math.round((index / total) * 100) : 0;
  const verbTitle = displayVerbTitle(verbKey);

  return (
    <div className="mx-4 sm:mx-0 flex min-h-[400px] w-full flex-col items-center justify-center pb-8">
      <div className="mb-5 w-full max-w-[500px] space-y-3 text-center">
        <div className="h-1 rounded-full bg-slate-200/90 dark:bg-slate-700/90 overflow-hidden shadow-inner">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="text-xl sm:text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100 tracking-tight">
          {Math.min(index + 1, total)} / {total}{' '}
          <span className="text-base sm:text-lg font-semibold text-slate-500 dark:text-slate-400">
            çekim
          </span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-base font-bold tabular-nums">
          <span className="text-emerald-600 dark:text-emerald-400 drop-shadow-sm">✓ {known}</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-rose-600 dark:text-rose-400 drop-shadow-sm">✗ {unknown}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <kbd className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            ← Bilmedim
          </kbd>
          <kbd className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            Boşluk: Çevir
          </kbd>
          <kbd className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            Bildim →
          </kbd>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={`${current.id}-${index}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative mx-auto w-full max-w-[500px]"
            style={{ perspective: '1000px', touchAction: 'pan-y' }}
            onPointerDown={pointerDown}
            onPointerUp={pointerUp}
            onPointerCancel={() => {
              dragStart.current = null;
            }}
          >
            <motion.div
              className="relative w-full min-h-[320px] cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
              role="button"
              tabIndex={0}
              aria-label={flipped ? 'Ön yüze dön' : 'Arka yüzü göster'}
              aria-pressed={flipped}
              onClick={toggleFlip}
              onKeyDown={toggleFlipKey}
            >
              {/* Ön yüz */}
              <div
                className="absolute inset-0 flex flex-col rounded-2xl border-2 border-violet-400/45 dark:border-violet-500/35 bg-gradient-to-b from-white to-violet-50/40 dark:from-slate-800 dark:to-violet-950/30 px-6 py-7 shadow-xl shadow-violet-500/15"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                }}
              >
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-violet-600/90 dark:text-violet-300/90">
                  {verbTitle} · {tenseLabel}
                </p>
                <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-4">
                  <p className="text-center text-5xl sm:text-6xl font-black uppercase tracking-tight text-violet-600 dark:text-violet-300 drop-shadow-sm">
                    {current.label}
                  </p>
                  <p className="mt-4 text-center text-base text-slate-400 dark:text-slate-500 italic">
                    {meaningQuoted}
                  </p>
                </div>
                <p className="text-center text-xs font-medium text-slate-400 dark:text-slate-500">
                  Kartı Çevir <span aria-hidden>👆</span>
                </p>
              </div>

              {/* Arka yüz */}
              <div
                className="absolute inset-0 flex flex-col rounded-2xl border-2 border-emerald-500/35 dark:border-emerald-500/30 bg-gradient-to-b from-emerald-50/90 via-white to-slate-50/95 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 px-6 py-7 shadow-xl shadow-emerald-500/10"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {verbTitle} · {tenseLabel} ·{' '}
                  <span className="text-violet-600 dark:text-violet-300">{current.label}</span>
                </p>
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-1">
                  <p className="text-center text-4xl sm:text-5xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 break-words max-w-full">
                    {current.form}
                  </p>
                  <button
                    type="button"
                    data-card-no-flip="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakForm();
                    }}
                    disabled={!ttsSupported}
                    title={!ttsSupported ? 'Tarayıcı seslendirmeyi desteklemiyor' : undefined}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <span aria-hidden>🔊</span> Seslendir
                  </button>
                </div>
                {(cardExample || fallbackExample) && (
                  <div className="mt-auto border-t border-emerald-200/70 dark:border-emerald-500/25 pt-4 text-center space-y-1.5">
                    <p className="text-sm italic leading-snug text-slate-700 dark:text-slate-200 px-1">
                      <span aria-hidden className="mr-1">
                        📖
                      </span>
                      {cardExample?.sentence ?? fallbackExample?.sentence}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug px-1">
                      {cardExample?.tr ?? fallbackExample?.translation}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto mt-6 flex w-full max-w-[500px] justify-center gap-4">
        <motion.button
          type="button"
          onClick={() => advance('unknown')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="min-h-[52px] min-w-[140px] rounded-2xl border-2 border-rose-500/70 bg-rose-500/10 px-6 py-3 text-base font-bold text-rose-800 shadow-sm shadow-rose-500/10 transition-colors hover:bg-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500/45 dark:bg-rose-950/40 dark:text-rose-200"
        >
          Bilmedim ✗
        </motion.button>
        <motion.button
          type="button"
          onClick={() => advance('known')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="min-h-[52px] min-w-[140px] rounded-2xl border-2 border-emerald-500/70 bg-emerald-500/10 px-6 py-3 text-base font-bold text-emerald-800 shadow-sm shadow-emerald-500/10 transition-colors hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/45 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          Bildim ✓
        </motion.button>
      </div>
    </div>
  );
}
