/**
 * Ezber Makinesi: Deste ilerlemesi localStorage'da kalıcı.
 * masteredWords, lastStudied, totalSessions, bestScore.
 */

export interface DeckProgress {
  deckId: string;
  masteredWords: string[];
  lastStudied: string;
  totalSessions: number;
  bestScore: number;
}

export interface SessionResult {
  correct: number;
  incorrect: number;
  skipped: number;
  durationSeconds: number;
  incorrectWords: { id: string; front: string; back: string; example?: string; language: string }[];
}

const PREFIX = 'diloloji-deck-progress-';

function getKey(deckId: string): string {
  return PREFIX + deckId;
}

export function saveDeckProgress(
  deckId: string,
  result: SessionResult,
  correctWordIds?: string[]
): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getDeckProgress(deckId);
    const total = result.correct + result.incorrect + result.skipped;
    const scorePct = total > 0 ? Math.round((result.correct / total) * 100) : 0;
    const incorrectIds = new Set(result.incorrectWords.map((w) => w.id));
    const mastered = new Set(existing?.masteredWords ?? []);
    incorrectIds.forEach((id) => mastered.delete(id));
    if (correctWordIds) correctWordIds.forEach((id) => mastered.add(id));
    const next: DeckProgress = {
      deckId,
      masteredWords: Array.from(mastered),
      lastStudied: new Date().toISOString().slice(0, 10),
      totalSessions: (existing?.totalSessions ?? 0) + 1,
      bestScore: Math.max(existing?.bestScore ?? 0, scorePct),
    };
    window.localStorage.setItem(getKey(deckId), JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function getDeckProgress(deckId: string): DeckProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getKey(deckId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || !('deckId' in parsed)) return null;
    const p = parsed as Record<string, unknown>;
    return {
      deckId: String(p.deckId ?? deckId),
      masteredWords: Array.isArray(p.masteredWords) ? p.masteredWords.filter((x): x is string => typeof x === 'string') : [],
      lastStudied: typeof p.lastStudied === 'string' ? p.lastStudied : new Date().toISOString().slice(0, 10),
      totalSessions: typeof p.totalSessions === 'number' ? p.totalSessions : 0,
      bestScore: typeof p.bestScore === 'number' ? Math.min(100, Math.max(0, p.bestScore)) : 0,
    };
  } catch {
    return null;
  }
}

export function getMasteredPercentage(deckId: string, totalCards: number): number {
  if (totalCards <= 0) return 0;
  const progress = getDeckProgress(deckId);
  const count = progress?.masteredWords.length ?? 0;
  return Math.min(100, Math.round((count / totalCards) * 100));
}

export function addMasteredWords(deckId: string, wordIds: string[]): void {
  if (typeof window === 'undefined' || wordIds.length === 0) return;
  const existing = getDeckProgress(deckId);
  const set = new Set(existing?.masteredWords ?? []);
  wordIds.forEach((id) => set.add(id));
  const next: DeckProgress = {
    deckId,
    masteredWords: Array.from(set),
    lastStudied: existing?.lastStudied ?? new Date().toISOString().slice(0, 10),
    totalSessions: existing?.totalSessions ?? 0,
    bestScore: existing?.bestScore ?? 0,
  };
  try {
    window.localStorage.setItem(getKey(deckId), JSON.stringify(next));
  } catch {
    // ignore
  }
}
