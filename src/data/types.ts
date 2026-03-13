export type TenseId =
  | 'present'
  | 'imparfait'
  | 'passe-simple'
  | 'passe-compose'
  | 'futur-simple'
  | 'subjonctif-present';

export type Pronoun = 'je' | 'tu' | 'il' | 'nous' | 'vous' | 'ils';

/** Kütüphane eşleştirmesi: P, I, PS, F, S */
export const TENSES: { id: TenseId; label: string }[] = [
  { id: 'present', label: 'Présent' },           // P
  { id: 'imparfait', label: 'Imparfait' },       // I
  { id: 'passe-simple', label: 'Passé Simple' }, // PS (J in Lefff)
  { id: 'passe-compose', label: 'Passé Composé' },
  { id: 'futur-simple', label: 'Futur Simple' }, // F
  { id: 'subjonctif-present', label: 'Subjonctif Présent' }, // S
];

/** Zamanları kip (mood) kategorilerine göre grupla — Select içinde <optgroup> ile gösterilir. */
export const TENSE_GROUPS: { mood: string; label: string; tenseIds: TenseId[] }[] = [
  { mood: 'indicatif', label: "L'Indicatif (Haber Kipi)", tenseIds: ['present', 'imparfait', 'passe-compose', 'passe-simple', 'futur-simple'] },
  { mood: 'subjonctif', label: 'Le Subjonctif (Dilek Kipi)', tenseIds: ['subjonctif-present'] },
];

export const PRONOUNS: { id: Pronoun; label: string }[] = [
  { id: 'je', label: 'Je' },
  { id: 'tu', label: 'Tu' },
  { id: 'il', label: 'Il/Elle' },
  { id: 'nous', label: 'Nous' },
  { id: 'vous', label: 'Vous' },
  { id: 'ils', label: 'Ils/Elles' },
];

export type ConjugationMap = Record<Pronoun, string>;

export type VerbConjugations = {
  infinitive: string;
  present: ConjugationMap;
  imparfait: ConjugationMap;
  'passe-simple': ConjugationMap;
  'passe-compose': ConjugationMap;
  'futur-simple': ConjugationMap;
  'subjonctif-present': ConjugationMap;
};
