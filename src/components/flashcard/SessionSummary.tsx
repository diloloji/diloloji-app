/**
 * Oturum sonu ekranı: skor, süre, yanlış kelimeler listesi, aksiyon butonları.
 */

import type { SessionResult } from '../../lib/flashcardStorage';

type Props = {
  result: SessionResult;
  totalCards: number;
  onRestartWrong: () => void;
  onRestartAll: () => void;
  onBackToDecks: () => void;
};

export default function SessionSummary({
  result,
  totalCards: _totalCards,
  onRestartWrong,
  onRestartAll,
  onBackToDecks,
}: Props) {
  const total = result.correct + result.incorrect + result.skipped;
  const scorePct = total > 0 ? Math.round((result.correct / total) * 100) : 0;
  const minutes = Math.floor(result.durationSeconds / 60);
  const secs = result.durationSeconds % 60;

  return (
    <div className="max-w-md w-full mx-auto rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
      <p className="text-5xl text-center mb-4" aria-hidden>🎉</p>
      <h2 className="text-xl font-bold text-slate-100 text-center mb-6">
        Oturum Tamamlandı
      </h2>

      {/* Skor dairesi */}
      <div className="flex justify-center mb-6">
        <div className="relative w-32 h-32 rounded-full bg-white/10 flex items-center justify-center border-2 border-amber-500/40">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-100 tabular-nums">
              {result.correct} / {total}
            </p>
            <p className="text-sm text-slate-400">doğru</p>
            <p className="text-lg font-semibold text-amber-400 mt-0.5">%{scorePct}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-400 text-center mb-6">
        Süre: {minutes > 0 ? `${minutes} dk ` : ''}{secs} sn
      </p>

      {/* Yanlış bilinenler */}
      {result.incorrectWords.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Yanlış bilinen kelimeler ({result.incorrectWords.length})
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {result.incorrectWords.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between gap-2 text-sm"
              >
                <span className="font-medium text-slate-200">{w.front}</span>
                <span className="text-slate-500">→</span>
                <span className="text-slate-400 truncate">{w.back}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {result.incorrectWords.length > 0 && (
          <button
            type="button"
            onClick={onRestartWrong}
            className="w-full py-3.5 px-6 rounded-2xl font-semibold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-400/50 transition-all"
          >
            Yanlışları Tekrar Et
          </button>
        )}
        <button
          type="button"
          onClick={onRestartAll}
          className="w-full py-3.5 px-6 rounded-2xl font-semibold bg-amber-500/90 text-slate-900 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-all shadow-lg shadow-amber-500/20"
        >
          Baştan Başla
        </button>
        <button
          type="button"
          onClick={onBackToDecks}
          className="w-full py-3.5 px-6 rounded-2xl font-semibold bg-white/10 text-slate-200 border border-white/10 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all"
        >
          Deste Seçimine Dön
        </button>
      </div>
    </div>
  );
}
