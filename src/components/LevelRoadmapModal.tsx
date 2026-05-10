/**
 * Seviye yolculuğu: 20 seviye listesi (100 XP / seviye), nav altında sabit panel.
 */

import { useEffect, useRef } from 'react';
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
const ROADMAP_LEVEL_COUNT = 20;

function thresholdXpForLevel(n: number): number {
  return (n - 1) * XP_PER_LEVEL;
}

export default function LevelRoadmapModal({ open, onClose }: LevelRoadmapModalProps) {
  const { totalXP } = useXp();
  const userLevel = getLevel(totalXP);
  const xpProgress = getXPProgress(totalXP);
  const pctRounded = Math.round(xpProgress.percent);

  const panelRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

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
    const onDocClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (userLevel < 1 || userLevel > ROADMAP_LEVEL_COUNT) return;
    const t = window.setTimeout(() => {
      currentRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 100);
    return () => window.clearTimeout(t);
  }, [open, userLevel]);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-roadmap-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/95 dark:bg-[#0b0f18]/98 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-x-hidden"
          style={{
            position: 'fixed',
            top: 70,
            right: 16,
            left: 'auto',
            transform: 'none',
            width: 380,
            maxWidth: 'min(380px, calc(100vw - 32px))',
            maxHeight: '80vh',
            overflowY: 'auto',
            zIndex: 9999,
          }}
        >
          <div className="relative shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-white/10 pr-14">
            <h2 id="level-roadmap-title" className="text-lg sm:text-xl font-bold text-slate-100">
              ⚡ Seviye yolculuğu
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

          {userLevel > ROADMAP_LEVEL_COUNT && (
            <div className="px-4 sm:px-5 pt-3 pb-1">
              <p className="text-xs font-medium text-violet-200/90 bg-violet-500/15 border border-violet-500/25 rounded-lg px-3 py-2">
                Harita 1–{ROADMAP_LEVEL_COUNT} tamamlandı. Aktif seviye:{' '}
                <span className="tabular-nums font-bold">{userLevel}</span> · {getTitle(userLevel)}
              </p>
            </div>
          )}

          <div className="flex-1 min-h-0 overscroll-contain px-4 sm:px-5 py-4 space-y-0">
            {Array.from({ length: ROADMAP_LEVEL_COUNT }, (_, i) => {
              const n = i + 1;
              const threshold = thresholdXpForLevel(n);
              const rowTitle = getTitle(n);
              const icon = getLevelVisual(n).emoji;
              const isCompleted = userLevel > n;
              const isCurrent = userLevel === n;
              const isLocked = userLevel < n;

              const lineBelow =
                isCompleted && n < ROADMAP_LEVEL_COUNT ? (
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
                          ? 'border-white/5 border-l-emerald-500/50 bg-emerald-500/[0.06] opacity-[0.92]'
                          : 'border-white/5 border-l-slate-700 bg-white/[0.03] opacity-60'
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
                                ? 'text-emerald-100/90'
                                : 'text-slate-500'
                          }`}
                        >
                          Level {n} · {rowTitle}
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-500 tabular-nums mt-0.5">
                          {threshold.toLocaleString('tr-TR')} XP
                        </p>
                      </div>
                      <div className="shrink-0 text-right min-w-[1.75rem]">
                        {isCompleted && (
                          <span
                            className="text-base sm:text-lg text-emerald-400"
                            title="Tamamlandı"
                            aria-label="Tamamlandı"
                          >
                            ✅
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-base sm:text-lg" title="Mevcut seviye" aria-label="Mevcut seviye">
                            🔵
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-base sm:text-lg text-slate-500" title="Kilitli" aria-label="Kilitli">
                            🔒
                          </span>
                        )}
                      </div>
                    </div>

                    {isCurrent && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] sm:text-xs text-slate-300 tabular-nums">
                          {xpProgress.xpInCurrentLevel} / {xpProgress.xpNeededForNext} XP · %{pctRounded} tamamlandı
                        </p>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-500"
                            style={{ width: `${pctRounded}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-violet-200/90">
                          Sonraki seviye için{' '}
                          {Math.max(0, n * XP_PER_LEVEL - totalXP).toLocaleString('tr-TR')} XP kaldı
                        </p>
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
      )}
    </AnimatePresence>,
    portalTarget
  );
}
