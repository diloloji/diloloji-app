/**
 * Fransızca fiil → Türkçe anlam sözlüğü.
 * Rozet (badge) için kullanılır.
 */
import verbMeanings from './verbMeanings.json';

const meanings = verbMeanings as Record<string, string>;

export function getVerbMeaning(verbKey: string): string | null {
  const key = verbKey.trim().toLowerCase();
  return meanings[key] ?? null;
}
