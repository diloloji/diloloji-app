import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

function playLevelUpFanfare() {
  if (typeof window === 'undefined' || !window.AudioContext && !(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) {
    return;
  }
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.12, now + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.35);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.4);
  });
  ctx.resume().catch(() => {});
}

type Props = {
  open: boolean;
  fromLevel: number;
  toLevel: number;
  fromTitle: string;
  toTitle: string;
  onClose: () => void;
};

export default function LevelUpCelebration({ open, fromLevel, toLevel, fromTitle, toTitle, onClose }: Props) {
  const firedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    playLevelUpFanfare();
    const end = Date.now() + 2600;
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    const t = window.setTimeout(() => onCloseRef.current(), 3000);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-up-title"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
            className="max-w-md w-full rounded-3xl border border-indigo-400/40 bg-gradient-to-br from-indigo-600 via-violet-600 to-amber-500 p-8 sm:p-10 text-center shadow-2xl shadow-indigo-500/40"
          >
            <p id="level-up-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              LEVEL UP! 🎉
            </p>
            <p className="text-white/95 text-base sm:text-lg font-semibold mb-1">
              Level {fromLevel} → Level {toLevel}: <span className="text-white font-bold">{toTitle}</span>
            </p>
            <p className="text-amber-100 text-sm sm:text-base font-medium">
              Önceki unvan: {fromTitle}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
