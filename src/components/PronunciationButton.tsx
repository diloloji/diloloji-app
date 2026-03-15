/**
 * Sesli telaffuz butonu — usePronunciation hook ile Web Speech API.
 * isPlaying'de VolumeX + pulse; isSupported false ise gizlenir.
 */

import { Volume2, VolumeX } from 'lucide-react';
import { usePronunciation, type Language } from '../hooks/usePronunciation';

export type { Language };

export function dictDirectionToLang(direction: string): Language {
  if (direction === 'tr-fr' || direction === 'fr-tr') return 'fr-FR';
  if (direction === 'tr-es' || direction === 'es-tr') return 'es-ES';
  if (direction === 'tr-en' || direction === 'en-tr') return 'en-US';
  return 'fr-FR';
}

type Props = {
  word: string;
  lang: Language;
  size?: 'sm' | 'md';
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
};

export default function PronunciationButton({ word, lang, size = 'md' }: Props) {
  const { speak, isPlaying, isSupported } = usePronunciation(word, lang);

  if (!isSupported) return null;

  const sizeClass = sizeClasses[size];
  const iconClass = iconSizes[size];

  return (
    <button
      type="button"
      onClick={() => speak()}
      className={`inline-flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0 ${sizeClass} ${isPlaying ? 'animate-pulse' : ''}`}
      title="Telaffuzu dinle"
      aria-label={isPlaying ? 'Durdur' : 'Telaffuzu dinle'}
    >
      {isPlaying ? (
        <VolumeX className={`${iconClass} text-indigo-400`} strokeWidth={2} aria-hidden />
      ) : (
        <Volume2 className={`${iconClass} text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400`} strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}
