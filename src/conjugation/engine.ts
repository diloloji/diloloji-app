/**
 * Çekim motoru: french-verbs + french-verbs-lefff kullanarak
 * fiil (infinitif) ve zaman verince tüm şahıs çekimlerini üretir.
 * Veritabanı tutmaya gerek yok.
 */
import {
  getConjugation,
  isComposedTense,
  type Tense as LibraryTense,
} from 'french-verbs';
import type { VerbsInfo } from 'french-verbs-lefff';
import lefffConjugations from 'french-verbs-lefff/dist/conjugations.json';
import type { TenseId, Pronoun, ConjugationMap, VerbConjugations } from '../data/types';

const LEFFF = lefffConjugations as VerbsInfo;

const PRONOUNS: Pronoun[] = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];

/**
 * Uygulama zaman id → french-verbs API zaman adı.
 * Lefff tek harfleri: Présent P, Imparfait I, Passé Simple J, Futur F, Subjonctif Présent S.
 */
const TENSE_TO_LIB: Record<TenseId, LibraryTense> = {
  present: 'PRESENT',
  imparfait: 'IMPARFAIT',
  'passe-simple': 'PASSE_SIMPLE',
  'passe-compose': 'PASSE_COMPOSE',
  'futur-simple': 'FUTUR',
  'subjonctif-present': 'SUBJONCTIF_PRESENT',
};

/** Vurguları kaldırarak eşleştirme için normalize et (être ↔ etre) */
function normalizeForMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Kütüphanenin desteklediği tüm fiilleri kabul eder.
 * Lefff sözlüğündeki herhangi bir infinitif geçerlidir.
 */
export function findVerbKey(infinitive: string): string | null {
  const raw = infinitive.trim().toLowerCase();
  if (LEFFF[raw as keyof VerbsInfo]) return raw;
  const normalizedInput = normalizeForMatch(raw);
  const keys = Object.keys(LEFFF) as string[];
  const exact = keys.find((k) => k.toLowerCase() === raw);
  if (exact) return exact;
  const byNormalized = keys.find((k) => normalizeForMatch(k) === normalizedInput);
  return byNormalized ?? null;
}

/** Otomatik tamamlama için Lefff'teki tüm fiil listesi (sıralı). */
export function getVerbList(): string[] {
  return Object.keys(LEFFF) as string[];
}

/** Tek bir şahıs için çekim metnini zamirle birleştir (elision: j'ai) */
function withSubject(personIndex: number, conjugated: string): string {
  if (personIndex === 0) {
    const first = conjugated.charAt(0);
    if (/^[aeiouàâäéèêëïîôùûüyœæ]/i.test(first))
      return "j'" + conjugated;
    return 'je ' + conjugated;
  }
  if (personIndex === 1) return 'tu ' + conjugated;
  if (personIndex === 2) return 'il/elle ' + conjugated;
  if (personIndex === 3) return 'nous ' + conjugated;
  if (personIndex === 4) return 'vous ' + conjugated;
  return 'ils/elles ' + conjugated;
}

/**
 * Tek zaman için tüm şahısların çekimini üretir.
 */
export function getConjugationForTense(
  infinitive: string,
  tenseId: TenseId,
  options?: { agreeGender?: 'M' | 'F'; agreeNumber?: 'S' | 'P' }
): ConjugationMap {
  const tense = TENSE_TO_LIB[tenseId];
  const composedOptions =
    isComposedTense(tense)
      ? {
          agreeGender: options?.agreeGender ?? 'M',
          agreeNumber: options?.agreeNumber ?? 'S',
        }
      : undefined;

  const result = {} as ConjugationMap;
  for (let person = 0; person < 6; person++) {
    const conjugated = getConjugation(
      LEFFF,
      infinitive,
      tense,
      person,
      composedOptions ?? ({} as Parameters<typeof getConjugation>[4]),
      false,
      undefined,
      undefined,
      'Act'
    );
    result[PRONOUNS[person]] = withSubject(person, conjugated);
  }
  return result;
}

/**
 * Bir fiilin uygulama zamanlarındaki tüm çekimlerini üretir.
 */
export function conjugateVerb(infinitive: string): VerbConjugations {
  return {
    infinitive,
    present: getConjugationForTense(infinitive, 'present'),
    imparfait: getConjugationForTense(infinitive, 'imparfait'),
    'passe-simple': getConjugationForTense(infinitive, 'passe-simple'),
    'passe-compose': getConjugationForTense(infinitive, 'passe-compose'),
    'futur-simple': getConjugationForTense(infinitive, 'futur-simple'),
    'subjonctif-present': getConjugationForTense(infinitive, 'subjonctif-present'),
  };
}

/**
 * Fiil sözlükte var mı kontrol et.
 */
export function isVerbInDict(infinitive: string): boolean {
  return findVerbKey(infinitive) !== null;
}
