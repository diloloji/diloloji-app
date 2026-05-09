/**
 * Rastgele fiil: Fransızca COMMON_FRENCH_VERBS, İspanyolca spanish modülünde.
 */
export { COMMON_FRENCH_VERBS, getRandomVerbFrench } from './french';

import type { AppLanguage } from './verbs';
import { getRandomVerbSpanish } from './spanish';
import { getRandomVerbFrench } from './french';

export function getRandomVerb(exclude?: string): string {
  return getRandomVerbFrench(exclude);
}

export function getRandomVerbForLang(lang: AppLanguage, exclude?: string): string {
  return lang === 'es' ? getRandomVerbSpanish(exclude) : getRandomVerbFrench(exclude);
}
