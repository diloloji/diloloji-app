/**
 * Alıştırma modu: zaman (tense) bazlı temel XP ve bonuslar.
 */

export const TENSE_XP: Record<string, number> = {
  // İspanyolca
  presente: 10,
  preterito: 15,
  imperfecto: 15,
  'preterito-perfecto': 20,
  pluscuamperfecto: 25,
  futuro: 20,
  'futuro-compuesto': 25,
  condicional: 20,
  'subjuntivo-presente': 30,

  // Fransızca
  present: 10,
  'passe-compose': 20,
  imparfait: 15,
  'futur-simple': 20,
  conditionnel: 20,
  'subjonctif-present': 30,
  'plus-que-parfait': 25,
};

/** Tanımsız tense için varsayılan temel XP */
export const DEFAULT_TENSE_XP = 10;

/** Düzensiz fiil bonusu (sabit) */
export const IRREGULAR_BONUS = 5;

/** İlk denemede doğru: temel tense XP çarpanı (ör. 1.5 → %50 ek) */
export const FIRST_TRY_MULTIPLIER = 1.5;

export function getTenseBaseXp(tenseId: string): number {
  return TENSE_XP[tenseId] ?? DEFAULT_TENSE_XP;
}
