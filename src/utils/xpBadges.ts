import { getActivityHistory } from './activityHistory';
import { getStreak } from './xpLevel';
import { getWorkedVerbsCount } from './workedVerbs';
import { isGamificationEnabled } from './gamificationGate';

const BADGES_STORAGE_KEY = 'diloloji-badges-earned';
const NIGHT_OWL_FLAG_KEY = 'diloloji-session-after-23';

const TA_PREFIX = 'diloloji-time-attack-scores';

export type BadgeId =
  | 'ilk_adim'
  | 'streak_3'
  | 'hiz_ustasi'
  | 'kelime_avcisi'
  | 'mukemmeliyetci'
  | 'gece_kusu'
  | 'combo_king'
  | 'haftalik_ogrenci';

export type BadgeDefinition = {
  id: BadgeId;
  emoji: string;
  name: string;
  description: string;
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'ilk_adim',
    emoji: '🎯',
    name: 'İlk Adım',
    description: 'İlk alıştırmayı tamamla',
  },
  {
    id: 'streak_3',
    emoji: '🔥',
    name: '3 Günlük Seri',
    description: '3 gün üst üste çalış',
  },
  {
    id: 'hiz_ustasi',
    emoji: '⚡',
    name: 'Hız Ustası',
    description: "Zamana Karşı'da 20+ skor",
  },
  {
    id: 'kelime_avcisi',
    emoji: '📚',
    name: 'Kelime Avcısı',
    description: '10 farklı fiil çalış',
  },
  {
    id: 'mukemmeliyetci',
    emoji: '💎',
    name: 'Mükemmeliyetçi',
    description: 'Bir fiili hatasız tamamla',
  },
  {
    id: 'gece_kusu',
    emoji: '🌙',
    name: 'Gece Kuşu',
    description: 'Gece 23:00 sonrası çalış',
  },
  {
    id: 'combo_king',
    emoji: '🏆',
    name: 'Combo King',
    description: 'x5 combo yap',
  },
  {
    id: 'haftalik_ogrenci',
    emoji: '🎓',
    name: 'Haftalık Öğrenci',
    description: '7 gün üst üste çalış',
  },
];

const BADGE_BY_ID = Object.fromEntries(BADGE_DEFINITIONS.map((b) => [b.id, b])) as Record<
  BadgeId,
  BadgeDefinition
>;

export function getEarnedBadgeIds(): BadgeId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BADGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set(BADGE_DEFINITIONS.map((b) => b.id));
    return parsed.filter((x): x is BadgeId => typeof x === 'string' && allowed.has(x as BadgeId));
  } catch {
    return [];
  }
}

function persistEarned(ids: BadgeId[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/** Yeni rozet kazanıldıysa true; toast için CustomEvent tetiklenir. */
export function earnBadge(id: BadgeId): boolean {
  if (!isGamificationEnabled()) return false;
  const cur = getEarnedBadgeIds();
  if (cur.includes(id)) return false;
  const def = BADGE_BY_ID[id];
  if (!def) return false;
  persistEarned([...cur, id]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('diloloji-badge-unlocked', {
        detail: { emoji: def.emoji, name: def.name },
      })
    );
  }
  return true;
}

export function markNightOwlSessionIfNeeded(): void {
  if (!isGamificationEnabled()) return;
  if (typeof window === 'undefined') return;
  const h = new Date().getHours();
  if (h >= 23) {
    try {
      window.localStorage.setItem(NIGHT_OWL_FLAG_KEY, '1');
    } catch {
      /* ignore */
    }
  }
}

function hasNightOwlFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(NIGHT_OWL_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function sumActivityCorrect(): number {
  try {
    return Object.values(getActivityHistory()).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  } catch {
    return 0;
  }
}

function timeAttackMaxScoreAllDifficulties(): number {
  if (typeof window === 'undefined') return 0;
  let max = 0;
  for (const diff of ['easy', 'medium', 'hard'] as const) {
    try {
      const raw = window.localStorage.getItem(`${TA_PREFIX}-${diff}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      for (const e of parsed) {
        if (e && typeof e === 'object' && 'score' in e && typeof (e as { score: unknown }).score === 'number') {
          max = Math.max(max, (e as { score: number }).score);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return max;
}

/** XP / aktivite sonrası uygun rozetleri kontrol eder. */
export function runBadgeChecks(): void {
  const earned = new Set(getEarnedBadgeIds());

  const tryEarn = (id: BadgeId, ok: boolean) => {
    if (!ok || earned.has(id)) return;
    if (earnBadge(id)) earned.add(id);
  };

  tryEarn('ilk_adim', sumActivityCorrect() >= 1);
  tryEarn('streak_3', getStreak() >= 3);
  tryEarn('haftalik_ogrenci', getStreak() >= 7);
  tryEarn('hiz_ustasi', timeAttackMaxScoreAllDifficulties() >= 20);
  tryEarn('kelime_avcisi', getWorkedVerbsCount() >= 10);
  tryEarn('gece_kusu', hasNightOwlFlag());
  // combo_king ve mukemmeliyetci: Page / oyun olaylarından earnBadge ile
}

/** İlk XP kazanımında da “ilk adım” tetiklensin diye (doğru sayacı 0 iken XP varsa). */
export function runBadgeChecksAfterXp(): void {
  markNightOwlSessionIfNeeded();
  runBadgeChecks();
}

export function tryUnlockPerfectionistBadge(): void {
  earnBadge('mukemmeliyetci');
}

export function tryUnlockComboKingBadge(combo: number): void {
  if (combo >= 5) earnBadge('combo_king');
}

/** Zamana Karşı skoru kaydedildikten sonra çağırın. */
export function runTimeAttackBadgeChecks(score: number, maxCombo: number): void {
  tryUnlockComboKingBadge(maxCombo);
  if (score >= 20) earnBadge('hiz_ustasi');
  runBadgeChecks();
}
