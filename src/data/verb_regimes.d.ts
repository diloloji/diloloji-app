export interface VerbRegimeExample {
  es: string;
  tr: string;
}

export interface VerbRegimeEntry {
  preposition: string;
  pattern: string;
  turkish_note: string;
  examples: VerbRegimeExample[];
  common_mistakes: string;
}

export const verbRegimes: Record<string, VerbRegimeEntry>;
