/**
 * Historia Mode — seans sonuçlarını ve zaman bazlı hata istatistiklerini
 * localStorage'da saklar. Son 50 seans tutulur.
 */
import type { TenseIdEs } from '../data/spanish';

const STORAGE_KEY = 'diloloji-historia-progress';
const MAX_SESSIONS = 50;

export interface HistoriaSessionResult {
  /** Seans bitiş zamanı (ms). */
  timestamp: number;
  /** Oynanan sahne sayısı. */
  scenesPlayed: number;
  /** Toplam kazanılan puan. */
  score: number;
  /** Elde edilebilecek maksimum puan (scenesPlayed × 3). */
  maxScore: number;
  /** Zaman doğru işaretlenen soru sayısı. */
  tenseCorrectCount: number;
  /** Çekim doğru işaretlenen soru sayısı. */
  formCorrectCount: number;
  /** Kullanılan ipucu sayısı. */
  hintsUsed: number;
  /** Zaman bazlı hata sayıları — en zayıf noktayı hesaplamak için. */
  tenseMistakes: Partial<Record<TenseIdEs, number>>;
}

export interface HistoriaProgress {
  sessions: HistoriaSessionResult[];
}

function readStore(): HistoriaProgress {
  if (typeof window === 'undefined') return { sessions: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [] };
    const parsed = JSON.parse(raw) as HistoriaProgress;
    if (!parsed || !Array.isArray(parsed.sessions)) return { sessions: [] };
    return parsed;
  } catch {
    return { sessions: [] };
  }
}

function writeStore(data: HistoriaProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Kota dolduysa sessizce yut; asıl oyun akışını engellemez.
  }
}

/** Yeni bir seans sonucu kaydet. */
export function saveHistoriaSession(result: HistoriaSessionResult): void {
  const data = readStore();
  const next = [result, ...data.sessions].slice(0, MAX_SESSIONS);
  writeStore({ sessions: next });
}

/** Tüm seansları getir (en yeni başta). */
export function getHistoriaSessions(): HistoriaSessionResult[] {
  return readStore().sessions;
}

/** Son seansı getir; yoksa null. */
export function getLastHistoriaSession(): HistoriaSessionResult | null {
  const s = readStore().sessions;
  return s.length > 0 ? s[0] : null;
}

/**
 * Tüm zamanlarda en çok hata yapılan zamanı bulur.
 * En az 2 seans yoksa null döner.
 */
export function getWeakestTense(): { tense: TenseIdEs; count: number } | null {
  const sessions = readStore().sessions;
  if (sessions.length === 0) return null;
  const totals: Partial<Record<TenseIdEs, number>> = {};
  for (const s of sessions) {
    for (const [t, c] of Object.entries(s.tenseMistakes)) {
      if (typeof c === 'number') {
        totals[t as TenseIdEs] = (totals[t as TenseIdEs] ?? 0) + c;
      }
    }
  }
  const entries = Object.entries(totals) as [TenseIdEs, number][];
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [tense, count] = entries[0];
  return count > 0 ? { tense, count } : null;
}

/** Verilen sonuç objesinden o seansın en çok hata yapılan zamanını döner. */
export function getWeakestTenseOfSession(
  result: HistoriaSessionResult
): { tense: TenseIdEs; count: number } | null {
  const entries = Object.entries(result.tenseMistakes) as [TenseIdEs, number][];
  if (entries.length === 0) return null;
  const nonZero = entries.filter(([, c]) => c > 0);
  if (nonZero.length === 0) return null;
  nonZero.sort((a, b) => b[1] - a[1]);
  const [tense, count] = nonZero[0];
  return { tense, count };
}

/** Tüm Historia ilerlemesini temizler (geliştirici / test). */
export function clearHistoriaProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
