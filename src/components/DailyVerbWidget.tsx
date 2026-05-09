import { Link } from 'react-router-dom';
import { getConjugationForTenseForLang } from '../conjugation/helpers';
import { exampleSentences } from '../data/example_sentences';
import { getDailySpanishVerb } from '../utils/dailySpanishVerb';

const PRESENTE_IDS = ['yo', 'tu', 'el', 'nosotros'] as const;
const PRESENTE_LABELS: Record<string, string> = {
  yo: 'yo',
  tu: 'tú',
  el: 'él',
  nosotros: 'nosotros',
};

export default function DailyVerbWidget() {
  const v = getDailySpanishVerb();
  const verb = v.infinitive;
  let conj: Record<string, string> = {};
  try {
    conj = getConjugationForTenseForLang(verb, 'presente', 'es');
  } catch {
    conj = {};
  }

  const presenteBits = PRESENTE_IDS.map((id) => {
    const form = conj[id];
    if (!form) return null;
    return `${PRESENTE_LABELS[id]} ${form}`;
  }).filter(Boolean);

  const exBlock = exampleSentences[verb]?.Presente;
  const exampleEs = exBlock?.es ?? '';
  const exampleTr = exBlock?.tr ?? '';

  return (
    <section
      className="mt-6 rounded-xl p-[1px] bg-gradient-to-br from-violet-500/70 via-indigo-500/50 to-fuchsia-500/60 shadow-lg shadow-violet-500/10"
      aria-labelledby="daily-verb-heading"
    >
      <div className="rounded-[11px] bg-slate-900/95 dark:bg-[#0d1117]/95 backdrop-blur-md border border-white/5 px-4 py-3.5 sm:px-5 sm:py-4">
        <p className="text-[10px] uppercase tracking-widest text-violet-300/90 font-bold mb-1">Günün Fiili</p>
        <h2 id="daily-verb-heading" className="text-2xl sm:text-3xl font-bold text-white capitalize tracking-tight">
          {verb}
        </h2>
        <p className="text-sm text-slate-300 mt-0.5">{v.meaning_tr}</p>

        {presenteBits.length > 0 && (
          <p className="mt-3 text-xs text-slate-400 leading-relaxed">
            <span className="text-slate-500 font-medium">Presente: </span>
            {presenteBits.join(' · ')}
          </p>
        )}

        {exampleEs && (
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-sm text-slate-100 italic leading-snug">&ldquo;{exampleEs}&rdquo;</p>
            {exampleTr && <p className="text-xs text-slate-400 mt-1">{exampleTr}</p>}
          </div>
        )}

        <Link
          to={`/fiil-laboratuvari?verb=${encodeURIComponent(verb)}&lang=es&tense=presente`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-200 hover:text-white transition-colors"
        >
          Fiil Lab&apos;da Çalış
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
