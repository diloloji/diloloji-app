/**
 * Passé Composé Asistanı: yardımcı fiil (avoir/être) ve accord kontrolleri.
 * Sadece Passé Composé zamanı seçiliyken kullanılır.
 */
import { alwaysAuxEtre } from 'french-verbs';
import type { Pronoun } from '../data/types';

const PRONOUN_IDS: Pronoun[] = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'");
}

type Aux = 'AVOIR' | 'ETRE';

/** Kullanıcı girdisinden yardımcı fiil ve participe passé'yi çıkarır. */
function parsePasséComposé(input: string, personIndex: number): { aux: Aux; participle: string } | null {
  const s = normalize(input);
  if (!s) return null;

  const patterns: { avoir: RegExp; etre: RegExp }[] = [
    { avoir: /^(j'|je)\s+ai\s+(.+)$/, etre: /^(j'|je)\s+suis\s+(.+)$/ },
    { avoir: /^tu\s+as\s+(.+)$/, etre: /^tu\s+es\s+(.+)$/ },
    { avoir: /^(il|elle)\s+a\s+(.+)$/, etre: /^(il|elle)\s+est\s+(.+)$/ },
    { avoir: /^nous\s+avons\s+(.+)$/, etre: /^nous\s+sommes\s+(.+)$/ },
    { avoir: /^vous\s+avez\s+(.+)$/, etre: /^vous\s+êtes\s+(.+)$/ },
    { avoir: /^(ils|elles)\s+ont\s+(.+)$/, etre: /^(ils|elles)\s+sont\s+(.+)$/ },
  ];

  const { avoir: reAvoir, etre: reEtre } = patterns[personIndex];
  const matchAvoir = s.match(reAvoir);
  const matchEtre = s.match(reEtre);
  if (matchAvoir) return { aux: 'AVOIR', participle: matchAvoir[2].trim() };
  if (matchEtre) return { aux: 'ETRE', participle: matchEtre[2].trim() };
  return null;
}

/** Doğru cevap metninden yardımcı fiil ve participe passé'yi çıkarır (il/elle, ils/elles formatında). */
function parseCorrectPasséComposé(correctAnswer: string, personIndex: number): { aux: Aux; participle: string } | null {
  const s = normalize(correctAnswer);
  const patterns: { avoir: RegExp; etre: RegExp }[] = [
    { avoir: /^(j'|je)\s+ai\s+(.+)$/, etre: /^(j'|je)\s+suis\s+(.+)$/ },
    { avoir: /^tu\s+as\s+(.+)$/, etre: /^tu\s+es\s+(.+)$/ },
    { avoir: /^il\/elle\s+a\s+(.+)$/, etre: /^il\/elle\s+est\s+(.+)$/ },
    { avoir: /^nous\s+avons\s+(.+)$/, etre: /^nous\s+sommes\s+(.+)$/ },
    { avoir: /^vous\s+avez\s+(.+)$/, etre: /^vous\s+êtes\s+(.+)$/ },
    { avoir: /^ils\/elles\s+ont\s+(.+)$/, etre: /^ils\/elles\s+sont\s+(.+)$/ },
  ];
  const { avoir: reAvoir, etre: reEtre } = patterns[personIndex];
  const matchAvoir = s.match(reAvoir);
  const matchEtre = s.match(reEtre);
  if (matchAvoir) return { aux: 'AVOIR', participle: matchAvoir[2].trim() };
  if (matchEtre) return { aux: 'ETRE', participle: matchEtre[2].trim() };
  return null;
}

/** Fiilin être mi avoir mi aldığını döner (Dr. Mrs. Vandertramp vb. liste kütüphanede). */
export function getExpectedAux(verbKey: string): Aux {
  return alwaysAuxEtre(verbKey) ? 'ETRE' : 'AVOIR';
}

/**
 * Yanlış cevap verildiğinde özel ipucu üretir.
 * - Yanlış yardımcı fiil → être/avoir ipucu
 * - Être fiilde accord eksik → accord ipucu
 * Diğer hatalarda null döner (genel "Doğru cevap: ..." gösterilir).
 */
export function checkPasséComposéLogic(
  userAnswer: string,
  correctAnswer: string,
  pronoun: Pronoun,
  verbKey: string
): string | null {
  const personIndex = PRONOUN_IDS.indexOf(pronoun);
  if (personIndex === -1) return null;

  const parsed = parsePasséComposé(userAnswer, personIndex);
  const correctParsed = parseCorrectPasséComposé(correctAnswer, personIndex);
  if (!parsed || !correctParsed) return null;

  const expectedAux = getExpectedAux(verbKey);

  // 1) Yanlış yardımcı fiil
  if (parsed.aux !== expectedAux) {
    const auxName = expectedAux === 'ETRE' ? 'être' : 'avoir';
    return `İpucu: Bu fiil ${auxName} yardımcı fiiliyle çekimlenir.`;
  }

  // 2) Être ile çekimleniyorsa accord kontrolü (ils/elles → -s/-es; elle → -e)
  if (expectedAux === 'ETRE') {
    const userPart = parsed.participle;
    const correctPart = correctParsed.participle;

    function stem(part: string): string {
      let r = part;
      while (r.length > 0 && (r.endsWith('s') || r.endsWith('e'))) r = r.slice(0, -1);
      return r;
    }
    const userStem = stem(userPart);
    const correctStem = stem(correctPart);
    if (userStem === correctStem && userPart !== correctPart) {
      return 'İpucu: Cinsiyet veya çoğul uyumunu (accord) unuttun.';
    }
    if (personIndex === 5) {
      const correctHasPlural = correctPart.endsWith('s') || correctPart.endsWith('es');
      const userHasPlural = userPart.endsWith('s') || userPart.endsWith('es');
      if (correctHasPlural && !userHasPlural && userStem === correctStem) {
        return 'İpucu: Cinsiyet veya çoğul uyumunu (accord) unuttun.';
      }
    }
  }

  return null;
}
