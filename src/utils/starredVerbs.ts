/**
 * Yıldızlı Fiiller: Kullanıcının favori fiillerini localStorage'da tutar.
 */
const STORAGE_KEY = 'conjume-starred-verbs';

function storageGet(): string[] {
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

function storageSet(items: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/** Tüm yıldızlı fiilleri döner. */
export function getStarredVerbs(): string[] {
  return storageGet();
}

/** Fiil yıldızlı mı? (eşleşme: lowercase) */
export function isStarredVerb(verb: string): boolean {
  const list = storageGet();
  const v = verb.trim().toLowerCase();
  return list.some((x) => x.toLowerCase() === v);
}

/** Fiili yıldızla (yoksa ekle). */
export function addStarredVerb(verb: string): string[] {
  const list = storageGet();
  const v = verb.trim().toLowerCase();
  if (list.some((x) => x.toLowerCase() === v)) return list;
  const next = [...list, v];
  storageSet(next);
  return next;
}

/** Fiilin yıldızını kaldır. */
export function removeStarredVerb(verb: string): string[] {
  const list = storageGet();
  const v = verb.trim().toLowerCase();
  const next = list.filter((x) => x.toLowerCase() !== v);
  if (next.length === list.length) return list;
  storageSet(next);
  return next;
}

/** Yıldızı aç/kapat; güncel listeyi döner. */
export function toggleStarredVerb(verb: string): string[] {
  if (isStarredVerb(verb)) return removeStarredVerb(verb);
  return addStarredVerb(verb);
}
