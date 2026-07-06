import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Toast = { id: number; emoji: string; name: string };

let toastSeq = 0;

/**
 * Rozet kazanımı toast'ları — `diloloji-badge-unlocked` CustomEvent dinler.
 */
export default function BadgeToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const onBadge = (e: Event) => {
      const ce = e as CustomEvent<{ emoji?: string; name?: string }>;
      const emoji = ce.detail?.emoji ?? '🏅';
      const name = ce.detail?.name ?? 'Rozet';
      const id = ++toastSeq;
      setItems((t) => [...t, { id, emoji, name }]);
      window.setTimeout(() => {
        setItems((t) => t.filter((x) => x.id !== id));
      }, 4200);
    };
    window.addEventListener('diloloji-badge-unlocked', onBadge);
    return () => window.removeEventListener('diloloji-badge-unlocked', onBadge);
  }, []);

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[280] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none px-3 w-full max-w-md"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="pointer-events-auto w-full rounded-2xl border border-amber-400/40 bg-gradient-to-r from-slate-900/98 via-slate-800/98 to-slate-900/98 px-4 py-3 shadow-2xl shadow-amber-500/15 ring-1 ring-white/10 backdrop-blur-md"
          >
            <p className="text-center text-sm font-bold text-white">
              <span className="mr-1.5" aria-hidden>
                {t.emoji}
              </span>
              Yeni Rozet: <span className="text-amber-200">{t.name}</span>!
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
