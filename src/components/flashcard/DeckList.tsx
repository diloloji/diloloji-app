/**
 * Deste seçim listesi: progress bar + %80+ için altın rozet.
 */

import { motion } from 'framer-motion';
import { getMasteredPercentage } from '../../lib/flashcardStorage';
import type { DeckMeta } from '../../hooks/useFlashcardSession';

type Props = {
  decks: DeckMeta[];
  onSelectDeck: (deck: DeckMeta) => void;
};

export default function DeckList({ decks, onSelectDeck }: Props) {
  return (
    <div className="grid gap-4 sm:gap-5">
      {decks.map((set, index) => {
        const totalCards = set.cards.length;
        const pct = getMasteredPercentage(set.id, totalCards);
        const showBadge = pct >= 80;

        return (
          <motion.button
            key={set.id}
            type="button"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            onClick={() => onSelectDeck(set)}
            className="relative w-full text-left rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 sm:p-6 shadow-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] hover:bg-white/[0.08] hover:border-white/15 transition-all duration-200 group"
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-amber-500/5 to-transparent"
              aria-hidden
            />
            <div className="relative flex items-start gap-4">
              <span className="text-3xl sm:text-4xl shrink-0" aria-hidden>
                {set.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-100 text-base sm:text-lg flex items-center gap-2 flex-wrap">
                  {set.title}
                  {showBadge && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40"
                      title="Öğrenildi"
                    >
                      🏆 Öğrenildi
                    </span>
                  )}
                </p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {set.language} · {totalCards} kelime
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500/90 to-amber-400"
                      initial={false}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{ maxWidth: '100%' }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-400 tabular-nums shrink-0">
                    {pct}%
                  </span>
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
