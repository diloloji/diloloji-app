import type { TenseIdEs } from './spanish';

/** YouTube arama metinleri (Türkçe anlatım); boşluklar encodeURIComponent ile gönderilir. */
const SPANISH_TENSE_YOUTUBE_QUERY: Record<TenseIdEs, string> = {
  presente: 'ispanyolca presente türkçe anlatım',
  imperfecto: 'ispanyolca imperfecto türkçe anlatım',
  preterito: 'ispanyolca preterito indefinido türkçe anlatım',
  'preterito-perfecto': 'ispanyolca preterito perfecto türkçe',
  pluscuamperfecto: 'ispanyolca pluscuamperfecto türkçe',
  futuro: 'ispanyolca futuro simple türkçe anlatım',
  'futuro-compuesto': 'ispanyolca futuro compuesto türkçe anlatım',
  condicional: 'ispanyolca condicional türkçe anlatım',
  'subjuntivo-presente': 'ispanyolca subjuntivo türkçe anlatım',
};

export function getSpanishTenseYoutubeSearchUrl(tenseId: string): string | null {
  const q = SPANISH_TENSE_YOUTUBE_QUERY[tenseId as TenseIdEs];
  if (!q) return null;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
