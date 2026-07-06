/**
 * Alıştırma ile ilişkili günlük XP bonusları (localStorage).
 */
import { getTodayString } from './xpLevel';
import { isGamificationEnabled } from './gamificationGate';

const KEY_FIRST_QUIZ_XP = 'diloloji-xp-daily-first-quiz';
const KEY_VERBS_DAY = 'diloloji-xp-quiz-verbs-date';
const KEY_VERBS_JSON = 'diloloji-xp-quiz-verbs-json';
const KEY_STREAK_MILESTONE = 'diloloji-xp-streak-milestone-awarded';

type VerbsDay = { date: string; verbs: string[] };

function loadVerbsToday(): VerbsDay {
  const today = getTodayString();
  try {
    const d = localStorage.getItem(KEY_VERBS_DAY);
    const j = localStorage.getItem(KEY_VERBS_JSON);
    if (d !== today || !j) return { date: today, verbs: [] };
    const verbs = JSON.parse(j) as unknown;
    if (!Array.isArray(verbs)) return { date: today, verbs: [] };
    return { date: today, verbs: verbs.filter((v) => typeof v === 'string') };
  } catch {
    return { date: today, verbs: [] };
  }
}

function saveVerbsToday(data: VerbsDay): void {
  try {
    localStorage.setItem(KEY_VERBS_DAY, data.date);
    localStorage.setItem(KEY_VERBS_JSON, JSON.stringify(data.verbs));
  } catch {
    // ignore
  }
}

/** Bugün bu fiille ilk kez alıştırma XP’si kazanılıyorsa +15 (bir kez / fiil / gün). */
export function claimDifferentVerbBonus(verbKey: string): number {
  if (!isGamificationEnabled()) return 0;
  const v = verbKey.trim().toLowerCase();
  if (!v) return 0;
  let data = loadVerbsToday();
  const today = getTodayString();
  if (data.date !== today) data = { date: today, verbs: [] };
  if (data.verbs.some((x) => x.toLowerCase() === v)) return 0;
  data.verbs.push(verbKey.trim());
  saveVerbsToday(data);
  return 15;
}

/** Gün içinde ilk alıştırma XP etkinliğinde +25 (bir kez / gün). */
export function claimFirstDailyQuizBonus(): number {
  if (!isGamificationEnabled()) return 0;
  const today = getTodayString();
  try {
    if (localStorage.getItem(KEY_FIRST_QUIZ_XP) === today) return 0;
    localStorage.setItem(KEY_FIRST_QUIZ_XP, today);
  } catch {
    return 0;
  }
  return 25;
}

/**
 * Seri 7’nin katına ulaşıldığında ve bu milestone için ödül verilmediyse +100.
 * `didUpdate`: updateStreakInStorage’ın bugün seriyi gerçekten güncellediği an.
 */
export function claimSevenDayStreakMilestone(newStreak: number, didUpdate: boolean): number {
  if (!didUpdate || newStreak < 7) return 0;
  const milestone = Math.floor(newStreak / 7) * 7;
  if (milestone < 7) return 0;
  try {
    const raw = localStorage.getItem(KEY_STREAK_MILESTONE);
    const last = raw ? Number(raw) : 0;
    if (!Number.isFinite(last) || milestone <= last) return 0;
    localStorage.setItem(KEY_STREAK_MILESTONE, String(milestone));
  } catch {
    return 0;
  }
  return 100;
}
