/**
 * Aktivite geçmişi: Günlük doğru cevap sayıları (GitHub heatmap için).
 * Format: { 'YYYY-MM-DD': count, ... }
 */
import { isGamificationEnabled } from './gamificationGate';

const STORAGE_KEY = 'diloloji-activity-history';

export type ActivityHistory = Record<string, number>;

/** Yerel takvim günü YYYY-MM-DD (heatmap / XP ile aynı anahtar). */
export function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayKey(): string {
  return formatLocalYMD(new Date());
}

function storageGet(): ActivityHistory {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: ActivityHistory = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === 'string' && typeof v === 'number' && v >= 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function storageSet(data: ActivityHistory): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/** Tüm aktivite geçmişini döner. */
export function getActivityHistory(): ActivityHistory {
  return storageGet();
}

/** Bugünün tarihi için sayacı n artırır (her doğru cevapta 1). */
export function addActivityToday(n: number): void {
  if (!isGamificationEnabled()) return;
  if (n <= 0) return;
  const key = getTodayKey();
  const data = storageGet();
  data[key] = (data[key] ?? 0) + n;
  storageSet(data);
}

/** Son N günün tarih listesini (YYYY-MM-DD) döner, en eski ilk. */
export function getLastNDays(numDays: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = numDays - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - i);
    out.push(formatLocalYMD(x));
  }
  return out;
}

/** Bugünden geriye doğru üst üste kaç gün aktivite yapıldığını döner (günlük seri). */
export function getCurrentStreak(): number {
  const history = storageGet();
  const today = getTodayKey();
  if ((history[today] ?? 0) === 0) return 0;
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if ((history[key] ?? 0) > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
