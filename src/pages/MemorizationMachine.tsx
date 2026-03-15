/**
 * Ezber Makinesi — Kart flip, hazırlık ekranı, oturum sonu özeti, klavye ve swipe.
 */

import { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import FlashCard from '../components/flashcard/FlashCard';
import FlashCardButtons from '../components/flashcard/FlashCardButtons';
import SessionStart from '../components/flashcard/SessionStart';
import SessionSummary from '../components/flashcard/SessionSummary';
import DeckList from '../components/flashcard/DeckList';
import {
  useFlashcardSession,
  type DeckMeta,
} from '../hooks/useFlashcardSession';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useSwipe } from '../hooks/useSwipe';
import { getDeckProgress } from '../lib/flashcardStorage';

const MOCK_SETS: DeckMeta[] = [
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
      { front: "Je m'appelle...", back: 'Benim adım...' },
      { front: 'Enchanté(e)', back: 'Memnun oldum' },
      { front: "S'il vous plaît", back: 'Lütfen' },
      { front: 'Merci beaucoup', back: 'Çok teşekkürler' },
      { front: 'De rien', back: 'Rica ederim' },
      { front: 'Au revoir', back: 'Hoşça kal' },
      { front: 'À bientôt', back: 'Yakında görüşürüz' },
      { front: 'Excusez-moi', back: 'Affedersiniz' },
      { front: 'Je ne sais pas', back: 'Bilmiyorum' },
      { front: 'Éphémère', back: 'Geçici, kısa ömürlü' },
      { front: 'Peut-être', back: 'Belki' },
      { front: "Aujourd'hui", back: 'Bugün' },
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

const ESTIMATED_SECONDS_PER_CARD = 15;

export default function MemorizationMachine() {
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);

  const {
    phase,
    deck,
    currentCard,
    wordsRemaining,
    isFlipped,
    onlyWrong,
    setOnlyWrong,
    shuffleEnabled,
    setShuffleEnabled,
    sessionResult,
    openSessionStart,
    confirmStartFromSessionStart,
    startSession,
    flip,
    markCorrect,
    markIncorrect,
    markSkip,
    backToDeckSelect,
  } = useFlashcardSession();

  const handleExit = useCallback(() => {
    setExitConfirmOpen(true);
  }, []);

  const confirmExit = useCallback(() => {
    setExitConfirmOpen(false);
    backToDeckSelect();
  }, [backToDeckSelect]);

  useKeyboardShortcuts({
    onFlip: () => !isFlipped && currentCard && flip(),
    onCorrect: markCorrect,
    onIncorrect: markIncorrect,
    onSkip: markSkip,
    onExit: handleExit,
    isFlipped,
    enabled: phase === 'studying' && !!currentCard,
  });

  const swipe = useSwipe({
    onSwipeRight: () => isFlipped && markCorrect(),
    onSwipeLeft: () => isFlipped && markIncorrect(),
    onFlip: () => !isFlipped && flip(),
    canFlip: !isFlipped,
  });

  const previousProgress = deck ? getDeckProgress(deck.id) : null;
  const hasPreviousSession = previousProgress != null && previousProgress.totalSessions > 0;

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <Helmet>
        <title>Ezber Makinesi — Diloloji</title>
        <meta name="description" content="Fransızca, İspanyolca ve İngilizce kelime setleri. Kart flip, klavye kısayolları ve oturum özeti." />
      </Helmet>
      <Navbar />

      {/* Deste seçimi */}
      {phase === 'deckSelect' && (
        <main className="flex-1 px-4 py-10 sm:py-14 max-w-2xl mx-auto w-full">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2 text-center">
            Ezber Makinesi
          </h1>
          <p className="text-slate-400 text-sm text-center mb-10">
            Çalışmak istediğiniz desteyi seçin
          </p>
          <DeckList decks={MOCK_SETS} onSelectDeck={openSessionStart} />
        </main>
      )}

      {/* Hazırlık ekranı */}
      {phase === 'sessionStart' && deck && (
        <main className="flex-1 px-4 py-10 flex flex-col items-center justify-center">
          <div className="mb-6 flex items-center justify-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleEnabled}
                onChange={(e) => setShuffleEnabled(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/50"
              />
              Karıştır
            </label>
          </div>
          <SessionStart
            deckTitle={deck.title}
            deckIcon={deck.icon}
            language={deck.language}
            totalCards={deck.cards.length}
            estimatedSeconds={deck.cards.length * ESTIMATED_SECONDS_PER_CARD}
            previousScore={previousProgress?.bestScore ?? null}
            onlyWrong={onlyWrong}
            onOnlyWrongChange={setOnlyWrong}
            hasPreviousSession={hasPreviousSession}
            onStart={confirmStartFromSessionStart}
          />
          <button
            type="button"
            onClick={backToDeckSelect}
            className="mt-6 flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Deste seçimine dön
          </button>
        </main>
      )}

      {/* Çalışma ekranı */}
      {phase === 'studying' && (
        <main className="flex-1 flex flex-col px-4 py-6 min-h-[80vh]">
          <div className="flex items-center justify-between max-w-lg mx-auto w-full mb-4">
            <button
              type="button"
              onClick={handleExit}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] rounded-lg py-2 pr-2 -ml-2"
              aria-label="Deste seçimine dön"
            >
              <ArrowLeft className="w-5 h-5 shrink-0" strokeWidth={2} />
              <span className="text-sm font-medium tracking-wide">Deste Seçimine Dön</span>
            </button>
            <p className="text-sm font-medium tracking-wide text-slate-400 tabular-nums">
              {wordsRemaining} kelime kaldı
            </p>
          </div>

          <div
            className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full"
            {...swipe.handlers}
          >
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
                  <FlashCard
                    word={currentCard}
                    isFlipped={isFlipped}
                    onFlip={flip}
                    dragOffset={swipe.drag}
                  />
                  <FlashCardButtons
                    isFlipped={isFlipped}
                    onIncorrect={markIncorrect}
                    onSkip={markSkip}
                    onCorrect={markCorrect}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </main>
      )}

      {/* Oturum sonu özeti */}
      {phase === 'summary' && sessionResult && (
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <SessionSummary
            result={sessionResult}
            totalCards={deck?.cards.length ?? 0}
            onRestartWrong={() => deck && sessionResult.incorrectWords.length > 0 && startSession(deck, true)}
            onRestartAll={() => deck && startSession(deck)}
            onBackToDecks={backToDeckSelect}
          />
        </main>
      )}

      {/* Çıkış onayı */}
      {exitConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-title"
        >
          <div className="rounded-2xl bg-[#0f1623] border border-white/10 p-6 max-w-sm w-full shadow-2xl">
            <h2 id="exit-title" className="text-lg font-semibold text-slate-100 mb-2">
              Deste seçimine dön
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              İlerleme kaydedilecek. Emin misiniz?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-medium bg-white/10 text-slate-200 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmExit}
                className="flex-1 py-2.5 rounded-xl font-medium bg-amber-500 text-slate-900 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0f1623]"
              >
                Dön
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
