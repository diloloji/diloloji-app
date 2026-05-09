import type { TenseId } from './types';

/** YouTube arama metinleri (+ ile); Türkçe anlatım. */
const FRENCH_TENSE_YOUTUBE_QUERY: Partial<Record<TenseId, string>> & Record<string, string> = {
  present: 'fransizca+present+türkçe+anlatım',
  'passe-compose': 'fransizca+passe+compose+türkçe',
  imparfait: 'fransizca+imparfait+türkçe',
  'futur-simple': 'fransizca+futur+simple+türkçe',
  /** Uygulamada ayrı zaman id yok; ileride kullanım için */
  conditionnel: 'fransizca+conditionnel+türkçe',
  'subjonctif-present': 'fransizca+subjonctif+türkçe',
  'plus-que-parfait': 'fransizca+plus+que+parfait+türkçe',
  'passe-simple': 'fransizca+passe+simple+türkçe',
};

export function getFrenchTenseYoutubeSearchUrl(tenseId: string): string | null {
  const q = FRENCH_TENSE_YOUTUBE_QUERY[tenseId];
  if (!q) return null;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q.replace(/\+/g, ' '))}`;
}
