/**
 * TenseCardGrid — Tüm zaman kartlarını kompakt grid olarak gösterir.
 * Her kart: zaman adı + kısa "ne zaman kullanılır" özeti.
 * Karta tıklanınca `onSelect` callback ile ilgili TenseCard döner.
 */
import type { TenseCard } from '../../data/tenseCards';
import { ES_TENSE_CARDS } from '../../data/tenseCards';
import { TENSE_CARD_THEMES } from './tenseCardColors';

type Props = {
  onSelect: (card: TenseCard) => void;
  /** Vurgulanacak (mevcut alıştırma zamanı) kart id'si — hafif halka ile belirtilir. */
  highlightId?: string;
};

export default function TenseCardGrid({ onSelect, highlightId }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {ES_TENSE_CARDS.map((card) => {
        const theme = TENSE_CARD_THEMES[card.color];
        const isHighlighted = highlightId && card.tenseId === highlightId;
        return (
          <button
            key={card.tenseId}
            type="button"
            onClick={() => onSelect(card)}
            className={`text-left rounded-2xl border p-4 ${theme.accent} ${theme.bgSoft} hover:brightness-110 dark:hover:brightness-125 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-sm hover:shadow-md ${
              isHighlighted ? 'ring-2 ring-indigo-500/70 dark:ring-indigo-400/70 ring-offset-2 ring-offset-white/40 dark:ring-offset-slate-900/40' : ''
            }`}
            aria-label={`${card.tense} — detay için aç`}
          >
            <h4 className={`text-base sm:text-lg font-bold leading-tight ${theme.text}`}>{card.tense}</h4>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-snug line-clamp-3">
              {card.when_to_use}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Detayı aç →
            </p>
          </button>
        );
      })}
    </div>
  );
}
