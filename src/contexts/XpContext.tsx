import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getTotalXP,
  addXP as addXpStorage,
  getLevel,
  getTitle,
  getXPProgress,
  type XPProgress,
} from '../utils/xpLevel';

type XpContextValue = {
  totalXP: number;
  level: number;
  title: string;
  xpProgress: XPProgress;
  addXP: (amount: number) => void;
};

const XpContext = createContext<XpContextValue | null>(null);

export function XpProvider({ children }: { children: React.ReactNode }) {
  const [totalXP, setTotalXP] = useState(getTotalXP);
  const [lastEarned, setLastEarned] = useState<number | null>(null);

  const addXP = useCallback((amount: number) => {
    const next = addXpStorage(amount);
    setTotalXP(next);
    setLastEarned(amount);
  }, []);

  useEffect(() => {
    if (lastEarned === null) return;
    const t = setTimeout(() => setLastEarned(null), 3000);
    return () => clearTimeout(t);
  }, [lastEarned]);

  const level = getLevel(totalXP);
  const title = getTitle(level);
  const xpProgress = getXPProgress(totalXP);

  return (
    <XpContext.Provider value={{ totalXP, level, title, xpProgress, addXP }}>
      {children}
      {lastEarned !== null && (
        <div
          className="fixed top-6 right-6 z-[100] rounded-xl bg-amber-500/95 dark:bg-amber-500 text-white px-4 py-2.5 shadow-lg shadow-amber-500/30 font-semibold text-sm flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <span aria-hidden>🌟</span>
          +{lastEarned} XP Kazanıldı!
        </div>
      )}
    </XpContext.Provider>
  );
}

export function useXp(): XpContextValue {
  const ctx = useContext(XpContext);
  if (!ctx) throw new Error('useXp must be used within XpProvider');
  return ctx;
}
