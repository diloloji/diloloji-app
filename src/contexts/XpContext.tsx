import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getTotalXP,
  setTotalXP as persistTotalXP,
  getLevel,
  getTitleForLevel,
  getXPProgress,
  getStreak,
  getLastActiveDate,
  getXpActivityHistory,
  addXpToActivityToday,
  updateStreakInStorage,
  type XPProgress,
  type XpActivityHistory,
} from '../utils/xpLevel';
import { claimSevenDayStreakMilestone } from '../utils/xpDailyBonuses';
import { runBadgeChecksAfterXp } from '../utils/xpBadges';
import LevelUpCelebration from '../components/LevelUpCelebration';
import BadgeToastHost from '../components/BadgeToastHost';

export type FloatingXpItem = { id: number; text: string; x: number; y: number };

export type XpContextValue = {
  /** Toplam XP (totalXP ile aynı) */
  xp: number;
  totalXP: number;
  level: number;
  title: string;
  levelTitle: string;
  xpProgress: XPProgress;
  /** Sonraki seviye eşiği (toplam XP), son seviyede null */
  xpForNextLevel: number | null;
  streak: number;
  lastActiveDate: string | null;
  activityHistory: XpActivityHistory;
  /** Pozitif XP ekler; seri milestone burada eklenir. Dönüş: yeni toplam XP */
  addXP: (amount: number) => number;
  /** Alıştırma doğrusu için yüzen metin (viewport koordinatları) */
  showFloatingXp: (text: string, x: number, y: number) => void;
};

const XpContext = createContext<XpContextValue | null>(null);

let floatingIdSeq = 0;

export function XpProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    runBadgeChecksAfterXp();
  }, []);

  const [totalXP, setTotalXP] = useState(getTotalXP);
  const [streak, setStreak] = useState(getStreak);
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(getLastActiveDate);
  const [activityHistory, setActivityHistory] = useState<XpActivityHistory>(getXpActivityHistory);
  const [floating, setFloating] = useState<FloatingXpItem[]>([]);
  const [celebration, setCelebration] = useState<{
    fromLevel: number;
    toLevel: number;
    fromTitle: string;
    toTitle: string;
  } | null>(null);

  const showFloatingXp = useCallback((text: string, x: number, y: number) => {
    const id = ++floatingIdSeq;
    setFloating((f) => [...f, { id, text, x, y }]);
    window.setTimeout(() => {
      setFloating((f) => f.filter((i) => i.id !== id));
    }, 1100);
  }, []);

  const addXP = useCallback((amount: number) => {
    const current = getTotalXP();
    const oldLevel = getLevel(current);
    const { newStreak, didUpdate } = updateStreakInStorage();
    setStreak(newStreak);
    setLastActiveDate(getLastActiveDate());

    const streakBonus = claimSevenDayStreakMilestone(newStreak, didUpdate);
    const totalDelta = Math.floor(amount) + streakBonus;
    const next = Math.max(0, current + totalDelta);
    persistTotalXP(next);
    setTotalXP(next);

    if (totalDelta > 0) {
      addXpToActivityToday(totalDelta);
      setActivityHistory(getXpActivityHistory());
    }

    const newLevel = getLevel(next);
    if (newLevel > oldLevel) {
      setCelebration({
        fromLevel: oldLevel,
        toLevel: newLevel,
        fromTitle: getTitleForLevel(oldLevel),
        toTitle: getTitleForLevel(newLevel),
      });
    }

    runBadgeChecksAfterXp();

    return next;
  }, []);

  const level = getLevel(totalXP);
  const title = getTitleForLevel(level);
  const xpProgress = getXPProgress(totalXP);

  const value: XpContextValue = {
    xp: totalXP,
    totalXP,
    level,
    title,
    levelTitle: title,
    xpProgress,
    xpForNextLevel: xpProgress.xpForNextLevel,
    streak,
    lastActiveDate,
    activityHistory,
    addXP,
    showFloatingXp,
  };

  return (
    <XpContext.Provider value={value}>
      {children}
      {floating.map((f) => (
        <div
          key={f.id}
          className="pointer-events-none fixed z-[150] text-sm font-bold text-amber-600 dark:text-amber-300 drop-shadow-md animate-xp-float"
          style={{ left: f.x, top: f.y, transform: 'translate(-50%, -50%)' }}
          role="status"
        >
          {f.text}
        </div>
      ))}
      <LevelUpCelebration
        open={celebration !== null}
        fromLevel={celebration?.fromLevel ?? 1}
        toLevel={celebration?.toLevel ?? 1}
        fromTitle={celebration?.fromTitle ?? ''}
        toTitle={celebration?.toTitle ?? ''}
        onClose={() => setCelebration(null)}
      />
      <BadgeToastHost />
      <style>{`
        @keyframes xp-float-up {
          0% { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
          100% { opacity: 0; transform: translate(-50%, -50%) translateY(-48px); }
        }
        .animate-xp-float {
          animation: xp-float-up 1s ease-out forwards;
        }
      `}</style>
    </XpContext.Provider>
  );
}

export function useXp(): XpContextValue {
  const ctx = useContext(XpContext);
  if (!ctx) throw new Error('useXp must be used within XpProvider');
  return ctx;
}

/** İstenen API ile uyumlu alias */
export function useXP(): XpContextValue {
  return useXp();
}
