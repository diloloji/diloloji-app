/**
 * Alıştırma (quiz) yanlışları için basit aralık tekrarı — localStorage.
 * Yanlış: 1→1g, 2→3g, 3+→7g; doğru: interval 2x, wrongCount sıfırlanır.
 */

const STORAGE_KEY = 'conjume-quiz-spaced-rep-v1';

export type QuizSpacedRepetitionEntry = {
  verb: string;
  tense: string;
  person: string;
  /** Dil; eski kayıtlar için varsayılan es */
  lang?: 'es' | 'fr';
  wrongCount: number;
  lastSeen: number;
  /** YYYY-MM-DD (yerel) */
  nextReview: string;
  /** Son planlanan aralık (gün); doğru yapılınca 2 ile çarpılır */
  intervalDays: number;
};

function dispatchChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('conjume-spaced-rep-changed'));
}

function getTodayLocal(): string {
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

function loadRaw(): QuizSpacedRepetitionEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: QuizSpacedRepetitionEntry[] = [];
    for (const x of parsed) {
      if (typeof x !== 'object' || x === null) continue;
      const o = x as Record<string, unknown>;
      if (
        typeof o.verb !== 'string' ||
        typeof o.tense !== 'string' ||
        typeof o.person !== 'string' ||
        typeof o.nextReview !== 'string'
      )
        continue;
      const wrongCount = typeof o.wrongCount === 'number' ? o.wrongCount : 0;
      const lastSeen = typeof o.lastSeen === 'number' ? o.lastSeen : Date.now();
      const intervalDays = typeof o.intervalDays === 'number' && o.intervalDays >= 1 ? o.intervalDays : 1;
      const lang = o.lang === 'fr' ? 'fr' : 'es';
      out.push({
        verb: o.verb,
        tense: o.tense,
        person: o.person,
        lang,
        wrongCount,
        lastSeen,
        nextReview: o.nextReview,
        intervalDays,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function save(items: QuizSpacedRepetitionEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function intervalForWrongCount(wrongCount: number): number {
  if (wrongCount <= 1) return 1;
  if (wrongCount === 2) return 3;
  return 7;
}

function keyOfLang(e: Pick<QuizSpacedRepetitionEntry, 'verb' | 'tense' | 'person' | 'lang'>): string {
  const lang = e.lang === 'fr' ? 'fr' : 'es';
  return `${lang}\u0000${e.verb}\u0000${e.tense}\u0000${e.person}`;
}

/** Yanlış cevap sonrası (alıştırma). */
export function recordQuizSpacedRepetitionWrong(
  verb: string,
  tense: string,
  person: string,
  lang: 'es' | 'fr' = 'es'
) {
  const items = loadRaw();
  const k = keyOfLang({ verb, tense, person, lang });
  const today = getTodayLocal();
  const idx = items.findIndex((e) => keyOfLang(e) === k);
  const wrongCount = idx >= 0 ? items[idx].wrongCount + 1 : 1;
  const intervalDays = intervalForWrongCount(wrongCount);
  const entry: QuizSpacedRepetitionEntry = {
    verb,
    tense,
    person,
    lang,
    wrongCount,
    lastSeen: Date.now(),
    nextReview: addDaysLocal(today, intervalDays),
    intervalDays,
  };
  if (idx >= 0) items[idx] = entry;
  else items.push(entry);
  save(items);
  dispatchChanged();
}

/** Doğru cevap sonrası — kayıt yoksa no-op. */
export function recordQuizSpacedRepetitionCorrect(
  verb: string,
  tense: string,
  person: string,
  lang: 'es' | 'fr' = 'es'
) {
  const items = loadRaw();
  const k = keyOfLang({ verb, tense, person, lang });
  const idx = items.findIndex((e) => keyOfLang(e) === k);
  if (idx < 0) return;
  const cur = items[idx];
  const today = getTodayLocal();
  const nextInterval = Math.max(1, cur.intervalDays * 2);
  items[idx] = {
    ...cur,
    wrongCount: 0,
    lastSeen: Date.now(),
    intervalDays: nextInterval,
    nextReview: addDaysLocal(today, nextInterval),
  };
  save(items);
  dispatchChanged();
}

/** Bugün tekrar zamanı gelmiş kayıtlar (nextReview <= bugün). */
export function getQuizSpacedRepetitionDueToday(lang?: 'es' | 'fr'): QuizSpacedRepetitionEntry[] {
  const today = getTodayLocal();
  return loadRaw()
    .filter((e) => {
      if (lang && (e.lang === 'fr' ? 'fr' : 'es') !== lang) return false;
      return e.nextReview <= today;
    })
    .sort((a, b) => (a.nextReview < b.nextReview ? -1 : a.nextReview > b.nextReview ? 1 : a.verb.localeCompare(b.verb)));
}

/** Seçili fiil + zamanda en az bir şahıs bugün için mi due? */
export function isVerbTenseDueForSpacedRepetition(verb: string, tense: string, lang?: 'es' | 'fr'): boolean {
  const today = getTodayLocal();
  return loadRaw().some((e) => {
    if (lang && (e.lang === 'fr' ? 'fr' : 'es') !== lang) return false;
    return e.verb === verb && e.tense === tense && e.nextReview <= today;
  });
}
