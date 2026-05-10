/**
 * Merkezi tam ekran modal: 20 seviyelik XP yol haritası.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useXp } from '../contexts/XpContext';
import {
  LEVEL_THRESHOLD_XP,
  LEVEL_TITLES,
  LEVEL_ROADMAP_ICONS,
  MAX_LEVEL,
  getXPProgress,
} from '../utils/xpLevel';

export type LevelRoadmapModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function LevelRoadmapModal({ open, onClose }: LevelRoadmapModalProps) {
  const { totalXP, level } = useXp();
  const xpProgress = getXPProgress(totalXP);
  const currentRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      currentRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [open, level]);

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

  const nextXpRemaining =
    xpProgress.xpForNextLevel != null ? Math.max(0, xpProgress.xpForNextLevel - totalXP) : 0;
  const pctRounded = Math.round(xpProgress.percent);

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
                ⚡ Seviye Yolculuğu
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

            <div className="flex-1 min-h-0 overscroll-contain px-4 sm:px-5 py-4 space-y-0">
              {Array.from({ length: MAX_LEVEL }, (_, i) => {
                const n = i + 1;
                const threshold = LEVEL_THRESHOLD_XP[i] ?? 0;
                const title = LEVEL_TITLES[i] ?? '';
                const icon = LEVEL_ROADMAP_ICONS[i] ?? '⭐';
                const isCompleted = level > n;
                const isCurrent = level === n;
                const isLocked = level < n;

                const lineBelow =
                  isCompleted && n < MAX_LEVEL ? (
                    <div className="ml-6 sm:ml-7 w-px h-2 bg-emerald-500/35 shrink-0" aria-hidden />
                  ) : null;

                return (
                  <div key={n} className="flex flex-col items-stretch">
                    <div
                      ref={isCurrent ? currentRowRef : undefined}
                      className={`rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 transition-colors border-l-[3px] ${
                        isCurrent
                          ? 'border-violet-500/50 border-l-violet-400 bg-gradient-to-br from-violet-600/25 via-indigo-600/15 to-slate-900/40 ring-1 ring-violet-500/25'
                          : isCompleted
                            ? 'border-white/5 border-l-emerald-500/50 bg-emerald-500/[0.06] opacity-[0.82]'
                            : 'border-white/5 border-l-slate-700 bg-white/[0.03] opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-xl sm:text-2xl shrink-0 leading-none" aria-hidden>
                          {icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm sm:text-base font-bold truncate ${
                              isCurrent
                                ? 'text-violet-100'
                                : isCompleted
                                  ? 'text-emerald-100/85'
                                  : 'text-slate-500'
                            }`}
                          >
                            Level {n} · {title}
                          </p>
                          <p className="text-[11px] sm:text-xs text-slate-500 tabular-nums mt-0.5">
                            {threshold.toLocaleString('tr-TR')} XP
                          </p>
                        </div>
                        <div className="shrink-0 text-right min-w-[1.75rem]">
                          {isCompleted && (
                            <span className="text-base sm:text-lg opacity-75" title="Tamamlandı" aria-label="Tamamlandı">
                              ✅
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-base sm:text-lg" title="Mevcut seviye" aria-label="Mevcut seviye">
                              ▶️
                            </span>
                          )}
                          {isLocked && (
                            <span className="text-base sm:text-lg opacity-45" title="Kilitli" aria-label="Kilitli">
                              🔒
                            </span>
                          )}
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="mt-3 space-y-2">
                          {xpProgress.xpForNextLevel != null ? (
                            <>
                              <p className="text-[11px] sm:text-xs text-slate-300 tabular-nums">
                                {xpProgress.xpInCurrentLevel} / {xpProgress.xpNeededForNext} XP · %{pctRounded}{' '}
                                tamamlandı
                              </p>
                              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-500"
                                  style={{ width: `${pctRounded}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-violet-200/90">
                                Sonraki level için {nextXpRemaining.toLocaleString('tr-TR')} XP daha
                              </p>
                            </>
                          ) : (
                            <p className="text-[11px] text-amber-200/90 font-medium">
                              En yüksek seviyedesin — tebrikler!
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {lineBelow}
                  </div>
                );
              })}
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
