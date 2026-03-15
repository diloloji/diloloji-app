/**
 * SRS (Spaced Repetition) veri modeli — ileride SM-2 implementasyonu için hazır.
 * Şimdi sadece tip tanımları ve localStorage key; algoritma sonra eklenecek.
 */

export interface WordSRSData {
  wordId: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReview: string;
  lastResult: 'correct' | 'incorrect' | 'skip';
}

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;

const SRS_PREFIX = 'diloloji-srs-';

export function getSRSStorageKey(deckId: string): string {
  return SRS_PREFIX + deckId;
}

/** İleride: SM-2 ile bir sonraki interval ve nextReview hesapla */
export function nextInterval(
  _data: WordSRSData,
  _result: 'correct' | 'incorrect' | 'skip'
): { interval: number; easeFactor: number; nextReview: string } {
  return {
    interval: 1,
    easeFactor: DEFAULT_EASE_FACTOR,
    nextReview: new Date().toISOString().slice(0, 10),
  };
}
