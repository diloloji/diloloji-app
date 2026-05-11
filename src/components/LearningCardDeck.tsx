import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Maximize2, X } from 'lucide-react';
import type { AppLanguage } from '../data/verbs';
import {
  recordMasteryCorrect,
  recordMasteryWrong,
} from '../data/masterySystem';
import { exampleSentences } from '../data/example_sentences';
import { exampleSentencesFr } from '../data/example_sentences_fr.js';
import { speak, ttsSupported } from '../utils/speech';

type LexExampleRow = { es?: string; fr?: string; tr?: string } | null | undefined;

function displayVerbTitle(verbKey: string): string {
  const v = verbKey.trim();
  if (!v) return '';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Örnek cümlede çekimin ilk geçişini mor kalın gösterir */
function SentenceWithVerbHighlight({
  sentence,
  verbForm,
  className,
}: {
  sentence: string;
  verbForm: string;
  className?: string;
}) {
  const vf = verbForm.trim();
  if (!vf) return <span className={className}>{sentence}</span>;
  const re = new RegExp(escapeRegExp(vf), 'i');
  const m = sentence.match(re);
  if (!m || m.index === undefined) return <span className={className}>{sentence}</span>;
  const i = m.index;
  const len = m[0].length;
  return (
    <span className={className}>
      {sentence.slice(0, i)}
      <strong className="font-bold text-violet-400">{sentence.slice(i, i + len)}</strong>
      {sentence.slice(i + len)}
    </span>
  );
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
  const [exampleModalOpen, setExampleModalOpen] = useState(false);

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
    setExampleModalOpen(false);
  }, [index, phase, verbKey, tenseLabel]);

  useEffect(() => {
    if (!exampleModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setExampleModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exampleModalOpen]);

  useEffect(() => {
    if (!exampleModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [exampleModalOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (exampleModalOpen) return;
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
  }, [phase, current, advance, exampleModalOpen]);

  /** Örnek cümle: example_sentences[fiil][zaman etiketi] — pronoun filtresi yok */
  const lexExample = useMemo(() => {
    const key = verbKey.trim();
    if (!key) return null;
    if (lang === 'es') {
      const map = exampleSentences as Record<string, Record<string, LexExampleRow>>;
      const row = map[key]?.[tenseLabel];
      const es = row?.es?.trim();
      if (!es) return null;
      return { sentence: es, tr: row?.tr?.trim() ?? '' };
    }
    if (lang === 'fr') {
      const map = exampleSentencesFr as Record<string, Record<string, LexExampleRow>>;
      const row = map[key]?.[tenseLabel];
      const fr = row?.fr?.trim();
      if (!fr) return null;
      return { sentence: fr, tr: row?.tr?.trim() ?? '' };
    }
    return null;
  }, [verbKey, tenseLabel, lang]);

  const speakExampleSentence = useCallback(() => {
    if (!lexExample?.sentence?.trim()) return;
    speak(lexExample.sentence, { lang: ttsLang });
  }, [lexExample, ttsLang]);

  const meaningPlain = useMemo(() => verbMeaningTr.trim() || verbKey, [verbMeaningTr, verbKey]);

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
        <p className="text-[11px] text-slate-500 dark:text-slate-400 tracking-tight">
          Boşluk: çevir · → Bildim · ← Bilmedim
        </p>
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
            <div
              className="relative min-h-[320px] w-full cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 [transform-style:preserve-3d]"
              style={{
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.5s ease',
              }}
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
                <p className="text-center text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {verbTitle} · {tenseLabel}
                </p>
                <p className="mt-2 text-center text-base font-semibold text-violet-600 dark:text-violet-300">
                  {meaningPlain}
                </p>
                <div className="flex flex-1 flex-col items-center justify-center px-2 py-2">
                  <p className="text-center text-5xl sm:text-6xl font-black uppercase tracking-tight text-violet-700 dark:text-violet-200 drop-shadow-sm">
                    {current.label}
                  </p>
                </div>
                <p className="text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  <span aria-hidden className="mr-1">
                    👆
                  </span>
                  Cevabı görmek için tıkla
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
                <p className="text-center text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {verbTitle} · {tenseLabel} ·{' '}
                  <span className="text-violet-600 dark:text-violet-300">{current.label}</span>
                </p>
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-1 pt-2">
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
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <span aria-hidden>🔊</span> Seslendir
                  </button>
                </div>
                {lexExample && (
                  <div className="group/ex relative mt-auto border-t border-emerald-200/70 dark:border-emerald-500/25 pt-4 text-center">
                    <button
                      type="button"
                      data-card-no-flip="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExampleModalOpen(true);
                      }}
                      className="absolute right-0 top-3 z-10 rounded-md p-1.5 text-slate-500 opacity-0 transition-opacity hover:bg-slate-200/80 hover:text-violet-600 group-hover/ex:opacity-100 dark:text-slate-400 dark:hover:bg-slate-700/80 dark:hover:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      aria-label="Örnek cümleyi büyüt"
                    >
                      <Maximize2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <div className="space-y-1.5 pr-7">
                      <p className="text-sm italic leading-snug text-slate-700 dark:text-slate-200 px-1">
                        <span aria-hidden className="mr-1">
                          📖
                        </span>
                        {lexExample.sentence}
                      </p>
                      {lexExample.tr ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug px-1">{lexExample.tr}</p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
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

      {exampleModalOpen && lexExample && current && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="learning-card-example-modal-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[8px]"
            aria-label="Kapat"
            onClick={() => setExampleModalOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-[600px] rounded-2xl bg-slate-900 px-8 py-8 text-slate-100 shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <h2 id="learning-card-example-modal-title" className="text-lg font-semibold tracking-tight">
                <span aria-hidden className="mr-2">
                  📖
                </span>
                Örnek Cümle
              </h2>
              <button
                type="button"
                onClick={() => setExampleModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-6">
              <p className="text-xl sm:text-2xl font-medium leading-relaxed text-slate-100">
                <SentenceWithVerbHighlight sentence={lexExample.sentence} verbForm={current.form} />
              </p>
              {lexExample.tr ? (
                <p className="text-base leading-relaxed text-slate-400">{lexExample.tr}</p>
              ) : null}
              <button
                type="button"
                onClick={() => speakExampleSentence()}
                disabled={!ttsSupported}
                title={!ttsSupported ? 'Tarayıcı seslendirmeyi desteklemiyor' : undefined}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-5 py-3 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <span aria-hidden>🔊</span> Seslendir
              </button>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {verbTitle} · {tenseLabel}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
