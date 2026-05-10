import {
  fetchUserXpRow,
  upsertUserXpRow,
  fetchAllVerbMastery,
  upsertVerbMasteryRow,
  upsertUserFavorites,
  fetchUserFavorites,
  fetchActivityLog,
  replaceActivityLogDay,
} from './userProgressDb';
import { loadMasteryStore, importMasteryStoreSnapshot, MASTERY_STORAGE_KEY, type MasteryRecord } from '../data/masterySystem';
import {
  getTotalXP,
  setTotalXP,
  getStreak,
  setStreak,
  getLastActiveDate,
  setLastActiveDate,
  getBestStreakEver,
  getXpActivityHistory,
  type XpActivityHistory,
} from '../utils/xpLevel';
import { getStarredVerbs } from '../utils/starredVerbs';

const BEST_STREAK_KEY = 'conjume-best-streak';

/** Girişte buluta taşınan / çıkışta geri yüklenen anahtarlar */
export const CONJUME_SYNC_STORAGE_KEYS = [
  'conjume-total-xp',
  'conjume-streak',
  'conjume-last-active-date',
  'conjume-best-streak',
  'conjume-xp-activity',
  MASTERY_STORAGE_KEY,
  'conjume-starred-verbs',
] as const;

function hasMeaningfulLocalProgress(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (getTotalXP() > 0) return true;
    if (getStreak() > 0) return true;
    const xpAct = getXpActivityHistory();
    if (Object.keys(xpAct).length > 0) return true;
    const m = loadMasteryStore();
    if (Object.keys(m).length > 0) return true;
    if (getStarredVerbs().length > 0) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function mergeXpActivity(a: XpActivityHistory, b: XpActivityHistory): XpActivityHistory {
  const out: XpActivityHistory = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === 'number' && v >= 0) {
      out[k] = Math.max(out[k] ?? 0, v);
    }
  }
  return out;
}

function mergeMastery(local: Record<string, MasteryRecord>, remoteList: MasteryRecord[]): Record<string, MasteryRecord> {
  const out: Record<string, MasteryRecord> = { ...local };
  for (const r of remoteList) {
    const cur = out[r.key];
    if (!cur || (r.totalCorrect ?? 0) > (cur.totalCorrect ?? 0) || (r.masteryLevel ?? 0) > (cur.masteryLevel ?? 0)) {
      out[r.key] = r;
    }
  }
  return out;
}

/**
 * Misafir verisini buluta birleştirir; anlamlı yerel veri yoksa yalnızca satırın varlığını garanti eder.
 * Yerel anahtarlar, başarılı yüklemeden sonra temizlenir.
 */
export async function syncLocalProgressToSupabase(userId: string): Promise<void> {
  const remote = await fetchUserXpRow(userId);
  const localXp = getTotalXP();
  const localStreak = getStreak();
  const localLast = getLastActiveDate();
  const localBest = getBestStreakEver();
  const localXpAct = getXpActivityHistory();
  const localMastery = loadMasteryStore();
  const localStarred = getStarredVerbs();

  const mergedXp = Math.max(remote?.total_xp ?? 0, localXp);
  const mergedStreak = Math.max(remote?.streak ?? 0, localStreak);
  const mergedBest = Math.max(remote?.best_streak ?? 0, localBest, mergedStreak);
  let mergedLast = localLast;
  if (remote?.last_active_date && localLast) {
    mergedLast = remote.last_active_date > localLast ? remote.last_active_date : localLast;
  } else {
    mergedLast = remote?.last_active_date ?? localLast;
  }
  const mergedActivity = mergeXpActivity(localXpAct, (remote?.xp_activity as XpActivityHistory) ?? {});

  await upsertUserXpRow({
    id: userId,
    total_xp: mergedXp,
    streak: mergedStreak,
    last_active_date: mergedLast,
    best_streak: mergedBest,
    xp_activity: mergedActivity,
  });

  const mergedMastery = mergeMastery(localMastery, await fetchAllVerbMastery(userId));
  for (const rec of Object.values(mergedMastery)) {
    const lang = (rec.key.split('_')[0] === 'fr' ? 'fr' : 'es') as 'es' | 'fr';
    const verb = rec.verb ?? rec.key.split('_')[1] ?? '';
    const tense = rec.tense ?? '';
    const person = rec.person ?? '';
    if (!verb || !tense || !person) continue;
    await upsertVerbMasteryRow(userId, lang, verb, tense, person, rec);
  }

  const remoteFav = await fetchUserFavorites(userId);
  const favSet = new Set([...remoteFav.map((x) => x.toLowerCase()), ...localStarred.map((x) => x.toLowerCase())]);
  await upsertUserFavorites(userId, [...favSet]);

  for (const [day, xp] of Object.entries(mergedActivity)) {
    if (typeof xp === 'number' && xp > 0 && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
      await replaceActivityLogDay(userId, day, xp, 0);
    }
  }

  if (hasMeaningfulLocalProgress()) {
    for (const k of CONJUME_SYNC_STORAGE_KEYS) {
      try {
        window.localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  }

  window.dispatchEvent(new CustomEvent('conjume-remote-progress-loaded'));
  window.dispatchEvent(new CustomEvent('conjume-mastery-changed'));
}

/**
 * Çıkış öncesi buluttaki ilerlemeyi tekrar localStorage'a yazar (misafir modu).
 */
export async function syncSupabaseProgressToLocal(userId: string): Promise<void> {
  const row = await fetchUserXpRow(userId);
  if (row) {
    setTotalXP(row.total_xp);
    setStreak(row.streak);
    if (row.last_active_date) setLastActiveDate(row.last_active_date);
    try {
      window.localStorage.setItem(BEST_STREAK_KEY, String(row.best_streak ?? 0));
    } catch {
      /* ignore */
    }
    try {
      window.localStorage.setItem('conjume-xp-activity', JSON.stringify(row.xp_activity ?? {}));
    } catch {
      /* ignore */
    }
  }

  const log = await fetchActivityLog(userId);
  const xpHist = getXpActivityHistory();
  const merged = mergeXpActivity(xpHist, log);
  try {
    window.localStorage.setItem('conjume-xp-activity', JSON.stringify(merged));
  } catch {
    /* ignore */
  }

  const masteryRows = await fetchAllVerbMastery(userId);
  const store: Record<string, MasteryRecord> = {};
  for (const r of masteryRows) {
    store[r.key] = r;
  }
  importMasteryStoreSnapshot(store);

  const fav = await fetchUserFavorites(userId);
  try {
    window.localStorage.setItem('conjume-starred-verbs', JSON.stringify(fav));
  } catch {
    /* ignore */
  }

  window.dispatchEvent(new CustomEvent('conjume-remote-progress-loaded'));
  window.dispatchEvent(new CustomEvent('conjume-mastery-changed'));
}
