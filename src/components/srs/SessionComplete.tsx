/**
 * Oturum bitişi: doğruluk, XP, konfeti (%80+), motivasyon, Tekrar Çalış / Bitir.
 * XP ekleme çağıran bileşende (bir kez addXP) yapılmalı; burada yalnızca gösterim.
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw } from 'lucide-react';
import { useXp } from '../../contexts/XpContext';

function motivationForAccuracy(percent: number): string {
  if (percent >= 100) return 'Mükemmel! 🏆';
  if (percent >= 80) return 'Harika gidiyorsun! 🔥';
  if (percent >= 60) return 'İyi iş, devam et! 💪';
  return 'Biraz daha pratik yapalım 📚';
}

export interface SessionCompleteProps {
  deckTitle: string;
  /** 0–100 */
  accuracyPercent: number;
  xpEarned: number;
  elapsedSeconds: number;
  /** Kartlar modu: Yeniden / Zor / İyi / Kolay sayıları */
  gradeRow?: { again: number; hard: number; good: number; easy: number };
  /** Ek metin (ör. eşleştir süresi) */
  subtitle?: string;
  onFinish: () => void;
  onStudyAgain: () => void;
}

export default function SessionComplete({
  deckTitle,
  accuracyPercent,
  xpEarned,
  elapsedSeconds,
  gradeRow,
  subtitle,
  onFinish,
  onStudyAgain,
}: SessionCompleteProps) {
  const { addXP } = useXp();
  const xpGranted = useRef(false);

  useEffect(() => {
    if (xpGranted.current || xpEarned <= 0) return;
    xpGranted.current = true;
    addXP(xpEarned);
  }, [xpEarned, addXP]);

  useEffect(() => {
    if (accuracyPercent < 80) return;
    const duration = 2400;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#a78bfa', '#f59e0b', '#34d399', '#f472b6'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#a78bfa', '#f59e0b', '#34d399', '#f472b6'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [accuracyPercent]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const msg = motivationForAccuracy(accuracyPercent);

  return (
    <motion.div
      className="flex min-h-screen flex-col items-center justify-center bg-night-950 px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-night-900/90 p-8 text-center shadow-2xl shadow-indigo-500/10"
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      >
        <div className="mb-4 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-4xl ring-4 ring-indigo-500/30">
            <Trophy className="text-indigo-400" size={36} />
          </div>
        </div>

        <h2 className="mb-1 text-2xl font-bold text-white">Oturum Tamamlandı!</h2>
        <p className="mb-2 text-sm text-slate-400">{deckTitle}</p>
        <p className="mb-4 text-base font-semibold text-amber-200/90">{msg}</p>

        <motion.div
          className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-orange-500/10 px-6 py-5"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.1 }}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400/80">Kazanılan XP</p>
          <motion.p
            className="text-4xl font-black tabular-nums text-amber-300"
            initial={{ scale: 0.5 }}
            animate={{ scale: [0.5, 1.15, 1] }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            +{xpEarned}
          </motion.p>
        </motion.div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 py-3">
            <div className="text-xl font-bold text-indigo-300 tabular-nums">%{accuracyPercent}</div>
            <div className="text-xs text-slate-500">Doğruluk</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 py-3">
            <div className="text-xl font-bold text-slate-200 tabular-nums">{formatTime(elapsedSeconds)}</div>
            <div className="text-xs text-slate-500">Süre</div>
          </div>
        </div>

        {subtitle && <p className="mb-4 text-sm text-slate-400">{subtitle}</p>}

        {gradeRow && (
          <div className="mb-6 grid grid-cols-4 gap-2 text-sm">
            {(
              [
                { label: 'Yeniden', count: gradeRow.again, color: 'text-red-400' },
                { label: 'Zor', count: gradeRow.hard, color: 'text-orange-400' },
                { label: 'İyi', count: gradeRow.good, color: 'text-blue-400' },
                { label: 'Kolay', count: gradeRow.easy, color: 'text-green-400' },
              ] as const
            ).map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5">
                <span className={`text-lg font-bold ${s.color}`}>{s.count}</span>
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onFinish}
            className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5 hover:text-white"
          >
            Bitir
          </button>
          <button
            type="button"
            onClick={onStudyAgain}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-400"
          >
            <RotateCcw size={16} />
            Tekrar Çalış
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
