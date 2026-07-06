import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { getTenses, getTenseGroups, getPronouns } from '../data/verbs';
import type { AppLanguage } from '../data/verbs';
import type { TenseId } from '../data/types';
import {
  getConjugationsForLang,
  getConjugationForTenseForLang,
  verifyConjugationMap,
  getVerbListForLang,
  findInfinitiveByConjugatedForm,
} from '../conjugation/helpers';
import { formatConjugation } from '../conjugation/stemSuffix';
import { checkPasséComposéLogic } from '../conjugation/passeCompose';
import { getRandomVerbForLang } from '../data/commonVerbs';
import {
  getRandomVerbSpanish,
  formatSpanishIrregularSectionTitlePrefix,
  SPANISH_QUIZ_PERSON_IDS,
  type TenseIdEs,
} from '../data/spanish';
import irregularByTenseJson from '../data/irregular_by_tense.json';
import { isIrregularVerb } from '../data/irregularVerbs';
import {
  getTenseBaseXp,
  IRREGULAR_BONUS,
  FIRST_TRY_MULTIPLIER,
} from '../data/xpConfig';
import { getTranslationOrPlaceholder } from '../data/dictionary';
import { SPANISH_VERBS } from '../data/spanish-data';
import { FRENCH_VERBS } from '../data/french-data';
import { formatFrenchIrregularSectionTitlePrefix } from '../data/french';
import irregularByTenseFrJson from '../data/irregular_by_tense_fr.json';
import { getVerbExample } from '../data/verbExamples';
import { getTenseExplanation } from '../data/tenseExplanations';
import { getVerbMetadata } from '../data/verbMetadata';
import { VERB_LEVELS, CEFR_LEVELS, CEFR_COLORS, type CEFRLevel } from '../data/verbLevels';
import { getMistakes, getDueMistakes, addMistake, updateMistakeReview, type MistakeEntry } from '../utils/mistakeBank';
import { getConjugationRule } from '../utils/conjugationRules';
import ErrorAnalysisCard from '../components/ErrorAnalysisCard';
import { getStarredVerbs, toggleStarredVerb, isStarredVerb } from '../utils/starredVerbs';
import { getActivityHistory, getLastNDays, addActivityToday } from '../utils/activityHistory';
import { updateDocumentTitle } from '../utils/dailyGoal';
import { getTotalXP, getLevel, getXPProgress } from '../utils/xpLevel';
import { claimFirstDailyQuizBonus, claimDifferentVerbBonus } from '../utils/xpDailyBonuses';
import { recordWorkedVerb } from '../utils/workedVerbs';
import { tryUnlockPerfectionistBadge, runTimeAttackBadgeChecks, tryUnlockComboKingBadge } from '../utils/xpBadges';
import { recordWeeklyCombo } from '../utils/xpWeeklyStats';
import { getFlashcardDecks, addCardToDeck, type FlashcardDeck } from '../utils/flashcardDecks';
import { useXp } from '../contexts/XpContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { Info, BookOpen, Clock, Shuffle, Volume2 } from 'lucide-react';
import LearningCardDeck from '../components/LearningCardDeck';
import EzberMakinesi from '../components/EzberMakinesi';
import SurvivalMode from '../components/SurvivalMode';
import AuthModal from '../components/AuthModal';
import Navbar from '../components/Navbar';
import AccentKeyboard from '../components/AccentKeyboard';
import PronunciationButton from '../components/PronunciationButton';
import { sanitizeForDisplay } from '../utils/sanitize';
import { speakAuto } from '../utils/speech';
import MicButton from '../components/speech/MicButton';
import {
  getRuleHint,
  getLetterMask,
  markRevealedAfterThreeAttempts,
  markHintUsed,
} from '../utils/hintEngine';
import SmartHintBubble from '../components/SmartHintBubble';
import TenseCardOverlay from '../components/tenseCard/TenseCardOverlay';
import { exampleSentences } from '../data/example_sentences';
import { exampleSentencesFr } from '../data/example_sentences_fr.js';
import { verbRegimes } from '../data/verb_regimes';
import { collocations } from '../data/collocations';
import { regionalVariants } from '../data/regional_variants';
import { serEstarRules } from '../data/ser_estar';
import { timeMarkers } from '../data/time_markers';
import {
  fetchSynonyms,
  type VerbSynonymPayload,
} from '../services/synonyms';
import {
  recordMistake as recordSpanishMistake,
  markResolved as markSpanishMistakeResolved,
  getMistake as getSpanishMistake,
  getUnresolvedMistakes,
  getMistakesForReviewSorted,
  getMistakeMemoryStats,
  type MistakeMemoryEntry,
} from '../lib/mistake_memory.js';
import {
  recordQuizSpacedRepetitionWrong,
  recordQuizSpacedRepetitionCorrect,
  getQuizSpacedRepetitionDueToday,
  isVerbTenseDueForSpacedRepetition,
  type QuizSpacedRepetitionEntry,
} from '../utils/quizSpacedRepetition';
import {
  recordMasteryCorrect,
  recordMasteryWrong,
  sortQuizPronounsByMastery,
  getMasteryDueToday,
  getVerbTenseMasteryRows,
  getVerbOverallMasteryPercent,
  getVerbMasteryDueForVerb,
  isVerbFullyMastered,
  getTodayLocal,
  loadMasteryStore,
  buildMasteryKey,
  MASTERY_LEVEL_META,
  type MasteryDueItem,
} from '../data/masterySystem';

type Mode = 'learning' | 'quiz' | 'review' | 'starred' | 'time-attack' | 'compare' | 'mastery';

/** Hata hafızası banner oturumda kapatma anahtarı (dil ayrımı) */
function mistakeBannerDismissKey(lang: AppLanguage, verb: string, tense: string, person: string) {
  return `${lang}\u0000${verb}\u0000${tense}\u0000${person}`;
}

const SPANISH_TENSE_SHORT: Record<string, string> = {
  presente: 'Pres.',
  imperfecto: 'Imp.',
  preterito: 'Indef.',
  'preterito-perfecto': 'Perf.',
  pluscuamperfecto: 'Plusc.',
  futuro: 'Fut.',
  'futuro-compuesto': 'Fut.c.',
  condicional: 'Cond.',
  'subjuntivo-presente': 'Subj.',
};

const FRENCH_TENSE_SHORT: Record<string, string> = {
  present: 'Prés.',
  imparfait: 'Imp.',
  'passe-simple': 'P.s.',
  'passe-compose': 'P.c.',
  'futur-simple': 'Fut.',
  'subjonctif-present': 'Subj.',
};

function normalizeVerbKeyForSet(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

type MistakeReplaySessionState = { queue: MistakeMemoryEntry[]; index: number; resolvedInSession: number };

type QuizXpSessionBreakdown = {
  /** Her doğru için TENSE_XP toplamı (çarpansız temel) */
  correctBaseXp: number;
  firstTryBonus: number;
  irregularBonus: number;
  /** Tersine mod vb. ekstra */
  specialBonus: number;
  hintPenalty: number;
  dailyFirst: number;
  dailyVerb: number;
  flawless: number;
};

type QuizCompletionSummary = {
  totalEarnedSession: number;
  breakdown: QuizXpSessionBreakdown;
  startLevel: number;
  endLevel: number;
  leveledUp: boolean;
  barFromPercent: number;
  barToPercent: number;
};

type AppMode = 'conjugation' | 'ezber';

/** Zamana Karşı zorluk seviyesi */
type TimeAttackDifficulty = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  label: string;
  description: string;
  levels: CEFRLevel[];
  tenses: { es: string[]; fr: string[] };
  secondsPerQuestion: number;
  multiplier: number;
  colorToken: 'emerald' | 'amber' | 'rose';
  emoji: string;
}

/** Zamana Karşı — dil-bağımsız ayarlar (etiketler i18n: timeAttack.*) */
type TimeAttackBaseConfig = Omit<DifficultyConfig, 'label' | 'description'>;

const TIME_ATTACK_BASE: Record<TimeAttackDifficulty, TimeAttackBaseConfig> = {
  easy: {
    levels: ['A1', 'A2'],
    tenses: { es: ['presente'], fr: ['present'] },
    secondsPerQuestion: 15,
    multiplier: 1,
    colorToken: 'emerald',
    emoji: '🌱',
  },
  medium: {
    levels: ['A1', 'A2', 'B1'],
    tenses: {
      es: ['presente', 'preterito', 'futuro'],
      fr: ['present', 'passe-compose', 'imparfait'],
    },
    secondsPerQuestion: 10,
    multiplier: 2,
    colorToken: 'amber',
    emoji: '⚡',
  },
  hard: {
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    tenses: {
      es: ['presente', 'imperfecto', 'preterito', 'futuro', 'condicional', 'subjuntivo-presente'],
      fr: ['present', 'imparfait', 'passe-compose', 'futur-simple', 'subjonctif-present'],
    },
    secondsPerQuestion: 7,
    multiplier: 3,
    colorToken: 'rose',
    emoji: '🔥',
  },
};

/** Kalan süreye göre Zamana Karşı timer renk evresi (>8 yeşil, >4 turuncu, ≤4 kırmızı). */
type TimeAttackTimerPhase = 'green' | 'amber' | 'red';

function getTimeAttackTimerPhase(secondsLeft: number): TimeAttackTimerPhase {
  if (secondsLeft > 8) return 'green';
  if (secondsLeft > 4) return 'amber';
  return 'red';
}

const TIME_ATTACK_TIMER_PHASE_CLASS: Record<
  TimeAttackTimerPhase,
  { text: string; bar: string }
> = {
  green: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'rgb(16 185 129)',
  },
  amber: {
    text: 'text-amber-500 dark:text-amber-400',
    bar: 'rgb(245 158 11)',
  },
  red: {
    text: 'text-red-600 dark:text-red-400 animate-time-attack-timer-pulse',
    bar: 'rgb(239 68 68)',
  },
};

/** Zamana Karşı skor kaydı (localStorage). */
interface TimeAttackScoreEntry {
  score: number;
  combo: number;
  date: string;
  verb: string;
  tense: string;
  lang: 'fr' | 'es';
  difficulty?: TimeAttackDifficulty;
}

const TIME_ATTACK_STORAGE_KEY_PREFIX = 'diloloji-time-attack-scores';
const TIME_ATTACK_MAX_ENTRIES = 50;
const EXERCISE_MODE_PREFERENCE_KEY = 'exercise_mode_preference';
const EXERCISE_INTERACTION_KEY = 'exercise_interaction_mode';
type QuizInteractionMode = 'write' | 'choice' | 'mixed' | 'listen' | 'reverse';
const VERB_HISTORY_STORAGE_KEY = 'verb_history_v1';
const HISTORY_PANEL_OPEN_KEY = 'history_panel_open';
const SYNONYM_REGISTER_STYLES: Record<'formal' | 'informal' | 'neutral', string> = {
  formal: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/35',
  informal: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/35',
  neutral: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/35',
};

type StaticExample = {
  es?: string;
  fr?: string;
  tr?: string;
  person?: string;
} | null;

/** example_sentences.js içindeki person metni ↔ uygulama pronoun id */
const QUIZ_EXAMPLE_PRONOUN_TOKENS: Record<string, string[]> = {
  yo: ['yo'],
  tu: ['tu', 'tú'],
  el: ['el', 'él', 'ella', 'usted'],
  nosotros: ['nosotros', 'nosotras'],
  vosotros: ['vosotros', 'vosotras'],
  ellos: ['ellos', 'ellas', 'ustedes'],
};

const QUIZ_EXAMPLE_PRONOUN_TOKENS_FR: Record<string, string[]> = {
  je: ['je'],
  tu: ['tu'],
  il: ['il', 'elle', 'il/elle'],
  nous: ['nous'],
  vous: ['vous'],
  ils: ['ils', 'elles', 'ils/elles'],
};

function normalizeQuizExamplePersonPart(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function examplePersonMatchesPronoun(
  examplePerson: string | undefined,
  pronounId: string,
  lang: AppLanguage
): boolean {
  if (!examplePerson?.trim()) return true;
  const segments = examplePerson
    .split(/\s*\/\s*|\s*,\s*|\s+(?:et|y)\s+/i)
    .map(normalizeQuizExamplePersonPart)
    .filter(Boolean);
  const table = lang === 'fr' ? QUIZ_EXAMPLE_PRONOUN_TOKENS_FR : QUIZ_EXAMPLE_PRONOUN_TOKENS;
  const allowed = (table[pronounId] ?? []).map(normalizeQuizExamplePersonPart);
  if (allowed.length === 0) return false;
  return segments.some((seg) => allowed.some((a) => seg === a));
}

function renderQuizExampleLine(sentence: string, highlightForm: string | null): ReactNode {
  if (!highlightForm?.trim() || !sentence) return sentence;
  const fl = highlightForm.length;
  const parts: ReactNode[] = [];
  let i = 0;
  let searchStart = 0;
  const isLetter = (c: string) => (c ? /\p{L}/u.test(c) : false);
  const target = highlightForm.toLowerCase();
  let foundAny = false;
  while (searchStart <= sentence.length - fl) {
    const slice = sentence.slice(searchStart, searchStart + fl);
    if (slice.toLowerCase() !== target) {
      searchStart += 1;
      continue;
    }
    const idx = searchStart;
    const before = idx > 0 ? sentence[idx - 1] : '';
    const after = idx + fl < sentence.length ? sentence[idx + fl] : '';
    if (isLetter(before) || isLetter(after)) {
      searchStart = idx + 1;
      continue;
    }
    if (idx > i) parts.push(sentence.slice(i, idx));
    parts.push(
      <strong
        key={`quiz-ex-hl-${idx}`}
        className="font-bold not-italic"
        style={{ color: 'var(--accent-purple)' }}
      >
        {sentence.slice(idx, idx + fl)}
      </strong>
    );
    i = idx + fl;
    searchStart = i;
    foundAny = true;
  }
  if (!foundAny) return sentence;
  if (i < sentence.length) parts.push(sentence.slice(i));
  return <>{parts}</>;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normMcForm(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Alıştırma çoktan seçmeli: 1 doğru + 3 yanlış (aynı zaman, farklı şahıslar). */
function buildFocusMultipleChoice(
  correct: string,
  conjugations: Record<string, string>,
  currentPid: string,
  ids: string[]
): string[] {
  const cNorm = normMcForm(correct);
  const pool = ids
    .filter((id) => id !== currentPid)
    .map((id) => conjugations[id]?.trim())
    .filter((v): v is string => !!v)
    .filter((v) => normMcForm(v) !== cNorm);
  const uniq: string[] = [];
  for (const p of pool) {
    if (!uniq.some((u) => normMcForm(u) === normMcForm(p))) uniq.push(p);
  }
  const wrongPick = shuffleArray(uniq).slice(0, 3);
  const pad = [...wrongPick];
  let k = 0;
  while (pad.length < 3 && pool.length > 0) {
    pad.push(pool[k % pool.length]);
    k++;
  }
  while (pad.length < 3) {
    pad.push(`(${correct})*`);
  }
  return shuffleArray([correct, ...pad.slice(0, 3)]);
}

function markerColorClass(color: string): string {
  const map: Record<string, string> = {
    teal: 'border-teal-500/35 bg-teal-500/15 text-teal-700 dark:text-teal-300',
    blue: 'border-blue-500/35 bg-blue-500/15 text-blue-700 dark:text-blue-300',
    purple: 'border-violet-500/35 bg-violet-500/15 text-violet-700 dark:text-violet-300',
    green: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    amber: 'border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-300',
    pink: 'border-pink-500/35 bg-pink-500/15 text-pink-700 dark:text-pink-300',
    coral: 'border-orange-500/35 bg-orange-500/15 text-orange-700 dark:text-orange-300',
  };
  return map[color] ?? map.teal;
}

function storageKeyFor(difficulty: TimeAttackDifficulty): string {
  return `${TIME_ATTACK_STORAGE_KEY_PREFIX}-${difficulty}`;
}

function getTimeAttackScores(difficulty: TimeAttackDifficulty): TimeAttackScoreEntry[] {
  try {
    const raw = localStorage.getItem(storageKeyFor(difficulty));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TimeAttackScoreEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTimeAttackScore(
  entry: TimeAttackScoreEntry,
  difficulty: TimeAttackDifficulty
): { highScore: number; lastFive: TimeAttackScoreEntry[] } {
  const list = getTimeAttackScores(difficulty);
  list.push({ ...entry, difficulty });
  const trimmed = list.slice(-TIME_ATTACK_MAX_ENTRIES);
  try {
    localStorage.setItem(storageKeyFor(difficulty), JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
  const highScore = trimmed.length > 0 ? Math.max(...trimmed.map((e) => e.score)) : 0;
  const lastFive = [...trimmed].reverse().slice(0, 5);
  return { highScore, lastFive };
}

/** Zamir id → Türkçe şahıs açıklaması (tersine arama bilgi kartı için) */
const PRONOUN_PERSON_LABEL: Record<string, string> = {
  je: '1. Tekil Şahıs',
  tu: '2. Tekil Şahıs',
  il: '3. Tekil Şahıs',
  nous: '1. Çoğul Şahıs',
  vous: '2. Çoğul Şahıs',
  ils: '3. Çoğul Şahıs',
  yo: '1. Tekil Şahıs',
  el: '3. Tekil Şahıs',
  nosotros: '1. Çoğul Şahıs',
  vosotros: '2. Çoğul Şahıs',
  ellos: '3. Çoğul Şahıs',
};

/** Dönüşlü zamir: FR je→me, tu→te, il→se, nous→nous, vous→vous, ils→se; ES yo→me, tu→te, el→se, nosotros→nos, vosotros→os, ellos→se */
function getReflexivePronoun(pronounId: string, lang: AppLanguage): string {
  if (lang === 'fr') {
    const map: Record<string, string> = { je: 'me', tu: 'te', il: 'se', nous: 'nous', vous: 'vous', ils: 'se' };
    return map[pronounId] ?? '';
  }
  const map: Record<string, string> = { yo: 'me', tu: 'te', el: 'se', nosotros: 'nos', vosotros: 'os', ellos: 'se' };
  return map[pronounId] ?? '';
}

/** Mock: Dönüşlü/Olumsuz state'ine göre çekim metnini UI'da dönüştürür (API bağlanana kadar placeholder). */
function formatConjugationForDisplay(
  raw: string,
  pronounId: string,
  lang: AppLanguage,
  isReflexive: boolean,
  isNegative: boolean
): string {
  if (!raw || raw === '—') return raw;
  let out = raw;
  if (isReflexive) {
    const refl = getReflexivePronoun(pronounId, lang);
    if (refl) out = `${refl} ${out}`;
  }
  if (isNegative) {
    if (lang === 'fr') out = `ne ${out} pas`;
    else out = `no ${out}`;
  }
  return out;
}

/** Zamana Karşı: rastgele fiil + zamir + zaman (dil + zorluk bazlı). */
function getRandomTimeAttackQuestion(
  lang: AppLanguage,
  difficulty: TimeAttackDifficulty = 'medium'
): { verbKey: string; pronoun: string; tense: string } | null {
  const cfg = TIME_ATTACK_BASE[difficulty];
  const verbLang = lang === 'es' ? 'es' : 'fr';
  const pronouns = getPronouns(lang);
  const pronounIds = pronouns.map((p) => p.id);

  // Zorluk seviyelerine göre fiil havuzu
  const pool: string[] = [];
  for (const lvl of cfg.levels) {
    const verbsAtLevel = VERB_LEVELS[verbLang]?.[lvl] ?? [];
    pool.push(...verbsAtLevel);
  }
  let verbPool: string[] | null = pool.length > 0 ? pool : null;
  if (difficulty === 'easy' && lang === 'fr' && verbPool) {
    const regular = new Set(
      FRENCH_VERBS.filter((v) => !v.is_irregular).map((v) => normalizeVerbKeyForSet(v.infinitive))
    );
    const filtered = [...new Set(verbPool)].filter((vi) => regular.has(normalizeVerbKeyForSet(vi)));
    if (filtered.length > 0) verbPool = filtered;
  }

  // Zorluğa göre zaman havuzu
  const tensePool = cfg.tenses[verbLang];

  for (let i = 0; i < 25; i++) {
    const verb = verbPool
      ? verbPool[Math.floor(Math.random() * verbPool.length)]
      : getRandomVerbForLang(lang);
    const tense = tensePool[Math.floor(Math.random() * tensePool.length)];
    const result = getConjugationsForLang(verb, tense, lang);
    if (!result.ok) continue;
    const pronoun = pronounIds[Math.floor(Math.random() * pronounIds.length)];
    return { verbKey: result.infinitive, pronoun, tense };
  }
  // Fallback: herhangi bir zaman/fiil
  for (let i = 0; i < 10; i++) {
    const verb = getRandomVerbForLang(lang);
    const tenses = getTenses(lang);
    const tense = tenses[Math.floor(Math.random() * tenses.length)].id;
    const result = getConjugationsForLang(verb, tense, lang);
    if (!result.ok) continue;
    const pronoun = pronounIds[Math.floor(Math.random() * pronounIds.length)];
    return { verbKey: result.infinitive, pronoun, tense };
  }
  return null;
}

/** Seçili dile göre boş cevap map'i (zamir id -> '') */
function getInitialUserAnswers(lang: AppLanguage): Record<string, string> {
  return Object.fromEntries(getPronouns(lang).map((p) => [p.id, '']));
}

function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
    .normalize('NFC')
    .trim();
}

/** Zamirli doğru cevaptan sadece fiil kısmını çıkarır (elision dahil: j'aime → aime). */
function stripPronounPrefix(normalizedCorrect: string): string {
  return normalizedCorrect
    .replace(
      /^(j'|je |tu |il\/elle |il |elle |nous |vous |ils\/elles |ils |elles |yo |tú |él\/ella |él |ella |nosotros |vosotros |ellos\/ellas |ellos |ellas )/i,
      ''
    )
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export type AnswerCheckResult = 'correct' | 'wrong' | 'typo';

/**
 * Akıllı cevap kontrolü: normalize + tam eşleşme veya 1 karakter farkı (typo).
 * typo = sarı uyarı, yanlış sayılmaz, bir sonraki soruda tekrar sorulur.
 */
function checkAnswer(user: string, correct: string): AnswerCheckResult {
  const a = normalizeAnswer(user);
  if (a === '') return 'wrong';
  const fullNorm = normalizeAnswer(correct);
  const verbOnly = stripPronounPrefix(fullNorm);
  if (a === verbOnly || a === fullNorm) return 'correct';
  const distVerb = levenshteinDistance(a, verbOnly);
  const distFull = levenshteinDistance(a, fullNorm);
  if (distVerb === 1 || distFull === 1) return 'typo';
  return 'wrong';
}

/** checkAnswer ile uyumlu boolean (mevcut kullanımlar için). */
function checkOne(user: string, correct: string): boolean {
  return checkAnswer(user, correct) === 'correct';
}

/** Düzenli kökten sapan harfler: aksanlı ve özel karakterler (ç, œ, æ). Her karakter için highlight mı döner. */
function getHighlightRuns(text: string): { char: string; highlight: boolean }[] {
  const result: { char: string; highlight: boolean }[] = [];
  const special = new Set('àâäéèêëïîôùûüÿçœæÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ');
  for (const c of text) {
    const hasAccent = c.normalize('NFD').length > 1 || special.has(c);
    result.push({ char: c, highlight: hasAccent });
  }
  return result;
}

/** Çekim değerinin gösterilebilir olup olmadığını döner. */
function isConjugationValueMissing(value: string | undefined): boolean {
  return value == null || String(value).trim() === '';
}

/** Kök + ek renklendirmeli çekim: kök varsayılan renkte (aksan vurgusu turuncu), ek indigo. */
function ConjugationWithStemSuffix({
  text,
  tenseId,
  lang,
}: {
  text: string;
  tenseId: string;
  lang: AppLanguage;
}) {
  const { t } = useTranslation();
  if (isConjugationValueMissing(text)) {
    return (
      <span
        className="text-amber-600 dark:text-amber-400 italic text-sm"
        title={t('verbLab.noDataForPerson')}
      >
        {t('verbLab.dataMissing')}
      </span>
    );
  }
  const { stem, suffix } = formatConjugation(text, tenseId, lang);
  const stemRuns = getHighlightRuns(stem);
  return (
    <span className="text-slate-900 dark:text-slate-100 font-medium print:text-black">
      {stemRuns.map((r, i) =>
        r.highlight ? (
          <span key={i} className="font-bold text-orange-600 dark:text-orange-400 print:text-black print:font-normal">
            {r.char}
          </span>
        ) : (
          <span key={i}>{r.char}</span>
        )
      )}
      {suffix ? (
        <span className="text-indigo-500 dark:text-indigo-400 font-semibold print:text-slate-600 print:!text-slate-600">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

/** Aynı çekim köküne sahip fiilleri döner (örn. venir → revenir, devenir). En uzun ortak sonekten aile oluşturur. */
function getVerbFamily(verbKey: string, verbList: string[]): string[] {
  if (!verbKey || verbList.length === 0) return [];
  const minSuffixLength = 4;
  for (let len = verbKey.length - 1; len >= minSuffixLength; len--) {
    const suffix = verbKey.slice(-len);
    const family = verbList.filter((v) => v.endsWith(suffix));
    if (family.length >= 2 && family.some((v) => v !== verbKey)) {
      return family.filter((v) => v !== verbKey);
    }
  }
  return [];
}

/** Fransızca çekim metninden zamir önekini kaldır (je parle → parle). */
function stripFrenchPronounFromConjugation(full: string): string {
  return full
    .replace(
      /^(j'|je\s+|tu\s+|il\/elle\s+|il\s+|elle\s+|nous\s+|vous\s+|ils\/elles\s+|ils\s+|elles\s+)/i,
      ''
    )
    .trim();
}

/** Fransızca telaffuz karşılaştırması için “ses” anahtarı: sonek -e, -es, -ent sessiz sayılır. */
function getFrenchPhoneticKey(verbPart: string): string {
  const lower = verbPart.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return lower
    .replace(/(e|es|ent)$/, '')
    .replace(/(ais|ait|ions|iez|aient)$/, '');
}

/**
 * Fransızca çekimlerde aynı okunuşa sahip şahısları gruplar.
 * Döner: Map<phoneticKey, { pronounIds: string[]; key: string }> — sadece 2+ üyeli gruplar.
 */
function getFrenchHomophoneGroups(
  conjugations: Record<string, string>,
  pronounIds: { id: string }[]
): Map<string, { pronounIds: string[]; key: string }> {
  const byKey = new Map<string, string[]>();
  for (const { id } of pronounIds) {
    const full = conjugations[id];
    if (!full) continue;
    const verbPart = stripFrenchPronounFromConjugation(full);
    const key = getFrenchPhoneticKey(verbPart);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(id);
  }
  const result = new Map<string, { pronounIds: string[]; key: string }>();
  byKey.forEach((pronounIdsList, key) => {
    if (key && pronounIdsList.length >= 2) {
      result.set(key, { pronounIds: pronounIdsList, key });
    }
  });
  return result;
}

/** Tarayıcı ses sentezi ile metni seçili dilde (fr-FR veya es-ES) okur */
function speakConjugation(text: string, lang: AppLanguage) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text.trim());
  u.lang = lang === 'es' ? 'es-ES' : 'fr-FR';
  u.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6a8 8 0 010 12m-4.243-9.757a12 12 0 010 17.514" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9v6h3.5l4-4-4-4H3z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="13" height="15" rx="2" />
      <path d="M5 6h2v14h10v2H5a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 15l-5-5" />
    </svg>
  );
}

function DiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
      <circle cx="16" cy="8" r="1.25" fill="currentColor" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
      <circle cx="8" cy="16" r="1.25" fill="currentColor" />
      <circle cx="16" cy="16" r="1.25" fill="currentColor" />
    </svg>
  );
}

/** Göz ikonu: Ezber Modu (Active Recall) toggle için. */
function EyeIcon({ open, className }: { open?: boolean; className?: string }) {
  if (open) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2" />
    </svg>
  );
}

/** Yıldız ikonu: outline (boş) veya filled (dolu). */
function StarIcon({ filled, className }: { filled?: boolean; className?: string }) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function SpanishMistakeRecallBanner({
  mm,
  pronounLabel,
  tenseLabel,
  onDismiss,
  compact = false,
}: {
  mm: MistakeMemoryEntry;
  pronounLabel: string;
  tenseLabel: string;
  onDismiss: () => void;
  /** Alıştırma: tek ince satır */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-500/20 dark:border-amber-400/18 bg-amber-500/[0.07] dark:bg-amber-400/[0.09] px-2 py-1 text-[11px] sm:text-xs text-amber-900/85 dark:text-amber-100/90">
        <p className="min-w-0 flex-1 break-words" title={`${pronounLabel} · ${tenseLabel}`}>
          <span aria-hidden>⚠️</span> {t('verbLab.wasWrong')}{' '}
          <span className="lowercase">{mm.lastAnswer}</span> → {t('verbLab.correctIs')}{' '}
          <strong className="font-semibold text-amber-950 dark:text-amber-50">{mm.correctAnswer}</strong>
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded px-1 text-amber-700/90 dark:text-amber-200/90 hover:bg-amber-500/15 focus:outline-none focus:ring-1 focus:ring-amber-500/40 text-sm leading-none"
          aria-label={t('verbLab.closeWarning')}
        >
          ×
        </button>
      </div>
    );
  }
  return (
    <div className="mb-2 rounded-lg border border-amber-400/80 dark:border-amber-500/45 bg-amber-50/95 dark:bg-amber-950/40 px-3 py-2.5 text-left text-sm text-amber-950 dark:text-amber-100 shadow-sm">
      <div className="flex justify-between gap-2 items-start">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">⚠️ {t('verbLab.mistakeRecallHeading')}</p>
          <p className="text-xs text-amber-900/90 dark:text-amber-200/90">
            {t('verbLab.mistakeRecallDetail', {
              pronoun: pronounLabel,
              tense: tenseLabel,
              answer: mm.lastAnswer,
            })}
          </p>
          <p className="text-xs">
            {t('verbLab.correctIs')}{' '}
            <strong className="text-amber-900 dark:text-amber-50">{mm.correctAnswer}</strong>
            <span className="text-amber-800/85 dark:text-amber-200/85"> {t('verbLab.accentNote')}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-base leading-none text-amber-800 dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-500/25 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          aria-label={t('verbLab.closeWarning')}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function Page() {
  const { selectedLanguage, setSelectedLanguage } = useLanguage();

  const tensesForLang = useMemo(() => getTenses(selectedLanguage), [selectedLanguage]);
  const pronounsForLang = useMemo(() => getPronouns(selectedLanguage), [selectedLanguage]);
  const tenseGroupsForLang = useMemo(() => getTenseGroups(selectedLanguage), [selectedLanguage]);
  const pronounIds = useMemo(() => pronounsForLang.map((p) => p.id), [pronounsForLang]);

  /** Çekim map'ini güvenle al; hata/undefined durumunda boş obje döner (render'da throw önlenir). */
  const getSafeConjugationMap = useCallback(
    (vKey: string, tenseId: string, lang: AppLanguage): Record<string, string> => {
      try {
        const m = getConjugationForTenseForLang(vKey, tenseId, lang);
        return m && typeof m === 'object' ? m : {};
      } catch {
        return {};
      }
    },
    []
  );

  const location = useLocation();
  const navigate = useNavigate();
  /** Uygulama modu: URL'den türetilir */
  const appMode: AppMode = location.pathname === '/ezber-makinesi' ? 'ezber' : 'conjugation';

  const { user } = useAuth();
  const { addXP: rawAddXP, showFloatingXp: rawShowFloatingXp, level } = useXp();
  /** XP sadece giriş yapmış kullanıcılar için kazanılır (misafirler için no-op). */
  const addXP = useCallback((amount: number) => (user ? rawAddXP(amount) : 0), [user, rawAddXP]);
  const showFloatingXp = useCallback(
    (text: string, x: number, y: number) => {
      if (user) rawShowFloatingXp(text, x, y);
    },
    [user, rawShowFloatingXp]
  );
  const { t } = useTranslation();

  const difficultyConfig = useMemo((): Record<TimeAttackDifficulty, DifficultyConfig> => {
    const mk = (d: TimeAttackDifficulty): DifficultyConfig => ({
      ...TIME_ATTACK_BASE[d],
      label:
        d === 'easy'
          ? t('timeAttack.easy')
          : d === 'medium'
            ? t('timeAttack.medium')
            : t('timeAttack.hard'),
      description:
        d === 'easy'
          ? t('timeAttack.easyDesc')
          : d === 'medium'
            ? t('timeAttack.mediumDesc')
            : t('timeAttack.hardDesc'),
    });
    return { easy: mk('easy'), medium: mk('medium'), hard: mk('hard') };
  }, [t]);

  const [verbInput, setVerbInput] = useState('');
  const [verbKey, setVerbKey] = useState<string | null>(null);
  const [selectedCEFRLevel, setSelectedCEFRLevel] = useState<CEFRLevel | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [regimeOpen, setRegimeOpen] = useState(false);
  const [collocationOpen, setCollocationOpen] = useState(false);
  const [regionalOpen, setRegionalOpen] = useState(false);
  const [serEstarOverlayOpen, setSerEstarOverlayOpen] = useState(false);
  const [serEstarAnswer, setSerEstarAnswer] = useState<'ser' | 'estar' | null>(null);
  const [activeTimeMarkerTip, setActiveTimeMarkerTip] = useState<string | null>(null);
  const [collocationLevelFilter, setCollocationLevelFilter] = useState<'A1' | 'A2' | 'B1'>('A1');
  const [activeCollocationTip, setActiveCollocationTip] = useState<string | null>(null);
  const [showAllIrregulars, setShowAllIrregulars] = useState(false);
  /** Sol panel: düzensiz fiiller bölümü varsayılan kapalı */
  const [irregularLeftPanelOpen, setIrregularLeftPanelOpen] = useState(false);
  const [synonymData, setSynonymData] = useState<VerbSynonymPayload | null>(null);
  const [synonymLoading, setSynonymLoading] = useState(false);
  const [showSynonymSection, setShowSynonymSection] = useState(false);
  const [conjugations, setConjugations] = useState<Record<string, string> | null>(null);
  /** Tersine arama: kullanıcı çekim yazdığında gösterilecek bilgi kartı (örn. "suis → être, Présent - 1. Tekil") */
  const [reverseLookupInfo, setReverseLookupInfo] = useState<{
    searched: string;
    infinitive: string;
    tenseLabel: string;
    pronounLabel: string;
  } | null>(null);
  /** Türkçe anlam: statik / yerel kaynaklar */
  const [translation, setTranslation] = useState<string | null>(null);
  const [dynamicMeaning, setDynamicMeaning] = useState<string | null>(null);
  const [selectedTense, setSelectedTense] = useState<string>(() => getTenses('es')[0].id);
  const [mode, setMode] = useState<Mode>('learning');
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(() => getInitialUserAnswers('es'));
  const [quizFeedback, setQuizFeedback] = useState<Record<string, 'correct' | 'wrong' | 'typo' | null>>(() =>
    Object.fromEntries(getPronouns('es').map((p) => [p.id, null as 'correct' | 'wrong' | null]))
  );
  /** Passé Composé için özel ipuçları (Fransızca); İspanyolca için boş kullanılabilir */
  const [quizPasséHint, setQuizPasséHint] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(getPronouns('es').map((p) => [p.id, null as string | null]))
  );
  /**
   * Akıllı İpucu Sistemi (alıştırma modu, soru-bazlı):
   *   quizAttempts: her şahıs için kaç kez yanlış girildi (0..3). 3'te tam cevap gösterilir.
   *   quizHintMode: 'rule' (1. yanlış), 'letters' (2. yanlış), 'reveal' (3. yanlış / auto-fill).
   * Her ikisi de soru bazlı; localStorage'a yazılmaz; tense/verb/dil değişiminde sıfırlanır.
   */
  const [quizAttempts, setQuizAttempts] = useState<Record<string, number>>(() =>
    Object.fromEntries(getPronouns('es').map((p) => [p.id, 0]))
  );
  const [quizHintMode, setQuizHintMode] = useState<Record<string, 'rule' | 'letters' | 'reveal' | null>>(() =>
    Object.fromEntries(getPronouns('es').map((p) => [p.id, null as 'rule' | 'letters' | 'reveal' | null]))
  );
  /** Reveal sonrası 1.5sn bekleme zamanlayıcıları (pronoun bazlı) — temizleme için tutulur. */
  const revealTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const [showHints, setShowHints] = useState(false);
  const [error, setError] = useState('');
  const [showCongrats, setShowCongrats] = useState(false);
  const [quizCompletionSummary, setQuizCompletionSummary] = useState<QuizCompletionSummary | null>(null);
  const [congratsXpBar, setCongratsXpBar] = useState(0);
  const [randomVerbMode] = useState(false);
  const [combo, setCombo] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [comboDisplay, setComboDisplay] = useState<{ show: boolean; value: number }>({ show: false, value: 0 });

  /** Öğrenme tablosu: Ezber Modu (Active Recall) — çekimler blur, hover’da netleşir */
  const [activeRecallMode, setActiveRecallMode] = useState(false);
  const [learningCardModeOpen, setLearningCardModeOpen] = useState(false);
  const [masteryUiTick, setMasteryUiTick] = useState(0);
  const [showAllTenses, setShowAllTenses] = useState(false);
  const allTensesSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showAllTenses) {
      const t = setTimeout(() => allTensesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      return () => clearTimeout(t);
    }
  }, [showAllTenses]);
  /** Görünüm modu: 'simple' = sadece fiil başlığı + çekim tablosu; 'detailed' = bilgi kutusu, sekmeler, aksiyonlar */
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
  const [isReflexive, setIsReflexive] = useState(false);
  const [isNegative, setIsNegative] = useState(false);
  const [copiedRowKey, setCopiedRowKey] = useState<string | null>(null);
  const [staticExampleSpeaking, setStaticExampleSpeaking] = useState(false);
  const [staticExampleCopied, setStaticExampleCopied] = useState(false);
  const staticExampleCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Quiz görünümü: 'focus' = tekli soru, 'list' = liste */
  const [quizLayout, setQuizLayout] = useState<'list' | 'focus'>(() => {
    try {
      const saved = localStorage.getItem(EXERCISE_MODE_PREFERENCE_KEY);
      return saved === 'list' ? 'list' : 'focus';
    } catch {
      return 'focus';
    }
  });
  /** Odak modunda hangi şahısta olunduğu (0..5). 6 = tümü tamamlandı. */
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
  /** Liste alıştırmasında statik örnek vurgusu için odaklanan şahıs */
  const [quizListHighlightPronoun, setQuizListHighlightPronoun] = useState<string | null>(null);
  /** Liste modunda gerçek input odağı — hata uyarıları yalnızca bu şahıs satırında */
  const [listQuizFocusedPronounId, setListQuizFocusedPronounId] = useState<string | null>(null);
  /** Boş cevap gönderildiğinde sarsılacak input (pronoun id); 500ms sonra temizlenir */
  const [quizEmptyShake, setQuizEmptyShake] = useState<string | null>(null);

  const [quizInteractionMode, setQuizInteractionMode] = useState<QuizInteractionMode>(() => {
    try {
      const s = localStorage.getItem(EXERCISE_INTERACTION_KEY);
      if (s === 'choice' || s === 'mixed' || s === 'write' || s === 'listen' || s === 'reverse') return s;
    } catch {
      /* ignore */
    }
    return 'write';
  });
  const setQuizInteractionModePersist = useCallback((m: QuizInteractionMode) => {
    if ((m === 'listen' || m === 'reverse') && selectedLanguage !== 'es') return;
    if ((m === 'listen' || m === 'reverse') && quizLayout === 'list') {
      setQuizLayout('focus');
      try {
        localStorage.setItem(EXERCISE_MODE_PREFERENCE_KEY, 'focus');
      } catch {
        /* ignore */
      }
    }
    setQuizInteractionMode(m);
    try {
      localStorage.setItem(EXERCISE_INTERACTION_KEY, m);
    } catch {
      /* ignore */
    }
  }, [selectedLanguage, quizLayout]);

  useEffect(() => {
    if (selectedLanguage === 'es') return;
    if (quizInteractionMode === 'listen' || quizInteractionMode === 'reverse') {
      setQuizInteractionMode('write');
      try {
        localStorage.setItem(EXERCISE_INTERACTION_KEY, 'write');
      } catch {
        /* ignore */
      }
    }
  }, [selectedLanguage, quizInteractionMode]);
  const [quizAccentBarVisible, setQuizAccentBarVisible] = useState(false);
  const [quizLives, setQuizLives] = useState(3);
  const [quizHeartBump, setQuizHeartBump] = useState(0);
  /** Son kaybedilen kalp slotu (0–2); bounce animasyonu için */
  const [quizHeartLostAnimSlot, setQuizHeartLostAnimSlot] = useState<number | null>(null);
  const [quizLivesExhausted, setQuizLivesExhausted] = useState(false);
  const [focusMcPickedIndex, setFocusMcPickedIndex] = useState<number | null>(null);
  const [focusMcLocked, setFocusMcLocked] = useState(false);
  /** Çoktan seç: 1–4 tuşu ile kısa vurgu (ms) */
  const [focusMcKeyFlashIndex, setFocusMcKeyFlashIndex] = useState<number | null>(null);
  const focusMcKeyFlashTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const [focusCanSkipAfterWrong, setFocusCanSkipAfterWrong] = useState(false);
  const [focusCorrectGlow, setFocusCorrectGlow] = useState(false);
  const focusFlowBusyRef = useRef(false);
  const focusFlowTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Dinleme modu: otomatik + tekrar dinle sayacı (soru başına max 3) */
  const [listenReplayCount, setListenReplayCount] = useState(0);
  const [listenForcedHint, setListenForcedHint] = useState(false);
  /** Tersine mod: kullanıcı zamir + zaman tahmini */
  const [reverseSelPronoun, setReverseSelPronoun] = useState<string>('');
  const [reverseSelTense, setReverseSelTense] = useState<string>('');
  const [survivalOpen, setSurvivalOpen] = useState(false);

  /** Hata Bankası (Zorlandıklarım) — localStorage ile senkron */
  const [mistakeBank, setMistakeBank] = useState<MistakeEntry[]>([]);
  /** İspanyolca hata hafızası (mistake_memory) — UI yenileme için sayaç */
  const [mistakeMemoryTick, setMistakeMemoryTick] = useState(0);
  const [mistakeBannerRev, setMistakeBannerRev] = useState(0);
  const mistakeBannerDismissedRef = useRef<Set<string>>(new Set());
  const pendingMistakeSidebarPersonRef = useRef<string | null>(null);
  const [mistakeReplaySession, setMistakeReplaySession] = useState<MistakeReplaySessionState | null>(null);
  const [mistakeReplayComplete, setMistakeReplayComplete] = useState<{
    resolvedInSession: number;
    remaining: number;
  } | null>(null);
  const [mistakeReplayShowTick, setMistakeReplayShowTick] = useState(false);
  const mistakeReplayAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Günlük mastery tekrar kuyruğu: tamamlanınca sıradaki fiile geçilir. */
  const masteryDrillRef = useRef<{ items: MasteryDueItem[]; index: number } | null>(null);
  const [masteryDrillUi, setMasteryDrillUi] = useState<{ total: number; index: number } | null>(null);

  /** Alıştırma: can bitti (sayım veya bayrak; microtask gecikmesi olmadan kilit) */
  const quizSessionLivesDepleted = useMemo(
    () => mode === 'quiz' && !mistakeReplaySession && (quizLives <= 0 || quizLivesExhausted),
    [mode, mistakeReplaySession, quizLives, quizLivesExhausted]
  );

  const [spacedRepTick, setSpacedRepTick] = useState(0);
  const [showSpacedRepDueBanner, setShowSpacedRepDueBanner] = useState(false);
  const spacedRepBannerDismissedRef = useRef<string | null>(null);

  const spacedRepDueList = useMemo(() => {
    void spacedRepTick;
    if (selectedLanguage !== 'es' && selectedLanguage !== 'fr') return [];
    return getQuizSpacedRepetitionDueToday(selectedLanguage);
  }, [selectedLanguage, spacedRepTick]);

  useEffect(() => {
    const fn = () => setSpacedRepTick((x) => x + 1);
    window.addEventListener('diloloji-spaced-rep-changed', fn);
    return () => window.removeEventListener('diloloji-spaced-rep-changed', fn);
  }, []);

  const masteryQuizPronounOrder = useMemo(() => {
    if (mode !== 'quiz' || !verbKey || (selectedLanguage !== 'es' && selectedLanguage !== 'fr')) {
      return pronounIds;
    }
    // Liste modunda: mastery’ye göre sıra. Odak modunda: PRONOUNS / SPANISH_QUIZ_PERSON_IDS sabit
    // sıra (mastery yeniden sıralaması + indeks ilerlemesi Tú’yu atlatıyordu).
    if (quizLayout === 'focus') {
      if (selectedLanguage === 'es') {
        return SPANISH_QUIZ_PERSON_IDS.filter((id) => pronounIds.includes(id));
      }
      return pronounIds;
    }
    return sortQuizPronounsByMastery(selectedLanguage, verbKey, selectedTense, pronounIds);
  }, [mode, verbKey, selectedTense, selectedLanguage, pronounIds, masteryUiTick, quizLayout]);

  const qp = mode === 'quiz' ? masteryQuizPronounOrder : pronounIds;

  useEffect(() => {
    if (import.meta.env.PROD) return;
    if (mode !== 'quiz' || quizLayout !== 'focus' || selectedLanguage !== 'es') return;
    const currentPerson = qp[currentFocusIndex] ?? null;
    console.log('[quiz focus ES] current person:', currentPerson, 'index:', currentFocusIndex, 'full order:', qp);
  }, [mode, quizLayout, selectedLanguage, qp, currentFocusIndex]);

  useEffect(() => {
    spacedRepBannerDismissedRef.current = null;
  }, [verbKey, selectedTense]);

  useEffect(() => {
    if (mode !== 'quiz' || (selectedLanguage !== 'es' && selectedLanguage !== 'fr') || !verbKey) {
      setShowSpacedRepDueBanner(false);
      return;
    }
    if (!isVerbTenseDueForSpacedRepetition(verbKey, selectedTense, selectedLanguage)) {
      setShowSpacedRepDueBanner(false);
      return;
    }
    const k = `${verbKey}|${selectedTense}`;
    if (spacedRepBannerDismissedRef.current === k) {
      setShowSpacedRepDueBanner(false);
      return;
    }
    setShowSpacedRepDueBanner(true);
  }, [mode, selectedLanguage, verbKey, selectedTense, spacedRepTick]);

  const unresolvedMistakesForLang = useMemo(() => {
    void mistakeMemoryTick;
    if (selectedLanguage !== 'es' && selectedLanguage !== 'fr') return [];
    return getUnresolvedMistakes()
      .filter((e) => e.lang === selectedLanguage)
      .sort((a, b) => b.errorCount - a.errorCount);
  }, [selectedLanguage, mistakeMemoryTick]);

  const zorlandiklarimStatsTitle = useMemo(() => {
    void mistakeMemoryTick;
    if (selectedLanguage !== 'es' && selectedLanguage !== 'fr') return '';
    const s = getMistakeMemoryStats(selectedLanguage);
    const tensesL = getTenses(selectedLanguage);
    const pronounsL = getPronouns(selectedLanguage);
    const top = s.topMistake;
    const topLine = top
      ? `${top.verb} · ${tensesL.find((t) => t.id === top.tense)?.label ?? top.tense} · ${pronounsL.find((p) => p.id === top.person)?.label ?? top.person} (×${top.errorCount})`
      : '—';
    const worstTenseLbl = s.worstTenseId
      ? tensesL.find((t) => t.id === s.worstTenseId)?.label ?? s.worstTenseId
      : '—';
    const worstPerLbl = s.worstPersonId
      ? pronounsL.find((p) => p.id === s.worstPersonId)?.label ?? s.worstPersonId
      : '—';
    return `Toplam hata: ${s.totalErrors}\nÇözülen: ${s.resolvedCount}\nEn çok hata: ${topLine}\nEn sorunlu zaman: ${worstTenseLbl}\nEn sorunlu kişi: ${worstPerLbl}`;
  }, [mistakeMemoryTick, selectedLanguage]);

  const masteryDueTodayAll = useMemo(() => {
    void masteryUiTick;
    if (selectedLanguage !== 'es' && selectedLanguage !== 'fr') return [];
    return getMasteryDueToday(selectedLanguage);
  }, [selectedLanguage, masteryUiTick]);

  const masteryTenseRows = useMemo(() => {
    void masteryUiTick;
    if (!verbKey || (selectedLanguage !== 'es' && selectedLanguage !== 'fr')) return [];
    return getVerbTenseMasteryRows(
      selectedLanguage,
      verbKey,
      tensesForLang.map((x) => x.id),
      pronounIds
    );
  }, [verbKey, selectedLanguage, tensesForLang, pronounIds, masteryUiTick]);

  const masteryVerbPercent = useMemo(() => {
    void masteryUiTick;
    if (!verbKey || (selectedLanguage !== 'es' && selectedLanguage !== 'fr')) return 0;
    return getVerbOverallMasteryPercent(
      selectedLanguage,
      verbKey,
      tensesForLang.map((x) => x.id),
      pronounIds
    );
  }, [verbKey, selectedLanguage, tensesForLang, pronounIds, masteryUiTick]);

  const masteryDueForVerb = useMemo(() => {
    void masteryUiTick;
    if (!verbKey || (selectedLanguage !== 'es' && selectedLanguage !== 'fr')) return [];
    return getVerbMasteryDueForVerb(
      selectedLanguage,
      verbKey,
      tensesForLang.map((x) => x.id),
      pronounIds,
      getTodayLocal()
    );
  }, [verbKey, selectedLanguage, tensesForLang, pronounIds, masteryUiTick]);

  useEffect(() => {
    mistakeBannerDismissedRef.current = new Set();
  }, [verbKey, selectedTense]);

  useEffect(() => {
    const pid = pendingMistakeSidebarPersonRef.current;
    if (!pid || (selectedLanguage !== 'es' && selectedLanguage !== 'fr') || !verbKey) return;
    const idx = qp.indexOf(pid);
    if (idx < 0) return;
    pendingMistakeSidebarPersonRef.current = null;
    setCurrentFocusIndex(idx);
  }, [verbKey, selectedTense, selectedLanguage, qp]);

  useEffect(() => {
    return () => {
      if (mistakeReplayAdvanceTimerRef.current) clearTimeout(mistakeReplayAdvanceTimerRef.current);
    };
  }, []);

  /** Toast: "Listeden silindi! 🎉" vb. */
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /** Yıldızlı fiiller — localStorage ile senkron */
  const [starredVerbs, setStarredVerbs] = useState<string[]>([]);
  const [verbHistory, setVerbHistory] = useState<string[]>([]);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(HISTORY_PANEL_OPEN_KEY) === 'true';
    } catch {
      return false;
    }
  });

  /** Aktivite haritası (heatmap) modalı açık mı */
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [tenseDetailModalOpen, setTenseDetailModalOpen] = useState(false);
  const [addToSetOpen, setAddToSetOpen] = useState(false);
  const addToSetRef = useRef<HTMLDivElement>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  /** Üyelik sistemi: şimdilik mock — true yaparak giriş yapmış kullanıcıyı simüle edebilirsin */
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  /** Zamana Karşı (Arcade): zorluk, süre (soru başına), soru, skor, combo, can, oyun bitti */
  const [timeAttackDifficulty, setTimeAttackDifficulty] = useState<TimeAttackDifficulty | null>(null);
  const [timeAttackTimeLeft, setTimeAttackTimeLeft] = useState(10);
  const [timeAttackQuestion, setTimeAttackQuestion] = useState<{ verbKey: string; pronoun: string; tense: string } | null>(null);
  const [timeAttackInput, setTimeAttackInput] = useState('');
  const [timeAttackScore, setTimeAttackScore] = useState(0);
  const [timeAttackCombo, setTimeAttackCombo] = useState(1);
  const [timeAttackLives, setTimeAttackLives] = useState(3);
  const [timeAttackCorrectCount, setTimeAttackCorrectCount] = useState(0);
  const [timeAttackMaxCombo, setTimeAttackMaxCombo] = useState(1);
  const [timeAttackGameOver, setTimeAttackGameOver] = useState(false);
  /** Oyun bittiğinde localStorage'dan okunan: kişisel rekor, son 5 skor, yeni rekor mu */
  const [timeAttackHighScore, setTimeAttackHighScore] = useState(0);
  const [timeAttackLastScores, setTimeAttackLastScores] = useState<TimeAttackScoreEntry[]>([]);
  const [timeAttackIsNewRecord, setTimeAttackIsNewRecord] = useState(false);
  const [timeAttackFeedback, setTimeAttackFeedback] = useState<'correct' | 'wrong' | null>(null);
  /** Yanlışta gösterilen doğru cevap ve dondurma (locked) durumu */
  const [timeAttackRevealedAnswer, setTimeAttackRevealedAnswer] = useState<string | null>(null);
  const [timeAttackLocked, setTimeAttackLocked] = useState(false);
  const timeAttackAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeAttackPointsFlash, setTimeAttackPointsFlash] = useState<number | null>(null);
  const [timeAttackShake, setTimeAttackShake] = useState(false);
  const timeAttackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeAttackSaveDoneRef = useRef(false);

  /** Zamana Karşı bittiğinde bir kez skoru localStorage'a yaz; kişisel rekor ve son 5'i state'e al (zorluk bazlı) */
  useEffect(() => {
    if (!timeAttackGameOver || timeAttackSaveDoneRef.current) return;
    if (!timeAttackDifficulty) return;
    timeAttackSaveDoneRef.current = true;
    const list = getTimeAttackScores(timeAttackDifficulty);
    const prevBest = list.length > 0 ? Math.max(...list.map((e) => e.score)) : 0;
    const entry: TimeAttackScoreEntry = {
      score: timeAttackScore,
      combo: timeAttackMaxCombo,
      date: new Date().toISOString(),
      verb: timeAttackQuestion?.verbKey ?? '',
      tense: timeAttackQuestion?.tense ?? '',
      lang: selectedLanguage,
      difficulty: timeAttackDifficulty,
    };
    const { highScore, lastFive } = saveTimeAttackScore(entry, timeAttackDifficulty);
    setTimeAttackHighScore(highScore);
    setTimeAttackLastScores(lastFive);
    setTimeAttackIsNewRecord(timeAttackScore >= prevBest && timeAttackScore > 0);
    runTimeAttackBadgeChecks(timeAttackScore, timeAttackMaxCombo);
  }, [timeAttackGameOver, timeAttackScore, timeAttackMaxCombo, timeAttackQuestion, selectedLanguage, timeAttackDifficulty]);

  useEffect(() => {
    if (!timeAttackGameOver) timeAttackSaveDoneRef.current = false;
  }, [timeAttackGameOver]);

  /** Zaman/Kip custom dropdown: açık/kapalı + tıklama dışı kapatma */
  const [tenseDropdownOpen, setTenseDropdownOpen] = useState(false);
  /** Mobilde sol panel (fiil seçimi) varsayılan kapalı; Fiil Seç ile açılır, fiil seçilince kapanır */
  /** Mobilde sol panel — Fiil Seç ile aç/kapa (bottom sheet kaldırıldı) */
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const tenseDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tenseDropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (tenseDropdownRef.current && !tenseDropdownRef.current.contains(e.target as Node)) {
        setTenseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [tenseDropdownOpen]);

  useEffect(() => {
    if (!addToSetOpen) return;
    const handle = (e: MouseEvent) => {
      if (addToSetRef.current && !addToSetRef.current.contains(e.target as Node)) {
        setAddToSetOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [addToSetOpen]);

  /** Alıştırma başlığındaki zaman dropdown'u (hızlı zaman değiştirme) */
  const [quizTenseMenuOpen, setQuizTenseMenuOpen] = useState(false);
  /**
   * Zaman Kartları overlay durumu.
   *   null           → kapalı
   *   { kind: 'grid', highlightId? }      → 9 kart grid görünümü
   *   { kind: 'detail', tenseId }         → tek kartın detayı
   * Overlay absolute konumlanır; Page kök div'i relative olmalıdır.
   */
  const [tenseCardOverlay, setTenseCardOverlay] = useState<
    | null
    | { kind: 'grid'; highlightId?: string }
    | { kind: 'detail'; tenseId: string; fromGrid?: boolean }
  >(null);

  /** Navbar/diğer bileşenlerin tetiklediği global olay ile Zaman Kartları overlay'ini aç. */
  useEffect(() => {
    const handler = () => {
      setTenseCardOverlay({
        kind: 'grid',
        highlightId: selectedLanguage === 'es' || selectedLanguage === 'fr' ? selectedTense : undefined,
      });
    };
    window.addEventListener('diloloji:open-tense-cards', handler);
    return () => window.removeEventListener('diloloji:open-tense-cards', handler);
  }, [selectedLanguage, selectedTense]);
  const quizTenseMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!quizTenseMenuOpen) return;
    const handle = (e: MouseEvent) => {
      if (quizTenseMenuRef.current && !quizTenseMenuRef.current.contains(e.target as Node)) {
        setQuizTenseMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuizTenseMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', onKey);
    };
  }, [quizTenseMenuOpen]);

  const handleAddVerbToSet = useCallback(
    (deckId: string, _deckTitle: string, verbKey: string, lang: AppLanguage) => {
      const back = getTranslationOrPlaceholder(verbKey, lang);
      const ok = addCardToDeck(deckId, { front: verbKey, back });
      setToastMessage(ok ? 'Fiil set\'e eklendi.' : 'Eklenemedi.');
      setAddToSetOpen(false);
    },
    []
  );

  /** Akıllı ipucu durumunu tek bir şahıs için sıfırlar (doğru / atlama / yeni soru). */
  const clearSmartHint = useCallback((pronoun: string) => {
    setQuizAttempts((prev) => ({ ...prev, [pronoun]: 0 }));
    setQuizHintMode((prev) => ({ ...prev, [pronoun]: null }));
    const t = revealTimersRef.current[pronoun];
    if (t) {
      clearTimeout(t);
      revealTimersRef.current[pronoun] = null;
    }
  }, []);

  /** Tüm şahıslar için akıllı ipucu durumunu sıfırlar (yeni fiil / dil / zaman). */
  const resetSmartHintsAll = useCallback(() => {
    const ids = pronounsForLang.map((p) => p.id);
    setQuizAttempts(Object.fromEntries(ids.map((id) => [id, 0])));
    setQuizHintMode(Object.fromEntries(ids.map((id) => [id, null as 'rule' | 'letters' | 'reveal' | null])));
    Object.values(revealTimersRef.current).forEach((t) => { if (t) clearTimeout(t); });
    revealTimersRef.current = {};
  }, [pronounsForLang]);

  /** Alıştırma başlığından zaman değişimi — tam sıfırlama fiil/zaman effect'inde (quiz + sol panel) */
  const changeQuizTense = useCallback((tenseId: string) => {
    if (tenseId === selectedTense) {
      setQuizTenseMenuOpen(false);
      return;
    }
    setSelectedTense(tenseId);
    setQuizTenseMenuOpen(false);
  }, [selectedTense]);

  /** Kıyaslama sekmesi: üç zaman seçici (3'üncüsü opsiyonel) */
  const [compareTense1, setCompareTense1] = useState<string>(() => getTenses('fr')[0].id);
  const [compareTense2, setCompareTense2] = useState<string>(() => getTenses('fr')[1].id);
  const [compareTense3, setCompareTense3] = useState<string>(() => getTenses('fr')[2]?.id ?? getTenses('fr')[0].id);
  const [compareDropdown1Open, setCompareDropdown1Open] = useState(false);
  const [compareDropdown2Open, setCompareDropdown2Open] = useState(false);
  const [compareDropdown3Open, setCompareDropdown3Open] = useState(false);
  const compareDropdown1Ref = useRef<HTMLDivElement>(null);
  const compareDropdown2Ref = useRef<HTMLDivElement>(null);
  const compareDropdown3Ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h1 = (e: MouseEvent) => {
      if (compareDropdown1Ref.current && !compareDropdown1Ref.current.contains(e.target as Node)) setCompareDropdown1Open(false);
    };
    const h2 = (e: MouseEvent) => {
      if (compareDropdown2Ref.current && !compareDropdown2Ref.current.contains(e.target as Node)) setCompareDropdown2Open(false);
    };
    const h3 = (e: MouseEvent) => {
      if (compareDropdown3Ref.current && !compareDropdown3Ref.current.contains(e.target as Node)) setCompareDropdown3Open(false);
    };
    if (compareDropdown1Open) document.addEventListener('mousedown', h1);
    if (compareDropdown2Open) document.addEventListener('mousedown', h2);
    if (compareDropdown3Open) document.addEventListener('mousedown', h3);
    return () => {
      document.removeEventListener('mousedown', h1);
      document.removeEventListener('mousedown', h2);
      document.removeEventListener('mousedown', h3);
    };
  }, [compareDropdown1Open, compareDropdown2Open, compareDropdown3Open]);

  /** Dil değişince: tam sıfırlama — fiil, arama metni, anlam, hata temizlenir; "Laboratuvar Hazır!" boş ekranına dönülür */
  useEffect(() => {
    const tenses = tensesForLang;
    setSelectedTense(tenses[0].id);
    setCompareTense1(tenses[0]?.id ?? '');
    setCompareTense2(tenses[1]?.id ?? tenses[0]?.id ?? '');
    setCompareTense3(tenses[2]?.id ?? tenses[1]?.id ?? tenses[0]?.id ?? '');
    setVerbInput('');
    setVerbKey(null);
    setConjugations(null);
    setError('');
    setReverseLookupInfo(null);
    setTranslation(null);
    setDynamicMeaning(null);
    setUserAnswers(getInitialUserAnswers(selectedLanguage));
    setQuizFeedback(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as 'correct' | 'wrong' | 'typo' | null])));
    setQuizPasséHint(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as string | null])));
    resetSmartHintsAll();
    requestAnimationFrame(() => verbInputRef.current?.focus());
  }, [selectedLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Review (Tekrar) modu: gösterilen soru ve kullanıcı cevabı */
  const [reviewEntry, setReviewEntry] = useState<MistakeEntry | null>(null);
  const [reviewAnswer, setReviewAnswer] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewCorrect, setReviewCorrect] = useState(false);
  const reviewHadWrongRef = useRef(false);

  const readExerciseModePreference = useCallback((): 'list' | 'focus' => {
    try {
      const saved = localStorage.getItem(EXERCISE_MODE_PREFERENCE_KEY);
      return saved === 'list' ? 'list' : 'focus';
    } catch {
      return 'focus';
    }
  }, []);

  const setExerciseMode = useCallback((layout: 'list' | 'focus') => {
    setQuizLayout(layout);
    try {
      localStorage.setItem(EXERCISE_MODE_PREFERENCE_KEY, layout);
    } catch {
      // ignore
    }
  }, []);

  const verbInputRef = useRef<HTMLInputElement>(null);
  const reviewInputRef = useRef<HTMLInputElement>(null);
  const autocompleteWrapRef = useRef<HTMLDivElement>(null);
  /** Dil değişiminde mevcut fiili yeni dilde denemek için (effect içinden güncel loadVerb çağrısı) */
  const loadVerbRef = useRef<((overrideVerb?: string, langOverride?: 'fr' | 'es', tenseOverride?: string) => void) | null>(null);
  /** Çeviri isteği sırasında güncel fiili takip et (stale response'ları uygulama) */
  const verbKeyRef = useRef<string | null>(null);
  const comboDisplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Quiz inputları arasında focus yönetimi: refs[i] ile i. kutucuğa odaklanırız */
  const quizInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const quizSessionHadWrongRef = useRef(false);
  const quizDailyBonusesAppliedRef = useRef(false);
  const quizFlawlessAwardedRef = useRef(false);
  const quizCompletionHandledRef = useRef(false);
  const quizPersonUsedHintRef = useRef<Set<string>>(new Set());
  const quizBarStartPercentRef = useRef(0);
  const quizStartLevelRef = useRef(1);
  const quizXpSessionBreakdownRef = useRef<QuizXpSessionBreakdown>({
    correctBaseXp: 0,
    firstTryBonus: 0,
    irregularBonus: 0,
    specialBonus: 0,
    hintPenalty: 0,
    dailyFirst: 0,
    dailyVerb: 0,
    flawless: 0,
  });
  const awardQuizCorrectXpRef = useRef<
    (
      pronoun: string,
      opts?: {
        isReveal?: boolean;
        clientX?: number;
        clientY?: number;
        splitXpFloat?: boolean;
        bonusXp?: number;
      }
    ) => void
  >(() => {});

  const resetQuizXpSession = useCallback(() => {
    quizSessionHadWrongRef.current = false;
    quizDailyBonusesAppliedRef.current = false;
    quizFlawlessAwardedRef.current = false;
    quizCompletionHandledRef.current = false;
    quizPersonUsedHintRef.current.clear();
    quizXpSessionBreakdownRef.current = {
      correctBaseXp: 0,
      firstTryBonus: 0,
      irregularBonus: 0,
      specialBonus: 0,
      hintPenalty: 0,
      dailyFirst: 0,
      dailyVerb: 0,
      flawless: 0,
    };
    const tp = getTotalXP();
    quizBarStartPercentRef.current = getXPProgress(tp).percent;
    quizStartLevelRef.current = getLevel(tp);
    setQuizCompletionSummary(null);
  }, []);

  const resetQuizExerciseState = useCallback(() => {
    resetQuizXpSession();
    if (comboDisplayTimeoutRef.current) {
      clearTimeout(comboDisplayTimeoutRef.current);
      comboDisplayTimeoutRef.current = null;
    }
    setUserAnswers(getInitialUserAnswers(selectedLanguage));
    setQuizFeedback(
      Object.fromEntries(pronounsForLang.map((p) => [p.id, null as 'correct' | 'wrong' | 'typo' | null]))
    );
    setQuizPasséHint(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as string | null])));
    resetSmartHintsAll();
    setShowHints(false);
    setShowCongrats(false);
    setCombo(0);
    setComboDisplay({ show: false, value: 0 });
    setQuizEmptyShake(null);
    setQuizListHighlightPronoun(null);
    setListQuizFocusedPronounId(null);
    setCurrentFocusIndex(0);
    setQuizLives(3);
    setQuizLivesExhausted(false);
    setQuizHeartLostAnimSlot(null);
    setFocusMcPickedIndex(null);
    setFocusMcLocked(false);
    setFocusMcKeyFlashIndex(null);
    if (focusMcKeyFlashTimeoutRef.current) {
      clearTimeout(focusMcKeyFlashTimeoutRef.current);
      focusMcKeyFlashTimeoutRef.current = null;
    }
    setFocusCanSkipAfterWrong(false);
    setFocusCorrectGlow(false);
    setQuizAccentBarVisible(false);
    setCongratsXpBar(0);
    setListenReplayCount(0);
    setListenForcedHint(false);
    setReverseSelPronoun('');
    setReverseSelTense('');
    focusFlowBusyRef.current = false;
    focusFlowTimersRef.current.forEach(clearTimeout);
    focusFlowTimersRef.current = [];
  }, [selectedLanguage, pronounsForLang, resetSmartHintsAll, resetQuizXpSession]);

  /** Sanal klavye: harf hangi inputa eklenecek (en son focus alan) */
  const activeQuizInputIndexRef = useRef(0);
  /** Aksan ekledikten sonra imleci doğru yere koymak için (useEffect'te kullanılır) */
  const lastAccentInsertRef = useRef<{ index: number; caretPosition: number } | null>(null);
  /** Zamana Karşı: aksan tuşu sonrası inputa refocus */
  const timeAttackInputRef = useRef<HTMLInputElement>(null);

  const tenseLabel = tensesForLang.find((t) => t.id === selectedTense)?.label ?? selectedTense;
  const spanishMeaningMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of SPANISH_VERBS) {
      const key = v.infinitive
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (!m.has(key)) m.set(key, v.meaning_tr);
    }
    return m;
  }, []);
  const frenchMeaningMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of FRENCH_VERBS) {
      const key = normalizeVerbKeyForSet(v.infinitive);
      const prev = m.get(key);
      const next = prev ? `${prev} / ${v.meaning_tr}` : v.meaning_tr;
      m.set(key, next);
    }
    return m;
  }, []);
  const staticSpanishMeaning = useMemo(() => {
    if (selectedLanguage !== 'es' || !verbKey) return null;
    const key = verbKey
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const tr = spanishMeaningMap.get(key);
    return tr && tr.trim().length > 0 ? tr : null;
  }, [selectedLanguage, verbKey, spanishMeaningMap]);
  const staticFrenchMeaning = useMemo(() => {
    if (selectedLanguage !== 'fr' || !verbKey) return null;
    const tr = frenchMeaningMap.get(normalizeVerbKeyForSet(verbKey));
    return tr && tr.trim().length > 0 ? tr : null;
  }, [selectedLanguage, verbKey, frenchMeaningMap]);
  const spanishVerbSet = useMemo(() => new Set(SPANISH_VERBS.map((v) =>
    v.infinitive.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  )), []);
  const frenchVerbSet = useMemo(
    () => new Set(FRENCH_VERBS.map((v) => normalizeVerbKeyForSet(v.infinitive))),
    []
  );
  const spanishMeaningToInfinitiveMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of SPANISH_VERBS) {
      const meaningKey = v.meaning_tr.toLowerCase().trim();
      if (!m.has(meaningKey)) m.set(meaningKey, v.infinitive);
    }
    return m;
  }, []);
  const frenchMeaningToInfinitiveMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of FRENCH_VERBS) {
      const meaningKey = v.meaning_tr.toLowerCase().trim();
      if (!m.has(meaningKey)) m.set(meaningKey, v.infinitive);
    }
    return m;
  }, []);
  const displayMeaning = useMemo(() => {
    if (selectedLanguage === 'es') {
      return staticSpanishMeaning ?? t('verbLab.meaningNotFound');
    }
    if (selectedLanguage === 'fr') {
      return staticFrenchMeaning ?? t('verbLab.meaningNotFound');
    }
    return dynamicMeaning || getTranslationOrPlaceholder(verbKey ?? '', selectedLanguage);
  }, [selectedLanguage, staticSpanishMeaning, staticFrenchMeaning, dynamicMeaning, verbKey, t]);

  const learningVerbMasteryStats = useMemo(() => {
    if (!verbKey || (selectedLanguage !== 'es' && selectedLanguage !== 'fr')) return null;
    const lang = selectedLanguage as 'es' | 'fr';
    const store = loadMasteryStore();
    let total = 0;
    let learned = 0;
    for (const group of tenseGroupsForLang) {
      for (const tenseId of group.tenseIds) {
        const map = getSafeConjugationMap(verbKey, tenseId, selectedLanguage);
        if (!map || Object.keys(map).length === 0) continue;
        for (const pid of pronounIds) {
          const raw = map[pid];
          if (isConjugationValueMissing(raw) || raw === '—') continue;
          total += 1;
          const key = buildMasteryKey(lang, verbKey, tenseId, pid);
          const rec = store[key];
          if (rec && rec.totalCorrect > 0) learned += 1;
        }
      }
    }
    const pct = total ? Math.round((learned / total) * 100) : 0;
    return { learned, total, pct };
  }, [
    verbKey,
    selectedLanguage,
    tenseGroupsForLang,
    pronounIds,
    getSafeConjugationMap,
    masteryUiTick,
  ]);

  const getHistoryMeaning = useCallback(
    (verb: string) => {
      if (selectedLanguage === 'es') {
        const key = verb
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return spanishMeaningMap.get(key) ?? t('verbLab.meaningNotFound');
      }
      if (selectedLanguage === 'fr') {
        return frenchMeaningMap.get(normalizeVerbKeyForSet(verb)) ?? t('verbLab.meaningNotFound');
      }
      return getTranslationOrPlaceholder(verb, selectedLanguage);
    },
    [selectedLanguage, spanishMeaningMap, frenchMeaningMap, t]
  );

  const toggleHistoryPanel = useCallback(() => {
    setHistoryPanelOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(HISTORY_PANEL_OPEN_KEY, next ? 'true' : 'false');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const staticExample = useMemo((): StaticExample => {
    if (!verbKey) return null;
    if (selectedLanguage === 'es') {
      const byVerb = (exampleSentences as Record<string, Record<string, StaticExample>>)[verbKey];
      if (!byVerb) return null;
      return byVerb[tenseLabel] ?? null;
    }
    if (selectedLanguage === 'fr') {
      const byVerb = (exampleSentencesFr as Record<string, Record<string, StaticExample>>)[verbKey];
      if (!byVerb) return null;
      return byVerb[tenseLabel] ?? null;
    }
    return null;
  }, [selectedLanguage, verbKey, tenseLabel]);

  const quizExampleHighlightPronoun = useMemo(() => {
    if ((selectedLanguage !== 'es' && selectedLanguage !== 'fr') || mode !== 'quiz') return null;
    if (quizLayout === 'focus') {
      if (qp.length === 0) return null;
      return qp[Math.min(currentFocusIndex, qp.length - 1)];
    }
    return quizListHighlightPronoun;
  }, [selectedLanguage, mode, quizLayout, qp, currentFocusIndex, quizListHighlightPronoun]);

  const quizExampleHighlightForm = useMemo(() => {
    if ((selectedLanguage !== 'es' && selectedLanguage !== 'fr') || mode !== 'quiz' || !staticExample || !conjugations)
      return null;
    if (!quizExampleHighlightPronoun) return null;
    if (!examplePersonMatchesPronoun(staticExample.person, quizExampleHighlightPronoun, selectedLanguage))
      return null;
    const f = conjugations[quizExampleHighlightPronoun]?.trim();
    return f || null;
  }, [selectedLanguage, mode, staticExample, conjugations, quizExampleHighlightPronoun]);

  useEffect(() => {
    if (mode !== 'quiz' || (selectedLanguage !== 'es' && selectedLanguage !== 'fr')) {
      setQuizListHighlightPronoun(null);
      return;
    }
    if (quizLayout === 'list' && qp.length > 0) {
      setQuizListHighlightPronoun((prev) =>
        prev && qp.includes(prev) ? prev : qp[0]
      );
    } else if (quizLayout === 'focus') {
      setQuizListHighlightPronoun(null);
    }
  }, [mode, quizLayout, selectedLanguage, verbKey, selectedTense, qp]);

  useEffect(() => {
    if (mode !== 'quiz' || quizLayout !== 'list') {
      setListQuizFocusedPronounId(null);
    }
  }, [mode, quizLayout]);

  const regimeInfo = useMemo(() => {
    if (selectedLanguage !== 'es' || !verbKey) return null;
    return (
      verbRegimes[verbKey] ??
      verbRegimes[
        verbKey
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
      ] ??
      null
    );
  }, [selectedLanguage, verbKey]);
  const collocationItems = useMemo(() => {
    if (selectedLanguage !== 'es' || !verbKey) return [];
    const key = verbKey
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return (collocations[verbKey] ?? collocations[key] ?? []).filter((x) => x.level === collocationLevelFilter);
  }, [selectedLanguage, verbKey, collocationLevelFilter]);
  const regionalInfo = useMemo(() => {
    if (selectedLanguage !== 'es' || !verbKey) return null;
    const key = verbKey
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return regionalVariants[verbKey] ?? regionalVariants[key] ?? null;
  }, [selectedLanguage, verbKey]);
  const isSerEstarVerb = selectedLanguage === 'es' && (verbKey === 'ser' || verbKey === 'estar');
  const selectedTenseMarkers = useMemo(() => timeMarkers[tenseLabel] ?? null, [tenseLabel]);

  /** Otomatik tamamlama: Lefff fiil listesi (bir kez yükle). */
  const verbList = useMemo(() => getVerbListForLang(selectedLanguage), [selectedLanguage]);
  const irregularVerbsForSelectedTense = useMemo(() => {
    if (selectedLanguage === 'es') {
      const byTense = irregularByTenseJson as Record<string, Partial<Record<string, boolean>>>;
      const out: string[] = [];
      for (const verb of verbList) {
        if (byTense[verb]?.[selectedTense] !== true) continue;
        const m = getSafeConjugationMap(verb, selectedTense, 'es');
        if (m && Object.keys(m).length > 0) out.push(verb);
      }
      return out.sort((a, b) => a.localeCompare(b, 'es'));
    }
    if (selectedLanguage === 'fr') {
      const byTense = irregularByTenseFrJson as Record<string, Partial<Record<string, boolean>>>;
      const out: string[] = [];
      for (const verb of verbList) {
        if (byTense[verb]?.[selectedTense] !== true) continue;
        const m = getSafeConjugationMap(verb, selectedTense, 'fr');
        if (m && Object.keys(m).length > 0) out.push(verb);
      }
      return out.sort((a, b) => a.localeCompare(b, 'fr'));
    }
    return [];
  }, [selectedLanguage, verbList, selectedTense, getSafeConjugationMap]);
  const IRREGULAR_LEFT_PANEL_CAP = 8;
  const visibleIrregularVerbs = useMemo(() => {
    if (!irregularLeftPanelOpen) return [];
    return showAllIrregulars
      ? irregularVerbsForSelectedTense
      : irregularVerbsForSelectedTense.slice(0, IRREGULAR_LEFT_PANEL_CAP);
  }, [irregularLeftPanelOpen, showAllIrregulars, irregularVerbsForSelectedTense]);

  /** Fiil ailesi: aynı çekim köküne sahip diğer fiiller (Fiil Aileleri bölümü için). */
  const verbFamily = useMemo(
    () => (verbKey ? getVerbFamily(verbKey, verbList) : []),
    [verbKey, verbList]
  );

  /** Fransızca eşsesli gruplar (sadece fr ve çekim varken; Öğrenme tablosu için). */
  const frenchHomophoneGroups = useMemo(() => {
    if (selectedLanguage !== 'fr' || !conjugations) return new Map<string, { pronounIds: string[]; key: string }>();
    return getFrenchHomophoneGroups(conjugations, pronounsForLang);
  }, [selectedLanguage, conjugations, pronounsForLang]);

  /** Belirli bir zamirin eşsesli grup bilgisi (tooltip için). */
  const getHomophoneInfo = useCallback(
    (pronounId: string): { key: string; count: number } | null => {
      for (const [, g] of frenchHomophoneGroups) {
        if (g.pronounIds.includes(pronounId)) return { key: g.key, count: g.pronounIds.length };
      }
      return null;
    },
    [frenchHomophoneGroups]
  );

  /** Otomatik tamamlama: en fazla 5 öneri, önce başlayanlar sonra içerenler. */
  const autocompleteSuggestions = useMemo(() => {
    const q = verbInput.trim().toLowerCase();
    if (q.length < 2) return [];
    const start = verbList.filter((v) => v.toLowerCase().startsWith(q)).slice(0, 5);
    const rest = 5 - start.length;
    if (rest <= 0) return start;
    const contain = verbList.filter(
      (v) => !v.toLowerCase().startsWith(q) && v.toLowerCase().includes(q)
    ).slice(0, rest);
    return [...start, ...contain];
  }, [verbInput, verbList]);

  /** Otomatik tamamlama: seçili indeks ve menü kapalı mı. */
  const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] = useState(0);
  const [autocompleteClosed, setAutocompleteClosed] = useState(false);
  /** Portal için: dropdown konumu (input wrapper getBoundingClientRect). */
  const autocompleteAnchorRef = useRef<HTMLDivElement>(null);
  const [autocompletePosition, setAutocompletePosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const loadVerb = useCallback((overrideVerb?: string, langOverride?: 'fr' | 'es', tenseOverride?: string) => {
    const effectiveLang = langOverride ?? selectedLanguage;
    const tenseEff = tenseOverride ?? selectedTense;
    setError('');
    setReverseLookupInfo(null);
    const rawInput = (overrideVerb ?? verbInput).trim();
    let toLoad = rawInput;
    if (effectiveLang === 'es') {
      const key = rawInput
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (spanishVerbSet.has(key)) {
        toLoad = rawInput;
      } else {
        const byMeaning = spanishMeaningToInfinitiveMap.get(rawInput.toLowerCase().trim());
        if (byMeaning) {
          toLoad = byMeaning;
          setVerbInput(sanitizeForDisplay(byMeaning));
        } else {
          setError(t('errors.verbNotFound'));
          setVerbKey(null);
          setConjugations(null);
          return;
        }
      }
    } else if (effectiveLang === 'fr') {
      const key = normalizeVerbKeyForSet(rawInput);
      if (frenchVerbSet.has(key)) {
        toLoad = rawInput;
      } else {
        const byMeaning = frenchMeaningToInfinitiveMap.get(rawInput.toLowerCase().trim());
        if (byMeaning) {
          toLoad = byMeaning;
          setVerbInput(sanitizeForDisplay(byMeaning));
        } else {
          setError(t('errors.verbNotFound'));
          setVerbKey(null);
          setConjugations(null);
          return;
        }
      }
    }
    if (!toLoad) {
      if (effectiveLang === 'es' || effectiveLang === 'fr') {
        setError(t('errors.verbNotFound'));
        setVerbKey(null);
        setConjugations(null);
        return;
      }
    }
    try {
      const result = getConjugationsForLang(toLoad, tenseEff, effectiveLang);
      if (result && result.ok) {
        const conj = result.conjugations;
        if (conj && typeof conj === 'object' && Object.keys(conj).length > 0) {
          if (effectiveLang === 'fr' && !frenchVerbSet.has(normalizeVerbKeyForSet(result.infinitive))) {
            setError(t('errors.verbNotFound'));
            setVerbKey(null);
            setConjugations(null);
            return;
          }
          const verified = verifyConjugationMap(conj, tenseEff, effectiveLang);
          if (overrideVerb) setVerbInput(sanitizeForDisplay(overrideVerb));
          if (tenseOverride) setSelectedTense(tenseOverride);
          setVerbKey(result.infinitive);
          setConjugations(verified);
          setLeftPanelOpen(false);
          if (langOverride) setSelectedLanguage(langOverride);
          setError('');
          return;
        }
      }
      const reverse = findInfinitiveByConjugatedForm(toLoad, effectiveLang);
      if (
        reverse &&
        (effectiveLang !== 'fr' || frenchVerbSet.has(normalizeVerbKeyForSet(reverse.infinitive)))
      ) {
        try {
          const conjugationsMap = getConjugationForTenseForLang(reverse.infinitive, reverse.tenseId, effectiveLang);
          if (conjugationsMap && typeof conjugationsMap === 'object' && Object.keys(conjugationsMap).length > 0) {
            const verified = verifyConjugationMap(conjugationsMap, reverse.tenseId, effectiveLang);
            setVerbInput(sanitizeForDisplay(reverse.infinitive));
            setVerbKey(reverse.infinitive);
            setSelectedTense(reverse.tenseId);
            setConjugations(verified);
            setLeftPanelOpen(false);
            if (langOverride) setSelectedLanguage(langOverride);
            setReverseLookupInfo({
              searched: toLoad,
              infinitive: reverse.infinitive,
              tenseLabel: reverse.tenseLabel,
              pronounLabel: PRONOUN_PERSON_LABEL[reverse.pronounId] ?? reverse.pronounLabel,
            });
            setError('');
            return;
          }
        } catch {
          /* fall through to error */
        }
      }
      setError(
        result && !result.ok ? (result.error ?? t('errors.verbNotFoundLang')) : t('errors.verbNotFoundLang')
      );
      setVerbKey(null);
      setConjugations(null);
    } catch {
      setError(t('errors.verbNotFoundLang'));
      setVerbKey(null);
      setConjugations(null);
    }
  }, [
    verbInput,
    selectedTense,
    selectedLanguage,
    spanishVerbSet,
    spanishMeaningToInfinitiveMap,
    frenchVerbSet,
    frenchMeaningToInfinitiveMap,
    t,
  ]);

  loadVerbRef.current = loadVerb;

  useEffect(() => {
    let cancelled = false;
    if (!verbKey || mode !== 'learning' || selectedLanguage !== 'es') {
      setShowSynonymSection(false);
      setSynonymLoading(false);
      setSynonymData(null);
      return () => {
        cancelled = true;
      };
    }
    setShowSynonymSection(true);
    setSynonymLoading(true);
    setSynonymData(null);
    void fetchSynonyms(verbKey)
      .then((payload) => {
        if (cancelled) return;
        if (payload.synonyms.length === 0 && payload.antonyms.length === 0 && !payload.note) {
          setShowSynonymSection(false);
          setSynonymData(null);
        } else {
          setSynonymData(payload);
          setShowSynonymSection(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setShowSynonymSection(false);
        setSynonymData(null);
      })
      .finally(() => {
        if (cancelled) return;
        setSynonymLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [verbKey, mode, selectedLanguage]);

  const switchAppLanguage = useCallback(
    (lang: AppLanguage) => {
      const v = verbKey;
      if (v) {
        setVerbInput('');
        setError('');
        loadVerb(v, lang);
      } else {
        setSelectedLanguage(lang);
        setVerbKey(null);
        setConjugations(null);
        setVerbInput('');
        setError('');
      }
    },
    [verbKey, loadVerb, setSelectedLanguage]
  );

  const [searchParams, setSearchParams] = useSearchParams();

  /** Sözlükten "Fiil Lab'da Çöz" ile gelen fiili aç (state veya URL query: verb + lang) */
  useEffect(() => {
    const verbFromUrl = searchParams.get('verb');
    const langFromUrl = searchParams.get('lang');
    if (langFromUrl === 'fr' || langFromUrl === 'es') {
      setSelectedLanguage(langFromUrl);
    }
    if (verbFromUrl && typeof verbFromUrl === 'string' && loadVerbRef.current) {
      const lang = langFromUrl === 'fr' || langFromUrl === 'es' ? langFromUrl : undefined;
      const tenseFromUrl = searchParams.get('tense');
      const tid =
        tenseFromUrl && /^[a-z0-9-]+$/i.test(tenseFromUrl) ? tenseFromUrl : undefined;
      loadVerbRef.current(verbFromUrl.trim(), lang, tid);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('verb');
        next.delete('lang');
        next.delete('tense');
        return next;
      }, { replace: true });
      return;
    }
    const state = location.state as { openVerb?: string } | null;
    const openVerb = state?.openVerb;
    if (openVerb && typeof openVerb === 'string' && loadVerbRef.current) {
      loadVerbRef.current(openVerb.trim());
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, searchParams, setSearchParams]);

  const pickRandomVerb = useCallback(() => {
    setAutocompleteClosed(true);
    for (let attempt = 0; attempt < 15; attempt++) {
      const v = getRandomVerbForLang(selectedLanguage);
      const result = getConjugationsForLang(v, selectedTense, selectedLanguage);
      if (result.ok) {
        const verified = verifyConjugationMap(result.conjugations, selectedTense, selectedLanguage);
        const safeInfinitive = sanitizeForDisplay(result.infinitive);
        setVerbInput(safeInfinitive);
        setVerbKey(safeInfinitive);
        setConjugations(verified);
        setError('');
        return;
      }
    }
    setError(t('errors.randomVerbFailed'));
  }, [selectedTense, selectedLanguage, t]);

  /** Rastgele mod: Sonraki rastgele fiil (öncekinden farklı, aynı zaman). Quiz state sıfırlanır. */
  const pickNextRandomVerb = useCallback(() => {
    const exclude = verbKey ?? undefined;
    setAutocompleteClosed(true);
    for (let attempt = 0; attempt < 20; attempt++) {
      const v = getRandomVerbForLang(selectedLanguage, exclude);
      const result = getConjugationsForLang(v, selectedTense, selectedLanguage);
      if (result.ok) {
        const verified = verifyConjugationMap(result.conjugations, selectedTense, selectedLanguage);
        const safeInfinitive = sanitizeForDisplay(result.infinitive);
        setQuizLives(3);
        setQuizLivesExhausted(false);
        setVerbInput(safeInfinitive);
        setVerbKey(safeInfinitive);
        setConjugations(verified);
        setLeftPanelOpen(false);
        setError('');
        setUserAnswers(getInitialUserAnswers(selectedLanguage));
        setQuizFeedback({ je: null, tu: null, il: null, nous: null, vous: null, ils: null } as Record<string, 'correct' | 'wrong' | 'typo' | null>);
        setQuizPasséHint({ je: null, tu: null, il: null, nous: null, vous: null, ils: null });
        resetSmartHintsAll();
        setShowHints(false);
        setShowCongrats(false);
        setCurrentFocusIndex(0);
        return;
      }
    }
    setError(t('errors.randomVerbRetry'));
  }, [selectedTense, selectedLanguage, verbKey, resetSmartHintsAll, t]);

  const pickNewExerciseVerb = useCallback(() => {
    const exclude = verbKey ?? undefined;
    setAutocompleteClosed(true);
    const normalizedExclude = exclude
      ? exclude.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : null;
    for (let attempt = 0; attempt < 25; attempt++) {
      let nextVerb = '';
      if (selectedLanguage === 'es') {
        const candidate = getRandomVerbSpanish(exclude);
        const normalizedCandidate = candidate.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizedExclude && normalizedCandidate === normalizedExclude) continue;
        if (!spanishVerbSet.has(normalizedCandidate)) continue;
        nextVerb = candidate;
      } else if (selectedLanguage === 'fr') {
        const candidate = getRandomVerbForLang(selectedLanguage, exclude);
        if (!candidate) continue;
        const normalizedCandidate = normalizeVerbKeyForSet(candidate);
        if (normalizedExclude && normalizedCandidate === normalizedExclude) continue;
        if (!frenchVerbSet.has(normalizedCandidate)) continue;
        nextVerb = candidate;
      } else {
        const candidate = getRandomVerbForLang(selectedLanguage, exclude);
        if (!candidate) continue;
        nextVerb = candidate;
      }
      const result = getConjugationsForLang(nextVerb, selectedTense, selectedLanguage);
      if (!result.ok) continue;
      const verified = verifyConjugationMap(result.conjugations, selectedTense, selectedLanguage);
      const safeInfinitive = sanitizeForDisplay(result.infinitive);
      setVerbInput(safeInfinitive);
      setVerbKey(safeInfinitive);
      setConjugations(verified);
      setLeftPanelOpen(false);
      setError('');
      masteryDrillRef.current = null;
      setMasteryDrillUi(null);
      setExerciseMode('focus');
      setMode('quiz');
      setUserAnswers(getInitialUserAnswers(selectedLanguage));
      setQuizFeedback({ je: null, tu: null, il: null, nous: null, vous: null, ils: null } as Record<string, 'correct' | 'wrong' | 'typo' | null>);
      setQuizPasséHint({ je: null, tu: null, il: null, nous: null, vous: null, ils: null });
      resetSmartHintsAll();
      setShowHints(false);
      setShowCongrats(false);
      setCurrentFocusIndex(0);
      return;
    }
    setError(t('errors.loadVerbFailed'));
  }, [verbKey, selectedLanguage, selectedTense, spanishVerbSet, frenchVerbSet, setExerciseMode, resetSmartHintsAll, t]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = () => {
      if (mq.matches) setLeftPanelOpen(false);
    };
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!verbKey) return;
    try {
      const next = getConjugationForTenseForLang(verbKey, selectedTense, selectedLanguage);
      if (next && typeof next === 'object' && Object.keys(next).length > 0) {
        setConjugations(verifyConjugationMap(next, selectedTense, selectedLanguage));
      } else {
        setError(t('errors.verbNotFoundLang'));
        setVerbKey(null);
        setConjugations(null);
      }
    } catch {
      setError(t('errors.verbNotFoundLang'));
      setVerbKey(null);
      setConjugations(null);
    }
  }, [verbKey, selectedTense, selectedLanguage, t]);

  /** Fiil/zaman/dil değişince gösterilen mastar anlamını güncelle (ES/FR: statik sözlük) */
  useEffect(() => {
    if (selectedLanguage === 'es') {
      const text = staticSpanishMeaning ?? t('verbLab.meaningNotFound');
      setDynamicMeaning(text);
      setTranslation(text);
    } else if (selectedLanguage === 'fr') {
      const text = staticFrenchMeaning ?? t('verbLab.meaningNotFound');
      setDynamicMeaning(text);
      setTranslation(text);
    } else {
      setDynamicMeaning(null);
      setTranslation(null);
    }
  }, [verbKey, selectedTense, selectedLanguage, staticSpanishMeaning, staticFrenchMeaning, t]);

  /** Güncel fiil ref'i (stale response'ı önlemek için) */
  useEffect(() => {
    verbKeyRef.current = verbKey;
  }, [verbKey]);

  // Aktif sekme (Öğrenme / Alıştırma / Zamana Karşı …), fiil veya zaman değişince alıştırma oturumunu sıfırla
  useEffect(() => {
    resetQuizExerciseState();
    setQuizLayout(readExerciseModePreference());
  }, [mode, verbKey, selectedTense, selectedLanguage, pronounsForLang, resetQuizExerciseState, readExerciseModePreference]);

  /** Hata tekrar seansı: fiil+zaman yüklendiğinde doğru şahısa odaklan ve kutuları temizle */
  useEffect(() => {
    if (mode !== 'quiz') return;
    if (!mistakeReplaySession || (selectedLanguage !== 'es' && selectedLanguage !== 'fr')) return;
    const cur = mistakeReplaySession.queue[mistakeReplaySession.index];
    if (!cur || !verbKey || verbKey !== cur.verb || selectedTense !== cur.tense) return;
    const pIdx = qp.indexOf(cur.person);
    if (pIdx < 0) return;
    setCurrentFocusIndex(pIdx);
    setUserAnswers(getInitialUserAnswers(selectedLanguage));
    setQuizFeedback(
      Object.fromEntries(pronounsForLang.map((p) => [p.id, null as 'correct' | 'wrong' | 'typo' | null]))
    );
    setQuizPasséHint(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as string | null])));
    resetSmartHintsAll();
    setShowHints(false);
    setShowCongrats(false);
  }, [
    mistakeReplaySession,
    mistakeReplaySession?.index,
    verbKey,
    selectedTense,
    selectedLanguage,
    pronounsForLang,
    resetSmartHintsAll,
    mode,
  ]);

  useEffect(() => {
    setRegimeOpen(false);
    setCollocationOpen(false);
    setRegionalOpen(false);
    setSerEstarOverlayOpen(false);
    setSerEstarAnswer(null);
    setActiveTimeMarkerTip(null);
    setActiveCollocationTip(null);
    setCollocationLevelFilter('A1');
  }, [verbKey, selectedLanguage]);

  useEffect(() => {
    setLearningCardModeOpen(false);
  }, [verbKey, selectedTense]);

  useEffect(() => {
    const onMastery = () => setMasteryUiTick((n) => n + 1);
    window.addEventListener('diloloji-mastery-changed', onMastery);
    return () => window.removeEventListener('diloloji-mastery-changed', onMastery);
  }, []);

  useEffect(() => {
    setShowAllIrregulars(false);
    setIrregularLeftPanelOpen(false);
  }, [selectedLanguage, selectedTense]);

  // Sayfa ilk açılışta veya yeni fiil seçildiğinde ilgili ilk input'a odaklan
  useEffect(() => {
    if (!verbKey && mode !== 'time-attack') {
      verbInputRef.current?.focus();
      return;
    }
  }, [verbKey, mode]);

  // Alıştırma sekmesi açıldığında kullanıcı tercihini uygula (varsayılan tekli).
  useEffect(() => {
    if (mode !== 'quiz') return;
    setQuizLayout(readExerciseModePreference());
    setCurrentFocusIndex(0);
  }, [mode, readExerciseModePreference]);

  useEffect(() => {
    return () => {
      if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
      if (staticExampleCopyTimeoutRef.current) clearTimeout(staticExampleCopyTimeoutRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakStaticExample = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) return;
      if (staticExampleSpeaking) {
        window.speechSynthesis.cancel();
        setStaticExampleSpeaking(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = selectedLanguage === 'fr' ? 'fr-FR' : 'es-ES';
      utter.onend = () => setStaticExampleSpeaking(false);
      utter.onerror = () => setStaticExampleSpeaking(false);
      setStaticExampleSpeaking(true);
      window.speechSynthesis.speak(utter);
    },
    [staticExampleSpeaking, selectedLanguage]
  );

  const copyStaticExample = useCallback(async (text: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setStaticExampleCopied(true);
      if (staticExampleCopyTimeoutRef.current) clearTimeout(staticExampleCopyTimeoutRef.current);
      staticExampleCopyTimeoutRef.current = setTimeout(() => {
        setStaticExampleCopied(false);
        staticExampleCopyTimeoutRef.current = null;
      }, 2000);
    } catch {
      setStaticExampleCopied(false);
    }
  }, []);

  // Hata Bankası: sayfa yüklendiğinde localStorage'dan oku
  useEffect(() => {
    setMistakeBank(getMistakes());
  }, []);

  // Yıldızlı fiiller: sayfa yüklendiğinde localStorage'dan oku
  useEffect(() => {
    setStarredVerbs(getStarredVerbs());
  }, []);

  // Geçmiş: localStorage'dan yükle
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VERB_HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setVerbHistory(parsed.filter((v) => typeof v === 'string').slice(0, 10));
    } catch {
      // ignore
    }
  }, []);

  // Fiil yüklendikçe geçmişe ekle (en yeni üstte, max 10)
  useEffect(() => {
    if (!verbKey) return;
    recordWorkedVerb(verbKey);
    setVerbHistory((prev) => {
      const next = [verbKey, ...prev.filter((v) => v !== verbKey)].slice(0, 10);
      try {
        localStorage.setItem(VERB_HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [verbKey]);

  // Otomatik tamamlama: dışarı tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteWrapRef.current && !autocompleteWrapRef.current.contains(e.target as Node)) {
        setAutocompleteClosed(true);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Öneri listesi kısaldığında seçili indeksi sınırla
  useEffect(() => {
    if (autocompleteSelectedIndex >= autocompleteSuggestions.length && autocompleteSuggestions.length > 0) {
      setAutocompleteSelectedIndex(autocompleteSuggestions.length - 1);
    }
  }, [autocompleteSuggestions.length, autocompleteSelectedIndex]);

  // Autocomplete dropdown pozisyonu: Portal için anchor rect, scroll/resize'ta güncelle
  const updateAutocompletePosition = useCallback(() => {
    if (!autocompleteAnchorRef.current || autocompleteSuggestions.length === 0 || autocompleteClosed) {
      setAutocompletePosition(null);
      return;
    }
    const rect = autocompleteAnchorRef.current.getBoundingClientRect();
    setAutocompletePosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [autocompleteSuggestions.length, autocompleteClosed]);

  useEffect(() => {
    if (autocompleteSuggestions.length === 0 || autocompleteClosed) {
      setAutocompletePosition(null);
      return;
    }
    updateAutocompletePosition();
    window.addEventListener('scroll', updateAutocompletePosition, true);
    window.addEventListener('resize', updateAutocompletePosition);
    return () => {
      window.removeEventListener('scroll', updateAutocompletePosition, true);
      window.removeEventListener('resize', updateAutocompletePosition);
    };
  }, [autocompleteSuggestions.length, autocompleteClosed, updateAutocompletePosition]);

  // Sanal klavye: aksan eklendikten sonra imleci yerleştir
  useEffect(() => {
    const p = lastAccentInsertRef.current;
    if (!p) return;
    const el = quizInputRefs.current[p.index];
    if (el) {
      el.focus();
      el.setSelectionRange(p.caretPosition, p.caretPosition);
    }
    lastAccentInsertRef.current = null;
  }, [userAnswers]);

  // Zamana Karşı moddan çıkınca timer'ı ve zorluk seçimini sıfırla
  useEffect(() => {
    if (mode !== 'time-attack') {
      if (timeAttackTimerRef.current) {
        clearInterval(timeAttackTimerRef.current);
        timeAttackTimerRef.current = null;
      }
      if (timeAttackAdvanceTimeoutRef.current) {
        clearTimeout(timeAttackAdvanceTimeoutRef.current);
        timeAttackAdvanceTimeoutRef.current = null;
      }
      setTimeAttackDifficulty(null);
      setTimeAttackGameOver(false);
      setTimeAttackLocked(false);
    }
  }, [mode]);

  const startTimeAttack = useCallback((difficulty: TimeAttackDifficulty) => {
    const cfg = difficultyConfig[difficulty];
    if (timeAttackTimerRef.current) {
      clearInterval(timeAttackTimerRef.current);
      timeAttackTimerRef.current = null;
    }
    if (timeAttackAdvanceTimeoutRef.current) {
      clearTimeout(timeAttackAdvanceTimeoutRef.current);
      timeAttackAdvanceTimeoutRef.current = null;
    }
    setTimeAttackDifficulty(difficulty);
    setTimeAttackGameOver(false);
    setTimeAttackTimeLeft(cfg.secondsPerQuestion);
    setTimeAttackScore(0);
    setTimeAttackCombo(1);
    setTimeAttackLives(3);
    setTimeAttackCorrectCount(0);
    setTimeAttackMaxCombo(1);
    setTimeAttackPointsFlash(null);
    setTimeAttackShake(false);
    setTimeAttackQuestion(getRandomTimeAttackQuestion(selectedLanguage, difficulty));
    setTimeAttackInput('');
    setTimeAttackFeedback(null);
    setTimeAttackRevealedAnswer(null);
    setTimeAttackLocked(false);
    // Per-question timer: süre bitince otomatik yanlış say
    timeAttackTimerRef.current = setInterval(() => {
      setTimeAttackTimeLeft((t) => (t <= 0 ? 0 : t - 1));
    }, 1000);
  }, [selectedLanguage]);

  /** Oyunu başa al → zorluk seçim ekranına dön */
  const resetToDifficultyMenu = useCallback(() => {
    if (timeAttackTimerRef.current) {
      clearInterval(timeAttackTimerRef.current);
      timeAttackTimerRef.current = null;
    }
    if (timeAttackAdvanceTimeoutRef.current) {
      clearTimeout(timeAttackAdvanceTimeoutRef.current);
      timeAttackAdvanceTimeoutRef.current = null;
    }
    setTimeAttackDifficulty(null);
    setTimeAttackGameOver(false);
    setTimeAttackLocked(false);
    setTimeAttackQuestion(null);
    setTimeAttackInput('');
    setTimeAttackFeedback(null);
    setTimeAttackRevealedAnswer(null);
  }, []);

  /** Sıradaki soruya geç — doğru cevabı temizle, kilidi aç, input'u sıfırla, süreyi yenile */
  const advanceToNextTimeAttackQuestion = useCallback(() => {
    if (timeAttackAdvanceTimeoutRef.current) {
      clearTimeout(timeAttackAdvanceTimeoutRef.current);
      timeAttackAdvanceTimeoutRef.current = null;
    }
    setTimeAttackRevealedAnswer(null);
    setTimeAttackLocked(false);
    setTimeAttackFeedback(null);
    setTimeAttackInput('');
    const diff = timeAttackDifficulty ?? 'medium';
    setTimeAttackQuestion(getRandomTimeAttackQuestion(selectedLanguage, diff));
    setTimeAttackTimeLeft(difficultyConfig[diff].secondsPerQuestion);
    requestAnimationFrame(() => timeAttackInputRef.current?.focus());
  }, [selectedLanguage, timeAttackDifficulty]);

  /** Yanlış cevap akışı — can düş, doğruyu göster, 1.8s bekle, sıradakine geç */
  const handleTimeAttackWrong = useCallback((correctAnswer: string, opts?: { fromTimeout?: boolean }) => {
    setTimeAttackFeedback('wrong');
    setTimeAttackRevealedAnswer(correctAnswer || '—');
    setTimeAttackLocked(true);
    setTimeAttackCombo(1);
    setTimeAttackShake(true);
    setTimeout(() => setTimeAttackShake(false), 400);
    let gameEnded = false;
    setTimeAttackLives((l) => {
      const next = l - 1;
      if (next <= 0 && timeAttackTimerRef.current) {
        clearInterval(timeAttackTimerRef.current);
        timeAttackTimerRef.current = null;
        gameEnded = true;
      }
      return Math.max(0, next);
    });
    if (timeAttackAdvanceTimeoutRef.current) clearTimeout(timeAttackAdvanceTimeoutRef.current);
    timeAttackAdvanceTimeoutRef.current = setTimeout(() => {
      timeAttackAdvanceTimeoutRef.current = null;
      if (gameEnded) {
        setTimeAttackGameOver(true);
        setTimeAttackLocked(false);
        setTimeAttackRevealedAnswer(null);
        setTimeAttackFeedback(null);
      } else {
        advanceToNextTimeAttackQuestion();
      }
    }, opts?.fromTimeout ? 2000 : 1800);
  }, [advanceToNextTimeAttackQuestion]);

  const submitTimeAttackAnswer = useCallback(() => {
    const q = timeAttackQuestion;
    if (!q || timeAttackGameOver || timeAttackLocked || !timeAttackInput.trim()) return;
    const diff = timeAttackDifficulty ?? 'medium';
    const cfg = difficultyConfig[diff];
    const conjugations = getConjugationForTenseForLang(q.verbKey, q.tense, selectedLanguage);
    const correct = conjugations[q.pronoun] ?? '';
    const isCorrect = checkOne(timeAttackInput.trim(), correct);
    if (isCorrect) {
      setTimeAttackFeedback('correct');
      const left = timeAttackTimeLeft;
      const nextCombo = timeAttackCombo + 1;
      const tb = Math.max(1, Math.min(10, Math.round(1 + (left / cfg.secondsPerQuestion) * 9)));
      let xpMult = 1;
      if (nextCombo >= 5) xpMult = 2;
      else if (nextCombo >= 3) xpMult = 1.5;
      const xpGain = Math.round((15 + tb) * xpMult);
      addXP(xpGain);
      const xpMultLabel = xpMult >= 2 ? '×2' : xpMult >= 1.5 ? '×1.5' : '';
      showFloatingXp(
        xpMultLabel ? `+${xpGain} XP ⚡${xpMultLabel}` : `+${xpGain} XP`,
        window.innerWidth / 2,
        window.innerHeight * 0.35
      );
      const points = 10 * timeAttackCombo * cfg.multiplier;
      setTimeAttackScore((s) => s + points);
      setTimeAttackCombo((c) => c + 1);
      setTimeAttackCorrectCount((n) => n + 1);
      setTimeAttackMaxCombo((m) => Math.max(m, nextCombo));
      recordWeeklyCombo(nextCombo);
      tryUnlockComboKingBadge(nextCombo);
      setTimeAttackPointsFlash(points);
      setTimeout(() => setTimeAttackPointsFlash(null), 700);
      addActivityToday(1);
      updateDocumentTitle();
      speakAuto(correct, { lang: selectedLanguage === 'es' ? 'es-ES' : 'fr-FR' });
      // Doğru → bekletmeden sıradaki soruya geç + süreyi yenile
      setTimeAttackInput('');
      setTimeAttackQuestion(getRandomTimeAttackQuestion(selectedLanguage, diff));
      setTimeAttackTimeLeft(cfg.secondsPerQuestion);
      setTimeout(() => setTimeAttackFeedback(null), 600);
    } else {
      handleTimeAttackWrong(correct);
    }
  }, [
    timeAttackQuestion,
    timeAttackGameOver,
    timeAttackLocked,
    timeAttackInput,
    timeAttackCombo,
    timeAttackTimeLeft,
    selectedLanguage,
    timeAttackDifficulty,
    handleTimeAttackWrong,
    addXP,
    showFloatingXp,
  ]);

  /** Per-question timer sıfıra düştüğünde: doğru cevabı göster, can düşür, sıradaki soruya geç */
  useEffect(() => {
    if (timeAttackTimeLeft !== 0) return;
    if (!timeAttackDifficulty || timeAttackGameOver || timeAttackLocked) return;
    const q = timeAttackQuestion;
    if (!q) return;
    const conjugations = getConjugationForTenseForLang(q.verbKey, q.tense, selectedLanguage);
    const correct = conjugations[q.pronoun] ?? '';
    handleTimeAttackWrong(correct, { fromTimeout: true });
  }, [timeAttackTimeLeft, timeAttackDifficulty, timeAttackGameOver, timeAttackLocked, timeAttackQuestion, selectedLanguage, handleTimeAttackWrong]);

  const setAnswer = useCallback((pronoun: string, value: string) => {
    setUserAnswers((prev) => ({ ...prev, [pronoun]: value }));
    setQuizFeedback((prev) => ({ ...prev, [pronoun]: null }));
    setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
  }, []);

  /** Hata Bankasına ekle (unique); state ve localStorage güncellenir. */
  const addToMistakeBank = useCallback((verb: string, tense: string, pronoun: string) => {
    setMistakeBank((prev) => {
      const next = addMistake(verb, tense, pronoun);
      return next.length !== prev.length ? next : prev;
    });
  }, []);

  const bumpSpanishMistakeMemory = useCallback(() => {
    setMistakeMemoryTick((t) => t + 1);
  }, []);

  const onQuizMistakeWrong = useCallback(
    (pronoun: string, userAns: string, correctAns: string) => {
      if ((selectedLanguage !== 'es' && selectedLanguage !== 'fr') || !verbKey) return;
      if (mode === 'quiz') {
        recordMasteryWrong(selectedLanguage, verbKey, selectedTense, pronoun);
      }
      recordSpanishMistake(verbKey, selectedTense, pronoun, userAns, correctAns, selectedLanguage);
      bumpSpanishMistakeMemory();
    },
    [selectedLanguage, verbKey, selectedTense, mode, bumpSpanishMistakeMemory]
  );

  const onQuizMistakeCorrect = useCallback(
    (pronoun: string) => {
      if ((selectedLanguage !== 'es' && selectedLanguage !== 'fr') || !verbKey) return;
      if (mode === 'quiz') {
        recordQuizSpacedRepetitionCorrect(verbKey, selectedTense, pronoun, selectedLanguage);
        const r = recordMasteryCorrect(selectedLanguage, verbKey, selectedTense, pronoun);
        if (r.xpGained > 0) {
          addXP(r.xpGained);
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight * 0.35;
          showFloatingXp(`+${r.xpGained} ${t('verbLab.mastery.xpFloat')}`, cx, cy);
        }
        if (r.crossedLevels.includes(5)) {
          void confetti({
            particleCount: 200,
            spread: 85,
            startVelocity: 48,
            origin: { y: 0.52 },
            scalar: 1,
          });
        }
        try {
          const tenseIds = tensesForLang.map((x) => x.id);
          if (isVerbFullyMastered(selectedLanguage, verbKey, tenseIds, pronounIds)) {
            const tid = `diloloji-full-mastery-${selectedLanguage}-${verbKey.toLowerCase()}`;
            if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(tid)) {
              sessionStorage.setItem(tid, '1');
              setToastMessage(t('verbLab.mastery.fullVerbToast', { verb: verbKey }));
            }
          }
        } catch {
          // ignore
        }
      }
      const mm = getSpanishMistake(verbKey, selectedTense, pronoun, selectedLanguage);
      if (mm && !mm.resolved) {
        markSpanishMistakeResolved(verbKey, selectedTense, pronoun, selectedLanguage);
        bumpSpanishMistakeMemory();
      }
    },
    [
      selectedLanguage,
      verbKey,
      selectedTense,
      mode,
      bumpSpanishMistakeMemory,
      addXP,
      showFloatingXp,
      t,
      tensesForLang,
      pronounIds,
    ]
  );

  const startMistakeReplay = useCallback(() => {
    const queue = getMistakesForReviewSorted(selectedLanguage);
    if (queue.length === 0) return;
    if (mistakeReplayAdvanceTimerRef.current) {
      clearTimeout(mistakeReplayAdvanceTimerRef.current);
      mistakeReplayAdvanceTimerRef.current = null;
    }
    setMistakeReplayComplete(null);
    setMistakeReplayShowTick(false);
    setExerciseMode('focus');
    setMode('quiz');
    const first = queue[0];
    const lang = first.lang ?? selectedLanguage;
    setSelectedLanguage(lang);
    setMistakeReplaySession({ queue, index: 0, resolvedInSession: 0 });
    loadVerb(first.verb, lang, first.tense);
  }, [loadVerb, setExerciseMode, setSelectedLanguage, selectedLanguage]);

  const openMistakeRow = useCallback(
    (entry: MistakeMemoryEntry) => {
      pendingMistakeSidebarPersonRef.current = entry.person;
      setMistakeReplaySession(null);
      setMistakeReplayComplete(null);
      setExerciseMode('focus');
      setMode('quiz');
      const lang = entry.lang ?? 'es';
      setSelectedLanguage(lang);
      loadVerb(entry.verb, lang, entry.tense);
    },
    [loadVerb, setExerciseMode, setSelectedLanguage]
  );

  const openSpacedRepetitionRow = useCallback(
    (entry: QuizSpacedRepetitionEntry) => {
      pendingMistakeSidebarPersonRef.current = entry.person;
      setMistakeReplaySession(null);
      setMistakeReplayComplete(null);
      setExerciseMode('focus');
      setMode('quiz');
      const lang = entry.lang === 'fr' ? 'fr' : 'es';
      setSelectedLanguage(lang);
      loadVerb(entry.verb, lang, entry.tense);
    },
    [loadVerb, setExerciseMode, setSelectedLanguage]
  );

  const openMasteryDueRow = useCallback(
    (entry: MasteryDueItem) => {
      masteryDrillRef.current = null;
      setMasteryDrillUi(null);
      pendingMistakeSidebarPersonRef.current = entry.person;
      setMistakeReplaySession(null);
      setMistakeReplayComplete(null);
      setExerciseMode('focus');
      setMode('quiz');
      setSelectedLanguage(entry.lang);
      loadVerb(entry.verb, entry.lang, entry.tense);
    },
    [loadVerb, setExerciseMode, setSelectedLanguage]
  );

  const startMasteryDailyDrill = useCallback(() => {
    if (selectedLanguage !== 'es' && selectedLanguage !== 'fr') return;
    const items = getMasteryDueToday(selectedLanguage);
    if (items.length === 0) return;
    masteryDrillRef.current = { items, index: 0 };
    setMasteryDrillUi({ total: items.length, index: 0 });
    const cur = items[0];
    pendingMistakeSidebarPersonRef.current = cur.person;
    setMistakeReplaySession(null);
    setMistakeReplayComplete(null);
    setExerciseMode('focus');
    setMode('quiz');
    setSelectedLanguage(cur.lang);
    loadVerb(cur.verb, cur.lang, cur.tense);
  }, [loadVerb, setExerciseMode, setSelectedLanguage, selectedLanguage]);

  /** Yıldızlı fiil aç/kapat; state ve localStorage güncellenir. */
  const toggleStar = useCallback((verb: string) => {
    setStarredVerbs(toggleStarredVerb(verb));
  }, []);

  /** Sanal klavye: aksanlı harfi aktif quiz inputuna imleç konumuna ekle. */
  const insertAccentChar = useCallback((char: string) => {
    if (quizSessionLivesDepleted) return;
    const index = activeQuizInputIndexRef.current;
    const pronoun = qp[index];
    const el = quizInputRefs.current[index];
    const value = userAnswers[pronoun] ?? '';
    const start = el ? (el.selectionStart ?? value.length) : value.length;
    const end = el ? (el.selectionEnd ?? value.length) : value.length;
    const newValue = value.slice(0, start) + char + value.slice(end);
    setAnswer(pronoun, newValue);
    lastAccentInsertRef.current = { index, caretPosition: start + char.length };
  }, [userAnswers, qp, quizSessionLivesDepleted]);

  const openQuizCompletion = useCallback(() => {
    if (mistakeReplaySession) return;
    if (quizCompletionHandledRef.current) return;
    quizCompletionHandledRef.current = true;

    if (!quizSessionHadWrongRef.current && !quizFlawlessAwardedRef.current) {
      quizFlawlessAwardedRef.current = true;
      addXP(20);
      quizXpSessionBreakdownRef.current.flawless += 20;
    }

    const b = { ...quizXpSessionBreakdownRef.current };
    if (b.flawless > 0) tryUnlockPerfectionistBadge();
    const endTotal = getTotalXP();
    const endLevel = getLevel(endTotal);
    const barTo = getXPProgress(endTotal).percent;
    const totalEarnedSession =
      b.correctBaseXp +
      b.firstTryBonus +
      b.irregularBonus +
      b.specialBonus +
      b.dailyFirst +
      b.dailyVerb +
      b.flawless -
      b.hintPenalty;

    setQuizCompletionSummary({
      totalEarnedSession,
      breakdown: b,
      startLevel: quizStartLevelRef.current,
      endLevel,
      leveledUp: endLevel > quizStartLevelRef.current,
      barFromPercent: quizBarStartPercentRef.current,
      barToPercent: barTo,
    });
    setCongratsXpBar(quizBarStartPercentRef.current);
    requestAnimationFrame(() => setCongratsXpBar(barTo));

    if (quizLayout === 'focus') {
      void confetti({
        particleCount: 130,
        spread: 72,
        startVelocity: 38,
        origin: { y: 0.55 },
        scalar: 0.95,
      });
    }
    if (quizLayout === 'list') setShowCongrats(true);
  }, [addXP, mistakeReplaySession, quizLayout]);

  const awardQuizCorrectXp = useCallback(
    (
      pronoun: string,
      opts?: {
        isReveal?: boolean;
        clientX?: number;
        clientY?: number;
        splitXpFloat?: boolean;
        bonusXp?: number;
      }
    ) => {
      if (!verbKey || mode !== 'quiz') return;

      const hintPen = showHints || opts?.isReveal || quizPersonUsedHintRef.current.has(pronoun) ? 3 : 0;
      const firstTry =
        !showHints &&
        !opts?.isReveal &&
        (quizAttempts[pronoun] ?? 0) === 0 &&
        quizHintMode[pronoun] == null;

      const baseXp = getTenseBaseXp(selectedTense);
      const irregularXp =
        (selectedLanguage === 'es' || selectedLanguage === 'fr') && isIrregularVerb(verbKey, selectedLanguage)
          ? IRREGULAR_BONUS
          : 0;
      const baseWithFirstTry = firstTry ? Math.round(baseXp * FIRST_TRY_MULTIPLIER) : baseXp;
      const firstTryExtra = firstTry ? baseWithFirstTry - baseXp : 0;
      const bonusXp = opts?.bonusXp ?? 0;

      const b = quizXpSessionBreakdownRef.current;
      b.correctBaseXp += baseXp;
      b.firstTryBonus += firstTryExtra;
      b.irregularBonus += irregularXp;
      if (bonusXp > 0) b.specialBonus += bonusXp;
      if (hintPen) b.hintPenalty += hintPen;

      let dailyExtra = 0;
      if (!quizDailyBonusesAppliedRef.current) {
        const d1 = claimFirstDailyQuizBonus();
        const d2 = claimDifferentVerbBonus(verbKey);
        if (d1 || d2) {
          quizDailyBonusesAppliedRef.current = true;
          dailyExtra = d1 + d2;
          if (d1) b.dailyFirst += d1;
          if (d2) b.dailyVerb += d2;
        }
      }

      const preDaily = baseWithFirstTry + irregularXp - hintPen + bonusXp;
      const net = preDaily + dailyExtra;
      const cx = opts?.clientX ?? window.innerWidth / 2;
      const cy = opts?.clientY ?? window.innerHeight * 0.38;

      if (net !== 0) {
        addXP(net);
        const canSplit =
          opts?.splitXpFloat &&
          hintPen === 0 &&
          !opts?.isReveal &&
          !showHints &&
          (firstTryExtra > 0 || irregularXp > 0 || bonusXp > 0 || dailyExtra > 0);
        if (canSplit) {
          let step = 0;
          const pushFloat = (text: string) => {
            const delay = step * 220;
            const tid = window.setTimeout(() => showFloatingXp(text, cx, cy - step * 28), delay);
            focusFlowTimersRef.current.push(tid);
            step += 1;
          };
          pushFloat(`+${baseXp} XP ⚡`);
          if (firstTryExtra > 0) pushFloat(`+${firstTryExtra} XP ⭐ İlk Deneme!`);
          if (irregularXp > 0) pushFloat(`+${irregularXp} BONUS 🔥`);
          if (bonusXp > 0) pushFloat(`+${bonusXp} XP`);
          if (dailyExtra > 0) pushFloat(`+${dailyExtra} XP`);
        } else {
          showFloatingXp(`+${Math.max(0, net)} XP ⚡`, cx, cy);
        }
      }
    },
    [
      verbKey,
      mode,
      showHints,
      quizAttempts,
      quizHintMode,
      selectedTense,
      selectedLanguage,
      addXP,
      showFloatingXp,
    ]
  );

  awardQuizCorrectXpRef.current = awardQuizCorrectXp;

  useEffect(() => {
    if (mode !== 'quiz' || !verbKey || mistakeReplaySession || quizSessionLivesDepleted) return;
    const allOk = qp.every((p) => quizFeedback[p] === 'correct');
    if (!allOk) return;
    openQuizCompletion();
  }, [mode, verbKey, mistakeReplaySession, quizSessionLivesDepleted, quizFeedback, qp, openQuizCompletion]);

  /** Yanlış cevapta bir can düşür; hata tekrar seansında yok sayılır. Bittiğinde true döner. */
  const applyQuizLifeLoss = useCallback((): boolean => {
    if (mistakeReplaySession) return false;
    let hitZero = false;
    setQuizLives((l) => {
      if (l <= 0) {
        hitZero = true;
        setQuizLivesExhausted(true);
        return 0;
      }
      const lostIdx = l - 1;
      setQuizHeartLostAnimSlot(lostIdx);
      window.setTimeout(() => {
        setQuizHeartLostAnimSlot((cur) => (cur === lostIdx ? null : cur));
      }, 720);
      setQuizHeartBump((n) => n + 1);
      const next = l - 1;
      if (next <= 0) {
        hitZero = true;
        setQuizLivesExhausted(true);
      }
      return next;
    });
    return hitZero;
  }, [mistakeReplaySession]);

  const checkQuiz = useCallback(() => {
    if (quizSessionLivesDepleted) return;
    if (!conjugations) return;
    const firstEmpty = qp.find((p) => (userAnswers[p] ?? '').trim() === '');
    if (firstEmpty !== undefined) {
      setQuizEmptyShake(firstEmpty);
      setTimeout(() => setQuizEmptyShake(null), 500);
      return;
    }
    const next: Record<string, 'correct' | 'wrong' | 'typo' | null> = {};
    const nextHints: Record<string, string | null> = Object.fromEntries(qp.map((p) => [p, null]));
    qp.forEach((pronoun) => {
      const user = userAnswers[pronoun];
      const correct = conjugations[pronoun];
      const result = user.trim() === '' ? null : checkAnswer(user, correct);
      next[pronoun] = result;
      if (result === 'wrong' && verbKey) onQuizMistakeWrong(pronoun, user.trim(), correct);
      if (result === 'correct' && verbKey) onQuizMistakeCorrect(pronoun);
      if (next[pronoun] === 'wrong' && selectedLanguage === 'fr' && selectedTense === 'passe-compose' && verbKey) {
        nextHints[pronoun] = checkPasséComposéLogic(user, correct, pronoun as import('../data/verbs').Pronoun, verbKey);
      }
    });
    const hasWrong = qp.some((p) => next[p] === 'wrong');
    const newlyWrongThisCheck = qp.some(
      (p) => next[p] === 'wrong' && quizFeedback[p] !== 'wrong'
    );
    if (hasWrong) quizSessionHadWrongRef.current = true;
    qp.forEach((pronoun) => {
      if (next[pronoun] === 'correct' && quizFeedback[pronoun] !== 'correct') {
        awardQuizCorrectXp(pronoun);
      }
    });
    const newCorrectCount = qp.filter(
      (p) => next[p] === 'correct' && quizFeedback[p] !== 'correct'
    ).length;
    setQuizFeedback(next);
    setQuizPasséHint(nextHints);
    if (hasWrong && verbKey) {
      qp.forEach((p) => {
        if (next[p] === 'wrong') {
          addToMistakeBank(verbKey, selectedTense, p);
          if (selectedLanguage === 'es' || selectedLanguage === 'fr')
            recordQuizSpacedRepetitionWrong(verbKey, selectedTense, p, selectedLanguage);
        }
      });
    }
    if (hasWrong) {
      setCombo(0);
      if (newlyWrongThisCheck) applyQuizLifeLoss();
    } else if (newCorrectCount > 0 && !showHints) {
      const nextCombo = combo + newCorrectCount;
      recordWeeklyCombo(nextCombo);
      tryUnlockComboKingBadge(nextCombo);
      setCombo((c) => {
        const nc = c + newCorrectCount;
        if (nc >= 2) {
          if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
          setComboDisplay({ show: true, value: nc });
          comboDisplayTimeoutRef.current = setTimeout(() => {
            setComboDisplay((d) => ({ ...d, show: false }));
            comboDisplayTimeoutRef.current = null;
          }, 1800);
        }
        return nc;
      });
      setTotalScore((s) => s + newCorrectCount * 10);
      addActivityToday(newCorrectCount);
      updateDocumentTitle();
    }
  }, [
    conjugations,
    userAnswers,
    quizFeedback,
    showHints,
    selectedTense,
    verbKey,
    addToMistakeBank,
    onQuizMistakeWrong,
    onQuizMistakeCorrect,
    awardQuizCorrectXp,
    qp,
    combo,
    applyQuizLifeLoss,
    quizSessionLivesDepleted,
  ]);

  /** Show Hint açıldığında mevcut fiil+zaman için tüm şahısları Hata Bankasına ekle. */
  const toggleShowHints = useCallback(() => {
    setShowHints((h) => {
      const next = !h;
      if (next && verbKey && mode === 'quiz') {
        qp.forEach((pronoun) => addToMistakeBank(verbKey, selectedTense, pronoun));
      }
      return next;
    });
  }, [verbKey, mode, selectedTense, addToMistakeBank]);

  const resetQuiz = useCallback(() => {
    resetQuizXpSession();
    setUserAnswers(getInitialUserAnswers(selectedLanguage));
    setQuizFeedback(
      Object.fromEntries(pronounsForLang.map((p) => [p.id, null as 'correct' | 'wrong' | 'typo' | null]))
    );
    setQuizPasséHint(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as string | null])));
    resetSmartHintsAll();
    setShowHints(false);
    setShowCongrats(false);
    setCurrentFocusIndex(0);
    setQuizLives(3);
    setQuizLivesExhausted(false);
    setQuizHeartLostAnimSlot(null);
    setFocusMcPickedIndex(null);
    setFocusMcLocked(false);
    setFocusMcKeyFlashIndex(null);
    if (focusMcKeyFlashTimeoutRef.current) {
      clearTimeout(focusMcKeyFlashTimeoutRef.current);
      focusMcKeyFlashTimeoutRef.current = null;
    }
    setFocusCanSkipAfterWrong(false);
    setFocusCorrectGlow(false);
    setQuizAccentBarVisible(false);
    setCongratsXpBar(0);
    setListenReplayCount(0);
    setListenForcedHint(false);
    setReverseSelPronoun('');
    setReverseSelTense('');
    focusFlowBusyRef.current = false;
    focusFlowTimersRef.current.forEach(clearTimeout);
    focusFlowTimersRef.current = [];
  }, [selectedLanguage, pronounsForLang, resetSmartHintsAll, resetQuizXpSession]);

  const advanceMasteryDrillAfterRound = useCallback(() => {
    const d = masteryDrillRef.current;
    if (!d) {
      setMasteryDrillUi(null);
      return;
    }
    const nextIdx = d.index + 1;
    if (nextIdx >= d.items.length) {
      masteryDrillRef.current = null;
      setMasteryDrillUi(null);
      setQuizCompletionSummary(null);
      setToastMessage(t('verbLab.mastery.drillComplete'));
      resetQuiz();
      return;
    }
    const cur = d.items[nextIdx];
    masteryDrillRef.current = { items: d.items, index: nextIdx };
    setMasteryDrillUi({ total: d.items.length, index: nextIdx });
    pendingMistakeSidebarPersonRef.current = cur.person;
    setSelectedLanguage(cur.lang);
    setQuizCompletionSummary(null);
    loadVerb(cur.verb, cur.lang, cur.tense);
  }, [loadVerb, setSelectedLanguage, t, resetQuiz]);

  /** Zorlandıklarım (Review) modunu aç: tekrar zamanı gelmiş (due) sorulardan rastgele birini seç. */
  const openReviewMode = useCallback(() => {
    setMode('review');
    const list = getDueMistakes();
    if (list.length === 0) {
      setReviewEntry(null);
      return;
    }
    const idx = Math.floor(Math.random() * list.length);
    setReviewEntry(list[idx]);
    setReviewAnswer('');
    setReviewSubmitted(false);
    setReviewCorrect(false);
    reviewHadWrongRef.current = false;
    requestAnimationFrame(() => reviewInputRef.current?.focus());
  }, []);

  /** Review modunda bir sonraki soruya geç veya due listesi boşsa modu kapat. */
  const goToNextReviewQuestion = useCallback(() => {
    const list = getDueMistakes();
    if (list.length === 0) {
      setReviewEntry(null);
      setMode('quiz');
      return;
    }
    const idx = Math.floor(Math.random() * list.length);
    setReviewEntry(list[idx]);
    setReviewAnswer('');
    setReviewSubmitted(false);
    setReviewCorrect(false);
    reviewHadWrongRef.current = false;
    requestAnimationFrame(() => reviewInputRef.current?.focus());
  }, []);

  /** Review modunda cevap gönder: ilk seferde doğruysa interval/nextReviewDate güncelle (30 günü geçerse sil), yanlışsa sıfırla. */
  const submitReviewAnswer = useCallback(() => {
    if (!reviewEntry || !reviewAnswer.trim()) return;
    let correctValue: string;
    try {
      const reviewLang: AppLanguage = ['je','tu','il','nous','vous','ils'].includes(reviewEntry.pronoun) ? 'fr' : 'es';
      correctValue = getConjugationForTenseForLang(reviewEntry.verb, reviewEntry.tense, reviewLang)[reviewEntry.pronoun];
    } catch {
      return;
    }
    const isCorrect = checkOne(reviewAnswer, correctValue);
    setReviewSubmitted(true);
    setReviewCorrect(isCorrect);
    if (!isCorrect) {
      reviewHadWrongRef.current = true;
      const nextList = updateMistakeReview(reviewEntry.verb, reviewEntry.tense, reviewEntry.pronoun, 'wrong_or_hint');
      setMistakeBank(nextList);
      return;
    }
    if (!reviewHadWrongRef.current) {
      const nextList = updateMistakeReview(
        reviewEntry.verb,
        reviewEntry.tense,
        reviewEntry.pronoun,
        'correct_first_try'
      );
      setMistakeBank(nextList);
      setToastMessage('Listeden silindi! 🎉');
    }
    goToNextReviewQuestion();
  }, [reviewEntry, reviewAnswer, goToNextReviewQuestion]);

  // Toast 3 saniye sonra kapanır
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const conjugationsForDisplay = conjugations;

  /** Odak → liste: şahıs kutularını mevcut cevaplarla doldur (çoktan seç / sıralı yazı senkronu). */
  const quizLayoutPrevRef = useRef(quizLayout);
  useEffect(() => {
    const prevLayout = quizLayoutPrevRef.current;
    quizLayoutPrevRef.current = quizLayout;
    if (mode !== 'quiz' || quizLayout !== 'list' || prevLayout !== 'focus') return;
    if (!conjugations) return;
    setUserAnswers((prevAnswers) => {
      const next = getInitialUserAnswers(selectedLanguage);
      for (const { id } of pronounsForLang) {
        const typed = prevAnswers[id]?.trim() ?? '';
        if (typed !== '') {
          next[id] = prevAnswers[id]!;
          continue;
        }
        const fb = quizFeedback[id];
        if ((fb === 'correct' || fb === 'typo') && conjugations[id]?.trim()) {
          next[id] = conjugations[id]!.trim();
        }
      }
      return next;
    });
  }, [mode, quizLayout, selectedLanguage, pronounsForLang, conjugations, quizFeedback]);

  const focusUsesListen = useMemo(
    () =>
      quizLayout === 'focus' &&
      !mistakeReplaySession &&
      quizInteractionMode === 'listen' &&
      selectedLanguage === 'es',
    [quizLayout, mistakeReplaySession, quizInteractionMode, selectedLanguage]
  );
  const focusUsesReverse = useMemo(
    () =>
      quizLayout === 'focus' &&
      !mistakeReplaySession &&
      quizInteractionMode === 'reverse' &&
      selectedLanguage === 'es',
    [quizLayout, mistakeReplaySession, quizInteractionMode, selectedLanguage]
  );
  const focusUsesChoice = useMemo(() => {
    if (quizLayout !== 'focus' || mistakeReplaySession) return false;
    if (quizInteractionMode === 'listen' || quizInteractionMode === 'reverse') return false;
    if (quizInteractionMode === 'choice') return true;
    // Karışık (🔀): soru indeksi çift → yazma, tek → çoktan seç (sırayla).
    if (quizInteractionMode === 'mixed') return currentFocusIndex % 2 === 1;
    return false;
  }, [quizLayout, mistakeReplaySession, quizInteractionMode, currentFocusIndex]);

  /** Odak modunda: yazma/dinleme turunda tek satır input; çoktan seç / ters çevirmede metin kutusu yok. */
  const focusRoundNeedsTextInputFocus = useMemo(
    () =>
      quizLayout === 'focus' &&
      (focusUsesListen || (!focusUsesChoice && !focusUsesReverse)),
    [quizLayout, focusUsesListen, focusUsesChoice, focusUsesReverse]
  );

  useEffect(() => {
    if (mode !== 'quiz' || !verbKey || quizLayout !== 'focus' || currentFocusIndex >= qp.length) return;
    const id = requestAnimationFrame(() => {
      if (focusRoundNeedsTextInputFocus) {
        quizInputRefs.current[0]?.focus();
      } else if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [mode, verbKey, quizLayout, currentFocusIndex, qp.length, focusRoundNeedsTextInputFocus]);

  const focusMcOptions = useMemo(() => {
    if (!focusUsesChoice || !conjugationsForDisplay) return [];
    const pid = qp[currentFocusIndex];
    if (!pid || currentFocusIndex >= qp.length) return [];
    const correct = conjugationsForDisplay[pid] ?? '';
    if (!correct.trim()) return [];
    return buildFocusMultipleChoice(correct, conjugationsForDisplay, pid, qp);
  }, [focusUsesChoice, conjugationsForDisplay, currentFocusIndex, qp]);

  useEffect(() => {
    setFocusMcPickedIndex(null);
    setFocusMcLocked(false);
    setFocusMcKeyFlashIndex(null);
    if (focusMcKeyFlashTimeoutRef.current) {
      clearTimeout(focusMcKeyFlashTimeoutRef.current);
      focusMcKeyFlashTimeoutRef.current = null;
    }
    setFocusCanSkipAfterWrong(false);
  }, [currentFocusIndex, focusUsesChoice, verbKey, selectedTense]);

  const listenQuizHideVerbHeader = useMemo(() => {
    if (mode !== 'quiz' || quizLayout !== 'focus' || quizInteractionMode !== 'listen') return false;
    if (currentFocusIndex >= qp.length) return false;
    const p = qp[currentFocusIndex];
    return !!p && quizFeedback[p] === null;
  }, [mode, quizLayout, quizInteractionMode, currentFocusIndex, qp, quizFeedback]);

  useEffect(() => {
    if (!focusUsesReverse) return;
    setReverseSelPronoun('');
    setReverseSelTense('');
  }, [currentFocusIndex, focusUsesReverse, verbKey, selectedTense]);

  const replayListenConjugation = useCallback(() => {
    if (!focusUsesListen || !conjugationsForDisplay || currentFocusIndex >= qp.length) return;
    const p = qp[currentFocusIndex];
    const txt = conjugationsForDisplay[p]?.trim();
    if (!txt) return;
    setListenReplayCount((c) => {
      const n = c + 1;
      if (n >= 3) setListenForcedHint(true);
      return n;
    });
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = 'es-ES';
      window.speechSynthesis.speak(u);
    }
  }, [focusUsesListen, conjugationsForDisplay, currentFocusIndex, qp]);

  const listenAutoSpeakKey = useMemo(() => {
    if (!focusUsesListen || !conjugationsForDisplay || mode !== 'quiz') return '';
    if (currentFocusIndex >= qp.length) return '';
    const p = qp[currentFocusIndex];
    const txt = (p && conjugationsForDisplay[p]?.trim()) || '';
    if (!p || !txt) return '';
    return `${verbKey}|${selectedTense}|${p}|${txt}`;
  }, [focusUsesListen, conjugationsForDisplay, mode, currentFocusIndex, qp, verbKey, selectedTense]);

  useEffect(() => {
    if (!listenAutoSpeakKey) return;
    const p = qp[currentFocusIndex];
    const txt = p ? conjugationsForDisplay?.[p]?.trim() : '';
    if (!txt) return;
    setListenForcedHint(false);
    setListenReplayCount(1);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = 'es-ES';
      window.speechSynthesis.speak(u);
    }
  }, [listenAutoSpeakKey, qp, currentFocusIndex, conjugationsForDisplay]);

  /** Tekrar zamanı gelmiş (nextReviewDate <= bugün) kayıt sayısı — rozette bu gösterilir. */
  const dueCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return mistakeBank.filter((e) => e.nextReviewDate <= today).length;
  }, [mistakeBank]);

  /** Quiz inputları: Enter ile kontrol. Doğruysa sonraki boş inputa focus; yanlışsa aynı inputta kal. */
  /**
   * Akıllı İpucu — yanlış cevaptan sonra çağrılır. Üç aşama:
   *   1. yanlış → 'rule'    (kural ipucu UI'da gösterilir)
   *   2. yanlış → 'letters' (ilk 2 harf açık, kalanı maskeli)
   *   3. yanlış → 'reveal'  (input doğru cevapla doldurulur, 1.5sn sonra "doğru" sayılır
   *      ve odak modunda bir sonraki şahısa geçilir; SRS'e öncelikli işaretlenir).
   * Liste modunda advance işi normal akışa bırakılır (revealAdvance opsiyonu false).
   */
  const applySmartHintAfterWrong = useCallback(
    (
      pronoun: string,
      correct: string,
      verb: string,
      tense: string,
      opts: { onRevealAdvance?: () => void } = {}
    ) => {
      const nextAttempts = (quizAttempts[pronoun] ?? 0) + 1;
      if (nextAttempts >= 1) quizPersonUsedHintRef.current.add(pronoun);
      setQuizAttempts((prev) => ({ ...prev, [pronoun]: nextAttempts }));
      if (nextAttempts >= 3) {
        setQuizHintMode((prev) => ({ ...prev, [pronoun]: 'reveal' }));
        setUserAnswers((prev) => ({ ...prev, [pronoun]: correct }));
        markRevealedAfterThreeAttempts(verb, tense, pronoun);
        setMistakeBank(getMistakes());
        const prevTimer = revealTimersRef.current[pronoun];
        if (prevTimer) clearTimeout(prevTimer);
        revealTimersRef.current[pronoun] = setTimeout(() => {
          revealTimersRef.current[pronoun] = null;
          setQuizFeedback((prev) => ({ ...prev, [pronoun]: 'correct' }));
          awardQuizCorrectXpRef.current(pronoun, { isReveal: true });
          speakAuto(correct, { lang: selectedLanguage === 'es' ? 'es-ES' : 'fr-FR' });
          opts.onRevealAdvance?.();
          setQuizAttempts((prev) => ({ ...prev, [pronoun]: 0 }));
          setQuizHintMode((prev) => ({ ...prev, [pronoun]: null }));
        }, 1500);
      } else if (nextAttempts === 2) {
        setQuizHintMode((prev) => ({ ...prev, [pronoun]: 'letters' }));
      } else {
        setQuizHintMode((prev) => ({ ...prev, [pronoun]: 'rule' }));
      }
    },
    [quizAttempts, selectedLanguage]
  );

  /**
   * "?" butonu — kullanıcı yanlış yapmadan ipucu ister.
   * Etkiler: -2 puan, kural ipucu açılır, attempt 1 sayılır (sonraki yanlış 'letters' verir),
   * SRS'e "ipuçlu çözüldü" olarak eklenir.
   */
  const requestHint = useCallback((pronoun: string) => {
    if (!verbKey) return;
    if (quizSessionLivesDepleted) return;
    if (quizHintMode[pronoun] === 'reveal') return;
    quizPersonUsedHintRef.current.add(pronoun);
    if ((quizAttempts[pronoun] ?? 0) === 0) {
      setQuizAttempts((prev) => ({ ...prev, [pronoun]: 1 }));
    }
    setQuizHintMode((prev) => ({ ...prev, [pronoun]: prev[pronoun] ?? 'rule' }));
    setTotalScore((s) => s - 2);
    markHintUsed(verbKey, selectedTense, pronoun);
    setMistakeBank(getMistakes());
  }, [verbKey, selectedTense, quizAttempts, quizHintMode, quizSessionLivesDepleted]);

  const handleQuizInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (quizSessionLivesDepleted) return;
      if (!conjugationsForDisplay) return;
      const pronoun = qp[currentIndex];
      const userRaw = userAnswers[pronoun];
      const user = userRaw.trim();
      if (!user) return;
      const correct = conjugationsForDisplay[pronoun];
      const result = checkAnswer(userRaw, correct);
      setQuizFeedback((prev) => ({ ...prev, [pronoun]: result }));
      if (result === 'typo') {
        if (selectedLanguage === 'fr' && selectedTense === 'passe-compose' && verbKey) {
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
        }
        return;
      }
      if (result === 'wrong') {
        quizSessionHadWrongRef.current = true;
        setCombo(0);
        if (verbKey) {
          onQuizMistakeWrong(pronoun, user, correct);
          addToMistakeBank(verbKey, selectedTense, pronoun);
          if (selectedLanguage === 'es' || selectedLanguage === 'fr')
            recordQuizSpacedRepetitionWrong(verbKey, selectedTense, pronoun, selectedLanguage);
        }
        const depleted = !mistakeReplaySession && applyQuizLifeLoss();
        if (mistakeReplaySession && (selectedLanguage === 'es' || selectedLanguage === 'fr')) {
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
          return;
        }
        if (selectedLanguage === 'fr' && selectedTense === 'passe-compose' && verbKey) {
          const hint = checkPasséComposéLogic(userRaw, correct, pronoun as import('../data/verbs').Pronoun, verbKey);
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: hint }));
        } else {
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
        }
        if (depleted) return;
        if (verbKey) {
          applySmartHintAfterWrong(pronoun, correct, verbKey, selectedTense, {
            onRevealAdvance: () => {
              const nextEmpty = qp.findIndex(
                (_, i) => i > currentIndex && userAnswers[qp[i]].trim() === ''
              );
              if (nextEmpty !== -1) {
                requestAnimationFrame(() => quizInputRefs.current[nextEmpty]?.focus());
              }
            },
          });
        }
        return;
      }
      setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
      onQuizMistakeCorrect(pronoun);
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      awardQuizCorrectXp(pronoun, { clientX: rect.left + rect.width / 2, clientY: rect.top });
      clearSmartHint(pronoun);
      if (!showHints) {
        const nextCombo = combo + 1;
        recordWeeklyCombo(nextCombo);
        tryUnlockComboKingBadge(nextCombo);
        setCombo((c) => {
          const nc = c + 1;
          if (nc >= 2) {
            if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
            setComboDisplay({ show: true, value: nc });
            comboDisplayTimeoutRef.current = setTimeout(() => {
              setComboDisplay((d) => ({ ...d, show: false }));
              comboDisplayTimeoutRef.current = null;
            }, 1800);
          }
          return nc;
        });
        setTotalScore((s) => s + 10);
        addActivityToday(1);
        updateDocumentTitle();
      }
      speakAuto(correct, { lang: selectedLanguage === 'es' ? 'es-ES' : 'fr-FR' });
      const nextEmptyIndex = qp.findIndex(
        (_, i) => i > currentIndex && userAnswers[qp[i]].trim() === ''
      );
      if (nextEmptyIndex !== -1) {
        requestAnimationFrame(() => quizInputRefs.current[nextEmptyIndex]?.focus());
        return;
      }
      const allFilled = qp.every((p) => userAnswers[p].trim() !== '');
      const allCorrect =
        allFilled &&
        qp.every((p) => checkAnswer(userAnswers[p], conjugationsForDisplay[p]) === 'correct');
      if (!allCorrect && currentIndex < qp.length - 1)
        requestAnimationFrame(() => quizInputRefs.current[currentIndex + 1]?.focus());
    },
    [
      conjugationsForDisplay,
      userAnswers,
      showHints,
      selectedTense,
      verbKey,
      addToMistakeBank,
      selectedLanguage,
      applySmartHintAfterWrong,
      clearSmartHint,
      qp,
      onQuizMistakeWrong,
      onQuizMistakeCorrect,
      mistakeReplaySession,
      awardQuizCorrectXp,
      combo,
      quizSessionLivesDepleted,
      applyQuizLifeLoss,
    ]
  );

  const queueFocusTimer = useCallback((fn: () => void, ms: number) => {
    const tid = window.setTimeout(() => {
      focusFlowTimersRef.current = focusFlowTimersRef.current.filter((x) => x !== tid);
      fn();
    }, ms);
    focusFlowTimersRef.current.push(tid);
  }, []);

  const advanceFocusIndex = useCallback(() => {
    setFocusCorrectGlow(false);
    setCurrentFocusIndex((i) => i + 1);
    focusFlowBusyRef.current = false;
  }, []);

  const skipToNextFocusQuestion = useCallback(() => {
    if (quizSessionLivesDepleted) return;
    if (currentFocusIndex >= qp.length) return;
    setFocusCanSkipAfterWrong(false);
    focusFlowBusyRef.current = false;
    setFocusCorrectGlow(false);
    setCurrentFocusIndex((i) => i + 1);
  }, [currentFocusIndex, qp.length, quizSessionLivesDepleted]);

  /** Odak modu: tek şahıs kontrolü. Doğruysa sonraki şahısa geç, yanlışsa aynı yerde kal. */
  const handleFocusModeSubmit = useCallback(
    (override?: string, opts?: { simpleWrong?: boolean }) => {
      if (quizSessionLivesDepleted) return;
      if (focusUsesChoice || focusUsesReverse) return;
      if (!conjugationsForDisplay || currentFocusIndex >= qp.length) return;
      if (focusFlowBusyRef.current) return;
      const pronoun = qp[currentFocusIndex];
      const userRaw = override ?? userAnswers[pronoun];
      const user = userRaw.trim();
      if (!user) {
        setQuizEmptyShake(pronoun);
        setTimeout(() => setQuizEmptyShake(null), 500);
        return;
      }
      const correct = conjugationsForDisplay[pronoun];
      const result = checkAnswer(userRaw, correct);
      setQuizFeedback((prev) => ({ ...prev, [pronoun]: result }));
      if (result === 'typo') {
        if (selectedLanguage === 'fr' && selectedTense === 'passe-compose' && verbKey) {
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
        }
        return;
      }
      if (result === 'wrong') {
        quizSessionHadWrongRef.current = true;
        setCombo(0);
        if (verbKey) {
          onQuizMistakeWrong(pronoun, user, correct);
          addToMistakeBank(verbKey, selectedTense, pronoun);
          if (selectedLanguage === 'es' || selectedLanguage === 'fr')
            recordQuizSpacedRepetitionWrong(verbKey, selectedTense, pronoun, selectedLanguage);
        }
        const depleted = !mistakeReplaySession && applyQuizLifeLoss();
        if (mistakeReplaySession && (selectedLanguage === 'es' || selectedLanguage === 'fr')) {
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
          return;
        }
        if (selectedLanguage === 'fr' && selectedTense === 'passe-compose' && verbKey) {
          const hint = checkPasséComposéLogic(user, correct, pronoun as import('../data/verbs').Pronoun, verbKey);
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: hint }));
        } else {
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
        }
        if (depleted) return;
        focusFlowTimersRef.current.push(window.setTimeout(() => setFocusCanSkipAfterWrong(true), 1500));
        if (verbKey && !opts?.simpleWrong) {
          applySmartHintAfterWrong(pronoun, correct, verbKey, selectedTense, {
            onRevealAdvance: () => {
              setCurrentFocusIndex((i) => i + 1);
            },
          });
        } else {
          focusFlowTimersRef.current.push(window.setTimeout(() => setFocusCanSkipAfterWrong(true), 1500));
        }
        return;
      }
      setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
      onQuizMistakeCorrect(pronoun);
      if (mistakeReplaySession && (selectedLanguage === 'es' || selectedLanguage === 'fr') && verbKey) {
        const cur = mistakeReplaySession.queue[mistakeReplaySession.index];
        if (cur && verbKey === cur.verb && selectedTense === cur.tense && pronoun === cur.person) {
          awardQuizCorrectXp(pronoun);
          clearSmartHint(pronoun);
          if (!showHints) {
            const nextCombo = combo + 1;
            recordWeeklyCombo(nextCombo);
            tryUnlockComboKingBadge(nextCombo);
            setCombo((c) => {
              const nc = c + 1;
              if (nc >= 2) {
                if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
                setComboDisplay({ show: true, value: nc });
                comboDisplayTimeoutRef.current = setTimeout(() => {
                  setComboDisplay((d) => ({ ...d, show: false }));
                  comboDisplayTimeoutRef.current = null;
                }, 1800);
              }
              return nc;
            });
            setTotalScore((s) => s + 10);
            addActivityToday(1);
            updateDocumentTitle();
          }
          speakAuto(correct, { lang: selectedLanguage === 'es' ? 'es-ES' : 'fr-FR' });
          setMistakeReplayShowTick(true);
          if (mistakeReplayAdvanceTimerRef.current) clearTimeout(mistakeReplayAdvanceTimerRef.current);
          mistakeReplayAdvanceTimerRef.current = setTimeout(() => {
            mistakeReplayAdvanceTimerRef.current = null;
            setMistakeReplayShowTick(false);
            setMistakeReplaySession((prev) => {
              if (!prev) return null;
              const nextIdx = prev.index + 1;
              const newResolved = prev.resolvedInSession + 1;
              const replayLang: AppLanguage = (prev.queue[0]?.lang as AppLanguage) ?? 'es';
              if (nextIdx >= prev.queue.length) {
                const remaining = getMistakesForReviewSorted(replayLang).filter((e) => !e.resolved).length;
                setMistakeReplayComplete({ resolvedInSession: newResolved, remaining });
                return null;
              }
              const nextEnt = prev.queue[nextIdx];
              const entLang: AppLanguage = (nextEnt.lang as AppLanguage) ?? replayLang;
              loadVerb(nextEnt.verb, entLang, nextEnt.tense);
              return { ...prev, index: nextIdx, resolvedInSession: newResolved };
            });
          }, 900);
          return;
        }
      }
      const el = quizInputRefs.current[0];
      const rect = el?.getBoundingClientRect();
      setFocusCorrectGlow(true);
      awardQuizCorrectXp(pronoun, {
        splitXpFloat: true,
        clientX: rect ? rect.left + rect.width / 2 : undefined,
        clientY: rect ? rect.top : undefined,
      });
      clearSmartHint(pronoun);
      if (!showHints) {
        const nextCombo = combo + 1;
        recordWeeklyCombo(nextCombo);
        tryUnlockComboKingBadge(nextCombo);
        setCombo((c) => {
          const nc = c + 1;
          if (nc >= 2) {
            if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
            setComboDisplay({ show: true, value: nc });
            comboDisplayTimeoutRef.current = setTimeout(() => {
              setComboDisplay((d) => ({ ...d, show: false }));
              comboDisplayTimeoutRef.current = null;
            }, 1800);
          }
          return nc;
        });
        setTotalScore((s) => s + 10);
        addActivityToday(1);
        updateDocumentTitle();
      }
      speakAuto(correct, { lang: selectedLanguage === 'es' ? 'es-ES' : 'fr-FR' });
      focusFlowBusyRef.current = true;
      queueFocusTimer(() => {
        advanceFocusIndex();
      }, 600);
    },
    [
      focusUsesChoice,
      focusUsesReverse,
      conjugationsForDisplay,
      userAnswers,
      currentFocusIndex,
      showHints,
      selectedTense,
      verbKey,
      addToMistakeBank,
      selectedLanguage,
      applySmartHintAfterWrong,
      clearSmartHint,
      qp,
      onQuizMistakeWrong,
      onQuizMistakeCorrect,
      mistakeReplaySession,
      loadVerb,
      awardQuizCorrectXp,
      combo,
      queueFocusTimer,
      advanceFocusIndex,
      applyQuizLifeLoss,
      quizSessionLivesDepleted,
    ]
  );

  const handleReverseModeSubmit = useCallback(() => {
    if (quizSessionLivesDepleted) return;
    if (!focusUsesReverse || !conjugationsForDisplay || currentFocusIndex >= qp.length) return;
    if (focusFlowBusyRef.current) return;
    const pronoun = qp[currentFocusIndex];
    if (!reverseSelPronoun || !reverseSelTense) {
      setQuizEmptyShake(pronoun);
      setTimeout(() => setQuizEmptyShake(null), 500);
      return;
    }
    const correct = conjugationsForDisplay[pronoun] ?? '';
    const ok = reverseSelPronoun === pronoun && reverseSelTense === selectedTense;
    if (!ok) {
      quizSessionHadWrongRef.current = true;
      setCombo(0);
      setQuizFeedback((prev) => ({ ...prev, [pronoun]: 'wrong' }));
      if (verbKey) {
        onQuizMistakeWrong(pronoun, `${reverseSelPronoun}/${reverseSelTense}`, correct);
        addToMistakeBank(verbKey, selectedTense, pronoun);
        if (selectedLanguage === 'es' || selectedLanguage === 'fr')
          recordQuizSpacedRepetitionWrong(verbKey, selectedTense, pronoun, selectedLanguage);
      }
      if (applyQuizLifeLoss()) return;
      focusFlowTimersRef.current.push(window.setTimeout(() => setFocusCanSkipAfterWrong(true), 1500));
      return;
    }
    setQuizFeedback((prev) => ({ ...prev, [pronoun]: 'correct' }));
    onQuizMistakeCorrect(pronoun);
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.4;
    awardQuizCorrectXp(pronoun, { clientX: cx, clientY: cy, splitXpFloat: true, bonusXp: 5 });
    clearSmartHint(pronoun);
    if (!showHints) {
      const nextCombo = combo + 1;
      recordWeeklyCombo(nextCombo);
      tryUnlockComboKingBadge(nextCombo);
      setCombo((c) => {
        const nc = c + 1;
        if (nc >= 2) {
          if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
          setComboDisplay({ show: true, value: nc });
          comboDisplayTimeoutRef.current = setTimeout(() => {
            setComboDisplay((d) => ({ ...d, show: false }));
            comboDisplayTimeoutRef.current = null;
          }, 1800);
        }
        return nc;
      });
      setTotalScore((s) => s + 15);
      addActivityToday(1);
      updateDocumentTitle();
    }
    speakAuto(correct, { lang: 'es-ES' });
    focusFlowBusyRef.current = true;
    queueFocusTimer(() => {
      advanceFocusIndex();
    }, 600);
  }, [
    focusUsesReverse,
    conjugationsForDisplay,
    currentFocusIndex,
    qp,
    reverseSelPronoun,
    reverseSelTense,
    selectedTense,
    verbKey,
    onQuizMistakeWrong,
    addToMistakeBank,
    selectedLanguage,
    awardQuizCorrectXp,
    clearSmartHint,
    showHints,
    combo,
    queueFocusTimer,
    advanceFocusIndex,
    onQuizMistakeCorrect,
    applyQuizLifeLoss,
    quizSessionLivesDepleted,
  ]);

  const handleFocusMcPick = useCallback(
    (choiceIndex: number) => {
      if (quizSessionLivesDepleted) return;
      if (!conjugationsForDisplay || currentFocusIndex >= qp.length || !focusUsesChoice) return;
      if (focusMcLocked || focusFlowBusyRef.current) return;
      const pronoun = qp[currentFocusIndex];
      const correct = conjugationsForDisplay[pronoun] ?? '';
      const picked = focusMcOptions[choiceIndex];
      if (picked === undefined) return;
      let result = checkAnswer(picked, correct);
      /* Çoktan seç: şık metni ile doğru çekim normMcForm’da aynıysa doğru say (UI ile aynı mantık) */
      if (result === 'wrong' && normMcForm(picked) === normMcForm(correct)) {
        result = 'correct';
      }

      setFocusMcPickedIndex(choiceIndex);
      setFocusMcLocked(true);

      if (result === 'correct' || result === 'typo') {
        setAnswer(pronoun, correct.trim());
        setQuizFeedback((prev) => ({ ...prev, [pronoun]: 'correct' }));
        onQuizMistakeCorrect(pronoun);
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight * 0.4;
        awardQuizCorrectXp(pronoun, { clientX: cx, clientY: cy, splitXpFloat: true });
        clearSmartHint(pronoun);
        if (!showHints) {
          const nextCombo = combo + 1;
          recordWeeklyCombo(nextCombo);
          tryUnlockComboKingBadge(nextCombo);
          setCombo((c) => {
            const nc = c + 1;
            if (nc >= 2) {
              if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
              setComboDisplay({ show: true, value: nc });
              comboDisplayTimeoutRef.current = setTimeout(() => {
                setComboDisplay((d) => ({ ...d, show: false }));
                comboDisplayTimeoutRef.current = null;
              }, 1800);
            }
            return nc;
          });
          setTotalScore((s) => s + 10);
          addActivityToday(1);
          updateDocumentTitle();
        }
        speakAuto(correct, { lang: selectedLanguage === 'es' ? 'es-ES' : 'fr-FR' });
      } else {
        setAnswer(pronoun, picked.trim());
        setQuizFeedback((prev) => ({ ...prev, [pronoun]: 'wrong' }));
        quizSessionHadWrongRef.current = true;
        setCombo(0);
        if (verbKey) {
          onQuizMistakeWrong(pronoun, picked.trim(), correct);
          addToMistakeBank(verbKey, selectedTense, pronoun);
          if (selectedLanguage === 'es' || selectedLanguage === 'fr')
            recordQuizSpacedRepetitionWrong(verbKey, selectedTense, pronoun, selectedLanguage);
        }
        if (applyQuizLifeLoss()) return;
      }

      focusFlowBusyRef.current = true;
      queueFocusTimer(() => {
        setFocusMcPickedIndex(null);
        setFocusMcLocked(false);
        setFocusCanSkipAfterWrong(false);
        advanceFocusIndex();
      }, 800);
    },
    [
      conjugationsForDisplay,
      currentFocusIndex,
      focusUsesChoice,
      focusMcLocked,
      focusMcOptions,
      qp,
      onQuizMistakeCorrect,
      awardQuizCorrectXp,
      clearSmartHint,
      showHints,
      combo,
      selectedLanguage,
      onQuizMistakeWrong,
      verbKey,
      selectedTense,
      applyQuizLifeLoss,
      quizSessionLivesDepleted,
      addToMistakeBank,
      queueFocusTimer,
      advanceFocusIndex,
      setAnswer,
    ]
  );

  // Klavye kısayolları: Alt+L Learning, Alt+Q Quiz, alıştırma odak Tab/Shift+Enter/1–4, Escape …
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showActivityModal) {
        e.preventDefault();
        setShowActivityModal(false);
        return;
      }
      if (e.key === 'Escape' && tenseDetailModalOpen) {
        e.preventDefault();
        setTenseDetailModalOpen(false);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setMode('learning');
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setMode('quiz');
        return;
      }
      if (mode === 'quiz' && quizLayout === 'focus') {
        const inPanel = (e.target as HTMLElement | null)?.closest?.('[data-quiz-practice-panel]');
        if (e.key === 'Tab' && !e.shiftKey && inPanel) {
          e.preventDefault();
          if (currentFocusIndex < qp.length) {
            const p = qp[currentFocusIndex];
            if (p) requestHint(p);
          }
          return;
        }
        if (e.key === 'Enter' && e.shiftKey && focusCanSkipAfterWrong && currentFocusIndex < qp.length) {
          e.preventDefault();
          skipToNextFocusQuestion();
          return;
        }
        if (focusUsesChoice && /^[1-4]$/.test(e.key) && !e.altKey && !e.ctrlKey && !e.metaKey) {
          if (quizSessionLivesDepleted) return;
          if (e.repeat || focusMcLocked || focusFlowBusyRef.current) return;
          const t = e.target as Node | null;
          if (
            t instanceof HTMLElement &&
            (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
          ) {
            return;
          }
          const idx = parseInt(e.key, 10) - 1;
          if (idx < 0 || idx >= focusMcOptions.length) return;
          e.preventDefault();
          if (focusMcKeyFlashTimeoutRef.current) {
            clearTimeout(focusMcKeyFlashTimeoutRef.current);
            focusMcKeyFlashTimeoutRef.current = null;
          }
          setFocusMcKeyFlashIndex(idx);
          focusMcKeyFlashTimeoutRef.current = window.setTimeout(() => {
            setFocusMcKeyFlashIndex(null);
            focusMcKeyFlashTimeoutRef.current = null;
          }, 100);
          handleFocusMcPick(idx);
          return;
        }
      }
      if (e.key === 'Escape' && survivalOpen) {
        e.preventDefault();
        setSurvivalOpen(false);
        return;
      }
      if (e.key === 'Escape' && verbKey && mode === 'quiz') {
        e.preventDefault();
        resetQuiz();
      }
      if (e.key === 'Escape' && mode === 'review') {
        e.preventDefault();
        setReviewEntry(null);
        setMode('quiz');
      }
      if (e.key === 'Escape' && mode === 'starred') {
        e.preventDefault();
        setMode('quiz');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (focusMcKeyFlashTimeoutRef.current) {
        clearTimeout(focusMcKeyFlashTimeoutRef.current);
        focusMcKeyFlashTimeoutRef.current = null;
      }
    };
  }, [
    mode,
    verbKey,
    resetQuiz,
    showActivityModal,
    tenseDetailModalOpen,
    quizLayout,
    currentFocusIndex,
    qp,
    focusCanSkipAfterWrong,
    skipToNextFocusQuestion,
    focusUsesChoice,
    focusMcLocked,
    focusMcOptions,
    handleFocusMcPick,
    requestHint,
    survivalOpen,
    quizSessionLivesDepleted,
  ]);

  const SITE_URL = 'https://diloloji.com';
  const isEzber = location.pathname === '/ezber-makinesi';
  const seoTitle = isEzber ? 'Ezber Makinesi | Diloloji' : 'Diloloji Fiil Laboratuvarı: Fransızca ve İspanyolca Fiil Çekimleri';
  const seoDescription = isEzber
    ? 'Fransızca ve İspanyolca fiil çekimlerini ezberleyin. Alıştırma, zamana karşı ve kıyaslama modları ile pratik yapın.'
    : 'Fransızca fiil çekimleri ve İspanyolca fiil çekimleri. Tüm zamanlar, mastar, ulaç ve örnek cümlelerle interaktif fiil laboratuvarı.';
  const seoUrl = `${SITE_URL}${location.pathname}`;

  return (
    <div className="relative min-h-[100dvh] min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300 print:bg-white">
      <TenseCardOverlay open={tenseCardOverlay} onClose={() => setTenseCardOverlay(null)} />
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={seoUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={seoUrl} />
        <meta property="og:type" content="website" />
      </Helmet>
      <Navbar
        printHide
        isLoggedIn={isLoggedIn}
        onLoginClick={() => setShowAuthModal(true)}
        onLogoutClick={() => setIsLoggedIn(false)}
        rightExtra={isLoggedIn ? (
          <>
            <button type="button" onClick={() => setShowActivityModal(true)} className="flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 tabular-nums hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded px-1.5 py-1" title="Aktivite haritası" aria-label="Puan ve aktivite haritası">
              <span aria-live="polite">{totalScore}</span>
              <span className="opacity-60" aria-hidden>•</span>
              <span aria-live="polite">{combo}</span>
            </button>
            <button type="button" onClick={openReviewMode} className="flex items-center gap-1 rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0" title="Zorlandıklarım" aria-label="Zorlandıklarım">
              <span className="text-base leading-none w-5 h-5 inline-flex items-center justify-center" aria-hidden>🧠</span>
              <span className="tabular-nums text-xs font-medium ml-0.5" aria-live="polite">{dueCount}</span>
            </button>
            <button type="button" onClick={() => setMode('starred')} className="flex items-center gap-1 rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0" title="Yıldızlı Fiillerim" aria-label="Yıldızlı Fiillerim">
              <span className="text-base leading-none w-5 h-5 inline-flex items-center justify-center" aria-hidden>⭐</span>
              <span className="tabular-nums text-xs font-medium ml-0.5">{starredVerbs.length}</span>
            </button>
            <div className="flex items-center gap-2 shrink-0 ml-1 h-8">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500/80 text-white text-xs font-bold shadow-md" aria-hidden>K</div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums hidden sm:inline">Lvl {level}</span>
            </div>
          </>
        ) : undefined}
      />

      {/* Kombo animasyonu */}
      {comboDisplay.show && (
        <div
          className="fixed top-16 right-4 z-50 animate-combo-in rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 dark:from-amber-500 dark:to-orange-500 px-4 py-2.5 shadow-lg shadow-slate-200/50 dark:shadow-black/30 ring-1 ring-amber-500/30 dark:ring-amber-400/50"
          role="status"
          aria-live="polite"
        >
          <span className="font-bold text-amber-900 dark:text-amber-950 text-sm">
            Kombo x{comboDisplay.value}! 🔥
          </span>
        </div>
      )}

      {/* Aktivite haritası modalı (heatmap) */}
      {showActivityModal && (() => {
        const history = getActivityHistory();
        const days = getLastNDays(60);
        const totalLast60 = days.reduce((sum, d) => sum + (history[d] ?? 0), 0);
        const formatDate = (key: string) => {
          const [y, m, d] = key.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        };
        const getHeatColor = (count: number) => {
          if (count === 0) return 'bg-slate-100 dark:bg-slate-700/60';
          if (count <= 2) return 'bg-green-200 dark:bg-green-500/40';
          if (count <= 5) return 'bg-green-400 dark:bg-green-500/70';
          return 'bg-green-600 dark:bg-green-500';
        };
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-colors duration-300"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-modal-title"
            onClick={() => setShowActivityModal(false)}
          >
            <div
              className="rounded-2xl bg-white dark:bg-slate-800/95 shadow-xl border border-slate-200 dark:border-slate-700/50 w-full max-w-lg overflow-hidden backdrop-blur-md transition-colors duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 px-5 py-4">
                <h2 id="activity-modal-title" className="font-bold text-slate-800 dark:text-slate-100 text-lg">Aktivite Haritası</h2>
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
                  aria-label="Kapat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Son 60 gün</p>
                <div className="grid grid-cols-10 gap-1">
                  {days.map((key) => {
                    const count = history[key] ?? 0;
                    return (
                      <div
                        key={key}
                        className={`aspect-square rounded-[3px] ${getHeatColor(count)} transition-colors duration-300`}
                        title={`${formatDate(key)} · ${count} doğru cevap`}
                        role="img"
                        aria-label={`${formatDate(key)}: ${count} soru`}
                      />
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Az</span>
                  <div className="flex gap-1">
                    <span className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-700" aria-hidden />
                    <span className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-500/40" aria-hidden />
                    <span className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-500/70" aria-hidden />
                    <span className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" aria-hidden />
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Çok</span>
                </div>
                <p className="mt-4 text-center text-slate-700 dark:text-slate-300 font-semibold">
                  Toplam çözülen (son 60 gün): <span className="text-indigo-600 dark:text-indigo-400 tabular-nums">{totalLast60}</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {appMode === 'conjugation' && (
      <main className={`max-w-7xl w-full mx-auto px-4 md:px-8 pb-24 md:pb-20 transition-all duration-300 ${viewMode === 'simple' ? 'pt-2' : 'py-4'}`}>
        <div className="flex justify-end w-full mb-2 md:mb-1 shrink-0">
          <div className="lang-switcher" role="tablist" aria-label="Öğrenilen dil">
            <button
              type="button"
              role="tab"
              data-lang="es"
              aria-selected={selectedLanguage === 'es'}
              onClick={() => switchAppLanguage('es')}
              title="İspanyolca"
              className={`lang-btn${selectedLanguage === 'es' ? ' active' : ''}`}
            >
              <span aria-hidden>🇪🇸</span>
              <span>ES</span>
            </button>
            <button
              type="button"
              role="tab"
              data-lang="fr"
              aria-selected={selectedLanguage === 'fr'}
              onClick={() => switchAppLanguage('fr')}
              title="Fransızca"
              className={`lang-btn${selectedLanguage === 'fr' ? ' active' : ''}`}
            >
              <span aria-hidden>🇫🇷</span>
              <span>FR</span>
            </button>
          </div>
        </div>
        <div className={`flex flex-col md:grid md:grid-cols-12 md:items-start transition-all duration-300 ${viewMode === 'simple' ? 'gap-4 md:gap-6' : 'gap-6 md:gap-8'}`}>
          {/* Sol sütun: Kontrol paneli — mobilde Fiil Seç ile aç/kapa, masaüstünde her zaman görünür */}
          <aside
            data-print-hide
            className="flex flex-col gap-4 md:col-span-4 order-1 print:hidden md:sticky md:top-6 md:self-start transition-opacity duration-300"
          >
            <button
              type="button"
              className="md:hidden list-none cursor-pointer rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between w-full"
              onClick={() => setLeftPanelOpen((o) => !o)}
              aria-expanded={leftPanelOpen}
            >
              ⚙ Fiil Seç
              <span className={`inline-block transition-transform duration-200 ${leftPanelOpen ? 'rotate-180' : ''}`} aria-hidden>
                ▼
              </span>
            </button>
            <div
              className={
                leftPanelOpen ? 'flex flex-col gap-4' : 'hidden md:flex md:flex-col md:gap-4'
              }
            >
            {/* Fiil arama + Zaman seçici */}
            <section className="relative z-10 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800/80 shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700/50 backdrop-blur-md transition-colors duration-300 shrink-0 overflow-visible" ref={autocompleteWrapRef}>
              <div className="flex flex-col gap-4">
            {/* Fiil girişi — relative + anchor ref (Portal pozisyonu için) */}
            <div className="flex-1 min-w-0 flex flex-col relative">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{t('fiil_girin')}</label>
              <div className="relative h-12" ref={autocompleteAnchorRef}>
                <input
                  ref={verbInputRef}
                  type="text"
                  value={verbInput}
                  onChange={(e) => {
                    setVerbInput(sanitizeForDisplay(e.target.value));
                    setError('');
                    setAutocompleteSelectedIndex(0);
                    setAutocompleteClosed(false);
                  }}
                  onFocus={() => setAutocompleteClosed(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (autocompleteSuggestions.length > 0 && !autocompleteClosed) {
                        const verb = autocompleteSuggestions[autocompleteSelectedIndex];
                        if (verb) {
                          setVerbInput(verb);
                          setAutocompleteClosed(true);
                          loadVerb(verb);
                        }
                      } else {
                        loadVerb();
                      }
                      return;
                    }
                    if (e.key === 'Escape') {
                      setAutocompleteClosed(true);
                      verbInputRef.current?.blur();
                      return;
                    }
                    if (autocompleteSuggestions.length === 0 || autocompleteClosed) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setAutocompleteSelectedIndex((i) => Math.min(i + 1, autocompleteSuggestions.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setAutocompleteSelectedIndex((i) => Math.max(i - 1, 0));
                    }
                  }}
                  placeholder={selectedLanguage === 'es' ? 'Örn: comer, gitmek, yazmak...' : 'Örn: être, aller...'}
                  className="absolute inset-0 w-full h-full rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 pl-4 pr-12 py-3 text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-colors duration-300"
                  aria-label={t('fiil_girin')}
                  aria-autocomplete="list"
                  aria-expanded={autocompleteSuggestions.length > 0 && !autocompleteClosed}
                  aria-controls="autocomplete-list"
                  id="verb-input"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={pickRandomVerb}
                  className="group absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-500/15 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors duration-300"
                  title="Rastgele fiil seç"
                  aria-label="Rastgele fiil seç"
                >
                  <Shuffle
                    className="w-[18px] h-[18px] text-slate-400 dark:text-slate-500 transition-all duration-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:rotate-180"
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              </div>
              {/* Sanal aksan klavyesi — diline göre özel karakterler */}
              <div className="flex flex-wrap items-center gap-0.5 mt-1.5">
                {(selectedLanguage === 'fr'
                  ? ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'œ']
                  : ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ']
                ).map((char) => (
                  <button
                    key={char}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setVerbInput((prev) => prev + char)}
                    className="text-sm bg-slate-800/50 dark:bg-slate-700/50 hover:bg-slate-700 dark:hover:bg-slate-600 text-slate-300 dark:text-slate-300 rounded px-2 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    aria-label={`${char} ekle`}
                  >
                    {char}
                  </button>
                ))}
              </div>
              {/* Autocomplete listesi: Portal ile body'de, böylece katman sorunu kalmaz */}
              {autocompleteSuggestions.length > 0 && !autocompleteClosed && autocompletePosition && typeof document !== 'undefined' && createPortal(
                <ul
                  id="autocomplete-list"
                  role="listbox"
                  className="z-[9999] isolate rounded-xl border border-slate-200 dark:border-slate-700 border-indigo-500/30 bg-white dark:bg-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-hidden max-h-[min(16rem,60vh)] overflow-y-auto"
                  style={{
                    position: 'fixed',
                    top: autocompletePosition.top,
                    left: autocompletePosition.left,
                    width: autocompletePosition.width,
                  }}
                >
                  {autocompleteSuggestions.map((verb, i) => (
                    <li
                      key={verb}
                      role="option"
                      aria-selected={i === autocompleteSelectedIndex}
                      className={`cursor-pointer px-4 py-3 transition-colors duration-300 ${
                        i === autocompleteSelectedIndex ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                      }`}
                      onMouseEnter={() => setAutocompleteSelectedIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setVerbInput(verb);
                        setAutocompleteClosed(true);
                        loadVerb(verb);
                      }}
                    >
                      <span className="capitalize text-slate-900 dark:text-slate-100">{verb.charAt(0).toUpperCase() + verb.slice(1)}</span>
                    </li>
                  ))}
                </ul>,
                document.body
              )}
            </div>

            {/* Zaman seçimi — custom dropdown */}
            <div className="w-full flex-shrink-0 flex flex-col relative overflow-visible" ref={tenseDropdownRef}>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{t('zaman_secin')}</label>
              <button
                type="button"
                onClick={() => setTenseDropdownOpen((o) => !o)}
                className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-left text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-colors duration-300 flex items-center justify-between gap-2"
                aria-label={t('zaman_secin')}
                aria-expanded={tenseDropdownOpen}
                aria-haspopup="listbox"
                id="tense-trigger"
              >
                <span className="truncate">{tenseLabel}</span>
                <svg className="w-5 h-5 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200" style={{ transform: tenseDropdownOpen ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                role="listbox"
                aria-labelledby="tense-trigger"
                className={`absolute left-0 right-0 top-full mt-1 z-[100] rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-200 ease-out ${
                  tenseDropdownOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[0.98] pointer-events-none'
                }`}
              >
                <div className="max-h-[min(18rem,60vh)] overflow-y-auto py-2">
                  {tenseGroupsForLang.map((group) => (
                    <div key={group.mood} className="px-3 pb-1 pt-2 first:pt-0">
                      <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 px-3 py-1 select-none">
                        {group.label}
                      </p>
                      <div className="space-y-0.5 mt-0.5">
                        {group.tenseIds.map((id) => {
                          const t = tensesForLang.find((x) => x.id === id);
                          if (!t) return null;
                          const isSelected = selectedTense === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                setSelectedTense(t.id);
                                setTenseDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-800 dark:text-slate-100 hover:bg-indigo-500/20 transition-colors duration-200"
                            >
                              <span>{t.label}</span>
                              {isSelected && (
                                <svg className="w-5 h-5 shrink-0 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Favorilerim ── */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFavorites((v) => !v);
                  setSelectedCEFRLevel(null);
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-lg border py-2 px-3 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  showFavorites
                    ? 'border-transparent bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-500/25'
                    : 'border-slate-200/50 dark:border-slate-700/40 bg-white/5 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400/40 dark:hover:border-amber-500/40 hover:bg-amber-50/50 dark:hover:bg-amber-500/5'
                }`}
                aria-expanded={showFavorites}
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden>⭐</span>
                  Favorilerim
                </span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  showFavorites ? 'bg-white/25 text-white' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}>
                  {starredVerbs.length}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {showFavorites && (
                  <motion.div
                    key="favorites-list"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    {starredVerbs.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/40 px-3 py-3 text-xs text-slate-500 dark:text-slate-500 italic text-center">
                        Henüz favori fiilin yok. Fiil kartındaki ⭐ ikonuna tıkla.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {starredVerbs.map((verb) => (
                          <button
                            key={verb}
                            type="button"
                            onClick={() => {
                              setVerbInput(verb);
                              setError('');
                              setAutocompleteClosed(true);
                              loadVerb(verb);
                            }}
                            className="group flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-amber-500/50 active:scale-95"
                            title={`${verb} çekimini göster`}
                          >
                            <span className="text-[10px] opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden>
                              ⭐
                            </span>
                            {verb}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Seviyelere Göre Keşfet ── */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-500 select-none">Seviyelere Göre Keşfet</p>
              <div className="flex gap-1.5">
                {CEFR_LEVELS.map((lvl) => {
                  const isActive = selectedCEFRLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedCEFRLevel(isActive ? null : lvl)}
                      className={`flex-1 rounded-lg border py-1.5 text-xs font-bold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                        isActive
                          ? `${CEFR_COLORS[lvl].btn} shadow-md border-transparent`
                          : 'border-slate-200/50 dark:border-slate-700/40 bg-white/5 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>

              {selectedCEFRLevel && (
                <motion.div
                  key={`${selectedLanguage}-${selectedCEFRLevel}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex flex-wrap gap-1.5 overflow-hidden max-h-[9.5rem] overflow-y-auto pr-0.5"
                >
                  {(VERB_LEVELS[selectedLanguage as 'es' | 'fr']?.[selectedCEFRLevel] ?? []).map((verb) => (
                    <button
                      key={verb}
                      type="button"
                      onClick={() => {
                        setVerbInput(verb);
                        setError('');
                        setAutocompleteClosed(true);
                        loadVerb(verb);
                      }}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 active:scale-95 ${CEFR_COLORS[selectedCEFRLevel].chip}`}
                    >
                      {verb}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {(selectedLanguage === 'es' || selectedLanguage === 'fr') && (
              <div className="flex flex-col gap-1.5">
                {irregularVerbsForSelectedTense.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-200/60 dark:border-slate-700/50 px-2 py-2 text-[11px] text-slate-500 dark:text-slate-500 italic text-center">
                    Bu zamanda düzensiz fiil yok
                  </p>
                ) : (
                  <>
                    <div className="flex w-full items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIrregularLeftPanelOpen((o) => {
                            if (o) setShowAllIrregulars(false);
                            return !o;
                          });
                        }}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-violet-300 rounded-md py-1 px-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                        aria-expanded={irregularLeftPanelOpen}
                      >
                        <span className="text-slate-400 w-3 shrink-0" aria-hidden>
                          {irregularLeftPanelOpen ? '▾' : '▶'}
                        </span>
                        <span className="truncate">
                          {selectedLanguage === 'es'
                            ? formatSpanishIrregularSectionTitlePrefix(selectedTense as TenseIdEs)
                            : formatFrenchIrregularSectionTitlePrefix(selectedTense as TenseId)}{' '}
                          Düzensiz ({irregularVerbsForSelectedTense.length})
                        </span>
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300/70 dark:border-slate-600 text-[10px] text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                        title="Bu zamanda düzenli paradigmadan sapma gösteren fiiller"
                        aria-label="Bilgi"
                      >
                        ℹ
                      </button>
                    </div>

                    {irregularLeftPanelOpen && (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {visibleIrregularVerbs.map((verb) => (
                            <button
                              key={`irr-${selectedTense}-${verb}`}
                              type="button"
                              onClick={() => {
                                setVerbInput(verb);
                                setError('');
                                setAutocompleteClosed(true);
                                loadVerb(verb);
                              }}
                              className="rounded-md border border-violet-500/30 bg-violet-500/[0.06] dark:bg-violet-500/10 px-2 py-0.5 text-[12px] font-medium text-violet-800 dark:text-violet-300 hover:bg-violet-500/15 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-violet-500/40 active:scale-95"
                            >
                              {verb}
                            </button>
                          ))}
                        </div>
                        {!showAllIrregulars && irregularVerbsForSelectedTense.length > IRREGULAR_LEFT_PANEL_CAP && (
                          <button
                            type="button"
                            onClick={() => setShowAllIrregulars(true)}
                            className="self-start text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            + {irregularVerbsForSelectedTense.length - IRREGULAR_LEFT_PANEL_CAP} tane daha
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {verbHistory.length > 0 && (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={toggleHistoryPanel}
                  aria-expanded={historyPanelOpen}
                  className="flex w-full items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-700/50 pb-1.5 text-left rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                >
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-500 select-none tracking-wide">
                    GEÇMİŞ
                  </span>
                  <span className="shrink-0 text-[10px] leading-none text-slate-400 dark:text-slate-500 tabular-nums" aria-hidden>
                    {historyPanelOpen ? '▴' : '▾'}
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-[max-height] duration-200 ease ${
                    historyPanelOpen ? 'max-h-[240px]' : 'max-h-0'
                  }`}
                >
                  <div className="max-h-[240px] overflow-y-auto overflow-x-hidden flex flex-col gap-1 pt-1.5 pr-0.5">
                    {verbHistory.map((verb) => (
                      <button
                        key={`history-${verb}`}
                        type="button"
                        onClick={() => {
                          setVerbInput(verb);
                          setError('');
                          setAutocompleteClosed(true);
                          loadVerb(verb);
                        }}
                        className="group flex items-center justify-between gap-2 rounded-md border border-slate-200/50 dark:border-slate-700/40 bg-white/5 dark:bg-slate-800/30 px-2 py-1 text-left hover:bg-slate-100/60 dark:hover:bg-slate-700/40 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                      >
                        <span className="truncate text-[13px] text-slate-700 dark:text-slate-200">
                          <span className="font-medium">{verb}</span>
                          <span className="text-slate-500 dark:text-slate-400"> · {getHistoryMeaning(verb)}</span>
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setVerbHistory((prev) => {
                              const next = prev.filter((v) => v !== verb);
                              try {
                                localStorage.setItem(VERB_HISTORY_STORAGE_KEY, JSON.stringify(next));
                              } catch {
                                // ignore
                              }
                              return next;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            e.preventDefault();
                            e.stopPropagation();
                            setVerbHistory((prev) => {
                              const next = prev.filter((v) => v !== verb);
                              try {
                                localStorage.setItem(VERB_HISTORY_STORAGE_KEY, JSON.stringify(next));
                              } catch {
                                // ignore
                              }
                              return next;
                            });
                          }}
                          className="shrink-0 rounded px-1 text-xs text-slate-400 dark:text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-600 hover:text-slate-700 dark:hover:text-slate-200"
                          aria-label={`${verb} gecmisinden sil`}
                          title="Gecmisten sil"
                        >
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(selectedLanguage === 'es' || selectedLanguage === 'fr') && (
              <div className="flex flex-col gap-1.5 border-t border-slate-200/50 dark:border-slate-700/40 pt-3 mt-2">
                <p className="text-[11px] font-bold tracking-wide text-red-700 dark:text-red-300 select-none">
                  📅 {t('verbLab.mastery.todayReviews')}{' '}
                  <span className="tabular-nums text-red-600 dark:text-red-400">
                    ({masteryDueTodayAll.length})
                  </span>
                </p>
                {masteryDueTodayAll.length === 0 ? (
                  <p className="text-xs text-emerald-700/90 dark:text-emerald-300/90 italic">
                    {t('verbLab.mastery.todayAllDone')}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-0.5">
                      {masteryDueTodayAll.slice(0, 24).map((row) => {
                        const tLab = getTenses(row.lang).find((x) => x.id === row.tense)?.label ?? row.tense;
                        const pLab = getPronouns(row.lang).find((p) => p.id === row.person)?.label ?? row.person;
                        return (
                          <button
                            key={`mastery-due-${row.key}`}
                            type="button"
                            onClick={() => openMasteryDueRow(row)}
                            className="flex flex-col items-start gap-0.5 rounded-md border border-red-500/25 dark:border-red-500/35 bg-red-500/[0.06] dark:bg-red-500/10 px-2 py-1.5 text-left hover:bg-red-500/15 dark:hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-1 focus:ring-red-500/40"
                          >
                            <span className="text-[11px] font-semibold text-red-800 dark:text-red-200">
                              ⏰ {t('verbLab.mastery.reviewBadge')}
                            </span>
                            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 capitalize">
                              {row.verb}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {tLab} · {pLab}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={startMasteryDailyDrill}
                      className="w-full rounded-lg bg-red-600 dark:bg-red-500 text-white text-xs font-semibold py-2 hover:bg-red-700 dark:hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                    >
                      {t('verbLab.mastery.solveAll')}
                    </button>
                  </>
                )}
              </div>
            )}

            {(selectedLanguage === 'es' || selectedLanguage === 'fr') && spacedRepDueList.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-slate-200/50 dark:border-slate-700/40 pt-3 mt-2">
                <p className="text-[11px] font-bold tracking-wide text-violet-700 dark:text-violet-300 select-none">
                  🔁 Tekrar Zamanı{' '}
                  <span className="tabular-nums text-violet-600 dark:text-violet-400">({spacedRepDueList.length})</span>
                </p>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-0.5">
                  {spacedRepDueList.map((row) => {
                    const rowLang: AppLanguage = row.lang === 'fr' ? 'fr' : 'es';
                    const tLab = getTenses(rowLang).find((t) => t.id === row.tense)?.label ?? row.tense;
                    const pLab = getPronouns(rowLang).find((p) => p.id === row.person)?.label ?? row.person;
                    return (
                      <button
                        key={`sprep-${row.verb}-${row.tense}-${row.person}`}
                        type="button"
                        onClick={() => openSpacedRepetitionRow(row)}
                        className="flex flex-col items-start gap-0.5 rounded-md border border-violet-500/25 dark:border-violet-500/35 bg-violet-500/[0.06] dark:bg-violet-500/10 px-2 py-1.5 text-left hover:bg-violet-500/15 dark:hover:bg-violet-500/20 transition-colors focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                      >
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 capitalize">
                          {row.verb}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {tLab} · {pLab}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(selectedLanguage === 'es' || selectedLanguage === 'fr') && (
              <div className="flex flex-col gap-2 border-t border-slate-200/50 dark:border-slate-700/40 pt-3 mt-2">
                <p
                  className="text-[11px] font-bold tracking-wide text-slate-600 dark:text-slate-400 select-none cursor-help leading-snug"
                  title={zorlandiklarimStatsTitle}
                >
                  ZORLANDIKLARIM{' '}
                  <span className="tabular-nums text-rose-600 dark:text-rose-400">[{unresolvedMistakesForLang.length}]</span>
                </p>
                {unresolvedMistakesForLang.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-500 italic">
                    Henüz kayıt yok — alıştırmada yanlış yaptıkça buraya düşer.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5">
                      {unresolvedMistakesForLang.slice(0, 12).map((row) => (
                        <button
                          key={`${row.lang}-${row.verb}-${row.tense}-${row.person}`}
                          type="button"
                          onClick={() => openMistakeRow(row)}
                          className="flex items-center justify-between gap-2 rounded-lg border border-rose-500/25 dark:border-rose-500/35 bg-rose-500/5 dark:bg-rose-500/10 px-2 py-1.5 text-left hover:bg-rose-500/15 dark:hover:bg-rose-500/20 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500/40"
                        >
                          <span className="truncate text-xs text-slate-700 dark:text-slate-200">
                            <span className="font-medium">{row.verb}</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {' · '}
                              {(row.lang === 'fr' ? FRENCH_TENSE_SHORT : SPANISH_TENSE_SHORT)[row.tense] ?? row.tense} ·{' '}
                              {row.person}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                            ×{row.errorCount}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={startMistakeReplay}
                      className="w-full rounded-lg bg-rose-600 dark:bg-rose-500 text-white text-xs font-semibold py-2 hover:bg-rose-700 dark:hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-colors"
                    >
                      Tümünü Tekrar Çöz
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
            </section>
            {/* Zaman açıklaması kartı — compact, seçilen zamana göre güncellenir */}
            {viewMode === 'detailed' && getTenseExplanation(selectedLanguage, selectedTense) && (
              <div className="rounded-lg bg-blue-900/15 dark:bg-blue-900/25 border border-blue-500/25 dark:border-blue-400/30 px-3 py-2.5 flex flex-col gap-1.5 backdrop-blur-sm transition-all duration-200">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500 mt-0.5" strokeWidth={2} aria-hidden />
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
                    {getTenseExplanation(selectedLanguage, selectedTense)?.shortDesc}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTenseDetailModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-200 hover:bg-blue-600/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    aria-label="Zaman açıklaması detayı (modal)"
                  >
                    Detaylı İncele
                  </button>
                  <Link
                    to={`/ogrenme#zaman-${selectedTense}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-600/30 dark:bg-slate-500/30 border border-slate-500/40 dark:border-slate-400/40 text-slate-200 dark:text-slate-200 hover:bg-slate-600/50 dark:hover:bg-slate-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    aria-label="Zaman anlatım sayfası (yeni sekme)"
                  >
                    Yeni sekmede aç ➔
                  </Link>
                </div>
              </div>
            )}
            </div>
          </aside>

          {/* Sağ sütun: Sekmeler + ana çalışma alanı — 8 kolon (Detaylı'da 8, Basit'te 12) */}
          <motion.div
            key={selectedLanguage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`flex flex-col order-2 print:col-span-12 print:bg-white print:text-black min-w-0 transition-all duration-300 ${viewMode === 'simple' ? 'gap-2' : 'gap-4'} md:col-span-8`}
          >
        {error && (
          <div className="mb-4 rounded-2xl bg-red-50/80 dark:bg-red-500/10 border border-red-200/80 dark:border-red-400/30 px-5 py-3.5 text-red-700 dark:text-red-300 text-sm shadow-sm transition-colors duration-300">
            {error}
          </div>
        )}

        {/* Yıldızlı Fiiller ekranı */}
        {mode === 'starred' && (
          <section className="mb-4 rounded-2xl bg-white dark:bg-slate-800/80 shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700/50 overflow-hidden backdrop-blur-md transition-colors duration-300">
            <div className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 px-8 py-5 flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">⭐ Yıldızlı Fiillerim</h2>
              <button
                type="button"
                onClick={() => setMode('quiz')}
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 transition-colors duration-300"
              >
                Geri
              </button>
            </div>
            {starredVerbs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-600 font-medium">Henüz yıldızlı fiil yok.</p>
                <p className="text-slate-500 text-sm mt-1.5">Öğrenme veya Alıştırma modunda bir fiil gösterdikten sonra yanındaki yıldıza tıklayarak ekleyebilirsiniz.</p>
                <button
                  type="button"
                  onClick={() => setMode('quiz')}
                  className="mt-6 rounded-xl bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Alıştırma&apos;ya dön
                </button>
              </div>
            ) : (
              <div className="p-8">
                <p className="text-slate-500 text-sm mb-4">Bir fiil seçin veya rastgele getirin, ardından alıştırma yapın.</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {starredVerbs.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        const result = getConjugationsForLang(v, selectedTense, selectedLanguage);
                        if (result.ok) {
                          const verified = verifyConjugationMap(result.conjugations, selectedTense, selectedLanguage);
                          setVerbInput(result.infinitive);
                          setVerbKey(result.infinitive);
                          setConjugations(verified);
                          setError('');
                          setMode('quiz');
                        }
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 font-medium text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all capitalize"
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (starredVerbs.length === 0) return;
                    const v = starredVerbs[Math.floor(Math.random() * starredVerbs.length)];
                    const result = getConjugationsForLang(v, selectedTense, selectedLanguage);
                    if (result.ok) {
                      const verified = verifyConjugationMap(result.conjugations, selectedTense, selectedLanguage);
                      setVerbInput(result.infinitive);
                      setVerbKey(result.infinitive);
                      setConjugations(verified);
                      setError('');
                      setMode('quiz');
                    }
                  }}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 text-white text-sm font-semibold px-5 py-2.5 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center gap-2"
                >
                  <DiceIcon className="w-4 h-4" />
                  Rastgele seç
                </button>
              </div>
            )}
          </section>
        )}

        {/* Review (Tekrar) modu — Zorlandıklarım */}
        {mode === 'review' && (
          <section className="relative mb-4 rounded-2xl bg-slate-800/60 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-700 shadow-xl overflow-hidden transition-colors duration-300">
            <div className="px-6 sm:px-8 py-5 flex items-center justify-between gap-4">
              <h2 className="font-bold text-slate-200 text-lg">🧠 Tekrar (Zorlandıklarım)</h2>
              <button
                type="button"
                onClick={() => { setReviewEntry(null); setMode('quiz'); }}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                aria-label="Kapat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {!reviewEntry ? (
              <div className="p-8 sm:p-12 text-center">
                <p className="text-slate-300 font-medium">Henüz zorlandığınız çekim kaydı yok.</p>
                <p className="text-slate-400 text-sm mt-1.5">Alıştırma modunda yanlış yaptığınız veya ipucu kullandığınız sorular burada toplanır.</p>
                <button
                  type="button"
                  onClick={() => setMode('quiz')}
                  className="mt-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                  Alıştırma&apos;ya dön
                </button>
              </div>
            ) : (
              (() => {
                const reviewLang: AppLanguage = ['je','tu','il','nous','vous','ils'].includes(reviewEntry.pronoun) ? 'fr' : 'es';
                const tenseLabel = getTenses(reviewLang).find((t) => t.id === reviewEntry.tense)?.label ?? reviewEntry.tense;
                const pronounLabel = getPronouns(reviewLang).find((p) => p.id === reviewEntry.pronoun)?.label ?? reviewEntry.pronoun;
                let correctValue = '';
                try {
                  correctValue = getConjugationForTenseForLang(reviewEntry.verb, reviewEntry.tense, reviewLang)[reviewEntry.pronoun];
                } catch {
                  return (
                    <div className="p-8 text-center text-red-300 text-sm">
                      Bu fiil yüklenemedi. Listeden çıkarılıyor.
                      <button type="button" onClick={goToNextReviewQuestion} className="block mx-auto mt-3 text-indigo-400 hover:text-indigo-300 font-medium">Sonraki</button>
                    </div>
                  );
                }
                return (
                  <div className="p-6 sm:p-8 pb-20">
                    <p className="text-slate-300 text-sm mb-1">
                      <span className="font-semibold capitalize text-slate-200">{reviewEntry.verb}</span>
                      <span className="text-slate-500 mx-1">—</span>
                      <span>{tenseLabel}</span>
                      <span className="text-slate-500 mx-1">—</span>
                      <span className="font-medium text-slate-200">{pronounLabel}</span>
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 mt-4">
                      <label className="text-slate-300 font-semibold w-20 shrink-0 pt-2">{pronounLabel}</label>
                      <div className="flex-1 flex flex-col">
                        <div className="relative flex items-center min-h-12">
                          <input
                            ref={reviewInputRef}
                            type="text"
                            value={reviewAnswer}
                            onChange={(e) => setReviewAnswer(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && submitReviewAnswer()}
                            placeholder="Cevabınız..."
                            disabled={reviewSubmitted}
                            className={`flex-1 min-h-12 rounded-xl border px-4 py-3 text-base placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                              !reviewSubmitted
                                ? 'border-slate-600 bg-slate-900/50 text-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                                : reviewCorrect
                                  ? 'border-emerald-500/60 bg-emerald-500/20 text-slate-200'
                                  : 'border-red-500/60 bg-red-500/15 text-slate-200'
                            }`}
                          aria-label={`${pronounLabel} çekimi`}
                        />
                        {reviewSubmitted && reviewCorrect && (
                          <span className="absolute right-3 text-emerald-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        {reviewSubmitted && !reviewCorrect && (
                          <span className="absolute right-3 text-red-500 dark:text-red-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )}
                        </div>
                        {!reviewSubmitted && (
                          <AccentKeyboard
                            lang={selectedLanguage}
                            onInsert={(char) => {
                              setReviewAnswer((prev) => prev + char);
                              requestAnimationFrame(() => reviewInputRef.current?.focus());
                            }}
                          />
                        )}
                      </div>
                      {!reviewSubmitted ? (
                        <button
                          type="button"
                          onClick={submitReviewAnswer}
                          disabled={!reviewAnswer.trim()}
                          className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 text-white text-sm font-semibold px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Kontrol Et
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={goToNextReviewQuestion}
                          className="rounded-xl bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm font-semibold px-5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                        >
                          Sonraki
                        </button>
                      )}
                    </div>
                    {reviewSubmitted && !reviewCorrect && reviewEntry && (
                      <div className="mt-3">
                        <ErrorAnalysisCard
                          userAnswer={reviewAnswer}
                          correctAnswer={correctValue}
                          rule={getConjugationRule(
                            reviewEntry.verb,
                            reviewEntry.tense,
                            reviewEntry.pronoun,
                            reviewLang,
                            correctValue
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })())}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-700/80" aria-hidden />
          </section>
        )}

        {/* Tebrik mesajı + XP özeti (liste alıştırma) */}
        {showCongrats && verbKey && mode === 'quiz' && (
          <div
            className="mb-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-400/30 bg-emerald-50/80 dark:bg-emerald-500/15 p-6 text-center shadow-sm transition-colors duration-300"
            role="alert"
          >
            <p className="text-emerald-800 dark:text-emerald-200 font-semibold text-lg">{t('common.congrats')}</p>
            <p className="text-emerald-700 dark:text-emerald-300/90 mt-1 text-sm">{t('verbLab.quizAllCorrect')}</p>
            {quizCompletionSummary && (
              <div className="mt-4 text-left max-w-md mx-auto space-y-3">
                {quizCompletionSummary.leveledUp && (
                  <p className="text-center font-bold text-amber-600 dark:text-amber-300 text-sm">{t('common.levelUp')}</p>
                )}
                <p className="text-center text-lg font-bold text-emerald-800 dark:text-emerald-200 tabular-nums">
                  +{quizCompletionSummary.totalEarnedSession} XP
                </p>
                <p className="text-xs text-emerald-900/85 dark:text-emerald-200/85 leading-relaxed">
                  {[
                    quizCompletionSummary.breakdown.correctBaseXp > 0
                      ? t('verbLab.quizXp.correct', { xp: quizCompletionSummary.breakdown.correctBaseXp })
                      : '',
                    quizCompletionSummary.breakdown.irregularBonus > 0
                      ? t('verbLab.quizXp.irregular', { xp: quizCompletionSummary.breakdown.irregularBonus })
                      : '',
                    quizCompletionSummary.breakdown.firstTryBonus > 0
                      ? t('verbLab.quizXp.firstTry', { xp: quizCompletionSummary.breakdown.firstTryBonus })
                      : '',
                    quizCompletionSummary.breakdown.hintPenalty > 0
                      ? t('verbLab.quizXp.hint', { xp: quizCompletionSummary.breakdown.hintPenalty })
                      : '',
                    quizCompletionSummary.breakdown.specialBonus > 0
                      ? t('verbLab.quizXp.special', { xp: quizCompletionSummary.breakdown.specialBonus })
                      : '',
                    quizCompletionSummary.breakdown.dailyFirst > 0
                      ? t('verbLab.quizXp.dailyFirst', { xp: quizCompletionSummary.breakdown.dailyFirst })
                      : '',
                    quizCompletionSummary.breakdown.dailyVerb > 0
                      ? t('verbLab.quizXp.dailyVerb', { xp: quizCompletionSummary.breakdown.dailyVerb })
                      : '',
                    quizCompletionSummary.breakdown.flawless > 0
                      ? t('verbLab.quizXp.flawless', { xp: quizCompletionSummary.breakdown.flawless })
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <div>
                  <div className="h-2 rounded-full bg-emerald-200/80 dark:bg-emerald-900/50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-[width] duration-1000 ease-out"
                      style={{ width: `${Math.round(congratsXpBar)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-emerald-800/70 dark:text-emerald-300/70 mt-1 text-center">
                    {t('verbLab.levelProgressHint')}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {randomVerbMode && (
                <button
                  type="button"
                  onClick={pickNextRandomVerb}
                  className="rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 dark:hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors duration-300"
                >
                  {t('verbLab.nextRandomVerb')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowCongrats(false);
                  setQuizCompletionSummary(null);
                }}
                className="rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 hover:bg-emerald-700 dark:hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors duration-300"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}

        {/* Boş durum + Öğrenme/Alıştırma — tek kart; Basit modda üst boşluk minimum */}
        {mode !== 'review' && mode !== 'starred' && (
          <section className={`rounded-2xl bg-white dark:bg-slate-800/80 shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700/50 overflow-visible backdrop-blur-md transition-all duration-300 min-h-[400px] print:shadow-none print:border print:border-slate-200 ${viewMode === 'simple' ? 'mb-4 mt-0 pt-2' : 'mb-4 mt-6 md:mt-0'}`}>
            {/* Kart başlığı sekmeleri — her zaman görünür (Basit ve Detaylı) */}
            <div className="flex justify-start md:justify-center overflow-x-auto overflow-y-hidden scrollbar-hide print:hidden pt-3 pb-2 sm:pt-4 sm:pb-3 px-1 -mx-1 scroll-pl-2 scroll-pr-2">
              <div className="flex items-center gap-1 p-1 bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-full w-max min-w-0 flex-nowrap shadow-inner max-w-[100vw] px-1" role="tablist" aria-label="Mod">
              <button
                type="button"
                onClick={() => setMode('learning')}
                className={`min-h-[44px] px-4 py-2 md:px-5 md:py-2 rounded-full text-base md:text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer shrink-0 touch-manipulation ${
                  mode === 'learning'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
                title="Alt+L"
              >
                {t('verbLab.modes.learning')}
              </button>
              <button
                type="button"
                onClick={() => setMode('quiz')}
                className={`min-h-[44px] px-4 py-2 md:px-5 md:py-2 rounded-full text-base md:text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer shrink-0 touch-manipulation ${
                  mode === 'quiz'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
                title="Alt+Q"
              >
                {t('verbLab.modes.practice')}
              </button>
              <button
                type="button"
                onClick={() => setMode('time-attack')}
                className={`min-h-[44px] px-4 py-2 md:px-5 md:py-2 rounded-full text-base md:text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer shrink-0 touch-manipulation ${
                  mode === 'time-attack'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
                title={t('verbLab.modes.timeAttack')}
              >
                {t('verbLab.modes.timeAttack')}
              </button>
              <button
                type="button"
                onClick={() => setMode('compare')}
                className={`min-h-[44px] px-4 py-2 md:px-5 md:py-2 rounded-full text-base md:text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer shrink-0 touch-manipulation ${
                  mode === 'compare'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
                title={t('verbLab.modes.compare')}
              >
                {t('verbLab.modes.compare')}
              </button>
              <button
                type="button"
                onClick={() => setMode('mastery')}
                disabled={!verbKey || (selectedLanguage !== 'es' && selectedLanguage !== 'fr')}
                className={`min-h-[44px] px-4 py-2 md:px-5 md:py-2 rounded-full text-base md:text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer shrink-0 touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode === 'mastery'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
                title={t('verbLab.modes.mastery')}
              >
                {t('verbLab.modes.mastery')}
              </button>
              </div>
            </div>

            {/* Zamana Karşı (Arcade) — tüm görünümlerde çalışır (viewMode'dan bağımsız) */}
            {mode === 'time-attack' && (
              <div className={`p-6 sm:p-8 relative ${timeAttackShake ? 'animate-time-attack-shake' : ''}`}>
                {timeAttackDifficulty === null ? (
                  /* ───────────── ZORLUK SEÇİM EKRANI ───────────── */
                  <div className="max-w-2xl mx-auto text-center">
                    <div className="mb-8">
                      <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 dark:from-violet-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent">
                        {t('timeAttack.heroTitle')}
                      </h2>
                      <p className="mt-3 text-slate-600 dark:text-slate-300">
                        {t('timeAttack.heroSubtitle')}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {(['easy', 'medium', 'hard'] as TimeAttackDifficulty[]).map((diff) => {
                        const cfg = difficultyConfig[diff];
                        const colorMap = {
                          emerald: {
                            border: 'border-emerald-400/40 hover:border-emerald-400',
                            bg: 'bg-emerald-50/70 dark:bg-emerald-500/10 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/15',
                            text: 'text-emerald-700 dark:text-emerald-300',
                            badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
                            glow: 'shadow-emerald-500/20',
                          },
                          amber: {
                            border: 'border-amber-400/40 hover:border-amber-400',
                            bg: 'bg-amber-50/70 dark:bg-amber-500/10 hover:bg-amber-100/80 dark:hover:bg-amber-500/15',
                            text: 'text-amber-700 dark:text-amber-300',
                            badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
                            glow: 'shadow-amber-500/20',
                          },
                          rose: {
                            border: 'border-rose-400/40 hover:border-rose-400',
                            bg: 'bg-rose-50/70 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/15',
                            text: 'text-rose-700 dark:text-rose-300',
                            badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
                            glow: 'shadow-rose-500/20',
                          },
                        }[cfg.colorToken];
                        const best = (() => {
                          const list = getTimeAttackScores(diff);
                          return list.length > 0 ? Math.max(...list.map((e) => e.score)) : 0;
                        })();
                        return (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => startTimeAttack(diff)}
                            className={`group text-left rounded-2xl border-2 p-5 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${colorMap.border} ${colorMap.bg} ${colorMap.glow}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-3xl" aria-hidden>{cfg.emoji}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorMap.badge}`}>
                                x{cfg.multiplier} {t('timeAttack.pointsBadge')}
                              </span>
                            </div>
                            <p className={`text-xl font-black ${colorMap.text}`}>{cfg.label}</p>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-snug">
                              {cfg.description}
                            </p>
                            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-600/40 space-y-1 text-xs">
                              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                <span>Süre/soru</span>
                                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{cfg.secondsPerQuestion}s</span>
                              </div>
                              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                <span>Rekor</span>
                                <span className={`font-bold tabular-nums ${colorMap.text}`}>
                                  {best > 0 ? best : '—'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                      {t('timeAttack.rulesBlurb')}
                    </p>
                  </div>
                ) : timeAttackGameOver ? (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl p-8 max-w-md mx-auto text-center">
                    {(() => {
                      const cfg = difficultyConfig[timeAttackDifficulty];
                      const badgeMap = {
                        emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
                        amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
                        rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
                      }[cfg.colorToken];
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full text-xs font-bold border ${badgeMap}`}>
                          <span aria-hidden>{cfg.emoji}</span>
                          {cfg.label} · x{cfg.multiplier}
                        </span>
                      );
                    })()}
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('timeAttack.gameOver')}</h2>
                    {timeAttackIsNewRecord && (
                      <p className="text-amber-600 dark:text-amber-400 font-bold text-lg animate-pulse mb-4">🏆 {t('timeAttack.newRecord')}</p>
                    )}
                    <dl className="space-y-3 text-left max-w-xs mx-auto">
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">{t('timeAttack.sessionScore')}</dt>
                        <dd className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{timeAttackScore}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">
                          {t('timeAttack.personalBest', { difficulty: difficultyConfig[timeAttackDifficulty].label })}
                        </dt>
                        <dd className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{timeAttackHighScore}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">{t('timeAttack.maxComboLabel')}</dt>
                        <dd className="font-bold text-orange-500 dark:text-orange-400">x{timeAttackMaxCombo}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">{t('timeAttack.verbsCorrectCount')}</dt>
                        <dd className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{timeAttackCorrectCount}</dd>
                      </div>
                    </dl>
                    {timeAttackLastScores.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 text-left">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                          {t('timeAttack.lastFive', { difficulty: difficultyConfig[timeAttackDifficulty].label })}
                        </p>
                        <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                          {timeAttackLastScores.map((e, i) => (
                            <li key={i} className="flex justify-between gap-2">
                              <span className="tabular-nums font-medium">{e.score}</span>
                              <span className="text-slate-500 dark:text-slate-400 truncate">
                                {new Date(e.date).toLocaleDateString('tr-TR')} · x{e.combo}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-8 grid grid-cols-2 gap-3 max-w-md mx-auto">
                      <button
                        type="button"
                        onClick={resetToDifficultyMenu}
                        className="min-h-[44px] py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors touch-manipulation text-sm sm:text-base"
                      >
                        {t('timeAttack.changeDifficulty')}
                      </button>
                      <button
                        type="button"
                        onClick={() => startTimeAttack(timeAttackDifficulty)}
                        className="min-h-[44px] py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-400 dark:hover:to-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all duration-300 touch-manipulation text-sm sm:text-base"
                      >
                        {t('timeAttack.playAgain')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Zorluk rozeti */}
                    {(() => {
                      const cfg = difficultyConfig[timeAttackDifficulty];
                      const badgeMap = {
                        emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
                        amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
                        rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
                      }[cfg.colorToken];
                      return (
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeMap}`}>
                            <span aria-hidden>{cfg.emoji}</span>
                            {cfg.label} · x{cfg.multiplier} {t('timeAttack.pointsBadge')}
                          </span>
                          <button
                            type="button"
                            onClick={resetToDifficultyMenu}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline underline-offset-2"
                          >
                            {t('timeAttack.changeDifficulty')}
                          </button>
                        </div>
                      );
                    })()}
                    {/* HUD: Süre | Skor & Kombo | Canlar */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 items-center text-center md:text-left">
                      {(() => {
                        const taTotal = difficultyConfig[timeAttackDifficulty].secondsPerQuestion;
                        const taPhase = getTimeAttackTimerPhase(timeAttackTimeLeft);
                        const taPhaseCls = TIME_ATTACK_TIMER_PHASE_CLASS[taPhase];
                        const taBarPct =
                          taTotal > 0
                            ? Math.max(0, Math.min(100, (timeAttackTimeLeft / taTotal) * 100))
                            : 0;
                        return (
                          <div className="flex flex-col gap-2 items-center md:items-start min-w-0 shrink-0 w-full md:w-auto">
                            <div
                              className={`flex items-center justify-center gap-2 font-mono font-bold tabular-nums text-4xl sm:text-[2.5rem] leading-none ${taPhaseCls.text}`}
                              aria-live="polite"
                              aria-atomic="true"
                            >
                              <Clock
                                className="shrink-0"
                                size={40}
                                strokeWidth={2.25}
                                aria-hidden
                              />
                              <span>{timeAttackTimeLeft}s</span>
                            </div>
                            <div
                              className="h-1.5 w-full min-w-[12rem] max-w-[16rem] mx-auto md:mx-0 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={taTotal}
                              aria-valuenow={timeAttackTimeLeft}
                            >
                              <div
                                className="h-full rounded-full transition-[width] duration-200 ease-linear"
                                style={{
                                  width: `${taBarPct}%`,
                                  backgroundColor: taPhaseCls.bar,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                      <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          SKOR: <span className="text-indigo-600 dark:text-indigo-400 tabular-nums">{timeAttackScore}</span>
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">|</span>
                        {/*
                          Inline combo sayacı — her artışta framer-motion ile
                          scale [1, 1.2, 1] animate olur, 🔥 ikonunun arkasına
                          combo büyüdükçe yoğunlaşan altın/kırmızı glow (drop-shadow).
                        */}
                        <motion.span
                          key={`ta-combo-${timeAttackCombo}`}
                          initial={{ scale: 1 }}
                          animate={timeAttackCombo >= 2 ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                          transition={{ duration: 0.32, ease: 'easeOut' }}
                          className={`inline-flex items-center gap-1 text-sm font-bold ${
                            timeAttackCombo >= 10
                              ? 'text-red-500 dark:text-red-400'
                              : timeAttackCombo >= 5
                                ? 'text-orange-500 dark:text-orange-400'
                                : timeAttackCombo >= 3
                                  ? 'text-amber-500 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          x{timeAttackCombo} COMBO
                          <span
                            aria-hidden
                            className="inline-block transition-all duration-300"
                            style={{
                              filter:
                                timeAttackCombo >= 20
                                  ? 'drop-shadow(0 0 8px rgba(239,68,68,0.9)) drop-shadow(0 0 16px rgba(251,146,60,0.7))'
                                  : timeAttackCombo >= 10
                                    ? 'drop-shadow(0 0 6px rgba(251,146,60,0.85)) drop-shadow(0 0 12px rgba(250,204,21,0.55))'
                                    : timeAttackCombo >= 5
                                      ? 'drop-shadow(0 0 5px rgba(250,204,21,0.75))'
                                      : 'none',
                            }}
                          >
                            🔥
                          </span>
                        </motion.span>
                      </div>
                      <div className="flex items-center gap-0.5" aria-label={`${timeAttackLives} can`}>
                        {[1, 2, 3].map((i) => (
                          <span key={i} className="text-xl" aria-hidden>
                            {i <= timeAttackLives ? '❤️' : '🖤'}
                          </span>
                        ))}
                      </div>
                    </div>
                    {timeAttackQuestion && (
                      <>
                        <p className="text-slate-600 dark:text-slate-300 text-center mb-1">
                          <span className="font-semibold capitalize text-slate-800 dark:text-slate-100">{timeAttackQuestion.verbKey}</span>
                          {' — '}
                          <span>{pronounsForLang.find((p) => p.id === timeAttackQuestion.pronoun)?.label}</span>
                          {' — '}
                          <span>{tensesForLang.find((t) => t.id === timeAttackQuestion.tense)?.label}</span>
                        </p>
                        <div className="relative flex flex-col gap-2 mt-4 max-w-md mx-auto">
                          {/*
                            Yüzen puan/combo rozeti — doğru cevapta inputun
                            sağ üst köşesinden yukarı süzülüp kaybolur.
                          */}
                          <AnimatePresence>
                            {timeAttackPointsFlash !== null && (
                              <motion.div
                                key={`ta-float-${timeAttackPointsFlash}-${timeAttackCombo}`}
                                initial={{ opacity: 0, y: 0, scale: 0.9 }}
                                animate={{ opacity: 1, y: -22, scale: 1 }}
                                exit={{ opacity: 0, y: -44, scale: 0.95 }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className="pointer-events-none absolute -top-2 right-1 z-10 flex flex-col items-end gap-0.5 text-right"
                                aria-hidden
                              >
                                <span
                                  className={`text-sm font-bold tabular-nums ${
                                    timeAttackCombo >= 5
                                      ? 'text-amber-400 dark:text-amber-300'
                                      : 'text-emerald-500 dark:text-emerald-400'
                                  }`}
                                  style={{
                                    textShadow:
                                      timeAttackCombo >= 5
                                        ? '0 0 8px rgba(251,191,36,0.75)'
                                        : '0 0 6px rgba(52,211,153,0.55)',
                                  }}
                                >
                                  +{timeAttackPointsFlash}
                                </span>
                                {timeAttackCombo >= 5 && (
                                  <span
                                    className="text-xs font-semibold text-amber-400 dark:text-amber-300"
                                    style={{ textShadow: '0 0 6px rgba(251,191,36,0.6)' }}
                                  >
                                    x{timeAttackCombo} Combo!
                                  </span>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="flex flex-col w-full gap-2 sm:flex-row sm:max-w-md sm:mx-auto">
                            <input
                              ref={timeAttackInputRef}
                              type="text"
                              value={timeAttackInput}
                              onChange={(e) => setTimeAttackInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  submitTimeAttackAnswer();
                                }
                              }}
                              placeholder="Cevabınız..."
                              disabled={timeAttackLocked}
                              className={`w-full sm:flex-1 min-h-[48px] h-12 rounded-xl border bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-4 py-3 text-base placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors duration-200 disabled:opacity-80 ${
                                timeAttackFeedback === 'wrong'
                                  ? 'border-red-500 dark:border-red-500 ring-2 ring-red-500/40 focus:ring-red-500'
                                  : timeAttackFeedback === 'correct'
                                  ? 'border-green-500 dark:border-green-500 focus:ring-green-500'
                                  : 'border-slate-200 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-indigo-400'
                              }`}
                              autoComplete="off"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={submitTimeAttackAnswer}
                              disabled={timeAttackLocked}
                              className="w-full sm:w-auto min-h-[48px] shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 transition-colors duration-300 touch-manipulation"
                            >
                              Kontrol
                            </button>
                          </div>
                          <AccentKeyboard
                            lang={selectedLanguage}
                            onInsert={(char) => {
                              if (timeAttackLocked) return;
                              setTimeAttackInput((prev) => prev + char);
                              requestAnimationFrame(() => timeAttackInputRef.current?.focus());
                            }}
                          />
                        </div>
                        {timeAttackFeedback === 'correct' && (
                          <p className="text-center mt-3 text-green-600 dark:text-green-400 font-medium">
                            <span aria-hidden>✓</span> Doğru!
                          </p>
                        )}
                        <AnimatePresence>
                          {timeAttackFeedback === 'wrong' && timeAttackRevealedAnswer && (
                            <motion.div
                              key="ta-reveal"
                              initial={{ opacity: 0, y: -6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.98 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                              className="mt-3 max-w-md mx-auto rounded-xl border border-red-400/40 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-center shadow-sm"
                            >
                              <p className="text-xs font-semibold uppercase tracking-wide text-red-600/80 dark:text-red-400/80">
                                Can -1 · Kombo sıfırlandı
                              </p>
                              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                                Doğrusu:{' '}
                                <span className="font-bold text-red-800 dark:text-red-200">
                                  {timeAttackRevealedAnswer}
                                </span>
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Kıyaslama — tüm görünümlerde çalışır (viewMode'dan bağımsız) */}
            {mode === 'compare' && (() => {
              const compareSlots: {
                key: 'a' | 'b' | 'c';
                tense: string;
                setTense: (id: string) => void;
                open: boolean;
                setOpen: (v: boolean) => void;
                ref: React.RefObject<HTMLDivElement | null>;
                accent: string;
                accentText: string;
                accentBorder: string;
                hoverBg: string;
                label: string;
              }[] = [
                {
                  key: 'a',
                  tense: compareTense1,
                  setTense: setCompareTense1,
                  open: compareDropdown1Open,
                  setOpen: (v) => { setCompareDropdown1Open(v); if (v) { setCompareDropdown2Open(false); setCompareDropdown3Open(false); } },
                  ref: compareDropdown1Ref,
                  accent: 'indigo-500',
                  accentText: 'text-indigo-600 dark:text-indigo-400',
                  accentBorder: 'border-indigo-500/15 dark:border-indigo-400/15',
                  hoverBg: 'hover:bg-indigo-500/20',
                  label: '1. Zaman',
                },
                {
                  key: 'b',
                  tense: compareTense2,
                  setTense: setCompareTense2,
                  open: compareDropdown2Open,
                  setOpen: (v) => { setCompareDropdown2Open(v); if (v) { setCompareDropdown1Open(false); setCompareDropdown3Open(false); } },
                  ref: compareDropdown2Ref,
                  accent: 'fuchsia-500',
                  accentText: 'text-fuchsia-600 dark:text-fuchsia-400',
                  accentBorder: 'border-fuchsia-500/15 dark:border-fuchsia-400/15',
                  hoverBg: 'hover:bg-fuchsia-500/20',
                  label: '2. Zaman',
                },
                {
                  key: 'c',
                  tense: compareTense3,
                  setTense: setCompareTense3,
                  open: compareDropdown3Open,
                  setOpen: (v) => { setCompareDropdown3Open(v); if (v) { setCompareDropdown1Open(false); setCompareDropdown2Open(false); } },
                  ref: compareDropdown3Ref,
                  accent: 'emerald-500',
                  accentText: 'text-emerald-600 dark:text-emerald-400',
                  accentBorder: 'border-emerald-500/15 dark:border-emerald-400/15',
                  hoverBg: 'hover:bg-emerald-500/20',
                  label: '3. Zaman',
                },
              ];
              const selectedTenseIds = compareSlots.map((s) => s.tense);
              const hasDuplicate = new Set(selectedTenseIds).size !== selectedTenseIds.length;

              return (
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
                  {compareSlots.map((slot) => (
                    <div key={slot.key} className="flex flex-col relative" ref={slot.ref}>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{slot.label}</label>
                      <button
                        type="button"
                        onClick={() => slot.setOpen(!slot.open)}
                        className={`w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-left text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-${slot.accent}/50 transition-colors duration-300 flex items-center justify-between gap-2`}
                        aria-expanded={slot.open}
                        aria-haspopup="listbox"
                      >
                        <span className="truncate">{tensesForLang.find((t) => t.id === slot.tense)?.label ?? '—'}</span>
                        <svg className="w-5 h-5 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200" style={{ transform: slot.open ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div
                        role="listbox"
                        className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-200 ease-out max-h-[min(18rem,60vh)] overflow-y-auto ${
                          slot.open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[0.98] pointer-events-none'
                        }`}
                      >
                        <div className="py-2">
                          {tenseGroupsForLang.map((group) => (
                            <div key={group.mood} className="px-3 pb-1 pt-2 first:pt-0">
                              <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 px-3 py-1 select-none">{group.label}</p>
                              <div className="space-y-0.5 mt-0.5">
                                {group.tenseIds.map((id) => {
                                  const tx = tensesForLang.find((x) => x.id === id);
                                  if (!tx) return null;
                                  const isSelected = slot.tense === tx.id;
                                  return (
                                    <button
                                      key={tx.id}
                                      type="button"
                                      role="option"
                                      aria-selected={isSelected}
                                      onClick={() => { slot.setTense(tx.id); slot.setOpen(false); }}
                                      className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-800 dark:text-slate-100 ${slot.hoverBg} transition-colors duration-200`}
                                    >
                                      <span>{tx.label}</span>
                                      {isSelected && (
                                        <svg className={`w-5 h-5 shrink-0 ${slot.accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {hasDuplicate && (
                  <div className="rounded-xl border border-amber-300/80 dark:border-amber-500/50 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-3 text-amber-800 dark:text-amber-200 text-sm font-medium mb-4">
                    Aynı zamanı birden fazla kez seçtiniz. Daha iyi karşılaştırma için 3 farklı zaman seçin.
                  </div>
                )}
                {!verbKey ? (
                  <div className="text-center py-8 rounded-2xl bg-white/5 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-600/30">
                    <p className="text-slate-600 dark:text-slate-300 font-medium">Karşılaştırmak için önce bir fiil girin</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">Yukarıdaki arama alanına fiil yazıp &quot;Göster&quot;e tıklayın.</p>
                  </div>
                ) : (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-stretch">
                    {compareSlots.map((slot) => {
                      const tenseLabel = tensesForLang.find((t) => t.id === slot.tense)?.label ?? '—';
                      const explanation = getTenseExplanation(selectedLanguage, slot.tense);
                      const map = getSafeConjugationMap(verbKey, slot.tense, selectedLanguage);
                      // Diff vurgusu yalnızca a↔b çiftinde anlamlıdır; 3 zaman gösteriminde sade metin kullanılır.
                      return (
                        <div
                          key={slot.key}
                          className="h-full rounded-2xl bg-white/5 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-600/30 p-5 sm:p-6 flex flex-col"
                        >
                          <div className={`mb-3 pb-3 border-b ${slot.accentBorder}`}>
                            <h3 className={`text-lg font-bold leading-snug ${slot.accentText}`}>
                              {tenseLabel}
                            </h3>
                            {explanation?.shortDesc && (
                              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-snug">
                                {explanation.shortDesc}
                              </p>
                            )}
                          </div>
                          <ul className="flex-1">
                            {pronounsForLang.map(({ id, label }, idx) => {
                              const text = map[id] ?? '—';
                              return (
                                <li
                                  key={id}
                                  className={`flex justify-between items-center gap-3 py-2 border-b border-slate-200/40 dark:border-white/5 ${
                                    idx === pronounsForLang.length - 1 ? 'border-b-0' : ''
                                  }`}
                                >
                                  <span className="w-1/3 text-left text-slate-600 dark:text-slate-300 font-semibold truncate text-sm">
                                    {label}
                                  </span>
                                  <span className="w-2/3 text-right text-slate-900 dark:text-slate-100 break-words text-sm">
                                    {text}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                  {selectedLanguage === 'es' && (
                    <div className="mt-5 rounded-2xl border border-slate-200/40 dark:border-slate-700/50 bg-white/5 dark:bg-slate-800/25 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {compareSlots.slice(0, 2).map((slot) => {
                          const label = tensesForLang.find((t) => t.id === slot.tense)?.label ?? slot.tense;
                          const tm = timeMarkers[label];
                          if (!tm) return null;
                          return (
                            <div key={`tm-compare-${slot.key}`}>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {tm.markers.map((marker, i) => {
                                  const tipKey = `compare-${slot.key}-${marker}-${i}`;
                                  const isOpen = activeTimeMarkerTip === tipKey;
                                  return (
                                    <div key={tipKey} className="relative">
                                      <button
                                        type="button"
                                        onClick={() => setActiveTimeMarkerTip((k) => (k === tipKey ? null : tipKey))}
                                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${markerColorClass(tm.color)}`}
                                      >
                                        {marker}
                                      </button>
                                      {isOpen && (
                                        <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-xl">
                                          <p className="text-xs text-slate-700 dark:text-slate-200">
                                            {marker}, {verbKey} en este tiempo verbal.
                                          </p>
                                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            → Bu zarf {label} ile tipik kullanılır.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
              );
            })()}

            {mode === 'mastery' &&
              verbKey &&
              (selectedLanguage === 'es' || selectedLanguage === 'fr') && (
                <div className="p-6 sm:p-8 space-y-6 max-w-xl mx-auto">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">{verbKey}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {t('verbLab.mastery.verbScore', { pct: masteryVerbPercent })}
                    </p>
                  </div>
                  {masteryDueForVerb.length > 0 && (
                    <div className="rounded-xl border border-red-500/35 dark:border-red-500/40 bg-red-500/[0.08] dark:bg-red-500/10 px-4 py-3">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                        ⏰ {t('verbLab.mastery.dueForVerb', { n: masteryDueForVerb.length })}
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
                        {masteryDueForVerb.slice(0, 10).map((d) => {
                          const tLab = tensesForLang.find((x) => x.id === d.tense)?.label ?? d.tense;
                          const pLab = pronounsForLang.find((p) => p.id === d.person)?.label ?? d.person;
                          return (
                            <li key={d.key} className="tabular-nums">
                              {d.verb} · {tLab} · {pLab}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <div className="space-y-3">
                    {masteryTenseRows.map((row) => {
                      const tenseLabel = tensesForLang.find((x) => x.id === row.tenseId)?.label ?? row.tenseId;
                      const meta = MASTERY_LEVEL_META[row.labelLevel] ?? MASTERY_LEVEL_META[0];
                      return (
                        <button
                          type="button"
                          key={row.tenseId}
                          onClick={() => {
                            setSelectedTense(row.tenseId);
                            setMode('quiz');
                            setExerciseMode('focus');
                          }}
                          className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50 px-4 py-3 hover:border-indigo-400/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        >
                          <div className="flex flex-wrap justify-between gap-2 mb-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{tenseLabel}</span>
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {meta.emoji} {t(`verbLab.mastery.levelLabels.${row.labelLevel}`)} ({row.displayFraction})
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                              style={{ width: `${Math.min(100, row.avgPercent)}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {mode === 'mastery' && verbKey && selectedLanguage !== 'es' && selectedLanguage !== 'fr' && (
              <div className="p-8 text-center text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto">
                {t('verbLab.mastery.onlyEsFr')}
              </div>
            )}

            {!verbKey && mode !== 'time-attack' && mode !== 'compare' && mode !== 'mastery' && (
              <div className="p-6 sm:p-10 flex items-center justify-center min-h-[280px]">
                <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white/60 dark:bg-slate-800/50 backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 px-6 py-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 mb-4 text-3xl" aria-hidden>
                    🧪
                  </div>
                  <p className="text-slate-800 dark:text-slate-100 font-bold text-lg">
                    {t('verb_lab_ready')}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-sm mx-auto">
                    {t('verb_lab_empty_subtitle')}
                  </p>
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      🔥 {t('verb_lab_popular_label')}:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {(selectedLanguage === 'fr' ? ['être', 'avoir', 'aller', 'faire', 'pouvoir'] : ['ser', 'estar', 'ir', 'hacer', 'tener']).map((verb) => (
                        <button
                          key={verb}
                          type="button"
                          onClick={() => {
                            setVerbInput(verb);
                            loadVerb(verb);
                          }}
                          className="px-4 py-2 rounded-full bg-slate-200/90 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:scale-105 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 ease-out cursor-pointer text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                          {verb}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

        {(verbKey && conjugationsForDisplay && mode === 'learning') && (
          <div className="print-area">
            {serEstarOverlayOpen && (
              <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 flex items-start sm:items-center justify-center">
                <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-900 shadow-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">SER vs ESTAR — Karşılaştırmalı Mod</h3>
                    <button
                      type="button"
                      onClick={() => setSerEstarOverlayOpen(false)}
                      className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label="Kapat"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">SER</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">Kalıcı özellikler</p>
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">ESTAR</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">Geçici durumlar</p>
                    </div>
                  </div>

                  <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {serEstarRules
                      .filter((r) => r.verb === 'ser')
                      .map((r, i) => (
                        <div key={`ser-${i}`} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.category}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.rule}</p>
                          <ul className="mt-2 space-y-1">
                            {r.examples.map((ex, j) => (
                              <li key={j} className="text-sm text-slate-700 dark:text-slate-200">
                                {ex.es} <span className="text-slate-500 dark:text-slate-400">→ {ex.tr}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    {serEstarRules
                      .filter((r) => r.verb === 'estar')
                      .map((r, i) => (
                        <div key={`estar-${i}`} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.category}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.rule}</p>
                          <ul className="mt-2 space-y-1">
                            {r.examples.map((ex, j) => (
                              <li key={j} className="text-sm text-slate-700 dark:text-slate-200">
                                {ex.es} <span className="text-slate-500 dark:text-slate-400">→ {ex.tr}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>

                  <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">KURAL: &quot;¿Cómo estás?&quot; ✓  &quot;¿Cómo eres?&quot; ✗ (farklı anlam)</p>

                  <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
                    <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">
                      Mini Quiz: &quot;Soy/Estoy ___ médico?&quot;
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSerEstarAnswer('ser')}
                        className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Soy
                      </button>
                      <button
                        type="button"
                        onClick={() => setSerEstarAnswer('estar')}
                        className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Estoy
                      </button>
                    </div>
                    {serEstarAnswer && (
                      <p className={`mt-2 text-sm ${serEstarAnswer === 'ser' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                        {serEstarAnswer === 'ser'
                          ? 'Doğru: Meslek/kimlik için SER kullanılır → Soy médico.'
                          : 'Yanlış: ESTAR geçici durumlar içindir; meslekte SER kullanılır.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Yazdırma çalışma yaprağı — sadece @media print ile görünür */}
            <div className="hidden print:block print:bg-white print:text-black pb-8">
              {/* Başlık: Sol Diloloji + logo, Sağ Fiil Çalışma Yaprağı + tarih */}
              <div className="print:flex print:justify-between print:items-start print:border-b print:border-slate-300 print:pb-4 print:mb-6">
                <div className="print:flex print:items-center print:gap-2">
                  <img src="/logo-light.svg" alt="Diloloji" className="print:h-8 print:w-auto" />
                  <span className="print:text-lg print:font-semibold print:text-black">Diloloji</span>
                </div>
                <div className="print:text-right">
                  <p className="print:text-sm print:font-semibold print:text-black">Fiil Çalışma Yaprağı</p>
                  <p className="print:text-xs print:text-slate-600 print:mt-0.5">
                    {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {/* Fiil başlığı: Avoir - Sahip olmak */}
              <h1 className="print:text-2xl print:font-bold print:text-black print:mb-6">
                {verbKey} — {translation ? translation.charAt(0).toUpperCase() + translation.slice(1) : getTranslationOrPlaceholder(verbKey, selectedLanguage)}
              </h1>
              {/* Rozetler: Mastar, Ulaç, Geçmiş Ortaç */}
              {(() => {
                const meta = getVerbMetadata(verbKey, selectedLanguage, !isIrregularVerb(verbKey, selectedLanguage));
                return (
                  <div className="print:flex print:flex-wrap print:gap-2 print:mb-6">
                    <span className="print:inline-flex print:items-center print:rounded-lg print:border print:border-slate-300 print:px-2.5 print:py-1 print:text-xs print:font-medium print:text-black print:bg-white">
                      Mastar: <span className="print:ml-1 print:font-semibold">{meta.infinitive}</span>
                    </span>
                    <span className="print:inline-flex print:items-center print:rounded-lg print:border print:border-slate-300 print:px-2.5 print:py-1 print:text-xs print:font-medium print:text-black print:bg-white">
                      Ulaç: <span className="print:ml-1 print:font-semibold">{meta.gerund}</span>
                    </span>
                    <span className="print:inline-flex print:items-center print:rounded-lg print:border print:border-slate-300 print:px-2.5 print:py-1 print:text-xs print:font-medium print:text-black print:bg-white">
                      Geçmiş Ortaç: <span className="print:ml-1 print:font-semibold">{meta.pastParticiple}</span>
                    </span>
                  </div>
                );
              })()}
              {/* Zaman çekimleri: grid + kart + tablo (zamir | çekim) */}
              <div className="print:grid print:grid-cols-2 lg:print:grid-cols-3 print:gap-6">
                {tenseGroupsForLang.flatMap((group) =>
                  group.tenseIds.map((tenseId) => {
                    const t = tensesForLang.find((x) => x.id === tenseId);
                    if (!t) return [];
                    const map = getSafeConjugationMap(verbKey, t.id, selectedLanguage);
                    if (!map || Object.keys(map).length === 0) return [];
                    return (
                      <div key={t.id} className="print:border print:border-slate-300 print:rounded-lg print:p-4 print:bg-white print:break-inside-avoid">
                        <h4 className="print:text-sm print:font-bold print:text-black print:mb-3">{t.label}</h4>
                        <table className="print:w-full print:text-sm">
                          <tbody>
                            {pronounsForLang.map(({ id, label }) => {
                              const rawVal = map[id] ?? '';
                              const missing = isConjugationValueMissing(rawVal) || rawVal === '—';
                              const displayVal = missing ? '' : formatConjugationForDisplay(rawVal, id, selectedLanguage, isReflexive, isNegative);
                              return (
                                <tr key={id} className="print:border-b print:border-slate-200 last:print:border-b-0">
                                  <td className="print:py-1.5 print:pr-2 print:w-1/4 print:font-semibold print:text-slate-700 print:align-baseline">
                                    {label}
                                  </td>
                                  <td className="print:py-1.5 print:text-black print:align-baseline">
                                    {missing ? (
                                      <span className="print:italic print:text-slate-500">—</span>
                                    ) : (
                                      <ConjugationWithStemSuffix text={displayVal} tenseId={t.id} lang={selectedLanguage} />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Ekranda görünen içerik — yazdırmada gizlenir */}
            <div className="print:hidden">
            {reverseLookupInfo && (
              <div className="mx-4 sm:mx-0 mb-4 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-400/20 dark:border-indigo-400/30 px-4 py-3 flex items-start gap-3">
                <span className="text-xl shrink-0" aria-hidden>💡</span>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  Aradığınız çekim: <strong>{reverseLookupInfo.searched}</strong> → <strong>{reverseLookupInfo.infinitive}</strong> fiiline aittir ({reverseLookupInfo.tenseLabel} – {reverseLookupInfo.pronounLabel}).
                </p>
              </div>
            )}
            {isIrregularVerb(verbKey, selectedLanguage) && (
              <div className="mx-4 sm:mx-0 mb-4 rounded-xl bg-amber-500/10 dark:bg-orange-500/10 border border-amber-500/20 dark:border-orange-500/20 px-4 py-3 flex items-start gap-3 transition-all duration-200" role="alert">
                <span className="text-xl shrink-0" aria-hidden>⚠️</span>
                <p className="text-sm text-amber-800 dark:text-amber-400 leading-relaxed">
                  Dikkat: Bu düzensiz (irregular) bir fiildir. Kök değişimi veya istisnai çekim kuralları içerebilir.
                </p>
              </div>
            )}
            {isSerEstarVerb && (
              <div className="mx-4 sm:mx-0 mb-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-500/15 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                  ⚡ SER vs ESTAR — Karşılaştırmalı Mod
                </p>
                <button
                  type="button"
                  onClick={() => setSerEstarOverlayOpen(true)}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  Her İkisini Karşılaştır
                </button>
              </div>
            )}
            {selectedLanguage === 'es' && selectedTenseMarkers && (
              <div className="mx-4 sm:mx-0 mb-4 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/35 px-3 py-3">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  {tenseLabel} ile kullanılır:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTenseMarkers.markers.map((marker, i) => {
                    const tipKey = `learn-${tenseLabel}-${marker}-${i}`;
                    const isOpen = activeTimeMarkerTip === tipKey;
                    return (
                      <div key={tipKey} className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveTimeMarkerTip((k) => (k === tipKey ? null : tipKey))}
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${markerColorClass(selectedTenseMarkers.color)}`}
                        >
                          {marker}
                        </button>
                        {isOpen && (
                          <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-xl">
                            <p className="text-xs text-slate-700 dark:text-slate-200">
                              {marker}, {verbKey ?? 'yo'} en contexto real.
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              → &quot;{marker}&quot; zarfı bu zamanla sık kullanılır.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/*
              Kapsayıcı başlık alanı — Basit/Detaylı geçişlerinde UI kaymasını
              engellemek için sabit padding (py-3 sm:py-3.5) ve tutarlı iç
              yapı kullanılır. Mod butonları daima sağ uçta çakılı kalır;
              yalnızca 'Detaylı' modundaki araç grubu (tense rozeti, Ezber
              Modu, Sete Ekle, Yazdır) ortadan fade ile girip/çıkar.
            */}
            <div className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 px-5 sm:px-6 py-3 sm:py-3.5 transition-colors duration-300">
              {viewMode === 'detailed' ? (
                <div className="flex flex-col gap-2.5">
                  {/* Satır 1: fiil + ⭐ + telaffuz · anlam · Basit|Detaylı */}
                  <div className="flex items-center w-full gap-2 sm:gap-3 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
                      <h2 className="font-bold text-slate-800 dark:text-slate-100 capitalize text-base sm:text-lg md:text-xl tracking-tight truncate max-w-[40vw] sm:max-w-none">
                        {verbKey}
                      </h2>
                      {randomVerbMode && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium px-1.5 py-0.5 shrink-0"
                          title="Rastgele mod açık"
                        >
                          <Shuffle className="w-3 h-3 shrink-0" strokeWidth={2} aria-hidden />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleStar(verbKey)}
                        className="p-1 rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors shrink-0"
                        title={isStarredVerb(verbKey) ? 'Yıldızdan kaldır' : 'Yıldızla'}
                        aria-label={isStarredVerb(verbKey) ? 'Yıldızdan kaldır' : 'Favorilere ekle'}
                      >
                        <StarIcon
                          filled={isStarredVerb(verbKey)}
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${isStarredVerb(verbKey) ? 'text-yellow-500' : 'text-slate-400 dark:text-slate-500 hover:text-yellow-500'}`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => speakConjugation(verbKey, selectedLanguage)}
                        className="p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-200/80 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        title="Telaffuzu dinle"
                        aria-label="Telaffuzu dinle"
                      >
                        <SpeakerIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                    <span className="flex-1 min-w-0 text-center text-sm sm:text-base italic text-slate-500 dark:text-slate-400 truncate px-1">
                      {displayMeaning}
                    </span>
                    <div
                      className="flex items-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/60 p-0.5 shrink-0 print:hidden"
                      role="tablist"
                      aria-label="Görünüm modu"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={false}
                        onClick={() => setViewMode('simple')}
                        className="px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Basit
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={true}
                        onClick={() => setViewMode('detailed')}
                        className="px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                      >
                        Detaylı
                      </button>
                    </div>
                  </div>
                  {/* Satır 2: zaman (sol panel açılır) · Ezber · Sete · Yazdır */}
                  <div className="flex flex-wrap items-center gap-2 print:hidden pt-2 border-t border-slate-200/70 dark:border-slate-600/60">
                    <div className="inline-flex items-center gap-1.5 flex-wrap max-w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setLeftPanelOpen(true);
                          setTenseDropdownOpen(true);
                          requestAnimationFrame(() => {
                            const el = document.getElementById('tense-trigger');
                            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            el?.focus();
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/90 px-2.5 py-1.5 text-[12px] font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 max-w-[min(100%,18rem)]"
                        title="Zaman seç (sol panel)"
                        aria-label={`Zaman: ${tenseLabel}. Seçmek için tıkla.`}
                      >
                        <span className="truncate">{tenseLabel}</span>
                        <span className="text-slate-400 dark:text-slate-500 text-[10px] leading-none shrink-0" aria-hidden>
                          ▾
                        </span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveRecallMode((on) => !on)}
                      className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-[0.98] ${
                        activeRecallMode
                          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-600 bg-transparent text-slate-600 dark:text-slate-400 hover:bg-indigo-500/15 hover:border-indigo-400 dark:hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200'
                      }`}
                      title={activeRecallMode ? 'Ezber modunu kapat' : 'Ezber modu: çekimleri gizle, üzerine gelince aç'}
                      aria-pressed={activeRecallMode}
                      aria-label={activeRecallMode ? 'Ezber modu açık' : 'Ezber modu kapalı'}
                    >
                      <EyeIcon open={!activeRecallMode} className="w-3.5 h-3.5 shrink-0" />
                      <span>Ezber Modu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="p-1.5 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-800 hover:text-white dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      title="Yazdır"
                      aria-label="Yazdır"
                    >
                      <span aria-hidden>🖨️</span>
                    </button>
                    <div className="relative shrink-0" ref={addToSetRef}>
                      <button
                        type="button"
                        onClick={() => setAddToSetOpen((o) => !o)}
                        className="p-1.5 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-indigo-500/35 bg-indigo-600/15 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        title="Sete Ekle"
                        aria-label="Sete Ekle"
                        aria-expanded={addToSetOpen}
                      >
                        <span aria-hidden>➕</span>
                      </button>
                      {addToSetOpen && (
                        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 min-w-[12rem] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl py-2 z-50 max-h-64 overflow-y-auto">
                          {(() => {
                            const decks: FlashcardDeck[] = typeof window !== 'undefined' ? getFlashcardDecks() : [];
                            const mockDecks =
                              decks.length === 0
                                ? ([
                                    { id: 'mock-1', title: 'Seyahat Kelimeleri', cards: [] },
                                    { id: 'mock-2', title: 'Zor Fiiller', cards: [] },
                                  ] as { id: string; title: string; cards: unknown[] }[])
                                : decks;
                            if (mockDecks.length === 0) {
                              return <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Henüz set yok.</p>;
                            }
                            return (
                              <>
                                {mockDecks.map((deck) => (
                                  <button
                                    key={deck.id}
                                    type="button"
                                    onClick={() => handleAddVerbToSet(deck.id, deck.title, verbKey, selectedLanguage)}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-500/15 dark:hover:bg-indigo-500/20 transition-colors"
                                  >
                                    {deck.title}
                                  </button>
                                ))}
                                {decks.length === 0 && (
                                  <Link
                                    to="/ezber-makinesi"
                                    className="block px-4 py-2.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                                    onClick={() => setAddToSetOpen(false)}
                                  >
                                    Ezber Makinesi&apos;nde set oluştur →
                                  </Link>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between gap-1.5 md:gap-x-3 md:gap-y-2 text-center sm:text-left">
                  <div className="flex items-center gap-2 min-w-0 order-1">
                    <h2 className="font-bold text-slate-800 dark:text-slate-100 capitalize text-xl tracking-tight">{verbKey}</h2>
                    {randomVerbMode && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2.5 py-0.5 shrink-0" title="Rastgele mod açık">
                        <Shuffle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        Rastgele Mod Aktif
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleStar(verbKey)}
                      className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors shrink-0"
                      title={isStarredVerb(verbKey) ? 'Yıldızdan kaldır' : 'Yıldızla'}
                      aria-label={isStarredVerb(verbKey) ? 'Yıldızdan kaldır' : 'Favorilere ekle'}
                    >
                      <StarIcon filled={isStarredVerb(verbKey)} className={`w-5 h-5 ${isStarredVerb(verbKey) ? 'text-yellow-500' : 'text-slate-400 dark:text-slate-500 hover:text-yellow-500'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => speakConjugation(verbKey, selectedLanguage)}
                      className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-200/80 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      title="Telaffuzu dinle"
                      aria-label="Telaffuzu dinle"
                    >
                      <SpeakerIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 italic text-lg flex-1 min-w-0 order-2 flex justify-center items-center gap-2">
                    <span className="italic text-slate-600 dark:text-slate-300">{displayMeaning}</span>
                  </span>
                  <div className="order-3 flex items-center gap-2 shrink-0 print:hidden ml-auto">
                    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/60 p-0.5" role="tablist" aria-label="Görünüm modu">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={true}
                        onClick={() => setViewMode('simple')}
                        className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                      >
                        Basit
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={false}
                        onClick={() => setViewMode('detailed')}
                        className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Detaylı
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {(() => {
                const meta = getVerbMetadata(verbKey, selectedLanguage, !isIrregularVerb(verbKey, selectedLanguage));
                if (viewMode === 'detailed') {
                  return (
                    <p className="text-[11px] leading-snug text-slate-400 dark:text-slate-500 border-t border-slate-200/80 dark:border-slate-600/80 pt-2 mt-2 truncate" title={`Mastar: ${meta.infinitive} · Ulaç: ${meta.gerund} · Geçmiş Ortaç: ${meta.pastParticiple}`}>
                      Mastar:{' '}
                      <span className="text-slate-500 dark:text-slate-400">{meta.infinitive}</span>
                      {' · '}
                      Ulaç: <span className="text-slate-500 dark:text-slate-400">{meta.gerund}</span>
                      {' · '}
                      Geçmiş Ortaç:{' '}
                      <span className="text-slate-500 dark:text-slate-400">{meta.pastParticiple}</span>
                      {selectedLanguage === 'fr' && (
                        <>
                          {' · '}
                          Yardımcı: <span className="text-slate-500 dark:text-slate-400">{meta.auxiliary}</span>
                        </>
                      )}
                      {' · '}
                      <span
                        className={
                          meta.isRegular
                            ? 'text-emerald-600/85 dark:text-emerald-400/90'
                            : 'text-amber-700/85 dark:text-amber-400/90'
                        }
                      >
                        {meta.isRegular ? 'Kurallı' : 'Düzensiz'}
                      </span>
                    </p>
                  );
                }
                return (
                  <p className="text-[11px] leading-snug text-slate-400 dark:text-slate-500 border-t border-slate-200/80 dark:border-slate-600/80 pt-2 mt-2">
                    Geçmiş Ortaç:{' '}
                    <span className="text-slate-500 dark:text-slate-400">{meta.pastParticiple}</span>
                    {' · '}
                    <span
                      className={
                        meta.isRegular
                          ? 'text-emerald-600/85 dark:text-emerald-400/90'
                          : 'text-amber-700/85 dark:text-amber-400/90'
                      }
                    >
                      {meta.isRegular ? 'Kurallı' : 'Düzensiz'}
                    </span>
                  </p>
                );
              })()}
              {regimeInfo && (
                <div className="mt-3 border-t border-slate-200/80 dark:border-slate-600/80 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegimeOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    aria-expanded={regimeOpen}
                    aria-controls="verb-regime-panel"
                  >
                    <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-200">
                      KULLANIM KALIPLARI
                    </span>
                    <span className={`text-slate-400 transition-transform ${regimeOpen ? 'rotate-180' : ''}`} aria-hidden>
                      ▾
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {regimeOpen && (
                      <motion.div
                        id="verb-regime-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden px-2 pb-1"
                      >
                        <div className="space-y-2 pt-2 text-sm">
                          <p className="text-slate-700 dark:text-slate-200">
                            <span className="font-semibold">{verbKey}</span> +{' '}
                            <span className="inline-flex items-center rounded-full border border-orange-500/35 bg-orange-500/15 px-2 py-0.5 text-[11px] font-bold uppercase text-orange-700 dark:text-orange-300">
                              {regimeInfo.preposition}
                            </span>{' '}
                            <span className="text-slate-600 dark:text-slate-300">→ {regimeInfo.pattern}</span>
                          </p>
                          <p className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm">
                            ⚠️ {regimeInfo.turkish_note}
                          </p>
                          <ul className="space-y-1">
                            {regimeInfo.examples.map((ex, i) => (
                              <li key={`${ex.es}-${i}`} className="text-slate-700 dark:text-slate-200">
                                • {ex.es}{' '}
                                <span className="text-slate-500 dark:text-slate-400">→ {ex.tr}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
                            ✗ Yaygın hata: &quot;{regimeInfo.common_mistakes}&quot;
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {selectedLanguage === 'es' && verbKey && (collocations[verbKey] || collocations[
                verbKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              ]) && (
                <div className="mt-3 border-t border-slate-200/80 dark:border-slate-600/80 pt-2">
                  <button
                    type="button"
                    onClick={() => setCollocationOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    aria-expanded={collocationOpen}
                    aria-controls="verb-collocations-panel"
                  >
                    <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-200">
                      YAYGIN KALIPLAR
                    </span>
                    <span className={`text-slate-400 transition-transform ${collocationOpen ? 'rotate-180' : ''}`} aria-hidden>
                      ▾
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {collocationOpen && (
                      <motion.div
                        id="verb-collocations-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden px-2 pb-1"
                      >
                        <div className="flex items-center gap-1.5 pt-2 pb-2">
                          {(['A1', 'A2', 'B1'] as const).map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setCollocationLevelFilter(lvl)}
                              className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                                collocationLevelFilter === lvl
                                  ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                        {collocationItems.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 pb-2">Bu seviye için kalıp bulunamadı.</p>
                        ) : (
                          <ul className="space-y-1.5 pb-1">
                            {collocationItems.map((item, i) => {
                              const key = `${item.full}-${i}`;
                              const tipOpen = activeCollocationTip === key;
                              const exEs = `Normalmente ${item.full} en situaciones reales.`;
                              const exTr = `Genelde "${item.tr}" ifadesini gerçek durumlarda kullanırım.`;
                              return (
                                <li key={key} className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setActiveCollocationTip((k) => (k === key ? null : key))}
                                    className="w-full text-left rounded-lg border border-slate-200/80 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/40 px-2.5 py-2 hover:border-indigo-400/50 dark:hover:border-indigo-500/40 transition-colors"
                                  >
                                    <span className="text-sm text-slate-800 dark:text-slate-100 font-medium">{item.full}</span>
                                    <span className="text-slate-500 dark:text-slate-400">  →  {item.tr}</span>
                                    <span className="ml-2 inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                      {item.level}
                                    </span>
                                  </button>
                                  {tipOpen && (
                                    <div className="mt-1 rounded-lg border border-indigo-400/25 dark:border-indigo-400/30 bg-indigo-50/70 dark:bg-indigo-500/10 px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200">
                                      <p>• {exEs}</p>
                                      <p className="text-slate-500 dark:text-slate-400">→ {exTr}</p>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {regionalInfo && (
                <div className="mt-3 border-t border-slate-200/80 dark:border-slate-600/80 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegionalOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    aria-expanded={regionalOpen}
                    aria-controls="regional-variants-panel"
                  >
                    <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-200">
                      BÖLGESEL FARKLAR
                    </span>
                    <span className={`text-slate-400 transition-transform ${regionalOpen ? 'rotate-180' : ''}`} aria-hidden>
                      ▾
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {regionalOpen && (
                      <motion.div
                        id="regional-variants-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden px-2 pb-1"
                      >
                        <div className="pt-2 space-y-2">
                          {regionalInfo.level === 'critical' ? (
                            <div className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-800 dark:text-rose-200 font-medium">
                              ⚠️ {regionalInfo.warning ?? 'Kritik bölgesel kullanım farkı var.'}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-blue-500/35 bg-blue-500/15 px-3 py-2 text-sm text-blue-800 dark:text-blue-200">
                              Bölgesel kullanım notu: İspanya ve Latin Amerika kullanımını karşılaştır.
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="rounded-lg border border-slate-200/80 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/40 px-3 py-2">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">🇪🇸 İspanya</p>
                              <p className="text-sm text-slate-800 dark:text-slate-100">
                                <span className="font-medium">Kullanım:</span> {regionalInfo.spain.usage}
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-200">{regionalInfo.spain.meaning}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">{regionalInfo.spain.example}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200/80 dark:border-slate-700/70 bg-white/70 dark:bg-slate-800/40 px-3 py-2">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">🌎 Latin Amerika</p>
                              <p className="text-sm text-slate-800 dark:text-slate-100">
                                <span className="font-medium">Kullanım:</span> {regionalInfo.latam.usage}
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-200">{regionalInfo.latam.meaning}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">{regionalInfo.latam.example}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {/*
                Alternatif formlar: Dönüşlü / Olumsuz — sadece Detaylı modda.
                Çekim tablosunun yapısını bozmamak için yükseklik (height)
                Framer Motion ile animate edilir.
              */}
              <AnimatePresence initial={false}>
                {viewMode === 'detailed' && (
                  <motion.div
                    key="alt-forms-row"
                    initial={{ height: 0, opacity: 0, marginTop: 0, paddingTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: 6, paddingTop: 6 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0, paddingTop: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden border-t border-slate-200/80 dark:border-slate-600/80 print:hidden"
                  >
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-500 shrink-0 select-none">
                        Alternatif:
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsReflexive((v) => !v)}
                        className={`cursor-pointer inline-flex items-center rounded-md border-2 px-2.5 py-1.5 text-[12px] font-semibold transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500/45 ${
                          isReflexive
                            ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500 shadow-sm'
                            : 'border-slate-300 dark:border-slate-600 bg-transparent text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:border-indigo-400'
                        }`}
                        aria-pressed={isReflexive}
                        aria-label={isReflexive ? 'Dönüşlü açık' : 'Dönüşlü kapalı'}
                        title={selectedLanguage === 'fr' ? 'Örn: se laver' : 'Örn: lavarse'}
                      >
                        Dönüşlü
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNegative((v) => !v)}
                        className={`cursor-pointer inline-flex items-center rounded-md border-2 px-2.5 py-1.5 text-[12px] font-semibold transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500/45 ${
                          isNegative
                            ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500 shadow-sm'
                            : 'border-slate-300 dark:border-slate-600 bg-transparent text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:border-indigo-400'
                        }`}
                        aria-pressed={isNegative}
                        aria-label={isNegative ? 'Olumsuz açık' : 'Olumsuz kapalı'}
                        title={selectedLanguage === 'fr' ? 'ne … pas' : 'no …'}
                      >
                        Olumsuz
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="mx-4 sm:mx-0 mb-4 print:hidden">
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-600/80 bg-white/60 dark:bg-slate-800/40 px-4 py-3">
                {learningVerbMasteryStats ? (
                  <>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                      Bu fiilin çekimlerini ne kadar biliyorsun?
                    </p>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${learningVerbMasteryStats.pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                        %{learningVerbMasteryStats.pct}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mb-3">
                      {learningVerbMasteryStats.learned}/{learningVerbMasteryStats.total} çekim öğrenildi
                    </p>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setLearningCardModeOpen((v) => !v)}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${
                    learningVerbMasteryStats ? 'mt-3' : ''
                  } ${
                    learningCardModeOpen
                      ? 'border-2 border-violet-400 bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-600 text-white shadow-violet-500/35 ring-violet-400/80 dark:from-violet-500 dark:via-violet-400 dark:to-indigo-500'
                      : 'border border-violet-400/40 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white hover:brightness-110 hover:shadow-xl hover:shadow-violet-500/30 active:scale-[0.99] dark:from-violet-600 dark:via-violet-500 dark:to-indigo-600'
                  }`}
                >
                  {learningCardModeOpen ? 'Çekim tablosuna dön' : '🃏 Kart Modunda Çalış'}
                </button>
              </div>
            </div>

            {learningCardModeOpen ? (
              <LearningCardDeck
                verbKey={verbKey ?? ''}
                tenseLabel={tenseLabel}
                tenseId={selectedTense}
                pronouns={pronounsForLang}
                conjugations={conjugationsForDisplay}
                lang={selectedLanguage}
                verbMeaningTr={displayMeaning}
                addXP={addXP}
                onGoQuiz={() => {
                  setLearningCardModeOpen(false);
                  setMode('quiz');
                }}
                onFinishSession={() => setMasteryUiTick((n) => n + 1)}
              />
            ) : (
            <>
            {(viewMode === 'detailed' || viewMode === 'simple') && showAllTenses ? (
              /* Tüm zamanlar — kip (mood) gruplarına göre başlık + kartlar; smooth açılış */
              <motion.div
                ref={allTensesSectionRef}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="mt-4 space-y-10"
              >
                {tenseGroupsForLang.map((group) => {
                  const moodTitle = selectedLanguage === 'fr'
                    ? (group.mood === 'indicatif' ? 'INDICATIF (Haber)' : group.mood === 'subjonctif' ? 'SUBJONCTIF (Dilek-Şart)' : group.mood === 'conditionnel' ? 'CONDITIONNEL (Koşul)' : group.mood === 'imperatif' ? 'IMPÉRATIF (Emir)' : group.label)
                    : (group.mood === 'indicativo' ? 'INDICATIVO (Haber)' : group.mood === 'subjonctif' ? 'SUBJUNTIVO (Dilek-Şart)' : group.mood === 'imperativo' ? 'IMPERATIVO (Emir)' : group.mood === 'condicional' ? 'CONDICIONAL (Koşul)' : group.label);
                  return (
                    <section key={group.mood}>
                      <h3 className="text-xl font-bold tracking-widest text-slate-400 dark:text-slate-500 text-center my-8">
                        {moodTitle}
                      </h3>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                        {group.tenseIds.map((tenseId, index) => {
                          const tenseDef = tensesForLang.find((x) => x.id === tenseId);
                          if (!tenseDef) return null;
                          const map = getSafeConjugationMap(verbKey, tenseDef.id, selectedLanguage);
                          if (!map || Object.keys(map).length === 0) return null;
                          return (
                            <motion.div
                              key={tenseDef.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.03 }}
                              className="rounded-xl bg-slate-800/40 dark:bg-slate-800/60 border border-slate-700/50 dark:border-slate-600/50 overflow-hidden backdrop-blur-sm transition-all duration-200 hover:border-slate-600 dark:hover:border-indigo-500/30"
                            >
                              <div className="px-4 py-2.5 border-b border-slate-700/50 dark:border-slate-600/50 bg-slate-700/30 dark:bg-slate-700/40 flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-200 dark:text-slate-100 min-w-0 truncate">{tenseDef.label}</h4>
                              </div>
                              <ul className="divide-y divide-slate-700/50 dark:divide-slate-600/50">
                                {pronounsForLang.map(({ id, label }) => {
                                  const rawVal = map[id] ?? '';
                                  const missing = isConjugationValueMissing(rawVal) || rawVal === '—';
                                  const displayVal = missing ? '' : formatConjugationForDisplay(rawVal, id, selectedLanguage, isReflexive, isNegative);
                                  const fullPhrase = missing ? '' : `${label} ${rawVal}`.trim();
                                  const rowKey = `${tenseDef.id}-${id}`;
                                  const justCopied = copiedRowKey === rowKey;
                                  return (
                                  <li key={id} className="group flex items-center justify-between gap-3 px-4 py-2 text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 w-16">{label}</span>
                                    <div className="flex items-center gap-3 text-right min-w-0">
                                      {missing ? (
                                        <span className="text-amber-600 dark:text-amber-400 italic text-sm">{t('verbLab.dataMissing')}</span>
                                      ) : (
                                        <span className="text-slate-200 dark:text-slate-100 truncate">
                                          <ConjugationWithStemSuffix text={displayVal} tenseId={tenseDef.id} lang={selectedLanguage} />
                                        </span>
                                      )}
                                      {fullPhrase && (
                                        <span className="inline-flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 shrink-0 print:opacity-0 print:!hidden">
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              try {
                                                await navigator.clipboard.writeText(fullPhrase);
                                                setCopiedRowKey(rowKey);
                                                setTimeout(() => setCopiedRowKey(null), 1500);
                                              } catch {
                                                setCopiedRowKey(null);
                                              }
                                            }}
                                            className="p-1.5 rounded-full bg-slate-800/40 text-slate-400 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors"
                                            title="Kopyala"
                                            aria-label={justCopied ? 'Kopyalandı' : 'Kopyala'}
                                          >
                                            {justCopied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardIcon className="w-3.5 h-3.5" />}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => speakConjugation(fullPhrase, selectedLanguage)}
                                            className="p-1.5 rounded-full bg-slate-800/40 text-slate-400 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors"
                                            title="Dinle"
                                            aria-label={`${fullPhrase} dinle`}
                                          >
                                            <SpeakerIcon className="w-3.5 h-3.5" />
                                          </button>
                                        </span>
                                      )}
                                    </div>
                                  </li>
                                  );
                                })}
                              </ul>
                            </motion.div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </motion.div>
            ) : (
            <>
            {/* İki sütun: tekil (Je, Tu, Il) | çoğul (Nous, Vous, Ils) — dikey alan yarıya iner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {[pronounsForLang.slice(0, 3), pronounsForLang.slice(3, 6)].map((group, colIndex) => (
                <ul key={colIndex} className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {group.map(({ id, label }) => {
                    const homophoneInfo = selectedLanguage === 'fr' ? getHomophoneInfo(id) : null;
                    const displayText = formatConjugationForDisplay(conjugationsForDisplay[id], id, selectedLanguage, isReflexive, isNegative);
                    const fullPhrase = `${label} ${conjugationsForDisplay[id]}`.trim();
                    const justCopied = copiedRowKey === id;
                    return (
                      <li
                        key={id}
                        className={`group grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 sm:gap-4 px-4 sm:px-6 py-2.5 sm:py-3 transition-all duration-300 ease-in-out ${activeRecallMode ? 'cursor-default' : ''} ${homophoneInfo ? 'border-l-2 border-l-amber-400/50 dark:border-l-amber-500/40 pl-4 sm:pl-5' : ''}`}
                        title={homophoneInfo ? `Bu ${homophoneInfo.count} çekimin yazılışı farklı olsa da okunuşu aynıdır: [${homophoneInfo.key}]` : undefined}
                      >
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">{label}</span>
                        <span
                          className={`min-w-0 truncate text-right transition-all duration-300 ease-in-out ${activeRecallMode ? 'blur-md group-hover:blur-none' : ''}`}
                        >
                          <ConjugationWithStemSuffix
                            text={displayText}
                            tenseId={selectedTense}
                            lang={selectedLanguage}
                          />
                        </span>
                        <span className="inline-flex items-center justify-end gap-1 w-[68px] shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 ease-in-out print:opacity-0 print:!hidden">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(fullPhrase);
                                  setCopiedRowKey(id);
                                  setTimeout(() => setCopiedRowKey(null), 1500);
                                } catch {
                                  setCopiedRowKey(null);
                                }
                              }}
                              className="p-1.5 rounded-full bg-slate-800/40 text-slate-400 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors duration-200"
                              title="Panoya kopyala"
                              aria-label={justCopied ? 'Kopyalandı' : 'Kopyala'}
                            >
                              {justCopied ? <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <ClipboardIcon className="w-4 h-4" />}
                            </button>
                            <PronunciationButton
                              word={fullPhrase}
                              lang={selectedLanguage === 'fr' ? 'fr-FR' : 'es-ES'}
                              size="sm"
                            />
                          </span>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>

            {staticExample?.tr &&
              (selectedLanguage === 'fr' ? staticExample?.fr?.trim() : staticExample?.es?.trim()) && (
              <motion.div
                key={`static-example-${verbKey}-${selectedTense}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative mx-4 sm:mx-0 mt-4 rounded-xl border border-emerald-500/20 dark:border-emerald-400/20 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] p-4"
              >
                <div className="absolute right-3 top-3 inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      speakStaticExample(
                        (selectedLanguage === 'fr' ? staticExample.fr : staticExample.es) ?? ''
                      )
                    }
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    aria-label={staticExampleSpeaking ? 'Seslendirmeyi durdur' : 'Cumleyi seslendir'}
                    title={staticExampleSpeaking ? 'Durdur' : 'Seslendir'}
                  >
                    {staticExampleSpeaking ? '■' : '🔊'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      copyStaticExample((selectedLanguage === 'fr' ? staticExample.fr : staticExample.es) ?? '')
                    }
                    className="h-7 inline-flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    aria-label={staticExampleCopied ? 'Kopyalandi' : 'Cumleyi kopyala'}
                    title={staticExampleCopied ? 'Kopyalandi' : 'Kopyala'}
                  >
                    {staticExampleCopied ? '✓ Kopyalandı' : '📋'}
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm" aria-hidden>📌</span>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                    Varsayılan Örnek
                  </h4>
                </div>
                <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 italic">
                  {(() => {
                    const sentence =
                      (selectedLanguage === 'fr' ? staticExample.fr : staticExample.es) ?? '';
                    const verb = (verbKey ?? '').trim();
                    if (!verb) return sentence;
                    const escaped = verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b(${escaped})\\b`, 'i');
                    const m = sentence.match(regex);
                    if (!m || typeof m.index !== 'number') return sentence;
                    const start = m.index;
                    const end = start + m[0].length;
                    return (
                      <>
                        {sentence.slice(0, start)}
                        <strong className="font-bold text-emerald-800 dark:text-emerald-200">
                          {sentence.slice(start, end)}
                        </strong>
                        {sentence.slice(end)}
                      </>
                    );
                  })()}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {staticExample.tr}
                </p>
              </motion.div>
            )}

            {/*
              Detaylı-moda-özel alt bölümler (Örnek cümle, Fiil Aileleri).
              AnimatePresence + height animasyonu ile mod geçişinde ani
              boşalma/doluşma olmadan yumuşakça fade in/out yapar.
            */}
            <AnimatePresence initial={false}>
              {viewMode === 'detailed' && (() => {
                const example = getVerbExample(selectedLanguage, verbKey);
                if (!example) return null;
                return (
                  <motion.div
                    key="verb-example-card"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mx-4 sm:mx-0 rounded-xl bg-indigo-900/20 dark:bg-indigo-900/30 border border-indigo-500/30 dark:border-indigo-400/40 p-4 flex items-start gap-3 backdrop-blur-sm">
                      <span className="text-xl shrink-0" aria-hidden>💡</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg italic text-slate-800 dark:text-indigo-100 flex items-center gap-2 flex-wrap">
                          {example.sentence}
                          <PronunciationButton
                            word={example.sentence}
                            lang={selectedLanguage === 'fr' ? 'fr-FR' : 'es-ES'}
                            size="sm"
                          />
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-indigo-300/90">
                          {example.translation}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
              {viewMode === 'detailed' && verbFamily.length > 0 && (
                <motion.section
                  key="verb-family-card"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="mx-4 sm:mx-0 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-800/40 backdrop-blur-sm px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5" aria-hidden>💡</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                          Bu fiili biliyorsan, bunları da çözdün!
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                          Aynı çekim kuralına sahip fiiller — tıklayarak hızlıca geçiş yap.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {verbFamily.slice(0, 12).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => loadVerb(v)}
                              className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/80 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:text-indigo-700 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors duration-200 capitalize"
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {selectedLanguage === 'es' && showSynonymSection && (
              <section className="mx-4 sm:mx-0 mt-5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-slate-300/80 dark:bg-slate-700/80" />
                  <h3 className="text-[11px] sm:text-xs font-bold tracking-[0.18em] text-slate-600 dark:text-slate-300 text-center">
                    EŞ ANLAMLILAR &amp; YAKIN ANLAMLILAR
                  </h3>
                  <div className="h-px flex-1 bg-slate-300/80 dark:bg-slate-700/80" />
                </div>

                {synonymLoading && (
                  <div className="space-y-2 animate-pulse">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Eş anlamlılar yükleniyor...</p>
                    <div className="h-14 rounded-xl bg-slate-200/70 dark:bg-slate-700/40" />
                    <div className="h-14 rounded-xl bg-slate-200/70 dark:bg-slate-700/40" />
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {!synonymLoading && synonymData && (
                    <motion.div
                      key={`synonyms-${verbKey}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="space-y-4"
                    >
                      {synonymData.synonyms.length > 0 && (
                        <div className="flex flex-col gap-2.5">
                          {synonymData.synonyms.map((item) => (
                            <button
                              key={`syn-${item.verb}`}
                              type="button"
                              onClick={() => {
                                setVerbInput(item.verb);
                                loadVerb(item.verb);
                              }}
                              className="w-full text-left rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/80 dark:bg-slate-800/45 px-3 py-3 hover:border-indigo-400/60 dark:hover:border-indigo-400/50 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 transition-colors"
                            >
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  [{item.verb}]
                                </span>
                                <span className="text-slate-700 dark:text-slate-200">{item.turkish}</span>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${SYNONYM_REGISTER_STYLES[item.register]}`}
                                >
                                  {item.register}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {item.difference ? `"${item.difference}"` : ''}
                              </p>
                              {item.example && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 italic">
                                  {item.example}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {synonymData.antonyms.length > 0 && (
                        <div className="pt-1">
                          <h4 className="text-[11px] font-bold tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-2">
                            ZIT ANLAMLILAR
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {synonymData.antonyms.map((item) => (
                              <button
                                key={`ant-${item.verb}`}
                                type="button"
                                onClick={() => {
                                  setVerbInput(item.verb);
                                  loadVerb(item.verb);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/60 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                              >
                                <span className="font-semibold">[{item.verb}]</span>
                                <span>{item.turkish}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {synonymData.note && (
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Not: {synonymData.note}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}
            </>
            )}
</>
)}

            {/* Tüm Zamanları Göster / Daralt — her iki durumda da görünür; açıkken sticky float */}
            {verbKey && conjugations && !learningCardModeOpen && (
              <div
                className={`mt-4 mx-4 sm:mx-0 pb-2 ${
                  showAllTenses
                    ? 'sticky bottom-4 z-20'
                    : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowAllTenses((v) => !v)}
                  className={`group w-full sm:w-auto sm:min-w-[280px] sm:mx-auto sm:block rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-[0.98] ${
                    showAllTenses
                      ? 'border-indigo-400/60 dark:border-indigo-400/50 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md text-indigo-700 dark:text-indigo-300 shadow-lg shadow-indigo-500/10 dark:shadow-black/40 hover:bg-white/95 dark:hover:bg-slate-900/90 hover:border-indigo-500 dark:hover:border-indigo-400'
                      : 'border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-indigo-400/60 dark:hover:border-indigo-400/50 hover:text-indigo-600 dark:hover:text-indigo-300'
                  }`}
                  aria-pressed={showAllTenses}
                  aria-label={showAllTenses ? 'Daralt, sadece seçili zamanı göster' : t('tum_zamanlari_goster')}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <span
                      className="inline-block transition-transform duration-300"
                      style={{ transform: showAllTenses ? 'rotate(0deg)' : 'rotate(180deg)' }}
                      aria-hidden
                    >
                      ▲
                    </span>
                    {showAllTenses ? 'Daralt (Sadece Seçili Zamanı Göster)' : t('tum_zamanlari_goster')}
                  </span>
                </button>
              </div>
            )}
            </div>
          </div>
        )}

            {/* Quiz modu (Alıştırma) — viewMode'dan bağımsız, mod seçimine göre render */}
            {verbKey && mode === 'quiz' && conjugationsForDisplay && (
            <div className="relative" data-quiz-practice-panel>
            {(() => {
              const total = qp.length;
              const correctN = qp.filter((p) => quizFeedback[p] === 'correct').length;
              const pct = total ? (correctN / total) * 100 : 0;
              const barGreen = correctN >= total;
              return (
                <div className="px-5 sm:px-6 pt-3 pb-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                      {correctN} / {total} çekim
                    </span>
                    {!mistakeReplaySession &&
                      (quizLayout === 'list' || (quizLayout === 'focus' && currentFocusIndex < qp.length)) && (
                      <div
                        key={quizHeartBump}
                        className={`flex items-center gap-0.5 ${quizHeartBump > 0 ? 'animate-heart-bounce' : ''}`}
                        aria-label={`${quizLives} can kaldı`}
                      >
                        {([0, 1, 2] as const).map((i) => {
                          const alive = i < quizLives;
                          const animLost = quizHeartLostAnimSlot === i;
                          return (
                            <span
                              key={i}
                              className={`text-sm leading-none inline-block origin-center ${
                                alive ? '' : animLost ? 'animate-heart-lost' : 'opacity-35 grayscale scale-90'
                              }`}
                              aria-hidden
                            >
                              {alive ? '❤️' : '💔'}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full overflow-hidden bg-slate-200/80 dark:bg-white/10"
                    role="progressbar"
                    aria-valuenow={correctN}
                    aria-valuemin={0}
                    aria-valuemax={total}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        barGreen
                          ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
            {(selectedLanguage === 'es' || selectedLanguage === 'fr') && showSpacedRepDueBanner && (
              <div className="mx-3 sm:mx-4 mb-2 rounded-lg border border-amber-400/55 bg-amber-500/15 dark:bg-amber-500/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                  ⏰ Bu fiili tekrar etme zamanı geldi!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (verbKey) spacedRepBannerDismissedRef.current = `${verbKey}|${selectedTense}`;
                    setShowSpacedRepDueBanner(false);
                  }}
                  className="text-xs font-semibold text-amber-800 dark:text-amber-200 hover:underline shrink-0"
                >
                  Kapat
                </button>
              </div>
            )}
            {mistakeReplaySession && (selectedLanguage === 'es' || selectedLanguage === 'fr') && (() => {
              const cur = mistakeReplaySession.queue[mistakeReplaySession.index];
              if (!cur) return null;
              return (
                <div className="absolute left-0 right-0 top-0 z-20 px-3 sm:px-4 pt-2 pointer-events-none">
                  <div className="pointer-events-auto rounded-md border border-red-400/35 dark:border-red-500/35 bg-red-500/[0.07] dark:bg-red-500/10 px-2.5 py-1 text-[11px] sm:text-xs text-red-900/90 dark:text-red-100/90 shadow-sm">
                    <span className="font-medium">⚠️ Bu soruda {cur.errorCount} kez hata.</span>{' '}
                    Geçen: <span className="lowercase">{cur.lastAnswer}</span>
                  </div>
                </div>
              );
            })()}
            <div
              className={`border-b border-slate-100/80 dark:border-white/5 px-5 sm:px-6 py-4 ${
                mistakeReplaySession && (selectedLanguage === 'es' || selectedLanguage === 'fr') ? 'pt-12 sm:pt-14' : ''
              }`}
            >
              <div className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 text-center sm:text-left">
                <div className="flex items-center gap-2 min-w-0 order-1">
                  {listenQuizHideVerbHeader ? (
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">🎧 Dinleme modu</span>
                  ) : (
                    <>
                      <h2 className="font-bold text-slate-800 dark:text-slate-100 capitalize text-xl tracking-tight">{verbKey}</h2>
                      {randomVerbMode && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2.5 py-0.5 shrink-0" title="Rastgele mod açık">
                          <Shuffle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} aria-hidden />
                          Rastgele Mod Aktif
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleStar(verbKey)}
                        className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors duration-300 shrink-0"
                        title={isStarredVerb(verbKey) ? 'Yıldızdan kaldır' : 'Yıldızla'}
                        aria-label={isStarredVerb(verbKey) ? 'Yıldızdan kaldır' : 'Favorilere ekle'}
                      >
                        <StarIcon filled={isStarredVerb(verbKey)} className={`w-5 h-5 ${isStarredVerb(verbKey) ? 'text-yellow-500' : 'text-slate-400 dark:text-slate-500 hover:text-yellow-500'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => speakConjugation(verbKey, selectedLanguage)}
                        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-200/80 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        title="Telaffuzu dinle"
                        aria-label="Telaffuzu dinle"
                      >
                        <SpeakerIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
                <span
                  className={`text-slate-500 dark:text-slate-400 italic text-lg flex-1 min-w-0 order-2 flex justify-center items-center gap-2 ${listenQuizHideVerbHeader ? 'opacity-0 pointer-events-none max-h-0 overflow-hidden' : ''}`}
                >
                  <span className="italic text-slate-600 dark:text-slate-300">{displayMeaning}</span>
                </span>
                <div className="flex items-center gap-1 order-3 shrink-0">
                  {/*
                    Görünüm modu ikonları — büyük pill butonların yerine
                    minimalist 'ghost' ikon butonlar. Aktif seçim ince
                    indigo arka plan ile belli olur; pasif durumda sadece
                    hover'da hafif arka plan belirir.
                  */}
                  <button
                    type="button"
                    onClick={() => setExerciseMode('focus')}
                    aria-pressed={quizLayout === 'focus'}
                    title="Tekli soru modu"
                    aria-label="Tekli soru modu"
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      quizLayout === 'focus'
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                        : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className="leading-none text-base" aria-hidden>☰</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExerciseMode('list')}
                    aria-pressed={quizLayout === 'list'}
                    title="Liste görünümü"
                    aria-label="Liste görünümü"
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                      quizLayout === 'list'
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                        : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className="leading-none text-sm tracking-[-0.15em]" aria-hidden>☰☰</span>
                  </button>
                  {(selectedLanguage === 'es' || selectedLanguage === 'fr') && (
                    <button
                      type="button"
                      onClick={() => setTenseCardOverlay({ kind: 'grid', highlightId: selectedTense })}
                      title="Zaman Kartları — tüm zamanların referansı"
                      aria-label="Zaman Kartları"
                      className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-300"
                    >
                      <BookOpen className="w-4 h-4" strokeWidth={2} aria-hidden />
                    </button>
                  )}
                  <div ref={quizTenseMenuRef} className="relative shrink-0 ml-1">
                  <button
                    type="button"
                    onClick={() => setQuizTenseMenuOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={quizTenseMenuOpen}
                    title="Başka bir zamana geç"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 px-2.5 py-1 rounded-lg shadow-sm hover:border-indigo-400 dark:hover:border-indigo-400/60 hover:text-indigo-600 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors"
                  >
                    <span className="truncate max-w-[11rem]">{tenseLabel}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${quizTenseMenuOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.24 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {quizTenseMenuOpen && (
                      <motion.div
                        key="quiz-tense-menu"
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        role="listbox"
                        aria-label="Zaman seç"
                        className="absolute right-0 mt-2 z-30 w-72 max-h-80 overflow-y-auto rounded-xl shadow-2xl backdrop-blur-md bg-white/90 dark:bg-slate-900/85 border border-slate-200/70 dark:border-white/20 p-1"
                      >
                        {tenseGroupsForLang.map((group) => (
                          <div key={group.mood} className="px-1 py-1">
                            <p className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              {group.label}
                            </p>
                            {group.tenseIds.map((tid) => {
                              const tItem = tensesForLang.find((t) => t.id === tid);
                              if (!tItem) return null;
                              const isActive = tItem.id === selectedTense;
                              return (
                                <button
                                  key={tItem.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isActive}
                                  onClick={() => changeQuizTense(tItem.id)}
                                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left rounded-lg text-sm transition-colors ${
                                    isActive
                                      ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 font-semibold'
                                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                                  }`}
                                >
                                  <span className="truncate">{tItem.label}</span>
                                  {isActive && (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" aria-hidden>
                                      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </div>
                  {!mistakeReplaySession && quizLayout === 'focus' && (
                    <div
                      className="flex items-center rounded-lg border border-slate-200/80 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 p-0.5 gap-0.5 ml-1 shrink-0"
                      role="group"
                      aria-label="Soru tipi"
                    >
                      <button
                        type="button"
                        title="Yaz — çekimi klavyeyle yaz"
                        aria-pressed={quizInteractionMode === 'write'}
                        onClick={() => setQuizInteractionModePersist('write')}
                        className={`w-8 h-8 rounded-md text-sm flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
                          quizInteractionMode === 'write'
                            ? 'bg-violet-500/20 text-violet-700 dark:text-violet-200'
                            : 'text-slate-500 hover:bg-white/60 dark:hover:bg-white/10'
                        }`}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        title="Çoktan seç — dört şıktan seç; tıklayınca kontrol"
                        aria-pressed={quizInteractionMode === 'choice'}
                        onClick={() => setQuizInteractionModePersist('choice')}
                        className={`w-8 h-8 rounded-md text-sm flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
                          quizInteractionMode === 'choice'
                            ? 'bg-violet-500/20 text-violet-700 dark:text-violet-200'
                            : 'text-slate-500 hover:bg-white/60 dark:hover:bg-white/10'
                        }`}
                      >
                        🎯
                      </button>
                      <button
                        type="button"
                        title="Karışık (yaz / çoktan seç)"
                        aria-pressed={quizInteractionMode === 'mixed'}
                        onClick={() => setQuizInteractionModePersist('mixed')}
                        className={`w-8 h-8 rounded-md text-sm flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
                          quizInteractionMode === 'mixed'
                            ? 'bg-violet-500/20 text-violet-700 dark:text-violet-200'
                            : 'text-slate-500 hover:bg-white/60 dark:hover:bg-white/10'
                        }`}
                      >
                        🔀
                      </button>
                      {selectedLanguage === 'es' && (
                        <>
                          <button
                            type="button"
                            title="Dinleme modu"
                            aria-pressed={quizInteractionMode === 'listen'}
                            onClick={() => setQuizInteractionModePersist('listen')}
                            className={`w-8 h-8 rounded-md text-sm flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
                              quizInteractionMode === 'listen'
                                ? 'bg-violet-500/20 text-violet-700 dark:text-violet-200'
                                : 'text-slate-500 hover:bg-white/60 dark:hover:bg-white/10'
                            }`}
                          >
                            🎧
                          </button>
                          <button
                            type="button"
                            title="Tersine çevir (zamir + zaman tahmin)"
                            aria-pressed={quizInteractionMode === 'reverse'}
                            onClick={() => setQuizInteractionModePersist('reverse')}
                            className={`w-8 h-8 rounded-md text-sm flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
                              quizInteractionMode === 'reverse'
                                ? 'bg-violet-500/20 text-violet-700 dark:text-violet-200'
                                : 'text-slate-500 hover:bg-white/60 dark:hover:bg-white/10'
                            }`}
                          >
                            🔄
                          </button>
                          <button
                            type="button"
                            title="Survival — tam ekran, süre ve can"
                            onClick={() => {
                              setLeftPanelOpen(false);
                              setSurvivalOpen(true);
                            }}
                            className="w-8 h-8 rounded-md text-sm flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-slate-500 hover:bg-white/60 dark:hover:bg-white/10"
                          >
                            ⚡
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {mode === 'quiz' &&
                quizLayout === 'focus' &&
                currentFocusIndex < qp.length &&
                verbKey &&
                conjugationsForDisplay &&
                (() => {
                  const pronoun = qp[currentFocusIndex];
                  const fb = quizFeedback[pronoun];
                  const typed = (userAnswers[pronoun] ?? '').trim();
                  const correctVal = conjugationsForDisplay[pronoun] ?? '';
                  const recallBannerKeyF =
                    selectedLanguage === 'es' || selectedLanguage === 'fr'
                      ? mistakeBannerDismissKey(selectedLanguage, verbKey, selectedTense, pronoun)
                      : '';
                  const memF =
                    (selectedLanguage === 'es' || selectedLanguage === 'fr') && verbKey
                      ? getSpanishMistake(verbKey, selectedTense, pronoun, selectedLanguage)
                      : null;
                  const showRecallF =
                    (selectedLanguage === 'es' || selectedLanguage === 'fr') &&
                    verbKey &&
                    memF &&
                    !memF.resolved &&
                    !mistakeBannerDismissedRef.current.has(recallBannerKeyF);
                  if (!showRecallF && !(fb === 'typo' && typed.length > 0)) return null;
                  return (
                    <div className="mt-1.5 space-y-1">
                      {showRecallF && memF && (
                        <SpanishMistakeRecallBanner
                          compact
                          mm={memF}
                          pronounLabel={pronounsForLang.find((p) => p.id === pronoun)?.label ?? pronoun}
                          tenseLabel={tensesForLang.find((t) => t.id === selectedTense)?.label ?? selectedTense}
                          onDismiss={() => {
                            mistakeBannerDismissedRef.current.add(recallBannerKeyF);
                            setMistakeBannerRev((n) => n + 1);
                          }}
                        />
                      )}
                      {fb === 'typo' && typed.length > 0 && (
                        <p className="rounded-md border border-amber-500/20 dark:border-amber-400/18 bg-amber-500/[0.07] dark:bg-amber-400/[0.09] px-2 py-1 text-[11px] sm:text-xs text-amber-900/85 dark:text-amber-100/90 truncate" role="status">
                          ⚠️ Geçen: <span className="lowercase">{typed}</span> → Doğrusu:{' '}
                          <strong className="font-semibold">{correctVal}</strong>
                        </p>
                      )}
                    </div>
                  );
                })()}
            </div>

            {/* Liste modu: tüm çekimler kontrol edildi ama hepsi doğru değil — özet + Tekrar Çalış */}
            {quizLayout === 'list' && conjugationsForDisplay && (() => {
              const allAnswered = qp.every((p) => quizFeedback[p] !== null);
              const allCorrect = qp.every((p) => quizFeedback[p] === 'correct');
              const correctCount = qp.filter((p) => quizFeedback[p] === 'correct').length;
              const wrongCount = qp.filter((p) => quizFeedback[p] === 'wrong').length;
              const typoCount = qp.filter((p) => quizFeedback[p] === 'typo').length;
              const toRedo = qp.filter((p) => quizFeedback[p] === 'wrong' || quizFeedback[p] === 'typo');
              if (!allAnswered || allCorrect) return null;
              return (
                <div className="mx-4 sm:mx-6 mb-6 rounded-xl border border-amber-200/80 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-900/20 p-5" role="region" aria-label="Alıştırma özeti">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-3">📋 Özet</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{correctCount} doğru</span>
                    {wrongCount > 0 && <>, <span className="text-red-600 dark:text-red-400 font-medium">{wrongCount} yanlış</span></>}
                    {typoCount > 0 && <>, <span className="text-amber-600 dark:text-amber-400 font-medium">{typoCount} neredeyse</span></>}
                  </p>
                  {toRedo.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Yanlış / neredeyse yapılanlar:</p>
                      <ul className="space-y-1.5 mb-4">
                        {toRedo.map((p) => {
                          const label = pronounsForLang.find((x) => x.id === p)?.label ?? p;
                          const correctVal = conjugationsForDisplay[p];
                          return (
                            <li key={p} className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                              <span className="font-medium shrink-0">{label}:</span>
                              <span className="text-red-600 dark:text-red-400 line-through">{userAnswers[p] || '—'}</span>
                              <span className="text-slate-500 dark:text-slate-400">→</span>
                              <span className="font-medium text-emerald-700 dark:text-emerald-300">{correctVal}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <button
                        type="button"
                        onClick={() => {
                          setQuizFeedback((prev) => ({
                            ...prev,
                            ...Object.fromEntries(toRedo.map((p) => [p, null])),
                          }));
                          setUserAnswers((prev) => ({
                            ...prev,
                            ...Object.fromEntries(toRedo.map((p) => [p, ''])),
                          }));
                          const firstIdx = qp.indexOf(toRedo[0]);
                          if (firstIdx !== -1) requestAnimationFrame(() => quizInputRefs.current[firstIdx]?.focus());
                        }}
                        className="rounded-xl bg-amber-600 dark:bg-amber-500 text-white font-semibold px-4 py-2.5 hover:bg-amber-700 dark:hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors"
                      >
                        Tekrar Çalış (sadece yanlışlar)
                      </button>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Odak modu: tur bitti (tüm şahıslar geçildi) */}
            {quizLayout === 'focus' && currentFocusIndex >= qp.length && (() => {
              const perfect = qp.every((p) => quizFeedback[p] === 'correct');
              const ok = qp.filter((p) => quizFeedback[p] === 'correct').length;
              const bad = qp.filter((p) => quizFeedback[p] === 'wrong').length;
              return (
                <div
                  className={`p-6 sm:p-8 text-center rounded-xl mx-4 mb-4 border ${
                    perfect
                      ? 'bg-gradient-to-br from-emerald-50 to-teal-50/80 dark:from-emerald-500/15 dark:to-teal-500/10 border-emerald-200/80 dark:border-emerald-400/30'
                      : 'bg-gradient-to-br from-amber-50 to-orange-50/70 dark:from-amber-900/20 dark:to-orange-900/15 border-amber-200/80 dark:border-amber-500/35'
                  }`}
                  role="alert"
                >
                  <p className={`font-bold text-2xl ${perfect ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-100'}`}>
                    {perfect ? '🎉 Tebrikler!' : 'Tur tamamlandı'}
                  </p>
                  {!perfect && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{ok} doğru</span>
                      {bad > 0 && (
                        <>
                          {' '}
                          · <span className="text-red-600 dark:text-red-400 font-semibold">{bad} yanlış</span>
                        </>
                      )}
                    </p>
                  )}
                  {perfect && quizCompletionSummary && (
                    <div className="mt-4 max-w-md mx-auto space-y-3 text-left">
                      {quizCompletionSummary.leveledUp && (
                        <p className="text-center font-bold text-amber-600 dark:text-amber-300 text-sm">🎊 LEVEL ATLADI!</p>
                      )}
                      <p className="text-center text-lg font-bold text-emerald-800 dark:text-emerald-200 tabular-nums">
                        +{quizCompletionSummary.totalEarnedSession} XP
                      </p>
                      <p className="text-xs text-emerald-900/85 dark:text-emerald-200/85 leading-relaxed text-center">
                        {[
                          quizCompletionSummary.breakdown.correctBaseXp > 0
                            ? `Doğru cevaplar: +${quizCompletionSummary.breakdown.correctBaseXp} XP (zaman zorluğuna göre)`
                            : '',
                          quizCompletionSummary.breakdown.irregularBonus > 0
                            ? `Düzensiz bonus: +${quizCompletionSummary.breakdown.irregularBonus} XP`
                            : '',
                          quizCompletionSummary.breakdown.firstTryBonus > 0
                            ? `İlk deneme bonusu: +${quizCompletionSummary.breakdown.firstTryBonus} XP`
                            : '',
                          quizCompletionSummary.breakdown.hintPenalty > 0
                            ? `İpucu cezası: −${quizCompletionSummary.breakdown.hintPenalty} XP`
                            : '',
                          quizCompletionSummary.breakdown.specialBonus > 0
                            ? `Ekstra: +${quizCompletionSummary.breakdown.specialBonus} XP`
                            : '',
                          quizCompletionSummary.breakdown.dailyFirst > 0
                            ? `Günlük ilk: +${quizCompletionSummary.breakdown.dailyFirst} XP`
                            : '',
                          quizCompletionSummary.breakdown.dailyVerb > 0
                            ? `Yeni fiil: +${quizCompletionSummary.breakdown.dailyVerb} XP`
                            : '',
                          quizCompletionSummary.breakdown.flawless > 0
                            ? `Hatasız: +${quizCompletionSummary.breakdown.flawless} XP`
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <div className="h-2 rounded-full bg-emerald-200/80 dark:bg-emerald-900/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-[width] duration-1000 ease-out"
                          style={{ width: `${Math.round(congratsXpBar)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6">
                    {masteryDrillUi && perfect && (
                      <button
                        type="button"
                        onClick={() => advanceMasteryDrillAfterRound()}
                        className="rounded-xl bg-amber-600 dark:bg-amber-500 text-white font-semibold px-4 sm:px-5 py-2.5 text-sm hover:bg-amber-700 dark:hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors duration-300"
                      >
                        {masteryDrillUi.index < masteryDrillUi.total - 1
                          ? t('verbLab.mastery.nextDrill', {
                              n: masteryDrillUi.total - masteryDrillUi.index - 1,
                            })
                          : t('verbLab.mastery.finishDrill')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={pickNewExerciseVerb}
                      className="rounded-xl bg-violet-600 dark:bg-violet-500 text-white font-semibold px-4 sm:px-5 py-2.5 text-sm hover:bg-violet-700 dark:hover:bg-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors duration-300"
                    >
                      Aynı Tense Başka Fiil
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuizTenseMenuOpen(true)}
                      className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-4 sm:px-5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-300"
                    >
                      Başka Tense
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetQuiz();
                        setCurrentFocusIndex(0);
                      }}
                      className="rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white font-semibold px-4 sm:px-5 py-2.5 text-sm hover:bg-emerald-700 dark:hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors duration-300"
                    >
                      Tekrar Çöz
                    </button>
                    <button
                      type="button"
                      onClick={() => setExerciseMode('list')}
                      className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors duration-300"
                    >
                      Liste Modu
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Odak modu: zamir rozeti + yazı / çoktan seç */}
            {quizLayout === 'focus' && currentFocusIndex < qp.length && (() => {
              const pronoun = qp[currentFocusIndex];
              const label = pronounsForLang.find((p) => p.id === pronoun)?.label ?? pronoun;
              const feedback = quizFeedback[pronoun];
              const correctValue = conjugationsForDisplay[pronoun];
              const hintMode = quizHintMode[pronoun];
              const isRevealing = hintMode === 'reveal';
              void mistakeMemoryTick;
              void mistakeBannerRev;
              const memRec =
                (selectedLanguage === 'es' || selectedLanguage === 'fr') && verbKey
                  ? getSpanishMistake(verbKey, selectedTense, pronoun, selectedLanguage)
                  : null;
              const memErrCount = memRec?.errorCount ?? 0;
              const wrongBorderRepeat = feedback === 'wrong' && !isRevealing && memErrCount >= 2;
              const showAsCorrect = feedback === 'correct' || isRevealing || mistakeReplayShowTick;
              const exLine =
                staticExample && (selectedLanguage === 'fr' ? staticExample.fr?.trim() : staticExample.es?.trim());
              const exTr = staticExample?.tr?.trim();
              const showEx = (selectedLanguage === 'es' || selectedLanguage === 'fr') && exLine && exTr;
              /**
               * Çoktan seç renkleri: doğru şık normMcForm ile correctValue’ya eşit mi (aksan/boşluk/büyük-küçük).
               * checkAnswer ile findIndex kullanma — bazı çiftlerde metin aynı görünürken checkAnswer 'wrong' dönebiliyor,
               * o zaman doğru şık kırmızı kalıyordu.
               */
              const mcCorrectNorm = normMcForm(correctValue ?? '');
              const mcPickIdx = focusMcPickedIndex;
              const mcPickRes =
                mcPickIdx !== null && focusMcOptions[mcPickIdx] !== undefined
                  ? checkAnswer(focusMcOptions[mcPickIdx], correctValue ?? '')
                  : null;
              const mcPickOk = mcPickRes === 'correct' || mcPickRes === 'typo';
              return (
                <motion.div
                  key={`focus-q-${currentFocusIndex}-${pronoun}-${quizInteractionMode}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="p-5 sm:p-6 mb-4"
                >
                  <div className="max-w-xl mx-auto flex flex-col gap-3">
                    {focusUsesListen ? (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <button
                          type="button"
                          onClick={replayListenConjugation}
                          className="rounded-full p-4 bg-violet-500/15 text-violet-600 dark:text-violet-300 hover:bg-violet-500/25 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                          aria-label="Çekimi tekrar dinle"
                        >
                          <Volume2 className="w-14 h-14 sm:w-16 sm:h-16" strokeWidth={1.75} />
                        </button>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">Duyduğunuz çekimi yazın</p>
                        {listenForcedHint && feedback !== 'correct' && (
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            İpucu:{' '}
                            <strong className="font-bold text-emerald-700 dark:text-emerald-300">{correctValue}</strong>
                          </p>
                        )}
                        <motion.div
                          className={`relative w-full max-w-md rounded-2xl animate-slide-in-right-soft ${feedback === 'wrong' && !isRevealing ? 'animate-shake' : ''} ${quizEmptyShake === pronoun ? 'animate-shake ring-2 ring-red-500 dark:ring-red-400 ring-inset rounded-2xl' : ''} ${focusCorrectGlow ? 'animate-glow-green' : ''}`}
                        >
                          <input
                            ref={(el) => {
                              quizInputRefs.current[0] = el;
                            }}
                            type="text"
                            value={userAnswers[pronoun]}
                            onChange={(e) => setAnswer(pronoun, e.target.value)}
                            onFocus={() => {
                              activeQuizInputIndexRef.current = currentFocusIndex;
                              setQuizAccentBarVisible(true);
                            }}
                            onBlur={() => setQuizAccentBarVisible(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleFocusModeSubmit(undefined, { simpleWrong: true });
                              }
                            }}
                            readOnly={isRevealing || quizSessionLivesDepleted}
                            placeholder="Yazın…"
                            className={`w-full h-12 rounded-2xl border pl-4 pr-12 py-3 text-base sm:text-lg text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-300 shadow-inner ${
                              showAsCorrect
                                ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-500/20 text-slate-800 dark:text-slate-100'
                                : feedback === 'wrong'
                                  ? wrongBorderRepeat
                                    ? 'border-amber-500 dark:border-amber-400/60 bg-amber-50/80 dark:bg-amber-500/15 text-slate-800 dark:text-slate-100'
                                    : 'border-red-500 dark:border-red-400/60 bg-red-50/80 dark:bg-red-500/15 text-slate-800 dark:text-slate-100'
                                  : feedback === 'typo'
                                    ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50/80 dark:bg-amber-500/15 text-slate-800 dark:text-slate-100'
                                    : 'bg-slate-100/90 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white'
                            }`}
                            aria-label="Dinlediğiniz çekim"
                          />
                          {showAsCorrect && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 pointer-events-none" aria-hidden>
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {feedback === 'wrong' && !isRevealing && (
                            <span
                              className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${wrongBorderRepeat ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}
                              aria-hidden
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                          )}
                        </motion.div>
                        <button
                          type="button"
                          onClick={replayListenConjugation}
                          className="text-sm font-semibold text-violet-600 dark:text-violet-300 hover:underline focus:outline-none focus:ring-2 focus:ring-violet-500/40 rounded-lg px-2"
                        >
                          Tekrar Dinle
                        </button>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                          Dinleme hakkı: {listenReplayCount}/3
                        </p>
                        {(feedback === 'correct' || mistakeReplayShowTick) && verbKey && (
                          <p className="text-violet-800 dark:text-violet-200 font-semibold text-sm sm:text-base">
                            <span className="capitalize">{verbKey}</span> · {label} →{' '}
                            <span className="text-emerald-600 dark:text-emerald-400">{correctValue}</span>
                          </p>
                        )}
                      </div>
                    ) : focusUsesReverse ? (
                      <div className="flex flex-col gap-4 items-stretch">
                        <p className="text-center text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight break-words">
                          {correctValue}
                        </p>
                        <p className="text-center text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Hangi <strong>zamir</strong> ve <strong>zaman</strong>? · Fiil:{' '}
                          <span className="capitalize font-semibold text-slate-700 dark:text-slate-200">{verbKey}</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={reverseSelPronoun}
                            onChange={(e) => setReverseSelPronoun(e.target.value)}
                            disabled={quizSessionLivesDepleted}
                            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50"
                            aria-label="Zamir seç"
                          >
                            <option value="">Zamir seçin</option>
                            {pronounsForLang.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={reverseSelTense}
                            onChange={(e) => setReverseSelTense(e.target.value)}
                            disabled={quizSessionLivesDepleted}
                            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50"
                            aria-label="Zaman seç"
                          >
                            <option value="">Zaman seçin</option>
                            {tensesForLang.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : focusUsesChoice ? (
                    <div className="w-full flex flex-col gap-3">
                      <div className="flex items-center justify-center gap-2 sm:gap-4 w-full">
                        <span className="h-px flex-1 min-w-[0.75rem] bg-violet-300 dark:bg-violet-500/40" aria-hidden />
                        <h3 className="m-0 text-[1.2rem] font-bold text-violet-600 dark:text-violet-300 shrink-0 px-1 text-center leading-tight">
                          {label}
                        </h3>
                        <span className="h-px flex-1 min-w-[0.75rem] bg-violet-300 dark:bg-violet-500/40" aria-hidden />
                      </div>
                      <div className="w-full border-b border-violet-200/90 dark:border-violet-500/30" />
                      <div
                        className={`grid grid-cols-2 gap-3 w-full ${focusMcLocked && feedback === 'wrong' && !isRevealing ? 'animate-shake' : ''}`}
                      >
                        {focusMcOptions.map((opt, idx) => {
                          const isThisCorrect = normMcForm(opt) === mcCorrectNorm;
                          const isThisSelected = mcPickIdx !== null && idx === mcPickIdx;
                          const showGreen =
                            focusMcLocked &&
                            (isThisCorrect || (isThisSelected && mcPickOk));
                          const showRed = focusMcLocked && isThisSelected && !mcPickOk;
                          return (
                            <button
                              key={`${opt}-${idx}`}
                              type="button"
                              disabled={focusMcLocked || quizSessionLivesDepleted}
                              onClick={() => handleFocusMcPick(idx)}
                              className={`rounded-xl border h-16 min-h-[64px] px-2 text-base font-semibold text-center flex flex-col items-center justify-center gap-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:cursor-default ${
                                focusMcKeyFlashIndex === idx
                                  ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900 scale-[1.02] shadow-lg shadow-violet-500/25'
                                  : ''
                              } ${
                                showGreen
                                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100'
                                  : showRed
                                    ? 'border-red-500 bg-red-500/15 text-red-900 dark:text-red-100'
                                    : 'border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 hover:border-violet-400/60'
                              }`}
                            >
                              <span className="block truncate max-w-full" title={opt}>
                                {opt}
                              </span>
                              <span className="text-[10px] font-normal opacity-60 tabular-nums">{idx + 1}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    ) : (
                    <div className="flex items-stretch gap-2 min-h-[48px]">
                      <motion.span
                        layout
                        className="shrink-0 inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wide shadow-md min-w-[2.35rem] animate-slide-in-left-soft"
                      >
                        {label}
                      </motion.span>
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <motion.div
                            className={`relative flex-1 min-w-0 rounded-2xl animate-slide-in-right-soft ${feedback === 'wrong' && !isRevealing ? 'animate-shake' : ''} ${quizEmptyShake === pronoun ? 'animate-shake ring-2 ring-red-500 dark:ring-red-400 ring-inset rounded-2xl' : ''} ${focusCorrectGlow ? 'animate-glow-green' : ''}`}
                          >
                            <input
                              ref={(el) => {
                                quizInputRefs.current[0] = el;
                              }}
                              type="text"
                              value={userAnswers[pronoun]}
                              onChange={(e) => setAnswer(pronoun, e.target.value)}
                              onFocus={() => {
                                activeQuizInputIndexRef.current = currentFocusIndex;
                                setQuizAccentBarVisible(true);
                              }}
                              onBlur={() => setQuizAccentBarVisible(false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleFocusModeSubmit(undefined, { simpleWrong: quizInteractionMode === 'listen' });
                                }
                              }}
                              readOnly={isRevealing || quizSessionLivesDepleted}
                              placeholder="Cevabınız..."
                              className={`w-full h-12 rounded-2xl border pl-4 pr-24 py-3 text-base sm:text-xl text-left placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-300 shadow-inner ${
                                showAsCorrect
                                  ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-500/20 text-slate-800 dark:text-slate-100 shadow-[0_0_20px_rgba(34,197,94,0.25)]'
                                  : feedback === 'wrong'
                                    ? wrongBorderRepeat
                                      ? 'border-amber-500 dark:border-amber-400/60 bg-amber-50/80 dark:bg-amber-500/15 text-slate-800 dark:text-slate-100'
                                      : 'border-red-500 dark:border-red-400/60 bg-red-50/80 dark:bg-red-500/15 text-slate-800 dark:text-slate-100'
                                    : feedback === 'typo'
                                      ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50/80 dark:bg-amber-500/15 text-slate-800 dark:text-slate-100'
                                      : 'bg-slate-100/90 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white'
                              }`}
                              aria-label={`${label} çekimi`}
                            />
                            {showAsCorrect && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 pointer-events-none" aria-hidden>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                            {!showAsCorrect && feedback !== 'wrong' && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                {verbKey && (hintMode === null || hintMode === 'rule') && (
                                  <button
                                    type="button"
                                    onClick={() => requestHint(pronoun)}
                                    tabIndex={-1}
                                    className="w-7 h-7 inline-flex items-center justify-center rounded-full text-slate-500 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-500/15 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors"
                                    title="İpucu (Tab)"
                                    aria-label="İpucu iste"
                                  >
                                    <span className="text-base font-bold leading-none">?</span>
                                  </button>
                                )}
                                {(selectedLanguage === 'es' || selectedLanguage === 'fr') && (
                                  <button
                                    type="button"
                                    onClick={() => setTenseCardOverlay({ kind: 'detail', tenseId: selectedTense })}
                                    tabIndex={-1}
                                    className="w-7 h-7 inline-flex items-center justify-center rounded-full text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-500/15 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors"
                                    title="Zaman kartı"
                                    aria-label="Zaman kartını aç"
                                  >
                                    <BookOpen className="w-4 h-4" strokeWidth={2} aria-hidden />
                                  </button>
                                )}
                                <MicButton
                                  size={30}
                                  lang={selectedLanguage === 'es' ? 'es-ES' : 'fr-FR'}
                                  disabled={quizSessionLivesDepleted}
                                  onInterim={(text) => setAnswer(pronoun, text)}
                                  onResult={(res) => {
                                    const match = correctValue
                                      ? res.alternatives.find((a) => checkAnswer(a, correctValue) !== 'wrong')
                                      : null;
                                    const picked = match ?? res.transcript;
                                    setAnswer(pronoun, picked);
                                    handleFocusModeSubmit(picked, { simpleWrong: quizInteractionMode === 'listen' });
                                  }}
                                />
                              </div>
                            )}
                            {feedback === 'wrong' && !isRevealing && (
                              <span
                                className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${wrongBorderRepeat ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}
                                aria-hidden
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </span>
                            )}
                          </motion.div>
                      </div>
                    </div>
                    )}
                    {feedback === 'wrong' && !isRevealing && (
                      <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {focusUsesReverse ? (
                          <>
                            Doğru: <strong className="font-bold">{label}</strong> ·{' '}
                            <strong className="font-bold">{tenseLabel}</strong>
                          </>
                        ) : (
                          <>
                            Doğrusu: <strong className="font-bold">{correctValue}</strong>
                          </>
                        )}
                      </p>
                    )}
                    {feedback === 'typo' && !focusUsesChoice && !focusUsesListen && (
                      <p className="text-center text-sm text-amber-700 dark:text-amber-300 font-medium">
                        Neredeyse! Doğrusu: <strong>{correctValue}</strong>
                      </p>
                    )}
                    {focusCanSkipAfterWrong && (
                      <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
                        Shift+Enter → sonraki soru
                      </p>
                    )}
                    {showEx && !focusUsesListen && (
                      <div className="rounded-lg border border-slate-200/70 dark:border-slate-600/80 bg-slate-50/80 dark:bg-slate-800/40 px-3 py-2 flex items-start gap-2 text-xs">
                        <span aria-hidden>📖</span>
                        <div className="min-w-0 flex-1">
                          <p className="italic text-slate-800 dark:text-slate-100 leading-snug break-words">
                            {renderQuizExampleLine(exLine, quizExampleHighlightForm)}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{exTr}</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => speakAuto(exLine, { lang: selectedLanguage === 'es' ? 'es-ES' : 'fr-FR' })}
                            className="p-1 rounded-md text-slate-500 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-white/50 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                            title="Dinle"
                            aria-label="Örnek cümleyi dinle"
                          >
                            <SpeakerIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(exLine);
                            }}
                            className="p-1 rounded-md text-slate-500 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-white/50 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                            title="Kopyala"
                            aria-label="Örneği kopyala"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    )}
                    {showHints && (
                      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                        Doğru: <span className="font-medium text-slate-700 dark:text-slate-200">{correctValue}</span>
                      </p>
                    )}
                    {!showHints && hintMode && verbKey && (
                      <div className="max-w-md mx-auto w-full">
                        <SmartHintBubble
                          mode={hintMode}
                          rule={
                            hintMode === 'rule'
                              ? quizPasséHint[pronoun] ??
                                getRuleHint(verbKey, selectedTense, pronoun, selectedLanguage, correctValue)
                              : undefined
                          }
                          letters={hintMode === 'letters' ? getLetterMask(correctValue, 2) : undefined}
                          correct={hintMode === 'reveal' ? correctValue : undefined}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })()}

            {/*
              Liste görünümü: tek sütun; grid 120px 1fr 32px 32px (md+), mobilde etiket üstte.
              Sıra: input → (yalnız odaklı satırda) hata uyarıları → ipuçları; normal akış, absolute yok.
            */}
            {quizLayout === 'list' && (
            <div className="px-5 sm:px-6 py-3">
              <div className="flex flex-col gap-1">
                {pronounsForLang.map(({ id, label }, index) => {
                  const feedback = quizFeedback[id];
                  const correctValue = conjugationsForDisplay[id];
                  const hintMode = quizHintMode[id];
                  const isRevealing = hintMode === 'reveal';
                  const showAsCorrect = feedback === 'correct' || isRevealing;
                  const showHintActions = !showAsCorrect && feedback !== 'wrong' && !!verbKey;
                  const rowIsFocused = listQuizFocusedPronounId === id;
                  void mistakeMemoryTick;
                  void mistakeBannerRev;
                  const memRow =
                    (selectedLanguage === 'es' || selectedLanguage === 'fr') && verbKey
                      ? getSpanishMistake(verbKey, selectedTense, id, selectedLanguage)
                      : null;
                  const memRowErr = memRow?.errorCount ?? 0;
                  const wrongBorderRepeatRow = feedback === 'wrong' && !isRevealing && memRowErr >= 2;
                  const recallBkRow =
                    verbKey && (selectedLanguage === 'es' || selectedLanguage === 'fr')
                      ? mistakeBannerDismissKey(selectedLanguage, verbKey, selectedTense, id)
                      : '';
                  const showRecallBannerRow =
                    (selectedLanguage === 'es' || selectedLanguage === 'fr') &&
                    verbKey &&
                    memRow &&
                    !memRow.resolved &&
                    !mistakeBannerDismissedRef.current.has(recallBkRow);
                  const showRecallForRow =
                    showRecallBannerRow && memRow && !showAsCorrect && rowIsFocused;
                  const showTypoForRow =
                    !showHints && feedback === 'typo' && rowIsFocused;
                  const showGlobalHintLine = showHints;
                  return (
                    <div key={id} className="quiz-align-row">
                      <span className="quiz-p-label text-sm">{label}</span>
                      <div
                        className={`quiz-p-input-wrap flex flex-col gap-1 min-w-0 ${
                          feedback === 'wrong' && !isRevealing ? 'animate-shake' : ''
                        } ${
                          quizEmptyShake === id
                            ? 'animate-shake ring-2 ring-red-500 dark:ring-red-400 ring-inset rounded-lg'
                            : ''
                        }`}
                      >
                        <div className="relative w-full min-w-0">
                          <input
                            ref={(el) => {
                              quizInputRefs.current[index] = el;
                            }}
                            type="text"
                            value={userAnswers[id]}
                            onChange={(e) => setAnswer(id, e.target.value)}
                            onFocus={() => {
                              activeQuizInputIndexRef.current = index;
                              setListQuizFocusedPronounId(id);
                              if (selectedLanguage === 'es' || selectedLanguage === 'fr') setQuizListHighlightPronoun(id);
                            }}
                            onBlur={() => {
                              window.setTimeout(() => {
                                const el = document.activeElement;
                                if (el !== quizInputRefs.current[index]) {
                                  setListQuizFocusedPronounId((cur) => (cur === id ? null : cur));
                                }
                              }, 0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleQuizInputKeyDown(e, index);
                            }}
                            readOnly={isRevealing || quizSessionLivesDepleted}
                            placeholder="…"
                            tabIndex={index + 1}
                            className={`w-full min-w-0 h-10 rounded-lg border pl-2.5 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all duration-200 ${
                              !showAsCorrect && feedback === 'wrong' ? 'pr-8' : 'pr-3'
                            } ${
                              showAsCorrect
                                ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/70 dark:bg-emerald-500/15 text-slate-800 dark:text-slate-100 focus:border-emerald-500'
                                : feedback === 'wrong'
                                  ? wrongBorderRepeatRow
                                    ? 'border-amber-500 dark:border-amber-400/65 bg-amber-50/80 dark:bg-amber-500/15 text-slate-800 dark:text-slate-100 focus:border-amber-500'
                                    : 'border-red-500 dark:border-red-400/60 bg-red-50/70 dark:bg-red-500/10 text-slate-800 dark:text-slate-100 focus:border-red-500'
                                  : feedback === 'typo'
                                    ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50/70 dark:bg-amber-500/10 text-slate-800 dark:text-slate-100 focus:border-amber-500'
                                    : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-white/10 text-slate-800 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 hover:border-slate-300 dark:hover:border-white/20'
                            }`}
                            aria-label={`${label} çekimi`}
                          />
                          {!showAsCorrect && feedback === 'wrong' && (
                            <span
                              className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${wrongBorderRepeatRow ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}
                              aria-hidden
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                          )}
                        </div>

                        {showRecallForRow && (
                          <SpanishMistakeRecallBanner
                            compact
                            mm={memRow}
                            pronounLabel={label}
                            tenseLabel={tensesForLang.find((t) => t.id === selectedTense)?.label ?? selectedTense}
                            onDismiss={() => {
                              mistakeBannerDismissedRef.current.add(recallBkRow);
                              setMistakeBannerRev((n) => n + 1);
                            }}
                          />
                        )}

                        {showTypoForRow && (
                          <p className="w-full min-w-0 rounded-md border border-amber-300/60 dark:border-amber-500/35 bg-amber-50/70 dark:bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-900/90 dark:text-amber-100/90 font-medium break-words">
                            ⚠️ Geçen: <span className="lowercase">{userAnswers[id] || '—'}</span> → Doğrusu:{' '}
                            <strong>{correctValue}</strong>
                          </p>
                        )}

                        {showGlobalHintLine && (
                          <p className="w-full min-w-0 rounded-md border border-amber-200/70 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300">
                            Doğru:{' '}
                            <span className="font-medium text-slate-800 dark:text-slate-100">{correctValue}</span>
                          </p>
                        )}

                        {!showHints && hintMode && verbKey && (
                          <div className="w-full min-w-0">
                            <SmartHintBubble
                              mode={hintMode}
                              rule={
                                hintMode === 'rule'
                                  ? quizPasséHint[id] ??
                                    getRuleHint(verbKey, selectedTense, id, selectedLanguage, correctValue)
                                  : undefined
                              }
                              letters={hintMode === 'letters' ? getLetterMask(correctValue, 2) : undefined}
                              correct={hintMode === 'reveal' ? correctValue : undefined}
                              compact
                            />
                          </div>
                        )}
                      </div>
                      <div className="quiz-p-hint">
                        {showHintActions && (
                          <>
                            {hintMode === null && (
                              <button
                                type="button"
                                disabled={quizSessionLivesDepleted}
                                onClick={() => requestHint(id)}
                                tabIndex={-1}
                                className="w-4 h-4 shrink-0 inline-flex items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-500/15 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                title="İpucu al (-2 puan)"
                                aria-label={`${label} için ipucu iste`}
                              >
                                <span className="text-[10px] font-bold leading-none">?</span>
                              </button>
                            )}
                            {(selectedLanguage === 'es' || selectedLanguage === 'fr') && (
                              <button
                                type="button"
                                disabled={quizSessionLivesDepleted}
                                onClick={() => setTenseCardOverlay({ kind: 'detail', tenseId: selectedTense })}
                                tabIndex={-1}
                                className="w-4 h-4 shrink-0 inline-flex items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-500/15 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                title="Zaman kartını aç"
                                aria-label={`${label} için zaman kartını aç`}
                              >
                                <BookOpen className="w-3 h-3" strokeWidth={2} aria-hidden />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div className="quiz-p-snd">
                        {showAsCorrect ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => speakConjugation(correctValue, selectedLanguage)}
                              tabIndex={-1}
                              className="p-0.5 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                              title={selectedLanguage === 'es' ? 'Dinle (İspanyolca)' : 'Dinle (Fransızca)'}
                              aria-label={`${correctValue} dinle`}
                            >
                              <SpeakerIcon className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-emerald-600 dark:text-emerald-400 pointer-events-none" aria-hidden>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          </div>
                        ) : showHintActions ? (
                          <MicButton
                            size={16}
                            lang={selectedLanguage === 'es' ? 'es-ES' : 'fr-FR'}
                            disabled={isRevealing || quizSessionLivesDepleted}
                            onInterim={(text) => setAnswer(id, text)}
                            onResult={(res) => {
                              const match = res.alternatives.find((a) => checkAnswer(a, correctValue) !== 'wrong');
                              setAnswer(id, match ?? res.transcript);
                            }}
                            title="Sesle yaz"
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {(selectedLanguage === 'es' || selectedLanguage === 'fr') &&
              mode === 'quiz' &&
              quizLayout === 'list' &&
              staticExample &&
              (selectedLanguage === 'fr' ? staticExample.fr?.trim() : staticExample.es?.trim()) &&
              staticExample.tr?.trim() && (
              <motion.div
                key={`quiz-ex-${verbKey}-${selectedTense}-${quizExampleHighlightPronoun ?? ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="mx-5 sm:mx-6 mt-2 mb-1 px-3 py-2.5 flex flex-col gap-1"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div className="flex flex-wrap items-start gap-2 min-w-0">
                  <span className="shrink-0 text-base leading-snug select-none" aria-hidden>
                    📖
                  </span>
                  <div className="min-w-0 flex-1 flex flex-col gap-0.5 text-left">
                    <p
                      className="italic break-words leading-snug"
                      style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}
                    >
                      {renderQuizExampleLine(
                        (selectedLanguage === 'fr' ? staticExample.fr : staticExample.es) ?? '',
                        quizExampleHighlightForm
                      )}
                    </p>
                    <p
                      className="break-words leading-snug"
                      style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}
                    >
                      {staticExample.tr}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        speakAuto(
                          (selectedLanguage === 'fr' ? staticExample.fr : staticExample.es) ?? '',
                          { lang: selectedLanguage === 'es' ? 'es-ES' : 'fr-FR' }
                        )
                      }
                      className="p-1 rounded-md hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Dinle"
                      aria-label="Örnek cümleyi dinle"
                    >
                      <span aria-hidden>🔊</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          (selectedLanguage === 'fr' ? staticExample.fr : staticExample.es) ?? ''
                        );
                      }}
                      className="p-1 rounded-md hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Kopyala"
                      aria-label="Örneği kopyala"
                    >
                      <span aria-hidden>📋</span>
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => setMode('learning')}
                    className="text-[10px] font-medium tracking-wide hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-violet-500/40 rounded px-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Daha fazla örnek →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Alıştırma alt çubuğu — aksan (odak modunda input focus olunca) + aksiyonlar */}
            <div className="px-5 sm:px-6 py-5 border-t border-slate-100/80 dark:border-white/5 space-y-4">
              <AnimatePresence initial={false}>
                {(quizLayout === 'list' ||
                  (quizLayout === 'focus' && quizAccentBarVisible && !focusUsesChoice && !focusUsesReverse)) && (
                  <motion.div
                    key="accent-kb"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex justify-center w-full overflow-hidden"
                  >
                    <AccentKeyboard
                      compact
                      disabled={quizSessionLivesDepleted}
                      lang={selectedLanguage}
                      onInsert={(char) => {
                        insertAccentChar(char);
                        requestAnimationFrame(() => {
                          const idx = activeQuizInputIndexRef.current;
                          quizInputRefs.current[idx]?.focus();
                        });
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex flex-wrap items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-slate-400/40 transition-colors"
                >
                  Sıfırla
                </button>
                <button
                  type="button"
                  onClick={toggleShowHints}
                  className="shrink-0 rounded-xl border-2 border-violet-400/70 dark:border-violet-500/50 bg-transparent text-violet-700 dark:text-violet-200 text-sm font-semibold px-4 py-2.5 hover:bg-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors"
                >
                  {showHints ? 'İpucu Gizle' : 'İpucu Göster'}
                </button>
                {!(quizLayout === 'focus' && focusUsesChoice) && (
                  <button
                    type="button"
                    disabled={quizSessionLivesDepleted}
                    onClick={() => {
                      if (quizSessionLivesDepleted) return;
                      if (quizLayout === 'focus' && focusUsesReverse) handleReverseModeSubmit();
                      else if (quizLayout === 'focus')
                        handleFocusModeSubmit(undefined, { simpleWrong: quizInteractionMode === 'listen' });
                      else checkQuiz();
                    }}
                    className="ml-auto min-w-[9rem] rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-500 text-white text-base font-bold px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Kontrol Et
                  </button>
                )}
              </div>
            </div>

            {quizSessionLivesDepleted && (() => {
              const correctEnd = qp.filter((p) => quizFeedback[p] === 'correct').length;
              const wrongEnd = qp.filter((p) => quizFeedback[p] === 'wrong').length;
              const br = quizXpSessionBreakdownRef.current;
              const xpEnd = Math.max(
                0,
                br.correctBaseXp +
                  br.firstTryBonus +
                  br.irregularBonus +
                  br.specialBonus +
                  br.dailyFirst +
                  br.dailyVerb +
                  br.flawless -
                  br.hintPenalty
              );
              return (
                <div
                  className="absolute inset-0 z-[50] flex items-center justify-center p-4 bg-slate-900/55 dark:bg-black/60 backdrop-blur-md rounded-2xl"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="quiz-lives-out-title"
                >
                  <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-xl text-center">
                    <div className="text-5xl sm:text-6xl mb-3" aria-hidden>
                      💔
                    </div>
                    <h2 id="quiz-lives-out-title" className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                      Canların Bitti!
                    </h2>
                    <ul className="text-left text-sm sm:text-base text-slate-600 dark:text-slate-300 space-y-2 mb-6 mx-auto max-w-xs">
                      <li>
                        <span className="text-slate-400 dark:text-slate-500">•</span> Doğru:{' '}
                        <strong className="text-slate-800 dark:text-slate-100 tabular-nums">{correctEnd}</strong> çekim
                      </li>
                      <li>
                        <span className="text-slate-400 dark:text-slate-500">•</span> Yanlış:{' '}
                        <strong className="text-slate-800 dark:text-slate-100 tabular-nums">{wrongEnd}</strong> çekim
                      </li>
                      <li>
                        <span className="text-slate-400 dark:text-slate-500">•</span> Kazanılan XP:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{xpEnd}</strong>
                      </li>
                    </ul>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setQuizLivesExhausted(false);
                          resetQuiz();
                        }}
                        className="rounded-xl bg-violet-600 dark:bg-violet-500 text-white text-sm font-bold px-5 py-3 hover:bg-violet-700 dark:hover:bg-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                      >
                        🔄 Tekrar Dene
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuizLivesExhausted(false);
                          pickNextRandomVerb();
                        }}
                        className="rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 text-sm font-bold px-5 py-3 hover:bg-slate-100 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                      >
                        🎲 Başka Fiil
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {mistakeReplayComplete && (
              <div
                className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/55 backdrop-blur-sm rounded-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mistake-replay-done-title"
              >
                <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-xl text-center">
                  <h2 id="mistake-replay-done-title" className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                    Tebrikler! {mistakeReplayComplete.resolvedInSession} hata çözüldü
                  </h2>
                  {mistakeReplayComplete.remaining > 0 && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Kalan {mistakeReplayComplete.remaining} hata
                    </p>
                  )}
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {mistakeReplayComplete.remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMistakeReplayComplete(null);
                          startMistakeReplay();
                        }}
                        className="rounded-xl bg-red-600 dark:bg-red-500 text-white text-sm font-semibold px-4 py-2.5 hover:bg-red-700 dark:hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Kalan {mistakeReplayComplete.remaining} hatayı tekrar çöz
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMistakeReplayComplete(null)}
                      className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
            )}

          </section>
        )}
          </motion.div>
        </div>
      </main>
      )}
      {survivalOpen && selectedLanguage === 'es' && (
        <SurvivalMode onClose={() => setSurvivalOpen(false)} addXP={addXP} />
      )}

      {appMode === 'ezber' && <EzberMakinesi />}

      {/* Toast: Listeden silindi! 🎉 */}
      {toastMessage && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white px-5 py-3 shadow-lg shadow-slate-200/50 dark:shadow-black/30 font-medium text-sm animate-combo-in"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}

      {/* Zaman detay modalı — gramer açıklaması */}
      {tenseDetailModalOpen && (() => {
        const detail = getTenseExplanation(selectedLanguage, selectedTense);
        if (!detail) return null;
        const flag = selectedLanguage === 'fr' ? '🇫🇷' : '🇪🇸';
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tense-detail-modal-title"
            onClick={() => setTenseDetailModalOpen(false)}
          >
            <div
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-[90%] max-w-lg shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setTenseDetailModalOpen(false)}
                className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                aria-label="Kapat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 id="tense-detail-modal-title" className="text-xl font-bold text-slate-100 pr-10 flex items-center gap-2">
                <span>{tenseLabel}</span>
                <span aria-hidden>{flag}</span>
              </h2>
              <div className="mt-5 space-y-4">
                <section>
                  <h3 className="text-sm font-semibold text-slate-300 mb-1.5">Ne Zaman Kullanılır?</h3>
                  <p className="text-slate-200 text-sm leading-relaxed">{detail.longDesc}</p>
                </section>
                <section>
                  <h3 className="text-sm font-semibold text-slate-300 mb-1.5">Kurulum (Matematiği)</h3>
                  <div className="bg-slate-900/50 p-3 rounded-xl border border-indigo-500/20 text-indigo-200 text-sm leading-relaxed">
                    {detail.formation}
                  </div>
                </section>
                {detail.examples.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Örnekler</h3>
                    <ul className="space-y-2">
                      {detail.examples.map((ex, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span className="italic">{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Giriş / Kayıt modali (mock — backend bağlanmadan önce sadece UI) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => setIsLoggedIn(true)}
        onRegister={() => setIsLoggedIn(true)}
      />
    </div>
  );
}
