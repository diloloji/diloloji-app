/**
 * Global XP ve Seviye (Level) sistemi — localStorage ile kalıcı.
 */

const STORAGE_KEY = 'conjume-total-xp';

const XP_PER_LEVEL = 100;

export function getTotalXP(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setTotalXP(value: number): void {
  if (typeof window === 'undefined') return;
  const n = Math.max(0, Math.floor(value));
  try {
    window.localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    // ignore
  }
}

export function addXP(amount: number): number {
  const next = getTotalXP() + Math.max(0, Math.floor(amount));
  setTotalXP(next);
  return next;
}

/** Seviye: her 100 XP bir seviye. Seviye 1 = 0–99 XP, 2 = 100–199, vb. */
export function getLevel(totalXP: number): number {
  return Math.floor(totalXP / XP_PER_LEVEL) + 1;
}

/** Seviyeye göre unvan */
export function getTitle(level: number): string {
  if (level <= 3) return 'Turist';
  if (level <= 7) return 'Çırak';
  if (level <= 12) return 'Dilbilimci';
  if (level <= 14) return 'Uzman';
  return 'Poliglot';
}

export type XPProgress = {
  level: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  percent: number;
};

/** Bir sonraki seviyeye ilerleme: 0–100 yüzde ve mevcut XP (seviye içi). */
export function getXPProgress(totalXP: number): XPProgress {
  const level = getLevel(totalXP);
  const xpInCurrentLevel = totalXP % XP_PER_LEVEL;
  const xpNeededForNext = XP_PER_LEVEL;
  const percent = xpNeededForNext > 0 ? Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100) : 100;
  return { level, xpInCurrentLevel, xpNeededForNext, percent };
}

/** Günlük seri — localStorage anahtarları */
const STREAK_KEY = 'conjume-streak';
const LAST_ACTIVE_KEY = 'conjume-last-active-date';
const BEST_STREAK_KEY = 'conjume-best-streak';

export function getBestStreakEver(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(BEST_STREAK_KEY);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function bumpBestStreakIfNeeded(streak: number): void {
  if (typeof window === 'undefined') return;
  const cur = getBestStreakEver();
  if (streak > cur) {
    try {
      window.localStorage.setItem(BEST_STREAK_KEY, String(Math.floor(streak)));
    } catch {
      /* ignore */
    }
  }
}

export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getStreak(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setStreak(value: number): void {
  if (typeof window === 'undefined') return;
  const n = Math.max(0, Math.floor(value));
  try {
    window.localStorage.setItem(STREAK_KEY, String(n));
  } catch {
    // ignore
  }
}

export function getLastActiveDate(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_ACTIVE_KEY);
    return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setLastActiveDate(dateStr: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_ACTIVE_KEY, dateStr);
  } catch {
    // ignore
  }
}

/** Seri güncellemesi — saf; bulut senkronu için storage yazmadan hesaplar. */
export function computeStreakForActivity(args: {
  lastActiveDate: string | null;
  streak: number;
}): { newStreak: number; didUpdate: boolean; newLastActive: string } {
  const today = getTodayString();
  const yesterday = getYesterdayString();
  const last = args.lastActiveDate;
  let streak = args.streak;

  if (!last || last < yesterday) {
    streak = 1;
  } else if (last === yesterday) {
    streak += 1;
  } else if (last === today) {
    return { newStreak: streak, didUpdate: false, newLastActive: today };
  } else {
    streak = 1;
  }

  return { newStreak: streak, didUpdate: true, newLastActive: today };
}

export function updateStreakInStorage(): { newStreak: number; didUpdate: boolean } {
  const { newStreak, didUpdate, newLastActive } = computeStreakForActivity({
    lastActiveDate: getLastActiveDate(),
    streak: getStreak(),
  });
  if (!didUpdate) {
    setLastActiveDate(newLastActive);
    return { newStreak, didUpdate: false };
  }
  setStreak(newStreak);
  bumpBestStreakIfNeeded(newStreak);
  setLastActiveDate(newLastActive);
  return { newStreak, didUpdate: true };
}

const XP_ACTIVITY_KEY = 'conjume-xp-activity';

export type XpActivityHistory = Record<string, number>;

export function getXpActivityHistory(): XpActivityHistory {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(XP_ACTIVITY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: XpActivityHistory = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'number' && v >= 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function addXpToActivityToday(amount: number): void {
  if (typeof window === 'undefined' || amount <= 0) return;
  const today = getTodayString();
  const data = getXpActivityHistory();
  data[today] = (data[today] ?? 0) + Math.floor(amount);
  try {
    window.localStorage.setItem(XP_ACTIVITY_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}
