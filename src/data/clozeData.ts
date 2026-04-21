/**
 * Cloze Sprint — 60 sn hızlı fiil çekim modunun cümle havuzu.
 *
 * Prototip: 5 cümle. Onaylandıktan sonra 60 cümleye çıkaracağız.
 *
 * Yeni cümle eklemek için sadece CLOZE_ENTRIES dizisine push:
 *  - `sentence` içinde boşluk yeri tam olarak `_____` (5 alt çizgi) olmalı.
 *  - `answer` cevap normalize edilmeden önce tam form (gerekirse aksanlı).
 *  - Karşılaştırma aksanları ve büyük/küçüğü yok sayar (normalizeAnswer).
 */

export type ClozeLevel = 'A2' | 'B1' | 'B2';

/** Görünürde kullanılan tüm zaman adları. İpucu panelinde aynen gösterilir. */
export type ClozeTenseLabel =
  | 'Presente'
  | 'Pretérito Indefinido'
  | 'Pretérito Imperfecto'
  | 'Pretérito Perfecto'
  | 'Pluscuamperfecto'
  | 'Futuro Simple'
  | 'Condicional'
  | 'Subjuntivo Presente';

export interface ClozeEntry {
  id: string;
  /** Boşluk için tam olarak "_____" (5 alt çizgi) kullanın. */
  sentence: string;
  verb: string;
  tense: ClozeTenseLabel;
  person: 'yo' | 'tú' | 'él/ella/ud.' | 'nosotros' | 'vosotros' | 'ellos/ellas/uds.';
  answer: string;
  level: ClozeLevel;
  hint: string;
}

export const CLOZE_ENTRIES: ClozeEntry[] = [
  {
    id: 'cloze_01',
    sentence: 'Ayer yo _____ al mercado con mi madre.',
    verb: 'ir',
    tense: 'Pretérito Indefinido',
    person: 'yo',
    answer: 'fui',
    level: 'A2',
    hint: 'ir → fui: ir ve ser Indefinido\'da aynı çekimi paylaşır.',
  },
  {
    id: 'cloze_02',
    sentence: 'Todos los días nosotros _____ en casa a las dos.',
    verb: 'comer',
    tense: 'Presente',
    person: 'nosotros',
    answer: 'comemos',
    level: 'A2',
    hint: 'comer → comemos: düzenli -er fiili presente nosotros formunda -emos eki alır.',
  },
  {
    id: 'cloze_03',
    sentence: 'Cuando era joven, yo _____ el pelo muy largo.',
    verb: 'tener',
    tense: 'Pretérito Imperfecto',
    person: 'yo',
    answer: 'tenía',
    level: 'B1',
    hint: 'tener imperfecto\'da düzenlidir: -er eki ía/ías/ía; yo → tenía.',
  },
  {
    id: 'cloze_04',
    sentence: 'Si tuviera tiempo, yo te _____ con el proyecto.',
    verb: 'ayudar',
    tense: 'Condicional',
    person: 'yo',
    answer: 'ayudaría',
    level: 'B1',
    hint: 'ayudar → ayudaría: düzenli fiiller condicional\'da mastara -ía eki ekler (yo).',
  },
  {
    id: 'cloze_05',
    sentence: 'Dudo que _____ suficiente comida para todos en la fiesta.',
    verb: 'haber',
    tense: 'Subjuntivo Presente',
    person: 'él/ella/ud.',
    answer: 'haya',
    level: 'B2',
    hint: 'haber düzensizdir: subjuntivo kökü hay-; impersonal "hay" → "haya".',
  },
];

/** Seviyeye göre cümleleri filtreler. */
export function filterClozeEntries(level: ClozeLevel | 'all'): ClozeEntry[] {
  if (level === 'all') return CLOZE_ENTRIES.slice();
  return CLOZE_ENTRIES.filter((e) => e.level === level);
}

/** Fisher-Yates — seans başında cümle havuzunu karıştırır. */
export function shuffleEntries<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Kullanıcı cevabını normalize eder: trim, lowercase, aksan stripping. */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Cevap doğru mu? Aksan/case bağımsız. */
export function isClozeAnswerCorrect(user: string, expected: string): boolean {
  if (!user.trim()) return false;
  return normalizeAnswer(user) === normalizeAnswer(expected);
}
