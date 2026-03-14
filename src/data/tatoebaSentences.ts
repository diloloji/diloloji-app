/**
 * Tatoeba cümle çiftleri (fr-tr, es-tr).
 * public/data/fr-tr.json ve es-tr.json dosyalarından yüklenir.
 */

export type SentencePair = { original: string; translated: string };

const CACHE: { fr: SentencePair[] | null; es: SentencePair[] | null } = { fr: null, es: null };

/** Fransızca veya İspanyolca cümle listesini getirir (bir kez yüklenir, cache’lenir). */
export async function fetchSentencePairs(lang: 'fr' | 'es'): Promise<SentencePair[]> {
  if (lang === 'fr' && CACHE.fr) return CACHE.fr;
  if (lang === 'es' && CACHE.es) return CACHE.es;
  const file = lang === 'fr' ? 'fr-tr.json' : 'es-tr.json';
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const res = await fetch(`${base}/data/${file}`);
  if (!res.ok) return [];
  const data = (await res.json()) as SentencePair[];
  if (lang === 'fr') CACHE.fr = data;
  else CACHE.es = data;
  return data;
}

/** Tek bir kelimenin “tam olarak” geçtiği cümleleri bulur (kelime sınırı, en fazla limit adet). */
function isWordBoundary(c: string | undefined): boolean {
  if (c === undefined) return true;
  return !/[a-zA-ZàâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇñÑáéíóúÁÉÍÓÚ¿¡]/.test(c);
}

export function findSentencesContainingWord(
  pairs: SentencePair[],
  word: string,
  limit: number
): SentencePair[] {
  if (!word || !pairs.length) return [];
  const w = word.trim();
  const lower = w.toLowerCase();
  const result: SentencePair[] = [];
  for (let i = 0; i < pairs.length && result.length < limit; i++) {
    const orig = pairs[i].original;
    const idx = orig.toLowerCase().indexOf(lower);
    if (idx === -1) continue;
    const before = orig[idx - 1];
    const after = orig[idx + w.length];
    if (!isWordBoundary(before) || !isWordBoundary(after)) continue;
    result.push(pairs[i]);
  }
  return result;
}
