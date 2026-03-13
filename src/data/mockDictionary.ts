/**
 * Sözlük — geçici mock veri (API bağlanana kadar).
 * Yön: tr-fr | fr-tr | tr-es | es-tr
 */

export type DictDirection = 'tr-fr' | 'fr-tr' | 'tr-es' | 'es-tr';

export type DictionaryEntry = {
  tr: string;
  fr: string;
  es: string;
  type: string;
  exampleTr?: string;
  exampleFr?: string;
  exampleEs?: string;
};

const ENTRIES: DictionaryEntry[] = [
  { tr: 'elma', fr: 'pomme', es: 'manzana', type: 'isim', exampleTr: 'Masadaki elmalar taze.', exampleFr: 'Les pommes sur la table sont fraîches.', exampleEs: 'Las manzanas en la mesa están frescas.' },
  { tr: 'gitmek', fr: 'aller', es: 'ir', type: 'fiil', exampleTr: 'Yarın okula gideceğim.', exampleFr: 'J\'irai à l\'école demain.', exampleEs: 'Iré a la escuela mañana.' },
  { tr: 'güzel', fr: 'beau / belle', es: 'hermoso / hermosa', type: 'sıfat', exampleTr: 'Çok güzel bir gün.', exampleFr: 'Une très belle journée.', exampleEs: 'Un día muy hermoso.' },
  { tr: 'su', fr: 'eau', es: 'agua', type: 'isim', exampleTr: 'Bir bardak su lütfen.', exampleFr: 'Un verre d\'eau, s\'il vous plaît.', exampleEs: 'Un vaso de agua, por favor.' },
  { tr: 'kitap', fr: 'livre', es: 'libro', type: 'isim', exampleTr: 'Bu kitabı okudum.', exampleFr: 'J\'ai lu ce livre.', exampleEs: 'He leído este libro.' },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ı]/g, 'i');
}

function matchQuery(word: string, entry: DictionaryEntry, dir: DictDirection): boolean {
  const q = normalize(word);
  if (dir === 'tr-fr' || dir === 'fr-tr') {
    return normalize(entry.tr) === q || normalize(entry.fr) === q;
  }
  return normalize(entry.tr) === q || normalize(entry.es) === q;
}

function getSourceAndTarget(entry: DictionaryEntry, dir: DictDirection): { source: string; target: string; lang: 'fr' | 'es'; exampleSource?: string; exampleTarget?: string } {
  switch (dir) {
    case 'tr-fr':
      return { source: entry.tr, target: entry.fr, lang: 'fr', exampleSource: entry.exampleTr, exampleTarget: entry.exampleFr };
    case 'fr-tr':
      return { source: entry.fr, target: entry.tr, lang: 'fr', exampleSource: entry.exampleFr, exampleTarget: entry.exampleTr };
    case 'tr-es':
      return { source: entry.tr, target: entry.es, lang: 'es', exampleSource: entry.exampleTr, exampleTarget: entry.exampleEs };
    case 'es-tr':
      return { source: entry.es, target: entry.tr, lang: 'es', exampleSource: entry.exampleEs, exampleTarget: entry.exampleTr };
    default:
      return { source: entry.tr, target: entry.fr, lang: 'fr', exampleSource: entry.exampleTr, exampleTarget: entry.exampleFr };
  }
}

export type SearchResult = {
  source: string;
  target: string;
  type: string;
  lang: 'fr' | 'es';
  exampleSource?: string;
  exampleTarget?: string;
};

export function searchDictionary(query: string, direction: DictDirection): SearchResult | null {
  const q = query.trim();
  if (!q) return null;
  const entry = ENTRIES.find((e) => matchQuery(q, e, direction));
  if (!entry) return null;
  const { source, target, lang, exampleSource, exampleTarget } = getSourceAndTarget(entry, direction);
  return { source, target, type: entry.type, lang, exampleSource, exampleTarget };
}

export const DIRECTION_LABELS: Record<DictDirection, string> = {
  'tr-fr': 'TR ➔ FR',
  'fr-tr': 'FR ➔ TR',
  'tr-es': 'TR ➔ ES',
  'es-tr': 'ES ➔ TR',
};

export const DIRECTIONS: DictDirection[] = ['tr-fr', 'fr-tr', 'tr-es', 'es-tr'];
