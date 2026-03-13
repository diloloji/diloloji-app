export {
  TENSES,
  TENSE_GROUPS,
  PRONOUNS,
  type TenseId,
  type Pronoun,
  type ConjugationMap,
  type VerbConjugations,
} from './types';

import type { TenseId } from './types';
import { TENSES, TENSE_GROUPS, PRONOUNS } from './types';
import { TENSES_ES, TENSE_GROUPS_ES, PRONOUNS_ES, type TenseIdEs, type PronounEs } from './spanish';

export type AppLanguage = 'fr' | 'es';

export type TenseIdAny = TenseId | TenseIdEs;
export type PronounAny = import('./types').Pronoun | PronounEs;

/** Seçili dile göre zaman listesi */
export function getTenses(lang: AppLanguage): { id: string; label: string }[] {
  return lang === 'es' ? TENSES_ES : TENSES;
}

/** Seçili dile göre zaman grupları (optgroup) */
export function getTenseGroups(lang: AppLanguage): { mood: string; label: string; tenseIds: string[] }[] {
  return lang === 'es' ? TENSE_GROUPS_ES : TENSE_GROUPS;
}

/** Seçili dile göre zamir listesi */
export function getPronouns(lang: AppLanguage): { id: string; label: string }[] {
  return lang === 'es' ? PRONOUNS_ES : PRONOUNS;
}
