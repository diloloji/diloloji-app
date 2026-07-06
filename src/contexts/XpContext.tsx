import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  getTotalXP,
  setTotalXP as persistTotalXP,
  getLevel,
  getTitle,
  getXPProgress,
  getStreak,
  getLastActiveDate,
  getXpActivityHistory,
  addXpToActivityToday,
  updateStreakInStorage,
  computeStreakForActivity,
  getTodayString,
  getBestStreakEver,
  type XPProgress,
  type XpActivityHistory,
} from '../utils/xpLevel';
import { claimSevenDayStreakMilestone } from '../utils/xpDailyBonuses';
import { runBadgeChecksAfterXp } from '../utils/xpBadges';
import BadgeToastHost from '../components/BadgeToastHost';
import { useAuth } from './AuthContext';
import { fetchUserXpRow, upsertUserXpRow, upsertActivityLogDay } from '../lib/userProgressDb';

export type FloatingXpItem = { id: number; text: string; x: number; y: number };

export type XpContextValue = {
  /** Toplam XP (totalXP ile aynı) */
  xp: number;
  totalXP: number;
  level: number;
  title: string;
  xpProgress: XPProgress;
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

type CloudSnap = {
  totalXP: number;
  streak: number;
  lastActive: string | null;
  activity: XpActivityHistory;
  bestStreakEver: number;
};

export function XpProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    runBadgeChecksAfterXp();
  }, []);

  const [totalXP, setTotalXP] = useState(getTotalXP);
  const [streak, setStreak] = useState(getStreak);
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(getLastActiveDate);
  const [activityHistory, setActivityHistory] = useState<XpActivityHistory>(getXpActivityHistory);
  const [bestStreakEver, setBestStreakEver] = useState(getBestStreakEver);
  const [floating, setFloating] = useState<FloatingXpItem[]>([]);
  /** Seviye atlama: yeni seviye numarası, null ise atlama yok */
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);

  const cloudSnapRef = useRef<CloudSnap>({
    totalXP: 0,
    streak: 0,
    lastActive: null,
    activity: {},
    bestStreakEver: 0,
  });

  useLayoutEffect(() => {
    cloudSnapRef.current = {
      totalXP,
      streak,
      lastActive: lastActiveDate,
      activity: activityHistory,
      bestStreakEver,
    };
  }, [totalXP, streak, lastActiveDate, activityHistory, bestStreakEver]);

  const hydrateFromSupabase = useCallback((uid: string) => {
    void fetchUserXpRow(uid).then((row) => {
      if (!row) return;
      setTotalXP(row.total_xp);
      setStreak(row.streak);
      setLastActiveDate(row.last_active_date);
      setActivityHistory((row.xp_activity as XpActivityHistory) ?? {});
      setBestStreakEver(row.best_streak ?? row.streak ?? 0);
    });
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setTotalXP(getTotalXP());
      setStreak(getStreak());
      setLastActiveDate(getLastActiveDate());
      setActivityHistory(getXpActivityHistory());
      setBestStreakEver(getBestStreakEver());
      return;
    }
    hydrateFromSupabase(user.id);
  }, [user?.id, hydrateFromSupabase]);

  useEffect(() => {
    if (!user?.id) return;
    const onRemote = () => hydrateFromSupabase(user.id);
    window.addEventListener('diloloji-remote-progress-loaded', onRemote);
    return () => window.removeEventListener('diloloji-remote-progress-loaded', onRemote);
  }, [user?.id, hydrateFromSupabase]);

  useEffect(() => {
    if (levelUpTo === null) return;
    const t = window.setTimeout(() => setLevelUpTo(null), 4000);
    return () => window.clearTimeout(t);
  }, [levelUpTo]);

  const showFloatingXp = useCallback((text: string, x: number, y: number) => {
    const id = ++floatingIdSeq;
    setFloating((f) => [...f, { id, text, x, y }]);
    window.setTimeout(() => {
      setFloating((f) => f.filter((i) => i.id !== id));
    }, 1100);
  }, []);

  const addXP = useCallback(
    (amount: number) => {
      if (!user?.id) {
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
        setBestStreakEver(getBestStreakEver());

        if (totalDelta > 0) {
          addXpToActivityToday(totalDelta);
          setActivityHistory(getXpActivityHistory());
        }

        const newLevel = getLevel(next);
        if (newLevel > oldLevel) setLevelUpTo(newLevel);

        runBadgeChecksAfterXp();
        return next;
      }

      const uid = user.id;
      const snap = cloudSnapRef.current;
      const oldLevel = getLevel(snap.totalXP);
      const { newStreak, didUpdate, newLastActive } = computeStreakForActivity({
        lastActiveDate: snap.lastActive,
        streak: snap.streak,
      });
      const streakBonus = claimSevenDayStreakMilestone(newStreak, didUpdate);
      const totalDelta = Math.floor(amount) + streakBonus;
      const next = Math.max(0, snap.totalXP + totalDelta);
      const nextBest = Math.max(snap.bestStreakEver, newStreak);

      const nextActivity = { ...snap.activity };
      if (totalDelta > 0) {
        const today = getTodayString();
        nextActivity[today] = (nextActivity[today] ?? 0) + totalDelta;
      }

      setStreak(newStreak);
      setLastActiveDate(newLastActive);
      setTotalXP(next);
      setActivityHistory(nextActivity);
      setBestStreakEver(nextBest);

      void upsertUserXpRow({
        id: uid,
        total_xp: next,
        streak: newStreak,
        last_active_date: newLastActive,
        best_streak: nextBest,
        xp_activity: nextActivity,
      });
      if (totalDelta > 0) {
        void upsertActivityLogDay(uid, getTodayString(), totalDelta, 0);
      }

      const newLevel = getLevel(next);
      if (newLevel > oldLevel) setLevelUpTo(newLevel);

      runBadgeChecksAfterXp();
      return next;
    },
    [user?.id]
  );

  const level = getLevel(totalXP);
  const title = getTitle(level);
  const xpProgress = getXPProgress(totalXP);

  const value: XpContextValue = {
    xp: totalXP,
    totalXP,
    level,
    title,
    xpProgress,
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
