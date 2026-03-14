/**
 * En sık kullanılan Fransızca fiiller (Lefff'te bulunanlar).
 * Rastgele fiil seçimi bu listeden yapılır.
 */
export const COMMON_FRENCH_VERBS = [
  'être',
  'avoir',
  'faire',
  'dire',
  'aller',
  'voir',
  'savoir',
  'pouvoir',
  'vouloir',
  'venir',
  'suivre',
  'parler',
  'prendre',
  'croire',
  'aimer',
  'passer',
  'penser',
  'attendre',
  'trouver',
  'laisser',
  'arriver',
  'donner',
  'regarder',
  'connaître',
  'vivre',
  'demander',
  'entendre',
  'sortir',
  'rentrer',
  'montrer',
  'travailler',
  'dormir',
  'ouvrir',
  'écrire',
  'lire',
  'mettre',
  'rester',
  'comprendre',
  'porter',
  'devenir',
  'revenir',
  'courir',
  'tenir',
  'sentir',
  'partir',
  'servir',
  'répondre',
  'commencer',
  'finir',
  'réussir',
  'choisir',
  'agir',
  'jouer',
  'manger',
  'oublier',
  'permettre',
  'appeler',
  'rappeler',
  'arrêter',
  'chercher',
  'marcher',
  'payer',
  'essayer',
  'continuer',
  'reprendre',
  'apprendre',
  'boire',
  'conduire',
  'construire',
  'produire',
  'réduire',
  'paraître',
  'disparaître',
  'naître',
  'plaire',
  'décrire',
  'sourire',
  'suffire',
  'recevoir',
  'apercevoir',
  'devoir',
  'valoir',
  'concevoir',
  'décevoir',
  'prévoir',
  'revoir',
  'offrir',
  'souffrir',
  'couvrir',
  'découvrir',
  'accueillir',
  'cueillir',
  'réveiller',
  'habiller',
  'geler',
  'jeter',
  'projeter',
  'rejeter',
  'acheter',
  'peser',
  'lever',
  'soulever',
  'mener',
  'amener',
  'emmener',
  'promener',
  'obtenir',
  'contenir',
  'maintenir',
  'prévenir',
  'intervenir',
  'convenir',
  'subvenir',
] as const;

export function getRandomVerb(exclude?: string): string {
  const list = COMMON_FRENCH_VERBS as unknown as string[];
  if (!exclude || list.length <= 1) {
    const i = Math.floor(Math.random() * list.length);
    return list[i];
  }
  const normalizedExclude = exclude.trim().toLowerCase();
  for (let attempt = 0; attempt < 25; attempt++) {
    const i = Math.floor(Math.random() * list.length);
    const v = list[i];
    if (v.toLowerCase() !== normalizedExclude) return v;
  }
  return list[Math.floor(Math.random() * list.length)];
}

import type { AppLanguage } from './verbs';
import { getRandomVerbSpanish } from './spanish';

export function getRandomVerbForLang(lang: AppLanguage, exclude?: string): string {
  return lang === 'es' ? getRandomVerbSpanish(exclude) : getRandomVerb(exclude);
}
