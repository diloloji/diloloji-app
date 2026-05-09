/** Ezber Makinesi çalışma modları (StudyEngine) */

export type StudyMode = 'cards' | 'write' | 'choice' | 'match' | 'speed';

/** Emoji sabit; metinler i18n: memorization.studyMode.* */
export const STUDY_MODE_EMOJI: Record<StudyMode, string> = {
  cards: '🃏',
  write: '✍️',
  choice: '🎯',
  match: '🔤',
  speed: '⚡',
};

export const STUDY_MODE_I18N: Record<StudyMode, { labelKey: string; descKey: string }> = {
  cards: { labelKey: 'memorization.studyMode.cards', descKey: 'memorization.studyMode.cardsDesc' },
  write: { labelKey: 'memorization.studyMode.write', descKey: 'memorization.studyMode.writeDesc' },
  choice: { labelKey: 'memorization.studyMode.choice', descKey: 'memorization.studyMode.choiceDesc' },
  match: { labelKey: 'memorization.studyMode.match', descKey: 'memorization.studyMode.matchDesc' },
  speed: { labelKey: 'memorization.studyMode.speed', descKey: 'memorization.studyMode.speedDesc' },
};

/** @deprecated i18n anahtarları için STUDY_MODE_I18N + useTranslation kullanın */
export const STUDY_MODE_META: Record<
  StudyMode,
  { label: string; emoji: string; description: string }
> = {
  cards: {
    label: 'Kartlar',
    emoji: STUDY_MODE_EMOJI.cards,
    description: 'Klasik kart çevirme, SRS değerlendirme',
  },
  write: {
    label: 'Yazarak Öğren',
    emoji: STUDY_MODE_EMOJI.write,
    description: 'Ön yüzü gör, arka yüzü yaz',
  },
  choice: {
    label: 'Çoktan Seç',
    emoji: STUDY_MODE_EMOJI.choice,
    description: 'Dört şıktan doğru anlamı seç',
  },
  match: {
    label: 'Eşleştir',
    emoji: STUDY_MODE_EMOJI.match,
    description: 'Ön ve arka yüzleri eşleştir',
  },
  speed: {
    label: 'Hızlı Tur',
    emoji: STUDY_MODE_EMOJI.speed,
    description: '60 saniye — biliyorum / bilmiyorum',
  },
};
