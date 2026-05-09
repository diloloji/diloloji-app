import { MAX_LEVEL } from './xpLevel';

export type LevelVisual = {
  emoji: string;
  /** Popup / kart border */
  borderClass: string;
  /** Küçük seviye rozeti arka planı */
  badgeBgClass: string;
  /** Başlık metin rengi (Tailwind) */
  titleClass: string;
  /** Özel animasyon (L20) */
  isRainbow?: boolean;
};

/** Nav / popup için seviye görseli (1–20+). */
export function getLevelVisual(level: number): LevelVisual {
  const L = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));

  if (L === 20) {
    return {
      emoji: '🏆',
      borderClass: 'xp-level-border-rainbow',
      badgeBgClass: 'xp-level-badge-rainbow',
      titleClass: 'bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-400 bg-clip-text text-transparent',
      isRainbow: true,
    };
  }
  if (L >= 16) {
    return {
      emoji: '🌟',
      borderClass: 'border-2 border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.35)]',
      badgeBgClass: 'bg-gradient-to-br from-amber-500/90 via-yellow-500/85 to-orange-600/90',
      titleClass: 'text-amber-200',
    };
  }
  if (L >= 11) {
    return {
      emoji: '🔮',
      borderClass: 'border-2 border-violet-500/70 shadow-[0_0_18px_rgba(139,92,246,0.35)]',
      badgeBgClass: 'bg-gradient-to-br from-violet-600 via-fuchsia-600 to-indigo-700',
      titleClass: 'text-violet-100',
    };
  }

  const table: Record<number, Omit<LevelVisual, 'isRainbow'>> = {
    1: {
      emoji: '🌱',
      borderClass: 'border-2 border-slate-400/70 dark:border-slate-500',
      badgeBgClass: 'bg-gradient-to-br from-slate-500 to-slate-600',
      titleClass: 'text-slate-100',
    },
    2: {
      emoji: '⚡',
      borderClass: 'border-2 border-violet-500/80',
      badgeBgClass: 'bg-gradient-to-br from-violet-600 to-purple-700',
      titleClass: 'text-violet-100',
    },
    3: {
      emoji: '🔥',
      borderClass: 'border-2 border-orange-500/85',
      badgeBgClass: 'bg-gradient-to-br from-orange-500 to-red-600',
      titleClass: 'text-orange-50',
    },
    4: {
      emoji: '📚',
      borderClass: 'border-2 border-blue-500/85',
      badgeBgClass: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      titleClass: 'text-blue-50',
    },
    5: {
      emoji: '⚙️',
      borderClass: 'border-2 border-sky-800/90 dark:border-sky-600',
      badgeBgClass: 'bg-gradient-to-br from-sky-800 to-blue-950',
      titleClass: 'text-sky-100',
    },
    6: {
      emoji: '🎯',
      borderClass: 'border-2 border-emerald-500/85',
      badgeBgClass: 'bg-gradient-to-br from-emerald-500 to-teal-700',
      titleClass: 'text-emerald-50',
    },
    7: {
      emoji: '🗡️',
      borderClass: 'border-2 border-red-600/85',
      badgeBgClass: 'bg-gradient-to-br from-red-600 to-rose-800',
      titleClass: 'text-red-50',
    },
    8: {
      emoji: '💎',
      borderClass: 'border-2 border-cyan-400/90',
      badgeBgClass: 'bg-gradient-to-br from-cyan-500 to-teal-600',
      titleClass: 'text-cyan-50',
    },
    9: {
      emoji: '🌙',
      borderClass: 'border-2 border-indigo-500/85',
      badgeBgClass: 'bg-gradient-to-br from-indigo-600 to-violet-900',
      titleClass: 'text-indigo-100',
    },
    10: {
      emoji: '👑',
      borderClass: 'border-2 border-amber-400/90 shadow-[0_0_16px_rgba(251,191,36,0.4)]',
      badgeBgClass: 'bg-gradient-to-br from-amber-500 to-yellow-600',
      titleClass: 'text-amber-50',
    },
  };

  return table[L] ?? table[1];
}
