import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useXp } from '../contexts/XpContext';
import { getXpActivityHistory, getTitleForLevel, MAX_LEVEL } from '../utils/xpLevel';
import { getActivityHistory, getLastNDays } from '../utils/activityHistory';
import { getWorkedVerbsCount } from '../utils/workedVerbs';

type Props = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
};

const PANEL_MIN_W = 320;
const GAP = 8;

function sumActivityCorrect(): number {
  try {
    return Object.values(getActivityHistory()).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  } catch {
    return 0;
  }
}

export default function XpProfileModal({ open, onClose, anchorRef }: Props) {
  const { totalXP, level, title, xpProgress, streak } = useXp();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const xpHistory = getXpActivityHistory();
  const last7 = getLastNDays(7);
  const totalCorrect = sumActivityCorrect();
  const verbsWorked = getWorkedVerbsCount();

  const nextLevelNum = level >= MAX_LEVEL ? null : level + 1;
  const nextLevelTitle = nextLevelNum != null ? getTitleForLevel(nextLevelNum) : null;

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelW = Math.max(PANEL_MIN_W, Math.min(380, vw - 2 * GAP));
      let left = r.right - panelW;
      left = Math.max(GAP, Math.min(left, vw - panelW - GAP));
      const estH = 420;
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
            className="fixed z-[130] w-[min(calc(100vw-16px),380px)] min-w-[320px] rounded-2xl border border-white/10 bg-slate-900/95 dark:bg-[#0c1018]/98 shadow-2xl shadow-black/40 backdrop-blur-xl ring-1 ring-white/5"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-black text-white shadow-lg shadow-violet-900/40 tabular-nums"
                  aria-hidden
                >
                  {level}
                </div>
                <div className="min-w-0">
                  <p id="xp-popover-title" className="text-lg font-bold text-white tracking-tight truncate">
                    ⚡ Level {level} · {title}
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
                    {xpProgress.xpForNextLevel != null
                      ? `${xpProgress.xpInCurrentLevel} / ${xpProgress.xpNeededForNext} XP`
                      : 'Maksimum seviye'}
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
                {nextLevelTitle && (
                  <p className="text-xs text-slate-400">
                    Sonraki level: <span className="text-slate-200 font-medium">{nextLevelTitle}</span>
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-slate-800/60 border border-white/5 divide-y divide-white/5 text-sm">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="text-base shrink-0" aria-hidden>
                    🔥
                  </span>
                  <span className="text-slate-300">Günlük Seri</span>
                  <span className="ml-auto tabular-nums font-semibold text-white">{streak} gün</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="text-base shrink-0" aria-hidden>
                    ✅
                  </span>
                  <span className="text-slate-300">Toplam Doğru</span>
                  <span className="ml-auto tabular-nums font-semibold text-white">{totalCorrect}</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="text-base shrink-0" aria-hidden>
                    📚
                  </span>
                  <span className="text-slate-300">Çalışılan Fiil</span>
                  <span className="ml-auto tabular-nums font-semibold text-white">{verbsWorked}</span>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Son 7 gün</p>
                <div className="flex gap-1.5">
                  {last7.map((d) => {
                    const v = xpHistory[d] ?? 0;
                    const active = v > 0;
                    const h =
                      v >= 120 ? 'bg-blue-400' : v >= 40 ? 'bg-indigo-500' : v > 0 ? 'bg-violet-600/90' : 'bg-slate-800';
                    return (
                      <div
                        key={d}
                        title={`${d}: ${v} XP`}
                        className={`flex-1 min-w-0 h-9 rounded-lg transition-colors ${active ? h : 'bg-slate-800 ring-1 ring-white/5'}`}
                        role="img"
                        aria-label={`${d}: ${v} XP`}
                      />
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
