import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getTotalXP,
  addXP as addXpStorage,
  getLevel,
  getTitle,
  getXPProgress,
  getStreak,
  getLastActiveDate,
  getXpActivityHistory,
  addXpToActivityToday,
  updateStreakInStorage,
  type XPProgress,
  type XpActivityHistory,
} from '../utils/xpLevel';

type XpContextValue = {
  totalXP: number;
  level: number;
  title: string;
  xpProgress: XPProgress;
  streak: number;
  lastActiveDate: string | null;
  activityHistory: XpActivityHistory;
  addXP: (amount: number) => void;
};

const XpContext = createContext<XpContextValue | null>(null);

export function XpProvider({ children }: { children: React.ReactNode }) {
  const [totalXP, setTotalXP] = useState(getTotalXP);
  const [streak, setStreak] = useState(getStreak);
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(getLastActiveDate);
  const [activityHistory, setActivityHistory] = useState<XpActivityHistory>(getXpActivityHistory);
  const [lastEarned, setLastEarned] = useState<number | null>(null);
  /** Seviye atlama: yeni seviye numarası, null ise atlama yok */
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  /** Günlük seri toast: gösterilecek seri değeri (null = gösterme) */
  const [streakToast, setStreakToast] = useState<number | null>(null);

  const addXP = useCallback((amount: number) => {
    const current = getTotalXP();
    const next = addXpStorage(amount);
    const oldLevel = getLevel(current);
    const newLevel = getLevel(next);
    setTotalXP(next);
    setLastEarned(amount);
    if (newLevel > oldLevel) setLevelUpTo(newLevel);

    addXpToActivityToday(amount);
    setActivityHistory(getXpActivityHistory());

    const { newStreak, didUpdate } = updateStreakInStorage();
    setStreak(newStreak);
    setLastActiveDate(getLastActiveDate());
    if (didUpdate) setStreakToast(newStreak);
  }, []);

  useEffect(() => {
    if (lastEarned === null) return;
    const t = setTimeout(() => setLastEarned(null), 3200);
    return () => clearTimeout(t);
  }, [lastEarned]);

  useEffect(() => {
    if (levelUpTo === null) return;
    const t = setTimeout(() => setLevelUpTo(null), 4000);
    return () => clearTimeout(t);
  }, [levelUpTo]);

  const level = getLevel(totalXP);
  const title = getTitle(level);
  const xpProgress = getXPProgress(totalXP);

  useEffect(() => {
    if (streakToast === null) return;
    const t = setTimeout(() => setStreakToast(null), 3500);
    return () => clearTimeout(t);
  }, [streakToast]);

  return (
    <XpContext.Provider value={{ totalXP, level, title, xpProgress, streak, lastActiveDate, activityHistory, addXP }}>
      {children}
      {/* Başarı toast: Tebrikler! +X XP Kazandın. */}
      {lastEarned !== null && (
        <div
          className="fixed top-6 right-6 z-[100] rounded-xl bg-amber-500/95 dark:bg-amber-500 text-white px-4 py-2.5 shadow-lg shadow-amber-500/30 font-semibold text-sm flex items-center gap-2 animate-menu-in"
          role="status"
          aria-live="polite"
        >
          <span aria-hidden>🌟</span>
          Tebrikler! +{lastEarned} XP Kazandın.
        </div>
      )}
      {/* Seviye atlama toast — daha coşkulu */}
      {levelUpTo !== null && (
        <div
          className="fixed top-36 right-6 z-[100] rounded-xl bg-gradient-to-r from-indigo-500 to-amber-500 text-white px-5 py-3 shadow-xl shadow-indigo-500/30 font-bold text-sm flex items-center gap-2 animate-menu-in"
          role="status"
          aria-live="polite"
        >
          <span aria-hidden>🎉</span>
          Seviye Atladın! Yeni Seviye: {levelUpTo}
        </div>
      )}
      {/* Günlük seri toast */}
      {streakToast !== null && (
        <div
          className="fixed top-20 right-6 z-[100] rounded-xl bg-amber-500/95 dark:bg-amber-500 text-white px-4 py-2.5 shadow-lg shadow-amber-500/30 font-semibold text-sm flex items-center gap-2 animate-menu-in"
          role="status"
          aria-live="polite"
        >
          <span aria-hidden>🔥</span>
          Günlük hedefini tamamladın! Serin {streakToast} güne çıktı.
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
