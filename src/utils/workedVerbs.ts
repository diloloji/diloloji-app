/**
 * Fiil laboratuvarında çalışılmış benzersiz fiiller (localStorage).
 */
const STORAGE_KEY = 'diloloji-worked-verbs-unique';

function normalizeVerb(v: string): string {
  return v.trim().toLowerCase();
}

export function recordWorkedVerb(verbKey: string): void {
  const n = normalizeVerb(verbKey);
  if (!n) return;
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    if (arr.some((x) => normalizeVerb(x) === n)) return;
    arr.push(verbKey.trim());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function getWorkedVerbsCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return 0;
    return list.filter((x) => typeof x === 'string' && x.trim().length > 0).length;
  } catch {
    return 0;
  }
}
