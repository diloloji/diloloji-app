import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useXp } from '../contexts/XpContext';
import { getXpActivityHistory, getTitle, getBestStreakEver } from '../utils/xpLevel';
import { getActivityHistory, getLastNDays, formatLocalYMD } from '../utils/activityHistory';
import { getWorkedVerbsCount } from '../utils/workedVerbs';
import { getLevelVisual } from '../utils/xpLevelVisual';
import { BADGE_DEFINITIONS, getEarnedBadgeIds } from '../utils/xpBadges';
import { getWeeklyMaxCombo, getAllTimeMaxCombo } from '../utils/xpWeeklyStats';

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
};

const PANEL_MIN_W = 320;
const GAP = 8;
const VERB_GOAL = 50;
const STREAK_GOAL_DAYS = 7;

function sumActivityCorrect(): number {
  try {
    return Object.values(getActivityHistory()).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  } catch {
    return 0;
  }
}

function dayLabelTr(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('tr-TR', { weekday: 'short' });
}

export default function XpProfileModal({ open, onClose, anchorRef }: Props) {
  const { totalXP, level, title, xpProgress, streak } = useXp();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [badgeTick, setBadgeTick] = useState(0);

  const xpHistory = getXpActivityHistory();
  const last7 = getLastNDays(7);
  const totalCorrect = sumActivityCorrect();
  const verbsWorked = getWorkedVerbsCount();
  const bestStreak = getBestStreakEver();
  const weeklyCombo = getWeeklyMaxCombo();
  const allTimeCombo = getAllTimeMaxCombo();
  const todayStr = formatLocalYMD(new Date());

  const nextLevelTitle = getTitle(level + 1);
  const visual = getLevelVisual(level);

  useEffect(() => {
    if (!open) return;
    const refresh = () => setBadgeTick((t) => t + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'conjume-badges-earned') refresh();
    };
    window.addEventListener('conjume-badge-unlocked', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('conjume-badge-unlocked', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [open]);

  const earnedBadges = getEarnedBadgeIds();

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelW = Math.max(PANEL_MIN_W, Math.min(400, vw - 2 * GAP));
      let left = r.right - panelW;
      left = Math.max(GAP, Math.min(left, vw - panelW - GAP));
      const estH = 720;
      let top = r.bottom + GAP;
      if (top + estH > vh - GAP) top = Math.max(GAP, r.top - estH - GAP);
      setPos({ top, left });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose, anchorRef]);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  if (!portalTarget) return null;

  const streakBarPct = Math.min(100, (streak / STREAK_GOAL_DAYS) * 100);
  const verbBarPct = Math.min(100, (verbsWorked / VERB_GOAL) * 100);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[125] bg-slate-950/45 dark:bg-black/55 backdrop-blur-[3px]"
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="xp-popover-title"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={`fixed z-[130] w-[min(calc(100vw-16px),400px)] min-w-[320px] max-h-[min(90vh,760px)] overflow-y-auto rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-xl ring-1 ring-white/5 ${visual.borderClass}`}
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="p-4 sm:p-5 space-y-4 bg-slate-900/95 dark:bg-[#0c1018]/98 rounded-2xl">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg tabular-nums ${visual.badgeBgClass}`}
                  aria-hidden
                >
                  {visual.emoji}
                </div>
                <div className="min-w-0">
                  <p id="xp-popover-title" className={`text-lg font-bold tracking-tight truncate ${visual.titleClass}`}>
                    Level {level} · {title}
                  </p>
                  <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                    Toplam {totalXP.toLocaleString('tr-TR')} XP
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>İlerleme</span>
                  <span className="tabular-nums font-medium text-slate-200">
                    {xpProgress.xpInCurrentLevel} / {xpProgress.xpNeededForNext} XP
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500"
                    initial={false}
                    animate={{ width: `${Math.round(xpProgress.percent)}%` }}
                    transition={{ type: 'spring', damping: 22, stiffness: 180 }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Sonraki level: <span className="text-slate-200 font-medium">{nextLevelTitle}</span>
                </p>
              </div>

              <div key={badgeTick}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Rozetlerim</p>
                <div className="grid grid-cols-2 gap-2">
                  {BADGE_DEFINITIONS.map((b) => {
                    const unlocked = earnedBadges.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        title={b.description}
                        className={`relative rounded-xl border px-2.5 py-2 text-left transition-colors ${
                          unlocked
                            ? 'border-amber-500/35 bg-amber-500/10'
                            : 'border-slate-700/80 bg-slate-800/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg shrink-0" aria-hidden>
                            {b.emoji}
                          </span>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold leading-tight ${unlocked ? 'text-white' : 'text-slate-500'}`}>
                              {b.name}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{b.description}</p>
                          </div>
                          {!unlocked && (
                            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500 ml-auto" aria-hidden />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base" aria-hidden>
                      🔥
                    </span>
                    <span className="text-sm font-semibold text-slate-200">Günlük Seri</span>
                    <span className="ml-auto tabular-nums text-sm font-bold text-orange-300">{streak} gün</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
                      style={{ width: `${streakBarPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">En iyi: {bestStreak} gün</p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 flex items-center gap-2">
                  <span className="text-base" aria-hidden>
                    ✅
                  </span>
                  <span className="text-sm text-slate-200">Toplam Doğru</span>
                  <span className="ml-auto tabular-nums text-lg font-bold text-emerald-400">{totalCorrect}</span>
                </div>

                <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base" aria-hidden>
                      📚
                    </span>
                    <span className="text-sm font-semibold text-slate-200">Çalışılan Fiil</span>
                    <span className="ml-auto tabular-nums text-sm font-bold text-blue-300">
                      {verbsWorked}/{VERB_GOAL}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                      style={{ width: `${verbBarPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Hedef: {VERB_GOAL} fiil</p>
                </div>

                <div className="rounded-xl border border-red-500/35 bg-red-500/5 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden>
                      ⚡
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-200">En Yüksek Combo</p>
                      <p className="text-[10px] text-slate-500">Bu hafta: {weeklyCombo}</p>
                    </div>
                    <span className="tabular-nums text-xl font-black text-red-400">×{allTimeCombo}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Son 7 gün</p>
                <div className="flex gap-1.5">
                  {last7.map((d) => {
                    const v = xpHistory[d] ?? 0;
                    const active = v > 0;
                    const isToday = d === todayStr;
                    const dayShort = dayLabelTr(d);
                    const heat =
                      v >= 120 ? 'bg-blue-400' : v >= 40 ? 'bg-indigo-500' : v > 0 ? 'bg-violet-600/90' : '';
                    return (
                      <div key={d} className="flex-1 min-w-0 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-medium text-slate-500 uppercase tracking-tight">
                          {dayShort}
                        </span>
                        <div
                          title={`${d}: ${v} XP`}
                          className={`w-full h-10 rounded-lg transition-colors ${
                            active
                              ? heat
                              : 'bg-slate-800/70 ring-1 ring-white/10'
                          } ${isToday ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900' : ''}`}
                          role="img"
                          aria-label={`${d} ${dayShort}: ${v} XP`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <Link
                to="/profil"
                className="flex justify-center text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors pt-1"
                onClick={onClose}
              >
                Tam profil sayfası →
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
