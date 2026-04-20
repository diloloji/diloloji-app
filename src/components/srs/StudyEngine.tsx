/**
 * Çalışma Motoru — Anki SM-2 + Memrise tarzı minimalist ilerleme çubuğu.
 * Kart çevir → 4 buton (Yeniden/Zor/İyi/Kolay) → SRS güncelle → özet.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, ChevronLeft, Lightbulb, Trophy, RotateCcw, CheckCircle2, Flame,
} from 'lucide-react';
import type { Deck, Card, SRSGrade } from '../../types/deck';
import { applyGrade, getDueCards, todayStr, gradeLabel } from '../../types/deck';

// ─── Tip ─────────────────────────────────────────────────────────────────

interface StudyEngineProps {
  deck: Deck;
  onExit: (updatedCards: Card[]) => void;
}

interface SessionStats {
  again: number;
  hard: number;
  good: number;
  easy: number;
  totalReviewed: number;
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────

function speak(text: string, lang: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang =
    lang.includes('İspanyolca') || lang.includes('Ispanyolca') ? 'es-ES'
    : lang.includes('Fransızca') ? 'fr-FR'
    : lang.includes('İngilizce') ? 'en-US'
    : lang.includes('Almanca') ? 'de-DE'
    : 'es-ES';
  window.speechSynthesis.speak(utt);
}

function gradeButtonClass(grade: SRSGrade, selected: boolean): string {
  const base = 'flex-1 rounded-xl border py-3 px-2 text-sm font-bold transition-all active:scale-95 select-none ';
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

// Gün sayısını okunabilir hale getir
function intervalLabel(days: number): string {
  if (days === 0) return '10 dk';
  if (days === 1) return '1 gün';
  if (days < 7) return `${days} gün`;
  if (days < 30) return `${Math.round(days / 7)} hafta`;
  return `${Math.round(days / 30)} ay`;
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────

export default function StudyEngine({ deck, onExit }: StudyEngineProps) {
  // Çalışılacak kartlar: önce tarihi gelenler, sonra yeni kartlar
  const [queue, setQueue] = useState<Card[]>(() => {
    const due = getDueCards(deck);
    if (due.length > 0) return due;
    // Hiç kart yoksa tüm kartları göster (ilk çalışma)
    return [...deck.cards];
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ again: 0, hard: 0, good: 0, easy: 0, totalReviewed: 0 });
  const [updatedCards, setUpdatedCards] = useState<Card[]>([...deck.cards]);
  const [phase, setPhase] = useState<'study' | 'summary'>('study');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [gradeAnim, setGradeAnim] = useState<SRSGrade | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(Date.now());

  const totalCards = queue.length;
  const currentCard = queue[currentIdx] ?? null;
  const progress = totalCards > 0 ? currentIdx / totalCards : 0;

  // Zamanlayıcı
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Kart çevir
  const flip = useCallback(() => {
    setIsFlipped((v) => !v);
    setShowHint(false);
  }, []);

  // Klavye kısayolları
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

  const grade = useCallback((g: SRSGrade) => {
    if (!currentCard) return;

    // Animasyon
    setGradeAnim(g);
    setTimeout(() => setGradeAnim(null), 600);

    // SM-2 uygula
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
      // Oturum bitti
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('summary');
    } else {
      setCurrentIdx(nextIdx);
      setIsFlipped(false);
      setShowHint(false);
    }
  }, [currentCard, currentIdx, totalCards]);

  // ── Özet Ekranı ───────────────────────────────────────────────────────
  if (phase === 'summary') {
    // duration hesaplanmıyor — elapsedSeconds zaten saatlik bazda gösteriliyor
    const accuracy = stats.totalReviewed > 0
      ? Math.round(((stats.good + stats.easy) / stats.totalReviewed) * 100)
      : 0;
    const xp = stats.easy * 10 + stats.good * 7 + stats.hard * 3;

    return (
      <motion.div
        className="flex min-h-screen flex-col items-center justify-center bg-night-950 px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-night-900/90 p-8 text-center shadow-2xl shadow-indigo-500/10"
          initial={{ scale: 0.9, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-4xl ring-4 ring-indigo-500/30">
              <Trophy className="text-indigo-400" size={36} />
            </div>
          </div>

          <h2 className="mb-1 text-2xl font-bold text-white">Oturum Tamamlandı!</h2>
          <p className="mb-6 text-sm text-slate-400">{deck.title}</p>

          {/* İstatistikler */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Doğruluk', value: `%${accuracy}`, color: 'text-indigo-300' },
              { label: 'Süre', value: formatTime(elapsedSeconds), color: 'text-slate-300' },
              { label: 'XP', value: `+${xp}`, color: 'text-amber-300' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 py-3">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Kart breakdown */}
          <div className="mb-6 grid grid-cols-4 gap-2 text-sm">
            {([
              { label: 'Yeniden', count: stats.again, color: 'text-red-400' },
              { label: 'Zor', count: stats.hard, color: 'text-orange-400' },
              { label: 'İyi', count: stats.good, color: 'text-blue-400' },
              { label: 'Kolay', count: stats.easy, color: 'text-green-400' },
            ] as const).map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5">
                <span className={`text-lg font-bold ${s.color}`}>{s.count}</span>
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Flame streak */}
          <div className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <Flame className="text-amber-400" size={20} />
            <span className="text-sm font-semibold text-amber-300">
              Harika iş! {stats.easy + stats.good} kartı başarıyla tamamladın.
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onExit(updatedCards)}
              className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5 hover:text-white"
            >
              Bitir
            </button>
            {stats.again > 0 && (
              <button
                onClick={() => {
                  setQueue(queue.filter((c) => {
                    const u = updatedCards.find((x) => x.id === c.id);
                    return u && u.srs.nextReviewDate <= todayStr();
                  }));
                  setCurrentIdx(0);
                  setIsFlipped(false);
                  setStats({ again: 0, hard: 0, good: 0, easy: 0, totalReviewed: 0 });
                  setPhase('study');
                  startedAt.current = Date.now();
                  setElapsedSeconds(0);
                  timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
                }}
                className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-400"
              >
                <RotateCcw size={14} />
                Tekrar
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (!currentCard) return null;

  // ── Çalışma Ekranı ───────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-night-950">
      {/* Üst Bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
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
          onClick={() => speak(currentCard.front, deck.language)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition-all hover:bg-white/5 hover:text-indigo-300"
        >
          <Volume2 size={16} />
        </button>
      </div>

      {/* Memrise tarzı İlerleme Çubuğu */}
      <div className="relative mx-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-glow"
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>

      {/* İstatistik mini çubuk */}
      <div className="mx-4 mt-1 flex justify-between text-[10px] text-slate-600">
        <span className="text-red-400/70">{stats.again > 0 ? `${stats.again} ✗` : ''}</span>
        <span className="text-slate-500">{deck.title}</span>
        <span className="text-green-400/70">{stats.good + stats.easy > 0 ? `${stats.good + stats.easy} ✓` : ''}</span>
      </div>

      {/* Kart Alanı */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentCard.id}-${isFlipped ? 'back' : 'front'}`}
            className="relative w-full max-w-lg cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={flip}
            initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90, scale: 0.95 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Grade animasyonu */}
            <AnimatePresence>
              {gradeAnim !== null && (
                <motion.div
                  className={`absolute inset-0 z-20 flex items-center justify-center rounded-2xl text-2xl font-black pointer-events-none ${
                    gradeAnim === 0 ? 'text-red-400' : gradeAnim === 1 ? 'text-orange-400'
                      : gradeAnim === 2 ? 'text-blue-400' : 'text-green-400'
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

            <div className={`rounded-2xl border p-8 shadow-2xl text-center min-h-[260px] flex flex-col items-center justify-center gap-4 transition-all ${
              isFlipped
                ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-950/80 to-night-900/90 shadow-indigo-500/20'
                : 'border-white/10 bg-night-900/90 shadow-black/30'
            }`}>
              {/* Ön / Arka etiketi */}
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                  isFlipped
                    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                    : 'border-white/10 bg-white/5 text-slate-500'
                }`}>
                  {isFlipped ? 'Arka Yüz' : 'Ön Yüz'}
                </span>
              </div>

              {/* Kelime */}
              <p className={`font-bold leading-tight ${
                isFlipped ? 'text-3xl text-indigo-100' : 'text-4xl text-white'
              }`}>
                {isFlipped ? currentCard.back : currentCard.front}
              </p>

              {/* İpucu */}
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={(e) => { e.stopPropagation(); setShowHint(true); }}
                      className="flex items-center gap-1.5 text-xs text-slate-600 transition-colors hover:text-amber-400"
                    >
                      <Lightbulb size={12} />
                      İpucu göster
                    </motion.button>
                  )}
                </AnimatePresence>
              )}

              {/* Çevir ipucu */}
              {!isFlipped && (
                <p className="text-xs text-slate-600">Boşluk veya tıkla → çevir</p>
              )}

              {/* SRS bilgisi (arka yüzde) */}
              {isFlipped && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 size={11} />
                  <span>
                    Aralık:{' '}
                    <span className="text-slate-400">{intervalLabel(currentCard.srs.interval)}</span>
                    {' '}· Tekrar:{' '}
                    <span className="text-slate-400">{currentCard.srs.repetitions}</span>
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Not Butonu */}
        {!isFlipped && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={flip}
            className="mt-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-8 py-3 text-sm font-semibold text-indigo-300 transition-all hover:bg-indigo-500/20 hover:border-indigo-500/40"
          >
            Cevabı Gör →
          </motion.button>
        )}

        {/* Değerlendirme Butonları */}
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
              <div className="grid grid-cols-4 gap-2">
                {([0, 1, 2, 3] as SRSGrade[]).map((g) => {
                  const preview = applyGrade(currentCard, g);
                  const days = intervalLabel(preview.srs.interval);
                  return (
                    <button
                      key={g}
                      onClick={() => grade(g)}
                      className={gradeButtonClass(g, false)}
                    >
                      <div className="font-bold">{gradeLabel(g)}</div>
                      <div className={`mt-0.5 text-[10px] font-normal opacity-60`}>{days}</div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Alt klavye kısayolları */}
      <div className="pb-4 text-center text-[10px] text-slate-700">
        [H] İpucu · [P] Seslendir · [Boşluk] Çevir
      </div>
    </div>
  );
}
