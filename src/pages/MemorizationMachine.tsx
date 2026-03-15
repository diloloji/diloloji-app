/**
 * Ezber Makinesi — Aralıklı Tekrar (SRS) ile kelime antrenmanı.
 * Gece mavisi + altın konsept, tek kart, 3D flip, Zordu / İyi / Kolay.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import { useXp } from '../contexts/XpContext';

export type SRSCard = {
  id: number;
  front: string;
  back: string;
  language: string;
  nextReview: number;
  interval: number;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Örnek kelime havuzu — nextReview <= now olanlar aktif destede */
const INITIAL_POOL: SRSCard[] = [
  { id: 1, front: 'Éphémère', back: 'Geçici, kısa ömürlü', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 2, front: 'Aujourd\'hui', back: 'Bugün', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 3, front: 'S\'il vous plaît', back: 'Lütfen', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 4, front: 'Merci', back: 'Teşekkürler', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 5, front: 'Bonjour', back: 'Günaydın / Merhaba', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 6, front: 'Au revoir', back: 'Hoşça kal', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 7, front: 'Comment allez-vous?', back: 'Nasılsınız?', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 8, front: 'Je ne sais pas', back: 'Bilmiyorum', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 9, front: 'Peut-être', back: 'Belki', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 10, front: 'Toujours', back: 'Her zaman', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 11, front: 'Jamais', back: 'Asla', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 12, front: 'Maintenant', back: 'Şimdi', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 13, front: 'Aujourd\'hui et demain', back: 'Bugün ve yarın', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 14, front: 'De rien', back: 'Rica ederim', language: 'Fransızca', nextReview: 0, interval: 0 },
  { id: 15, front: 'Excusez-moi', back: 'Affedersiniz', language: 'Fransızca', nextReview: 0, interval: 0 },
];

function getActiveDeck(pool: SRSCard[]): SRSCard[] {
  const now = Date.now();
  return pool.filter((c) => c.nextReview <= now).slice();
}

export default function MemorizationMachine() {
  const { addXP } = useXp();
  const [pool, setPool] = useState<SRSCard[]>(() =>
    INITIAL_POOL.map((c) => ({ ...c, nextReview: Date.now() }))
  );
  const [sessionQueue, setSessionQueue] = useState<SRSCard[]>(() => getActiveDeck(INITIAL_POOL.map((c) => ({ ...c, nextReview: Date.now() }))));
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  const activeDeck = useMemo(() => getActiveDeck(pool), [pool]);
  const currentCard = sessionQueue[0] ?? null;

  const updateCardInPool = useCallback((id: number, nextReview: number, interval: number) => {
    setPool((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nextReview, interval } : c))
    );
  }, []);

  const handleRate = useCallback(
    (rating: 'again' | 'good' | 'easy') => {
      if (!currentCard) return;
      const now = Date.now();
      const id = currentCard.id;

      if (rating === 'again') {
        updateCardInPool(id, now, 0);
        setSessionQueue((prev) => (prev.length <= 1 ? [] : [...prev.slice(1), { ...currentCard, nextReview: now, interval: 0 }]));
      } else if (rating === 'good') {
        updateCardInPool(id, now + ONE_DAY_MS, 1);
        setSessionQueue((prev) => prev.slice(1));
      } else {
        updateCardInPool(id, now + 4 * ONE_DAY_MS, 4);
        setSessionQueue((prev) => prev.slice(1));
      }

      const nextCompleted = completedCount + 1;
      setCompletedCount(nextCompleted);
      if (nextCompleted % 10 === 0) addXP(50);

      setIsFlipped(false);
      if (sessionQueue.length === 1 && (rating === 'good' || rating === 'easy')) {
        setShowComplete(true);
      }
    },
    [currentCard, completedCount, sessionQueue.length, updateCardInPool, addXP]
  );

  const handleStartOver = useCallback(() => {
    const withNow = pool.map((c) => ({ ...c, nextReview: Date.now(), interval: 0 }));
    setPool(withNow);
    setSessionQueue(getActiveDeck(withNow));
    setIsFlipped(false);
    setCompletedCount(0);
    setShowComplete(false);
  }, [pool]);

  if (showComplete) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col">
        <Helmet>
          <title>Ezber Makinesi | Diloloji</title>
          <meta name="description" content="Aralıklı tekrar ile kelime ezberleme. SRS algoritması." />
        </Helmet>
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-md w-full rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 text-center shadow-2xl"
          >
            <p className="text-5xl mb-4" aria-hidden>🎉</p>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Günlük Antrenman Tamamlandı!</h2>
            <p className="text-slate-400 text-sm mb-6">Kelimeler hafızana kazındı.</p>
            <button
              type="button"
              onClick={handleStartOver}
              className="w-full py-3.5 px-6 rounded-2xl font-semibold bg-gradient-to-r from-amber-500/90 to-amber-600 text-slate-900 hover:from-amber-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-all shadow-lg shadow-amber-500/20"
            >
              Tekrar Çalış
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  if (activeDeck.length === 0 && !currentCard) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col">
        <Helmet>
          <title>Ezber Makinesi | Diloloji</title>
        </Helmet>
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-md w-full rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 text-center">
            <p className="text-slate-400 mb-6">Bugün tekrar edilecek kelime kalmadı.</p>
            <button
              type="button"
              onClick={handleStartOver}
              className="w-full py-3.5 px-6 rounded-2xl font-semibold bg-amber-500/90 text-slate-900 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-all"
            >
              Sıfırla ve Tekrar Başla
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <Helmet>
        <title>Ezber Makinesi | Diloloji</title>
        <meta name="description" content="Aralıklı tekrar (SRS) ile kelime ezberleme. Zordu, İyi, Kolay." />
      </Helmet>
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 min-h-[80vh]">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mb-4 uppercase tracking-wider">
          {sessionQueue.length} kelime kaldı
        </p>

        <AnimatePresence mode="wait">
          {currentCard ? (
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg"
            >
              {/* Kart — 3D flip */}
              <div
                className="relative w-full aspect-[4/3] max-h-[320px] cursor-pointer"
                style={{ perspective: '1200px' }}
                onClick={() => !isFlipped && setIsFlipped(true)}
              >
                <motion.div
                  className="relative w-full h-full"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                >
                  {/* Ön yüz */}
                  <div
                    className="absolute inset-0 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center p-8 shadow-2xl"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
                  >
                    <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider mb-2">
                      {currentCard.language}
                    </span>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-100 text-center">
                      {currentCard.front}
                    </p>
                  </div>
                  {/* Arka yüz */}
                  <div
                    className="absolute inset-0 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center p-8 shadow-2xl"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider mb-2">
                      Anlam
                    </span>
                    <p className="text-xl sm:text-2xl font-semibold text-slate-200 text-center">
                      {currentCard.back}
                    </p>
                  </div>
                </motion.div>
              </div>

              {!isFlipped ? (
                <button
                  type="button"
                  onClick={() => setIsFlipped(true)}
                  className="mt-6 w-full py-3.5 px-6 rounded-2xl font-semibold bg-amber-500/90 text-slate-900 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-all shadow-lg shadow-amber-500/20"
                >
                  Cevabı Göster
                </button>
              ) : (
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRate('again')}
                    className="py-3.5 px-4 rounded-2xl font-semibold text-sm bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-400/50 transition-all"
                  >
                    🔴 Zordu
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate('good')}
                    className="py-3.5 px-4 rounded-2xl font-semibold text-sm bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all"
                  >
                    🟡 İyi (1 Gün)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate('easy')}
                    className="py-3.5 px-4 rounded-2xl font-semibold text-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                  >
                    🟢 Kolay (4 Gün)
                  </button>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
