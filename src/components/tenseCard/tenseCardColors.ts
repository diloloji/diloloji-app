/**
 * Zaman Kartı renk paleti — tenseCards.ts'deki `color` alanına göre Tailwind sınıfları döner.
 * Her renk için üç varyant: accent (kenarlık/badge), bgSoft (kart arka planı), text (başlık tonu).
 */
import type { TenseCardColor } from '../../data/tenseCards';

export type TenseCardTheme = {
  /** Kart kenarlığı + başlık altı çizgi */
  accent: string;
  /** Kart arka planı (soft tint) */
  bgSoft: string;
  /** Başlık rengi / vurgu metni */
  text: string;
  /** Küçük badge arka planı */
  badgeBg: string;
};

export const TENSE_CARD_THEMES: Record<TenseCardColor, TenseCardTheme> = {
  blue: {
    accent: 'border-blue-300 dark:border-blue-500/40',
    bgSoft: 'bg-blue-50/80 dark:bg-blue-500/10',
    text: 'text-blue-900 dark:text-blue-200',
    badgeBg: 'bg-blue-100 dark:bg-blue-500/20',
  },
  violet: {
    accent: 'border-violet-300 dark:border-violet-500/40',
    bgSoft: 'bg-violet-50/80 dark:bg-violet-500/10',
    text: 'text-violet-900 dark:text-violet-200',
    badgeBg: 'bg-violet-100 dark:bg-violet-500/20',
  },
  teal: {
    accent: 'border-teal-300 dark:border-teal-500/40',
    bgSoft: 'bg-teal-50/80 dark:bg-teal-500/10',
    text: 'text-teal-900 dark:text-teal-200',
    badgeBg: 'bg-teal-100 dark:bg-teal-500/20',
  },
  amber: {
    accent: 'border-amber-300 dark:border-amber-500/40',
    bgSoft: 'bg-amber-50/80 dark:bg-amber-500/10',
    text: 'text-amber-900 dark:text-amber-200',
    badgeBg: 'bg-amber-100 dark:bg-amber-500/20',
  },
  orange: {
    accent: 'border-orange-300 dark:border-orange-500/40',
    bgSoft: 'bg-orange-50/80 dark:bg-orange-500/10',
    text: 'text-orange-900 dark:text-orange-200',
    badgeBg: 'bg-orange-100 dark:bg-orange-500/20',
  },
  indigo: {
    accent: 'border-indigo-300 dark:border-indigo-500/40',
    bgSoft: 'bg-indigo-50/80 dark:bg-indigo-500/10',
    text: 'text-indigo-900 dark:text-indigo-200',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-500/20',
  },
  rose: {
    accent: 'border-rose-300 dark:border-rose-500/40',
    bgSoft: 'bg-rose-50/80 dark:bg-rose-500/10',
    text: 'text-rose-900 dark:text-rose-200',
    badgeBg: 'bg-rose-100 dark:bg-rose-500/20',
  },
  emerald: {
    accent: 'border-emerald-300 dark:border-emerald-500/40',
    bgSoft: 'bg-emerald-50/80 dark:bg-emerald-500/10',
    text: 'text-emerald-900 dark:text-emerald-200',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20',
  },
  slate: {
    accent: 'border-slate-300 dark:border-slate-500/40',
    bgSoft: 'bg-slate-100/80 dark:bg-slate-500/10',
    text: 'text-slate-900 dark:text-slate-200',
    badgeBg: 'bg-slate-200 dark:bg-slate-500/20',
  },
};
