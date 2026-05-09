/**
 * TodaysSession — Günlük Akış ana ekranı.
 *
 * Akış:
 *  1. Kart — "Bugünün Seansı": tahmini süre, sıradaki adımlar, büyük Başla butonu,
 *     streak göstergesi, sağ üstte "Serbest Mod" linki (eski ana sayfaya).
 *  2. Oynatma — adımları sırayla çalıştırır (SRS → Cloze Sprint).
 *  3. Özet — overlay: doğru/yanlış, streak, zayıf zaman, yarının tekrar sayısı.
 *
 * Gece yarısı geçince `ensureFreshDay()` last_active_date'i kontrol edip
 *  today_completed'i sıfırlar, eski streak'i gerekirse 0'a çeker.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Flame,
  PlayCircle,
  Sparkles,
  Target,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import SrsReviewPlayer, { type SrsStepResult } from '../components/flow/SrsReviewPlayer';
import ClozeFlowPlayer, { type ClozeStepResult } from '../components/flow/ClozeFlowPlayer';
import {
  buildDailyPlan,
  ensureFreshDay,
  formatEstimatedTime,
  markTodayCompleted,
  STREAK_CELEBRATION_STEP,
  type DailyFlowState,
  type DailyPlan,
  type FlowStep,
} from '../utils/dailyFlow';
import { getDueMistakesByPriority } from '../utils/mistakeBank';
import { TENSES_ES } from '../data/spanish';
import DailyVerbWidget from '../components/DailyVerbWidget';

/* ───────── Yardımcılar ───────── */

type Phase = 'card' | 'playing' | 'summary';

interface AggregateStats {
  srsCorrect: number;
  srsWrong: number;
  clozeScore: number;
  clozeCorrect: number;
  clozeWrong: number;
  tenseMistakes: Record<string, number>;
}

const EMPTY_STATS: AggregateStats = {
  srsCorrect: 0,
  srsWrong: 0,
  clozeScore: 0,
  clozeCorrect: 0,
  clozeWrong: 0,
  tenseMistakes: {},
};

function totalCorrect(s: AggregateStats) {
  return s.srsCorrect + s.clozeCorrect;
}
function totalWrong(s: AggregateStats) {
  return s.srsWrong + s.clozeWrong;
}

function weakestTense(s: AggregateStats): { label: string; count: number } | null {
  const entries = Object.entries(s.tenseMistakes).filter(([, c]) => c > 0);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [id, count] = entries[0];
  const esLabel = TENSES_ES.find((t) => t.id === id)?.label;
  return { label: esLabel ?? id, count };
}

function stepLabel(step: FlowStep): string {
  if (step.kind === 'srs-review') return `${step.count} tekrar`;
  return '1 Cloze Sprint (60 sn)';
}

/* ───────── Arka plan ───────── */

function TodayBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0a0e17] via-[#0d1117] to-[#1a1b2e] opacity-0 dark:opacity-100 transition-opacity duration-500"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-amber-50/30 dark:opacity-0 opacity-100 transition-opacity duration-500"
        aria-hidden
      />
      <div className="absolute -top-32 -left-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden />
      <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
    </>
  );
}

/* ───────── Konfeti (sade) ───────── */

function StreakCelebration({ streak }: { streak: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.1 + Math.random() * 0.8,
        rotate: Math.random() * 360,
        color: ['#f97316', '#6366f1', '#10b981', '#f59e0b', '#ef4444'][i % 5],
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -20, x: 0, opacity: 0, rotate: 0 }}
          animate={{ y: '110vh', x: (p.left - 50) * 2, opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          className="absolute top-0 w-2 h-3 rounded-sm"
          style={{ left: `${p.left}%`, backgroundColor: p.color }}
        />
      ))}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-0 top-1/3 flex justify-center pointer-events-none"
      >
        <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-rose-500 text-white px-5 py-3 shadow-2xl text-center">
          <p className="font-heading text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {streak} günlük seri!
          </p>
          <p className="text-xs opacity-90">Muhteşem — serini koru.</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ───────── Ana bileşen ───────── */

export default function TodaysSession() {
  const [state, setState] = useState<DailyFlowState>(() => ensureFreshDay());
  const [plan, setPlan] = useState<DailyPlan>(() => buildDailyPlan());
  const [phase, setPhase] = useState<Phase>('card');
  const [stepIdx, setStepIdx] = useState(0);
  const [stats, setStats] = useState<AggregateStats>(EMPTY_STATS);
  const [completedStepIndices, setCompletedStepIndices] = useState<Set<number>>(new Set());
  const [celebration, setCelebration] = useState<{ active: boolean; streak: number }>({ active: false, streak: 0 });
  const [tomorrowCount, setTomorrowCount] = useState<number>(0);

  // Sayfa odağa gelince gün kontrolünü tekrar et (sekme değişikliği / midnight).
  useEffect(() => {
    const refresh = () => {
      const fresh = ensureFreshDay();
      setState(fresh);
      if (phase === 'card') {
        setPlan(buildDailyPlan());
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [phase]);

  const startFlow = useCallback(() => {
    setStats(EMPTY_STATS);
    setCompletedStepIndices(new Set());
    setStepIdx(0);
    setPhase('playing');
  }, []);

  const finishFlow = useCallback(
    (finalStats: AggregateStats) => {
      const due = getDueMistakesByPriority();
      setTomorrowCount(due.length);
      const result = markTodayCompleted();
      setState(result);
      if (result.isMilestone) {
        setCelebration({ active: true, streak: result.streak });
        window.setTimeout(() => setCelebration({ active: false, streak: 0 }), 2600);
      }
      setStats(finalStats);
      setPhase('summary');
    },
    []
  );

  const advanceStep = useCallback(
    (updatedStats: AggregateStats) => {
      setCompletedStepIndices((prev) => {
        const next = new Set(prev);
        next.add(stepIdx);
        return next;
      });
      const nextIdx = stepIdx + 1;
      if (nextIdx >= plan.steps.length) {
        finishFlow(updatedStats);
      } else {
        setStepIdx(nextIdx);
      }
    },
    [stepIdx, plan.steps.length, finishFlow]
  );

  const handleSrsComplete = useCallback(
    (result: SrsStepResult) => {
      const merged: AggregateStats = {
        ...stats,
        srsCorrect: stats.srsCorrect + result.correct,
        srsWrong: stats.srsWrong + result.wrong + result.skipped,
        tenseMistakes: mergeMistakes(stats.tenseMistakes, result.tenseMistakes),
      };
      setStats(merged);
      advanceStep(merged);
    },
    [stats, advanceStep]
  );

  const handleClozeComplete = useCallback(
    (result: ClozeStepResult) => {
      const merged: AggregateStats = {
        ...stats,
        clozeScore: stats.clozeScore + result.score,
        clozeCorrect: stats.clozeCorrect + result.correct,
        clozeWrong: stats.clozeWrong + result.wrong,
        tenseMistakes: mergeMistakes(stats.tenseMistakes, result.tenseMistakes as Record<string, number>),
      };
      setStats(merged);
      advanceStep(merged);
    },
    [stats, advanceStep]
  );

  const handleSkipSession = useCallback(() => {
    finishFlow(stats);
  }, [finishFlow, stats]);

  const closeSummary = useCallback(() => {
    setPhase('card');
    setPlan(buildDailyPlan());
  }, []);

  const currentStep = plan.steps[stepIdx];

  return (
    <div className="min-h-[100dvh] min-h-screen overflow-x-hidden bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Helmet>
        <title>Bugünün Seansı — Conjume</title>
      </Helmet>
      <Navbar />

      <div className="relative overflow-hidden">
        <TodayBackground />

        {/* Üst çubuk — streak + serbest mod linki (kart fazında) */}
        {phase === 'card' && (
          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-20">
            <div className="flex items-center justify-between">
              <StreakPill streak={state.streak} bestStreak={state.bestStreak} />
              <Link
                to="/serbest"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
              >
                Serbest Mod <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        <main className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-32">
          {phase === 'card' && (
            <>
              <TodaysCard
                state={state}
                plan={plan}
                onStart={startFlow}
              />
              <DailyVerbWidget />
            </>
          )}

          {phase === 'playing' && currentStep && (
            <div>
              <StepsHeader plan={plan} currentIdx={stepIdx} completedIndices={completedStepIndices} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={`step-${stepIdx}-${currentStep.kind}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6"
                >
                  {currentStep.kind === 'srs-review' && (
                    <SrsReviewPlayer
                      entries={currentStep.entries}
                      onComplete={handleSrsComplete}
                      onSkipSession={handleSkipSession}
                    />
                  )}
                  {currentStep.kind === 'cloze-sprint' && (
                    <ClozeFlowPlayer
                      onComplete={handleClozeComplete}
                      onSkipSession={handleSkipSession}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {phase === 'summary' && (
          <SummaryOverlay
            stats={stats}
            state={state}
            tomorrowCount={tomorrowCount}
            onClose={closeSummary}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebration.active && <StreakCelebration streak={celebration.streak} />}
      </AnimatePresence>
    </div>
  );
}

function mergeMistakes(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = (out[k] ?? 0) + (v ?? 0);
  }
  return out;
}

/* ───────── Streak rozeti ───────── */

function StreakPill({ streak, bestStreak }: { streak: number; bestStreak: number }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-400/30 text-amber-700 dark:text-amber-300">
      <Flame className="w-3.5 h-3.5" />
      <span className="text-xs font-bold">
        {streak > 0 ? `${streak} günlük seri` : 'Bugün seri başlıyor'}
      </span>
      {bestStreak > streak && bestStreak > 0 && (
        <span className="text-[10px] opacity-70">· en iyi {bestStreak}</span>
      )}
    </div>
  );
}

/* ───────── "Bugünün Seansı" kartı ───────── */

function TodaysCard({ state, plan, onStart }: { state: DailyFlowState; plan: DailyPlan; onStart: () => void }) {
  const alreadyDone = state.todayCompleted;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm p-6 sm:p-8 shadow-xl shadow-indigo-500/5"
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold mb-1">
            Bugünün Seansı
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {alreadyDone ? 'Bugünü tamamladın' : 'Hazır mısın?'}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {alreadyDone
              ? 'Bonus tur atmak istersen tekrar başlatabilirsin — streak korunur.'
              : 'Doğrudan işe koyul: birkaç tekrar, sonra hızlı bir sprint.'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-700 dark:text-indigo-300 flex-shrink-0">
          <Timer className="w-4 h-4" />
          <span className="text-sm font-bold">{formatEstimatedTime(plan.totalSeconds)}</span>
        </div>
      </div>

      <ol className="space-y-2.5 mb-6">
        {plan.steps.map((step, i) => (
          <li
            key={`${i}-${step.kind}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 px-4 py-3"
          >
            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold text-xs inline-flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {stepLabel(step)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ~{Math.round(step.estimatedSeconds / 10) * 10 || step.estimatedSeconds} sn
              </p>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={onStart}
        className="group w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-amber-500 text-white font-bold text-base shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
      >
        <PlayCircle className="w-5 h-5" />
        {alreadyDone ? 'Tekrar Başla' : 'Başla'}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </button>

      <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
        {plan.summaryLabel}
      </p>
    </motion.section>
  );
}

/* ───────── Akış içinde adım göstergesi ───────── */

function StepsHeader({
  plan,
  currentIdx,
  completedIndices,
}: {
  plan: DailyPlan;
  currentIdx: number;
  completedIndices: Set<number>;
}) {
  return (
    <div className="max-w-xl mx-auto">
      <ol className="flex items-center gap-2">
        {plan.steps.map((step, i) => {
          const isDone = completedIndices.has(i);
          const isCurrent = i === currentIdx;
          return (
            <li key={i} className="flex-1">
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  isDone
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30'
                    : isCurrent
                    ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-400/40'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-current opacity-40 flex-shrink-0" />
                )}
                <span className={`truncate ${isDone ? 'line-through opacity-80' : ''}`}>
                  {stepLabel(step)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ───────── Özet overlay'i ───────── */

function SummaryOverlay({
  stats,
  state,
  tomorrowCount,
  onClose,
}: {
  stats: AggregateStats;
  state: DailyFlowState;
  tomorrowCount: number;
  onClose: () => void;
}) {
  const correct = totalCorrect(stats);
  const wrong = totalWrong(stats);
  const total = correct + wrong;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const weakest = weakestTense(stats);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="today-summary-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full sm:max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10 shadow-2xl p-6 sm:p-7"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 mb-2">
              <Check className="w-3 h-3" /> Tamamlandı
            </div>
            <h2 id="today-summary-title" className="font-heading text-2xl font-bold text-slate-900 dark:text-white">
              Bugün tamamlandı
            </h2>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-400 to-rose-500 text-white">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-5 mb-4 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1">
            Güncel Seri
          </p>
          <p className="text-5xl font-bold bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent tabular-nums">
            {state.streak}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {state.streak > 0 && state.streak % STREAK_CELEBRATION_STEP === 0
              ? '🎉 Kilometretaşı!'
              : 'Yarın da gelirsen seri uzayacak.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatBox icon={<Check className="w-4 h-4" />} value={correct} label="Doğru" color="emerald" />
          <StatBox icon={<X className="w-4 h-4" />} value={wrong} label="Yanlış" color="rose" />
          <StatBox icon={<Target className="w-4 h-4" />} value={`%${accuracy}`} label="İsabet" color="indigo" />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatBox icon={<Trophy className="w-4 h-4" />} value={Math.max(0, stats.clozeScore)} label="Sprint puanı" color="amber" />
          <StatBox icon={<Flame className="w-4 h-4" />} value={state.bestStreak} label="En iyi seri" color="rose" />
        </div>

        {weakest && (
          <div className="rounded-xl border border-rose-300/50 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 p-4 mb-4">
            <p className="text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-300 font-semibold mb-1">
              Zayıf nokta
            </p>
            <p className="font-bold text-slate-900 dark:text-white">{weakest.label}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {weakest.count} defa zorlandın.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4 mb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Timer className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Yarın seni bekleyen</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {tomorrowCount > 0 ? `${tomorrowCount} tekrar + 1 Cloze Sprint` : '1 Cloze Sprint'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm transition-colors"
        >
          Kapat
        </button>
      </motion.div>
    </motion.div>
  );
}

function StatBox({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: 'emerald' | 'rose' | 'indigo' | 'amber';
}) {
  const map = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/30',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-400/30',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-400/30',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400/30',
  } as const;
  return (
    <div className={`rounded-xl border p-3 text-center ${map[color]}`}>
      <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-current opacity-20 mb-1">
        <span className="text-current opacity-100">{icon}</span>
      </div>
      <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider font-semibold opacity-90">{label}</div>
    </div>
  );
}
