/**
 * Bileşik zaman tanımı ve çekim doğrulama: [Yardımcı Fiil Çekimi] + [Asıl Fiilin Participio Formu].
 * Simple: doğrudan çekim. Compound: en az iki kelime (aux + participio) olmalı.
 */
import type { AppLanguage } from '../data/verbs';

const FR_COMPOUND_TENSES = new Set<string>(['passe-compose']);
const ES_COMPOUND_TENSES = new Set<string>(['preterito-perfecto', 'pluscuamperfecto', 'futuro-compuesto']);

/** Zaman bileşik mi? (Yardımcı fiil + participio kuralı geçerli) */
export function isCompoundTense(tenseId: string, lang: AppLanguage): boolean {
  if (lang === 'fr') return FR_COMPOUND_TENSES.has(tenseId);
  return ES_COMPOUND_TENSES.has(tenseId);
}

/**
 * Çekim map'ini doğrula: compound zamanlarda her değer "aux + participio" (en az bir boşluk) içermeli.
 * Eksik/hatalı satırlar boş string yapılır; UI'da "Veri Mevcut Değil" gösterilir.
 */
export function verifyConjugationMap(
  map: Record<string, string> | null | undefined,
  tenseId: string,
  lang: AppLanguage
): Record<string, string> {
  if (!map || typeof map !== 'object') return {};
  const isCompound = isCompoundTense(tenseId, lang);
  const result = { ...map };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (value == null || String(value).trim() === '') {
      result[key] = '';
      continue;
    }
    const trimmed = String(value).trim();
    if (isCompound && trimmed.indexOf(' ') === -1) {
      result[key] = '';
    }
  }
  return result;
}
