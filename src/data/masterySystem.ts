/**
 * Fiil × zaman × kişi ustalığı (mastery) + SM-2 benzeri aralık — localStorage.
 */

import type { AppLanguage } from './verbs';

export const MASTERY_STORAGE_KEY = 'diloloji-mastery-cells-v1';

export type MasteryRecord = {
  key: string;
  verb?: string;
  tense?: string;
  person?: string;
  correctStreak: number;
  totalCorrect: number;
  totalAttempts: number;
  /** YYYY-MM-DD (yerel) veya null */
  lastSeen: string | null;
  /** YYYY-MM-DD (yerel) veya null */
  nextReview: string | null;
  masteryLevel: number;
  /** Gün cinsinden tekrar aralığı */
  interval: number;
  /** Farklı çalışma günleri (benzersiz YYYY-MM-DD), en fazla son 40 */
  practiceDays: string[];
  /** İlk pratik günü (seviye 5 takvimi için) */
  firstPracticeDay: string | null;
};

const XP_BY_LEVEL: Record<number, number> = {
  1: 20,
  2: 40,
  3: 60,
  4: 100,
  5: 200,
};

function dispatchChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('diloloji-mastery-changed'));
}

export function getTodayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysLocal(dateStr: string, days: number): string {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function daysBetweenInclusive(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  return Math.max(0, Math.round((t2 - t1) / (24 * 60 * 60 * 1000)));
}

export function buildMasteryKey(
  lang: 'es' | 'fr',
  verb: string,
  tense: string,
  person: string
): string {
  return `${lang}_${verb.toLowerCase()}_${tense}_${person}`;
}

function emptyRecord(key: string, verb?: string, tense?: string, person?: string): MasteryRecord {
  return {
    key,
    verb,
    tense,
    person,
    correctStreak: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    lastSeen: null,
    nextReview: null,
    masteryLevel: 0,
    interval: 1,
    practiceDays: [],
    firstPracticeDay: null,
  };
}

function parseRecord(raw: unknown): MasteryRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.key !== 'string') return null;
  const practiceDays = Array.isArray(o.practiceDays)
    ? o.practiceDays.filter((x): x is string => typeof x === 'string')
    : [];
  let verbMeta = typeof o.verb === 'string' ? o.verb : undefined;
  let tenseMeta = typeof o.tense === 'string' ? o.tense : undefined;
  let personMeta = typeof o.person === 'string' ? o.person : undefined;
  if ((!verbMeta || !tenseMeta || !personMeta) && o.key) {
    const segs = o.key.split('_');
    if (segs.length === 4) {
      verbMeta = verbMeta ?? segs[1];
      tenseMeta = tenseMeta ?? segs[2];
      personMeta = personMeta ?? segs[3];
    }
  }
  return {
    key: o.key,
    verb: verbMeta,
    tense: tenseMeta,
    person: personMeta,
    correctStreak: typeof o.correctStreak === 'number' ? o.correctStreak : 0,
    totalCorrect: typeof o.totalCorrect === 'number' ? o.totalCorrect : 0,
    totalAttempts: typeof o.totalAttempts === 'number' ? o.totalAttempts : 0,
    lastSeen: typeof o.lastSeen === 'string' || o.lastSeen === null ? (o.lastSeen as string | null) : null,
    nextReview: typeof o.nextReview === 'string' || o.nextReview === null ? (o.nextReview as string | null) : null,
    masteryLevel: typeof o.masteryLevel === 'number' ? Math.max(0, Math.min(5, o.masteryLevel)) : 0,
    interval: typeof o.interval === 'number' && o.interval >= 1 ? o.interval : 1,
    practiceDays,
    firstPracticeDay:
      typeof o.firstPracticeDay === 'string' || o.firstPracticeDay === null
        ? (o.firstPracticeDay as string | null)
        : null,
  };
}

export function loadMasteryStore(): Record<string, MasteryRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(MASTERY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, MasteryRecord> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const rec = parseRecord(v);
      if (rec) out[k] = rec;
      else {
        const fallback = parseRecord({ ...(v as object), key: k });
        if (fallback) out[k] = fallback;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveMasteryStore(store: Record<string, MasteryRecord>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
  dispatchChanged();
}

/** Misafir moduna dönüşte buluttan gelen anlık görüntüyü yazar. */
export function importMasteryStoreSnapshot(store: Record<string, MasteryRecord>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
  dispatchChanged();
}

export function getMasteryRecord(key: string): MasteryRecord {
  const store = loadMasteryStore();
  return store[key] ? { ...store[key] } : emptyRecord(key);
}

function ensureMeta(rec: MasteryRecord, lang: 'es' | 'fr', verb: string, tense: string, person: string) {
  rec.verb = verb.toLowerCase();
  rec.tense = tense;
  rec.person = person;
  rec.key = buildMasteryKey(lang, verb, tense, person);
}

function touchPracticeDay(rec: MasteryRecord, today: string) {
  if (!rec.practiceDays.includes(today)) {
    rec.practiceDays = [...rec.practiceDays, today].slice(-40);
  }
  if (!rec.firstPracticeDay) rec.firstPracticeDay = today;
}

/** İstatistiklere göre hedef mastery (doğru/ gün / aralık). */
export function computeMasteryLevelFromStats(rec: MasteryRecord, today: string): number {
  const tc = rec.totalCorrect;
  const d = new Set(rec.practiceDays).size;
  if (tc <= 0) return 0;
  if (tc <= 2) return 1;
  if (tc <= 4) return d >= 2 ? 2 : 1;
  if (tc <= 6) return d >= 3 ? 3 : 2;
  if (tc <= 9) return d >= 4 ? 4 : 3;
  const span =
    rec.firstPracticeDay != null ? daysBetweenInclusive(rec.firstPracticeDay, today) : 0;
  if (tc >= 10 && (rec.interval >= 30 || span >= 30)) return 5;
  if (tc >= 10) return 4;
  return 4;
}

export type MasteryUpdateResult = {
  oldLevel: number;
  newLevel: number;
  xpGained: number;
  crossedLevels: number[];
};

export function recordMasteryCorrect(
  lang: 'es' | 'fr',
  verb: string,
  tense: string,
  person: string
): MasteryUpdateResult {
  const key = buildMasteryKey(lang, verb, tense, person);
  const store = loadMasteryStore();
  const prev = store[key] ? { ...store[key] } : emptyRecord(key, verb, tense, person);
  ensureMeta(prev, lang, verb, tense, person);
  const oldLevel = prev.masteryLevel;
  const today = getTodayLocal();

  prev.totalAttempts += 1;
  prev.totalCorrect += 1;
  prev.correctStreak += 1;
  prev.interval = Math.max(1, Math.round(prev.interval * 2.5));
  prev.nextReview = addDaysLocal(today, prev.interval);
  prev.lastSeen = today;
  touchPracticeDay(prev, today);
  prev.masteryLevel = computeMasteryLevelFromStats(prev, today);

  store[key] = prev;
  saveMasteryStore(store);
  void import('../lib/masterySync').then(({ syncVerbMasteryToCloudIfAuthed }) => {
    syncVerbMasteryToCloudIfAuthed(lang, verb, tense, person, prev);
  });

  const crossed: number[] = [];
  let xpGained = 0;
  for (let L = 1; L <= 5; L++) {
    if (oldLevel < L && prev.masteryLevel >= L) {
      crossed.push(L);
      xpGained += XP_BY_LEVEL[L] ?? 0;
    }
  }

  return { oldLevel, newLevel: prev.masteryLevel, xpGained, crossedLevels: crossed };
}

export function recordMasteryWrong(lang: 'es' | 'fr', verb: string, tense: string, person: string): void {
  const key = buildMasteryKey(lang, verb, tense, person);
  const store = loadMasteryStore();
  const prev = store[key] ? { ...store[key] } : emptyRecord(key, verb, tense, person);
  ensureMeta(prev, lang, verb, tense, person);
  const prevLevel = prev.masteryLevel;
  const today = getTodayLocal();

  prev.totalAttempts += 1;
  prev.correctStreak = 0;
  prev.interval = 1;
  prev.nextReview = addDaysLocal(today, 1);
  prev.lastSeen = today;
  touchPracticeDay(prev, today);
  prev.masteryLevel = Math.max(0, prevLevel - 1);

  store[key] = prev;
  saveMasteryStore(store);
  void import('../lib/masterySync').then(({ syncVerbMasteryToCloudIfAuthed }) => {
    syncVerbMasteryToCloudIfAuthed(lang, verb, tense, person, prev);
  });
}

export function isMasteryDue(record: MasteryRecord, today: string): boolean {
  if (!record.nextReview) return false;
  return record.nextReview <= today;
}

/** Alıştırma sırası: önce süresi geçenler, sonra düşük mastery, sonra az denenen / yeni. */
export function sortQuizPronounsByMastery(
  lang: 'es' | 'fr',
  verb: string,
  tense: string,
  pronounIds: string[]
): string[] {
  const today = getTodayLocal();
  const store = loadMasteryStore();
  const score = (pid: string) => {
    const key = buildMasteryKey(lang, verb, tense, pid);
    const rec = store[key] ?? emptyRecord(key, verb, tense, pid);
    const due = isMasteryDue(rec, today) ? 0 : 1;
    const lvl = rec.masteryLevel;
    const attempts = rec.totalAttempts;
    const newPenalty = attempts === 0 ? 0 : 1;
    return { due, lvl, newPenalty, pid };
  };
  return [...pronounIds].sort((a, b) => {
    const A = score(a);
    const B = score(b);
    if (A.due !== B.due) return A.due - B.due;
    if (A.lvl !== B.lvl) return A.lvl - B.lvl;
    if (A.newPenalty !== B.newPenalty) return B.newPenalty - A.newPenalty;
    return pronounIds.indexOf(a) - pronounIds.indexOf(b);
  });
}

export type MasteryDueItem = {
  lang: 'es' | 'fr';
  verb: string;
  tense: string;
  person: string;
  key: string;
};

export function getMasteryDueToday(lang: AppLanguage): MasteryDueItem[] {
  if (lang !== 'es' && lang !== 'fr') return [];
  const today = getTodayLocal();
  const store = loadMasteryStore();
  const out: MasteryDueItem[] = [];
  for (const rec of Object.values(store)) {
    if (!rec.key.startsWith(`${lang}_`)) continue;
    if (!isMasteryDue(rec, today)) continue;
    const verb = rec.verb;
    const tense = rec.tense;
    const person = rec.person;
    if (!verb || !tense || !person) continue;
    out.push({ lang, verb, tense, person, key: rec.key });
  }
  out.sort((a, b) => {
    if (a.verb !== b.verb) return a.verb.localeCompare(b.verb);
    if (a.tense !== b.tense) return a.tense.localeCompare(b.tense);
    return a.person.localeCompare(b.person);
  });
  return out;
}

export function getVerbMasteryDueForVerb(
  lang: 'es' | 'fr',
  verb: string,
  tenseIds: string[],
  pronounIds: string[],
  today: string
): MasteryDueItem[] {
  const store = loadMasteryStore();
  const v = verb.toLowerCase();
  const out: MasteryDueItem[] = [];
  for (const tense of tenseIds) {
    for (const person of pronounIds) {
      const key = buildMasteryKey(lang, v, tense, person);
      const rec = store[key];
      if (rec && isMasteryDue(rec, today)) {
        out.push({ lang, verb: v, tense, person, key });
      }
    }
  }
  return out;
}

export type TenseMasteryRow = {
  tenseId: string;
  avgLevel: number;
  avgPercent: number;
  sumCorrect: number;
  labelLevel: number;
  displayFraction: string;
};

export function getVerbTenseMasteryRows(
  lang: 'es' | 'fr',
  verb: string,
  tenseIds: string[],
  pronounIds: string[]
): TenseMasteryRow[] {
  const store = loadMasteryStore();
  const v = verb.toLowerCase();
  return tenseIds.map((tenseId) => {
    let sumLvl = 0;
    let sumCorrect = 0;
    for (const p of pronounIds) {
      const key = buildMasteryKey(lang, v, tenseId, p);
      const rec = store[key];
      sumLvl += rec?.masteryLevel ?? 0;
      sumCorrect += rec?.totalCorrect ?? 0;
    }
    const n = Math.max(1, pronounIds.length);
    const avgLevel = sumLvl / n;
    const avgPercent = Math.round((avgLevel / 5) * 100);
    const labelLevel = Math.min(5, Math.round(avgLevel));
    const target = n * 10;
    const displayFraction = `${Math.min(sumCorrect, target)}/${target}`;
    return {
      tenseId,
      avgLevel,
      avgPercent,
      sumCorrect,
      labelLevel,
      displayFraction,
    };
  });
}

export function getVerbOverallMasteryPercent(
  lang: 'es' | 'fr',
  verb: string,
  tenseIds: string[],
  pronounIds: string[]
): number {
  const rows = getVerbTenseMasteryRows(lang, verb, tenseIds, pronounIds);
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((s, r) => s + r.avgPercent, 0) / rows.length);
}

export function isVerbFullyMastered(
  lang: 'es' | 'fr',
  verb: string,
  tenseIds: string[],
  pronounIds: string[]
): boolean {
  const store = loadMasteryStore();
  const v = verb.toLowerCase();
  for (const tense of tenseIds) {
    for (const p of pronounIds) {
      const key = buildMasteryKey(lang, v, tense, p);
      const lvl = store[key]?.masteryLevel ?? 0;
      if (lvl < 5) return false;
    }
  }
  return true;
}

export const MASTERY_LEVEL_META: { level: number; emoji: string; tr: string }[] = [
  { level: 0, emoji: '🔴', tr: 'Yeni' },
  { level: 1, emoji: '🟠', tr: 'Başlangıç' },
  { level: 2, emoji: '🟡', tr: 'Gelişiyor' },
  { level: 3, emoji: '🔵', tr: 'İyi' },
  { level: 4, emoji: '🟢', tr: 'Güçlü' },
  { level: 5, emoji: '⭐', tr: 'Ustalık' },
];

export function masteryXpForCrossingLevels(levels: number[]): number {
  return levels.reduce((s, L) => s + (XP_BY_LEVEL[L] ?? 0), 0);
}
