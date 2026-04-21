/**
 * Günlük hedef yönetimi: Günde en az `DAILY_GOAL` doğru çekim ile streak korunur.
 * Aktivite sayacı `activityHistory`tan okunur (her doğru çekim = +1).
 * Sayfa başlığı (`document.title`) hedef tamamlanmadıysa bir hatırlatma rozeti içerir.
 */
import { getActivityHistory, getCurrentStreak } from './activityHistory';

export const DAILY_GOAL = 10;

const TITLE_REGEX = /^\(\d+\/\d+\)\s/;

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Bugün için yapılan doğru çekim sayısı (activityHistory'den okunur). */
export function getTodayCount(): number {
  const history = getActivityHistory();
  return history[getTodayKey()] ?? 0;
}

/** Hedefe ulaşıldı mı? */
export function isDailyGoalMet(): boolean {
  return getTodayCount() >= DAILY_GOAL;
}

/** 0–100 arası ilerleme yüzdesi. */
export function getDailyProgressPercent(): number {
  return Math.min(100, Math.round((getTodayCount() / DAILY_GOAL) * 100));
}

/** Streak ve günlük sayaç gibi özet bilgi. */
export type DailyGoalSummary = {
  todayCount: number;
  goal: number;
  remaining: number;
  metToday: boolean;
  streak: number;
  percent: number;
};

export function getDailyGoalSummary(): DailyGoalSummary {
  const todayCount = getTodayCount();
  const goal = DAILY_GOAL;
  const remaining = Math.max(0, goal - todayCount);
  const metToday = todayCount >= goal;
  const streak = getCurrentStreak();
  const percent = Math.min(100, Math.round((todayCount / goal) * 100));
  return { todayCount, goal, remaining, metToday, streak, percent };
}

/**
 * Hedef tamamlanmadıysa sayfa başlığına `(n/10)` öneki ekler;
 * tamamlandıysa ön ek temizlenir. Mevcut başlığı korur.
 */
export function updateDocumentTitle(): void {
  if (typeof document === 'undefined') return;
  const cleanTitle = document.title.replace(TITLE_REGEX, '');
  const todayCount = getTodayCount();
  if (todayCount >= DAILY_GOAL) {
    if (document.title !== cleanTitle) document.title = cleanTitle;
    return;
  }
  const prefix = `(${todayCount}/${DAILY_GOAL}) `;
  document.title = prefix + cleanTitle;
}
