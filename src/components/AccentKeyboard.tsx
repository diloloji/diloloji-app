/**
 * Sanal aksan klavyesi — FR/ES özel karakterlerini tek tıkla inputa eklemek için.
 * Dil seçimine göre doğru harf setini gösterir; onInsert sonrası parent input'a focus vermelidir.
 */

import type { AppLanguage } from '../data/verbs';

const CHARS_FR = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'œ'];
const CHARS_ES = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'];

interface AccentKeyboardProps {
  lang: AppLanguage;
  onInsert: (char: string) => void;
  className?: string;
  /** Kompakt tek satırlık inline mod — alıştırma grid'i için */
  compact?: boolean;
  /** Tek satır, kaydırılabilir — input hemen altı */
  singleRow?: boolean;
  /** Örn. canlar bitince tüm tuşları kapat */
  disabled?: boolean;
}

export default function AccentKeyboard({
  lang,
  onInsert,
  className = '',
  compact = false,
  singleRow = false,
  disabled = false,
}: AccentKeyboardProps) {
  const chars = lang === 'fr' ? CHARS_FR : CHARS_ES;
  const dis = disabled ? ' opacity-40 pointer-events-none' : '';
  if (singleRow) {
    const mid = Math.ceil(chars.length / 2);
    const row1 = chars.slice(0, mid);
    const row2 = chars.slice(mid);
    const btnClass =
      'shrink-0 text-base font-semibold min-h-[40px] min-w-[40px] sm:min-w-0 sm:w-7 sm:h-7 sm:min-h-0 sm:text-xs flex items-center justify-center rounded-md bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-500/12 hover:border-indigo-400/35 hover:text-indigo-600 dark:hover:text-indigo-300 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 touch-manipulation';
    return (
      <div
        className={`flex flex-col gap-1.5 w-full ${className}${dis}`}
        role="group"
        aria-label={lang === 'es' ? 'İspanyolca özel karakterler' : 'Fransızca aksanlı harfler'}
      >
        <div className="flex flex-wrap justify-center gap-1.5">
          {row1.map((char) => (
            <button key={char} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => onInsert(char)} tabIndex={-1} className={btnClass} aria-label={`${char} ekle`}>
              {char}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {row2.map((char) => (
            <button key={char} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => onInsert(char)} tabIndex={-1} className={btnClass} aria-label={`${char} ekle`}>
              {char}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (compact) {
    return (
      <div
        className={`flex flex-wrap justify-center items-center gap-1.5 ${className}${dis}`}
        role="group"
        aria-label={lang === 'es' ? 'İspanyolca özel karakterler' : 'Fransızca aksanlı harfler'}
      >
        {chars.map((char) => (
          <button
            key={char}
            type="button"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(char)}
            tabIndex={-1}
            className="text-sm font-medium w-8 h-8 flex items-center justify-center rounded-md bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-indigo-500/15 hover:border-indigo-400/40 hover:text-indigo-600 dark:hover:text-indigo-300 active:scale-90 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 touch-manipulation disabled:opacity-50 disabled:pointer-events-none"
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
      className={`flex flex-wrap gap-2 mt-2 ${className}${dis}`}
      role="group"
      aria-label={lang === 'es' ? 'İspanyolca özel karakterler' : 'Fransızca aksanlı harfler'}
    >
      {chars.map((char) => (
        <button
          key={char}
          type="button"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(char)}
          className="text-base min-w-[2.75rem] min-h-[2.75rem] sm:min-w-[2.25rem] sm:min-h-[2.25rem] flex items-center justify-center bg-slate-800/50 dark:bg-slate-700/50 hover:bg-slate-700 dark:hover:bg-slate-600 text-slate-300 dark:text-slate-300 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 touch-manipulation disabled:opacity-50 disabled:pointer-events-none"
          style={{ minWidth: '44px', minHeight: '44px' }}
          aria-label={`${char} ekle`}
        >
          {char}
        </button>
      ))}
    </div>
  );
}
