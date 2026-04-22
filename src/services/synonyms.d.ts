export type SynonymRegister = 'formal' | 'informal' | 'neutral';

export interface VerbSynonymItem {
  verb: string;
  turkish: string;
  difference: string;
  register: SynonymRegister;
  example: string;
}

export interface VerbAntonymItem {
  verb: string;
  turkish: string;
}

export interface VerbSynonymPayload {
  synonyms: VerbSynonymItem[];
  antonyms: VerbAntonymItem[];
  note: string | null;
}

export const synonymCache: Record<string, VerbSynonymPayload>;

export function fetchSynonyms(infinitive: string): Promise<VerbSynonymPayload>;
