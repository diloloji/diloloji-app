/**
 * Cloze Sprint — seans skorlarını + günlük en iyi skoru localStorage'da tutar.
 * Kayıt anahtarı: conjume-cloze-sprint
 */
import type { ClozeTenseLabel } from '../data/clozeData';

const STORAGE_KEY = 'conjume-cloze-sprint';

export interface ClozeSessionResult {
  timestamp: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  /** Zaman bazlı hata dağılımı — en zayıf zamanı hesaplamak için. */
  tenseMistakes: Partial<Record<ClozeTenseLabel, number>>;
}

export interface ClozeProgress {
  /** YYYY-MM-DD → o günün en yüksek skoru. */
  dailyBest: Record<string, number>;
  allTimeBest: number;
  lastSessions: ClozeSessionResult[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(): ClozeProgress {
  if (typeof window === 'undefined') return { dailyBest: {}, allTimeBest: 0, lastSessions: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dailyBest: {}, allTimeBest: 0, lastSessions: [] };
    const parsed = JSON.parse(raw) as Partial<ClozeProgress>;
    return {
      dailyBest: parsed.dailyBest ?? {},
      allTimeBest: parsed.allTimeBest ?? 0,
      lastSessions: Array.isArray(parsed.lastSessions) ? parsed.lastSessions : [],
    };
  } catch {
    return { dailyBest: {}, allTimeBest: 0, lastSessions: [] };
  }
}

function writeStore(data: ClozeProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* kota vb. sessiz geç */
  }
}

/** Bugünkü en iyi skor (yoksa 0). */
export function getTodayBest(): number {
  return readStore().dailyBest[today()] ?? 0;
}

/** Tüm zamanların en iyisi. */
export function getAllTimeBest(): number {
  return readStore().allTimeBest;
}

/**
 * Seans sonucunu kaydeder; bugünkü ve all-time best değerlerini günceller.
 * Döner: bu seans yeni daily-best oldu mu?
 */
export function saveClozeSession(result: ClozeSessionResult): {
  isNewDailyBest: boolean;
  isNewAllTimeBest: boolean;
  dailyBest: number;
  allTimeBest: number;
} {
  const data = readStore();
  const t = today();
  const prevDaily = data.dailyBest[t] ?? 0;
  const isNewDailyBest = result.score > prevDaily;
  const isNewAllTimeBest = result.score > data.allTimeBest;

  const next: ClozeProgress = {
    dailyBest: { ...data.dailyBest, [t]: Math.max(prevDaily, result.score) },
    allTimeBest: Math.max(data.allTimeBest, result.score),
    lastSessions: [result, ...data.lastSessions].slice(0, 20),
  };
  writeStore(next);

  return {
    isNewDailyBest,
    isNewAllTimeBest,
    dailyBest: next.dailyBest[t] ?? 0,
    allTimeBest: next.allTimeBest,
  };
}

/** Verilen seanstaki en çok hata yapılan zamanı döndürür. */
export function getWeakestTenseFromResult(
  result: ClozeSessionResult
): { tense: ClozeTenseLabel; count: number } | null {
  const entries = Object.entries(result.tenseMistakes) as [ClozeTenseLabel, number][];
  const nonZero = entries.filter(([, c]) => typeof c === 'number' && c > 0);
  if (nonZero.length === 0) return null;
  nonZero.sort((a, b) => b[1] - a[1]);
  const [tense, count] = nonZero[0];
  return { tense, count };
}
