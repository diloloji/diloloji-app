/**
 * Kök ve ek ayrımı (stem & suffix) — çekim tablolarında görsel vurgu için.
 * Zaman ve dile göre bilinen ekleri sondan eşleştirir; düzensiz formlarda fallback.
 */

import type { AppLanguage } from '../data/verbs';

/** Fransızca çekim metninden zamir önekini kaldır (je parle → parle, j'ai parlé → ai parlé). */
function stripFrenchPronounPrefix(full: string): string {
  return full
    .replace(
      /^(j'|je\s+|tu\s+|il\/elle\s+|il\s+|elle\s+|nous\s+|vous\s+|ils\/elles\s+|ils\s+|elles\s+)/i,
      ''
    )
    .trim();
}

/** Çekim metninden “fiil kısmı”nı al: FR’da zamiri kaldır, bileşik zamanda son kelime (participle). */
function getVerbPartToSplit(full: string, lang: AppLanguage): string {
  const raw = lang === 'fr' ? stripFrenchPronounPrefix(full) : full.trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return full;
  return parts[parts.length - 1];
}

/** Zaman id’sine göre olası ekler (sondan eşleştirme için uzundan kısaya). */
const FR_SUFFIXES: Record<string, string[]> = {
  present: ['ions', 'iez', 'ons', 'ent', 'ez', 'es', 'e', 's', 't'],
  imparfait: ['aient', 'ions', 'iez', 'ais', 'ait'],
  'passe-simple': ['âmes', 'âtes', 'èrent', 'îmes', 'îtes', 'irent', 'ûmes', 'ûtes', 'urent', 'ai', 'as', 'a', 'is', 'it', 'us', 'ut'],
  'passe-compose': ['ées', 'ée', 'és', 'é', 'ies', 'ie', 'is', 'i', 'ues', 'ue', 'us', 'u'],
  'futur-simple': ['ons', 'ont', 'ez', 'ai', 'as', 'a'],
  'subjonctif-present': ['ions', 'iez', 'ent', 'es', 'e'],
};

const ES_SUFFIXES: Record<string, string[]> = {
  presente: ['amos', 'emos', 'imos', 'áis', 'éis', 'ís', 'an', 'en', 'as', 'es', 'a', 'e', 'o'],
  imperfecto: ['ábamos', 'abais', 'aban', 'aba', 'abas', 'íamos', 'íais', 'ían', 'ía', 'ías'],
  preterito: ['asteis', 'aron', 'imos', 'isteis', 'ieron', 'aste', 'amos', 'iste', 'ió', 'é', 'ó', 'í', 'a'],
  futuro: ['emos', 'éis', 'án', 'é', 'ás', 'á'],
  condicional: ['íamos', 'íais', 'ían', 'ía', 'ías'],
  'subjuntivo-presente': ['emos', 'éis', 'en', 'amos', 'áis', 'an', 'es', 'as', 'e', 'a'],
  /* Bileşik zamanlar: participio ekleri (haber + participio); sondan eşleştirme. */
  'preterito-perfecto': ['ados', 'adas', 'ado', 'ada', 'idos', 'idas', 'ido', 'ida', 'chos', 'chas', 'cho', 'cha', 'tos', 'tas', 'to', 'ta', 'sos', 'sas', 'so', 'sa', 'estos', 'estas', 'esto', 'esta', 'uestos', 'uestas', 'uesto', 'uesta'],
  pluscuamperfecto: ['ados', 'adas', 'ado', 'ada', 'idos', 'idas', 'ido', 'ida', 'chos', 'chas', 'cho', 'cha', 'tos', 'tas', 'to', 'ta', 'sos', 'sas', 'so', 'sa', 'estos', 'estas', 'esto', 'esta', 'uestos', 'uestas', 'uesto', 'uesta'],
  'futuro-compuesto': ['ados', 'adas', 'ado', 'ada', 'idos', 'idas', 'ido', 'ida', 'chos', 'chas', 'cho', 'cha', 'tos', 'tas', 'to', 'ta', 'sos', 'sas', 'so', 'sa', 'estos', 'estas', 'esto', 'esta', 'uestos', 'uestas', 'uesto', 'uesta'],
};

function getSuffixesForTense(tenseId: string, lang: AppLanguage): string[] {
  const map = lang === 'es' ? ES_SUFFIXES : FR_SUFFIXES;
  return map[tenseId] ?? [];
}

export type StemSuffixResult = { stem: string; suffix: string };

/**
 * Çekimlenmiş metni kök ve ek olarak böler.
 * @param conjugatedFull - Gösterilen tam metin (FR: "je parle", "j'ai parlé"; ES: "hablamos")
 * @param tenseId - Zaman id (fr: present, imparfait, ...; es: presente, imperfecto, ...)
 * @param lang - fr | es
 * @returns { stem, suffix }. Ekle bölünemezse suffix '' ve stem tüm fiil kısmı.
 */
export function formatConjugation(
  conjugatedFull: string,
  tenseId: string,
  lang: AppLanguage
): StemSuffixResult {
  const word = getVerbPartToSplit(conjugatedFull, lang);
  if (!word) return { stem: conjugatedFull, suffix: '' };

  const suffixes = getSuffixesForTense(tenseId, lang);
  for (const suf of suffixes) {
    if (suf.length >= word.length) continue;
    if (!word.endsWith(suf)) continue;
    const stemOfWord = word.slice(0, -suf.length);
    if (stemOfWord.length < 1) continue;
    const raw = lang === 'fr' ? stripFrenchPronounPrefix(conjugatedFull) : conjugatedFull.trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { stem: conjugatedFull, suffix: '' };
    parts[parts.length - 1] = stemOfWord;
    const newVerbPart = parts.join(' ');
    const stemDisplay = lang === 'fr' ? restoreFrenchPrefix(conjugatedFull, newVerbPart) : newVerbPart;
    return { stem: stemDisplay, suffix: suf };
  }

  return { stem: conjugatedFull, suffix: '' };
}

/** Fransızca tam metinde zamir önekini koruyup sadece fiil kısmını yeni değerle değiştirir. */
function restoreFrenchPrefix(original: string, newVerbPart: string): string {
  const prefixMatch = original.match(/^(j'|je\s+|tu\s+|il\/elle\s+|il\s+|elle\s+|nous\s+|vous\s+|ils\/elles\s+|ils\s+|elles\s+)/i);
  if (!prefixMatch) return newVerbPart;
  return prefixMatch[1] + newVerbPart;
}
