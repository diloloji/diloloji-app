/**
 * Günlük Akış — 60 sn Cloze Sprint bölümü (satır içi oynatıcı).
 *
 * /cloze-sprint sayfasının oyun tarafını özetler: seviye filtresi olmadan tüm
 *  havuzdan rastgele 20 cümle, 60 sn geri sayım, +10 / -3 puan, yanlışta -3 sn.
 *  Seans bittiğinde veya tüm sorular bitince `onComplete({correct,wrong,score,tenseMistakes})`.
 *  Kullanıcı "Atla" derse onay sonrası `onComplete` erken tetiklenir.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, SkipForward, Timer, Trophy, X } from 'lucide-react';
import {
  CLOZE_ENTRIES,
  isClozeAnswerCorrect,
  shuffleEntries,
  type ClozeEntry,
  type ClozeTenseLabel,
} from '../../data/clozeData';
import { addActivityToday } from '../../utils/activityHistory';
import { updateDocumentTitle } from '../../utils/dailyGoal';
import { addMistake } from '../../utils/mistakeBank';
import { speakAuto, matchTranscript, type ListenResult } from '../../utils/speech';
import MicButton from '../speech/MicButton';

/* ───────── Sabitler ───────── */

const INITIAL_TIME_MS = 60_000;
const SESSION_SIZE = 20;
const TICK_MS = 100;
const CORRECT_SCORE = 10;
const WRONG_SCORE_PENALTY = 3;
const WRONG_TIME_PENALTY_MS = 3_000;
const WRONG_FLASH_MS = 800;

const SPECIAL_CHARS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü'] as const;

/* ───────── Sonuç tipi ───────── */

export interface ClozeStepResult {
  score: number;
  correct: number;
  wrong: number;
  tenseMistakes: Partial<Record<ClozeTenseLabel, number>>;
}

interface Props {
  onComplete: (result: ClozeStepResult) => void;
  /** Kullanıcı "Akışı bitir" derse anında bitir. */
  onSkipSession: () => void;
}

type Feedback = 'idle' | 'correct' | 'wrong';

/* ───────── Ana bileşen ───────── */

export default function ClozeFlowPlayer({ onComplete, onSkipSession }: Props) {
  const [queue, setQueue] = useState<ClozeEntry[]>(() =>
    shuffleEntries(CLOZE_ENTRIES).slice(0, Math.min(SESSION_SIZE, CLOZE_ENTRIES.length))
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [wrongInfo, setWrongInfo] = useState<{ expected: string; given: string; hint: string } | null>(null);
  const [remainingMs, setRemainingMs] = useState(INITIAL_TIME_MS);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const tenseMistakesRef = useRef<Partial<Record<ClozeTenseLabel, number>>>({});

  const [, setTick] = useState(0); // skor / sayaç güncellemesi için lightweight trigger

  const inputRef = useRef<HTMLInputElement | null>(null);
  const tickRef = useRef<number | null>(null);
  const wrongTimeoutRef = useRef<number | null>(null);
  const correctFlashRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (wrongTimeoutRef.current !== null) {
      window.clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = null;
    }
    if (correctFlashRef.current !== null) {
      window.clearTimeout(correctFlashRef.current);
      correctFlashRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearTimers();
    onComplete({
      score: Math.max(0, scoreRef.current),
      correct: correctRef.current,
      wrong: wrongRef.current,
      tenseMistakes: tenseMistakesRef.current,
    });
  }, [clearTimers, onComplete]);

  /* ───── Timer ───── */

  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      setRemainingMs((prev) => {
        const next = Math.max(0, prev - TICK_MS);
        return next;
      });
    }, TICK_MS);
    return () => {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (remainingMs <= 0) finish();
  }, [remainingMs, finish]);

  /* ───── Odak ───── */

  useEffect(() => {
    if (feedback !== 'wrong') {
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [currentIdx, feedback]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /* ───── Akış ───── */

  const advanceToNext = useCallback(() => {
    setWrongInfo(null);
    setFeedback('idle');
    setAnswer('');
    setCurrentIdx((idx) => {
      if (idx + 1 >= queue.length) {
        setQueue((q) => shuffleEntries(q));
        return 0;
      }
      return idx + 1;
    });
  }, [queue]);

  const handleSubmit = useCallback((override?: string) => {
    const entry = queue[currentIdx];
    if (!entry || feedback !== 'idle') return;
    const given = (override ?? answer).trim();
    if (!given) return;

    if (isClozeAnswerCorrect(given, entry.answer)) {
      scoreRef.current += CORRECT_SCORE;
      correctRef.current += 1;
      setTick((t) => t + 1);
      addActivityToday(1);
      updateDocumentTitle();
      setFeedback('correct');
      const fullSentence = entry.sentence.replace(/_{3,}/g, entry.answer);
      speakAuto(fullSentence, { lang: 'es-ES' });
      if (correctFlashRef.current !== null) window.clearTimeout(correctFlashRef.current);
      correctFlashRef.current = window.setTimeout(advanceToNext, 180);
    } else {
      scoreRef.current -= WRONG_SCORE_PENALTY;
      wrongRef.current += 1;
      tenseMistakesRef.current[entry.tense] = (tenseMistakesRef.current[entry.tense] ?? 0) + 1;
      setTick((t) => t + 1);
      setFeedback('wrong');
      setWrongInfo({ expected: entry.answer, given: given, hint: entry.hint });
      setRemainingMs((ms) => Math.max(0, ms - WRONG_TIME_PENALTY_MS));
      try {
        addMistake(entry.verb, entry.tense, entry.person);
      } catch {
        /* noop */
      }
      if (wrongTimeoutRef.current !== null) window.clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = window.setTimeout(advanceToNext, WRONG_FLASH_MS);
    }
  }, [queue, currentIdx, feedback, answer, advanceToNext]);

  const insertChar = useCallback((ch: string) => {
    const input = inputRef.current;
    if (!input) {
      setAnswer((a) => a + ch);
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const next = input.value.slice(0, start) + ch + input.value.slice(end);
    setAnswer(next);
    queueMicrotask(() => {
      input.focus();
      const pos = start + ch.length;
      try {
        input.setSelectionRange(pos, pos);
      } catch {
        /* noop */
      }
    });
  }, []);

  /* ───── Render ───── */

  const entry = queue[currentIdx];
  if (!entry) return null;

  const timePct = Math.max(0, Math.min(1, remainingMs / INITIAL_TIME_MS));
  const seconds = Math.ceil(remainingMs / 1000);
  const isLowTime = seconds <= 10;
  const barColorClass = isLowTime
    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
    : 'bg-gradient-to-r from-indigo-500 to-emerald-500';

  const parts = entry.sentence.split('_____');
  const before = parts[0] ?? entry.sentence;
  const after = parts[1] ?? '';

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Üst şerit */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-medium">
            <span
              className={`inline-flex items-center gap-1.5 font-bold ${
                isLowTime ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              <Timer className="w-4 h-4" />
              <span className="tabular-nums text-base">{seconds}s</span>
            </span>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <span className="text-slate-500 dark:text-slate-400">Cloze Sprint</span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Check className="w-3.5 h-3.5" />
              {correctRef.current}
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
              <X className="w-3.5 h-3.5" />
              {wrongRef.current}
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
              <Trophy className="w-3.5 h-3.5" />
              {Math.max(0, scoreRef.current)}
            </span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
          <motion.div
            className={`h-full ${barColorClass} transition-colors duration-300`}
            animate={{ width: `${timePct * 100}%` }}
            transition={{ duration: 0.15, ease: 'linear' }}
          />
        </div>
      </div>

      {/* Oyun kartı */}
      <AnimatePresence mode="wait">
        <motion.section
          key={entry.id + '|' + feedback}
          initial={{ opacity: 0, y: 6 }}
          animate={
            feedback === 'wrong'
              ? { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, -3, 3, 0] }
              : { opacity: 1, y: 0 }
          }
          exit={{ opacity: 0, y: -4 }}
          transition={
            feedback === 'wrong'
              ? { duration: 0.45, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
          className={`rounded-2xl border-2 p-6 sm:p-8 transition-colors ${
            feedback === 'correct'
              ? 'border-emerald-500/60 bg-emerald-500/10'
              : feedback === 'wrong'
              ? 'border-rose-500/70 bg-rose-500/10'
              : 'border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm'
          }`}
        >
          <div className="flex items-center gap-2 mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10">{entry.level}</span>
            <span>·</span>
            <span>{entry.tense}</span>
          </div>

          <p className="text-xl sm:text-2xl leading-relaxed text-center text-slate-900 dark:text-white font-medium mb-2">
            <span>{before}</span>
            <span
              className={`inline-flex items-baseline align-baseline mx-1 px-2 sm:px-3 py-1 rounded-lg border-2 border-dashed font-mono font-bold tracking-wide ${
                feedback === 'correct'
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : feedback === 'wrong'
                  ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  : 'border-indigo-400/60 bg-indigo-500/5 text-indigo-600 dark:text-indigo-300'
              } min-w-[4rem] text-center`}
            >
              {feedback === 'correct'
                ? entry.answer
                : feedback === 'wrong'
                ? wrongInfo?.expected ?? entry.answer
                : '_____'}
            </span>
            <span>{after}</span>
          </p>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
            <span className="font-mono text-slate-600 dark:text-slate-300">{entry.verb}</span>
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={feedback === 'wrong'}
                placeholder="çekim..."
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                enterKeyHint="send"
                className={`w-full h-14 sm:h-16 pl-4 pr-14 rounded-xl text-center text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900/80 border-2 transition-colors focus:outline-none ${
                  feedback === 'correct'
                    ? 'border-emerald-500/80'
                    : feedback === 'wrong'
                    ? 'border-rose-500/80 text-rose-700 dark:text-rose-300'
                    : 'border-slate-300 dark:border-white/10 focus:border-indigo-500/60'
                } disabled:opacity-80`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <MicButton
                  size={32}
                  lang="es-ES"
                  disabled={feedback === 'wrong'}
                  onResult={(res: ListenResult) => {
                    const match = matchTranscript(res.alternatives, entry.answer);
                    const picked = match ?? res.transcript;
                    setAnswer(picked);
                    handleSubmit(picked);
                  }}
                />
              </div>
            </div>

            {feedback === 'wrong' && wrongInfo && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm"
              >
                <p className="text-rose-700 dark:text-rose-300 font-medium">
                  Yazdığın: <span className="font-mono line-through">{wrongInfo.given}</span> →{' '}
                  Doğrusu:{' '}
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {wrongInfo.expected}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-snug">
                  {wrongInfo.hint}
                </p>
              </motion.div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {SPECIAL_CHARS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertChar(ch)}
                  disabled={feedback === 'wrong'}
                  className="min-w-[2.25rem] sm:min-w-[2.5rem] h-9 sm:h-10 px-2 rounded-lg text-base sm:text-lg font-mono font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-indigo-500/10 hover:border-indigo-400/40 active:scale-95 transition-all disabled:opacity-40"
                  aria-label={`Karakter ekle: ${ch}`}
                >
                  {ch}
                </button>
              ))}
            </div>

            <button type="submit" className="sr-only" disabled={feedback === 'wrong'}>
              Gönder
            </button>
          </form>
        </motion.section>
      </AnimatePresence>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setShowSkipConfirm(true)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" /> Atla
        </button>
      </div>

      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowSkipConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10 shadow-2xl p-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <SkipForward className="w-5 h-5" />
              </div>
              <p className="font-heading text-base font-bold text-slate-900 dark:text-white mb-1">
                Sprint'i bitirmek istiyor musun?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Şu anki skor kayda girer; yarın yeni bir seans açılacak.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowSkipConfirm(false)}
                  className="h-10 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSkipConfirm(false);
                    onSkipSession();
                    finish();
                  }}
                  className="h-10 rounded-lg bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors"
                >
                  Bitir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
