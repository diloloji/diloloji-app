/**
 * Cloze Sprint — 60 sn hızlı fiil çekim oyunu.
 *
 * Akış:
 *  1. Intro — kullanıcı seviye seçer (A2/B1/B2/Hepsi) ve başlatır.
 *  2. Playing — üst ilerleme şeridi geri sayar; altında büyük cümle + boşluk + input.
 *     Enter doğruysa: yeşil flash, anında sonraki cümle.
 *     Enter yanlışsa: kırmızı shake, doğru cevap gösterilir, 800ms sonra geçer; −3 puan, −3 sn.
 *  3. Summary — süre bitince overlay: toplam puan, doğru/yanlış, zayıf zaman,
 *     bugünün en iyi skoru. "Tekrar Oyna" yeni random 20 cümle seçer.
 *
 * localStorage: conjume-cloze-sprint (clozeProgress.ts).
 * Doğru cevap: günlük hedef (addActivityToday) güncellenir.
 * Yanlış cevap: mistakeBank'a kaydedilir (SRS tekrarına dahil).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Check,
  Flame,
  Home,
  RefreshCw,
  Sparkles,
  Target,
  Timer,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  CLOZE_ENTRIES,
  filterClozeEntries,
  isClozeAnswerCorrect,
  shuffleEntries,
  type ClozeEntry,
  type ClozeLevel,
  type ClozeTenseLabel,
} from '../data/clozeData';
import { addActivityToday } from '../utils/activityHistory';
import { updateDocumentTitle } from '../utils/dailyGoal';
import { addMistake } from '../utils/mistakeBank';
import { speakAuto, matchTranscript, type ListenResult } from '../utils/speech';
import MicButton from '../components/speech/MicButton';
import {
  getTodayBest,
  saveClozeSession,
  getWeakestTenseFromResult,
  type ClozeSessionResult,
} from '../utils/clozeProgress';

/* ───────────────────── Sabitler ───────────────────── */

const INITIAL_TIME_MS = 60_000;
const SESSION_SIZE = 20;
const WRONG_TIME_PENALTY_MS = 3_000;
const WRONG_SCORE_PENALTY = 3;
const CORRECT_SCORE = 10;
/** Yanlış cevap sonrası kırmızı gösterim süresi (ms). */
const WRONG_FLASH_MS = 800;
/** Her tick'te (100ms) timer ne kadar azalır? */
const TICK_MS = 100;

const SPECIAL_CHARS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü'] as const;

type Phase = 'intro' | 'playing' | 'summary';
type Feedback = 'idle' | 'correct' | 'wrong';

/* ───────────────────── Arka plan ───────────────────── */

function SprintBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0a0e17] via-[#0d1117] to-[#1a1b2e] opacity-0 dark:opacity-100 transition-opacity duration-500"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-100 via-indigo-50/30 to-amber-50/30 dark:opacity-0 opacity-100 transition-opacity duration-500"
        aria-hidden
      />
      <div className="absolute -top-32 -left-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden />
      <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
    </>
  );
}

/* ───────────────────── Ana bileşen ───────────────────── */

export default function ClozeSprint() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [level, setLevel] = useState<ClozeLevel | 'all'>('all');

  /** Seansın rastgele 20'lik havuzu. */
  const [queue, setQueue] = useState<ClozeEntry[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback>('idle');
  /** Yanlış cevap sonrası gösterilecek bilgi (doğrusu + kullanıcının verdiği). */
  const [wrongInfo, setWrongInfo] = useState<{ expected: string; given: string; hint: string } | null>(null);

  const [remainingMs, setRemainingMs] = useState(INITIAL_TIME_MS);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [tenseMistakes, setTenseMistakes] = useState<Partial<Record<ClozeTenseLabel, number>>>({});

  const [finishedResult, setFinishedResult] = useState<ClozeSessionResult | null>(null);
  const [saveInfo, setSaveInfo] = useState<{ dailyBest: number; allTimeBest: number; isNewDailyBest: boolean } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const tickRef = useRef<number | null>(null);
  const wrongTimeoutRef = useRef<number | null>(null);
  const correctFlashRef = useRef<number | null>(null);

  const currentEntry: ClozeEntry | null = queue[currentIdx] ?? null;

  const availableByLevel = useMemo(
    () => ({
      all: CLOZE_ENTRIES.length,
      A2: CLOZE_ENTRIES.filter((e) => e.level === 'A2').length,
      B1: CLOZE_ENTRIES.filter((e) => e.level === 'B1').length,
      B2: CLOZE_ENTRIES.filter((e) => e.level === 'B2').length,
    }),
    []
  );

  /* ───────── Timer ───────── */

  const clearTimerTick = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const stopAllTimers = useCallback(() => {
    clearTimerTick();
    if (wrongTimeoutRef.current !== null) {
      window.clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = null;
    }
    if (correctFlashRef.current !== null) {
      window.clearTimeout(correctFlashRef.current);
      correctFlashRef.current = null;
    }
  }, [clearTimerTick]);

  useEffect(() => () => stopAllTimers(), [stopAllTimers]);

  /* ───────── Seans yönetimi ───────── */

  const endSession = useCallback(
    (finalScore: number, finalCorrect: number, finalWrong: number, finalTenseMistakes: Partial<Record<ClozeTenseLabel, number>>) => {
      stopAllTimers();
      const result: ClozeSessionResult = {
        timestamp: Date.now(),
        score: Math.max(0, finalScore),
        correctCount: finalCorrect,
        wrongCount: finalWrong,
        tenseMistakes: finalTenseMistakes,
      };
      const saved = saveClozeSession(result);
      setFinishedResult(result);
      setSaveInfo({ dailyBest: saved.dailyBest, allTimeBest: saved.allTimeBest, isNewDailyBest: saved.isNewDailyBest });
      setPhase('summary');
    },
    [stopAllTimers]
  );

  const startSession = useCallback(
    (chosenLevel: ClozeLevel | 'all') => {
      stopAllTimers();
      const pool = filterClozeEntries(chosenLevel);
      if (pool.length === 0) return;
      const shuffled = shuffleEntries(pool);
      const picked = shuffled.slice(0, Math.min(SESSION_SIZE, shuffled.length));

      setLevel(chosenLevel);
      setQueue(picked);
      setCurrentIdx(0);
      setAnswer('');
      setFeedback('idle');
      setWrongInfo(null);
      setRemainingMs(INITIAL_TIME_MS);
      setScore(0);
      setCorrectCount(0);
      setWrongCount(0);
      setTenseMistakes({});
      setFinishedResult(null);
      setSaveInfo(null);
      setPhase('playing');
    },
    [stopAllTimers]
  );

  // Timer tick — sadece 'playing' fazında ve feedback 'wrong' değilken sayar.
  useEffect(() => {
    if (phase !== 'playing') {
      clearTimerTick();
      return;
    }
    tickRef.current = window.setInterval(() => {
      setRemainingMs((prev) => {
        const next = Math.max(0, prev - TICK_MS);
        if (next === 0) {
          clearTimerTick();
        }
        return next;
      });
    }, TICK_MS);
    return () => clearTimerTick();
  }, [phase, clearTimerTick]);

  // Süre 0'a ulaşınca seansı bitir.
  useEffect(() => {
    if (phase === 'playing' && remainingMs <= 0) {
      endSession(score, correctCount, wrongCount, tenseMistakes);
    }
  }, [remainingMs, phase, endSession, score, correctCount, wrongCount, tenseMistakes]);

  // Playing fazında / soru değişiminde input'a odaklan.
  useEffect(() => {
    if (phase === 'playing' && feedback !== 'wrong') {
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [phase, currentIdx, feedback]);

  /* ───────── Cevap akışı ───────── */

  const advanceToNext = useCallback(() => {
    setWrongInfo(null);
    setFeedback('idle');
    setAnswer('');
    setCurrentIdx((idx) => {
      // Havuz bittiyse yeniden karıştırıp devam et (süre bitene kadar oynanır).
      if (idx + 1 >= queue.length) {
        const reshuffled = shuffleEntries(queue);
        setQueue(reshuffled);
        return 0;
      }
      return idx + 1;
    });
  }, [queue]);

  const handleCorrect = useCallback(() => {
    setFeedback('correct');
    setScore((s) => s + CORRECT_SCORE);
    setCorrectCount((c) => c + 1);
    addActivityToday(1);
    updateDocumentTitle();
    // Doğru cevap: cümlenin tamamını (boşluk yerine doğru çekim) oku.
    const entry = currentEntry;
    if (entry) {
      const fullSentence = entry.sentence.replace(/_{3,}/g, entry.answer);
      speakAuto(fullSentence, { lang: 'es-ES' });
    }
    // Yeşil flash kısa; sonraki soruya hemen geç.
    if (correctFlashRef.current !== null) window.clearTimeout(correctFlashRef.current);
    correctFlashRef.current = window.setTimeout(() => {
      advanceToNext();
    }, 180);
  }, [advanceToNext, currentEntry]);

  const handleWrong = useCallback(
    (entry: ClozeEntry, given: string) => {
      setFeedback('wrong');
      setWrongInfo({ expected: entry.answer, given, hint: entry.hint });
      setScore((s) => s - WRONG_SCORE_PENALTY);
      setWrongCount((w) => w + 1);
      setRemainingMs((ms) => Math.max(0, ms - WRONG_TIME_PENALTY_MS));
      setTenseMistakes((prev) => ({ ...prev, [entry.tense]: (prev[entry.tense] ?? 0) + 1 }));
      try {
        addMistake(entry.verb, entry.tense, entry.person);
      } catch {
        /* noop */
      }
      // 800ms sonra geç.
      if (wrongTimeoutRef.current !== null) window.clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = window.setTimeout(() => {
        advanceToNext();
      }, WRONG_FLASH_MS);
    },
    [advanceToNext]
  );

  const handleSubmit = useCallback((override?: string) => {
    if (phase !== 'playing') return;
    if (!currentEntry) return;
    if (feedback !== 'idle') return;
    const given = (override ?? answer).trim();
    if (!given) return;

    if (isClozeAnswerCorrect(given, currentEntry.answer)) {
      handleCorrect();
    } else {
      handleWrong(currentEntry, given);
    }
  }, [phase, currentEntry, feedback, answer, handleCorrect, handleWrong]);

  /* ───────── Özel karakter ekleme ───────── */

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
    // Odağı ve cursor konumunu güncel tut — değer state üzerinden gelecek tick'te yansır,
    // bu yüzden mikro görev sırasında setSelectionRange uyguluyoruz.
    queueMicrotask(() => {
      input.focus();
      const pos = start + ch.length;
      try {
        input.setSelectionRange(pos, pos);
      } catch {
        /* bazı input tipleri desteklemez */
      }
    });
  }, []);

  /* ───────── Render ───────── */

  if (phase === 'intro') {
    return <IntroScreen level={level} setLevel={setLevel} availableByLevel={availableByLevel} onStart={() => startSession(level)} />;
  }

  const timePct = Math.max(0, Math.min(1, remainingMs / INITIAL_TIME_MS));
  const seconds = Math.ceil(remainingMs / 1000);
  const isLowTime = seconds <= 10;
  const barColorClass = isLowTime
    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
    : 'bg-gradient-to-r from-indigo-500 to-emerald-500';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Helmet>
        <title>Cloze Sprint — {seconds}s</title>
      </Helmet>
      <Navbar />

      <div className="relative overflow-hidden">
        <SprintBackground />

        <main className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-20 pb-32">
          {/* Üst şerit */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 text-xs sm:text-sm font-medium">
                <span className={`inline-flex items-center gap-1.5 font-bold ${isLowTime ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
                  <Timer className="w-4 h-4" />
                  <span className="tabular-nums text-base">{seconds}s</span>
                </span>
                <span className="text-slate-400 dark:text-slate-500">·</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {currentIdx + 1}. cümle
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  {correctCount}
                </span>
                <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                  <X className="w-3.5 h-3.5" />
                  {wrongCount}
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                  <Trophy className="w-3.5 h-3.5" />
                  {score}
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

          {/* Cümle + input */}
          {currentEntry && (
            <GameBoard
              entry={currentEntry}
              answer={answer}
              setAnswer={setAnswer}
              onSubmit={handleSubmit}
              feedback={feedback}
              wrongInfo={wrongInfo}
              inputRef={inputRef}
              onInsertChar={insertChar}
              disabled={feedback === 'wrong'}
            />
          )}

          {/* Çıkış linki */}
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => {
                stopAllTimers();
                setPhase('intro');
              }}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              ← Seansdan çık
            </button>
          </div>
        </main>
      </div>

      {/* Summary overlay */}
      <AnimatePresence>
        {phase === 'summary' && finishedResult && saveInfo && (
          <SummaryOverlay
            result={finishedResult}
            dailyBest={saveInfo.dailyBest}
            allTimeBest={saveInfo.allTimeBest}
            isNewDailyBest={saveInfo.isNewDailyBest}
            onReplay={() => startSession(level)}
            onIntro={() => setPhase('intro')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────── Intro ekranı ───────────────────── */

function IntroScreen({
  level,
  setLevel,
  availableByLevel,
  onStart,
}: {
  level: ClozeLevel | 'all';
  setLevel: (l: ClozeLevel | 'all') => void;
  availableByLevel: { all: number; A2: number; B1: number; B2: number };
  onStart: () => void;
}) {
  const todayBest = useMemo(() => getTodayBest(), []);
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Helmet>
        <title>Cloze Sprint — Conjume</title>
      </Helmet>
      <Navbar />
      <div className="relative overflow-hidden">
        <SprintBackground />
        <main className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 mb-4">
              <Zap className="w-3.5 h-3.5" /> Yeni Mod · 60 saniye
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3">Cloze Sprint</h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              60 saniyede mümkün olduğunca çok İspanyolca cümlenin boşluğunu doldur. Hız, refleks ve doğru çekim — hepsi bir arada.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm p-5 sm:p-6 mb-6"
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Seviye</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['all', 'A2', 'B1', 'B2'] as const).map((lv) => {
                const count = lv === 'all' ? availableByLevel.all : availableByLevel[lv];
                const isSelected = level === lv;
                const label = lv === 'all' ? 'Hepsi' : lv;
                return (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv)}
                    className={`px-3 py-3 rounded-xl text-sm font-semibold border transition-all ${
                      isSelected
                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-indigo-400/40'
                    }`}
                  >
                    <div>{label}</div>
                    <div className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                      {count} cümle
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm p-5 sm:p-6 mb-6"
          >
            <div className="grid grid-cols-3 gap-3">
              <MiniStat icon={<Check className="w-4 h-4" />} label="Doğru" value="+10" color="emerald" />
              <MiniStat icon={<X className="w-4 h-4" />} label="Yanlış" value="−3 puan · −3 sn" color="rose" />
              <MiniStat icon={<Flame className="w-4 h-4" />} label="Bugün en iyi" value={`${todayBest}`} color="amber" />
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            type="button"
            onClick={onStart}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-amber-500 text-white font-bold text-base shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all active:scale-[0.99]"
          >
            Başlat · 60 sn
          </motion.button>
        </main>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'emerald' | 'rose' | 'amber' }) {
  const map = {
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  } as const;
  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${map[color]} mb-1.5`}>{icon}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">{label}</div>
      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{value}</div>
    </div>
  );
}

/* ───────────────────── Oyun tahtası ───────────────────── */

function GameBoard({
  entry,
  answer,
  setAnswer,
  onSubmit,
  feedback,
  wrongInfo,
  inputRef,
  onInsertChar,
  disabled,
}: {
  entry: ClozeEntry;
  answer: string;
  setAnswer: (s: string) => void;
  onSubmit: (override?: string) => void;
  feedback: Feedback;
  wrongInfo: { expected: string; given: string; hint: string } | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInsertChar: (ch: string) => void;
  disabled: boolean;
}) {
  const parts = entry.sentence.split('_____');
  const before = parts[0] ?? entry.sentence;
  const after = parts[1] ?? '';

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={entry.id + '|' + feedback /* yanlış flash bittiğinde remount */}
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
          <span>·</span>
          <span className="italic normal-case text-slate-500 dark:text-slate-400">{entry.person}</span>
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
            onSubmit();
          }}
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={disabled}
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
                disabled={disabled}
                onResult={(res: ListenResult) => {
                  const match = matchTranscript(res.alternatives, entry.answer);
                  const picked = match ?? res.transcript;
                  setAnswer(picked);
                  onSubmit(picked);
                }}
              />
            </div>
          </div>

          {/* Yanlış cevap kartı */}
          {feedback === 'wrong' && wrongInfo && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm"
            >
              <p className="text-rose-700 dark:text-rose-300 font-medium">
                Yazdığın: <span className="font-mono line-through">{wrongInfo.given}</span> →
                Doğrusu: <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{wrongInfo.expected}</span>
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-snug">{wrongInfo.hint}</p>
            </motion.div>
          )}

          {/* Aksan klavyesi */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {SPECIAL_CHARS.map((ch) => (
              <button
                key={ch}
                type="button"
                onMouseDown={(e) => e.preventDefault() /* input odağını koru */}
                onClick={() => onInsertChar(ch)}
                disabled={disabled}
                className="min-w-[2.25rem] sm:min-w-[2.5rem] h-9 sm:h-10 px-2 rounded-lg text-base sm:text-lg font-mono font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-indigo-500/10 hover:border-indigo-400/40 active:scale-95 transition-all disabled:opacity-40"
                aria-label={`Karakter ekle: ${ch}`}
              >
                {ch}
              </button>
            ))}
          </div>

          {/* Mobilde ekranda görünür submit — masaüstünde klavye Enter yeterli.
              Submit native form davranışı ile tetiklenir. */}
          <button
            type="submit"
            disabled={disabled || !answer.trim()}
            className="sr-only"
            aria-label="Cevabı gönder"
          >
            Gönder
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
          Enter ile gönder · Doğru +10 · Yanlış −3 puan, −3 sn
        </p>
      </motion.section>
    </AnimatePresence>
  );
}

/* ───────────────────── Summary overlay ───────────────────── */

function SummaryOverlay({
  result,
  dailyBest,
  allTimeBest,
  isNewDailyBest,
  onReplay,
  onIntro,
}: {
  result: ClozeSessionResult;
  dailyBest: number;
  allTimeBest: number;
  isNewDailyBest: boolean;
  onReplay: () => void;
  onIntro: () => void;
}) {
  const total = result.correctCount + result.wrongCount;
  const accuracy = total > 0 ? Math.round((result.correctCount / total) * 100) : 0;
  const weakest = getWeakestTenseFromResult(result);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloze-summary-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full sm:max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10 shadow-2xl p-6 sm:p-7"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 mb-2">
              Seans bitti
            </div>
            <h2 id="cloze-summary-title" className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
              {isNewDailyBest ? 'Yeni Günlük Rekor!' : 'Skorun'}
            </h2>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isNewDailyBest ? 'bg-gradient-to-br from-amber-400 to-rose-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200'}`}>
            {isNewDailyBest ? <Sparkles className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-5 mb-4 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1">Toplam Puan</p>
          <p className="text-5xl font-bold bg-gradient-to-r from-indigo-500 to-amber-500 bg-clip-text text-transparent tabular-nums">
            {Math.max(0, result.score)}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{result.correctCount} doğru</span>
            {' · '}
            <span className="font-semibold text-rose-600 dark:text-rose-400">{result.wrongCount} yanlış</span>
            {' · '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">%{accuracy} isabet</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3 text-center">
            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 mb-1">
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">Bugün en iyi</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{dailyBest}</div>
          </div>
          <div className="rounded-xl bg-indigo-500/10 border border-indigo-400/30 p-3 text-center">
            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-1">
              <Target className="w-4 h-4" />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-semibold">All-time</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{allTimeBest}</div>
          </div>
        </div>

        {weakest && (
          <div className="rounded-xl border border-rose-300/50 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 p-4 mb-5">
            <p className="text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-300 font-semibold mb-1">
              Zayıf nokta
            </p>
            <p className="font-bold text-slate-900 dark:text-white">{weakest.tense}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {weakest.count} cümlede zorlandın. Fiil Laboratuvarı'ndan tekrar yapabilirsin.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onReplay}
            className="w-full h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <RefreshCw className="w-4 h-4" /> Tekrar Oyna
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onIntro}
              className="h-11 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors hover:bg-slate-200 dark:hover:bg-white/10"
            >
              Seviye değiştir
            </button>
            <Link
              to="/"
              className="h-11 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors hover:bg-slate-200 dark:hover:bg-white/10 inline-flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" /> Ana Sayfa
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
