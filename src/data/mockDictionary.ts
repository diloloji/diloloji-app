/**
 * Sözlük — Kelime Analiz Paneli mock verisi.
 * Yön: tr-fr | fr-tr | tr-es | es-tr | tr-en | en-tr
 */

export type DictDirection = 'tr-fr' | 'fr-tr' | 'tr-es' | 'es-tr' | 'tr-en' | 'en-tr';

export type DictionaryEntry = {
  tr: string;
  fr: string;
  es: string;
  type: string;
  exampleTr?: string;
  exampleFr?: string;
  exampleEs?: string;
  /** Fonetik (IPA) — hedef dilde */
  phoneticFr?: string;
  phoneticEs?: string;
  /** Eş anlamlılar — hedef dilde, virgülle ayrılmış */
  synonymsFr?: string;
  synonymsEs?: string;
  /** Zıt anlamlılar — hedef dilde */
  antonymsFr?: string;
  antonymsEs?: string;
  /** Kelime formülü: önek + kök (örn. re- + faire) */
  rootFr?: string;
  rootEs?: string;
  prefixFr?: string;
  prefixEs?: string;
};

const ENTRIES: DictionaryEntry[] = [
  {
    tr: 'elma',
    fr: 'pomme',
    es: 'manzana',
    type: 'isim',
    exampleTr: 'Masadaki elmalar taze.',
    exampleFr: 'Les pommes sur la table sont fraîches.',
    exampleEs: 'Las manzanas en la mesa están frescas.',
    phoneticFr: '/pɔm/',
    phoneticEs: '/manˈθana/',
    synonymsFr: 'fruit, malus',
    synonymsEs: 'fruta, manzana',
    antonymsFr: '—',
    antonymsEs: '—',
  },
  {
    tr: 'gitmek',
    fr: 'aller',
    es: 'ir',
    type: 'fiil',
    exampleTr: 'Yarın okula gideceğim.',
    exampleFr: "J'irai à l'école demain.",
    exampleEs: 'Iré a la escuela mañana.',
    phoneticFr: '/ale/',
    phoneticEs: '/iɾ/',
    synonymsFr: 'se rendre, se déplacer',
    synonymsEs: 'marchar, dirigirse',
    antonymsFr: 'revenir, rester',
    antonymsEs: 'volver, quedarse',
  },
  {
    tr: 'güzel',
    fr: 'beau / belle',
    es: 'hermoso / hermosa',
    type: 'sıfat',
    exampleTr: 'Çok güzel bir gün.',
    exampleFr: 'Une très belle journée.',
    exampleEs: 'Un día muy hermoso.',
    phoneticFr: '/bo/',
    phoneticEs: '/eɾˈmoso/',
    synonymsFr: 'joli, magnifique',
    synonymsEs: 'bello, lindo',
    antonymsFr: 'laid, moche',
    antonymsEs: 'feo, horrible',
  },
  {
    tr: 'su',
    fr: 'eau',
    es: 'agua',
    type: 'isim',
    exampleTr: 'Bir bardak su lütfen.',
    exampleFr: "Un verre d'eau, s'il vous plaît.",
    exampleEs: 'Un vaso de agua, por favor.',
    phoneticFr: '/o/',
    phoneticEs: '/ˈaɡwa/',
    synonymsFr: 'liquide, H₂O',
    synonymsEs: 'líquido',
    antonymsFr: '—',
    antonymsEs: '—',
  },
  {
    tr: 'kitap',
    fr: 'livre',
    es: 'libro',
    type: 'isim',
    exampleTr: 'Bu kitabı okudum.',
    exampleFr: "J'ai lu ce livre.",
    exampleEs: 'He leído este libro.',
    phoneticFr: '/livʁ/',
    phoneticEs: '/ˈliβɾo/',
    synonymsFr: 'ouvrage, bouquin',
    synonymsEs: 'ejemplar, publicación',
    antonymsFr: '—',
    antonymsEs: '—',
  },
  {
    tr: 'yapmak',
    fr: 'refaire',
    es: 'rehacer',
    type: 'fiil',
    exampleTr: 'Ödevimi yeniden yapacağım.',
    exampleFr: 'Je vais refaire mon devoir.',
    exampleEs: 'Voy a rehacer mi tarea.',
    phoneticFr: '/ʁəfɛʁ/',
    phoneticEs: '/re.aˈθeɾ/',
    synonymsFr: 'recommencer, répéter',
    synonymsEs: 'repetir, volver a hacer',
    antonymsFr: 'défaire',
    antonymsEs: 'deshacer',
    prefixFr: 're-',
    prefixEs: 're-',
    rootFr: 'faire',
    rootEs: 'hacer',
  },
  {
    tr: 'geçici, kısa ömürlü',
    fr: 'éphémère',
    es: 'efímero',
    type: 'sıfat',
    exampleTr: 'Anılarımız ne kadar éphémère.',
    exampleFr: 'Nos souvenirs sont éphémères.',
    exampleEs: 'Nuestros recuerdos son efímeros.',
    phoneticFr: '/efemɛʁ/',
    phoneticEs: '/eˈfimeɾo/',
    synonymsFr: 'fugace, passager',
    synonymsEs: 'pasajero, fugaz',
    antonymsFr: 'durable, permanent',
    antonymsEs: 'duradero, permanente',
  },
  {
    tr: 'şafak vakti, sabaha karşı',
    fr: 'aube',
    es: 'madrugada',
    type: 'isim',
    exampleTr: 'Madrugada\'da yola çıktık.',
    exampleFr: "Nous sommes partis à l'aube.",
    exampleEs: 'Salimos en la madrugada.',
    phoneticFr: '/ob/',
    phoneticEs: '/maðɾuˈɣaða/',
    synonymsFr: 'aube, point du jour',
    synonymsEs: 'alba, amanecer',
    antonymsFr: 'crépuscule',
    antonymsEs: 'atardecer',
  },
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
  if (dir === 'tr-en' || dir === 'en-tr') {
    return normalize(entry.tr) === q; // EN entries not in mock; Groq handles EN
  }
  return normalize(entry.tr) === q || normalize(entry.es) === q;
}

function getSourceAndTarget(
  entry: DictionaryEntry,
  dir: DictDirection
): {
  source: string;
  target: string;
  lang: 'fr' | 'es';
  exampleSource?: string;
  exampleTarget?: string;
  phonetic?: string;
  synonyms?: string;
  antonyms?: string;
  prefix?: string;
  root?: string;
  type: string;
  targetVerb?: string;
} {
  const base = {
    type: entry.type,
    targetVerb: entry.type === 'fiil' ? (dir === 'tr-fr' || dir === 'fr-tr' ? entry.fr : dir === 'tr-en' || dir === 'en-tr' ? entry.fr : entry.es) : undefined,
  };
  switch (dir) {
    case 'tr-fr':
      return {
        ...base,
        source: entry.tr,
        target: entry.fr,
        lang: 'fr',
        exampleSource: entry.exampleTr,
        exampleTarget: entry.exampleFr,
        phonetic: entry.phoneticFr,
        synonyms: entry.synonymsFr,
        antonyms: entry.antonymsFr,
        prefix: entry.prefixFr,
        root: entry.rootFr,
      };
    case 'fr-tr':
      return {
        ...base,
        source: entry.fr,
        target: entry.tr,
        lang: 'fr',
        exampleSource: entry.exampleFr,
        exampleTarget: entry.exampleTr,
        phonetic: entry.phoneticFr,
        synonyms: entry.synonymsFr,
        antonyms: entry.antonymsFr,
        prefix: entry.prefixFr,
        root: entry.rootFr,
      };
    case 'tr-es':
      return {
        ...base,
        source: entry.tr,
        target: entry.es,
        lang: 'es',
        exampleSource: entry.exampleTr,
        exampleTarget: entry.exampleEs,
        phonetic: entry.phoneticEs,
        synonyms: entry.synonymsEs,
        antonyms: entry.antonymsEs,
        prefix: entry.prefixEs,
        root: entry.rootEs,
      };
    case 'es-tr':
      return {
        ...base,
        source: entry.es,
        target: entry.tr,
        lang: 'es',
        exampleSource: entry.exampleEs,
        exampleTarget: entry.exampleTr,
        phonetic: entry.phoneticEs,
        synonyms: entry.synonymsEs,
        antonyms: entry.antonymsEs,
        prefix: entry.prefixEs,
        root: entry.rootEs,
      };
    case 'tr-en':
    case 'en-tr':
      // Mock entries have no EN; Groq handles EN. Fallback for type safety.
      return {
        ...base,
        source: dir === 'tr-en' ? entry.tr : entry.fr,
        target: dir === 'tr-en' ? entry.fr : entry.tr,
        lang: 'en',
        exampleSource: entry.exampleTr,
        exampleTarget: entry.exampleFr,
        phonetic: undefined,
        synonyms: undefined,
        antonyms: undefined,
        prefix: undefined,
        root: undefined,
      };
    default:
      return {
        ...base,
        source: entry.tr,
        target: entry.fr,
        lang: 'fr',
        exampleSource: entry.exampleTr,
        exampleTarget: entry.exampleFr,
        phonetic: entry.phoneticFr,
        synonyms: entry.synonymsFr,
        antonyms: entry.antonymsFr,
        prefix: entry.prefixFr,
        root: entry.rootFr,
      };
  }
}

export type SearchResult = {
  source: string;
  target: string;
  type: string;
  lang: 'fr' | 'es' | 'en';
  exampleSource?: string;
  exampleTarget?: string;
  phonetic?: string;
  synonyms?: string;
  antonyms?: string;
  prefix?: string;
  root?: string;
  /** Fiil ise hedef dilde mastar (Fiil Lab'a gönderilecek) */
  targetVerb?: string;
};

export function searchDictionary(query: string, direction: DictDirection): SearchResult | null {
  const q = query.trim();
  if (!q) return null;
  const entry = ENTRIES.find((e) => matchQuery(q, e, direction));
  if (!entry) return null;
  return getSourceAndTarget(entry, direction) as SearchResult;
}

export const DIRECTION_LABELS: Record<DictDirection, string> = {
  'tr-fr': 'TR ➔ FR',
  'fr-tr': 'FR ➔ TR',
  'tr-es': 'TR ➔ ES',
  'es-tr': 'ES ➔ TR',
  'tr-en': 'TR ➔ EN',
  'en-tr': 'EN ➔ TR',
};

export const DIRECTIONS: DictDirection[] = ['tr-fr', 'fr-tr', 'tr-es', 'es-tr', 'tr-en', 'en-tr'];

/** Boş durum: popüler aramalar (hedef dilde veya Türkçe) */
export const POPULAR_SEARCHES: { label: string; query: string; dir: DictDirection }[] = [
  { label: 'pomme', query: 'pomme', dir: 'fr-tr' },
  { label: 'aller', query: 'aller', dir: 'fr-tr' },
  { label: 'elma', query: 'elma', dir: 'tr-fr' },
  { label: 'ir', query: 'ir', dir: 'es-tr' },
  { label: 'manzana', query: 'manzana', dir: 'es-tr' },
  { label: 'refaire', query: 'refaire', dir: 'fr-tr' },
  { label: 'apple', query: 'apple', dir: 'en-tr' },
  { label: 'get', query: 'get', dir: 'en-tr' },
];

/** Bugünün kelimesi — basit rotasyon (günün tarihine göre) — tek kelime (geriye uyumluluk) */
export function getWordOfTheDay(): { word: string; dir: DictDirection; label: string } {
  const { fr } = getWordsOfTheDay();
  return { word: fr.word, dir: fr.dir, label: fr.label };
}

/** Günün kelimeleri — Fransızca + İspanyolca + İngilizce (boş durum ekranı için üç kart) */
export function getWordsOfTheDay(): {
  fr: { word: string; dir: DictDirection; label: string; translation: string };
  es: { word: string; dir: DictDirection; label: string; translation: string };
  en: { word: string; dir: DictDirection; label: string; translation: string };
} {
  const day = typeof window !== 'undefined' ? new Date().getDate() : 1;
  const frItems: { word: string; dir: DictDirection; label: string; translation: string }[] = [
    { word: 'éphémère', dir: 'fr-tr', label: 'Éphémère', translation: 'geçici, kısa ömürlü' },
    { word: 'refaire', dir: 'fr-tr', label: 'Refaire', translation: 'yeniden yapmak' },
    { word: 'pomme', dir: 'fr-tr', label: 'Pomme', translation: 'elma' },
    { word: 'aller', dir: 'fr-tr', label: 'Aller', translation: 'gitmek' },
    { word: 'eau', dir: 'fr-tr', label: 'Eau', translation: 'su' },
  ];
  const esItems: { word: string; dir: DictDirection; label: string; translation: string }[] = [
    { word: 'madrugada', dir: 'es-tr', label: 'Madrugada', translation: 'şafak vakti, sabaha karşı' },
    { word: 'manzana', dir: 'es-tr', label: 'Manzana', translation: 'elma' },
    { word: 'ir', dir: 'es-tr', label: 'Ir', translation: 'gitmek' },
    { word: 'rehacer', dir: 'es-tr', label: 'Rehacer', translation: 'yeniden yapmak' },
    { word: 'agua', dir: 'es-tr', label: 'Agua', translation: 'su' },
  ];
  const enItems: { word: string; dir: DictDirection; label: string; translation: string }[] = [
    { word: 'apple', dir: 'en-tr', label: 'Apple', translation: 'elma' },
    { word: 'get', dir: 'en-tr', label: 'Get', translation: 'almak, olmak' },
    { word: 'run', dir: 'en-tr', label: 'Run', translation: 'koşmak, işletmek' },
    { word: 'make', dir: 'en-tr', label: 'Make', translation: 'yapmak' },
    { word: 'water', dir: 'en-tr', label: 'Water', translation: 'su' },
  ];
  return {
    fr: frItems[day % frItems.length],
    es: esItems[day % esItems.length],
    en: enItems[day % enItems.length],
  };
}
