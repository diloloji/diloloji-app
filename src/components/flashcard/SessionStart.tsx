/**
 * Hazırlık ekranı: deste adı, kelime sayısı, tahmini süre, önceki skor, Başla butonu.
 */

type Props = {
  deckTitle: string;
  deckIcon: string;
  language: string;
  totalCards: number;
  estimatedSeconds: number;
  previousScore?: number | null;
  onlyWrong: boolean;
  onOnlyWrongChange: (v: boolean) => void;
  hasPreviousSession: boolean;
  onStart: () => void;
};

export default function SessionStart({
  deckTitle,
  deckIcon,
  language,
  totalCards,
  estimatedSeconds,
  previousScore,
  onlyWrong,
  onOnlyWrongChange,
  hasPreviousSession,
  onStart,
}: Props) {
  const minutes = Math.max(1, Math.ceil(estimatedSeconds / 60));

  return (
    <div className="max-w-md w-full mx-auto rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
      <div className="text-center mb-6">
        <span className="text-4xl block mb-3" aria-hidden>{deckIcon}</span>
        <h2 className="text-xl font-bold text-slate-100">{deckTitle}</h2>
        <p className="text-slate-400 text-sm mt-1">{language}</p>
      </div>

      <ul className="space-y-3 text-sm text-slate-300 mb-6">
        <li className="flex justify-between">
          <span>Toplam kelime</span>
          <span className="font-semibold tabular-nums">{totalCards}</span>
        </li>
        <li className="flex justify-between">
          <span>Tahmini süre</span>
          <span className="font-semibold tabular-nums">~{minutes} dk</span>
        </li>
        {hasPreviousSession && previousScore != null && (
          <li className="flex justify-between">
            <span>Önceki skor</span>
            <span className="font-semibold text-amber-400 tabular-nums">%{previousScore}</span>
          </li>
        )}
      </ul>

      {hasPreviousSession && (
        <label className="flex items-center gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWrong}
            onChange={(e) => onOnlyWrongChange(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50"
          />
          <span className="text-sm text-slate-300">Sadece yanlışları tekrar et</span>
        </label>
      )}

      <button
        type="button"
        onClick={onStart}
        className="w-full py-4 px-6 rounded-2xl font-bold text-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 hover:from-amber-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-all shadow-lg shadow-amber-500/25"
      >
        Başla
      </button>
    </div>
  );
}
