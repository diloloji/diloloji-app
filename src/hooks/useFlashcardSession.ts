/**
 * Ezber oturumu state: kuyruk, flip, correct/incorrect/skip, süre, hazırlık ve özet ekranları.
 */

import { useState, useCallback, useRef } from 'react';
import type { SessionResult } from '../lib/flashcardStorage';
import { saveDeckProgress, getDeckProgress } from '../lib/flashcardStorage';
import type { FlashcardWord } from '../components/flashcard/FlashCard';

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type Phase = 'deckSelect' | 'sessionStart' | 'studying' | 'summary';

export interface DeckMeta {
  id: string;
  title: string;
  icon: string;
  language: string;
  cards: { front: string; back: string; example?: string }[];
}

export function useFlashcardSession() {
  const [phase, setPhase] = useState<Phase>('deckSelect');
  const [deck, setDeck] = useState<DeckMeta | null>(null);
  const [queue, setQueue] = useState<FlashcardWord[]>([]);
  const [initialQueueLength, setInitialQueueLength] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(true);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const startTimeRef = useRef<number>(0);
  const incorrectListRef = useRef<FlashcardWord[]>([]);
  const correctCountRef = useRef(0);
  const correctIdsRef = useRef<string[]>([]);

  const currentCard = queue[0] ?? null;
  const wordsRemaining = queue.length;

  const buildWords = useCallback((meta: DeckMeta): FlashcardWord[] => {
    return meta.cards.map((c, i) => ({
      id: `${meta.id}-${i}-${c.front}`,
      front: c.front,
      back: c.back,
      example: c.example,
      language: meta.language,
    }));
  }, []);

  const startSession = useCallback(
    (meta: DeckMeta, fromSummaryWrongOnly = false) => {
      let words = buildWords(meta);
      if (fromSummaryWrongOnly && sessionResult && sessionResult.incorrectWords.length > 0) {
        const ids = new Set(sessionResult.incorrectWords.map((w) => w.id));
        words = words.filter((w) => ids.has(w.id));
      }
      if (words.length === 0) return;
      if (shuffleEnabled) words = shuffle(words);
      setDeck(meta);
      setQueue(words);
      setInitialQueueLength(words.length);
      setIsFlipped(false);
      setSessionResult(null);
      incorrectListRef.current = [];
      correctCountRef.current = 0;
      correctIdsRef.current = [];
      startTimeRef.current = Date.now();
      setPhase('studying');
    },
    [buildWords, shuffleEnabled, sessionResult]
  );

  const openSessionStart = useCallback((meta: DeckMeta) => {
    setDeck(meta);
    setPhase('sessionStart');
  }, []);

  const confirmStartFromSessionStart = useCallback(() => {
    if (!deck) return;
    let words = buildWords(deck);
    if (onlyWrong && deck) {
      const progress = getDeckProgress(deck.id);
      const masteredSet = new Set(progress?.masteredWords ?? []);
      words = words.filter((w) => !masteredSet.has(w.id));
    }
    if (words.length === 0) {
      setPhase('deckSelect');
      setDeck(null);
      return;
    }
    if (shuffleEnabled) words = shuffle(words);
    setQueue(words);
    setInitialQueueLength(words.length);
    setIsFlipped(false);
    setSessionResult(null);
    incorrectListRef.current = [];
    correctCountRef.current = 0;
    correctIdsRef.current = [];
    startTimeRef.current = Date.now();
    setPhase('studying');
  }, [deck, onlyWrong, shuffleEnabled, buildWords]);

  const flip = useCallback(() => {
    if (!currentCard) return;
    setIsFlipped(true);
  }, [currentCard]);

  const markCorrect = useCallback(() => {
    if (!currentCard || !deck) return;
    correctCountRef.current += 1;
    correctIdsRef.current = [...correctIdsRef.current, currentCard.id];
    setQueue((prev) => prev.slice(1));
    setIsFlipped(false);
    if (queue.length <= 1) finishSession();
  }, [currentCard, deck, queue.length]);

  const markIncorrect = useCallback(() => {
    if (!currentCard || !deck) return;
    incorrectListRef.current = [...incorrectListRef.current, currentCard];
    setQueue((prev) => prev.slice(1));
    setIsFlipped(false);
    if (queue.length <= 1) finishSession();
  }, [currentCard, deck, queue.length]);

  const markSkip = useCallback(() => {
    if (!currentCard || !deck) return;
    setQueue((prev) => [...prev.slice(1), currentCard]);
    setIsFlipped(false);
  }, [currentCard, deck]);

  function finishSession() {
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const incorrect = incorrectListRef.current;
    const correct = correctCountRef.current;
    const total = initialQueueLength;
    const skipped = Math.max(0, total - correct - incorrect.length);
    const result: SessionResult = {
      correct,
      incorrect: incorrect.length,
      skipped,
      durationSeconds,
      incorrectWords: incorrect.map((w) => ({
        id: w.id,
        front: w.front,
        back: w.back,
        example: w.example,
        language: w.language,
      })),
    };
    setSessionResult(result);
    if (deck) saveDeckProgress(deck.id, result, correctIdsRef.current);
    setPhase('summary');
  }

  const backToDeckSelect = useCallback(() => {
    setPhase('deckSelect');
    setDeck(null);
    setQueue([]);
    setSessionResult(null);
  }, []);

  const backToSessionStart = useCallback(() => {
    setPhase('sessionStart');
  }, []);

  return {
    phase,
    deck,
    queue,
    initialQueueLength,
    currentCard,
    wordsRemaining,
    isFlipped,
    setIsFlipped: useCallback((v: boolean) => setIsFlipped(v), []),
    onlyWrong,
    setOnlyWrong,
    shuffleEnabled,
    setShuffleEnabled,
    sessionResult,
    startSession,
    openSessionStart,
    confirmStartFromSessionStart,
    flip,
    markCorrect,
    markIncorrect,
    markSkip,
    backToDeckSelect,
    backToSessionStart,
    buildWords,
  };
}
