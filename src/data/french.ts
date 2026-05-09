import { FRENCH_VERBS } from './french-data';
import type { TenseId } from './types';

/**
 * Fransızca dil verileri: yaygın fiiller, zaman başlıkları (Fiil Lab sol panel).
 */

/** Sol panel "Zamana göre düzensiz" — kısa zaman adı + Türkçe -de/-da (son ünlüye göre). */
export const FRENCH_TENSE_IRREGULAR_HEADLINE_WORD: Record<TenseId, string> = {
  present: 'PRÉSENT',
  imparfait: 'IMPARFAIT',
  'passe-simple': 'PASSÉ SIMPLE',
  'passe-compose': 'PASSÉ COMPOSÉ',
  'futur-simple': 'FUTUR SIMPLE',
  'subjonctif-present': 'SUBJONCTIF PRÉSENT',
};

function appendTurkishLocativeDeDa(upperPhrase: string): "'DE" | "'DA" {
  const s = upperPhrase
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  const front = new Set(['e', 'i', 'ö', 'ü']);
  for (let i = s.length - 1; i >= 0; i--) {
    const ch = s[i];
    if (front.has(ch)) return "'DE";
    if ('aıou'.includes(ch)) return "'DA";
  }
  return "'DE";
}

export function formatFrenchIrregularSectionTitlePrefix(tenseId: TenseId): string {
  const w = FRENCH_TENSE_IRREGULAR_HEADLINE_WORD[tenseId] ?? tenseId.toUpperCase();
  return w + appendTurkishLocativeDeDa(w);
}

/**
 * En sık kullanılan Fransızca fiiller (Lefff + uygulama listesi).
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

export function getRandomVerbFrench(exclude?: string): string {
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

/** Uygulama fiil listesi (otomatik tamamlama + beyaz liste) */
export function getVerbListFrench(): string[] {
  return FRENCH_VERBS.map((v) => v.infinitive);
}
