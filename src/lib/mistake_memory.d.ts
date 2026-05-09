export interface MistakeMemoryEntry {
  verb: string;
  tense: string;
  person: string;
  lang: 'es' | 'fr';
  errorCount: number;
  lastSeen: string;
  lastAnswer: string;
  correctAnswer: string;
  resolved: boolean;
}

export function recordMistake(
  verb: string,
  tense: string,
  person: string,
  wrongAnswer: string,
  correctAnswer: string,
  lang?: 'es' | 'fr'
): void;

export function markResolved(verb: string, tense: string, person: string, lang?: 'es' | 'fr'): void;

export function getMistake(
  verb: string,
  tense: string,
  person: string,
  lang?: 'es' | 'fr'
): MistakeMemoryEntry | null;

export function getAllMistakes(): MistakeMemoryEntry[];

export function getUnresolvedMistakes(): MistakeMemoryEntry[];

export function priorityScore(entry: Pick<MistakeMemoryEntry, 'errorCount' | 'lastSeen'>): number;

export function getMistakesForReviewSorted(lang: 'es' | 'fr'): MistakeMemoryEntry[];

export interface MistakeMemoryStats {
  totalErrors: number;
  resolvedCount: number;
  unresolvedCount: number;
  topMistake: MistakeMemoryEntry | null;
  worstTenseId: string | null;
  worstPersonId: string | null;
}

export function getMistakeMemoryStats(scope?: 'es' | 'fr' | 'all'): MistakeMemoryStats;
