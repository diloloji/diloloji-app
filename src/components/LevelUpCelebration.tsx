import { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getLevelVisual } from '../utils/xpLevelVisual';

function playLevelUpFanfare() {
  if (
    typeof window === 'undefined' ||
    (!window.AudioContext && !(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  ) {
    return;
  }
  const Ctx =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

function LevelUpParticles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        left: `${(i * 7 + 13) % 100}%`,
        top: `${(i * 11 + 7) % 100}%`,
        delay: (i % 8) * 0.12,
        hue: (i * 47) % 360,
      })),
    []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {dots.map((d) => (
        <span
          key={d.id}
          className="level-up-particle"
          style={{
            left: d.left,
            top: d.top,
            animationDelay: `${d.delay}s`,
            backgroundColor: `hsl(${d.hue} 75% 62%)`,
          }}
        />
      ))}
    </div>
  );
}

export default function LevelUpCelebration({ open, fromLevel, toLevel, fromTitle, toTitle, onClose }: Props) {
  const firedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const visual = getLevelVisual(toLevel);

  useEffect(() => {
    if (!open) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    playLevelUpFanfare();

    const burst = () => {
      confetti({
        particleCount: 110,
        spread: 70,
        origin: { x: 0.5, y: 0.42 },
        colors: ['#a78bfa', '#fbbf24', '#34d399', '#60a5fa', '#f472b6'],
      });
    };
    burst();
    const end = Date.now() + 2400;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899'],
      });
      confetti({
        particleCount: 4,
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
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-up-title"
        >
          <LevelUpParticles />
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className={`relative max-w-md w-full rounded-3xl p-[2px] shadow-2xl ${visual.borderClass}`}
          >
            <div className="rounded-3xl bg-slate-950/95 px-8 py-10 sm:px-10 sm:py-12 text-center ring-1 ring-white/10">
              <motion.div
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.08 }}
                className={`mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl text-5xl shadow-lg ${visual.badgeBgClass}`}
                aria-hidden
              >
                {visual.emoji}
              </motion.div>
              <p id="level-up-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
                LEVEL UP!
              </p>
              <p className={`text-lg sm:text-xl font-bold mb-1 ${visual.titleClass}`}>
                Level {fromLevel} → Level {toLevel}
              </p>
              <p className="text-white/95 text-base sm:text-lg font-semibold mb-2">{toTitle}</p>
              <p className="text-slate-400 text-sm font-medium">Önceki unvan: {fromTitle}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
