/**
 * hintEngine — Akıllı İpucu Sistemi'nin çekirdeği.
 *
 * Üç aşamalı ipucu akışı için yardımcılar:
 *   1) getRuleHint     — fiil + zaman + kişi için en uygun kural cümlesini döner.
 *   2) getLetterMask   — doğru cevabın ilk N harfini açıp geri kalanını noktayla maskeler.
 *   3) markRevealed    — cevap 3. denemede gösterildiğinde SRS önceliğini yükseltir.
 *   4) markHintUsed    — "?" butonuyla ipucu kullanıldığında SRS önceliğini düşük etki ile artırır.
 *
 * Sade, vanilla TS — yan etkisi yalnızca mistakeBank.addMistake çağrılarıdır.
 */

import { ES_HINT_RULES, type EsHintRule } from '../data/hintRules';
import type { TenseIdEs, PronounEs } from '../data/spanish';
import { getConjugationRule } from './conjugationRules';
import { addMistake } from './mistakeBank';
import type { AppLanguage } from '../data/verbs';

/** Fiilin İspanyolca mastar son ekini döner ('ar'|'er'|'ir'|null). */
function endingOf(verb: string): 'ar' | 'er' | 'ir' | null {
  const v = verb.toLowerCase();
  if (v.endsWith('ar')) return 'ar';
  if (v.endsWith('er')) return 'er';
  if (v.endsWith('ir')) return 'ir';
  return null;
}

/** Bir fiilin entry.ending listesindeki herhangi bir kalıba uyup uymadığı. */
function endingMatches(verb: string, endings: string[] | undefined): boolean {
  if (!endings || endings.length === 0) return false;
  const v = verb.toLowerCase();
  return endings.some((suf) => v.endsWith(suf));
}

/** Önceliklendirilmiş kural seçimi: belirli fiil > ek deseni > genel düzenli. */
export function pickRuleEs(verb: string, tense: TenseIdEs, pronoun: PronounEs): EsHintRule | null {
  const v = verb.toLowerCase().trim();
  const candidates = ES_HINT_RULES.filter((r) => r.tense === tense);
  if (candidates.length === 0) return null;

  const matchesPerson = (r: EsHintRule) => !r.person || r.person.includes(pronoun);

  const byVerb = candidates.find((r) => matchesPerson(r) && r.verbs && r.verbs.includes(v));
  if (byVerb) return byVerb;

  const byEnding = candidates.find((r) => matchesPerson(r) && endingMatches(v, r.ending));
  if (byEnding) return byEnding;

  const generic = candidates.find((r) => matchesPerson(r) && !r.verbs && !r.ending);
  if (generic) return generic;

  const end = endingOf(v);
  if (end) {
    const fallbackEnding = candidates.find((r) => matchesPerson(r) && r.ending && r.ending.includes(end));
    if (fallbackEnding) return fallbackEnding;
  }

  return candidates.find(matchesPerson) ?? null;
}

/** UI için tek satırlık kural metni (fiil tipi + kural cümlesi + örnek varsa). */
export function getRuleHint(
  verb: string,
  tense: string,
  pronoun: string,
  lang: AppLanguage,
  correctValue?: string
): string {
  if (lang === 'es') {
    const rule = pickRuleEs(verb, tense as TenseIdEs, pronoun as PronounEs);
    if (rule) {
      const ex = rule.example ? ` Örnek: ${rule.example}.` : '';
      return `${rule.rule}${ex}`;
    }
  }
  return getConjugationRule(verb, tense, pronoun, lang, correctValue);
}

/**
 * Doğru cevabın ilk N harfini açar; kalan harflerin sayısı kadar nokta koyar.
 * Boşluklar ve birleşik formlar (örn. "he comido") boşluk olarak korunur.
 *
 * Dönüş yapısı UI tarafında renklendirme için ayrılmıştır:
 *   tokens: [{ char, kind: 'shown' | 'hidden' | 'space' }]
 */
export type LetterMaskToken = { char: string; kind: 'shown' | 'hidden' | 'space' };

export function getLetterMask(answer: string, lettersShown: number): LetterMaskToken[] {
  const tokens: LetterMaskToken[] = [];
  let revealedCount = 0;
  for (const ch of answer) {
    if (ch === ' ') {
      tokens.push({ char: ' ', kind: 'space' });
      continue;
    }
    if (revealedCount < lettersShown) {
      tokens.push({ char: ch, kind: 'shown' });
      revealedCount += 1;
    } else {
      tokens.push({ char: '·', kind: 'hidden' });
    }
  }
  return tokens;
}

/**
 * 3 deneme sonunda cevap gösterildiğinde:
 *   - SRS'e eklenir; mistakeCount 3'e çıkar (öncelikli tekrar).
 *   - addMistake idempotent: zaten varsa sayaç artar, yoksa eklenir.
 *
 * 3 ardışık çağrı yapılır ki entry mistakeCount=3 olsun.
 */
export function markRevealedAfterThreeAttempts(verb: string, tense: string, pronoun: string): void {
  addMistake(verb, tense, pronoun);
  addMistake(verb, tense, pronoun);
  addMistake(verb, tense, pronoun);
}

/**
 * "?" ipucu butonuyla kullanıcı kendi isteğiyle yardım istediğinde:
 *   - SRS'e bir defa eklenir (mistakeCount += 1).
 *   - Skor tarafı çağıran tarafından -2 puanla işlenir.
 */
export function markHintUsed(verb: string, tense: string, pronoun: string): void {
  addMistake(verb, tense, pronoun);
}
