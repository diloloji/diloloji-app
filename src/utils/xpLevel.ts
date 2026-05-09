/**
 * Global XP ve seviye — localStorage. 20 seviye tablosu (eşik = o seviyeye giriş için minimum toplam XP).
 */

const STORAGE_KEY = 'conjume-total-xp';

/** Level L için minimum toplam XP (L = 1..20). Level 1 → 0, Level 2 → 100, … */
export const LEVEL_THRESHOLD_XP: readonly number[] = [
  0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500, 10000, 13000, 16500, 20500, 25000, 30000, 36000,
  43000, 51000, 60000,
] as const;

export const LEVEL_TITLES: readonly string[] = [
  'Acemi',
  'Meraklı',
  'İstekli',
  'Öğrenci',
  'Çalışkan',
  'Azimli',
  'Becerikli',
  'Yetenekli',
  'Ustalaşan',
  'Usta',
  'Uzman',
  'İleri Uzman',
  'Dil Avcısı',
  'Sözcük Ustası',
  'Gramer Üstadı',
  'Dil Şampiyonu',
  'Efsanevi',
  'Dilbilimci',
  'Grandmaster',
  'El Maestro',
] as const;

export const MAX_LEVEL = LEVEL_TITLES.length;

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

export function addXPToStorage(amount: number): number {
  const next = getTotalXP() + Math.max(0, Math.floor(amount));
  setTotalXP(next);
  return next;
}

/** 1..MAX_LEVEL */
export function getLevel(totalXP: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLD_XP.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLD_XP[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(MAX_LEVEL, Math.max(1, level));
}

export function getTitleForLevel(level: number): string {
  const idx = Math.min(MAX_LEVEL, Math.max(1, level)) - 1;
  return LEVEL_TITLES[idx] ?? LEVEL_TITLES[0];
}

/** @deprecated alias — use getTitleForLevel */
export function getTitle(level: number): string {
  return getTitleForLevel(level);
}

export type XPProgress = {
  level: number;
  levelTitle: string;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  percent: number;
  /** Bir sonraki seviye eşiği (toplam XP); son seviyede null */
  xpForNextLevel: number | null;
  totalXP: number;
};

export function getXPProgress(totalXP: number): XPProgress {
  const level = getLevel(totalXP);
  const title = getTitleForLevel(level);
  const start = LEVEL_THRESHOLD_XP[level - 1] ?? 0;
  if (level >= MAX_LEVEL) {
    return {
      level,
      levelTitle: title,
      xpInCurrentLevel: totalXP - start,
      xpNeededForNext: 0,
      percent: 100,
      xpForNextLevel: null,
      totalXP,
    };
  }
  const nextStart = LEVEL_THRESHOLD_XP[level];
  const span = nextStart - start;
  const xpIn = totalXP - start;
  const percent = span > 0 ? Math.min(100, Math.max(0, (xpIn / span) * 100)) : 100;
  return {
    level,
    levelTitle: title,
    xpInCurrentLevel: xpIn,
    xpNeededForNext: span,
    percent,
    xpForNextLevel: nextStart,
    totalXP,
  };
}

/** Günlük seri — localStorage anahtarları */
const STREAK_KEY = 'conjume-streak';
const LAST_ACTIVE_KEY = 'conjume-last-active-date';

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

export function updateStreakInStorage(): { newStreak: number; didUpdate: boolean } {
  const today = getTodayString();
  const yesterday = getYesterdayString();
  const last = getLastActiveDate();
  let streak = getStreak();

  if (!last || last < yesterday) {
    streak = 1;
  } else if (last === yesterday) {
    streak += 1;
  } else if (last === today) {
    setLastActiveDate(today);
    return { newStreak: streak, didUpdate: false };
  } else {
    streak = 1;
  }

  setStreak(streak);
  setLastActiveDate(today);
  return { newStreak: streak, didUpdate: true };
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

/**
 * Toplam XP ekler (storage). Geriye kalan toplam XP.
 * @deprecated — doğrudan addXPToStorage kullanın; XpContext addXP sarmalar.
 */
export function addXP(amount: number): number {
  return addXPToStorage(amount);
}
