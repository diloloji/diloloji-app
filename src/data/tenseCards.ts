/**
 * İspanyolca Zaman Kartları — Referans içerik.
 *
 * Her kart 1 zamanı özetler:
 *   - tense       : gösterilen ad
 *   - tenseId     : alıştırma modundaki id (TenseIdEs ile eşleşir; "subjuntivo-imperfecto" opsiyonel)
 *   - color       : kart rengi (tailwind palet adı)
 *   - when_to_use : 2-3 cümle, sade Türkçe
 *   - endings_regular : düzenli fiil ekleri, kişi sırası: yo / tú / él / nosotros / vosotros / ellos
 *   - example_verb    : çekim örneğinde kullanılan fiil (ör. "hablar")
 *   - irregulars_note : en sık düzensizlik notu
 *   - examples        : { es, tr } formunda 3 örnek cümle
 *   - confusion_warning : karıştırılan zaman uyarısı
 *
 * İçerikler kullanıcı tarafından (Opus çıktısından) güncellenecek.
 * Çekim ekleri doğru biçimde girildi; metinler "___" ile placeholder olarak işaretli.
 */

export type TenseCardColor =
  | 'blue'
  | 'violet'
  | 'teal'
  | 'amber'
  | 'orange'
  | 'indigo'
  | 'rose'
  | 'emerald'
  | 'slate';

export type TenseCardExample = { es: string; tr: string };

export type TenseCard = {
  tense: string;
  /** Alıştırma modundaki zaman id'si. 'subjuntivo-imperfecto' id'si şu an sistemde yok, referans olarak bırakıldı. */
  tenseId: string;
  color: TenseCardColor;
  when_to_use: string;
  /** Ek eşlemesi: anahtar (ör. "-ar" / "-er/-ir"), değer yo..ellos sırasıyla 6 elemanlı dizi. */
  endings_regular: Record<string, string[]>;
  example_verb: string;
  irregulars_note: string;
  examples: TenseCardExample[];
  confusion_warning: string;
};

const PLACEHOLDER_SENTENCE = '___';
const PLACEHOLDER_PARAGRAPH = '___ (İçerik yakında eklenecek.)';

export const ES_TENSE_CARDS: TenseCard[] = [
  {
    tense: 'Presente',
    tenseId: 'presente',
    color: 'blue',
    when_to_use: PLACEHOLDER_PARAGRAPH,
    endings_regular: {
      '-ar': ['o', 'as', 'a', 'amos', 'áis', 'an'],
      '-er': ['o', 'es', 'e', 'emos', 'éis', 'en'],
      '-ir': ['o', 'es', 'e', 'imos', 'ís', 'en'],
    },
    example_verb: 'hablar',
    irregulars_note: PLACEHOLDER_SENTENCE,
    examples: [
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
    ],
    confusion_warning: PLACEHOLDER_SENTENCE,
  },
  {
    tense: 'Pretérito Indefinido',
    tenseId: 'preterito',
    color: 'violet',
    when_to_use: PLACEHOLDER_PARAGRAPH,
    endings_regular: {
      '-ar': ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
      '-er/-ir': ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    },
    example_verb: 'hablar',
    irregulars_note: PLACEHOLDER_SENTENCE,
    examples: [
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
    ],
    confusion_warning: PLACEHOLDER_SENTENCE,
  },
  {
    tense: 'Pretérito Imperfecto',
    tenseId: 'imperfecto',
    color: 'teal',
    when_to_use: PLACEHOLDER_PARAGRAPH,
    endings_regular: {
      '-ar': ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
      '-er/-ir': ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    },
    example_verb: 'hablar',
    irregulars_note: PLACEHOLDER_SENTENCE,
    examples: [
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
    ],
    confusion_warning: PLACEHOLDER_SENTENCE,
  },
  {
    tense: 'Pretérito Perfecto',
    tenseId: 'preterito-perfecto',
    color: 'amber',
    when_to_use: PLACEHOLDER_PARAGRAPH,
    endings_regular: {
      'haber (presente)': ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
      '+ participio (-ar → -ado, -er/-ir → -ido)': ['—', '—', '—', '—', '—', '—'],
    },
    example_verb: 'hablar',
    irregulars_note: PLACEHOLDER_SENTENCE,
    examples: [
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
    ],
    confusion_warning: PLACEHOLDER_SENTENCE,
  },
  {
    tense: 'Pluscuamperfecto',
    tenseId: 'pluscuamperfecto',
    color: 'orange',
    when_to_use: PLACEHOLDER_PARAGRAPH,
    endings_regular: {
      'haber (imperfecto)': ['había', 'habías', 'había', 'habíamos', 'habíais', 'habían'],
      '+ participio': ['—', '—', '—', '—', '—', '—'],
    },
    example_verb: 'hablar',
    irregulars_note: PLACEHOLDER_SENTENCE,
    examples: [
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
    ],
    confusion_warning: PLACEHOLDER_SENTENCE,
  },
  {
    tense: 'Futuro Simple',
    tenseId: 'futuro',
    color: 'indigo',
    when_to_use: PLACEHOLDER_PARAGRAPH,
    endings_regular: {
      'mastar + ek': ['é', 'ás', 'á', 'emos', 'éis', 'án'],
    },
    example_verb: 'hablar',
    irregulars_note: PLACEHOLDER_SENTENCE,
    examples: [
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
    ],
    confusion_warning: PLACEHOLDER_SENTENCE,
  },
  {
    tense: 'Condicional',
    tenseId: 'condicional',
    color: 'rose',
    when_to_use: PLACEHOLDER_PARAGRAPH,
    endings_regular: {
      'mastar + ek': ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    },
    example_verb: 'hablar',
    irregulars_note: PLACEHOLDER_SENTENCE,
    examples: [
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
    ],
    confusion_warning: PLACEHOLDER_SENTENCE,
  },
  {
    tense: 'Subjuntivo Presente',
    tenseId: 'subjuntivo-presente',
    color: 'emerald',
    when_to_use: PLACEHOLDER_PARAGRAPH,
    endings_regular: {
      '-ar': ['e', 'es', 'e', 'emos', 'éis', 'en'],
      '-er/-ir': ['a', 'as', 'a', 'amos', 'áis', 'an'],
    },
    example_verb: 'hablar',
    irregulars_note: PLACEHOLDER_SENTENCE,
    examples: [
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
    ],
    confusion_warning: PLACEHOLDER_SENTENCE,
  },
  {
    tense: 'Subjuntivo Imperfecto',
    tenseId: 'subjuntivo-imperfecto',
    color: 'slate',
    when_to_use: PLACEHOLDER_PARAGRAPH,
    endings_regular: {
      '-ar (-ra)': ['ara', 'aras', 'ara', 'áramos', 'arais', 'aran'],
      '-er/-ir (-ra)': ['iera', 'ieras', 'iera', 'iéramos', 'ierais', 'ieran'],
    },
    example_verb: 'hablar',
    irregulars_note: PLACEHOLDER_SENTENCE,
    examples: [
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
      { es: PLACEHOLDER_SENTENCE, tr: PLACEHOLDER_SENTENCE },
    ],
    confusion_warning: PLACEHOLDER_SENTENCE,
  },
];

/** tenseId ile eşleşen kartı döner (yoksa null). */
export function getTenseCardById(tenseId: string): TenseCard | null {
  return ES_TENSE_CARDS.find((c) => c.tenseId === tenseId) ?? null;
}
