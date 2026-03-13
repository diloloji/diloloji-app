/**
 * Sözlük sayfası için geçici mock veri (TR↔FR, TR↔ES).
 * API bağlanana kadar arama bu veri üzerinden çalışır.
 */

export type DictDirection = 'tr-fr' | 'fr-tr' | 'tr-es' | 'es-tr';

export type DictionaryEntry = {
  word: string;
  partOfSpeech: string;
  translation: string;
  lang: 'tr' | 'fr' | 'es';
  examples?: { sentence: string; translation: string }[];
};

/** Anahtar: yön + normalize kelime (küçük, trim). Değer: entry. */
const TR_FR: Record<string, DictionaryEntry> = {
  elma: {
    word: 'elma',
    partOfSpeech: 'isim',
    translation: 'pomme',
    lang: 'fr',
    examples: [
      { sentence: 'J\'ai mangé une pomme.', translation: 'Bir elma yedim.' },
    ],
  },
  gitmek: {
    word: 'gitmek',
    partOfSpeech: 'fiil',
    translation: 'aller',
    lang: 'fr',
    examples: [
      { sentence: 'Je vais à l\'école.', translation: 'Okula gidiyorum.' },
    ],
  },
  su: {
    word: 'su',
    partOfSpeech: 'isim',
    translation: 'eau',
    lang: 'fr',
    examples: [
      { sentence: 'L\'eau est froide.', translation: 'Su soğuk.' },
    ],
  },
  kitap: {
    word: 'kitap',
    partOfSpeech: 'isim',
    translation: 'livre',
    lang: 'fr',
    examples: [
      { sentence: 'Ce livre est intéressant.', translation: 'Bu kitap ilginç.' },
    ],
  },
  güzel: {
    word: 'güzel',
    partOfSpeech: 'sıfat',
    translation: 'beau / belle',
    lang: 'fr',
    examples: [
      { sentence: 'C\'est une belle journée.', translation: 'Güzel bir gün.' },
    ],
  },
};

const FR_TR: Record<string, DictionaryEntry> = {
  pomme: {
    word: 'pomme',
    partOfSpeech: 'nom',
    translation: 'elma',
    lang: 'tr',
    examples: [
      { sentence: 'Une pomme par jour.', translation: 'Günde bir elma.' },
    ],
  },
  aller: {
    word: 'aller',
    partOfSpeech: 'verbe',
    translation: 'gitmek',
    lang: 'tr',
    examples: [
      { sentence: 'Je vais au marché.', translation: 'Markete gidiyorum.' },
    ],
  },
  eau: {
    word: 'eau',
    partOfSpeech: 'nom',
    translation: 'su',
    lang: 'tr',
  },
  livre: {
    word: 'livre',
    partOfSpeech: 'nom',
    translation: 'kitap',
    lang: 'tr',
  },
  beau: {
    word: 'beau',
    partOfSpeech: 'adjectif',
    translation: 'güzel (eril)',
    lang: 'tr',
  },
  belle: {
    word: 'belle',
    partOfSpeech: 'adjectif',
    translation: 'güzel (dişil)',
    lang: 'tr',
  },
};

const TR_ES: Record<string, DictionaryEntry> = {
  elma: {
    word: 'elma',
    partOfSpeech: 'isim',
    translation: 'manzana',
    lang: 'es',
    examples: [
      { sentence: 'Comí una manzana.', translation: 'Bir elma yedim.' },
    ],
  },
  gitmek: {
    word: 'gitmek',
    partOfSpeech: 'verbo',
    translation: 'ir',
    lang: 'es',
    examples: [
      { sentence: 'Voy a la escuela.', translation: 'Okula gidiyorum.' },
    ],
  },
  su: {
    word: 'su',
    partOfSpeech: 'isim',
    translation: 'agua',
    lang: 'es',
  },
  kitap: {
    word: 'kitap',
    partOfSpeech: 'isim',
    translation: 'libro',
    lang: 'es',
  },
  güzel: {
    word: 'güzel',
    partOfSpeech: 'adjetivo',
    translation: 'hermoso / hermosa',
    lang: 'es',
    examples: [
      { sentence: '¡Qué día más hermoso!', translation: 'Ne güzel bir gün!' },
    ],
  },
};

const ES_TR: Record<string, DictionaryEntry> = {
  manzana: {
    word: 'manzana',
    partOfSpeech: 'sustantivo',
    translation: 'elma',
    lang: 'tr',
    examples: [
      { sentence: 'Una manzana al día.', translation: 'Günde bir elma.' },
    ],
  },
  ir: {
    word: 'ir',
    partOfSpeech: 'verbo',
    translation: 'gitmek',
    lang: 'tr',
    examples: [
      { sentence: 'Voy al mercado.', translation: 'Markete gidiyorum.' },
    ],
  },
  agua: {
    word: 'agua',
    partOfSpeech: 'sustantivo',
    translation: 'su',
    lang: 'tr',
  },
  libro: {
    word: 'libro',
    partOfSpeech: 'sustantivo',
    translation: 'kitap',
    lang: 'tr',
  },
  hermoso: {
    word: 'hermoso',
    partOfSpeech: 'adjetivo',
    translation: 'güzel',
    lang: 'tr',
  },
};

const DATA: Record<DictDirection, Record<string, DictionaryEntry>> = {
  'tr-fr': TR_FR,
  'fr-tr': FR_TR,
  'tr-es': TR_ES,
  'es-tr': ES_TR,
};

function normalize(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function searchDictionary(
  direction: DictDirection,
  query: string
): DictionaryEntry | null {
  const q = normalize(query);
  if (!q) return null;
  const byDir = DATA[direction];
  return byDir[q] ?? null;
}

export const DIRECTION_LABELS: Record<DictDirection, string> = {
  'tr-fr': 'TR ➔ FR',
  'fr-tr': 'FR ➔ TR',
  'tr-es': 'TR ➔ ES',
  'es-tr': 'ES ➔ TR',
};

export const DIRECTION_ORDER: DictDirection[] = ['tr-fr', 'fr-tr', 'tr-es', 'es-tr'];

function swapDirection(d: DictDirection): DictDirection {
  switch (d) {
    case 'tr-fr': return 'fr-tr';
    case 'fr-tr': return 'tr-fr';
    case 'tr-es': return 'es-tr';
    case 'es-tr': return 'tr-es';
    default: return d;
  }
}

export function getSwapDirection(direction: DictDirection): DictDirection {
  return swapDirection(direction);
}
