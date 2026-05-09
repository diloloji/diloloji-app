/**
 * Çalışma motoru — SRS kartlar + yazarak / çoktan seç / eşleştir / hızlı tur.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, ChevronLeft, Lightbulb, CheckCircle2, Zap, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import type { Deck, Card, SRSGrade } from '../../types/deck';
import { applyGrade, getDueCards, gradeLabel } from '../../types/deck';
import type { StudyMode } from '../../types/studyMode';
import SessionComplete from './SessionComplete';

// ─── Props ───────────────────────────────────────────────────────────────

interface StudyEngineProps {
  deck: Deck;
  mode: StudyMode;
  onExit: (updatedCards: Card[]) => void;
  /** Aynı deste + mod ile oturumu sıfırla */
  onStudyAgain: () => void;
}

interface SessionStats {
  again: number;
  hard: number;
  good: number;
  easy: number;
  totalReviewed: number;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function speak(text: string, lang: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang =
    lang.includes('İspanyolca') || lang.includes('Ispanyolca')
      ? 'es-ES'
      : lang.includes('Fransızca')
        ? 'fr-FR'
        : lang.includes('İngilizce')
          ? 'en-US'
          : lang.includes('Almanca')
            ? 'de-DE'
            : 'es-ES';
  window.speechSynthesis.speak(utt);
}

function gradeButtonClass(grade: SRSGrade, selected: boolean): string {
  const base =
    'flex-1 rounded-xl border py-3 px-2 text-sm font-bold transition-all active:scale-95 select-none min-h-[44px] md:min-h-0 touch-manipulation ';
  const colors: Record<SRSGrade, string> = {
    0: 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/70',
    1: 'border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:border-orange-500/70',
    2: 'border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-500/70',
    3: 'border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20 hover:border-green-500/70',
  };
  const ring: Record<SRSGrade, string> = {
    0: 'ring-2 ring-red-400/60',
    1: 'ring-2 ring-orange-400/60',
    2: 'ring-2 ring-blue-400/60',
    3: 'ring-2 ring-green-400/60',
  };
  return base + colors[grade] + (selected ? ' ' + ring[grade] : '');
}

function intervalLabel(days: number): string {
  if (days === 0) return '10 dk';
  if (days === 1) return '1 gün';
  if (days < 7) return `${days} gün`;
  if (days < 30) return `${Math.round(days / 7)} hafta`;
  return `${Math.round(days / 30)} ay`;
}

function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"']/g, '');
}

// ═══ Kartlar (SRS) ═══════════════════════════════════════════════════════

function CardsModeStudy({
  deck,
  onExit,
  onStudyAgain,
}: {
  deck: Deck;
  onExit: (updatedCards: Card[]) => void;
  onStudyAgain: () => void;
}) {
  const [queue] = useState<Card[]>(() => {
    const due = getDueCards(deck);
    if (due.length > 0) return due;
    return [...deck.cards];
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState<SessionStats>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    totalReviewed: 0,
  });
  const [updatedCards, setUpdatedCards] = useState<Card[]>([...deck.cards]);
  const [phase, setPhase] = useState<'study' | 'summary'>('study');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [gradeAnim, setGradeAnim] = useState<SRSGrade | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalCards = queue.length;
  const currentCard = queue[currentIdx] ?? null;
  const progress = totalCards > 0 ? currentIdx / totalCards : 0;

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const flip = useCallback(() => {
    setIsFlipped((v) => !v);
    setShowHint(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'study') return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!isFlipped) flip();
      }
      if (isFlipped) {
        if (e.key === '1') grade(0);
        if (e.key === '2') grade(1);
        if (e.key === '3') grade(2);
        if (e.key === '4') grade(3);
      }
      if (e.key === 'h') setShowHint((v) => !v);
      if (e.key === 'p') currentCard && speak(currentCard.front, deck.language);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, isFlipped, flip, currentCard, deck.language]);

  const grade = useCallback(
    (g: SRSGrade) => {
      if (!currentCard) return;
      setGradeAnim(g);
      setTimeout(() => setGradeAnim(null), 600);
      const graded = applyGrade(currentCard, g);
      setUpdatedCards((prev) => prev.map((c) => (c.id === graded.id ? graded : c)));
      setStats((prev) => ({
        ...prev,
        again: prev.again + (g === 0 ? 1 : 0),
        hard: prev.hard + (g === 1 ? 1 : 0),
        good: prev.good + (g === 2 ? 1 : 0),
        easy: prev.easy + (g === 3 ? 1 : 0),
        totalReviewed: prev.totalReviewed + 1,
      }));

      const nextIdx = currentIdx + 1;
      if (nextIdx >= totalCards) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('summary');
      } else {
        setCurrentIdx(nextIdx);
        setIsFlipped(false);
        setShowHint(false);
      }
    },
    [currentCard, currentIdx, totalCards]
  );

  if (phase === 'summary') {
    const accuracy =
      stats.totalReviewed > 0
        ? Math.round(((stats.good + stats.easy) / stats.totalReviewed) * 100)
        : 0;
    const xp = stats.easy * 10 + stats.good * 7 + stats.hard * 3;
    return (
      <SessionComplete
        deckTitle={deck.title}
        accuracyPercent={accuracy}
        xpEarned={xp}
        elapsedSeconds={elapsedSeconds}
        gradeRow={{
          again: stats.again,
          hard: stats.hard,
          good: stats.good,
          easy: stats.easy,
        }}
        onFinish={() => onExit(updatedCards)}
        onStudyAgain={onStudyAgain}
      />
    );
  }

  if (!currentCard) return null;

  return (
    <div className="flex min-h-screen flex-col bg-night-950">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => onExit(updatedCards)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-400 transition-all hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft size={16} />
          Çık
        </button>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="font-mono">{formatTime(elapsedSeconds)}</span>
          <span className="text-slate-600">•</span>
          <span>
            <span className="font-bold text-white">{currentIdx + 1}</span>
            <span className="text-slate-600">/{totalCards}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => speak(currentCard.front, deck.language)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition-all hover:bg-white/5 hover:text-indigo-300"
        >
          <Volume2 size={16} />
        </button>
      </div>

      <div className="relative mx-4 h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.45)]"
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>

      <div className="mx-4 mt-1 flex justify-between text-[10px] text-slate-600">
        <span className="text-red-400/70">{stats.again > 0 ? `${stats.again} ✗` : ''}</span>
        <span className="text-slate-500">{deck.title}</span>
        <span className="text-green-400/70">
          {stats.good + stats.easy > 0 ? `${stats.good + stats.easy} ✓` : ''}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentCard.id}-${isFlipped ? 'back' : 'front'}`}
            className="relative w-full max-w-lg cursor-pointer touch-pan-y"
            style={{ perspective: '1000px' }}
            drag={phase === 'study' ? 'x' : false}
            dragConstraints={{ left: -120, right: 120 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (phase !== 'study' || !currentCard) return;
              const vx = info.velocity.x;
              const ox = info.offset.x;
              if (!isFlipped) {
                if (Math.abs(ox) > 56 || Math.abs(vx) > 400) flip();
                return;
              }
              if (ox < -48 || vx < -380) {
                grade(0);
              } else if (ox > 48 || vx > 380) {
                grade(3);
              }
            }}
            onClick={flip}
            initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90, scale: 0.95 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <AnimatePresence>
              {gradeAnim !== null && (
                <motion.div
                  className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl text-2xl font-black ${
                    gradeAnim === 0
                      ? 'text-red-400'
                      : gradeAnim === 1
                        ? 'text-orange-400'
                        : gradeAnim === 2
                          ? 'text-blue-400'
                          : 'text-green-400'
                  }`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0, scale: 1.8, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  {gradeAnim === 0 ? '✗' : gradeAnim === 3 ? '★' : '✓'}
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className={`flex min-h-[min(280px,50dvh)] sm:min-h-[260px] w-full max-w-full flex-col items-center justify-center gap-4 rounded-2xl border p-6 sm:p-8 text-center shadow-2xl transition-all ${
                isFlipped
                  ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-950/80 to-night-900/90 shadow-indigo-500/20'
                  : 'border-white/10 bg-night-900/90 shadow-black/30'
              }`}
            >
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                  isFlipped
                    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                    : 'border-white/10 bg-white/5 text-slate-500'
                }`}
              >
                {isFlipped ? 'Arka Yüz' : 'Ön Yüz'}
              </span>
              <p
                className={`font-bold leading-tight ${
                  isFlipped ? 'text-3xl text-indigo-100' : 'text-4xl text-white'
                }`}
              >
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
              {!isFlipped && currentCard.hint && (
                <AnimatePresence>
                  {showHint ? (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-300"
                    >
                      💡 {currentCard.hint}
                    </motion.p>
                  ) : (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(true);
                      }}
                      className="flex items-center gap-1.5 text-xs text-slate-600 transition-colors hover:text-amber-400"
                    >
                      <Lightbulb size={12} />
                      İpucu göster
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
              {!isFlipped && (
                <p className="text-xs text-slate-600">Boşluk veya tıkla → çevir</p>
              )}
              {isFlipped && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 size={11} />
                  <span>
                    Aralık:{' '}
                    <span className="text-slate-400">{intervalLabel(currentCard.srs.interval)}</span>
                    {' · Tekrar: '}
                    <span className="text-slate-400">{currentCard.srs.repetitions}</span>
                  </span>
                </div>
              )}
              {isFlipped && (
                <p className="text-[10px] text-slate-500 md:hidden">← kaydır: Yeniden · Kolay →</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {!isFlipped && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={flip}
            className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-8 py-3 text-sm font-semibold text-indigo-300 transition-all hover:border-indigo-500/40 hover:bg-indigo-500/20"
          >
            Cevabı Gör →
          </motion.button>
        )}

        <AnimatePresence>
          {isFlipped && (
            <motion.div
              className="mt-5 w-full max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="mb-2 flex justify-center gap-6 text-[10px] text-slate-600">
                <span>[1] Yeniden</span>
                <span>[2] Zor</span>
                <span>[3] İyi</span>
                <span>[4] Kolay</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([0, 1, 2, 3] as SRSGrade[]).map((g) => {
                  const preview = applyGrade(currentCard, g);
                  const days = intervalLabel(preview.srs.interval);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => grade(g)}
                      className={gradeButtonClass(g, false)}
                    >
                      <div className="font-bold">{gradeLabel(g)}</div>
                      <div className="mt-0.5 text-[10px] font-normal opacity-60">{days}</div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pb-4 text-center text-[10px] text-slate-700">
        [H] İpucu · [P] Seslendir · [Boşluk] Çevir
      </div>
    </div>
  );
}

// ═══ Yazarak ════════════════════════════════════════════════════════════

function WriteModeStudy({
  deck,
  onExit,
  onStudyAgain,
}: {
  deck: Deck;
  onExit: (updatedCards: Card[]) => void;
  onStudyAgain: () => void;
}) {
  const [queue] = useState<Card[]>(() => {
    const due = getDueCards(deck);
    const q = due.length > 0 ? due : [...deck.cards];
    return shuffle(q);
  });
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'ok' | 'bad'>('idle');
  const [correctN, setCorrectN] = useState(0);
  const [updatedCards, setUpdatedCards] = useState<Card[]>([...deck.cards]);
  const [phase, setPhase] = useState<'study' | 'summary'>('study');
  const [elapsed, setElapsed] = useState(0);
  const card = queue[idx];

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const total = queue.length;
  const check = () => {
    if (!card || feedback !== 'idle') return;
    const ok = normalizeAnswer(answer) === normalizeAnswer(card.back);
    setFeedback(ok ? 'ok' : 'bad');
    if (ok) {
      setCorrectN((c) => c + 1);
      const graded = applyGrade(card, 2);
      setUpdatedCards((prev) => prev.map((c) => (c.id === graded.id ? graded : c)));
    } else {
      const graded = applyGrade(card, 0);
      setUpdatedCards((prev) => prev.map((c) => (c.id === graded.id ? graded : c)));
    }
  };

  const next = () => {
    if (idx + 1 >= total) {
      setPhase('summary');
      return;
    }
    setIdx((i) => i + 1);
    setAnswer('');
    setFeedback('idle');
  };

  if (phase === 'summary') {
    const acc = total > 0 ? Math.round((correctN / total) * 100) : 0;
    const xp = correctN * 5;
    return (
      <SessionComplete
        deckTitle={deck.title}
        accuracyPercent={acc}
        xpEarned={xp}
        elapsedSeconds={elapsed}
        onFinish={() => onExit(updatedCards)}
        onStudyAgain={onStudyAgain}
      />
    );
  }

  if (!card) return null;

  return (
    <div className="min-h-screen bg-night-950 px-4 py-6">
      <div className="mx-auto flex max-w-lg items-center justify-between pb-4">
        <button
          type="button"
          onClick={() => onExit(updatedCards)}
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Çık
        </button>
        <span className="text-sm text-slate-500">
          {idx + 1}/{total}
        </span>
      </div>
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-night-900/90 p-6">
        <p className="text-xs text-slate-500">Ön yüz</p>
        <p className="text-2xl font-bold text-white">{card.front}</p>
        <p className="mt-4 text-xs text-slate-500">Arka yüzü yazın (Türkçe / anlam)</p>
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={feedback !== 'idle'}
          onKeyDown={(e) => e.key === 'Enter' && feedback === 'idle' && check()}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none disabled:opacity-50"
          placeholder="Cevabınız..."
          autoFocus
        />
        {feedback === 'bad' && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-left">
            <p className="text-sm text-red-300">Doğru cevap:</p>
            <p className="text-lg font-semibold text-white">{card.back}</p>
          </div>
        )}
        {feedback === 'ok' && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200">
            Doğru! +5 XP
          </div>
        )}
        <div className="mt-4 flex gap-2">
          {feedback === 'idle' ? (
            <button
              type="button"
              onClick={check}
              className="flex-1 rounded-xl bg-indigo-500 py-3 font-semibold text-white hover:bg-indigo-400"
            >
              Kontrol et
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="flex-1 rounded-xl bg-indigo-500 py-3 font-semibold text-white hover:bg-indigo-400"
            >
              {idx + 1 >= total ? 'Bitir' : 'Sonraki →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ Çoktan seç ═════════════════════════════════════════════════════════

function ChoiceModeStudy({
  deck,
  onExit,
  onStudyAgain,
}: {
  deck: Deck;
  onExit: (updatedCards: Card[]) => void;
  onStudyAgain: () => void;
}) {
  const [queue] = useState(() => shuffle([...deck.cards]));
  const [idx, setIdx] = useState(0);
  const [correctN, setCorrectN] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pickedWrong, setPickedWrong] = useState<string | null>(null);
  const [updatedCards, setUpdatedCards] = useState<Card[]>([...deck.cards]);
  const [phase, setPhase] = useState<'study' | 'summary'>('study');
  const [elapsed, setElapsed] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const card = queue[idx];
  const total = queue.length;

  const options = useMemo(() => {
    if (!card) return [];
    const others = deck.cards.filter((c) => c.id !== card.id).map((c) => c.back);
    const wrong = shuffle([...others])
      .filter((b) => normalizeAnswer(b) !== normalizeAnswer(card.back))
      .slice(0, 3);
    while (wrong.length < 3 && others.length > wrong.length) {
      const o = others.find((b) => !wrong.includes(b));
      if (o) wrong.push(o);
      else break;
    }
    const fillers = ['(diğer seçenek)', '(cevap burada değil)', '(—)'];
    let fi = 0;
    while (wrong.length < 3) {
      wrong.push(fillers[fi % fillers.length]);
      fi++;
    }
    return shuffle([card.back, ...wrong.slice(0, 3)]);
  }, [card?.id, deck.cards, idx]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const pick = (opt: string) => {
    if (!card || revealed) return;
    setRevealed(true);
    const ok = normalizeAnswer(opt) === normalizeAnswer(card.back);
    setPickedWrong(ok ? null : opt);
    if (ok) {
      setCorrectN((c) => c + 1);
      setUpdatedCards((prev) =>
        prev.map((c) => (c.id === card.id ? applyGrade(c, 2) : c))
      );
    } else {
      setUpdatedCards((prev) =>
        prev.map((c) => (c.id === card.id ? applyGrade(c, 0) : c))
      );
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (idx + 1 >= total) setPhase('summary');
      else {
        setIdx((i) => i + 1);
        setRevealed(false);
        setPickedWrong(null);
      }
      timeoutRef.current = null;
    }, 1000);
  };

  if (phase === 'summary') {
    const acc = total > 0 ? Math.round((correctN / total) * 100) : 0;
    const xp = correctN * 5;
    return (
      <SessionComplete
        deckTitle={deck.title}
        accuracyPercent={acc}
        xpEarned={xp}
        elapsedSeconds={elapsed}
        onFinish={() => onExit(updatedCards)}
        onStudyAgain={onStudyAgain}
      />
    );
  }

  if (!card) return null;

  return (
    <div className="min-h-screen bg-night-950 px-4 py-6">
      <div className="mx-auto mb-4 flex max-w-lg justify-between text-sm text-slate-500">
        <button type="button" onClick={() => onExit(updatedCards)} className="hover:text-white">
          ← Çık
        </button>
        <span>
          {idx + 1}/{total}
        </span>
      </div>
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-night-900/90 p-6">
        <p className="text-xs text-slate-500">Ön yüz</p>
        <p className="text-2xl font-bold text-white">{card.front}</p>
        <p className="mt-4 text-sm font-medium text-slate-400">Doğru anlamı seçin</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((opt) => {
            const isRight = normalizeAnswer(opt) === normalizeAnswer(card.back);
            const show = revealed;
            const isWrongPick = show && pickedWrong === opt;
            return (
              <button
                key={opt + idx}
                type="button"
                disabled={revealed}
                onClick={() => pick(opt)}
                className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                  show && isRight
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                    : isWrongPick
                      ? 'border-red-500 bg-red-500/20 text-red-200'
                      : show && !isRight
                        ? 'border-white/10 opacity-40'
                        : 'border-white/10 bg-white/5 text-white hover:border-indigo-500/40'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══ Eşleştir ═══════════════════════════════════════════════════════════

function MatchModeStudy({
  deck,
  onExit,
  onStudyAgain,
}: {
  deck: Deck;
  onExit: (updatedCards: Card[]) => void;
  onStudyAgain: () => void;
}) {
  if (deck.cards.length < 3) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-night-950 px-4">
        <p className="mb-4 max-w-sm text-center text-slate-400">
          Eşleştir modu için en az 3 kart gerekir. Desteye kelime ekleyin veya başka mod seçin.
        </p>
        <button
          type="button"
          onClick={() => onExit([...deck.cards])}
          className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Geri dön
        </button>
      </div>
    );
  }

  const picked = useMemo(() => {
    const n = Math.min(6, deck.cards.length);
    return shuffle([...deck.cards]).slice(0, Math.max(3, n));
  }, [deck.cards]);

  const [leftOrder] = useState(() =>
    shuffle(picked.map((c) => ({ id: c.id, text: c.front })))
  );
  const [rightOrder] = useState(() =>
    shuffle(picked.map((c) => ({ id: c.id, text: c.back })))
  );
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ side: 'L' | 'R'; id: string } | null>(null);
  const [wrongN, setWrongN] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'play' | 'summary'>('play');
  const [elapsed, setElapsed] = useState(0);
  const [updatedCards] = useState<Card[]>([...deck.cards]);

  useEffect(() => {
    if (phase !== 'play') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (matched.size === picked.length && picked.length > 0 && phase === 'play') {
      setPhase('summary');
    }
  }, [matched, picked.length, phase]);

  const onPick = (side: 'L' | 'R', id: string) => {
    if (matched.has(id) || phase !== 'play') return;
    if (!selected) {
      setSelected({ side, id });
      return;
    }
    if (selected.side === side) {
      setSelected({ side, id });
      return;
    }
    if (selected.id === id) {
      setFlashId(id);
      setTimeout(() => setFlashId(null), 450);
      setMatched((m) => new Set([...m, id]));
      setSelected(null);
    } else {
      setWrongN((w) => w + 1);
      setSelected(null);
    }
  };

  if (phase === 'summary') {
    const acc = Math.max(0, 100 - wrongN * 12);
    const xp = picked.length * 8;
    return (
      <SessionComplete
        deckTitle={deck.title}
        accuracyPercent={acc}
        xpEarned={xp}
        elapsedSeconds={elapsed}
        subtitle={`${picked.length} çift · ${wrongN} hatalı eşleşme denemesi`}
        onFinish={() => onExit(updatedCards)}
        onStudyAgain={onStudyAgain}
      />
    );
  }

  return (
    <div className="min-h-screen bg-night-950 px-4 py-6">
      <div className="mx-auto mb-4 flex max-w-3xl justify-between">
        <button type="button" onClick={() => onExit(updatedCards)} className="text-sm text-slate-400 hover:text-white">
          ← Çık
        </button>
        <span className="font-mono text-sm text-slate-500">
          {matched.size}/{picked.length} · {elapsed}s
        </span>
      </div>
      <p className="mx-auto mb-4 max-w-3xl text-center text-sm text-slate-400">
        Soldan bir ön yüz, sağdan bir arka yüz seçerek eşleştir.
      </p>
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">Ön yüzler</p>
          {leftOrder.map((item) => {
            const done = matched.has(item.id);
            const sel = selected?.side === 'L' && selected.id === item.id;
            const flash = flashId === item.id;
            return (
              <button
                key={`L-${item.id}`}
                type="button"
                disabled={done}
                onClick={() => onPick('L', item.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                  done
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200/60 line-through opacity-50'
                    : flash
                      ? 'border-emerald-400 bg-emerald-500/30 text-white shadow-lg shadow-emerald-500/20'
                      : sel
                        ? 'border-indigo-500 bg-indigo-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-white hover:border-white/20'
                }`}
              >
                {item.text}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">Arka yüzler (karışık)</p>
          {rightOrder.map((item) => {
            const done = matched.has(item.id);
            const sel = selected?.side === 'R' && selected.id === item.id;
            const flash = flashId === item.id;
            return (
              <button
                key={`R-${item.id}`}
                type="button"
                disabled={done}
                onClick={() => onPick('R', item.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                  done
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200/60 line-through opacity-50'
                    : flash
                      ? 'border-emerald-400 bg-emerald-500/30 text-white shadow-lg shadow-emerald-500/20'
                      : sel
                        ? 'border-indigo-500 bg-indigo-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-white hover:border-white/20'
                }`}
              >
                {item.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══ Hızlı tur ═════════════════════════════════════════════════════════

function SpeedModeStudy({
  deck,
  onExit,
  onStudyAgain,
}: {
  deck: Deck;
  onExit: (updatedCards: Card[]) => void;
  onStudyAgain: () => void;
}) {
  const [queue] = useState(() => shuffle([...deck.cards]));
  const [idx, setIdx] = useState(0);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [elapsedPlay, setElapsedPlay] = useState(0);
  const [phase, setPhase] = useState<'play' | 'summary'>('play');
  const [updatedCards] = useState<Card[]>([...deck.cards]);
  const card = queue[idx];

  useEffect(() => {
    if (phase !== 'play') return;
    if (timeLeft <= 0) {
      setPhase('summary');
      return;
    }
    const t = setTimeout(() => {
      setTimeLeft((s) => s - 1);
      setElapsedPlay((e) => e + 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase]);

  const finish = useCallback(() => setPhase('summary'), []);

  const onKnow = () => {
    if (phase !== 'play' || !card) return;
    setKnown((k) => k + 1);
    if (idx + 1 >= queue.length) finish();
    else setIdx((i) => i + 1);
  };

  const onNotKnow = () => {
    if (phase !== 'play' || !card) return;
    setUnknown((u) => u + 1);
    if (idx + 1 >= queue.length) finish();
    else setIdx((i) => i + 1);
  };

  if (phase === 'summary') {
    const seen = known + unknown;
    const acc = seen > 0 ? Math.round((known / seen) * 100) : 0;
    const xp = known * 3;
    return (
      <SessionComplete
        deckTitle={deck.title}
        accuracyPercent={acc}
        xpEarned={xp}
        elapsedSeconds={elapsedPlay}
        subtitle={`Bildiğin kartlar: ${known} · Geçilen: ${unknown}`}
        onFinish={() => onExit(updatedCards)}
        onStudyAgain={onStudyAgain}
      />
    );
  }

  if (!card) return null;

  return (
    <div className="flex min-h-screen flex-col bg-night-950 px-4 py-6">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between">
        <button type="button" onClick={() => onExit(updatedCards)} className="text-sm text-slate-400 hover:text-white">
          ← Çık
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 font-mono text-lg font-bold text-amber-300">
          <Zap size={18} />
          {timeLeft}s
        </div>
        <span className="text-sm text-slate-500">✓ {known}</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-night-900/90 p-8 text-center">
          <p className="text-xs text-slate-500">Ön yüz</p>
          <p className="text-3xl font-bold text-white">{card.front}</p>
          <p className="mt-6 text-xs text-slate-600">Cevabı düşün → Biliyorum / Bilmiyorum</p>
        </div>
        <div className="mt-8 flex w-full max-w-lg gap-4">
          <button
            type="button"
            onClick={onNotKnow}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 py-4 font-bold text-red-300 hover:bg-red-500/20"
          >
            <ThumbsDown size={20} />
            Bilmiyorum
          </button>
          <button
            type="button"
            onClick={onKnow}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-4 font-bold text-emerald-300 hover:bg-emerald-500/20"
          >
            <ThumbsUp size={20} />
            Biliyorum
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══ Ana giriş ═════════════════════════════════════════════════════════

export default function StudyEngine({ deck, mode, onExit, onStudyAgain }: StudyEngineProps) {
  if (!deck.cards.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-night-950 px-4">
        <p className="mb-4 text-slate-400">Bu destede kart yok.</p>
        <button
          type="button"
          onClick={() => onExit(deck.cards)}
          className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Geri dön
        </button>
      </div>
    );
  }

  switch (mode) {
    case 'cards':
      return <CardsModeStudy deck={deck} onExit={onExit} onStudyAgain={onStudyAgain} />;
    case 'write':
      return <WriteModeStudy deck={deck} onExit={onExit} onStudyAgain={onStudyAgain} />;
    case 'choice':
      return <ChoiceModeStudy deck={deck} onExit={onExit} onStudyAgain={onStudyAgain} />;
    case 'match':
      return <MatchModeStudy deck={deck} onExit={onExit} onStudyAgain={onStudyAgain} />;
    case 'speed':
      return <SpeedModeStudy deck={deck} onExit={onExit} onStudyAgain={onStudyAgain} />;
    default:
      return <CardsModeStudy deck={deck} onExit={onExit} onStudyAgain={onStudyAgain} />;
  }
}