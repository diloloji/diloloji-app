/**
 * Seviye özeti: 100 XP / seviye eğrisi (sınırsız seviye).
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useXp } from '../contexts/XpContext';
import { getLevel, getTitle, getXPProgress } from '../utils/xpLevel';
import { getLevelVisual } from '../utils/xpLevelVisual';

export type LevelRoadmapModalProps = {
  open: boolean;
  onClose: () => void;
};

const XP_PER_LEVEL = 100;

export default function LevelRoadmapModal({ open, onClose }: LevelRoadmapModalProps) {
  const { totalXP } = useXp();
  const level = getLevel(totalXP);
  const title = getTitle(level);
  const xpProgress = getXPProgress(totalXP);
  const lvVisual = getLevelVisual(level);
  const pctRounded = Math.round(xpProgress.percent);
  const nextThreshold = level * XP_PER_LEVEL;
  const xpToNext = Math.max(0, nextThreshold - totalXP);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-roadmap-title"
          className="fixed inset-0 z-[1000] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-950/55 dark:bg-black/60 backdrop-blur-md pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden
            onClick={onClose}
          />
          <motion.div
            className="absolute top-[60px] right-0 z-10 w-[360px] max-h-[calc(100vh-80px)] overflow-y-auto overflow-x-hidden flex flex-col rounded-2xl border border-white/10 bg-slate-900/95 dark:bg-[#0b0f18]/98 shadow-2xl shadow-black/50 backdrop-blur-xl pointer-events-auto max-md:left-0 max-md:right-0 max-md:w-screen max-md:rounded-t-none max-md:rounded-b-2xl"
            style={{ transform: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-white/10 pr-14">
              <h2 id="level-roadmap-title" className="text-lg sm:text-xl font-bold text-slate-100">
                ⚡ Seviye
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overscroll-contain px-4 sm:px-5 py-5 space-y-4">
              <div className="rounded-xl border px-4 py-4 border-l-[4px] border-violet-500/50 border-l-violet-400 bg-gradient-to-br from-violet-600/25 via-indigo-600/15 to-slate-900/40 ring-1 ring-violet-500/25">
                <div className="flex items-center gap-3">
                  <span className="text-3xl shrink-0 leading-none" aria-hidden>
                    {lvVisual.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-violet-100">
                      Level {level} · {title}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 tabular-nums">
                      Her {XP_PER_LEVEL} XP bir sonraki seviyeye götürür.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] sm:text-xs text-slate-300 tabular-nums">
                    Bu seviyede: {xpProgress.xpInCurrentLevel} / {xpProgress.xpNeededForNext} XP · %{pctRounded}{' '}
                    tamamlandı
                  </p>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-500"
                      style={{ width: `${pctRounded}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-violet-200/90">
                    Sonraki seviye için {xpToNext.toLocaleString('tr-TR')} XP kaldı
                  </p>
                </div>
              </div>
            </div>

            <div className="shrink-0 px-5 py-4 border-t border-white/10 bg-slate-900/80">
              <p className="text-center text-sm font-semibold text-slate-200">
                Toplam: {totalXP.toLocaleString('tr-TR')} XP kazandın 🎉
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
