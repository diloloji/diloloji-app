/**
 * Historia Mode — İspanyolca sahneli fiil çekim oyunu.
 *
 * Akış:
 *  1. Seans başlarken zorluk seviyesi seçilir (A2/B1/B2/Hepsi).
 *  2. Her sahnede kullanıcı önce doğru zamanı seçer (kart), sonra çekimi yazar.
 *  3. "Kontrol Et" basıldığında iki parça ayrı ayrı doğrulanır:
 *       - zaman +1 puan, çekim +2 puan, ipucu kullanıldıysa -1 puan.
 *  4. Seans bittiğinde toplam skor, en zayıf zaman ve özet gösterilir.
 *
 * localStorage:
 *  - Seans sonuçları historiaProgress.ts içinden `conjume-historia-progress` anahtarı ile saklanır.
 *  - Doğru yanıt verildiğinde dailyGoal / activityHistory güncellenir (günlük seri).
 *  - Yanlış çekimler mistakeBank'a (verb + tense + pronoun) eklenir ve SRS tekrarına dahil olur.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  ChevronRight,
  HelpCircle,
  Home,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  HISTORIA_SCENES,
  THEME_META,
  filterScenes,
  shuffleScenes,
  splitSentence,
  type HistoriaDifficulty,
  type HistoriaScene,
} from '../data/historiaScenes';
import { PRONOUNS_ES, TENSES_ES, type TenseIdEs } from '../data/spanish';
import { addMistake } from '../utils/mistakeBank';
import { addActivityToday } from '../utils/activityHistory';
import { updateDocumentTitle } from '../utils/dailyGoal';
import { saveHistoriaSession, getWeakestTenseOfSession, type HistoriaSessionResult } from '../utils/historiaProgress';
import { getConjugationRule } from '../utils/conjugationRules';
import { speakAuto, matchTranscript, type ListenResult } from '../utils/speech';
import MicButton from '../components/speech/MicButton';

/* ───────────────────── Sabitler ───────────────────── */

/** Her sahnede gösterilen zaman kartları (7 adet — mobilde 2 sütun). */
const TENSE_OPTIONS: TenseIdEs[] = [
  'presente',
  'preterito',
  'imperfecto',
  'preterito-perfecto',
  'pluscuamperfecto',
  'futuro',
  'condicional',
  'subjuntivo-presente',
];

/** Kısa label — kart içinde zaman adını sadeleştirir. */
const TENSE_SHORT_LABEL: Record<TenseIdEs, string> = {
  presente: 'Presente',
  preterito: 'Pretérito Indefinido',
  imperfecto: 'Imperfecto',
  'preterito-perfecto': 'Pretérito Perfecto',
  pluscuamperfecto: 'Pluscuamperfecto',
  futuro: 'Futuro',
  'futuro-compuesto': 'Futuro Compuesto',
  condicional: 'Condicional',
  'subjuntivo-presente': 'Subjuntivo Presente',
};

/** Kart altı mini ipucu (kısa kullanım alanı). */
const TENSE_HINT: Record<TenseIdEs, string> = {
  presente: 'Şimdiki / genel',
  preterito: 'Geçmişte bitti',
  imperfecto: 'Geçmişte süregen / alışkanlık',
  'preterito-perfecto': 'Yakın geçmiş (bitmemiş dönem)',
  pluscuamperfecto: 'Geçmişte geçmiş',
  futuro: 'Gelecek',
  'futuro-compuesto': 'Gelecekte bitmiş',
  condicional: 'Koşullu / kibarlık',
  'subjuntivo-presente': 'Dilek / şüphe',
};

/** Seans uzunluğu. */
const DEFAULT_SESSION_LENGTH = 8;
const HINT_PENALTY = 1;

/** Zorluk rozetleri — Tailwind JIT için tüm sınıflar statik olmalı. */
const DIFFICULTY_BADGE: Record<HistoriaDifficulty, string> = {
  A2: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  B1: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  B2: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
};

/** Cevap karşılaştırmada aksanları ve fazla boşlukları normalize eder. */
function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isFormCorrect(user: string, expected: string): boolean {
  if (!user.trim()) return false;
  return normalizeAnswer(user) === normalizeAnswer(expected);
}

/* ───────────────────── Arka plan ───────────────────── */

function HistoriaBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0a0e17] via-[#0d1117] to-[#1e1b2e] opacity-0 dark:opacity-100 transition-opacity duration-500"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-100 via-rose-50/30 to-amber-50/40 dark:opacity-0 opacity-100 transition-opacity duration-500"
        aria-hidden
      />
      <div className="absolute -top-32 -right-16 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
      <div className="absolute top-1/3 -left-20 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" aria-hidden />
    </>
  );
}

/* ───────────────────── Ana bileşen ───────────────────── */

export default function HistoriaMode() {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'summary'>('intro');
  const [difficulty, setDifficulty] = useState<HistoriaDifficulty | 'all'>('all');
  const [sessionScenes, setSessionScenes] = useState<HistoriaScene[]>([]);
  const [sceneIndex, setSceneIndex] = useState(0);

  // Per-question state
  const [selectedTense, setSelectedTense] = useState<TenseIdEs | null>(null);
  const [answer, setAnswer] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Aggregate session stats
  const [sessionStats, setSessionStats] = useState({
    score: 0,
    maxScore: 0,
    tenseCorrect: 0,
    formCorrect: 0,
    hintsUsed: 0,
    tenseMistakes: {} as Partial<Record<TenseIdEs, number>>,
  });

  const [finishedResult, setFinishedResult] = useState<HistoriaSessionResult | null>(null);

  const answerInputRef = useRef<HTMLInputElement | null>(null);

  const currentScene: HistoriaScene | null = sessionScenes[sceneIndex] ?? null;

  const availableByDifficulty = useMemo(() => {
    return {
      all: HISTORIA_SCENES.length,
      A2: HISTORIA_SCENES.filter((s) => s.difficulty === 'A2').length,
      B1: HISTORIA_SCENES.filter((s) => s.difficulty === 'B1').length,
      B2: HISTORIA_SCENES.filter((s) => s.difficulty === 'B2').length,
    };
  }, []);

  // Yeni sahneye geçince input'a odaklan — mobilde klavye açılmaması için
  // zaman kartı seçilene kadar bekliyoruz.
  useEffect(() => {
    if (phase === 'playing' && selectedTense && !submitted) {
      answerInputRef.current?.focus();
    }
  }, [phase, selectedTense, submitted]);

  /* ───────── Seans başlatma ───────── */

  function startSession(diff: HistoriaDifficulty | 'all') {
    const pool = diff === 'all' ? HISTORIA_SCENES : filterScenes([diff as HistoriaDifficulty]);
    const shuffled = shuffleScenes(pool);
    const slice = shuffled.slice(0, Math.min(DEFAULT_SESSION_LENGTH, shuffled.length));
    setDifficulty(diff);
    setSessionScenes(slice);
    setSceneIndex(0);
    resetQuestionState();
    setSessionStats({
      score: 0,
      maxScore: 0,
      tenseCorrect: 0,
      formCorrect: 0,
      hintsUsed: 0,
      tenseMistakes: {},
    });
    setFinishedResult(null);
    setPhase('playing');
  }

  function resetQuestionState() {
    setSelectedTense(null);
    setAnswer('');
    setHintUsed(false);
    setSubmitted(false);
    setShowHint(false);
  }

  /* ───────── Cevap değerlendirme ───────── */

  function handleSubmit(override?: string) {
    if (!currentScene || !selectedTense || submitted) return;
    const userForm = override ?? answer;

    const tenseOk = selectedTense === currentScene.correctTense;
    const formOk = isFormCorrect(userForm, currentScene.correctForm);
    const hintDeduction = hintUsed ? HINT_PENALTY : 0;
    const questionScore = (tenseOk ? 1 : 0) + (formOk ? 2 : 0) - hintDeduction;

    setSessionStats((prev) => {
      const nextTenseMistakes = { ...prev.tenseMistakes };
      if (!tenseOk) {
        nextTenseMistakes[currentScene.correctTense] =
          (nextTenseMistakes[currentScene.correctTense] ?? 0) + 1;
      }
      return {
        score: prev.score + questionScore,
        maxScore: prev.maxScore + 3,
        tenseCorrect: prev.tenseCorrect + (tenseOk ? 1 : 0),
        formCorrect: prev.formCorrect + (formOk ? 1 : 0),
        hintsUsed: prev.hintsUsed + (hintUsed ? 1 : 0),
        tenseMistakes: nextTenseMistakes,
      };
    });

    // Çekim doğruysa günlük hedefe say ve başlık rozetini güncelle.
    if (formOk) {
      addActivityToday(1);
      updateDocumentTitle();
      speakAuto(currentScene.correctForm, { lang: 'es-ES' });
    } else {
      // Yanlış çekim → SRS için hata bankasına ekle.
      try {
        addMistake(currentScene.verb, currentScene.correctTense, currentScene.correctPronoun);
      } catch {
        /* sessizce yut */
      }
    }

    setSubmitted(true);
  }

  function handleNext() {
    if (!currentScene) return;
    const isLast = sceneIndex >= sessionScenes.length - 1;
    if (isLast) {
      finishSession();
      return;
    }
    setSceneIndex((i) => i + 1);
    resetQuestionState();
  }

  function finishSession() {
    const result: HistoriaSessionResult = {
      timestamp: Date.now(),
      scenesPlayed: sessionScenes.length,
      score: sessionStats.score,
      maxScore: sessionStats.maxScore || sessionScenes.length * 3,
      tenseCorrectCount: sessionStats.tenseCorrect,
      formCorrectCount: sessionStats.formCorrect,
      hintsUsed: sessionStats.hintsUsed,
      tenseMistakes: sessionStats.tenseMistakes,
    };
    saveHistoriaSession(result);
    setFinishedResult(result);
    setPhase('summary');
  }

  /* ───────── Giriş ekranı ───────── */

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <Helmet>
          <title>Historia Mode — Conjume</title>
        </Helmet>
        <Navbar />
        <div className="relative overflow-hidden">
          <HistoriaBackground />
          <main className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-32">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Yeni Mod
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3">
                Historia Mode
              </h1>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Kısa bir İspanyolca sahne oku, doğru <span className="font-semibold text-slate-800 dark:text-slate-200">zamanı</span>{' '}
                seç ve <span className="font-semibold text-slate-800 dark:text-slate-200">çekimi</span> yaz. Bir oyun gibi, hikâyeyle öğren.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm p-5 sm:p-6 mb-6"
            >
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Zorluk seviyesi</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['all', 'A2', 'B1', 'B2'] as const).map((d) => {
                  const count = d === 'all' ? availableByDifficulty.all : availableByDifficulty[d];
                  const isSelected = difficulty === d;
                  const label = d === 'all' ? 'Hepsi' : d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`px-3 py-3 rounded-xl text-sm font-semibold border transition-all ${
                        isSelected
                          ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-indigo-400/40'
                      }`}
                    >
                      <div>{label}</div>
                      <div className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                        {count} sahne
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-sm p-5 sm:p-6 mb-8"
            >
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Nasıl oynanır?</p>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex-shrink-0 flex items-center justify-center text-[11px] font-bold">1</span> Kısa sahneyi oku, bağlamı anla.</li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex-shrink-0 flex items-center justify-center text-[11px] font-bold">2</span> Doğru zamanın kartına dokun.</li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex-shrink-0 flex items-center justify-center text-[11px] font-bold">3</span> Fiilin çekimini yaz ve kontrol et.</li>
                <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex-shrink-0 flex items-center justify-center text-[11px] font-bold">★</span> Zaman +1, çekim +2 puan. İpucu −1.</li>
              </ul>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              type="button"
              onClick={() => startSession(difficulty)}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-bold text-base shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all active:scale-[0.99]"
            >
              Seansı Başlat
            </motion.button>
          </main>
        </div>
      </div>
    );
  }

  /* ───────── Özet ekranı ───────── */

  if (phase === 'summary' && finishedResult) {
    const weakest = getWeakestTenseOfSession(finishedResult);
    const pct = finishedResult.maxScore
      ? Math.round((Math.max(0, finishedResult.score) / finishedResult.maxScore) * 100)
      : 0;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <Helmet>
          <title>Historia Mode — Seans Özeti</title>
        </Helmet>
        <Navbar />
        <div className="relative overflow-hidden">
          <HistoriaBackground />
          <main className="relative max-w-xl mx-auto px-4 sm:px-6 pt-24 pb-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white mb-4 shadow-lg shadow-amber-500/30">
                <Trophy className="w-8 h-8" />
              </div>
              <h1 className="font-heading text-3xl font-bold mb-1">Seans Bitti</h1>
              <p className="text-slate-600 dark:text-slate-400">
                {finishedResult.scenesPlayed} sahne tamamlandı
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-6 mb-4"
            >
              <div className="flex items-end justify-between mb-3">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Toplam Puan</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{pct}% başarı</span>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-5xl font-bold bg-gradient-to-r from-indigo-500 to-rose-500 bg-clip-text text-transparent">
                  {Math.max(0, finishedResult.score)}
                </span>
                <span className="text-xl text-slate-500 dark:text-slate-400">/ {finishedResult.maxScore}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="grid grid-cols-3 gap-3 mb-4"
            >
              <StatCard
                icon={<Target className="w-4 h-4" />}
                label="Zaman ✓"
                value={`${finishedResult.tenseCorrectCount}/${finishedResult.scenesPlayed}`}
                color="indigo"
              />
              <StatCard
                icon={<Check className="w-4 h-4" />}
                label="Çekim ✓"
                value={`${finishedResult.formCorrectCount}/${finishedResult.scenesPlayed}`}
                color="emerald"
              />
              <StatCard
                icon={<HelpCircle className="w-4 h-4" />}
                label="İpucu"
                value={`${finishedResult.hintsUsed}`}
                color="amber"
              />
            </motion.div>

            {weakest && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-2xl border border-rose-300/50 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 p-5 mb-6"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                      Bu seansın zayıf noktası
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {TENSES_ES.find((t) => t.id === weakest.tense)?.label ?? weakest.tense}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {weakest.count} soruda yanlış zaman seçtin. Fiil Laboratuvarı'ndan tekrar yapabilirsin.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="flex flex-col gap-3"
            >
              <button
                type="button"
                onClick={() => startSession(difficulty)}
                className="w-full h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Tekrar Oyna
              </button>
              <Link
                to="/"
                className="w-full h-12 rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-white/10"
              >
                <Home className="w-4 h-4" /> Ana Sayfa
              </Link>
            </motion.div>
          </main>
        </div>
      </div>
    );
  }

  /* ───────── Oyun ekranı ───────── */

  if (!currentScene) {
    return null;
  }

  const { before, after } = splitSentence(currentScene.sentenceEs);
  const pronounLabel = PRONOUNS_ES.find((p) => p.id === currentScene.correctPronoun)?.label ?? currentScene.correctPronoun;

  const tenseOk = submitted && selectedTense === currentScene.correctTense;
  const formOk = submitted && isFormCorrect(answer, currentScene.correctForm);
  const progress = ((sceneIndex + (submitted ? 1 : 0)) / sessionScenes.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Helmet>
        <title>Historia Mode — {sceneIndex + 1}/{sessionScenes.length}</title>
      </Helmet>
      <Navbar />
      <div className="relative overflow-hidden">
        <HistoriaBackground />
        <main className="relative max-w-2xl mx-auto px-4 sm:px-6 pt-20 pb-32">
          {/* İlerleme şeridi */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 text-xs font-medium">
              <span className="text-slate-500 dark:text-slate-400">
                Sahne <span className="font-bold text-slate-900 dark:text-white">{sceneIndex + 1}</span> / {sessionScenes.length}
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <Trophy className="w-3.5 h-3.5" /> {Math.max(0, sessionStats.score)} puan
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Sahne kartı (hafif farklı bg) */}
          <AnimatePresence mode="wait">
            <motion.section
              key={currentScene.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-amber-200/50 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/80 to-rose-50/60 dark:from-amber-500/10 dark:to-rose-500/10 backdrop-blur-sm p-5 sm:p-6 mb-5 shadow-sm"
              aria-label="Sahne hikâyesi"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/70 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-white/50 dark:border-white/10">
                  <span className="text-base leading-none" aria-hidden>{THEME_META[currentScene.theme].emoji}</span>
                  {THEME_META[currentScene.theme].label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${DIFFICULTY_BADGE[currentScene.difficulty]}`}>
                  {currentScene.difficulty}
                </span>
              </div>
              <p className="text-[15px] sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
                {currentScene.storyEs}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
                {currentScene.storyTr}
              </p>
            </motion.section>
          </AnimatePresence>

          {/* Boşluklu cümle */}
          <section className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-5 sm:p-6 mb-5">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <BookOpen className="w-3.5 h-3.5" /> Cümleyi tamamla
            </div>
            <p className="text-lg sm:text-xl leading-relaxed text-slate-900 dark:text-white font-medium">
              <span>{before}</span>
              <span
                className={`inline-flex items-baseline mx-1 px-2 py-0.5 rounded-lg border-2 border-dashed ${
                  submitted
                    ? formOk
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : 'border-indigo-400/50 dark:border-indigo-400/40 bg-indigo-500/5 text-indigo-600 dark:text-indigo-300'
                } font-semibold transition-colors`}
              >
                {submitted ? currentScene.correctForm : '_____'}
              </span>
              <span>{after}</span>
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{pronounLabel}</span>{' '}
              · fiil: <span className="font-mono text-slate-700 dark:text-slate-200">{currentScene.verb}</span>
            </p>
          </section>

          {/* Zaman kartları */}
          <section className="mb-5">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 inline-flex items-center justify-center text-[11px] font-bold">1</span>
              Zamanı seç
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {TENSE_OPTIONS.map((tId) => {
                const isSelected = selectedTense === tId;
                const isCorrect = submitted && tId === currentScene.correctTense;
                const isWrongPicked = submitted && isSelected && tId !== currentScene.correctTense;
                return (
                  <button
                    key={tId}
                    type="button"
                    disabled={submitted}
                    onClick={() => setSelectedTense(tId)}
                    className={`relative text-left px-3 py-3 rounded-xl border transition-all active:scale-[0.99] ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/40'
                        : isWrongPicked
                        ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/40'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:border-indigo-400/50 dark:hover:border-indigo-400/50'
                    } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                      {TENSE_SHORT_LABEL[tId]}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                      {TENSE_HINT[tId]}
                    </div>
                    {isCorrect && (
                      <Check className="absolute top-2 right-2 w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {isWrongPicked && (
                      <X className="absolute top-2 right-2 w-4 h-4 text-rose-600 dark:text-rose-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Cevap input */}
          <section className="mb-5">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 inline-flex items-center justify-center text-[11px] font-bold">2</span>
              Çekimi yaz
            </p>
            <div className="relative">
              <input
                ref={answerInputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitted && selectedTense && answer.trim()) {
                    e.preventDefault();
                    handleSubmit();
                  } else if (e.key === 'Enter' && submitted) {
                    e.preventDefault();
                    handleNext();
                  }
                }}
                disabled={submitted || !selectedTense}
                placeholder={selectedTense ? `${currentScene.verb} → ...` : 'Önce bir zaman seç'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`w-full h-14 pl-4 pr-12 rounded-xl text-lg font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-800/60 border-2 transition-colors focus:outline-none ${
                  submitted
                    ? formOk
                      ? 'border-emerald-500/60'
                      : 'border-rose-500/60'
                    : 'border-slate-200 dark:border-white/10 focus:border-indigo-500/60'
                } disabled:opacity-60`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <MicButton
                  size={28}
                  lang="es-ES"
                  disabled={submitted || !selectedTense}
                  onResult={(res: ListenResult) => {
                    const match = matchTranscript(res.alternatives, currentScene.correctForm);
                    const picked = match ?? res.transcript;
                    setAnswer(picked);
                  }}
                />
              </div>
            </div>
          </section>

          {/* İpucu aç/kapa */}
          {!submitted && (
            <div className="mb-5">
              {!showHint ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowHint(true);
                    setHintUsed(true);
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> İpucu göster (-{HINT_PENALTY} puan)
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-amber-300/50 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">İpucu</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {currentScene.whyTense}
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* Aksiyon */}
          {!submitted ? (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!selectedTense || !answer.trim()}
              className="w-full h-14 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-base shadow-md shadow-indigo-500/30 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-500"
            >
              Kontrol Et
            </button>
          ) : (
            <FeedbackPanel
              scene={currentScene}
              tenseOk={tenseOk}
              formOk={formOk}
              userAnswer={answer}
              userTense={selectedTense}
              hintUsed={hintUsed}
              onNext={handleNext}
              isLast={sceneIndex >= sessionScenes.length - 1}
            />
          )}

          {/* Alt linkler */}
          <div className="mt-8 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setPhase('intro')}
              className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              ← Çık
            </button>
            <span>
              Zorluk: <span className="font-semibold text-slate-700 dark:text-slate-300">{difficulty === 'all' ? 'Hepsi' : difficulty}</span>
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ───────────────────── Alt bileşenler ───────────────────── */

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'indigo' | 'emerald' | 'amber' }) {
  const colorMap = {
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/15',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/15',
  } as const;
  return (
    <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-3 text-center">
      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${colorMap[color]} mb-1.5`}>
        {icon}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
        {label}
      </div>
      <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{value}</div>
    </div>
  );
}

function FeedbackPanel({
  scene,
  tenseOk,
  formOk,
  userAnswer,
  userTense,
  hintUsed,
  onNext,
  isLast,
}: {
  scene: HistoriaScene;
  tenseOk: boolean;
  formOk: boolean;
  userAnswer: string;
  userTense: TenseIdEs | null;
  hintUsed: boolean;
  onNext: () => void;
  isLast: boolean;
}) {
  const bothOk = tenseOk && formOk;
  const points = (tenseOk ? 1 : 0) + (formOk ? 2 : 0) - (hintUsed ? HINT_PENALTY : 0);
  const correctTenseLabel = TENSES_ES.find((t) => t.id === scene.correctTense)?.label ?? scene.correctTense;
  const pickedTenseLabel = userTense ? TENSES_ES.find((t) => t.id === userTense)?.label ?? userTense : '—';

  const formRule =
    scene.whyForm ??
    getConjugationRule(scene.verb, scene.correctTense, scene.correctPronoun, 'es', scene.correctForm);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border p-5 ${
        bothOk
          ? 'border-emerald-400/50 bg-emerald-500/10'
          : 'border-rose-400/50 bg-rose-500/10'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {bothOk ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white">
              <Check className="w-3.5 h-3.5" /> Mükemmel!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white">
              <X className="w-3.5 h-3.5" /> Biraz daha
            </span>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 font-bold text-sm ${points >= 2 ? 'text-emerald-600 dark:text-emerald-300' : points > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-rose-600 dark:text-rose-300'}`}>
          {points >= 0 ? '+' : ''}
          {points} puan
        </span>
      </div>

      <div className="space-y-3">
        {/* Zaman satırı */}
        <div className="flex items-start gap-3">
          <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${tenseOk ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            {tenseOk ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Zaman {tenseOk ? '✓' : '✗'} <span className="text-slate-400 dark:text-slate-500 font-normal normal-case tracking-normal">(+1 puan)</span>
            </p>
            {tenseOk ? (
              <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">
                <span className="font-semibold">{correctTenseLabel}</span> doğru seçim.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">
                  Seçtiğin: <span className="font-semibold">{pickedTenseLabel}</span> → Doğrusu: <span className="font-semibold text-emerald-700 dark:text-emerald-300">{correctTenseLabel}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                  {scene.whyTense}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Çekim satırı */}
        <div className="flex items-start gap-3">
          <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${formOk ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            {formOk ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Çekim {formOk ? '✓' : '✗'} <span className="text-slate-400 dark:text-slate-500 font-normal normal-case tracking-normal">(+2 puan)</span>
            </p>
            {formOk ? (
              <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">
                <span className="font-mono font-semibold">{scene.correctForm}</span> — tam isabet.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">
                  Yazdığın: <span className="font-mono line-through decoration-rose-500/80 text-rose-700 dark:text-rose-300">{userAnswer || '—'}</span>{' '}
                  → Doğrusu: <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">{scene.correctForm}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                  {formRule}
                </p>
              </>
            )}
          </div>
        </div>

        {hintUsed && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
            <HelpCircle className="w-3 h-3" /> İpucu kullandın: −{HINT_PENALTY} puan
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-5 w-full h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm transition-all active:scale-[0.99] hover:opacity-90 inline-flex items-center justify-center gap-2"
      >
        {isLast ? 'Sonucu Gör' : 'Sonraki Sahne'} <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
