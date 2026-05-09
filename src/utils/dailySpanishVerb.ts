import { SPANISH_VERBS } from '../data/spanish-data';

/** Yerel takvim günü → deterministik indeks (herkes aynı gün aynı fiili görür). */
export function getDailySpanishVerbDayIndex(): number {
  const d = new Date();
  const utcMidnight = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const dayOrdinal = Math.floor(utcMidnight / 86_400_000);
  const n = SPANISH_VERBS.length;
  return ((dayOrdinal % n) + n) % n;
}

export function getDailySpanishVerb() {
  const i = getDailySpanishVerbDayIndex();
  return SPANISH_VERBS[i];
}
