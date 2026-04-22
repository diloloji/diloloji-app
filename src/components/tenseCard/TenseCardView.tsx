/**
 * TenseCardView — Tek bir zaman kartının tam içeriği.
 * Overlay ve grid "detay" görünümünde kullanılır.
 */
import type { TenseCard } from '../../data/tenseCards';
import { TENSE_CARD_THEMES } from './tenseCardColors';

const ES_PRONOUN_LABELS = ['Yo', 'Tú', 'Él/Ella', 'Nosotros', 'Vosotros', 'Ellos/Ellas'];

export default function TenseCardView({ card }: { card: TenseCard }) {
  const theme = TENSE_CARD_THEMES[card.color];
  const rowKeys = Object.keys(card.endings_regular);

  return (
    <div className={`rounded-2xl border ${theme.accent} ${theme.bgSoft} p-5 sm:p-6 space-y-5`}>
      {/* Başlık */}
      <div>
        <h3 className={`text-xl sm:text-2xl font-bold ${theme.text}`}>{card.tense}</h3>
        <p className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400 opacity-70">
          {card.example_verb}
        </p>
      </div>

      {/* Ne zaman kullanılır */}
      <section>
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
          Ne zaman kullanılır?
        </p>
        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
          {card.when_to_use}
        </p>
      </section>

      {card.signal_words.length > 0 && (
        <section>
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Sık eşleşen ifadeler
          </p>
          <div className="flex flex-wrap gap-1.5">
            {card.signal_words.map((w) => (
              <span
                key={w}
                className="inline-flex items-center rounded-full border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/50 px-2.5 py-0.5 text-xs text-slate-700 dark:text-slate-200"
              >
                {w}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Çekim ekleri tablosu */}
      <section>
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
          Çekim ekleri
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs">
                <th className="text-left font-medium px-3 py-2 w-28">Kişi</th>
                {rowKeys.map((k) => (
                  <th key={k} className="text-left font-medium px-3 py-2">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ES_PRONOUN_LABELS.map((label, i) => (
                <tr key={label} className="border-t border-slate-200/60 dark:border-white/5">
                  <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300 font-medium">{label}</td>
                  {rowKeys.map((k) => (
                    <td key={k} className="px-3 py-1.5 font-mono text-slate-800 dark:text-slate-100">
                      {card.endings_regular[k]?.[i] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Düzensizlik notu */}
      <section>
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
          Dikkat edilecek düzensizlikler
        </p>
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          {card.irregulars_note}
        </p>
      </section>

      {/* Örnek cümleler */}
      <section>
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
          Örnek cümleler
        </p>
        <ul className="space-y-2">
          {card.examples.map((ex, i) => (
            <li key={i} className="rounded-lg bg-white/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 px-3 py-2">
              <p className="italic text-slate-800 dark:text-slate-100 text-sm leading-snug">{ex.es}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{ex.tr}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Karıştırma uyarısı (yalnızca metin varsa) */}
      {card.confusion_warning != null && card.confusion_warning !== '' && (
        <section className={`rounded-xl ${theme.badgeBg} ${theme.accent} border px-3 py-2.5`}>
          <p className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wide ${theme.text} opacity-80 mb-1`}>
            Karıştırma uyarısı
          </p>
          <p className={`text-sm leading-snug ${theme.text}`}>{card.confusion_warning}</p>
        </section>
      )}
    </div>
  );
}
