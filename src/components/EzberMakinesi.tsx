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
type CardSortMode = 'random' | 'unknown_first' | 'newest_first' | 'sequential';
type CardStatsEntry = {
  correctCount: number;
  wrongCount: number;
  lastSeen: string | null;
  streak: number;
};
type FlashcardStudyMode = 'cards' | 'write';
type WriteCheckResult = 'correct' | 'close' | 'wrong';
type WriteSessionSummary = { correct: number; close: number; wrong: number };
type DeckProgressDay = { correct: number; wrong: number; cards_seen: number };
type DeckProgressMap = Record<string, DeckProgressDay>;
type ImportPayload = {
  name: string;
  cards: { front: string; back: string; example?: string }[];
  language?: string;
};

const MIN_EASE = 1.3;
const CARD_STATS_KEY = 'card_stats';
const CARD_AUDIO_ENABLED_KEY = 'card_audio_enabled';
const CARD_SORT_MODE_KEY = 'card_sort_mode';
const TOAST_DURATION_MS = 2200;
const SORT_OPTIONS: { id: CardSortMode; label: string }[] = [
  { id: 'random', label: 'Rastgele' },
  { id: 'unknown_first', label: 'Önce Bilinmeyenler' },
  { id: 'newest_first', label: 'Önce Yeniler' },
  { id: 'sequential', label: 'Sıralı' },
];

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

function defaultCardStats(): CardStatsEntry {
  return { correctCount: 0, wrongCount: 0, lastSeen: null, streak: 0 };
}

function loadCardStats(): Record<string, CardStatsEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CARD_STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<CardStatsEntry>>;
    const out: Record<string, CardStatsEntry> = {};
    Object.entries(parsed || {}).forEach(([id, value]) => {
      out[id] = {
        correctCount: Math.max(0, Number(value?.correctCount ?? 0) || 0),
        wrongCount: Math.max(0, Number(value?.wrongCount ?? 0) || 0),
        lastSeen: typeof value?.lastSeen === 'string' ? value.lastSeen : null,
        streak: Math.max(0, Number(value?.streak ?? 0) || 0),
      };
    });
    return out;
  } catch {
    return {};
  }
}

function saveCardStats(stats: Record<string, CardStatsEntry>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CARD_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

function readCardAudioEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(CARD_AUDIO_ENABLED_KEY);
  return raw == null ? true : raw === 'true';
}

function readCardSortMode(): CardSortMode {
  if (typeof window === 'undefined') return 'random';
  const raw = window.localStorage.getItem(CARD_SORT_MODE_KEY);
  return SORT_OPTIONS.some((opt) => opt.id === raw) ? (raw as CardSortMode) : 'random';
}

function formatSeenAgo(lastSeen: string | null): string {
  if (!lastSeen) return 'İlk kez';
  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return 'Az önce';
  const diffMs = Date.now() - ts;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'Az önce';
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} sa önce`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gün önce`;
}

function getSpeechLang(deckLanguage?: string): 'es-ES' | 'fr-FR' | 'en-US' {
  const code = (deckLanguage ?? '').toUpperCase();
  if (code === 'FR') return 'fr-FR';
  if (code === 'EN') return 'en-US';
  return 'es-ES';
}

function speakCard(text: string, lang: 'es-ES' | 'fr-FR' | 'en-US' = 'es-ES') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
  const synth = window.speechSynthesis;
  const run = () => {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85;
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang === lang && v.localService) ||
      voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  };

  if (synth.getVoices().length > 0) {
    run();
    return;
  }

  const handler = () => {
    const synthWithEvents = synth as typeof synth & {
      addEventListener?: (name: string, cb: () => void, opts?: { once?: boolean }) => void;
      removeEventListener?: (name: string, cb: () => void) => void;
    };
    if (typeof synthWithEvents.removeEventListener === 'function') {
      synthWithEvents.removeEventListener('voiceschanged', handler);
    } else if (synth.onvoiceschanged === handler) {
      synth.onvoiceschanged = null;
    }
    run();
  };

  const synthWithEvents = synth as typeof synth & {
    addEventListener?: (name: string, cb: () => void, opts?: { once?: boolean }) => void;
  };
  if (typeof synthWithEvents.addEventListener === 'function') {
    synthWithEvents.addEventListener('voiceschanged', handler, { once: true });
  } else {
    synth.onvoiceschanged = handler;
  }
  synth.getVoices();
}

function sortCards(cards: Flashcard[], mode: CardSortMode, stats: Record<string, CardStatsEntry>): Flashcard[] {
  switch (mode) {
    case 'unknown_first':
      return [...cards].sort((a, b) => {
        const aStats = stats[a.id] ?? defaultCardStats();
        const bStats = stats[b.id] ?? defaultCardStats();
        const aRatio = aStats.correctCount / (aStats.correctCount + aStats.wrongCount + 1);
        const bRatio = bStats.correctCount / (bStats.correctCount + bStats.wrongCount + 1);
        return aRatio - bRatio;
      });
    case 'newest_first':
      return [...cards].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'random':
      return [...cards].sort(() => Math.random() - 0.5);
    case 'sequential':
    default:
      return [...cards];
  }
}

function normalizeWriteAnswer(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function checkWriteAnswer(input: string, correct: string): WriteCheckResult {
  const normalizedInput = normalizeWriteAnswer(input);
  const normalizedCorrect = normalizeWriteAnswer(correct);
  if (normalizedInput === normalizedCorrect) return 'correct';
  if (levenshteinDistance(normalizedInput, normalizedCorrect) <= 2) return 'close';
  return 'wrong';
}

function deckProgressKey(deckId: string): string {
  return `deck_progress_${deckId}`;
}

function readDeckProgress(deckId: string): DeckProgressMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(deckProgressKey(deckId));
    if (!raw) return {};
    return JSON.parse(raw) as DeckProgressMap;
  } catch {
    return {};
  }
}

function writeDeckProgress(deckId: string, progress: DeckProgressMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(deckProgressKey(deckId), JSON.stringify(progress));
  } catch {
    // ignore
  }
}

function addDeckProgressEntry(deckId: string, entry: { correct?: number; wrong?: number; cards_seen?: number }): DeckProgressMap {
  const today = new Date().toISOString().slice(0, 10);
  const prev = readDeckProgress(deckId);
  const day = prev[today] ?? { correct: 0, wrong: 0, cards_seen: 0 };
  const next: DeckProgressMap = {
    ...prev,
    [today]: {
      correct: day.correct + (entry.correct ?? 0),
      wrong: day.wrong + (entry.wrong ?? 0),
      cards_seen: day.cards_seen + (entry.cards_seen ?? 0),
    },
  };
  writeDeckProgress(deckId, next);
  return next;
}

function formatLanguageForImport(language?: string): string {
  const code = (language ?? '').toUpperCase();
  if (code === 'FR' || code === 'EN' || code === 'ES') return code;
  return 'ES';
}

function encodeSharePayload(payload: ImportPayload): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function decodeSharePayload(encoded: string): ImportPayload | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json) as ImportPayload;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.cards)) return null;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : 'Paylasilan Deste',
      language: typeof parsed.language === 'string' ? parsed.language : 'es',
      cards: parsed.cards
        .filter((c) => c && typeof c.front === 'string' && typeof c.back === 'string')
        .map((c) => ({
          front: c.front.trim(),
          back: c.back.trim(),
          example: typeof c.example === 'string' ? c.example.trim() : undefined,
        }))
        .filter((c) => c.front && c.back),
    };
  } catch {
    return null;
  }
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
  mode,
  summary,
  onBackToDeck,
  onRestart,
}: {
  cardCount: number;
  mode?: FlashcardStudyMode;
  summary?: WriteSessionSummary;
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
      {mode === 'write' && summary && (
        <div className="mb-8 grid grid-cols-3 gap-3 w-full max-w-md">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-center">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Doğru</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{summary.correct}</p>
          </div>
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-center">
            <p className="text-xs text-amber-700 dark:text-amber-300">Neredeyse</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{summary.close}</p>
          </div>
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-center">
            <p className="text-xs text-rose-700 dark:text-rose-300">Yanlış</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{summary.wrong}</p>
          </div>
        </div>
      )}
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
  const { level, title, xpProgress } = useXp();
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
  const flashcardRef = useRef<HTMLDivElement | null>(null);
  const [cardStats, setCardStats] = useState<Record<string, CardStatsEntry>>(() => loadCardStats());
  const [cardAudioEnabled, setCardAudioEnabled] = useState<boolean>(() => readCardAudioEnabled());
  const [cardSortMode, setCardSortMode] = useState<CardSortMode>(() => readCardSortMode());
  const [flashcardStudyMode, setFlashcardStudyMode] = useState<FlashcardStudyMode>('cards');
  const [writeAnswer, setWriteAnswer] = useState('');
  const [writeResult, setWriteResult] = useState<WriteCheckResult | null>(null);
  const [writeSessionSummary, setWriteSessionSummary] = useState<WriteSessionSummary>({ correct: 0, close: 0, wrong: 0 });
  const writeInputRef = useRef<HTMLInputElement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPayload | null>(null);
  const [detailTab, setDetailTab] = useState<'cards' | 'progress'>('cards');
  const [deckProgress, setDeckProgress] = useState<DeckProgressMap>({});
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CARD_AUDIO_ENABLED_KEY, String(cardAudioEnabled));
  }, [cardAudioEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CARD_SORT_MODE_KEY, cardSortMode);
  }, [cardSortMode]);

  useEffect(() => {
    if (view !== 'flashcard') return;
    const id = requestAnimationFrame(() => {
      flashcardRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [view, cardIndex]);

  useEffect(() => () => {
    if (quizNextTimeoutRef.current) clearTimeout(quizNextTimeoutRef.current);
  }, []);

  const patchCardStats = useCallback((cardId: string, updater: (prev: CardStatsEntry) => CardStatsEntry) => {
    setCardStats((prev) => {
      const next = { ...prev, [cardId]: updater(prev[cardId] ?? defaultCardStats()) };
      saveCardStats(next);
      return next;
    });
  }, []);

  const selectedDeck = selectedDeckId ? getFlashcardDeckById(selectedDeckId) : null;
  const cards = selectedDeck?.cards ?? [];
  /** Flashcard modunda sadece bugün tekrarlanacak kartlar (SRS due) */
  const cardsForFlashcard = useMemo(
    () => sortCards(getDueCards(selectedDeck?.cards ?? []), cardSortMode, cardStats),
    [selectedDeck?.cards, cardSortMode, cardStats]
  );
  const currentFlashcardCard = cardsForFlashcard[cardIndex] ?? null;
  const currentFlashcardLang = getSpeechLang(selectedDeck?.language);
  /** Fill-blank modunda sadece örnek cümlesi olan kartlar; diğer modlarda tüm kartlar */
  const cardsForQuiz = useMemo(
    () => (quizMode === 'fill-blank' ? cards.filter((c) => c.example?.trim()) : cards),
    [cards, quizMode]
  );
  const quizCard = cardsForQuiz[quizIndex];
  const hasAnyExample = cards.some((c) => c.example?.trim());

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const recordDeckProgress = useCallback((deckId: string, entry: { correct?: number; wrong?: number; cards_seen?: number }) => {
    const next = addDeckProgressEntry(deckId, entry);
    setDeckProgress(next);
  }, []);

  useEffect(() => {
    if (!selectedDeckId) {
      setDeckProgress({});
      return;
    }
    setDeckProgress(readDeckProgress(selectedDeckId));
  }, [selectedDeckId]);

  useEffect(() => {
    if (view !== 'flashcard' || flashcardStudyMode !== 'write') return;
    const id = requestAnimationFrame(() => {
      writeInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [view, flashcardStudyMode, cardIndex, writeResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('import');
    if (!encoded) return;
    const decoded = decodeSharePayload(encoded);
    if (!decoded || decoded.cards.length === 0) {
      params.delete('import');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
      return;
    }
    setImportPreview(decoded);
  }, []);

  useEffect(() => {
    if (view !== 'flashcard' || !currentFlashcardCard) return;
    patchCardStats(currentFlashcardCard.id, (prev) => ({
      ...prev,
      lastSeen: new Date().toISOString(),
    }));
  }, [view, currentFlashcardCard?.id, patchCardStats]);

  useEffect(() => {
    if (view !== 'flashcard' || !currentFlashcardCard || !cardAudioEnabled) return;
    speakCard(isFlipped ? currentFlashcardCard.back : currentFlashcardCard.front, currentFlashcardLang);
  }, [
    view,
    currentFlashcardCard?.id,
    currentFlashcardCard?.front,
    currentFlashcardCard?.back,
    isFlipped,
    cardAudioEnabled,
    currentFlashcardLang,
  ]);

  useEffect(() => {
    if (view === 'flashcard') return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [view]);

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

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
    setDetailTab('cards');
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
    setDetailTab('cards');
    setView('detail');
  }, []);

  /** Set kartından doğrudan Flashcard moduna başlat (Hızlı Başlat). */
  const openDeckAndStartFlashcard = useCallback((id: string) => {
    setSelectedDeckId(id);
    setCardIndex(0);
    setIsFlipped(false);
    setFlashcardFinished(false);
    setWriteAnswer('');
    setWriteResult(null);
    setWriteSessionSummary({ correct: 0, close: 0, wrong: 0 });
    setView('flashcard');
  }, []);

  const clearImportQuery = useCallback(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.delete('import');
    window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
  }, []);

  const handleImportDeck = useCallback(() => {
    if (!importPreview) return;
    createDeck(
      importPreview.name,
      importPreview.cards.map((c) => ({ front: c.front, back: c.back, example: c.example })),
      formatLanguageForImport(importPreview.language)
    );
    loadDecks();
    showToast(`'${importPreview.name}' iceri aktarıldı`);
    setImportPreview(null);
    clearImportQuery();
  }, [importPreview, loadDecks, showToast, clearImportQuery]);

  const handleCancelImport = useCallback(() => {
    setImportPreview(null);
    clearImportQuery();
  }, [clearImportQuery]);

  const handleCopyShareLink = useCallback(async (deck: FlashcardDeck) => {
    if (deck.cards.length > 50) {
      showToast('Bu deste cok buyuk, link olusturulamiyor (max 50 kart)');
      return;
    }
    const payload: ImportPayload = {
      name: deck.title,
      language: (deck.language ?? 'ES').toLowerCase(),
      cards: deck.cards.map((c) => ({ front: c.front, back: c.back, example: c.example })),
    };
    const encoded = encodeSharePayload(payload);
    const url = `${window.location.origin}/ezber-makinesi?import=${encoded}`;
    if (url.length > 2000) {
      showToast('Bu deste cok buyuk, link olusturulamiyor (max 50 kart)');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Kopyalandi!');
    } catch {
      showToast('Link kopyalanamadi');
    }
  }, [showToast]);

  const submitWriteAnswer = useCallback(() => {
    if (!selectedDeckId || !currentFlashcardCard) return;
    const result = checkWriteAnswer(writeAnswer, currentFlashcardCard.back);
    setWriteResult(result);
    patchCardStats(currentFlashcardCard.id, (prevStats) => ({
      ...prevStats,
      correctCount:
        result === 'wrong' ? prevStats.correctCount : prevStats.correctCount + 1,
      wrongCount: result === 'wrong' ? prevStats.wrongCount + 1 : prevStats.wrongCount,
      streak:
        result === 'correct'
          ? prevStats.streak + 1
          : result === 'close'
            ? prevStats.streak
            : 0,
      lastSeen: new Date().toISOString(),
    }));
    setWriteSessionSummary((prev) => ({
      correct: prev.correct + (result === 'correct' ? 1 : 0),
      close: prev.close + (result === 'close' ? 1 : 0),
      wrong: prev.wrong + (result === 'wrong' ? 1 : 0),
    }));
    recordDeckProgress(selectedDeckId, {
      correct: result === 'wrong' ? 0 : 1,
      wrong: result === 'wrong' ? 1 : 0,
      cards_seen: 1,
    });
  }, [selectedDeckId, currentFlashcardCard, writeAnswer, patchCardStats, recordDeckProgress]);

  const nextWriteCard = useCallback(() => {
    if (!currentFlashcardCard) return;
    setWriteAnswer('');
    setWriteResult(null);
    if (cardIndex < cardsForFlashcard.length - 1) {
      setCardIndex((i) => i + 1);
    } else {
      setFlashcardFinished(true);
    }
  }, [cardIndex, cardsForFlashcard.length, currentFlashcardCard]);

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
    setWriteAnswer('');
    setWriteResult(null);
    setWriteSessionSummary({ correct: 0, close: 0, wrong: 0 });
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
      <>
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
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <button type="button" className="absolute inset-0" aria-label="İçe aktarmayı kapat" onClick={handleCancelImport} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <h2 className="text-lg font-bold mb-2">Deste içe aktarılsın mı?</h2>
            <p className="text-sm text-slate-300 mb-6">
              {importPreview.cards.length} kartlı '{importPreview.name}' destesi içe aktarılsın mı?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelImport}
                className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleImportDeck}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                İçe Aktar
              </button>
            </div>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900/95 px-4 py-2 text-sm font-medium text-white shadow-xl">
          {toastMessage}
        </div>
      )}
      </>
    );
  }

  // —— Create deck (form: title + single add or bulk import) ——
  if (view === 'create') {
    return (
      <>
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
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900/95 px-4 py-2 text-sm font-medium text-white shadow-xl">
          {toastMessage}
        </div>
      )}
      </>
    );
  }

  // —— Deck detail: header + CTA kartları + Setteki Kelimeler ——
  if (view === 'detail' && selectedDeck) {
    const hasCards = selectedDeck.cards.length > 0;
    const learned = selectedDeck.cards.filter((c) => (c.repetition ?? 0) > 0 || (c.interval ?? 0) > 0).length;
    const total = selectedDeck.cards.length;
    const progressPercent = total ? Math.round((learned / total) * 100) : 0;
    const progressEntries = Object.entries(deckProgress).sort(([a], [b]) => a.localeCompare(b));
    const totalSeen = progressEntries.reduce((sum, [, day]) => sum + day.cards_seen, 0);
    const totalCorrect = progressEntries.reduce((sum, [, day]) => sum + day.correct, 0);
    const totalWrong = progressEntries.reduce((sum, [, day]) => sum + day.wrong, 0);
    const accuracy = totalSeen ? Math.round((totalCorrect / Math.max(1, totalCorrect + totalWrong)) * 100) : 0;
    let practiceStreak = 0;
    for (let offset = 0; offset < 365; offset++) {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const key = d.toISOString().slice(0, 10);
      if ((deckProgress[key]?.cards_seen ?? 0) > 0) practiceStreak += 1;
      else break;
    }
    const chartDays = Array.from({ length: 14 }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - idx));
      const key = d.toISOString().slice(0, 10);
      const day = deckProgress[key] ?? { correct: 0, wrong: 0, cards_seen: 0 };
      return {
        key,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        ...day,
      };
    });
    const maxSeen = Math.max(1, ...chartDays.map((d) => d.cards_seen));
    const masteredCount = selectedDeck.cards.filter((card) => (cardStats[card.id]?.streak ?? 0) >= 5).length;
    const masteredPct = total ? Math.round((masteredCount / total) * 100) : 0;

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
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyShareLink(selectedDeck)}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10 dark:hover:bg-indigo-400/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
            >
              Linki Kopyala
            </button>
            <button
              type="button"
              onClick={handleEditDeck}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 dark:hover:bg-indigo-400/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
              title="Seti düzenle"
              aria-label="Seti düzenle"
            >
              <span className="text-xl leading-none" aria-hidden>⚙️</span>
            </button>
          </div>
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

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setDetailTab('cards')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
              detailTab === 'cards'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Kartlar
          </button>
          <button
            type="button"
            onClick={() => setDetailTab('progress')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
              detailTab === 'progress'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            İlerleme
          </button>
        </div>

        {detailTab === 'cards' ? (
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
        ) : (
        <section className="rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm overflow-hidden shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl bg-slate-100/80 dark:bg-slate-800/70 px-4 py-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Toplam</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{totalSeen} kart</p>
            </div>
            <div className="rounded-xl bg-slate-100/80 dark:bg-slate-800/70 px-4 py-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Doğruluk</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">%{accuracy}</p>
            </div>
            <div className="rounded-xl bg-slate-100/80 dark:bg-slate-800/70 px-4 py-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Günlük seri</p>
              <p className="text-lg font-bold text-orange-500">{practiceStreak} gün</p>
            </div>
          </div>
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Uzmanlaşılan kartlar</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{masteredCount} / {total} kart (%{masteredPct})</p>
            </div>
            <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${masteredPct}%` }}
              />
            </div>
          </div>
          {totalSeen === 0 ? (
            <p className="rounded-xl bg-slate-100/80 dark:bg-slate-800/70 px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Henüz yeterli veri yok — çalışmaya devam et!
            </p>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/40 p-4 overflow-x-auto">
              <svg viewBox="0 0 560 220" className="w-full min-w-[520px] h-auto">
                {chartDays.map((day, idx) => {
                  const x = 24 + idx * 38;
                  const width = 24;
                  const totalHeight = (day.cards_seen / maxSeen) * 140;
                  const correctHeight = day.cards_seen > 0 ? (day.correct / day.cards_seen) * totalHeight : 0;
                  const wrongHeight = Math.max(0, totalHeight - correctHeight);
                  const baseY = 170;
                  return (
                    <g key={day.key}>
                      <rect x={x} y={baseY - totalHeight} width={width} height={wrongHeight} rx={6} fill="rgba(244,63,94,0.75)" />
                      <rect x={x} y={baseY - totalHeight} width={width} height={correctHeight} rx={6} fill="rgba(16,185,129,0.85)" />
                      <text x={x + width / 2} y={195} textAnchor="middle" fontSize="10" fill="currentColor" className="text-slate-500">
                        {day.label}
                      </text>
                    </g>
                  );
                })}
                <line x1="18" y1="170" x2="550" y2="170" stroke="rgba(148,163,184,0.35)" />
              </svg>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" /> Doğru</span>
                <span className="inline-flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm bg-rose-500" /> Yanlış</span>
              </div>
            </div>
          )}
        </section>
        )}
      </main>
    );
  }

  // —— Edit deck ——
  if (view === 'edit' && selectedDeckId) {
    return (
      <div className="fixed inset-0 z-50 p-4 bg-black/60 backdrop-blur-md">
        <button
          type="button"
          aria-label="Düzenlemeyi kapat"
          onClick={() => { setView('detail'); loadDecks(); }}
          className="absolute inset-0"
        />
        <div className="relative mx-auto flex w-full max-w-2xl max-h-[85vh] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="px-4 py-4 sm:px-6 sm:py-5">
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
            <div className="pb-20">
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
              <button
                type="button"
                onClick={handleDeleteDeck}
                className="rounded-xl border border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400 px-5 py-2.5 font-medium hover:bg-red-50 dark:hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                Seti sil
              </button>
            </div>
          </div>
          <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 dark:border-slate-700 dark:bg-slate-900/95">
            <button
              type="button"
              onClick={() => { setView('detail'); loadDecks(); }}
              className="rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Güncelle
            </button>
          </div>
        </div>
      </div>
    );
  }

  // —— Flashcard: Kutlama ekranı (destenin bitmesi) ——
  if (view === 'flashcard' && selectedDeck && flashcardFinished) {
    return (
      <FlashcardCelebration
        cardCount={cardsForFlashcard.length}
        mode={flashcardStudyMode}
        summary={flashcardStudyMode === 'write' ? writeSessionSummary : undefined}
        onBackToDeck={() => {
          setFlashcardFinished(false);
          setView('detail');
        }}
        onRestart={() => {
          setFlashcardFinished(false);
          setCardIndex(0);
          setIsFlipped(false);
          setWriteAnswer('');
          setWriteResult(null);
          setWriteSessionSummary({ correct: 0, close: 0, wrong: 0 });
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
    const currentStats = cardStats[currentSessionCard.id] ?? defaultCardStats();
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
      patchCardStats(currentSessionCard.id, (prevStats) => ({
        ...prevStats,
        correctCount: rating === 'again' ? prevStats.correctCount : prevStats.correctCount + 1,
        wrongCount: rating === 'again' ? prevStats.wrongCount + 1 : prevStats.wrongCount,
        streak: rating === 'again' ? 0 : prevStats.streak + 1,
        lastSeen: new Date().toISOString(),
      }));
      recordDeckProgress(selectedDeckId, {
        correct: rating === 'again' ? 0 : 1,
        wrong: rating === 'again' ? 1 : 0,
        cards_seen: 1,
      });
      loadDecks();
      next();
    };

    const againNext = computeSRSUpdate(currentSessionCard, 'again');
    const hardNext = computeSRSUpdate(currentSessionCard, 'hard');
    const goodNext = computeSRSUpdate(currentSessionCard, 'good');
    const easyNext = computeSRSUpdate(currentSessionCard, 'easy');
    const handleFlashcardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (flashcardStudyMode === 'write') return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSRSRating('good');
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSRSRating('again');
      }
    };
    const replayCurrentSide = (side: 'front' | 'back') => {
      speakCard(side === 'front' ? currentSessionCard.front : currentSessionCard.back, currentFlashcardLang);
    };
    const insertAccentChar = (char: string) => {
      setWriteAnswer((prev) => `${prev}${char}`);
      requestAnimationFrame(() => writeInputRef.current?.focus());
    };

    return (
      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
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
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setCardSortMode(opt.id);
                setCardIndex(0);
                setIsFlipped(false);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                cardSortMode === opt.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Otomatik sesli okuma</span>
          <button
            type="button"
            onClick={() => setCardAudioEnabled((v) => !v)}
            aria-pressed={cardAudioEnabled}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
              cardAudioEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                cardAudioEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="w-full h-1 bg-slate-800 dark:bg-slate-700 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              setFlashcardStudyMode('cards');
              setWriteAnswer('');
              setWriteResult(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              flashcardStudyMode === 'cards'
                ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Kartlar
          </button>
          <button
            type="button"
            onClick={() => {
              setFlashcardStudyMode('write');
              setIsFlipped(false);
              setWriteAnswer('');
              setWriteResult(null);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              flashcardStudyMode === 'write'
                ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Yaz
          </button>
        </div>
        {flashcardStudyMode === 'cards' ? (
        <div className="w-full min-h-[260px]" style={{ perspective: '1200px' }}>
          <div
            ref={flashcardRef}
            tabIndex={0}
            onClick={() => setIsFlipped((f) => !f)}
            onKeyDown={handleFlashcardKeyDown}
            className="w-full h-full min-h-[260px] rounded-2xl border-0 p-0 bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            aria-label={isFlipped ? 'Kartı çevir (ön yüz)' : 'Kartı çevir (arka yüz)'}
            role="button"
            aria-pressed={isFlipped}
          >
            <div
              className="relative w-full h-full min-h-[260px]"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div
                className="absolute inset-0 rounded-2xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg p-8 flex flex-col justify-center text-left"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    replayCurrentSide('front');
                  }}
                  className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  aria-label="Ön yüzü tekrar seslendir"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5 6 9H3v6h3l5 4V5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 5.5a9 9 0 0 1 0 13" />
                  </svg>
                </button>
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
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    replayCurrentSide('back');
                  }}
                  className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  aria-label="Arka yüzü tekrar seslendir"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5 6 9H3v6h3l5 4V5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 5.5a9 9 0 0 1 0 13" />
                  </svg>
                </button>
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
          </div>
        </div>
        ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/50 p-6">
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 mb-5">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Ön yüz</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentSessionCard.front}</p>
          </div>
          <div className="max-w-lg mx-auto">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 text-center mb-3">
              Arka yüzü yazın
            </label>
            <input
              ref={writeInputRef}
              type="text"
              value={writeAnswer}
              onChange={(e) => setWriteAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (writeResult) nextWriteCard();
                else submitWriteAnswer();
              }}
              disabled={writeResult !== null}
              placeholder="Cevabınız..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 py-4 text-lg text-center text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            {currentFlashcardLang === 'es-ES' && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'].map((char) => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => insertAccentChar(char)}
                    className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    {char}
                  </button>
                ))}
              </div>
            )}
            {writeResult && (
              <div
                className={`mt-4 rounded-2xl border px-4 py-4 text-center ${
                  writeResult === 'correct'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : writeResult === 'close'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300'
                }`}
              >
                <p className="font-semibold">
                  {writeResult === 'correct'
                    ? 'Doğru!'
                    : writeResult === 'close'
                      ? `Neredeyse! Doğrusu: ${currentSessionCard.back}`
                      : `Yanlış! Doğrusu: ${currentSessionCard.back}`}
                </p>
                {writeResult !== 'correct' && (
                  <p className="mt-1 text-sm opacity-80">Sizin cevabınız: {writeAnswer || '(boş)'}</p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => (writeResult ? nextWriteCard() : submitWriteAnswer())}
              className="mt-5 w-full rounded-xl bg-indigo-600 text-white py-3 font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {writeResult ? (cardIndex < sessionCards.length - 1 ? 'Sonraki →' : 'Bitir') : 'Kontrol Et'}
            </button>
          </div>
        </div>
        )}
        <div
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1"
          style={{ fontSize: 'var(--font-size-xs, 0.75rem)', color: 'var(--text-muted, #64748b)' }}
        >
          <span className="font-medium text-emerald-600">✓ {currentStats.correctCount}</span>
          <span className="font-medium text-rose-600">✗ {currentStats.wrongCount}</span>
          <span>Son: {formatSeenAgo(currentStats.lastSeen)}</span>
          <span className="font-medium text-orange-500">🔥 {currentStats.streak}</span>
        </div>

        {flashcardStudyMode === 'cards' ? (!isFlipped ? (
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
        )) : null}
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
