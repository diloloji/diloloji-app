/**
 * Haftalık maksimum combo (Pzt başlangıçlı hafta, yerel saat).
 */
const WEEKLY_COMBO_KEY = 'conjume-weekly-max-combo';
const ALLTIME_COMBO_KEY = 'conjume-alltime-max-combo';

function readAllTimeCombo(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(ALLTIME_COMBO_KEY);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function bumpAllTimeCombo(c: number): void {
  if (typeof window === 'undefined' || c <= 0) return;
  const cur = readAllTimeCombo();
  const next = Math.max(cur, Math.floor(c));
  if (next > cur) {
    try {
      window.localStorage.setItem(ALLTIME_COMBO_KEY, String(next));
    } catch {
      /* ignore */
    }
  }
}

export function getAllTimeMaxCombo(): number {
  return readAllTimeCombo();
}

function mondayKey(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dayStr = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

function readWeeklyCombo(): { week: string; max: number } {
  if (typeof window === 'undefined') return { week: mondayKey(new Date()), max: 0 };
  try {
    const raw = window.localStorage.getItem(WEEKLY_COMBO_KEY);
    if (!raw) return { week: mondayKey(new Date()), max: 0 };
    const o = JSON.parse(raw) as { week?: string; max?: number };
    const wk = typeof o.week === 'string' ? o.week : mondayKey(new Date());
    const max = typeof o.max === 'number' && o.max >= 0 ? o.max : 0;
    return { week: wk, max };
  } catch {
    return { week: mondayKey(new Date()), max: 0 };
  }
}

export function recordWeeklyCombo(combo: number): void {
  if (typeof window === 'undefined' || combo <= 0) return;
  const currentWeek = mondayKey(new Date());
  let { week, max } = readWeeklyCombo();
  if (week !== currentWeek) {
    week = currentWeek;
    max = 0;
  }
  max = Math.max(max, Math.floor(combo));
  bumpAllTimeCombo(combo);
  try {
    window.localStorage.setItem(WEEKLY_COMBO_KEY, JSON.stringify({ week, max }));
  } catch {
    /* ignore */
  }
}

export function getWeeklyMaxCombo(): number {
  const currentWeek = mondayKey(new Date());
  const { week, max } = readWeeklyCombo();
  return week === currentWeek ? max : 0;
}
