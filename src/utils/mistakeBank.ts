/**
 * Hata Bankası (Zorlandıklarım): Yanlış çekimleri localStorage'da saklar.
 * Spaced repetition: interval, easeFactor, nextReviewDate ile tekrar takibi.
 * Unique key: verb + tense + pronoun (aynı soru tekrar eklenmez).
 * tense ve pronoun string (Fransızca/İspanyolca dil id'leri).
 */
const STORAGE_KEY = 'conjume-mistake-bank';

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const EASE_DECREMENT = 0.15;
const MASTERED_INTERVAL_DAYS = 30;

export type MistakeEntry = {
  verb: string;
  tense: string;
  pronoun: string;
  timestamp: number;
  /** Tekrar aralığı (gün). Başlangıç: 0. */
  interval: number;
  /** Kolaylık çarpanı. Başlangıç: 2.5. */
  easeFactor: number;
  /** Bir sonraki tekrar tarihi (YYYY-MM-DD). Başlangıç: bugün. */
  nextReviewDate: string;
  /** Aynı çekim için kaç kez yanlış cevap verildi (öncelik sıralaması için). */
  mistakeCount: number;
  /** En son yanlış yapılma zamanı (UI sıralama / fresh-first için). */
  lastMistakeAt: number;
};

function getToday(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function storageGet(): unknown[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storageSet(items: MistakeEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function uniqueKey(e: { verb: string; tense: string; pronoun: string }): string {
  return `${e.verb}|${e.tense}|${e.pronoun}`;
}

/** Eski kayıtları yeni alanlarla doldurur (migration). */
function normalizeEntry(x: unknown): MistakeEntry | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (
    typeof o.verb !== 'string' ||
    typeof o.tense !== 'string' ||
    typeof o.pronoun !== 'string' ||
    typeof o.timestamp !== 'number'
  )
    return null;
  const today = getToday();
  return {
    verb: o.verb,
    tense: o.tense,
    pronoun: o.pronoun,
    timestamp: o.timestamp,
    interval: typeof o.interval === 'number' ? o.interval : 0,
    easeFactor: typeof o.easeFactor === 'number' ? o.easeFactor : DEFAULT_EASE_FACTOR,
    nextReviewDate: typeof o.nextReviewDate === 'string' ? o.nextReviewDate : today,
    mistakeCount: typeof o.mistakeCount === 'number' && o.mistakeCount > 0 ? o.mistakeCount : 1,
    lastMistakeAt: typeof o.lastMistakeAt === 'number' ? o.lastMistakeAt : (typeof o.timestamp === 'number' ? o.timestamp : Date.now()),
  };
}

/** Tüm hata listesini döner (eski kayıtlar normalize edilir). */
export function getMistakes(): MistakeEntry[] {
  const raw = storageGet();
  const list: MistakeEntry[] = [];
  for (const x of raw) {
    const e = normalizeEntry(x);
    if (e) list.push(e);
  }
  return list;
}

/** nextReviewDate'i bugün veya geçmişte olan (tekrar zamanı gelmiş) kayıtlar. */
export function getDueMistakes(): MistakeEntry[] {
  const today = getToday();
  return getMistakes().filter((e) => e.nextReviewDate <= today);
}

/**
 * Tek bir soruyu ekler veya mevcut kaydın hata sayacını artırır.
 * - Yeni kayıtta: interval 0, easeFactor 2.5, nextReviewDate bugün, mistakeCount 1.
 * - Mevcut kayıtta: mistakeCount += 1, lastMistakeAt güncellenir, interval 0'a çekilir, nextReviewDate bugün olur.
 */
export function addMistake(verb: string, tense: string, pronoun: string): MistakeEntry[] {
  const items = getMistakes();
  const key = `${verb}|${tense}|${pronoun}`;
  const idx = items.findIndex((x) => uniqueKey(x) === key);
  const now = Date.now();
  const today = getToday();
  if (idx !== -1) {
    const next = [...items];
    const entry = next[idx];
    next[idx] = {
      ...entry,
      mistakeCount: (entry.mistakeCount ?? 1) + 1,
      lastMistakeAt: now,
      interval: 0,
      nextReviewDate: today,
    };
    storageSet(next);
    return next;
  }
  const entry: MistakeEntry = {
    verb,
    tense,
    pronoun,
    timestamp: now,
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    nextReviewDate: today,
    mistakeCount: 1,
    lastMistakeAt: now,
  };
  const next = [...items, entry];
  storageSet(next);
  return next;
}

/** Hata sayısı çoktan aza, eşitse en yeni hata öncedir. */
export function getMistakesByPriority(): MistakeEntry[] {
  return [...getMistakes()].sort((a, b) => {
    if (b.mistakeCount !== a.mistakeCount) return b.mistakeCount - a.mistakeCount;
    return b.lastMistakeAt - a.lastMistakeAt;
  });
}

/** Bugün için tekrar zamanı gelmiş kayıtları öncelik sırasıyla döner. */
export function getDueMistakesByPriority(): MistakeEntry[] {
  const today = getToday();
  return getMistakesByPriority().filter((e) => e.nextReviewDate <= today);
}

/** Belirtilen soruyu listeden ve localStorage'dan siler. */
export function removeMistake(verb: string, tense: string, pronoun: string): MistakeEntry[] {
  const items = getMistakes();
  const key = `${verb}|${tense}|${pronoun}`;
  const next = items.filter((x) => uniqueKey(x) !== key);
  if (next.length === items.length) return items;
  storageSet(next);
  return next;
}

export type ReviewResult = 'correct_first_try' | 'wrong_or_hint';

/**
 * Tekrar modunda sonucu işler; listeyi günceller ve yeni listeyi döner.
 * - correct_first_try: interval artır, nextReviewDate ileri at. interval > 30 ise "Tamamen Öğrenildi" sayılıp silinir.
 * - wrong_or_hint: interval 0, easeFactor 0.15 düşür (min 1.3), nextReviewDate bugün.
 */
export function updateMistakeReview(
  verb: string,
  tense: string,
  pronoun: string,
  result: ReviewResult
): MistakeEntry[] {
  const items = getMistakes();
  const key = `${verb}|${tense}|${pronoun}`;
  const idx = items.findIndex((x) => uniqueKey(x) === key);
  if (idx === -1) return items;

  const entry = items[idx];
  const today = getToday();

  if (result === 'correct_first_try') {
    const newInterval =
      entry.interval === 0 ? 1 : entry.interval === 1 ? 3 : Math.round(entry.interval * entry.easeFactor);
    if (newInterval > MASTERED_INTERVAL_DAYS) {
      const next = items.filter((_, i) => i !== idx);
      storageSet(next);
      return next;
    }
    const next = [...items];
    next[idx] = {
      ...entry,
      interval: newInterval,
      nextReviewDate: addDays(today, newInterval),
    };
    storageSet(next);
    return next;
  }

  const next = [...items];
  next[idx] = {
    ...entry,
    interval: 0,
    easeFactor: Math.max(MIN_EASE_FACTOR, entry.easeFactor - EASE_DECREMENT),
    nextReviewDate: today,
  };
  storageSet(next);
  return next;
}

/** Tüm listeyi state ile senkron etmek için güncel listeyi döner (persist edilmiş). */
export function setMistakes(items: MistakeEntry[]): MistakeEntry[] {
  storageSet(items);
  return items;
}
