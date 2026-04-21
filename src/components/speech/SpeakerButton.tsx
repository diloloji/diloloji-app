/**
 * SpeakerButton — tıklanabilir küçük hoparlör ikonu.
 * Tarayıcı TTS desteklemiyorsa hiç render edilmez (null).
 */

import { Volume2 } from 'lucide-react';
import { speak, ttsSupported, type SpeechLang } from '../../utils/speech';

interface SpeakerButtonProps {
  text: string;
  lang?: SpeechLang;
  /** Boyut (px). Varsayılan 16. */
  size?: number;
  /** Ek tailwind class. */
  className?: string;
  /** aria-label. Varsayılan "Telaffuzu dinle". */
  ariaLabel?: string;
  title?: string;
  /** Rate override. Varsayılan 0.85. */
  rate?: number;
}

export default function SpeakerButton({
  text,
  lang = 'es-ES',
  size = 16,
  className = '',
  ariaLabel = 'Telaffuzu dinle',
  title,
  rate,
}: SpeakerButtonProps) {
  if (!ttsSupported) return null;
  const dim = `${size}px`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text, { lang, rate });
      }}
      className={
        'inline-flex items-center justify-center rounded text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ' +
        className
      }
      style={{ width: dim, height: dim, minWidth: dim, minHeight: dim, padding: 0 }}
      aria-label={ariaLabel}
      title={title || ariaLabel}
    >
      <Volume2 style={{ width: size - 2, height: size - 2 }} strokeWidth={2} />
    </button>
  );
}
