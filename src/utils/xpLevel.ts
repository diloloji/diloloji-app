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
