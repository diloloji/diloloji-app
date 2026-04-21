/**
 * Günlük Akış — SRS tekrar bölümü (satır içi oynatıcı).
 *
 * Verilen mistake listesini tek tek sunar; kullanıcı doğru çekimi yazınca
 *  - Doğruysa: updateMistakeReview('correct_first_try') — interval ileri atılır,
 *    30+ güne ulaşan kayıt listeden düşer.
 *  - Yanlışsa: doğru form gösterilir, 1.2 sn bekleyip geçer;
 *    updateMistakeReview('wrong_or_hint') — interval sıfırlanır.
 *
 * Bölüm bitince `onComplete({ correct, wrong, skipped, tenseMistakes })` çağrılır.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, SkipForward, ArrowRight } from 'lucide-react';
import type { MistakeEntry } from '../../utils/mistakeBank';
import { updateMistakeReview } from '../../utils/mistakeBank';
import { getConjugationForTenseForLang } from '../../conjugation/helpers';
import { TENSES_ES } from '../../data/spanish';
import { speakAuto, matchTranscript, type ListenResult } from '../../utils/speech';
import MicButton from '../speech/MicButton';

/* ───────── Yardımcılar ───────── */

const FR_PRONOUNS = new Set(['je', 'tu', 'il', 'nous', 'vous', 'ils']);

function detectLang(pronoun: string): 'es' | 'fr' {
  return FR_PRONOUNS.has(pronoun) ? 'fr' : 'es';
}

function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isCorrect(user: string, expected: string): boolean {
  if (!user.trim() || !expected) return false;
  const u = normalizeAnswer(user);
  const e = normalizeAnswer(expected);
  if (u === e) return true;
  // Pretérito Perfecto gibi "he hablado" formlarında kullanıcı yalnız fiili yazabilir
  const parts = e.split(' ');
  if (parts.length > 1 && u === parts[parts.length - 1]) return true;
  return false;
}

function getTenseLabel(tenseId: string): string {
  const es = TENSES_ES.find((t) => t.id === tenseId);
  if (es) return es.label;
  return tenseId;
}

function getPronounLabel(pronoun: string): string {
  const map: Record<string, string> = {
    yo: 'Yo',
    tu: 'Tú',
    el: 'Él/Ella',
    nosotros: 'Nosotros',
    vosotros: 'Vosotros',
    ellos: 'Ellos',
    je: 'Je',
    il: 'Il',
    ils: 'Ils',
  };
  return map[pronoun] ?? pronoun;
}

/* ───────── Sonuç tipi ───────── */

export interface SrsStepResult {
  correct: number;
  wrong: number;
  skipped: number;
  tenseMistakes: Record<string, number>;
}

interface Props {
  entries: MistakeEntry[];
  onComplete: (result: SrsStepResult) => void;
  onSkipSession: () => void;
}

/* ───────── Ana bileşen ───────── */

export default function SrsReviewPlayer({ entries, onComplete, onSkipSession }: Props) {
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [correctForm, setCorrectForm] = useState<string>('');
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const statsRef = useRef<SrsStepResult>({ correct: 0, wrong: 0, skipped: 0, tenseMistakes: {} });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  const current = entries[idx];

  const expectedForm = useMemo(() => {
    if (!current) return '';
    try {
      const lang = detectLang(current.pronoun);
      const map = getConjugationForTenseForLang(current.verb, current.tense, lang);
      return (map && map[current.pronoun]) || '';
    } catch {
      return '';
    }
  }, [current]);

  const clearAdvance = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    clearAdvance();
    onComplete(statsRef.current);
  }, [clearAdvance, onComplete]);

  const goNext = useCallback(() => {
    clearAdvance();
    setAnswer('');
    setFeedback('idle');
    setCorrectForm('');
    setIdx((i) => {
      if (i + 1 >= entries.length) {
        setTimeout(finish, 0);
        return i;
      }
      return i + 1;
    });
  }, [clearAdvance, entries.length, finish]);

  const handleSubmit = useCallback((override?: string) => {
    if (!current || feedback !== 'idle') return;
    const raw = (override ?? answer).trim();
    if (!raw) return;

    if (!expectedForm) {
      // Çekim bulunamadı — yanlış sayıp atla.
      statsRef.current.wrong += 1;
      statsRef.current.tenseMistakes[current.tense] =
        (statsRef.current.tenseMistakes[current.tense] ?? 0) + 1;
      try {
        updateMistakeReview(current.verb, current.tense, current.pronoun, 'wrong_or_hint');
      } catch {
        /* noop */
      }
      goNext();
      return;
    }

    if (isCorrect(raw, expectedForm)) {
      statsRef.current.correct += 1;
      try {
        updateMistakeReview(current.verb, current.tense, current.pronoun, 'correct_first_try');
      } catch {
        /* noop */
      }
      setFeedback('correct');
      setCorrectForm(expectedForm);
      speakAuto(expectedForm, { lang: detectLang(current.pronoun) === 'es' ? 'es-ES' : 'fr-FR' });
      advanceTimerRef.current = window.setTimeout(goNext, 500);
    } else {
      statsRef.current.wrong += 1;
      statsRef.current.tenseMistakes[current.tense] =
        (statsRef.current.tenseMistakes[current.tense] ?? 0) + 1;
      try {
        updateMistakeReview(current.verb, current.tense, current.pronoun, 'wrong_or_hint');
      } catch {
        /* noop */
      }
      setFeedback('wrong');
      setCorrectForm(expectedForm);
      advanceTimerRef.current = window.setTimeout(goNext, 1400);
    }
  }, [current, feedback, answer, expectedForm, goNext]);

  const handleSkipCurrent = useCallback(() => {
    if (!current) return;
    setShowSkipConfirm(false);
    statsRef.current.skipped += 1;
    statsRef.current.tenseMistakes[current.tense] =
      (statsRef.current.tenseMistakes[current.tense] ?? 0) + 1;
    try {
      updateMistakeReview(current.verb, current.tense, current.pronoun, 'wrong_or_hint');
    } catch {
      /* noop */
    }
    goNext();
  }, [current, goNext]);

  // İlk yükte odak.
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [idx]);

  useEffect(() => () => clearAdvance(), [clearAdvance]);

  if (!current) {
    return null;
  }

  const progressPct = ((idx + 1) / entries.length) * 100;

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span className="font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Tekrar · {idx + 1} / {entries.length}
          </span>
          <span>{current.mistakeCount}× yanlış geçmişi</span>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-amber-500"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.verb}|${current.tense}|${current.pronoun}|${idx}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={`rounded-2xl border-2 p-6 sm:p-8 transition-colors ${
            feedback === 'correct'
              ? 'border-emerald-500/60 bg-emerald-500/10'
              : feedback === 'wrong'
              ? 'border-rose-500/70 bg-rose-500/10'
              : 'border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm'
          }`}
        >
          <div className="text-center space-y-2 mb-6">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
              {getTenseLabel(current.tense)}
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                {getPronounLabel(current.pronoun)}
              </span>{' '}
              <span className="font-mono">{current.verb}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Doğru çekimi yaz ve Enter'a bas
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={feedback !== 'idle'}
                placeholder="çekim..."
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                enterKeyHint="send"
                className={`w-full h-14 pl-4 pr-12 rounded-xl text-center text-2xl font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900/80 border-2 transition-colors focus:outline-none ${
                  feedback === 'correct'
                    ? 'border-emerald-500/80'
                    : feedback === 'wrong'
                    ? 'border-rose-500/80 text-rose-700 dark:text-rose-300'
                    : 'border-slate-300 dark:border-white/10 focus:border-indigo-500/60'
                } disabled:opacity-90`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <MicButton
                  size={28}
                  lang={detectLang(current.pronoun) === 'es' ? 'es-ES' : 'fr-FR'}
                  disabled={feedback !== 'idle'}
                  onResult={(res: ListenResult) => {
                    const match = expectedForm
                      ? matchTranscript(res.alternatives, expectedForm)
                      : null;
                    const picked = match ?? res.transcript;
                    setAnswer(picked);
                    handleSubmit(picked);
                  }}
                />
              </div>
            </div>

            {feedback === 'wrong' && correctForm && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm"
              >
                <p className="text-rose-700 dark:text-rose-300">
                  Doğrusu:{' '}
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {correctForm}
                  </span>
                </p>
              </motion.div>
            )}

            {feedback === 'correct' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Doğru!
              </motion.div>
            )}

            <button type="submit" className="sr-only" disabled={feedback !== 'idle'}>
              Gönder
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setShowSkipConfirm(true)}
              className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              disabled={feedback !== 'idle'}
            >
              <SkipForward className="w-3.5 h-3.5" /> Atla
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={feedback !== 'idle' || !answer.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-white/10 disabled:text-slate-500 text-white font-semibold transition-colors"
            >
              Kontrol Et <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 flex items-center justify-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
          <Check className="w-3.5 h-3.5" /> {statsRef.current.correct}
        </span>
        <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
          <X className="w-3.5 h-3.5" /> {statsRef.current.wrong}
        </span>
      </div>

      {/* Atla onayı */}
      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowSkipConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10 shadow-2xl p-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <SkipForward className="w-5 h-5" />
              </div>
              <p className="font-heading text-base font-bold text-slate-900 dark:text-white mb-1">
                Bu tekrarı atlamak istiyor musun?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Atlarsan yarın tekrar göreceksin.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowSkipConfirm(false)}
                  className="h-10 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleSkipCurrent}
                  className="h-10 rounded-lg bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors"
                >
                  Atla
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSkipConfirm(false);
                  onSkipSession();
                }}
                className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline"
              >
                Tüm seansı bitir
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
