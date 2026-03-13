import type { VerbConjugations } from '../data/verbs';
import { PRONOUNS } from '../data/verbs';
import type { TenseId } from '../data/verbs';

type LearningModeProps = {
  verb: VerbConjugations;
  tenseId: string;
  tenseLabel: string;
};

export function LearningMode({ verb, tenseId, tenseLabel }: LearningModeProps) {
  const conjugations = verb[tenseId as TenseId];
  if (!conjugations) return null;

  return (
    <div className="rounded-2xl border border-amber-200/60 bg-white/80 shadow-sm overflow-hidden">
      <div className="bg-amber-500/10 border-b border-amber-200/60 px-4 py-3">
        <h2 className="font-semibold text-amber-900 capitalize">
          {verb.infinitive}
        </h2>
        <p className="text-sm text-amber-800/80">{tenseLabel}</p>
      </div>
      <ul className="divide-y divide-amber-100">
        {PRONOUNS.map(({ id, label }) => (
          <li
            key={id}
            className="flex items-center justify-between gap-4 px-4 py-3 sm:py-4"
          >
            <span className="text-stone-600 font-medium min-w-[5rem]">
              {label}
            </span>
            <span className="text-stone-800 text-right font-medium">
              {conjugations[id]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
