import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  getFlashcardDecks,
  getFlashcardDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
  replaceDeckCards,
  defaultCard,
  parseBulkImport,
  getDueCards,
  updateCardSRS,
  getTodayString,
  type FlashcardDeck,
  type Flashcard,
} from '../utils/flashcardDecks';
import { getCurrentStreak } from '../utils/activityHistory';
import { useXp } from '../contexts/XpContext';

type View = 'list' | 'detail' | 'create' | 'edit' | 'flashcard' | 'quiz';
type QuizMode = 'classic' | 'multiple-choice' | 'fill-blank';

type SRSRating = 'again' | 'hard' | 'good' | 'easy';

const MIN_EASE = 1.3;

/** SRS (SM-2 benzeri): tıklanan butona göre yeni state ve “sonraki tekrar” etiketi */
function computeSRSUpdate(
  card: Flashcard,
  rating: SRSRating
): { repetition: number; interval: number; easeFactor: number; nextReviewDate: string; nextLabel: string } {
  const today = getTodayString();
  const rep = card.repetition ?? 0;
  const iv = Math.max(0, card.interval ?? 0);
  const ef = Math.max(MIN_EASE, card.easeFactor ?? 2.5);

  switch (rating) {
    case 'again':
      return {
        repetition: 0,
        interval: 0,
        easeFactor: ef,
        nextReviewDate: today,
        nextLabel: '<1 dk',
      };
    case 'hard': {
      const newEf = Math.max(MIN_EASE, ef - 0.15);
      const newIv = Math.max(0.1, iv * 1.2);
      const nextDate = addDaysForSRS(today, newIv);
      return {
        repetition: rep,
        interval: Math.round(newIv * 10) / 10,
        easeFactor: newEf,
        nextReviewDate: nextDate,
        nextLabel: formatIntervalLabel(newIv),
      };
    }
    case 'good': {
      const newRep = rep + 1;
      const newIv = newRep === 1 ? 1 : iv * ef;
      const nextDate = addDaysForSRS(today, newIv);
      return {
        repetition: newRep,
        interval: Math.round(newIv * 10) / 10,
        easeFactor: ef,
        nextReviewDate: nextDate,
        nextLabel: formatIntervalLabel(newIv),
      };
    }
    case 'easy': {
      const newEf = Math.min(2.5, ef + 0.15);
      const newIv = (rep === 0 ? 1 : iv) * newEf * 1.3;
      const nextDate = addDaysForSRS(today, newIv);
      return {
        repetition: rep + 1,
        interval: Math.round(newIv * 10) / 10,
        easeFactor: newEf,
        nextReviewDate: nextDate,
        nextLabel: formatIntervalLabel(newIv),
      };
    }
    default:
      return {
        repetition: rep,
        interval: iv,
        easeFactor: ef,
        nextReviewDate: today,
        nextLabel: '',
      };
  }
}

function addDaysForSRS(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.round(days * 10) / 10));
  return d.toISOString().slice(0, 10);
}

function formatIntervalLabel(days: number): string {
  if (days < 1 / 24) return '<1 dk';
  if (days < 1) return `${Math.round(days * 24)} sa`;
  if (days < 2) return '1 gün';
  return `${Math.round(days)} gün`;
}

/** Klavye kısayolları: Space (çevir), Sol/Sağ ok (önceki/sonraki) */
function FlashcardKeyboard({
  onFlip,
  onNext,
  onPrev,
  canPrev,
  canNext,
}: {
  onFlip: () => void;
  onNext: () => void;
  onPrev: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        onFlip();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (canNext) onNext();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (canPrev) onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFlip, onNext, onPrev, canPrev, canNext]);
  return null;
}

/** Quiz sonuç modalı: başarı yüzdesi, doğru/yanlış, konfeti, Tekrar Oyna / Ana Sayfaya Dön */
function QuizResultModal({
  correct: rawCorrect,
  total: rawTotal,
  onRestart,
}: {
  correct: number;
  total: number;
  onRestart: () => void;
}) {
  // İstatistikleri güvenli sınırlara çek: toplam ve doğru asla negatif olmasın, doğru toplamı geçmesin
  const total = Math.max(0, rawTotal);
  const correct = Math.max(0, Math.min(total, rawCorrect));
  const wrong = total - correct;
  // Başarı % = (doğru / (doğru + yanlış)) * 100, 0–100 arası, tam sayı
  const percent =
    total > 0
      ? Math.min(100, Math.max(0, Math.round((correct / (correct + wrong)) * 100)))
      : 0;

  const icon = percent >= 80 ? '🏆' : percent >= 50 ? '🏅' : '😊';
  const message =
    percent >= 80 ? 'Harika İş Çıkardın!' : percent >= 50 ? 'İyi Gidiyorsun!' : 'Biraz Daha Pratik!';

  useEffect(() => {
    const duration = 2800;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-result-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-slate-800/90 dark:bg-slate-900/95 border border-indigo-500/30 dark:border-indigo-400/20 shadow-2xl shadow-indigo-500/10 overflow-hidden backdrop-blur-xl ring-1 ring-white/5">
        <div className="p-6 sm:p-8 text-center">
          <p className="text-5xl mb-2" aria-hidden="true">
            {icon}
          </p>
          <h2 id="quiz-result-title" className="text-xl font-bold text-slate-100 mb-1">
            Quiz bitti!
          </h2>
          <p className="text-slate-400 text-sm mb-2">Sonuçların</p>
          <p className="text-lg font-semibold text-slate-200 mb-4">{message}</p>
          <p className="text-3xl font-bold text-indigo-400 tabular-nums mb-6">
            {percent}% başarı
          </p>
          <div className="flex items-center justify-center gap-0 mb-8">
            <div className="flex-1 flex flex-col items-center pr-6">
              <p className="text-4xl font-bold text-emerald-400 tabular-nums">{correct}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Doğru</p>
            </div>
            <div className="w-px h-12 bg-slate-600 dark:bg-slate-500 shrink-0" aria-hidden="true" />
            <div className="flex-1 flex flex-col items-center pl-6">
              <p className="text-4xl font-bold text-orange-400 dark:text-orange-400 tabular-nums">
                {wrong}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Yanlış</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onRestart}
              className="w-full rounded-xl bg-indigo-500 text-white py-3 font-semibold hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              Tekrar Oyna
            </button>
            <Link
              to="/"
              className="w-full rounded-xl border border-slate-600 dark:border-slate-500 text-slate-200 py-3 font-semibold hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors text-center"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Kutlama ekranı: konfeti + sonuç + Setlere Dön / Tekrar Çalış */
function FlashcardCelebration({
  cardCount,
  onBackToDeck,
  onRestart,
}: {
  cardCount: number;
  onBackToDeck: () => void;
  onRestart: () => void;
}) {
  useEffect(() => {
    const duration = 2500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-20 flex flex-col items-center justify-center min-h-[60vh]">
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 text-center mb-2">
        🎉 Harika İş Çıkardın!
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-lg mb-8">
        <span className="font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">{cardCount}</span>{' '}
        kart çalıştın.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={onBackToDeck}
          className="rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-5 py-3 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          Setlere Dön
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl bg-indigo-600 text-white px-5 py-3 font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Tekrar Çalış
        </button>
      </div>
    </main>
  );
}

export default function EzberMakinesi() {
  const { addXP, level, title, xpProgress } = useXp();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [view, setView] = useState<View>('list');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formFront, setFormFront] = useState('');
  const [formBack, setFormBack] = useState('');
  const [formExample, setFormExample] = useState('');
  const [formBulk, setFormBulk] = useState('');
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  /** Tek tek eklemede biriktirilen kartlar */
  const [pendingCards, setPendingCards] = useState<{ front: string; back: string; example?: string; audioDataUrl?: string }[]>([]);
  /** Hedef Dil için ses kaydı: kayıt öncesi/sonrası */
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDataUrl, setRecordingDataUrl] = useState<string | null>(null);
  const [isPlayingFormAudio, setIsPlayingFormAudio] = useState(false);
  const [playingPendingCardIndex, setPlayingPendingCardIndex] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const formAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingListAudioRef = useRef<HTMLAudioElement | null>(null);
  /** Quiz bittiğinde gösterilecek sonuç modalı */
  const [quizResult, setQuizResult] = useState<{ correct: number; total: number } | null>(null);
  /** Quiz modu: null = seçim ekranı, classic / multiple-choice / fill-blank */
  const [quizMode, setQuizMode] = useState<QuizMode | null>(null);

  // Flashcard mode
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardFinished, setFlashcardFinished] = useState(false);
  // Quiz mode
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [_quizTotal, setQuizTotal] = useState(0);
  /** Çoktan seçmeli: tıklanan şık (gösterim için); sonraki soruya geçince sıfırlanır */
  const [quizSelectedOption, setQuizSelectedOption] = useState<string | null>(null);
  const quizNextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set detay: Hızlı Ekle alanı */
  const [quickAddFront, setQuickAddFront] = useState('');
  const [quickAddBack, setQuickAddBack] = useState('');
  /** Setler sayfası: dil filtresi (Hepsi, FR, ES, EN) */
  const [languageFilter, setLanguageFilter] = useState<'all' | 'FR' | 'ES' | 'EN'>('all');
  /** Set detay: listede hangi kartın sesi çalınıyor */
  const [playingDetailCardId, setPlayingDetailCardId] = useState<string | null>(null);
  const detailListAudioRef = useRef<HTMLAudioElement | null>(null);

  const loadDecks = useCallback(() => setDecks(getFlashcardDecks()), []);
  useEffect(() => { loadDecks(); }, [loadDecks]);

  useEffect(() => () => {
    if (quizNextTimeoutRef.current) clearTimeout(quizNextTimeoutRef.current);
  }, []);

  const selectedDeck = selectedDeckId ? getFlashcardDeckById(selectedDeckId) : null;
  const cards = selectedDeck?.cards ?? [];
  /** Flashcard modunda sadece bugün tekrarlanacak kartlar (SRS due) */
  const cardsForFlashcard = useMemo(
    () => getDueCards(selectedDeck?.cards ?? []),
    [selectedDeck?.cards]
  );
  /** Fill-blank modunda sadece örnek cümlesi olan kartlar; diğer modlarda tüm kartlar */
  const cardsForQuiz = useMemo(
    () => (quizMode === 'fill-blank' ? cards.filter((c) => c.example?.trim()) : cards),
    [cards, quizMode]
  );
  const quizCard = cardsForQuiz[quizIndex];
  const hasAnyExample = cards.some((c) => c.example?.trim());

  /** Çoktan seçmeli: mevcut soru için 4 şık (sabit kalır) */
  const multipleChoiceOptions = useMemo(() => {
    if (quizMode !== 'multiple-choice' || !quizCard) return [];
    const others = cards.filter((c) => c.id !== quizCard.id).map((c) => c.back);
    const wrongs = [...others]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .filter((b) => b !== quizCard.back);
    const all = [quizCard.back, ...wrongs].filter((v, i, a) => a.indexOf(v) === i);
    let pool = [...others];
    while (all.length < 4 && pool.length > 0) {
      const w = pool[Math.floor(Math.random() * pool.length)];
      if (!all.includes(w)) all.push(w);
      pool = pool.filter((x) => x !== w);
    }
    return [...all].sort(() => Math.random() - 0.5);
  }, [quizMode, quizCard?.id, quizIndex, cards]);

  const goToList = useCallback(() => {
    setView('list');
    setSelectedDeckId(null);
    setFormTitle('');
    setFormFront('');
    setFormBack('');
    setFormBulk('');
    loadDecks();
  }, [loadDecks]);

  const handleCreateDeck = useCallback(() => {
    setView('create');
    setFormTitle('');
    setFormFront('');
    setFormBack('');
    setFormExample('');
    setFormBulk('');
    setPendingCards([]);
    setRecordingDataUrl(null);
    setIsRecording(false);
    setIsPlayingFormAudio(false);
    setPlayingPendingCardIndex(null);
    if (formAudioRef.current) {
      formAudioRef.current.pause();
      formAudioRef.current = null;
    }
    if (pendingListAudioRef.current) {
      pendingListAudioRef.current.pause();
      pendingListAudioRef.current = null;
    }
    setAddMode('single');
  }, []);

  const handleSaveNewDeck = useCallback(() => {
    let newCards: { front: string; back: string }[] = [];
    if (addMode === 'bulk') {
      newCards = parseBulkImport(formBulk);
    } else {
      newCards = pendingCards;
    }
    if (newCards.length === 0 && !formTitle.trim()) return;
    createDeck(formTitle.trim() || 'İsimsiz Set', newCards);
    goToList();
  }, [addMode, formTitle, formBulk, pendingCards, goToList]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) {
          setRecordingDataUrl(null);
          return;
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => setRecordingDataUrl(reader.result as string);
        reader.readAsDataURL(blob);
      };
      recorder.start(150);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDataUrl(null);
    } catch {
      setRecordingDataUrl(null);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
      } catch {
        // ignore
      }
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const clearRecording = useCallback(() => {
    if (formAudioRef.current) {
      formAudioRef.current.pause();
      formAudioRef.current = null;
    }
    setIsPlayingFormAudio(false);
    setRecordingDataUrl(null);
  }, []);

  const playFormRecording = useCallback(() => {
    if (!recordingDataUrl) return;
    if (formAudioRef.current) {
      if (isPlayingFormAudio) {
        formAudioRef.current.pause();
        setIsPlayingFormAudio(false);
      } else {
        formAudioRef.current.play().catch(() => setIsPlayingFormAudio(false));
      }
      return;
    }
    const audio = new Audio(recordingDataUrl);
    formAudioRef.current = audio;
    audio.onended = () => {
      setIsPlayingFormAudio(false);
      formAudioRef.current = null;
    };
    audio.onerror = () => {
      setIsPlayingFormAudio(false);
      formAudioRef.current = null;
    };
    setIsPlayingFormAudio(true);
    audio.play().catch(() => setIsPlayingFormAudio(false));
  }, [recordingDataUrl, isPlayingFormAudio]);

  const handleAddSingleCard = useCallback(() => {
    const front = formFront.trim();
    const back = formBack.trim();
    if (!front && !back) return;
    const audioToAttach = recordingDataUrl ?? undefined;
    setPendingCards((prev) => [
      ...prev,
      {
        front: front || '-',
        back: back || '-',
        example: formExample.trim() || undefined,
        audioDataUrl: audioToAttach,
      },
    ]);
    setFormFront('');
    setFormBack('');
    setFormExample('');
    if (formAudioRef.current) {
      formAudioRef.current.pause();
      formAudioRef.current = null;
    }
    setIsPlayingFormAudio(false);
    setIsRecording(false);
    setRecordingDataUrl(null);
  }, [formFront, formBack, formExample, recordingDataUrl]);

  const handleRemovePendingCard = useCallback((index: number) => {
    setPendingCards((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const openDeck = useCallback((id: string) => {
    setSelectedDeckId(id);
    setView('detail');
  }, []);

  /** Set kartından doğrudan Flashcard moduna başlat (Hızlı Başlat). */
  const openDeckAndStartFlashcard = useCallback((id: string) => {
    setSelectedDeckId(id);
    setCardIndex(0);
    setIsFlipped(false);
    setFlashcardFinished(false);
    setView('flashcard');
  }, []);

  const handleEditDeck = useCallback(() => {
    setView('edit');
    setFormTitle(selectedDeck?.title ?? '');
    setFormBulk(
      selectedDeck?.cards.map((c) => `${c.front} - ${c.back}`).join('\n') ?? ''
    );
  }, [selectedDeck]);

  const handleSaveEdit = useCallback(() => {
    if (!selectedDeckId) return;
    const parsed = parseBulkImport(formBulk);
    updateDeck(selectedDeckId, { title: formTitle.trim(), cards: parsed });
    loadDecks();
    setView('detail');
    setSelectedDeckId(selectedDeckId);
  }, [selectedDeckId, formTitle, formBulk, loadDecks]);

  const handleDeleteDeck = useCallback(() => {
    if (!selectedDeckId) return;
    if (window.confirm('Bu seti silmek istediğinize emin misiniz?')) {
      deleteDeck(selectedDeckId);
      goToList();
    }
  }, [selectedDeckId, goToList]);

  const handleQuickAddCard = useCallback(() => {
    if (!selectedDeckId || !selectedDeck) return;
    const front = quickAddFront.trim();
    const back = quickAddBack.trim();
    if (!front || !back) return;
    replaceDeckCards(selectedDeckId, [
      ...selectedDeck.cards,
      defaultCard(front, back, undefined, recordingDataUrl ?? undefined),
    ]);
    loadDecks();
    setQuickAddFront('');
    setQuickAddBack('');
    setRecordingDataUrl(null);
    setIsRecording(false);
    setIsPlayingFormAudio(false);
    if (formAudioRef.current) {
      formAudioRef.current.pause();
      formAudioRef.current = null;
    }
  }, [selectedDeckId, selectedDeck, quickAddFront, quickAddBack, recordingDataUrl, loadDecks]);

  const handleRemoveCardFromDeck = useCallback(
    (cardId: string) => {
      if (!selectedDeckId || !selectedDeck) return;
      if (!window.confirm('Bu kelimeyi setten kaldırmak istediğinize emin misiniz?')) return;
      replaceDeckCards(
        selectedDeckId,
        selectedDeck.cards.filter((c) => c.id !== cardId)
      );
      loadDecks();
      if (playingDetailCardId === cardId) {
        detailListAudioRef.current?.pause();
        detailListAudioRef.current = null;
        setPlayingDetailCardId(null);
      }
    },
    [selectedDeckId, selectedDeck, loadDecks, playingDetailCardId]
  );

  const playDetailCardAudio = useCallback(
    (card: Flashcard) => {
      if (!card.audioDataUrl) return;
      if (detailListAudioRef.current) {
        if (playingDetailCardId === card.id) {
          detailListAudioRef.current.pause();
          detailListAudioRef.current = null;
          setPlayingDetailCardId(null);
          return;
        }
        detailListAudioRef.current.pause();
        detailListAudioRef.current = null;
      }
      const audio = new Audio(card.audioDataUrl);
      detailListAudioRef.current = audio;
      audio.onended = () => {
        setPlayingDetailCardId(null);
        detailListAudioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingDetailCardId(null);
        detailListAudioRef.current = null;
      };
      setPlayingDetailCardId(card.id);
      audio.play().catch(() => setPlayingDetailCardId(null));
    },
    [playingDetailCardId]
  );

  const startFlashcard = useCallback(() => {
    setCardIndex(0);
    setIsFlipped(false);
    setFlashcardFinished(false);
    setView('flashcard');
  }, []);

  const startQuiz = useCallback(() => {
    setQuizMode(null);
    setQuizIndex(0);
    setQuizAnswer('');
    setQuizRevealed(false);
    setQuizCorrect(0);
    setQuizResult(null);
    setView('quiz');
  }, []);

  const selectQuizMode = useCallback((mode: QuizMode) => {
    if (mode === 'fill-blank' && !cards.some((c) => c.example?.trim())) return;
    setQuizMode(mode);
    setQuizIndex(0);
    setQuizAnswer('');
    setQuizRevealed(false);
    setQuizCorrect(0);
    setQuizTotal(mode === 'fill-blank' ? cards.filter((c) => c.example?.trim()).length : cards.length);
  }, [cards]);

  // —— List view (Dashboard) ——
  if (view === 'list') {
    const totalWords = decks.reduce((s, d) => s + d.cards.length, 0);
    const streakDisplay = getCurrentStreak() || 5; // mock 5 gün when 0
    const filteredDecks = languageFilter === 'all'
      ? decks
      : decks.filter((d) => (d.language ?? 'FR') === languageFilter);

    const FILTER_OPTIONS: { value: 'all' | 'FR' | 'ES' | 'EN'; label: string }[] = [
      { value: 'all', label: 'Hepsi' },
      { value: 'FR', label: 'Fransızca' },
      { value: 'ES', label: 'İspanyolca' },
      { value: 'EN', label: 'İngilizce' },
    ];

    const langFlag: Record<string, string> = { FR: '🇫🇷', ES: '🇪🇸', EN: '🇬🇧' };

    return (
      <main className="max-w-5xl mx-auto px-4 py-6 pb-20">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Ezber Makinesi
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Kelime setleri oluştur, flashcard veya quiz ile çalış.
        </p>

        {/* Üst panel: 4 istatistik kartı (Toplam Set, Toplam Kelime, Günlük Seri, Senin Seviyen) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl bg-slate-800/40 dark:bg-slate-800/60 border border-slate-700/50 dark:border-slate-600/50 px-4 py-4">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Toplam Set</p>
            <p className="text-2xl font-bold text-white dark:text-slate-100">{decks.length}</p>
            <span className="text-slate-500 dark:text-slate-400 text-lg mt-1 inline-block" aria-hidden>📚</span>
          </div>
          <div className="rounded-2xl bg-slate-800/40 dark:bg-slate-800/60 border border-slate-700/50 dark:border-slate-600/50 px-4 py-4">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Toplam Kelime</p>
            <p className="text-2xl font-bold text-white dark:text-slate-100">{totalWords}</p>
            <span className="text-slate-500 dark:text-slate-400 text-lg mt-1 inline-block" aria-hidden>📝</span>
          </div>
          <div className="rounded-2xl bg-slate-800/40 dark:bg-slate-800/60 border border-slate-700/50 dark:border-slate-600/50 px-4 py-4">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Günlük Seri</p>
            <p className="text-2xl font-bold text-white dark:text-slate-100">{streakDisplay} gün</p>
            <span className="text-lg mt-1 inline-block" aria-hidden>🔥</span>
          </div>
          <div className="rounded-2xl bg-slate-800/40 dark:bg-slate-800/60 border border-amber-500/30 dark:border-amber-400/30 px-4 py-4 relative overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.15)] dark:shadow-[0_0_24px_rgba(251,191,36,0.2)]">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Senin Seviyen</p>
            <p className="text-lg font-bold text-amber-400 dark:text-amber-300">{title}</p>
            <p className="text-slate-200 dark:text-slate-100 text-sm font-semibold mt-0.5">Lvl {level}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-700/80 dark:bg-slate-600/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 dark:from-amber-400 dark:to-yellow-300 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{ width: `${xpProgress.percent}%` }}
                role="progressbar"
                aria-valuenow={xpProgress.xpInCurrentLevel}
                aria-valuemin={0}
                aria-valuemax={Math.max(1, xpProgress.xpNeededForNext)}
                aria-label={`Seviye ilerlemesi: %${Math.round(xpProgress.percent)}`}
              />
            </div>
            <span className="text-amber-500/80 dark:text-amber-400/80 text-lg mt-1 inline-block" aria-hidden>⭐</span>
          </div>
        </div>

        {/* Dil filtre chip'leri */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLanguageFilter(opt.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                languageFilter === opt.value
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-slate-800 dark:bg-slate-700/80 text-slate-300 dark:text-slate-400 hover:bg-slate-700 dark:hover:bg-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Grid: Yeni Set (ilk) + set kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Yeni Set Oluştur — kesik çerçeve, transparan, her zaman ilk */}
          <button
            type="button"
            onClick={handleCreateDeck}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-500 dark:border-slate-600 bg-transparent min-h-[180px] hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <span className="text-4xl text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 mb-2 transition-colors" aria-hidden>+</span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Yeni Set Oluştur</span>
          </button>

          {filteredDecks.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-2 flex items-center justify-center rounded-2xl bg-slate-800/30 dark:bg-slate-800/40 border border-slate-700/50 dark:border-slate-600/50 py-12 px-6">
              <p className="text-slate-400 dark:text-slate-500 text-sm">Bu dilde henüz setin yok.</p>
            </div>
          ) : (
            filteredDecks.map((deck, index) => {
              const learned = deck.cards.filter((c) => (c.repetition ?? 0) > 0 || (c.interval ?? 0) > 0).length;
              const total = deck.cards.length;
              const progressPercent = total ? Math.round((learned / total) * 100) : 0;
              const langCode = deck.language ?? ['FR', 'ES', 'EN'][index % 3];
              const flag = langFlag[langCode] ?? langCode;
              return (
                <div
                  key={deck.id}
                  className="group relative rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm overflow-hidden shadow-sm hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10 dark:hover:shadow-indigo-400/10 hover:border-indigo-300/80 dark:hover:border-indigo-500/50 transition-all duration-300"
                >
                  <button
                    type="button"
                    onClick={() => openDeck(deck.id)}
                    className="w-full text-left p-5 pb-4"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-700/50 dark:bg-slate-600/50 text-base mb-3" aria-hidden title={langCode}>
                      {flag}
                    </span>
                    <h2 className="font-bold text-slate-800 dark:text-slate-100 truncate pr-10">
                      {deck.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {deck.cards.length} kelime
                    </p>
                  </button>
                  <div className="w-full h-1 bg-slate-200 dark:bg-slate-700/80">
                    <div
                      className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openDeckAndStartFlashcard(deck.id); }}
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      title="Hızlı Başlat (Flashcard)"
                      aria-label="Hızlı Başlat"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    );
  }

  // —— Create deck (form: title + single add or bulk import) ——
  if (view === 'create') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <button
          type="button"
          onClick={goToList}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
        >
          ← Setlere dön
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
          Yeni Set Oluştur
        </h1>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
          Set adı
        </label>
        <input
          type="text"
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          placeholder="Örn: Seyahat Kelimeleri"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-6"
        />
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setAddMode('single')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              addMode === 'single'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Tek tek ekle
          </button>
          <button
            type="button"
            onClick={() => setAddMode('bulk')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              addMode === 'bulk'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Toplu içe aktar
          </button>
        </div>
        {addMode === 'single' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Hedef Dil (Örn: Fransızca)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formFront}
                    onChange={(e) => setFormFront(e.target.value)}
                    placeholder="Örn: bonjour"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-4 pr-12 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {!recordingDataUrl ? (
                      isRecording ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                          title="Kaydı durdur"
                          aria-label="Kaydı durdur"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          title="Telaffuz kaydet"
                          aria-label="Telaffuz kaydet"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 2.57 2.58 4.55 5.21 4.95V20c0 .55.45 1 1 1s1-.45 1-1v-2.06c2.63-.4 4.72-2.38 5.21-4.94.09-.6-.39-1.14-1-1.14z" /></svg>
                        </button>
                      )
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={playFormRecording}
                          className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          title={isPlayingFormAudio ? 'Duraklat' : 'Dinle'}
                          aria-label={isPlayingFormAudio ? 'Kaydı duraklat' : 'Kaydı dinle'}
                        >
                          {isPlayingFormAudio ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={clearRecording}
                          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                          title="Kaydı sil"
                          aria-label="Kaydı sil"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Ana Dil (Örn: Türkçe)
                </label>
                <input
                  type="text"
                  value={formBack}
                  onChange={(e) => setFormBack(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSingleCard())}
                  placeholder="Örn: merhaba"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
            <div className="col-span-1 md:col-span-2 mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Örnek Cümle (Opsiyonel)
              </label>
              <textarea
                value={formExample}
                onChange={(e) => setFormExample(e.target.value)}
                placeholder="Kelimeyi bağlam içinde görmek için örnek cümle yazın..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddSingleCard}
              className="rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 px-4 py-2.5 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-6"
            >
              Kartı listeye ekle
            </button>
            {pendingCards.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                  Eklenen kartlar ({pendingCards.length})
                </p>
                <ul className="space-y-2">
                  {pendingCards.map((card, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 px-4 py-3 shadow-sm"
                    >
                      <span className="flex-1 min-w-0 truncate text-slate-800 dark:text-slate-100 font-medium">
                        {card.front}
                      </span>
                      <span className="flex-shrink-0 text-slate-400 dark:text-slate-500">→</span>
                      <span className="flex-1 min-w-0 truncate text-slate-600 dark:text-slate-300 text-right">
                        {card.back}
                      </span>
                      {card.audioDataUrl != null && card.audioDataUrl !== '' && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = card.audioDataUrl!;
                            if (playingPendingCardIndex === index && pendingListAudioRef.current) {
                              pendingListAudioRef.current.pause();
                              pendingListAudioRef.current = null;
                              setPlayingPendingCardIndex(null);
                              return;
                            }
                            if (pendingListAudioRef.current) {
                              pendingListAudioRef.current.pause();
                              pendingListAudioRef.current = null;
                            }
                            const audio = new Audio(url);
                            pendingListAudioRef.current = audio;
                            audio.onended = () => {
                              pendingListAudioRef.current = null;
                              setPlayingPendingCardIndex(null);
                            };
                            audio.onerror = () => {
                              pendingListAudioRef.current = null;
                              setPlayingPendingCardIndex(null);
                            };
                            setPlayingPendingCardIndex(index);
                            audio.play().catch(() => setPlayingPendingCardIndex(null));
                          }}
                          className="flex-shrink-0 p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          title={playingPendingCardIndex === index ? 'Duraklat' : 'Telaffuzu dinle'}
                          aria-label={playingPendingCardIndex === index ? 'Duraklat' : 'Telaffuzu dinle'}
                        >
                          {playingPendingCardIndex === index ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemovePendingCard(index)}
                        className="flex-shrink-0 p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        title="Kartı sil"
                        aria-label="Kartı sil"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={handleSaveNewDeck}
                  className="mt-4 w-full rounded-xl bg-indigo-600 text-white py-3 font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Seti oluştur
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Kelime - anlam (virgül, tire veya tab ile ayırın; her satıra bir çift)
            </label>
            <textarea
              value={formBulk}
              onChange={(e) => setFormBulk(e.target.value)}
              placeholder={"bonjour - merhaba\nau revoir - hoşça kal\nmerci - teşekkürler"}
              rows={10}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm mb-4"
            />
            <button
              type="button"
              onClick={handleSaveNewDeck}
              className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Seti oluştur
            </button>
          </>
        )}
      </main>
    );
  }

  // —— Deck detail: header + CTA kartları + Setteki Kelimeler ——
  if (view === 'detail' && selectedDeck) {
    const hasCards = selectedDeck.cards.length > 0;
    const learned = selectedDeck.cards.filter((c) => (c.repetition ?? 0) > 0 || (c.interval ?? 0) > 0).length;
    const total = selectedDeck.cards.length;
    const progressPercent = total ? Math.round((learned / total) * 100) : 0;

    return (
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <button
          type="button"
          onClick={goToList}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
        >
          ← Setlere dön
        </button>

        {/* Header: başlık, kelime sayısı, ilerleme, ayar butonu sağ üst */}
        <header className="relative rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-6 mb-6 shadow-sm">
          <button
            type="button"
            onClick={handleEditDeck}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 dark:hover:bg-indigo-400/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
            title="Seti düzenle"
            aria-label="Seti düzenle"
          >
            <span className="text-xl leading-none" aria-hidden>⚙️</span>
          </button>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1 pr-10">
            {selectedDeck.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
            {selectedDeck.cards.length} kelime
          </p>
          <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-700/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            %{progressPercent} tamamlandı
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {learned} / {total} kelime ezberlendi
          </p>
        </header>

        {/* Eylem kartları: Flashcard (mavi) + Quiz (mor) — yan yana */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={startFlashcard}
            disabled={!hasCards}
            className="rounded-2xl border border-blue-400/30 dark:border-blue-500/30 bg-blue-900/10 dark:bg-blue-900/20 backdrop-blur-sm p-6 text-left hover:bg-blue-900/20 dark:hover:bg-blue-900/30 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/25 hover:border-blue-400/50 dark:hover:border-blue-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <span className="text-5xl mb-3 block" aria-hidden>🃏</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 block">Flashcard Modu</span>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Klasik çalışma — kartı çevir, cevabı gör.
            </p>
          </button>
          <button
            type="button"
            onClick={startQuiz}
            disabled={!hasCards}
            className="rounded-2xl border border-violet-400/30 dark:border-violet-500/30 bg-purple-900/10 dark:bg-purple-900/20 backdrop-blur-sm p-6 text-left hover:bg-purple-900/20 dark:hover:bg-purple-900/30 hover:shadow-lg hover:shadow-violet-500/20 dark:hover:shadow-violet-400/25 hover:border-violet-400/50 dark:hover:border-violet-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            <span className="text-5xl mb-3 block" aria-hidden>🧠</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 block">Ezber Modu (Quiz)</span>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Aktif hatırlama — soruyu gör, cevabı yaz.
            </p>
          </button>
        </div>

        {/* Setteki Kelimeler: Hızlı Ekle + liste */}
        <section className="rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm overflow-hidden shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 px-5 py-4 border-b border-slate-200 dark:border-slate-600">
            Setteki Kelimeler
          </h2>
          <div className="p-4 border-b border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Hızlı Ekle</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={quickAddFront}
                onChange={(e) => setQuickAddFront(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleQuickAddCard())}
                placeholder="Kelime"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={quickAddBack}
                  onChange={(e) => setQuickAddBack(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleQuickAddCard())}
                  placeholder="Anlam"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-4 pr-12 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  {!recordingDataUrl ? (
                    isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="p-1.5 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        title="Kaydı durdur"
                        aria-label="Kaydı durdur"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        title="Telaffuz kaydet (Anlam)"
                        aria-label="Telaffuz kaydet"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 2.57 2.58 4.55 5.21 4.95V20c0 .55.45 1 1 1s1-.45 1-1v-2.06c2.63-.4 4.72-2.38 5.21-4.94.09-.6-.39-1.14-1-1.14z" /></svg>
                      </button>
                    )
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={playFormRecording}
                        className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        title={isPlayingFormAudio ? 'Duraklat' : 'Dinle'}
                        aria-label={isPlayingFormAudio ? 'Kaydı duraklat' : 'Kaydı dinle'}
                      >
                        {isPlayingFormAudio ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={clearRecording}
                        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        title="Kaydı sil"
                        aria-label="Kaydı sil"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleQuickAddCard}
                disabled={!quickAddFront.trim() || !quickAddBack.trim()}
                className="rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-1"
              >
                <span className="text-lg leading-none">+</span>
                Ekle
              </button>
            </div>
          </div>
          <ul className="p-4 space-y-2 max-h-[280px] overflow-y-auto">
            {selectedDeck.cards.length === 0 ? (
              <li className="rounded-lg bg-slate-100/80 dark:bg-slate-700/30 px-5 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Henüz kelime yok. Hızlı Ekle ile ekleyebilirsin.
              </li>
            ) : (
              selectedDeck.cards.map((card) => (
                <li
                  key={card.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-100/80 dark:bg-slate-700/50 border border-slate-200/50 dark:border-slate-600/50 px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{card.front}</span>
                    <span className="text-slate-400 dark:text-slate-500 shrink-0">→</span>
                    <span className="text-slate-600 dark:text-slate-300 truncate">{card.back}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {card.audioDataUrl ? (
                      <button
                        type="button"
                        onClick={() => playDetailCardAudio(card)}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/80 dark:hover:bg-slate-600/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
                        title={playingDetailCardId === card.id ? 'Duraklat' : 'Dinle'}
                        aria-label={playingDetailCardId === card.id ? 'Duraklat' : 'Sesi dinle'}
                      >
                        {playingDetailCardId === card.id ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                        )}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleRemoveCardFromDeck(card.id)}
                      className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                      title="Kelimeyi sil"
                      aria-label="Kelimeyi sil"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    );
  }

  // —— Edit deck ——
  if (view === 'edit' && selectedDeckId) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <button
          type="button"
          onClick={() => { setView('detail'); loadDecks(); }}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
        >
          ← Sete dön
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
          Seti düzenle
        </h1>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
          Set adı
        </label>
        <input
          type="text"
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
          Kartlar (kelime - anlam, satır başına bir)
        </label>
        <textarea
          value={formBulk}
          onChange={(e) => setFormBulk(e.target.value)}
          rows={12}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 font-mono text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveEdit}
            className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={handleDeleteDeck}
            className="rounded-xl border border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400 px-5 py-2.5 font-medium hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          >
            Seti sil
          </button>
        </div>
      </main>
    );
  }

  // —— Flashcard: Kutlama ekranı (destenin bitmesi) ——
  if (view === 'flashcard' && selectedDeck && flashcardFinished) {
    return (
      <FlashcardCelebration
        cardCount={cardsForFlashcard.length}
        onBackToDeck={() => {
          setFlashcardFinished(false);
          setView('detail');
        }}
        onRestart={() => {
          setFlashcardFinished(false);
          setCardIndex(0);
          setIsFlipped(false);
        }}
      />
    );
  }

  // —— Flashcard: bugün çalışılacak kart yok ——
  if (view === 'flashcard' && selectedDeck && cardsForFlashcard.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-slate-500 dark:text-slate-400 text-center mb-4">
          Bugün çalışılacak kart kalmadı.
        </p>
        <button
          type="button"
          onClick={() => { setView('detail'); setCardIndex(0); setIsFlipped(false); }}
          className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Sete dön
        </button>
      </main>
    );
  }

  // —— Flashcard view (3D flip + SRS rating butonları) ——
  if (view === 'flashcard' && selectedDeck && cardsForFlashcard.length > 0 && cardIndex < cardsForFlashcard.length) {
    const sessionCards = cardsForFlashcard;
    const currentSessionCard = sessionCards[cardIndex];
    const next = () => {
      if (cardIndex < sessionCards.length - 1) {
        setCardIndex(cardIndex + 1);
        setIsFlipped(false);
      } else {
        setFlashcardFinished(true);
      }
    };
    const prev = () => {
      if (cardIndex > 0) {
        setCardIndex(cardIndex - 1);
        setIsFlipped(false);
      }
    };
    const progress = sessionCards.length > 0 ? (cardIndex + 1) / sessionCards.length : 0;

    const exitFlashcard = () => {
      setCardIndex(0);
      setIsFlipped(false);
      setView('detail');
    };

    const handleSRSRating = (rating: SRSRating) => {
      if (!selectedDeckId || !currentSessionCard) return;
      const update = computeSRSUpdate(currentSessionCard, rating);
      updateCardSRS(selectedDeckId, currentSessionCard.id, {
        repetition: update.repetition,
        interval: update.interval,
        easeFactor: update.easeFactor,
        nextReviewDate: update.nextReviewDate,
      });
      if (rating === 'good' || rating === 'easy') addXP(5);
      loadDecks();
      next();
    };

    const againNext = computeSRSUpdate(currentSessionCard, 'again');
    const hardNext = computeSRSUpdate(currentSessionCard, 'hard');
    const goodNext = computeSRSUpdate(currentSessionCard, 'good');
    const easyNext = computeSRSUpdate(currentSessionCard, 'easy');

    return (
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <FlashcardKeyboard
          onFlip={() => setIsFlipped((f) => !f)}
          onNext={next}
          onPrev={prev}
          canPrev={cardIndex > 0}
          canNext={true}
        />
        <div className="flex justify-start mb-4">
          <button
            type="button"
            onClick={exitFlashcard}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 dark:text-slate-500 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors"
          >
            <span aria-hidden="true">←</span>
            Geri Dön
          </button>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
          {cardIndex + 1} / {sessionCards.length}
        </p>
        <div className="w-full h-1 bg-slate-800 dark:bg-slate-700 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="w-full min-h-[260px]" style={{ perspective: '1000px' }}>
          <button
            type="button"
            onClick={() => setIsFlipped((f) => !f)}
            className="w-full h-full min-h-[260px] rounded-2xl border-0 p-0 bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900 [perspective:1000px]"
            aria-label={isFlipped ? 'Kartı çevir (ön yüz)' : 'Kartı çevir (arka yüz)'}
          >
            <div
              className="relative w-full h-full min-h-[260px] transition-transform duration-500 ease-in-out"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              <div
                className="absolute inset-0 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg p-8 flex flex-col justify-center text-left"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
              >
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Ön</p>
                <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {currentSessionCard.front}
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-4">
                  Boşluk veya tıkla: arka yüzü göster
                </p>
              </div>
              <div
                className="absolute inset-0 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 shadow-lg p-8 flex flex-col justify-center text-left"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Arka</p>
                <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {currentSessionCard.back}
                </p>
                {currentSessionCard.example && (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 italic">
                    {currentSessionCard.example}
                  </p>
                )}
              </div>
            </div>
          </button>
        </div>

        {!isFlipped ? (
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={prev}
              disabled={cardIndex === 0}
              className="rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              ← Önceki
            </button>
            <p className="text-sm text-slate-400 dark:text-slate-500 self-center">Arka yüzü çevirip değerlendir</p>
            <div className="w-20" />
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 text-center">Ne kadar iyi hatırladın?</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSRSRating('again')}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-red-300 dark:border-red-500/60 bg-red-50 dark:bg-red-500/15 py-3 px-2 hover:bg-red-100 dark:hover:bg-red-500/25 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <span className="text-lg mb-1" aria-hidden>🔴</span>
                <span className="text-xs font-semibold text-red-700 dark:text-red-300">Tekrar</span>
                <span className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{againNext.nextLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSRSRating('hard')}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-orange-300 dark:border-orange-500/60 bg-orange-50 dark:bg-orange-500/15 py-3 px-2 hover:bg-orange-100 dark:hover:bg-orange-500/25 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <span className="text-lg mb-1" aria-hidden>🟠</span>
                <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Zor</span>
                <span className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">{hardNext.nextLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSRSRating('good')}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-blue-300 dark:border-blue-500/60 bg-blue-50 dark:bg-blue-500/15 py-3 px-2 hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <span className="text-lg mb-1" aria-hidden>🔵</span>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">İyi</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">{goodNext.nextLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSRSRating('easy')}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-emerald-300 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/15 py-3 px-2 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <span className="text-lg mb-1" aria-hidden>🟢</span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Kolay</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">{easyNext.nextLabel}</span>
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  // —— Quiz mod seçimi (quiz başında) ——
  if (view === 'quiz' && selectedDeck && quizMode === null) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <button
          type="button"
          onClick={() => setView('detail')}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4"
        >
          ← Sete dön
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Quiz modu seçin
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Nasıl çalışmak istiyorsunuz?
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => selectQuizMode('classic')}
            className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 p-6 text-left hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <span className="text-2xl mr-3" aria-hidden>✏️</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">Klasik Mod (Yazarak)</span>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Hedef kelimeyi görüp anlamı yazarsınız.
            </p>
          </button>
          <button
            type="button"
            onClick={() => selectQuizMode('multiple-choice')}
            className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 p-6 text-left hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <span className="text-2xl mr-3" aria-hidden>📋</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">Çoktan Seçmeli Mod</span>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Hedef kelimeyi görüp 4 şıktan doğru anlamı seçersiniz.
            </p>
          </button>
          <button
            type="button"
            onClick={() => selectQuizMode('fill-blank')}
            disabled={!hasAnyExample}
            className="w-full rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 p-6 text-left hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800/80"
          >
            <span className="text-2xl mr-3" aria-hidden>📝</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">Boşluk Doldurma (Örnek Cümle)</span>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {hasAnyExample
                ? 'Örnek cümlede boş bırakılan kelimeyi yazarsınız.'
                : 'Bu sette örnek cümle yok — önce kartlara örnek cümle ekleyin.'}
            </p>
          </button>
        </div>
      </main>
    );
  }

  // —— Quiz sonuç modalı (quiz bittiğinde) ——
  if (view === 'quiz' && selectedDeck && quizResult !== null) {
    return (
      <QuizResultModal
        correct={quizResult.correct}
        total={quizResult.total}
        onRestart={() => {
          setQuizResult(null);
          setQuizMode(null);
          setQuizIndex(0);
          setQuizAnswer('');
          setQuizRevealed(false);
          setQuizCorrect(0);
          setQuizSelectedOption(null);
        }}
      />
    );
  }

  // —— Quiz view (Klasik / Çoktan Seçmeli / Boşluk Doldurma) ——
  if (view === 'quiz' && selectedDeck && quizMode !== null && quizCard) {
    const normalizedAnswer = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    const totalQuiz = cardsForQuiz.length;

    const goNext = (wasCorrect: boolean) => {
      const nextCorrect = quizCorrect + (wasCorrect ? 1 : 0);
      if (quizIndex < totalQuiz - 1) {
        setQuizIndex(quizIndex + 1);
        setQuizAnswer('');
        setQuizRevealed(false);
        setQuizCorrect(nextCorrect);
      } else {
        setQuizCorrect(nextCorrect);
        setQuizResult({ correct: nextCorrect, total: totalQuiz });
      }
    };

    // —— Klasik mod (yazarak) ——
    if (quizMode === 'classic') {
      const correctBack = normalizedAnswer(quizCard.back);
      const userBack = normalizedAnswer(quizAnswer);
      const isCorrect = userBack === correctBack;

      const handleClassicNext = () => {
        if (quizRevealed) {
          goNext(isCorrect);
        } else {
          setQuizRevealed(true);
        }
      };

      return (
        <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {quizIndex + 1} / {totalQuiz}
          </p>
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Kelime</p>
            <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              {quizCard.front}
            </p>
          </div>
          {!quizRevealed ? (
            <>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Anlamı yazın
              </label>
              <input
                type="text"
                value={quizAnswer}
                onChange={(e) => setQuizAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleClassicNext()}
                placeholder="Cevabınız..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4"
                autoFocus
              />
            </>
          ) : (
            <div
              className={`rounded-xl p-4 mb-4 ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30'
              }`}
            >
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Doğru cevap</p>
              <p className="text-lg text-slate-800 dark:text-slate-100">{quizCard.back}</p>
              {!isCorrect && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  Sizin cevabınız: {quizAnswer || '(boş)'}
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleClassicNext}
            className="w-full rounded-xl bg-indigo-600 text-white py-3 font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {!quizRevealed ? 'Kontrol et' : quizIndex < totalQuiz - 1 ? 'Sonraki →' : 'Bitir'}
          </button>
        </main>
      );
    }

    // —— Çoktan seçmeli mod ——
    if (quizMode === 'multiple-choice') {
      const options = multipleChoiceOptions;

      const handleChoice = (option: string) => {
        if (quizRevealed) return;
        const correct = normalizedAnswer(option) === normalizedAnswer(quizCard.back);
        setQuizSelectedOption(option);
        setQuizRevealed(true);
        if (quizNextTimeoutRef.current) clearTimeout(quizNextTimeoutRef.current);
        quizNextTimeoutRef.current = setTimeout(() => {
          goNext(correct);
          setQuizSelectedOption(null);
          quizNextTimeoutRef.current = null;
        }, 800);
      };

      return (
        <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {quizIndex + 1} / {totalQuiz}
          </p>
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Kelime</p>
            <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              {quizCard.front}
            </p>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Anlamı seçin</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt) => {
              const isChosen = quizSelectedOption === opt;
              const isCorrectOpt = normalizedAnswer(opt) === normalizedAnswer(quizCard.back);
              const showRight = quizRevealed && isCorrectOpt;
              const showWrong = quizRevealed && isChosen && !isCorrectOpt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChoice(opt)}
                  disabled={quizRevealed}
                  className={`rounded-xl border-2 px-4 py-3 text-left font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:pointer-events-none ${
                    showRight
                      ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                      : showWrong
                        ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-500/20 text-red-800 dark:text-red-200'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </main>
      );
    }

    // —— Boşluk doldurma (örnek cümle) modu ——
    if (quizMode === 'fill-blank' && quizCard.example) {
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const blankSentence = quizCard.example.replace(
        new RegExp(escapeRegex(quizCard.front), 'gi'),
        '________'
      );
      const correctFront = normalizedAnswer(quizCard.front);
      const userFront = normalizedAnswer(quizAnswer);
      const isCorrect = userFront === correctFront;

      const handleFillNext = () => {
        if (quizRevealed) {
          goNext(isCorrect);
        } else {
          setQuizRevealed(true);
        }
      };

      return (
        <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {quizIndex + 1} / {totalQuiz}
          </p>
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 mb-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Örnek cümle</p>
            <p className="text-lg text-slate-800 dark:text-slate-100 font-medium">
              {blankSentence}
            </p>
          </div>
          {!quizRevealed ? (
            <>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Boşluğa gelecek kelimeyi yazın
              </label>
              <input
                type="text"
                value={quizAnswer}
                onChange={(e) => setQuizAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFillNext()}
                placeholder="Kelime..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4"
                autoFocus
              />
            </>
          ) : (
            <div
              className={`rounded-xl p-4 mb-4 ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30'
              }`}
            >
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Doğru kelime</p>
              <p className="text-lg text-slate-800 dark:text-slate-100">{quizCard.front}</p>
              {!isCorrect && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  Sizin cevabınız: {quizAnswer || '(boş)'}
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleFillNext}
            className="w-full rounded-xl bg-indigo-600 text-white py-3 font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {!quizRevealed ? 'Kontrol et' : quizIndex < totalQuiz - 1 ? 'Sonraki →' : 'Bitir'}
          </button>
        </main>
      );
    }
  }

  goToList();
  return null;
}
