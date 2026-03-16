/**
 * Öğrenme Yolu ilerleme kaydı — localStorage'da kalıcı.
 * Key: diloloji_learning_progress
 */

export interface LearningProgress {
  [langCode: string]: {
    [level: string]: {
      completedLessons: string[];
      xpEarned: number;
      lastStudied: string; // ISO date
    };
  };
}

const STORAGE_KEY = 'diloloji_learning_progress';

function parseUnitId(unitId: string): { lang: string; level: string } | null {
  const parts = unitId.split('_');
  if (parts.length < 2) return null;
  const lang = parts[0];
  const level = (parts[1] ?? '').toUpperCase();
  if (!lang || !level) return null;
  return { lang, level };
}

function getStored(): LearningProgress {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LearningProgress;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function setStored(data: LearningProgress) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Tüm ilerlemeyi döndürür */
export function getLearningProgress(): LearningProgress {
  return getStored();
}

/** Belirli dil ve seviye için tamamlanan ders anahtarları (örn. ["fr_a1_1_u1-ders-0", ...]) */
export function getCompletedLessons(lang: string, level: string): string[] {
  const data = getStored();
  const byLang = data[lang];
  if (!byLang) return [];
  const byLevel = byLang[level];
  if (!byLevel || !Array.isArray(byLevel.completedLessons)) return [];
  return byLevel.completedLessons;
}

/** Bir ünite için tamamlanan ders sayısı */
export function getCompletedCountForUnit(unitId: string): number {
  const parsed = parseUnitId(unitId);
  if (!parsed) return 0;
  const completed = getCompletedLessons(parsed.lang, parsed.level);
  const prefix = `${unitId}-ders-`;
  return completed.filter((id) => id.startsWith(prefix)).length;
}

/** Ders tamamlandığında çağrılır; XP ve tarih güncellenir */
export function saveLessonComplete(
  unitId: string,
  lessonIndex: number,
  xpEarned: number
): void {
  const parsed = parseUnitId(unitId);
  if (!parsed) return;
  const data = getStored();
  const { lang, level } = parsed;
  if (!data[lang]) data[lang] = {};
  if (!data[lang][level]) {
    data[lang][level] = { completedLessons: [], xpEarned: 0, lastStudied: new Date().toISOString() };
  }
  const lessonKey = `${unitId}-ders-${lessonIndex}`;
  if (!data[lang][level].completedLessons.includes(lessonKey)) {
    data[lang][level].completedLessons.push(lessonKey);
  }
  data[lang][level].xpEarned = (data[lang][level].xpEarned ?? 0) + xpEarned;
  data[lang][level].lastStudied = new Date().toISOString();
  setStored(data);
}

/** unitId'den dil ve seviye (kart durumu için) */
export function getLangLevelFromUnitId(unitId: string): { lang: string; level: string } | null {
  return parseUnitId(unitId);
}
