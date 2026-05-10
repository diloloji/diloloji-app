import { SPANISH_VERBS } from './spanish-data';

/**
 * İspanyolca dil verileri: zamirler, zamanlar, yaygın fiiller.
 * spanish-verbs kütüphanesi person: 0=yo, 1=tú, 2=él, 3=nosotros, 4=vosotros, 5=ellos.
 */

export type PronounEs = 'yo' | 'tu' | 'el' | 'nosotros' | 'vosotros' | 'ellos';

export type TenseIdEs =
  | 'presente'
  | 'imperfecto'
  | 'preterito'
  | 'preterito-perfecto'
  | 'pluscuamperfecto'
  | 'futuro'
  | 'futuro-compuesto'
  | 'subjuntivo-presente'
  | 'condicional';

export const PRONOUNS_ES: { id: PronounEs; label: string }[] = [
  { id: 'yo', label: 'Yo' },
  { id: 'tu', label: 'Tú' },
  { id: 'el', label: 'Él/Ella/Ud.' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'vosotros', label: 'Vosotros' },
  { id: 'ellos', label: 'Ellos/Ellas/Uds.' },
];

/**
 * Alıştırma odak modu (✏️ sırayla) — kişi dizisi daima bu sırada;
 * `Object.keys(conjugations)` veya mastery sıralaması kullanılmaz.
 * `getConjugationForTenseEs` içindeki person 0..5 ile aynı id sırası.
 */
export const SPANISH_QUIZ_PERSON_IDS: readonly PronounEs[] = [
  'yo',
  'tu',
  'el',
  'nosotros',
  'vosotros',
  'ellos',
];

export const TENSES_ES: { id: TenseIdEs; label: string }[] = [
  { id: 'presente', label: 'Presente' },
  { id: 'imperfecto', label: 'Pretérito Imperfecto' },
  { id: 'preterito', label: 'Pretérito Indefinido' },
  { id: 'preterito-perfecto', label: 'Pretérito Perfecto (haber + participio)' },
  { id: 'pluscuamperfecto', label: 'Pluscuamperfecto (había + participio)' },
  { id: 'futuro', label: 'Futuro Simple' },
  { id: 'futuro-compuesto', label: 'Futuro Compuesto (habré + participio)' },
  { id: 'condicional', label: 'Condicional' },
  { id: 'subjuntivo-presente', label: 'Subjuntivo Presente' },
];

export const TENSE_GROUPS_ES: { mood: string; label: string; tenseIds: TenseIdEs[] }[] = [
  {
    mood: 'indicativo',
    label: 'El Indicativo (Haber Kipi)',
    tenseIds: ['presente', 'imperfecto', 'preterito', 'preterito-perfecto', 'pluscuamperfecto', 'futuro', 'futuro-compuesto', 'condicional'],
  },
  {
    mood: 'subjonctif',
    label: 'El Subjuntivo (Dilek Kipi)',
    tenseIds: ['subjuntivo-presente'],
  },
];

/** Sol panel "Zamana göre düzensiz" — kısa zaman adı + Türkçe -de/-da (son ünlüye göre). */
export const SPANISH_TENSE_IRREGULAR_HEADLINE_WORD: Record<TenseIdEs, string> = {
  presente: 'PRESENTE',
  imperfecto: 'IMPERFECTO',
  preterito: 'INDEFINIDO',
  'preterito-perfecto': 'PRETÉRITO PERFECTO',
  pluscuamperfecto: 'PLUSCUAMPERFECTO',
  futuro: 'FUTURO',
  'futuro-compuesto': 'FUTURO COMPUESTO',
  condicional: 'CONDICIONAL',
  'subjuntivo-presente': 'SUBJUNTIVO PRESENTE',
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

export function formatSpanishIrregularSectionTitlePrefix(tenseId: TenseIdEs): string {
  const w = SPANISH_TENSE_IRREGULAR_HEADLINE_WORD[tenseId] ?? tenseId.toUpperCase();
  return w + appendTurkishLocativeDeDa(w);
}

/** En sık kullanılan İspanyolca fiiller (ser, estar, tener, hacer vb.) */
export const COMMON_SPANISH_VERBS = [
  'ser',
  'estar',
  'tener',
  'hacer',
  'ir',
  'decir',
  'poder',
  'ver',
  'querer',
  'venir',
  'saber',
  'hablar',
  'comer',
  'vivir',
  'escribir',
  'leer',
  'dar',
  'pensar',
  'entender',
  'empezar',
  'llegar',
  'deber',
  'poner',
  'salir',
  'volver',
  'conocer',
  'sentir',
  'pedir',
  'dormir',
  'servir',
  'repetir',
  'seguir',
  'conseguir',
  'encontrar',
  'contar',
  'costar',
  'jugar',
  'llamar',
  'trabajar',
  'estudiar',
  'ayudar',
  'pagar',
  'buscar',
  'sacar',
  'tomar',
  'dejar',
  'llevar',
  'pasar',
  'creer',
  'abrir',
  'recibir',
  'subir',
  'bajar',
  'cerrar',
  'perder',
  'entrar',
  'tratar',
  'ganar',
  'cambiar',
  'preparar',
  'usar',
  'acabar',
  'aceptar',
  'permitir',
  'decidir',
  'ocurrir',
  'comprender',
  'ofrecer',
  'recordar',
  'terminar',
  'necesitar',
  'mantener',
  'aparecer',
  'comprar',
  'vender',
  'correr',
  'aprender',
  'responder',
  'existir',
  'cumplir',
  'sufrir',
  'describir',
  'producir',
  'traducir',
  'conducir',
  'construir',
  'distinguir',
  'elegir',
  'recoger',
  'proteger',
  'dirigir',
  'exigir',
  'fingir',
  'perseguir',
  'corregir',
  'erguir',
] as const;

export function getRandomVerbSpanish(exclude?: string): string {
  const list = COMMON_SPANISH_VERBS as unknown as string[];
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

/** İspanyolca fiil listesi (otomatik tamamlama için) */
export function getVerbListSpanish(): string[] {
  return SPANISH_VERBS.map((v) => v.infinitive);
}
