/**
 * Sanal aksan klavyesi — FR/ES özel karakterlerini tek tıkla inputa eklemek için.
 * Dil seçimine göre doğru harf setini gösterir; onInsert sonrası parent input'a focus vermelidir.
 */

import type { AppLanguage } from '../data/verbs';

const CHARS_FR = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'œ'];
const CHARS_ES = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'];

interface AccentKeyboardProps {
  lang: AppLanguage;
  onInsert: (char: string) => void;
  className?: string;
  /** Kompakt tek satırlık inline mod — alıştırma grid'i için */
  compact?: boolean;
}

export default function AccentKeyboard({ lang, onInsert, className = '', compact = false }: AccentKeyboardProps) {
  const chars = lang === 'fr' ? CHARS_FR : CHARS_ES;
  if (compact) {
    return (
      <div
        className={`flex flex-wrap justify-center items-center gap-1.5 ${className}`}
        role="group"
        aria-label={lang === 'es' ? 'İspanyolca özel karakterler' : 'Fransızca aksanlı harfler'}
      >
        {chars.map((char) => (
          <button
            key={char}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(char)}
            tabIndex={-1}
            className="text-sm font-medium w-8 h-8 flex items-center justify-center rounded-md bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-500/15 hover:border-indigo-400/40 hover:text-indigo-600 dark:hover:text-indigo-300 active:scale-90 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 touch-manipulation"
            aria-label={`${char} ekle`}
          >
            {char}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div
      className={`flex flex-wrap gap-2 mt-2 ${className}`}
      role="group"
      aria-label={lang === 'es' ? 'İspanyolca özel karakterler' : 'Fransızca aksanlı harfler'}
    >
      {chars.map((char) => (
        <button
          key={char}
          type="button"
          onClick={() => onInsert(char)}
          className="text-base min-w-[2.75rem] min-h-[2.75rem] sm:min-w-[2.25rem] sm:min-h-[2.25rem] flex items-center justify-center bg-slate-800/50 dark:bg-slate-700/50 hover:bg-slate-700 dark:hover:bg-slate-600 text-slate-300 dark:text-slate-300 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 touch-manipulation"
          style={{ minWidth: '44px', minHeight: '44px' }}
          aria-label={`${char} ekle`}
        >
          {char}
        </button>
      ))}
    </div>
  );
}
