/**
 * Günlük Akış — streak + seans planı yönetimi.
 *
 * localStorage anahtarları:
 *  - streak_count       : number   — ardışık tamamlanan gün sayısı
 *  - best_streak        : number   — tüm zamanların en uzun seri değeri
 *  - last_active_date   : string   — en son akışın tamamlandığı gün (YYYY-MM-DD)
 *  - today_completed    : boolean  — bugünkü akış tamamlandı mı?
 *
 * SRS verisi `diloloji-mistake-bank` anahtarı üzerinden mistakeBank.ts tarafından yönetilir;
 *  burada yalnızca `getDueMistakesByPriority()` ile okunur.
 *
 * Gece yarısı davranışı: `ensureFreshDay()` çağrıldığında last_active_date bugünden eski ise
 *  today_completed false'a çekilir. 2+ gün aradan sonra streak sıfırlanır.
 */

import { getDueMistakesByPriority, type MistakeEntry } from './mistakeBank';

/* ───────── Anahtarlar ───────── */
const K_STREAK = 'streak_count';
const K_BEST = 'best_streak';
const K_LAST_ACTIVE = 'last_active_date';
const K_TODAY_DONE = 'today_completed';

/* ───────── Sabitler ───────── */
/** SRS her kart için tahmini süre (sn). */
export const SRS_SECONDS_PER_CARD = 20;
/** Cloze Sprint tek seans (sn). */
export const CLOZE_SECONDS = 60;
/** Günlük akışta en fazla kaç SRS kartı gösterilir. */
export const MAX_SRS_PER_SESSION = 10;
/** Streak kutlama eşiği — bu sayının katlarında konfeti çıkar. */
export const STREAK_CELEBRATION_STEP = 7;

/* ───────── Tip tanımları ───────── */

export type FlowStep =
  | { kind: 'srs-review'; count: number; estimatedSeconds: number; entries: MistakeEntry[] }
  | { kind: 'cloze-sprint'; estimatedSeconds: number };

export interface DailyPlan {
  steps: FlowStep[];
  totalSeconds: number;
  /** Kart üstünde gösterilen kısa özet (ör. "3 tekrar → 1 Cloze Sprint"). */
  summaryLabel: string;
}

export interface DailyFlowState {
  streak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  todayCompleted: boolean;
}

/* ───────── Tarih yardımcıları ───────── */

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00Z').getTime();
  const db = new Date(b + 'T12:00:00Z').getTime();
  return Math.round((db - da) / (24 * 3600 * 1000));
}

/* ───────── localStorage I/O ───────── */

function readNumber(key: string, fallback = 0): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeNumber(key: string, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

function readString(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function writeString(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

function readBool(key: string, fallback = false): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'boolean' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

/* ───────── State okuma / güncelleme ───────── */

/** Ham state okur — herhangi bir tarih düzeltmesi yapmaz. */
function readState(): DailyFlowState {
  return {
    streak: readNumber(K_STREAK, 0),
    bestStreak: readNumber(K_BEST, 0),
    lastActiveDate: readString(K_LAST_ACTIVE),
    todayCompleted: readBool(K_TODAY_DONE, false),
  };
}

/**
 * Gün geçişi kontrolü:
 *  - last_active_date bugünden farklıysa today_completed false yapılır.
 *  - last_active_date ile bugün arasında 1 günden fazla fark varsa streak sıfırlanır.
 *  - last_active_date yoksa (ilk kullanım) bir şey yapılmaz.
 */
export function ensureFreshDay(): DailyFlowState {
  const today = getToday();
  const state = readState();

  if (state.lastActiveDate) {
    const gap = daysBetween(state.lastActiveDate, today);
    if (gap > 1 && state.streak > 0) {
      writeNumber(K_STREAK, 0);
      state.streak = 0;
    }
    if (state.lastActiveDate !== today && state.todayCompleted) {
      writeBool(K_TODAY_DONE, false);
      state.todayCompleted = false;
    }
  }

  return state;
}

export function getDailyFlowState(): DailyFlowState {
  return ensureFreshDay();
}

/**
 * Günün akışı tamamlandı — streak ve last_active_date güncellenir.
 * Geri dönüş: yeni state + bu tamamlama milestone mu?
 */
export function markTodayCompleted(): DailyFlowState & { isMilestone: boolean; isNewBest: boolean } {
  const today = getToday();
  const prev = readState();

  if (prev.todayCompleted && prev.lastActiveDate === today) {
    return { ...prev, isMilestone: false, isNewBest: false };
  }

  let nextStreak: number;
  if (prev.lastActiveDate && daysBetween(prev.lastActiveDate, today) === 1) {
    nextStreak = prev.streak + 1;
  } else if (prev.lastActiveDate === today) {
    nextStreak = Math.max(prev.streak, 1);
  } else {
    nextStreak = 1;
  }

  const nextBest = Math.max(prev.bestStreak, nextStreak);
  const isMilestone =
    nextStreak > 0 && nextStreak % STREAK_CELEBRATION_STEP === 0 && nextStreak !== prev.streak;
  const isNewBest = nextBest > prev.bestStreak;

  writeNumber(K_STREAK, nextStreak);
  writeNumber(K_BEST, nextBest);
  writeString(K_LAST_ACTIVE, today);
  writeBool(K_TODAY_DONE, true);

  return {
    streak: nextStreak,
    bestStreak: nextBest,
    lastActiveDate: today,
    todayCompleted: true,
    isMilestone,
    isNewBest,
  };
}

/* ───────── Plan oluşturma ───────── */

/**
 * Bugünkü akış planını oluşturur.
 *  - Vadesi gelmiş SRS kartı varsa önce onlar gelir (en fazla MAX_SRS_PER_SESSION).
 *  - Sonra her zaman 60 sn Cloze Sprint.
 *  - SRS yoksa yalnızca Cloze Sprint.
 */
export function buildDailyPlan(): DailyPlan {
  const due = getDueMistakesByPriority();
  const steps: FlowStep[] = [];

  if (due.length > 0) {
    const picked = due.slice(0, MAX_SRS_PER_SESSION);
    steps.push({
      kind: 'srs-review',
      count: picked.length,
      estimatedSeconds: picked.length * SRS_SECONDS_PER_CARD,
      entries: picked,
    });
  }

  steps.push({ kind: 'cloze-sprint', estimatedSeconds: CLOZE_SECONDS });

  const totalSeconds = steps.reduce((s, st) => s + st.estimatedSeconds, 0);
  const summaryLabel = formatSummaryLabel(steps);
  return { steps, totalSeconds, summaryLabel };
}

function formatSummaryLabel(steps: FlowStep[]): string {
  const parts: string[] = [];
  for (const s of steps) {
    if (s.kind === 'srs-review') parts.push(`${s.count} tekrar`);
    else if (s.kind === 'cloze-sprint') parts.push('1 Cloze Sprint');
  }
  return parts.join(' → ');
}

/** Süreyi "~3 dk" / "45 sn" formatında döner. */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) return `${seconds} sn`;
  const mins = Math.round(seconds / 60);
  return `~${mins} dk`;
}

/** Dev / test için — tüm günlük akış verilerini sıfırlar. */
export function resetDailyFlowData(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(K_STREAK);
  window.localStorage.removeItem(K_BEST);
  window.localStorage.removeItem(K_LAST_ACTIVE);
  window.localStorage.removeItem(K_TODAY_DONE);
}
