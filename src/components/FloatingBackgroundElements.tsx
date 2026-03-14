import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

const PARALLAX_STRENGTH = 12;

const SYMBOLS: { char: string; left: number; top: number; rotationDuration: number }[] = [
  { char: 'Σ', left: 8, top: 14, rotationDuration: 22 },
  { char: 'Π', left: 86, top: 20, rotationDuration: 25 },
  { char: 'λ', left: 14, top: 48, rotationDuration: 20 },
  { char: 'Ω', left: 78, top: 72, rotationDuration: 26 },
  { char: 'π', left: 72, top: 35, rotationDuration: 24 },
  { char: 'σ', left: 6, top: 68, rotationDuration: 19 },
  { char: '∑', left: 88, top: 55, rotationDuration: 23 },
  { char: '∫', left: 22, top: 28, rotationDuration: 27 },
  { char: '∂', left: 92, top: 82, rotationDuration: 21 },
  { char: 'ω', left: 48, top: 8, rotationDuration: 18 },
  { char: 'θ', left: 52, top: 78, rotationDuration: 28 },
  { char: '√', left: 38, top: 42, rotationDuration: 25 },
];

export default function FloatingBackgroundElements() {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const centerX = 0.5;
  const centerY = 0.5;
  const parallaxX = useMemo(
    () => (mouse.x - centerX) * -PARALLAX_STRENGTH,
    [mouse.x]
  );
  const parallaxY = useMemo(
    () => (mouse.y - centerY) * -PARALLAX_STRENGTH,
    [mouse.y]
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      aria-hidden
    >
      {SYMBOLS.map((s, i) => (
        <motion.span
          key={`fb-${i}`}
          className="absolute font-light text-slate-400/30 dark:text-white/25 text-2xl sm:text-3xl md:text-4xl origin-center"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            x: parallaxX,
            y: parallaxY,
            textShadow: '0 0 24px rgba(255,255,255,0.08)',
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: s.rotationDuration,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {s.char}
        </motion.span>
      ))}
    </div>
  );
}
