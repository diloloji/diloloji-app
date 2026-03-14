/**
 * İspanyolca çekim motoru: spanish-verbs kütüphanesi.
 * person: 0=yo, 1=tú, 2=él/ella/ud., 3=nosotros, 4=vosotros, 5=ellos/ellas/uds.
 */
import { getConjugation as getConjugationLib } from 'spanish-verbs';
import type { PronounEs, TenseIdEs } from '../data/spanish';
import { getVerbListSpanish } from '../data/spanish';

const PRONOUN_IDS: PronounEs[] = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos'];

const TENSE_TO_LIB: Record<TenseIdEs, string> = {
  presente: 'INDICATIVE_PRESENT',
  imperfecto: 'INDICATIVE_IMPERFECT',
  preterito: 'INDICATIVE_PRETERITE',
  'preterito-perfecto': 'INDICATIVE_PERFECT',
  pluscuamperfecto: 'INDICATIVE_PLUPERFECT',
  futuro: 'INDICATIVE_FUTURE',
  'futuro-compuesto': 'INDICATIVE_FUTURE_PERFECT',
  'subjuntivo-presente': 'SUBJUNCTIVE_PRESENT',
  condicional: 'CONDITIONAL_PRESENT',
};

export type ConjugationMapEs = Record<PronounEs, string>;

function normalizeInfinitive(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Girdinin geçerli bir İspanyolca fiil (infinitivo) olup olmadığını dener.
 */
export function findVerbKeyEs(infinitive: string): string | null {
  const raw = normalizeInfinitive(infinitive);
  if (!raw) return null;
  const list = getVerbListSpanish();
  const exact = list.find((v) => v.toLowerCase() === raw);
  if (exact) return exact;
  try {
    getConjugationLib(raw, 'INDICATIVE_PRESENT', 0);
    return raw;
  } catch {
    return null;
  }
}

/**
 * Tek zaman için tüm şahısların çekimini üretir (sadece çekim metni, zamir yok).
 */
export function getConjugationForTenseEs(
  infinitive: string,
  tenseId: TenseIdEs
): ConjugationMapEs {
  const tense = TENSE_TO_LIB[tenseId];
  const result = {} as ConjugationMapEs;
  for (let person = 0; person < 6; person++) {
    const conjugated = getConjugationLib(infinitive, tense, person as 0 | 1 | 2 | 3 | 4 | 5);
    result[PRONOUN_IDS[person]] = conjugated;
  }
  return result;
}

/**
 * Verilen fiil ve zaman için çekim sonucu (helpers ile uyumlu format).
 */
export type ConjugationResultEs =
  | { ok: true; infinitive: string; conjugations: ConjugationMapEs }
  | { ok: false; error: string };

const DEFAULT_ERROR_ES = 'Bu fiil kütüphanede bulunamadı. Geçerli bir İspanyolca fiil girin.';

export function getConjugationsEs(
  verbInput: string,
  tenseId: TenseIdEs
): ConjugationResultEs {
  const trimmed = verbInput.trim();
  if (!trimmed) {
    return { ok: false, error: 'Lütfen bir fiil girin.' };
  }
  const verbKey = findVerbKeyEs(trimmed);
  if (!verbKey) {
    return { ok: false, error: DEFAULT_ERROR_ES };
  }
  try {
    const conjugations = getConjugationForTenseEs(verbKey, tenseId);
    return { ok: true, infinitive: verbKey, conjugations };
  } catch {
    return { ok: false, error: DEFAULT_ERROR_ES };
  }
}
