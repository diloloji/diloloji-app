import { getSpanishTenseYoutubeSearchUrl } from '../data/spanishYoutubeTenseSearch';
import { getFrenchTenseYoutubeSearchUrl } from '../data/frenchYoutubeTenseSearch';
import type { AppLanguage } from '../data/verbs';

type Props = {
  tenseId: string;
  lang: AppLanguage;
  className?: string;
  /** Dar satırlar için daha küçük punto */
  compact?: boolean;
  /** Koyu kart başlığı (tüm zamanlar grid) */
  onDark?: boolean;
};

export function TenseYoutubeTurkishLink({ tenseId, lang, className = '', compact, onDark }: Props) {
  const href =
    lang === 'es' ? getSpanishTenseYoutubeSearchUrl(tenseId) : getFrenchTenseYoutubeSearchUrl(tenseId);
  if (!href) return null;

  const size = compact ? 'text-[10px] px-1 py-0.5' : 'text-[11px] px-1.5 py-1';
  const base = onDark
    ? 'text-slate-400 hover:text-[#FF0000]'
    : 'text-slate-500 dark:text-slate-400 hover:text-[#FF0000] dark:hover:text-[#FF0000]';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-0.5 shrink-0 font-medium rounded-md bg-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 ${size} ${base} ${className}`}
      onClick={(e) => e.stopPropagation()}
      title="YouTube'da bu zaman için Türkçe anlatım ara"
      aria-label={`YouTube'da ${tenseId} için Türkçe anlatım videosu ara`}
    >
      <span aria-hidden>📺</span>
      <span>Türkçe Video</span>
    </a>
  );
}
