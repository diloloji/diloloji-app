import { supabase, isSupabaseConfigured } from './supabase';
import type { MasteryRecord } from '../data/masterySystem';
import type { XpActivityHistory } from '../utils/xpLevel';

export type UserXpRow = {
  id: string;
  total_xp: number;
  streak: number;
  last_active_date: string | null;
  best_streak: number;
  xp_activity: XpActivityHistory;
  updated_at?: string;
};

export async function fetchUserXpRow(userId: string): Promise<UserXpRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('user_xp').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return data as UserXpRow;
}

export async function upsertUserXpRow(row: Partial<UserXpRow> & { id: string }): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('user_xp').upsert(
    {
      ...row,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  return !error;
}

/** Oturum içi XP ekleri (toplamı artırır). */
export async function upsertActivityLogDay(
  userId: string,
  day: string,
  xpEarned: number,
  correctCount: number
): Promise<void> {
  if (!supabase) return;
  const { data: existing } = await supabase
    .from('activity_log')
    .select('xp_earned, correct_count')
    .eq('user_id', userId)
    .eq('log_date', day)
    .maybeSingle();

  const nextXp = (existing?.xp_earned ?? 0) + xpEarned;
  const nextCorrect = (existing?.correct_count ?? 0) + correctCount;

  await supabase.from('activity_log').upsert(
    {
      user_id: userId,
      log_date: day,
      xp_earned: nextXp,
      correct_count: nextCorrect,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,log_date' }
  );
}

/** Giriş senkronu: gün değerini doğrudan yazar (üst üste eklemez). */
export async function replaceActivityLogDay(
  userId: string,
  day: string,
  xpEarned: number,
  correctCount: number
): Promise<void> {
  if (!supabase) return;
  await supabase.from('activity_log').upsert(
    {
      user_id: userId,
      log_date: day,
      xp_earned: xpEarned,
      correct_count: correctCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,log_date' }
  );
}

export async function fetchActivityLog(userId: string): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from('activity_log').select('log_date, xp_earned').eq('user_id', userId);
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data as { log_date: string; xp_earned: number }[]) {
    if (row.log_date) out[row.log_date] = row.xp_earned ?? 0;
  }
  return out;
}

export function masteryRecordToRow(
  userId: string,
  lang: string,
  verb: string,
  tense: string,
  person: string,
  rec: MasteryRecord
) {
  return {
    user_id: userId,
    lang,
    verb: verb.toLowerCase(),
    tense,
    person,
    correct_streak: rec.correctStreak,
    total_correct: rec.totalCorrect,
    total_attempts: rec.totalAttempts,
    last_seen: rec.lastSeen,
    next_review: rec.nextReview,
    mastery_level: rec.masteryLevel,
    interval: rec.interval,
    practice_days: rec.practiceDays,
    first_practice_day: rec.firstPracticeDay,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertVerbMasteryRow(
  userId: string,
  lang: 'es' | 'fr',
  verb: string,
  tense: string,
  person: string,
  rec: MasteryRecord
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  const row = masteryRecordToRow(userId, lang, verb, tense, person, rec);
  await supabase.from('verb_mastery').upsert(row, { onConflict: 'user_id,lang,verb,tense,person' });
}

export async function fetchAllVerbMastery(userId: string): Promise<MasteryRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('verb_mastery').select('*').eq('user_id', userId);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(dbRowToMasteryRecord);
}

function dbRowToMasteryRecord(r: Record<string, unknown>): MasteryRecord {
  const lang = String(r.lang ?? 'es');
  const verb = String(r.verb ?? '');
  const tense = String(r.tense ?? '');
  const person = String(r.person ?? '');
  const key = `${lang}_${verb}_${tense}_${person}`;
  const practiceDays = Array.isArray(r.practice_days) ? (r.practice_days as string[]) : [];
  return {
    key,
    verb,
    tense,
    person,
    correctStreak: Number(r.correct_streak ?? 0),
    totalCorrect: Number(r.total_correct ?? 0),
    totalAttempts: Number(r.total_attempts ?? 0),
    lastSeen: (r.last_seen as string) ?? null,
    nextReview: (r.next_review as string) ?? null,
    masteryLevel: Number(r.mastery_level ?? 0),
    interval: Math.max(1, Number(r.interval ?? 1)),
    practiceDays,
    firstPracticeDay: (r.first_practice_day as string) ?? null,
  };
}

export async function upsertUserFavorites(userId: string, verbs: string[]): Promise<void> {
  if (!supabase) return;
  await supabase.from('user_favorites').upsert(
    {
      user_id: userId,
      verbs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

export async function fetchUserFavorites(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('user_favorites').select('verbs').eq('user_id', userId).maybeSingle();
  const v = data?.verbs;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
