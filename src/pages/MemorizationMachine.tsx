/**
 * Ezber Makinesi — Deste seçimi + Aralıklı Tekrar (SRS) ile kelime antrenmanı.
 * Önce deste seçim ekranı, sonra tek kart, 3D flip, Zordu / İyi / Kolay.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useXp } from '../contexts/XpContext';
import { getLocalDeckByLanguage } from '../utils/deckManager';

export type SRSCard = {
  id: number;
  front: string;
  back: string;
  language: string;
  nextReview: number;
  interval: number;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PROGRESS_STORAGE_PREFIX = 'memorization-progress-';

/** Örnek set tanımları: id, başlık, ikon, dil, kartlar */
export type StudySetMeta = {
  id: string;
  title: string;
  icon: string;
  language: string;
  cards: { front: string; back: string }[];
};

const MOCK_SETS: StudySetMeta[] = [
  {
    id: 'es-50-verbs',
    title: 'En Sık Kullanılan 50 Fiil',
    icon: '🇪🇸',
    language: 'İspanyolca',
    cards: [
      { front: 'ser', back: 'olmak' },
      { front: 'estar', back: 'olmak (durum)' },
      { front: 'tener', back: 'sahip olmak' },
      { front: 'hacer', back: 'yapmak' },
      { front: 'ir', back: 'gitmek' },
      { front: 'venir', back: 'gelmek' },
      { front: 'poder', back: 'yapabilmek' },
      { front: 'saber', back: 'bilmek' },
      { front: 'querer', back: 'istemek' },
      { front: 'decir', back: 'söylemek' },
      { front: 'ver', back: 'görmek' },
      { front: 'dar', back: 'vermek' },
      { front: 'comer', back: 'yemek' },
      { front: 'vivir', back: 'yaşamak' },
      { front: 'hablar', back: 'konuşmak' },
      { front: 'pensar', back: 'düşünmek' },
      { front: 'llegar', back: 'varmak' },
      { front: 'salir', back: 'çıkmak' },
      { front: 'conocer', back: 'tanımak, bilmek' },
      { front: 'entrar', back: 'girmek' },
    ],
  },
  {
    id: 'fr-meeting',
    title: 'Temiz Tanışma Kalıpları',
    icon: '🇫🇷',
    language: 'Fransızca',
    cards: [
      { front: 'Bonjour', back: 'Günaydın / Merhaba' },
      { front: 'Comment allez-vous?', back: 'Nasılsınız?' },
      { front: 'Je m\'appelle...', back: 'Benim adım...' },
      { front: 'Enchanté(e)', back: 'Memnun oldum' },
      { front: 'S\'il vous plaît', back: 'Lütfen' },
      { front: 'Merci beaucoup', back: 'Çok teşekkürler' },
      { front: 'De rien', back: 'Rica ederim' },
      { front: 'Au revoir', back: 'Hoşça kal' },
      { front: 'À bientôt', back: 'Yakında görüşürüz' },
      { front: 'Excusez-moi', back: 'Affedersiniz' },
      { front: 'Je ne sais pas', back: 'Bilmiyorum' },
      { front: 'Éphémère', back: 'Geçici, kısa ömürlü' },
      { front: 'Peut-être', back: 'Belki' },
      { front: 'Aujourd\'hui', back: 'Bugün' },
      { front: 'Toujours', back: 'Her zaman' },
    ],
  },
  {
    id: 'en-phrasal',
    title: 'Phrasal Verbs',
    icon: '🇬🇧',
    language: 'İngilizce',
    cards: [
      { front: 'get up', back: 'kalkmak' },
      { front: 'get over', back: 'üstesinden gelmek' },
      { front: 'get along', back: 'anlaşmak, iyi geçinmek' },
      { front: 'give up', back: 'vazgeçmek' },
      { front: 'give in', back: 'teslim olmak' },
      { front: 'look after', back: 'bakmak, ilgilenmek' },
      { front: 'look for', back: 'aramak' },
      { front: 'look forward to', back: 'dört gözle beklemek' },
      { front: 'take off', back: 'çıkarmak; (uçak) havalanmak' },
      { front: 'take on', back: 'üstlenmek' },
      { front: 'make up', back: 'uydurmak; makyaj yapmak' },
      { front: 'make out', back: 'anlamak; ayırt etmek' },
      { front: 'turn on', back: 'açmak (cihaz)' },
      { front: 'turn off', back: 'kapatmak' },
      { front: 'run out of', back: 'tüketmek, bitirmek' },
      { front: 'find out', back: 'öğrenmek, bulmak' },
      { front: 'work out', back: 'çözmek; antrenman yapmak' },
      { front: 'carry on', back: 'devam etmek' },
    ],
  },
];

function getStoredProgress(setId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_PREFIX + setId);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  } catch {
    return 0;
  }
}

function setStoredProgress(setId: string, percent: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_PREFIX + setId, String(Math.min(100, Math.max(0, percent))));
  } catch {
    // ignore
  }
}

function getActiveDeck(pool: SRSCard[]): SRSCard[] {
  const now = Date.now();
  return pool.filter((c) => c.nextReview <= now).slice();
}

/** Set kartları + Cümle Laboratuvarından eklenen kelimeler (user_deck) ile SRS havuzu */
function buildPoolFromSet(set: StudySetMeta): SRSCard[] {
  const now = Date.now();
  const baseCards: SRSCard[] = set.cards.map((c, i) => ({
    id: i + 1,
    front: c.front,
    back: c.back,
    language: set.language,
    nextReview: now,
    interval: 0,
  }));
  const userEntries = getLocalDeckByLanguage(set.language);
  const userCards: SRSCard[] = userEntries.map((e, j) => ({
    id: baseCards.length + j + 1,
    front: e.word,
    back: e.translation,
    language: set.language,
    nextReview: now,
    interval: 0,
  }));
  return [...baseCards, ...userCards];
}

export default function MemorizationMachine() {
  const { addXP } = useXp();
  const [isStudying, setIsStudying] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [pool, setPool] = useState<SRSCard[]>([]);
  const [sessionQueue, setSessionQueue] = useState<SRSCard[]>([]);
  const [initialSessionSize, setInitialSessionSize] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  const selectedSet = useMemo(() => MOCK_SETS.find((s) => s.id === selectedSetId) ?? null, [selectedSetId]);
  const activeDeck = useMemo(() => getActiveDeck(pool), [pool]);
  const currentCard = sessionQueue[0] ?? null;

  const updateCardInPool = useCallback((id: number, nextReview: number, interval: number) => {
    setPool((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nextReview, interval } : c))
    );
  }, []);

  const handleRate = useCallback(
    (rating: 'again' | 'good' | 'easy') => {
      if (!currentCard || !selectedSetId) return;
      const now = Date.now();
      const id = currentCard.id;

      if (rating === 'again') {
        updateCardInPool(id, now, 0);
        setSessionQueue((prev) =>
          prev.length <= 1 ? [] : [...prev.slice(1), { ...currentCard, nextReview: now, interval: 0 }]
        );
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

      const newQueueLen = sessionQueue.length - (rating === 'again' ? 0 : 1);
      const progress = initialSessionSize > 0
        ? Math.round(((initialSessionSize - newQueueLen) / initialSessionSize) * 100)
        : 0;
      setStoredProgress(selectedSetId, progress);

      if (sessionQueue.length === 1 && (rating === 'good' || rating === 'easy')) {
        setStoredProgress(selectedSetId, 100);
        setShowComplete(true);
      }
    },
    [currentCard, completedCount, sessionQueue.length, initialSessionSize, selectedSetId, updateCardInPool, addXP]
  );

  const handleStartSet = useCallback((set: StudySetMeta) => {
    const newPool = buildPoolFromSet(set);
    const queue = getActiveDeck(newPool);
    setPool(newPool);
    setSessionQueue(queue);
    setInitialSessionSize(queue.length);
    setSelectedSetId(set.id);
    setIsFlipped(false);
    setCompletedCount(0);
    setShowComplete(false);
    setIsStudying(true);
  }, []);

  const handleBackToSetSelection = useCallback(() => {
    if (selectedSetId && initialSessionSize > 0 && sessionQueue.length < initialSessionSize) {
      const progress = Math.round(((initialSessionSize - sessionQueue.length) / initialSessionSize) * 100);
      setStoredProgress(selectedSetId, progress);
    }
    setSelectedSetId(null);
    setPool([]);
    setSessionQueue([]);
    setInitialSessionSize(0);
    setIsFlipped(false);
    setCompletedCount(0);
    setShowComplete(false);
    setIsStudying(false);
  }, [selectedSetId, initialSessionSize, sessionQueue.length]);

  const handleStartOver = useCallback(() => {
    if (!selectedSet) return;
    const newPool = pool.map((c) => ({ ...c, nextReview: Date.now(), interval: 0 }));
    setPool(newPool);
    const queue = getActiveDeck(newPool);
    setSessionQueue(queue);
    setInitialSessionSize(queue.length);
    setIsFlipped(false);
    setCompletedCount(0);
    setShowComplete(false);
    setStoredProgress(selectedSet.id, 0);
  }, [selectedSet, pool]);

  // —— Deste Seçim Ekranı ——
  if (!isStudying && !showComplete) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col">
        <Helmet>
          <title>Diloloji Ezber Makinesi: Aralıklı Tekrar ile Kelime Ezberleme</title>
          <meta name="description" content="Fransızca, İspanyolca ve İngilizce kelime setleri. SRS ile ezber makinesi ve aralıklı tekrar. Kelime kartları ve desteler." />
        </Helmet>
        <Navbar />
        <main className="flex-1 px-4 py-10 sm:py-14 max-w-2xl mx-auto w-full">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2 text-center">Ezber Makinesi</h1>
          <p className="text-slate-400 text-sm text-center mb-10">Çalışmak istediğiniz desteyi seçin</p>
          <div className="grid gap-4 sm:gap-5">
            {MOCK_SETS.map((set, index) => {
              const progress = getStoredProgress(set.id);
              const wordCount = set.cards.length;
              return (
                <motion.button
                  key={set.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.08 }}
                  onClick={() => handleStartSet(set)}
                  className="relative w-full text-left rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 sm:p-6 shadow-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] hover:bg-white/[0.08] hover:border-white/15 transition-all duration-200 group"
                >
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-amber-500/5 to-transparent" aria-hidden />
                  <div className="relative flex items-start gap-4">
                    <span className="text-3xl sm:text-4xl shrink-0" aria-hidden>{set.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-100 text-base sm:text-lg flex items-center gap-2 flex-wrap">
                        {set.title}
                        {set.id === 'en-phrasal' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40">
                            Yeni!
                          </span>
                        )}
                      </p>
                      <p className="text-slate-400 text-sm mt-0.5">{set.language} · {wordCount} kelime</p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500/90 to-amber-400"
                            initial={false}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            style={{ maxWidth: '100%' }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-400 tabular-nums shrink-0">{progress}%</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // —— Tamamlandı ekranı ——
  if (showComplete) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col">
        <Helmet>
          <title>Diloloji Ezber Makinesi: Aralıklı Tekrar ile Kelime Ezberleme</title>
          <meta name="description" content="Fransızca, İspanyolca ve İngilizce kelime setleri. SRS ile ezber makinesi ve aralıklı tekrar." />
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
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleBackToSetSelection}
                className="py-3.5 px-6 rounded-2xl font-semibold bg-white/10 text-slate-200 border border-white/10 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-all"
              >
                Deste Seçimine Dön
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="py-3.5 px-6 rounded-2xl font-semibold bg-gradient-to-r from-amber-500/90 to-amber-600 text-slate-900 hover:from-amber-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-all shadow-lg shadow-amber-500/20"
              >
                Tekrar Çalış
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // —— Boş kuyruk (bugün tekrar yok) ——
  if (activeDeck.length === 0 && !currentCard && isStudying) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col">
        <Helmet>
          <title>Diloloji Ezber Makinesi: Aralıklı Tekrar ile Kelime Ezberleme</title>
          <meta name="description" content="Fransızca, İspanyolca ve İngilizce kelime setleri. SRS ile ezber makinesi." />
        </Helmet>
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-md w-full rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 text-center">
            <p className="text-slate-400 mb-6">Bugün tekrar edilecek kelime kalmadı.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleBackToSetSelection}
                className="py-3.5 px-6 rounded-2xl font-semibold bg-white/10 text-slate-200 border border-white/10 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
              >
                Deste Seçimine Dön
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="py-3.5 px-6 rounded-2xl font-semibold bg-amber-500/90 text-slate-900 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-all"
              >
                Sıfırla ve Tekrar Başla
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // —— Kart çalışma ekranı ——
  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <Helmet>
        <title>Diloloji Ezber Makinesi: Aralıklı Tekrar ile Kelime Ezberleme</title>
        <meta name="description" content="Fransızca, İspanyolca ve İngilizce kelime setleri. SRS ile ezber makinesi, Zordu / İyi / Kolay." />
      </Helmet>
      <Navbar />

      <main className="flex-1 flex flex-col px-4 py-6 min-h-[80vh]">
        {/* Üst bar: Geri + Kalan kelime (zarif) */}
        <div className="flex items-center justify-between max-w-lg mx-auto w-full mb-4">
          <button
            type="button"
            onClick={handleBackToSetSelection}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] rounded-lg py-2 pr-2 -ml-2"
            aria-label="Deste seçimine dön"
          >
            <ArrowLeft className="w-5 h-5 shrink-0" strokeWidth={2} />
            <span className="text-sm font-medium tracking-wide">Deste Seçimine Dön</span>
          </button>
          <p className="text-sm font-medium tracking-wide text-slate-400 tabular-nums">
            {sessionQueue.length} kelime kaldı
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
          <AnimatePresence mode="wait">
            {currentCard ? (
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                {/* Kart + glow wrapper: parlamayı kartın tam altında/etrafında */}
                <div className="relative w-full aspect-[4/3] max-h-[320px]" style={{ perspective: '1200px' }}>
                  {/* Glow: kartın derinliğini artırmak için altında/etrafında */}
                  <div
                    className="absolute inset-0 flex items-end justify-center pointer-events-none pb-[5%]"
                    aria-hidden
                  >
                    <div className="w-[85%] h-24 sm:h-28 bg-amber-500/25 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-20 bg-indigo-500/15 rounded-full blur-2xl" />
                  </div>
                  {/* Kart kapsayıcı — tıklanabilir alan; donma önlemi */}
                  <div className="relative w-full h-full">
                    <motion.div
                    className="relative w-full h-full cursor-pointer"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    onClick={() => {
                      if (!isFlipped) setIsFlipped(true);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isFlipped) setIsFlipped(true);
                      }
                    }}
                    aria-label={isFlipped ? 'Kart çevrildi' : 'Cevabı görmek için kartı çevir'}
                  >
                    {/* Ön yüz — tıklanabilir */}
                    <div
                      className="absolute inset-0 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center p-8 shadow-2xl"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)', WebkitBackfaceVisibility: 'hidden' }}
                    >
                      <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider mb-2">
                        {currentCard.language}
                      </span>
                      <p className="text-2xl sm:text-3xl font-bold text-slate-100 text-center">
                        {currentCard.front}
                      </p>
                    </div>
                    {/* Arka yüz — tıklama yok (cevap gösteriliyor) */}
                    <div
                      className="absolute inset-0 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center p-8 shadow-2xl pointer-events-none"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', WebkitBackfaceVisibility: 'hidden' }}
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
        </div>
      </main>
    </div>
  );
}
