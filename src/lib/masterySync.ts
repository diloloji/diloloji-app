import type { MasteryRecord } from '../data/masterySystem';
import { getCachedAuthUserId } from './authSession';
import { isSupabaseConfigured } from './supabase';
import { upsertVerbMasteryRow } from './userProgressDb';

export function syncVerbMasteryToCloudIfAuthed(
  lang: 'es' | 'fr',
  verb: string,
  tense: string,
  person: string,
  rec: MasteryRecord
): void {
  if (!isSupabaseConfigured) return;
  const uid = getCachedAuthUserId();
  if (!uid) return;
  void upsertVerbMasteryRow(uid, lang, verb, tense, person, rec);
}
