/**
 * Çekim mantığının tek giriş noktası.
 * Kullanıcı girişi + zaman → çekimler veya hata.
 * Dil desteği: fr (Fransızca), es (İspanyolca).
 */
import type { TenseId, ConjugationMap } from '../data/types';
import type { AppLanguage } from '../data/verbs';
import { getTenses, getPronouns } from '../data/verbs';
import { findVerbKey, getConjugationForTense } from './engine';
import {
  getConjugationsEs,
  getConjugationForTenseEs,
  findVerbKeyEs,
} from './spanish';
import { getVerbListSpanish, COMMON_SPANISH_VERBS } from '../data/spanish';
import { getVerbListFrench, COMMON_FRENCH_VERBS } from '../data/french';

export type ConjugationResult =
  | { ok: true; infinitive: string; conjugations: ConjugationMap }
  | { ok: false; error: string };

export type ConjugationResultAny =
  | { ok: true; infinitive: string; conjugations: Record<string, string> }
  | { ok: false; error: string };

/** Tersine arama sonucu: çekimlenmiş form → mastar + zaman + şahıs */
export type ReverseLookupResult = {
  infinitive: string;
  tenseId: string;
  tenseLabel: string;
  pronounId: string;
  pronounLabel: string;
};

function normalizeForMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Fransızca çekim metninden zamir önekini kaldır (je suis → suis) */
function stripFrenchPronounPrefix(full: string): string {
  return full.replace(
    /^(j'|je\s+|tu\s+|il\/elle\s+|il\s+|elle\s+|nous\s+|vous\s+|ils\/elles\s+|ils\s+|elles\s+)/i,
    ''
  ).trim();
}

/**
 * Çekimlenmiş bir formu (örn. suis, hablamos) mastar fiile çevirir.
 * Önce yaygın fiillerde, bulunamazsa tüm listede arar.
 */
export function findInfinitiveByConjugatedForm(
  conjugatedInput: string,
  lang: AppLanguage
): ReverseLookupResult | null {
  const normalized = normalizeForMatch(conjugatedInput);
  if (!normalized) return null;

  const tenses = getTenses(lang);
  const pronouns = getPronouns(lang);
  const commonVerbs = lang === 'es' ? COMMON_SPANISH_VERBS : COMMON_FRENCH_VERBS;
  const fullList = lang === 'es' ? getVerbListSpanish() : getVerbListFrench();

  const searchList = [...commonVerbs, ...fullList.filter((v: string) => !(commonVerbs as readonly string[]).includes(v))];

  for (const infinitive of searchList) {
    const key = lang === 'es' ? findVerbKeyEs(infinitive) : findVerbKey(infinitive);
    if (!key) continue;
    for (const tense of tenses) {
      let map: Record<string, string>;
      try {
        map = getConjugationForTenseForLang(key, tense.id, lang);
      } catch {
        continue;
      }
      for (const pron of pronouns) {
        const value = map[pron.id];
        if (!value) continue;
        const valueNorm = normalizeForMatch(value);
        const verbOnlyNorm = lang === 'fr' ? normalizeForMatch(stripFrenchPronounPrefix(value)) : valueNorm;
        if (valueNorm === normalized || verbOnlyNorm === normalized) {
          return {
            infinitive: key,
            tenseId: tense.id,
            tenseLabel: tense.label,
            pronounId: pron.id,
            pronounLabel: pron.label,
          };
        }
      }
    }
  }
  return null;
}

const DEFAULT_ERROR = 'Bu fiil kütüphanede bulunamadı. Geçerli bir Fransızca fiil girin (Lefff sözlüğü).';

/**
 * Verilen fiil girişi ve zaman için çekimleri üretir (Fransızca).
 * Fiil kütüphanede yoksa hata döner.
 */
export function getConjugations(
  verbInput: string,
  tenseId: TenseId
): ConjugationResult {
  const trimmed = verbInput.trim();
  if (!trimmed) {
    return { ok: false, error: 'Lütfen bir fiil girin.' };
  }

  const verbKey = findVerbKey(trimmed);
  if (!verbKey) {
    return { ok: false, error: DEFAULT_ERROR };
  }

  try {
    const conjugations = getConjugationForTense(verbKey, tenseId);
    return { ok: true, infinitive: verbKey, conjugations };
  } catch {
    return { ok: false, error: DEFAULT_ERROR };
  }
}

/**
 * Seçili dile göre çekimleri üretir.
 */
export function getConjugationsForLang(
  verbInput: string,
  tenseId: string,
  lang: AppLanguage
): ConjugationResultAny {
  if (lang === 'es') {
    const r = getConjugationsEs(verbInput, tenseId as import('../data/spanish').TenseIdEs);
    return r;
  }
  const r = getConjugations(verbInput, tenseId as TenseId);
  return r.ok ? { ok: true, infinitive: r.infinitive, conjugations: r.conjugations } : r;
}

/**
 * Seçili dile göre tek zaman için çekim map'i.
 */
export function getConjugationForTenseForLang(
  verbKey: string,
  tenseId: string,
  lang: AppLanguage
): Record<string, string> {
  if (lang === 'es') {
    return getConjugationForTenseEs(verbKey, tenseId as import('../data/spanish').TenseIdEs);
  }
  return getConjugationForTense(verbKey, tenseId as TenseId);
}

/**
 * Seçili dile göre fiil anahtarını bulur (null = bulunamadı).
 */
export function findVerbKeyForLang(verbInput: string, lang: AppLanguage): string | null {
  if (lang === 'es') return findVerbKeyEs(verbInput);
  return findVerbKey(verbInput);
}

/**
 * Seçili dile göre fiil listesi (otomatik tamamlama).
 */
export function getVerbListForLang(lang: AppLanguage): string[] {
  return lang === 'es' ? getVerbListSpanish() : getVerbListFrench();
}

export { findVerbKey, getConjugationForTense, conjugateVerb, isVerbInDict, getVerbList } from './engine';
export { verifyConjugationMap, isCompoundTense } from './verification';
