/**
 * Biliyorum / Bilmiyorum / Tekrar Et — label + klavye kısayolu badge.
 * Flip olmadan disabled/gizli.
 */

type Props = {
  isFlipped: boolean;
  onIncorrect: () => void;
  onSkip: () => void;
  onCorrect: () => void;
};

export default function FlashCardButtons({
  isFlipped,
  onIncorrect,
  onSkip,
  onCorrect,
}: Props) {
  if (!isFlipped) {
    return (
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 text-center">
        Cevabı görmek için karta tıklayın veya Space tuşuna basın
      </p>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      <button
        type="button"
        onClick={onIncorrect}
        className="flex flex-col items-center gap-1 py-3.5 px-3 rounded-2xl font-semibold text-sm bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-400/50 transition-all"
        title="Sol ok (←)"
        aria-label="Bilmiyorum (sol ok)"
      >
        <span className="text-[10px] font-mono text-red-400/80" aria-hidden>←</span>
        <span>✗ Bilmiyorum</span>
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="flex flex-col items-center gap-1 py-3.5 px-3 rounded-2xl font-semibold text-sm bg-slate-500/20 text-slate-300 border border-slate-500/40 hover:bg-slate-500/30 focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all"
        title="Aşağı ok (↓)"
        aria-label="Tekrar et (aşağı ok)"
      >
        <span className="text-[10px] font-mono text-slate-400/80" aria-hidden>↓</span>
        <span>↩ Tekrar Et</span>
      </button>
      <button
        type="button"
        onClick={onCorrect}
        className="flex flex-col items-center gap-1 py-3.5 px-3 rounded-2xl font-semibold text-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
        title="Sağ ok (→)"
        aria-label="Biliyorum (sağ ok)"
      >
        <span className="text-[10px] font-mono text-emerald-400/80" aria-hidden>→</span>
        <span>✓ Biliyorum</span>
      </button>
    </div>
  );
}
