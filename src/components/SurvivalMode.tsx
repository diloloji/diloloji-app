/**
 * İspanyolca alıştırma: sonsuz çoktan seçmeli, süre, can, kombo XP.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';
import { SPANISH_VERBS } from '../data/spanish-data';
import { getConjugationForTenseForLang } from '../conjugation/helpers';
import { TENSES_ES, PRONOUNS_ES, type TenseIdEs } from '../data/spanish';

const STORAGE_KEY = 'conjume-survival-v1';
const ROUND_MS = 10_000;
const PR_IDS = PRONOUNS_ES.map((p) => p.id);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normMc(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildMcOptions(correct: string, map: Record<string, string>, pid: string, ids: string[]): string[] {
  const cNorm = normMc(correct);
  const pool = ids
    .filter((id) => id !== pid)
    .map((id) => map[id]?.trim())
    .filter((v): v is string => !!v)
    .filter((v) => normMc(v) !== cNorm);
  const uniq: string[] = [];
  for (const p of pool) {
    if (!uniq.some((u) => normMc(u) === normMc(p))) uniq.push(p);
  }
  const wrongPick = shuffle(uniq).slice(0, 3);
  const pad = [...wrongPick];
  let k = 0;
  while (pad.length < 3 && pool.length > 0) {
    pad.push(pool[k % pool.length]);
    k++;
  }
  while (pad.length < 3) pad.push(`(${correct})*`);
  return shuffle([correct, ...pad.slice(0, 3)]);
}

function tierForRound(roundIndex: number): {
  tenses: TenseIdEs[];
  maxRank: number;
  allowIrregular: boolean;
} {
  if (roundIndex < 10) {
    return { tenses: ['presente'], maxRank: 40, allowIrregular: false };
  }
  if (roundIndex < 20) {
    return { tenses: ['presente', 'preterito'], maxRank: 70, allowIrregular: true };
  }
  if (roundIndex < 30) {
    return { tenses: TENSES_ES.map((t) => t.id), maxRank: 100, allowIrregular: true };
  }
  return { tenses: TENSES_ES.map((t) => t.id), maxRank: 99999, allowIrregular: true };
}

function pickQuestion(roundIndex: number): {
  verb: string;
  tense: TenseIdEs;
  pronoun: string;
  correct: string;
  options: string[];
} | null {
  const tier = tierForRound(roundIndex);
  let verbs = SPANISH_VERBS.filter((v) => v.frequency_rank <= tier.maxRank);
  if (!tier.allowIrregular) verbs = verbs.filter((v) => !v.is_irregular);
  const pool = verbs.length > 0 ? verbs : SPANISH_VERBS;
  for (let attempt = 0; attempt < 40; attempt++) {
    const v = pool[Math.floor(Math.random() * pool.length)]!;
    const tid = tier.tenses[Math.floor(Math.random() * tier.tenses.length)]!;
    const map = getConjugationForTenseForLang(v.infinitive, tid, 'es') as Record<string, string> | null;
    if (!map || typeof map !== 'object') continue;
    const pid = PR_IDS[Math.floor(Math.random() * PR_IDS.length)]!;
    const correct = map[pid]?.trim();
    if (!correct) continue;
    const options = buildMcOptions(correct, map, pid, PR_IDS);
    return { verb: v.infinitive, tense: tid, pronoun: pid, correct, options };
  }
  return null;
}

export type SurvivalBest = { bestRound: number; bestScore: number; longestCombo: number };

export function loadSurvivalBest(): SurvivalBest {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bestRound: 0, bestScore: 0, longestCombo: 0 };
    const p = JSON.parse(raw) as Partial<SurvivalBest>;
    return {
      bestRound: typeof p.bestRound === 'number' ? p.bestRound : 0,
      bestScore: typeof p.bestScore === 'number' ? p.bestScore : 0,
      longestCombo: typeof p.longestCombo === 'number' ? p.longestCombo : 0,
    };
  } catch {
    return { bestRound: 0, bestScore: 0, longestCombo: 0 };
  }
}

function saveSurvivalBest(b: SurvivalBest) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
  } catch {
    /* ignore */
  }
}

type Props = {
  onClose: () => void;
  addXP: (n: number) => void;
};

export default function SurvivalMode({ onClose, addXP }: Props) {
  const [lives, setLives] = useState(3);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctN, setCorrectN] = useState(0);
  const [wrongN, setWrongN] = useState(0);
  const [q, setQ] = useState(() => pickQuestion(0));
  const [locked, setLocked] = useState(false);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [unstoppable, setUnstoppable] = useState(false);
  const [deadBanner, setDeadBanner] = useState<{
    newRecord: boolean;
    reachedRound: number;
    xpEarned: number;
  } | null>(null);

  const phaseEndsRef = useRef(Date.now() + ROUND_MS);
  const [, forceTimer] = useState(0);
  const roundIndexRef = useRef(0);
  const scoreRef = useRef(0);
  const maxComboRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const gameOverRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const comboMult =
    combo >= 10 ? 3 : combo >= 5 ? 2 : combo >= 3 ? 1.5 : 1;

  const resetPhaseTimer = useCallback(() => {
    phaseEndsRef.current = Date.now() + ROUND_MS;
    forceTimer((n) => n + 1);
  }, []);

  const finishGame = useCallback(
    (finalRound: number, finalScore: number, finalMaxCombo: number, _finalCorrect: number, _finalWrong: number) => {
      if (gameOverRef.current) return;
      gameOverRef.current = true;
      setGameOver(true);
      const prev = loadSurvivalBest();
      const newRecord =
        finalRound > prev.bestRound || finalScore > prev.bestScore || finalMaxCombo > prev.longestCombo;
      saveSurvivalBest({
        bestRound: Math.max(prev.bestRound, finalRound),
        bestScore: Math.max(prev.bestScore, finalScore),
        longestCombo: Math.max(prev.longestCombo, finalMaxCombo),
      });
      setDeadBanner({
        newRecord: newRecord && (finalRound > 0 || finalScore > 0),
        reachedRound: finalRound,
        xpEarned: finalScore,
      });
      if (newRecord && (finalRound > prev.bestRound || finalScore > prev.bestScore)) {
        void confetti({
          particleCount: 140,
          spread: 68,
          startVelocity: 35,
          origin: { y: 0.42 },
          scalar: 0.95,
        });
      }
    },
    []
  );

  const loadNextQuestion = useCallback(
    (nextRound: number) => {
      const nq = pickQuestion(nextRound);
      setQ(nq);
      setLocked(false);
      setPickedIdx(null);
      resetPhaseTimer();
      if (!nq) {
        finishGame(nextRound, scoreRef.current, maxComboRef.current, correctRef.current, wrongRef.current);
      }
    },
    [finishGame, resetPhaseTimer]
  );

  useEffect(() => {
    roundIndexRef.current = roundIndex;
  }, [roundIndex]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    maxComboRef.current = maxCombo;
  }, [maxCombo]);

  useEffect(() => {
    correctRef.current = correctN;
  }, [correctN]);

  useEffect(() => {
    wrongRef.current = wrongN;
  }, [wrongN]);

  useEffect(() => {
    if (gameOver || locked || !q) return;
    const id = window.setInterval(() => {
      forceTimer((n) => n + 1);
      if (Date.now() >= phaseEndsRef.current) {
        window.clearInterval(id);
        if (gameOverRef.current) return;
        setLocked(true);
        setCombo(0);
        setWrongN((w) => {
          const nw = w + 1;
          wrongRef.current = nw;
          return nw;
        });
        setLives((l) => {
          const nl = l - 1;
          if (nl <= 0) {
            const ri = roundIndexRef.current;
            finishGame(ri, scoreRef.current, maxComboRef.current, correctRef.current, wrongRef.current);
          } else {
            if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
            advanceTimerRef.current = setTimeout(() => {
              advanceTimerRef.current = null;
              const next = roundIndexRef.current + 1;
              roundIndexRef.current = next;
              setRoundIndex(next);
              loadNextQuestion(next);
            }, 1600);
          }
          return nl;
        });
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [gameOver, locked, q, finishGame, loadNextQuestion]);

  const handlePick = (idx: number) => {
    if (locked || gameOver || !q) return;
    setLocked(true);
    setPickedIdx(idx);
    const opt = q.options[idx];
    const ok = normMc(opt) === normMc(q.correct);
    if (ok) {
      const nc = combo + 1;
      setCombo(nc);
      setMaxCombo((m) => Math.max(m, nc));
      if (nc === 10) {
        setUnstoppable(true);
        window.setTimeout(() => setUnstoppable(false), 2800);
      }
      const mult = nc >= 10 ? 3 : nc >= 5 ? 2 : nc >= 3 ? 1.5 : 1;
      const earned = Math.round(10 * mult);
      addXP(earned);
      setScore((s) => {
        const ns = s + earned;
        scoreRef.current = ns;
        return ns;
      });
      setCorrectN((c) => {
        const n = c + 1;
        correctRef.current = n;
        return n;
      });
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        advanceTimerRef.current = null;
        const next = roundIndexRef.current + 1;
        roundIndexRef.current = next;
        setRoundIndex(next);
        loadNextQuestion(next);
      }, 800);
    } else {
      setCombo(0);
      setWrongN((w) => {
        const nw = w + 1;
        wrongRef.current = nw;
        return nw;
      });
      setLives((l) => {
        const nl = l - 1;
        if (nl <= 0) {
          const ri = roundIndexRef.current;
          finishGame(ri, scoreRef.current, maxComboRef.current, correctRef.current, wrongRef.current);
        } else {
          if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = setTimeout(() => {
            advanceTimerRef.current = null;
            const next = roundIndexRef.current + 1;
            roundIndexRef.current = next;
            setRoundIndex(next);
            loadNextQuestion(next);
          }, 1600);
        }
        return nl;
      });
    }
  };

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const remainingMs = q && !gameOver ? Math.max(0, phaseEndsRef.current - Date.now()) : 0;
  const progress = q && !gameOver ? remainingMs / ROUND_MS : 0;
  const stress = 1 - progress;
  const ringColor =
    stress < 0.4 ? 'stroke-emerald-500' : stress < 0.7 ? 'stroke-amber-500' : 'stroke-red-500';

  const tenseLabel = TENSES_ES.find((t) => t.id === q?.tense)?.label ?? q?.tense ?? '';
  const pronounLabel = PRONOUNS_ES.find((p) => p.id === q?.pronoun)?.label ?? q?.pronoun ?? '';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-950 text-slate-100">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-slate-900/95">
        <div className="flex items-center gap-2 text-lg" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < lives ? '' : 'opacity-25 grayscale'}>
              ❤️
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold tabular-nums">
          <span>
            Soru: <span className="text-violet-300">{roundIndex + 1}</span>
          </span>
          <span>
            Kombo:{' '}
            <span className="text-amber-300">
              {combo > 0 ? `×${comboMult}` : '—'}
            </span>
          </span>
          <span>
            Skor: <span className="text-emerald-300">{score}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          aria-label="Survival modundan çık"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-8 overflow-y-auto">
        {unstoppable && (
          <div
            className="fixed top-24 left-1/2 -translate-x-1/2 z-10 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-black text-lg shadow-lg shadow-orange-500/40 animate-bounce"
            role="status"
          >
            🔥 UNSTOPPABLE!
          </div>
        )}

        {q && !gameOver && (
          <>
            <div className="relative w-40 h-40 sm:w-48 sm:h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={ringColor}
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
                  style={{ transition: 'stroke-dashoffset 0.15s linear, stroke 0.3s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                <span className="text-3xl sm:text-4xl font-black tabular-nums text-white">
                  {(remainingMs / 1000).toFixed(1)}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">saniye</span>
              </div>
            </div>

            <p className="text-center text-slate-400 text-sm max-w-md">
              <span className="text-slate-200 font-semibold capitalize">{q.verb}</span>
              <span className="mx-1.5">·</span>
              {tenseLabel}
              <span className="mx-1.5">·</span>
              {pronounLabel}
            </p>

            <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.options.map((opt, idx) => {
                const isCorrect = normMc(opt) === normMc(q.correct);
                const isPicked = pickedIdx === idx;
                const showGreen = locked && isCorrect;
                const showRed = locked && isPicked && !isCorrect;
                return (
                  <button
                    key={`${opt}-${idx}`}
                    type="button"
                    disabled={locked}
                    onClick={() => handlePick(idx)}
                    className={`min-h-[52px] rounded-2xl border-2 px-4 py-3 text-base font-bold text-center transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/60 disabled:cursor-default ${
                      showGreen
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : showRed
                          ? 'border-red-500 bg-red-500/15 text-red-100'
                          : 'border-white/15 bg-white/5 text-slate-100 hover:border-violet-500/50 hover:bg-violet-500/10'
                    }`}
                  >
                    <span className="block truncate" title={opt}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {gameOver && deadBanner && (
          <div className="max-w-md w-full rounded-2xl border border-white/15 bg-slate-900/90 p-6 text-center space-y-4 shadow-xl">
            <h2 className="text-xl font-bold text-white">Oyun bitti</h2>
            {deadBanner.newRecord && (
              <p className="text-lg font-bold text-amber-300">🏆 Rekor kırdın!</p>
            )}
            <ul className="text-sm text-slate-300 space-y-2 text-left">
              <li>
                Ulaşılan soru: <strong className="text-white">{deadBanner.reachedRound + 1}</strong>
              </li>
              <li>
                Doğru / yanlış:{' '}
                <strong className="text-emerald-400">{correctN}</strong> /{' '}
                <strong className="text-red-400">{wrongN}</strong>
              </li>
              <li>
                En uzun kombo: <strong className="text-amber-300">{maxCombo}</strong>
              </li>
              <li>
                Toplam XP (skor): <strong className="text-violet-300">{deadBanner.xpEarned}</strong>
              </li>
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              Kapat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
