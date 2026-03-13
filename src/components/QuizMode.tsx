import { useState, useCallback } from 'react';
import type { VerbConjugations } from '../data/verbs';
import { PRONOUNS } from '../data/verbs';
import type { TenseId } from '../data/verbs';

type QuizModeProps = {
  verb: VerbConjugations;
  tenseId: string;
  tenseLabel: string;
};

function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
    .trim();
}

/** Zamirli doğru cevaptan sadece fiil kısmını çıkarır (elision dahil). */
function stripPronounPrefix(normalizedCorrect: string): string {
  return normalizedCorrect
    .replace(
      /^(j'|je |tu |il\/elle |il |elle |nous |vous |ils\/elles |ils |elles )/i,
      ''
    )
    .trim();
}

function checkOne(user: string, correct: string): boolean {
  const a = normalizeAnswer(user);
  if (a === '') return false;
  const fullNorm = normalizeAnswer(correct);
  const verbOnly = stripPronounPrefix(fullNorm);
  return a === verbOnly || a === fullNorm;
}

export function QuizMode({ verb, tenseId, tenseLabel }: QuizModeProps) {
  const conjugations = verb[tenseId as TenseId];
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);

  if (!conjugations) return null;

  const current = PRONOUNS[index];
  const correctValue = conjugations[current.id];

  const checkAnswer = useCallback(() => {
    const isCorrect = checkOne(answer, correctValue);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setShowCorrect(!isCorrect);
  }, [answer, correctValue]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % PRONOUNS.length);
    setAnswer('');
    setFeedback(null);
    setShowCorrect(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (feedback !== null) next();
      else checkAnswer();
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200/60 bg-white/80 shadow-sm overflow-hidden">
      <div className="bg-amber-500/10 border-b border-amber-200/60 px-4 py-3">
        <h2 className="font-semibold text-amber-900 capitalize">
          {verb.infinitive} – {tenseLabel}
        </h2>
        <p className="text-sm text-amber-800/80">
          {index + 1} / {PRONOUNS.length}
        </p>
      </div>

      <div className="p-4 sm:p-6">
        <p className="text-stone-600 font-medium mb-2">
          <span className="text-amber-800">{current.label}</span> + {verb.infinitive} →
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (feedback) setFeedback(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Çekimi yazın..."
            disabled={feedback === 'correct'}
            className={`w-full rounded-xl border px-4 py-3 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors ${
              feedback === 'correct'
                ? 'border-emerald-300 bg-emerald-50'
                : feedback === 'wrong'
                  ? 'border-red-300 bg-red-50'
                  : 'border-amber-200 bg-white'
            }`}
            aria-label={`${current.label} için çekim`}
            autoFocus
          />
          {showCorrect && feedback === 'wrong' && (
            <p className="text-red-700 text-sm">
              Doğru cevap: <strong>{correctValue}</strong>
            </p>
          )}
          <div className="flex gap-2">
            {feedback === null ? (
              <button
                type="button"
                onClick={checkAnswer}
                className="rounded-xl bg-amber-500 text-white font-medium px-5 py-2.5 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-colors"
              >
                Kontrol et
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="rounded-xl bg-amber-500 text-white font-medium px-5 py-2.5 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-colors"
              >
                Sonraki
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
