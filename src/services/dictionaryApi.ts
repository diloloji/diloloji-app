/**
 * Sözlük — MyMemory çeviri API entegrasyonu.
 * Endpoint: https://api.mymemory.translated.net/get?q=${word}&langpair=${fromLang}|${toLang}
 */

import type { DictDirection } from '../data/mockDictionary';
import type { SearchResult } from '../data/mockDictionary';

const MYMEMORY_BASE = 'https://api.mymemory.translated.net/get';

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
    match?: number;
  };
  matches?: Array<{
    segment?: string;
    translation?: string;
    quality?: string;
  }>;
  responseStatus?: number;
  responseDetails?: string;
}

function directionToLangPair(direction: DictDirection): { from: string; to: string } {
  switch (direction) {
    case 'tr-fr':
      return { from: 'tr', to: 'fr' };
    case 'fr-tr':
      return { from: 'fr', to: 'tr' };
    case 'tr-es':
      return { from: 'tr', to: 'es' };
    case 'es-tr':
      return { from: 'es', to: 'tr' };
    default:
      return { from: 'tr', to: 'fr' };
  }
}

/**
 * MyMemory API ile kelime çevirir; sonucu SearchResult formatına dönüştürür.
 */
export async function translateWord(
  word: string,
  direction: DictDirection
): Promise<SearchResult | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  const { from, to } = directionToLangPair(direction);
  const langpair = `${from}|${to}`;
  const url = `${MYMEMORY_BASE}?q=${encodeURIComponent(trimmed)}&langpair=${encodeURIComponent(langpair)}`;

  const res = await fetch(url);
  const data = (await res.json()) as MyMemoryResponse;

  const translatedText = data.responseData?.translatedText?.trim();
  if (!translatedText) return null;

  const lang: 'fr' | 'es' = direction === 'tr-fr' || direction === 'fr-tr' ? 'fr' : 'es';
  const source = trimmed;
  const target = translatedText;
  const firstMatch = Array.isArray(data.matches) && data.matches.length > 0 ? data.matches[0] : null;

  const result: SearchResult = {
    source,
    target,
    type: 'kelime',
    lang,
    phonetic: '/[Arama]/',
    exampleSource: firstMatch?.segment,
    exampleTarget: firstMatch?.translation,
    synonyms: undefined,
    antonyms: undefined,
    prefix: undefined,
    root: undefined,
    targetVerb: undefined,
  };

  return result;
}
