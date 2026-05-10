/**
 * Yıldızlı fiiller: misafirde localStorage; oturumda bellek + Supabase.
 */
import { getCachedAuthUserId } from '../lib/authSession';
import { upsertUserFavorites } from '../lib/userProgressDb';

const STORAGE_KEY = 'conjume-starred-verbs';

let cloudOverride: string[] | null = null;

/** AuthContext oturum açılınca / kapanınca çağrılır. */
export function setStarredCloudOverride(items: string[] | null) {
  cloudOverride = items === null ? null : [...items];
}

function storageGetLocal(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function storageSetLocal(items: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function readList(): string[] {
  if (cloudOverride !== null) return cloudOverride;
  return storageGetLocal();
}

function writeListAndMaybeCloud(items: string[]): void {
  if (cloudOverride !== null) {
    cloudOverride = items;
    const uid = getCachedAuthUserId();
    if (uid) void upsertUserFavorites(uid, items);
    return;
  }
  storageSetLocal(items);
}

/** Tüm yıldızlı fiilleri döner. */
export function getStarredVerbs(): string[] {
  return readList();
}

/** Fiil yıldızlı mı? (eşleşme: lowercase) */
export function isStarredVerb(verb: string): boolean {
  const list = readList();
  const v = verb.trim().toLowerCase();
  return list.some((x) => x.toLowerCase() === v);
}

/** Fiili yıldızla (yoksa ekle). */
export function addStarredVerb(verb: string): string[] {
  const list = readList();
  const v = verb.trim().toLowerCase();
  if (list.some((x) => x.toLowerCase() === v)) return list;
  const next = [...list, v];
  writeListAndMaybeCloud(next);
  return next;
}

/** Fiilin yıldızını kaldır. */
export function removeStarredVerb(verb: string): string[] {
  const list = readList();
  const v = verb.trim().toLowerCase();
  const next = list.filter((x) => x.toLowerCase() !== v);
  if (next.length === list.length) return list;
  writeListAndMaybeCloud(next);
  return next;
}

/** Yıldızı aç/kapat; güncel listeyi döner. */
export function toggleStarredVerb(verb: string): string[] {
  if (isStarredVerb(verb)) return removeStarredVerb(verb);
  return addStarredVerb(verb);
}
