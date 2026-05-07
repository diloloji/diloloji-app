import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { getTenses, getTenseGroups, getPronouns } from '../data/verbs';
import type { AppLanguage } from '../data/verbs';
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
import { isIrregularVerb } from '../data/irregularVerbs';
import { getTranslationOrPlaceholder } from '../data/dictionary';
import { SPANISH_VERBS } from '../data/spanish-data';
import { getVerbExample } from '../data/verbExamples';
import { getTenseExplanation } from '../data/tenseExplanations';
import { getVerbMetadata } from '../data/verbMetadata';
import { VERB_LEVELS, CEFR_LEVELS, CEFR_COLORS, type CEFRLevel } from '../data/verbLevels';
import { fetchVerbTranslationFromGroq, fetchAIVerbExamples, type AIVerbExample } from '../services/dictionaryApi';
import { getMistakes, getDueMistakes, addMistake, updateMistakeReview, type MistakeEntry } from '../utils/mistakeBank';
import { getConjugationRule } from '../utils/conjugationRules';
import ErrorAnalysisCard from '../components/ErrorAnalysisCard';
import { getStarredVerbs, toggleStarredVerb, isStarredVerb } from '../utils/starredVerbs';
import { getActivityHistory, getLastNDays, addActivityToday } from '../utils/activityHistory';
import { updateDocumentTitle } from '../utils/dailyGoal';
import { getFlashcardDecks, addCardToDeck, type FlashcardDeck } from '../utils/flashcardDecks';
import { useXp } from '../contexts/XpContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Info, BookOpen } from 'lucide-react';
import EzberMakinesi from '../components/EzberMakinesi';
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
import { verbRegimes } from '../data/verb_regimes';
import { collocations } from '../data/collocations';
import { regionalVariants } from '../data/regional_variants';
import { serEstarRules } from '../data/ser_estar';
import { timeMarkers } from '../data/time_markers';
import {
  fetchSynonyms,
  type VerbSynonymPayload,
} from '../services/synonyms';

type Mode = 'learning' | 'quiz' | 'review' | 'starred' | 'time-attack' | 'compare';
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

const DIFFICULTY_CONFIG: Record<TimeAttackDifficulty, DifficultyConfig> = {
  easy: {
    label: 'Kolay',
    description: 'A1–A2 düzenli fiiller · sadece Presente',
    levels: ['A1', 'A2'],
    tenses: { es: ['presente'], fr: ['present'] },
    secondsPerQuestion: 15,
    multiplier: 1,
    colorToken: 'emerald',
    emoji: '🌱',
  },
  medium: {
    label: 'Orta',
    description: 'A1–B1 · Presente, Indefinido, Futuro',
    levels: ['A1', 'A2', 'B1'],
    tenses: {
      es: ['presente', 'preterito', 'futuro'],
      fr: ['present', 'passe-compose', 'futur-simple'],
    },
    secondsPerQuestion: 10,
    multiplier: 2,
    colorToken: 'amber',
    emoji: '⚡',
  },
  hard: {
    label: 'Zor',
    description: 'Tüm seviyeler · Subjuntivo & Condicional dahil',
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
const IRREGULAR_TENSE_OPTIONS_ES = [
  { id: 'presente', label: 'Presente' },
  { id: 'preterito', label: 'Pretérito Indefinido' },
  { id: 'imperfecto', label: 'Pretérito Imperfecto' },
  { id: 'futuro', label: 'Futuro Simple' },
  { id: 'condicional', label: 'Condicional' },
  { id: 'subjuntivo-presente', label: 'Subjuntivo Presente' },
] as const;
const SYNONYM_REGISTER_STYLES: Record<'formal' | 'informal' | 'neutral', string> = {
  formal: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/35',
  informal: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/35',
  neutral: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/35',
};

type StaticExample = {
  es?: string;
  tr?: string;
  person?: string;
} | null;

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
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const verbLang = lang === 'es' ? 'es' : 'fr';
  const pronouns = getPronouns(lang);
  const pronounIds = pronouns.map((p) => p.id);

  // Zorluk seviyelerine göre fiil havuzu
  const pool: string[] = [];
  for (const lvl of cfg.levels) {
    const verbsAtLevel = VERB_LEVELS[verbLang]?.[lvl] ?? [];
    pool.push(...verbsAtLevel);
  }
  const verbPool = pool.length > 0 ? pool : null;

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

/** Eksik/hatalı çekim için gösterilecek metin (tüm çekim yerlerinde tutarlı). */
const VERI_MEVCUT_DEGIL = 'Veri Mevcut Değil';

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
  if (isConjugationValueMissing(text)) {
    return (
      <span className="text-amber-600 dark:text-amber-400 italic text-sm" title="Bu şahıs için çekim verisi bulunamadı">
        {VERI_MEVCUT_DEGIL}
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

  const { addXP, level } = useXp();
  const { t } = useTranslation();

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
  const [irregularTenseFilter, setIrregularTenseFilter] = useState<string>('presente');
  const [showAllIrregulars, setShowAllIrregulars] = useState(false);
  /** AI ile üretilen örnek cümleler (fiil + zaman değişiminde yeniden istek) */
  const [aiExamples, setAIExamples] = useState<AIVerbExample[]>([]);
  const [aiExamplesLoading, setAIExamplesLoading] = useState(false);
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
  /** Türkçe anlam: dictionaryApi (dinamik) + statik fallback */
  const [translation, setTranslation] = useState<string | null>(null);
  const [dynamicMeaning, setDynamicMeaning] = useState<string | null>(null);
  const [isMeaningLoading, setIsMeaningLoading] = useState(false);
  const [selectedTense, setSelectedTense] = useState<string>(() => getTenses('es')[0].id);
  const [mode, setMode] = useState<Mode>('learning');
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
  const [randomVerbMode, setRandomVerbMode] = useState(false);
  const [combo, setCombo] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [comboDisplay, setComboDisplay] = useState<{ show: boolean; value: number }>({ show: false, value: 0 });

  /** Öğrenme tablosu: Ezber Modu (Active Recall) — çekimler blur, hover’da netleşir */
  const [activeRecallMode, setActiveRecallMode] = useState(false);
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
  /** Boş cevap gönderildiğinde sarsılacak input (pronoun id); 500ms sonra temizlenir */
  const [quizEmptyShake, setQuizEmptyShake] = useState<string | null>(null);

  /** Hata Bankası (Zorlandıklarım) — localStorage ile senkron */
  const [mistakeBank, setMistakeBank] = useState<MistakeEntry[]>([]);
  /** Toast: "Listeden silindi! 🎉" vb. */
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /** Yıldızlı fiiller — localStorage ile senkron */
  const [starredVerbs, setStarredVerbs] = useState<string[]>([]);

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
  const timeAttackXpAwardedRef = useRef(false);
  const timeAttackSaveDoneRef = useRef(false);

  /** Zamana Karşı bittiğinde bir kez XP ver (skor/10); tekrar oynayınca sıfırla */
  useEffect(() => {
    if (timeAttackGameOver) {
      if (!timeAttackXpAwardedRef.current) {
        const xp = Math.floor(timeAttackScore / 10);
        if (xp > 0) addXP(xp);
        timeAttackXpAwardedRef.current = true;
      }
    } else {
      timeAttackXpAwardedRef.current = false;
    }
  }, [timeAttackGameOver, timeAttackScore, addXP]);

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
  }, [timeAttackGameOver, timeAttackScore, timeAttackMaxCombo, timeAttackQuestion, selectedLanguage, timeAttackDifficulty]);

  useEffect(() => {
    if (!timeAttackGameOver) timeAttackSaveDoneRef.current = false;
  }, [timeAttackGameOver]);

  /** Zaman/Kip custom dropdown: açık/kapalı + tıklama dışı kapatma */
  const [tenseDropdownOpen, setTenseDropdownOpen] = useState(false);
  /** Mobilde sol panel (fiil seçimi) varsayılan kapalı; Fiil Seç ile açılır, fiil seçilince kapanır */
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
      setTenseCardOverlay({ kind: 'grid', highlightId: selectedLanguage === 'es' ? selectedTense : undefined });
    };
    window.addEventListener('conjume:open-tense-cards', handler);
    return () => window.removeEventListener('conjume:open-tense-cards', handler);
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

  /** Alıştırma başlığından zaman değişimi: inputları temizle, feedback'i sıfırla */
  const changeQuizTense = useCallback((tenseId: string) => {
    if (tenseId === selectedTense) {
      setQuizTenseMenuOpen(false);
      return;
    }
    setSelectedTense(tenseId);
    setUserAnswers(getInitialUserAnswers(selectedLanguage));
    setQuizFeedback(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as 'correct' | 'wrong' | 'typo' | null])));
    setQuizPasséHint(Object.fromEntries(pronounsForLang.map((p) => [p.id, null])) as Record<string, string | null>);
    resetSmartHintsAll();
    setShowHints(false);
    setShowCongrats(false);
    setCurrentFocusIndex(0);
    setQuizTenseMenuOpen(false);
    requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
  }, [selectedTense, selectedLanguage, pronounsForLang, resetSmartHintsAll]);

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
    setIsMeaningLoading(false);
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
  const loadVerbRef = useRef<((overrideVerb?: string, langOverride?: 'fr' | 'es') => void) | null>(null);
  /** Çeviri isteği sırasında güncel fiili takip et (stale response'ları uygulama) */
  const verbKeyRef = useRef<string | null>(null);
  const comboDisplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Quiz inputları arasında focus yönetimi: refs[i] ile i. kutucuğa odaklanırız */
  const quizInputRefs = useRef<(HTMLInputElement | null)[]>([]);
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
  const staticSpanishMeaning = useMemo(() => {
    if (selectedLanguage !== 'es' || !verbKey) return null;
    const key = verbKey
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const tr = spanishMeaningMap.get(key);
    return tr && tr.trim().length > 0 ? tr : null;
  }, [selectedLanguage, verbKey, spanishMeaningMap]);
  const spanishVerbSet = useMemo(() => new Set(SPANISH_VERBS.map((v) =>
    v.infinitive.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  )), []);
  const displayMeaning = useMemo(() => {
    if (selectedLanguage === 'es') {
      return staticSpanishMeaning ?? 'Anlam bulunamadı';
    }
    return dynamicMeaning || getTranslationOrPlaceholder(verbKey ?? '', selectedLanguage);
  }, [selectedLanguage, staticSpanishMeaning, dynamicMeaning, verbKey]);
  const staticExample = useMemo((): StaticExample => {
    if (selectedLanguage !== 'es' || !verbKey) return null;
    const byVerb = (exampleSentences as Record<string, Record<string, StaticExample>>)[verbKey];
    if (!byVerb) return null;
    return byVerb[tenseLabel] ?? null;
  }, [selectedLanguage, verbKey, tenseLabel]);
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
    if (selectedLanguage !== 'es') return [];
    const out: string[] = [];
    for (const verb of verbList) {
      if (!isIrregularVerb(verb, 'es')) continue;
      const m = getSafeConjugationMap(verb, irregularTenseFilter, 'es');
      if (m && Object.keys(m).length > 0) out.push(verb);
    }
    return out;
  }, [selectedLanguage, verbList, irregularTenseFilter, getSafeConjugationMap]);
  const visibleIrregularVerbs = useMemo(
    () => (showAllIrregulars ? irregularVerbsForSelectedTense : irregularVerbsForSelectedTense.slice(0, 12)),
    [showAllIrregulars, irregularVerbsForSelectedTense]
  );

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

  const loadVerb = useCallback((overrideVerb?: string, langOverride?: 'fr' | 'es') => {
    const effectiveLang = langOverride ?? selectedLanguage;
    setError('');
    setReverseLookupInfo(null);
    const toLoad = (overrideVerb ?? verbInput).trim();
    if (effectiveLang === 'es') {
      const key = toLoad
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (!spanishVerbSet.has(key)) {
        setError('Bu fiil bulunamadı. Listeden bir fiil seçin.');
        setVerbKey(null);
        setConjugations(null);
        return;
      }
    }
    try {
      const result = getConjugationsForLang(toLoad, selectedTense, effectiveLang);
      if (result && result.ok) {
        const conj = result.conjugations;
        if (conj && typeof conj === 'object' && Object.keys(conj).length > 0) {
          const verified = verifyConjugationMap(conj, selectedTense, effectiveLang);
          if (overrideVerb) setVerbInput(sanitizeForDisplay(overrideVerb));
          setVerbKey(result.infinitive);
          setConjugations(verified);
          setLeftPanelOpen(false);
          if (langOverride) setSelectedLanguage(langOverride);
          setError('');
          return;
        }
      }
      const reverse = findInfinitiveByConjugatedForm(toLoad, effectiveLang);
      if (reverse) {
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
      setError(result && !result.ok ? (result.error ?? 'Bu fiil seçili dilde bulunamadı, lütfen yazımı kontrol edin.') : 'Bu fiil seçili dilde bulunamadı, lütfen yazımı kontrol edin.');
      setVerbKey(null);
      setConjugations(null);
    } catch {
      setError('Bu fiil seçili dilde bulunamadı, lütfen yazımı kontrol edin.');
      setVerbKey(null);
      setConjugations(null);
    }
  }, [verbInput, selectedTense, selectedLanguage, spanishVerbSet]);

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
      loadVerbRef.current(verbFromUrl.trim(), lang);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('verb');
        next.delete('lang');
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
    setError('Rastgele fiil seçilemedi. Lütfen manuel girin.');
  }, [selectedTense, selectedLanguage]);

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
        requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
        return;
      }
    }
    setError('Yeni rastgele fiil seçilemedi. Lütfen tekrar deneyin.');
  }, [selectedTense, selectedLanguage, verbKey, resetSmartHintsAll]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = () => setLeftPanelOpen(mq.matches);
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
        setError('Bu fiil seçili dilde bulunamadı, lütfen yazımı kontrol edin.');
        setVerbKey(null);
        setConjugations(null);
      }
    } catch {
      setError('Bu fiil seçili dilde bulunamadı, lütfen yazımı kontrol edin.');
      setVerbKey(null);
      setConjugations(null);
    }
  }, [verbKey, selectedTense, selectedLanguage]);

  /**
   * Fiil/zaman/dil değiştiğinde önceki AI sonuçlarını (örnek cümleler + çeviri)
   * temizle. OTOMATİK API çağrısı YOK — kullanıcı "AI Analizi Başlat" butonuna
   * basmalı.
   */
  useEffect(() => {
    setAIExamples([]);
    setAIExamplesLoading(false);
    if (selectedLanguage === 'es') {
      const text = (staticSpanishMeaning ?? 'Anlam bulunamadı');
      setDynamicMeaning(text);
      setTranslation(text);
    } else {
      setDynamicMeaning(null);
      setTranslation(null);
    }
    setIsMeaningLoading(false);
  }, [verbKey, selectedTense, selectedLanguage, staticSpanishMeaning]);

  /** Güncel fiil ref'i (stale response'ı önlemek için) */
  useEffect(() => {
    verbKeyRef.current = verbKey;
  }, [verbKey]);

  /**
   * Butona basıldığında AI analizi başlatılır — manuel tetikleme.
   * Hem Türkçe anlam (mastar) hem örnek cümleler eş zamanlı getirilir.
   */
  const generateAISentences = useCallback(async () => {
    if (!verbKey || aiExamplesLoading) return;
    const langLabel = selectedLanguage === 'fr' ? 'Fransızca' : 'İspanyolca';
    const tenseLbl = tensesForLang.find((t) => t.id === selectedTense)?.label ?? selectedTense;
    setAIExamplesLoading(true);
    setIsMeaningLoading(selectedLanguage !== 'es');
    setAIExamples([]);
    if (selectedLanguage !== 'es') {
      setDynamicMeaning(null);
      setTranslation(null);
    }
    const currentVerb = verbKey;
    try {
      const translationPromise =
        selectedLanguage === 'es'
          ? Promise.resolve({ translation: staticSpanishMeaning ?? 'Anlam bulunamadı' })
          : fetchVerbTranslationFromGroq(verbKey, langLabel);
      const [examplesRes, translationRes] = await Promise.allSettled([
        fetchAIVerbExamples(verbKey, tenseLbl, langLabel),
        translationPromise,
      ]);
      // Sonuçlar dönerken kullanıcı başka fiile geçmişse eski veriyi UI'a yazma.
      if (verbKeyRef.current !== currentVerb) return;
      if (examplesRes.status === 'fulfilled') {
        setAIExamples(examplesRes.value.examples ?? []);
      } else {
        setAIExamples([]);
      }
      if (translationRes.status === 'fulfilled') {
        const raw = translationRes.value?.translation?.trim();
        if (raw) {
          const text = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
          setDynamicMeaning(text);
          setTranslation(text);
        }
      }
    } catch {
      setAIExamples([]);
    } finally {
      if (verbKeyRef.current === currentVerb) {
        setAIExamplesLoading(false);
        setIsMeaningLoading(false);
      }
    }
  }, [verbKey, selectedTense, selectedLanguage, tensesForLang, aiExamplesLoading, staticSpanishMeaning]);

  // Yeni fiil yüklendiğinde quiz cevaplarını ve ipucunu sıfırla (doğru cevaplar kütüphaneden gelen conjugations ile güncellenir)
  useEffect(() => {
    setUserAnswers(getInitialUserAnswers(selectedLanguage));
    setQuizFeedback(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as 'correct' | 'wrong' | 'typo' | null])));
    setQuizPasséHint(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as string | null])));
    resetSmartHintsAll();
    setShowHints(false);
    setShowCongrats(false);
    setCombo(0);
    setCurrentFocusIndex(0);
    setQuizLayout(readExerciseModePreference());
  }, [verbKey, selectedLanguage, pronounsForLang, resetSmartHintsAll, readExerciseModePreference]);

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
    setShowAllIrregulars(false);
    if (selectedLanguage !== 'es') return;
    const exists = IRREGULAR_TENSE_OPTIONS_ES.some((x) => x.id === selectedTense);
    setIrregularTenseFilter(exists ? selectedTense : 'presente');
  }, [selectedLanguage, selectedTense]);

  // Sayfa ilk açılışta veya yeni fiil seçildiğinde ilgili ilk input'a odaklan
  useEffect(() => {
    if (!verbKey && mode !== 'time-attack') {
      verbInputRef.current?.focus();
      return;
    }
    if (mode === 'quiz') {
      quizInputRefs.current[0]?.focus();
    }
  }, [verbKey, mode]);

  // Alıştırma sekmesi açıldığında kullanıcı tercihini uygula (varsayılan tekli).
  useEffect(() => {
    if (mode !== 'quiz') return;
    setQuizLayout(readExerciseModePreference());
    setCurrentFocusIndex(0);
  }, [mode, readExerciseModePreference]);

  // Odak modunda tek input her şahıs değişiminde odaklansın
  useEffect(() => {
    if (mode === 'quiz' && verbKey && quizLayout === 'focus' && currentFocusIndex < pronounIds.length) {
      const t = requestAnimationFrame(() => { quizInputRefs.current[0]?.focus(); });
      return () => cancelAnimationFrame(t);
    }
  }, [mode, verbKey, quizLayout, currentFocusIndex]);

  useEffect(() => {
    return () => {
      if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
    };
  }, []);

  // Hata Bankası: sayfa yüklendiğinde localStorage'dan oku
  useEffect(() => {
    setMistakeBank(getMistakes());
  }, []);

  // Yıldızlı fiiller: sayfa yüklendiğinde localStorage'dan oku
  useEffect(() => {
    setStarredVerbs(getStarredVerbs());
  }, []);

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
    const cfg = DIFFICULTY_CONFIG[difficulty];
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
    setTimeAttackTimeLeft(DIFFICULTY_CONFIG[diff].secondsPerQuestion);
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
    const cfg = DIFFICULTY_CONFIG[diff];
    const conjugations = getConjugationForTenseForLang(q.verbKey, q.tense, selectedLanguage);
    const correct = conjugations[q.pronoun] ?? '';
    const isCorrect = checkOne(timeAttackInput.trim(), correct);
    if (isCorrect) {
      setTimeAttackFeedback('correct');
      const nextCombo = timeAttackCombo + 1;
      const points = 10 * timeAttackCombo * cfg.multiplier;
      setTimeAttackScore((s) => s + points);
      setTimeAttackCombo((c) => c + 1);
      setTimeAttackCorrectCount((n) => n + 1);
      setTimeAttackMaxCombo((m) => Math.max(m, nextCombo));
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
  }, [timeAttackQuestion, timeAttackGameOver, timeAttackLocked, timeAttackInput, timeAttackCombo, selectedLanguage, timeAttackDifficulty, handleTimeAttackWrong]);

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

  /** Yıldızlı fiil aç/kapat; state ve localStorage güncellenir. */
  const toggleStar = useCallback((verb: string) => {
    setStarredVerbs(toggleStarredVerb(verb));
  }, []);

  /** Sanal klavye: aksanlı harfi aktif quiz inputuna imleç konumuna ekle. */
  const insertAccentChar = useCallback((char: string) => {
    const index = activeQuizInputIndexRef.current;
    const pronoun = pronounIds[index];
    const el = quizInputRefs.current[index];
    const value = userAnswers[pronoun] ?? '';
    const start = el ? (el.selectionStart ?? value.length) : value.length;
    const end = el ? (el.selectionEnd ?? value.length) : value.length;
    const newValue = value.slice(0, start) + char + value.slice(end);
    setAnswer(pronoun, newValue);
    lastAccentInsertRef.current = { index, caretPosition: start + char.length };
  }, [userAnswers]);

  const checkQuiz = useCallback(() => {
    if (!conjugations) return;
    const firstEmpty = pronounIds.find((p) => (userAnswers[p] ?? '').trim() === '');
    if (firstEmpty !== undefined) {
      setQuizEmptyShake(firstEmpty);
      setTimeout(() => setQuizEmptyShake(null), 500);
      return;
    }
    const next: Record<string, 'correct' | 'wrong' | 'typo' | null> = {};
    const nextHints: Record<string, string | null> = Object.fromEntries(pronounIds.map((p) => [p, null]));
    pronounIds.forEach((pronoun) => {
      const user = userAnswers[pronoun];
      const correct = conjugations[pronoun];
      const result = user.trim() === '' ? null : checkAnswer(user, correct);
      next[pronoun] = result;
      if (next[pronoun] === 'wrong' && selectedLanguage === 'fr' && selectedTense === 'passe-compose' && verbKey) {
        nextHints[pronoun] = checkPasséComposéLogic(user, correct, pronoun as import('../data/verbs').Pronoun, verbKey);
      }
    });
    const hasWrong = pronounIds.some((p) => next[p] === 'wrong');
    const newCorrectCount = pronounIds.filter(
      (p) => next[p] === 'correct' && quizFeedback[p] !== 'correct'
    ).length;
    setQuizFeedback(next);
    setQuizPasséHint(nextHints);
    if (hasWrong && verbKey) {
      pronounIds.forEach((p) => {
        if (next[p] === 'wrong') addToMistakeBank(verbKey, selectedTense, p);
      });
    }
    if (hasWrong) {
      setCombo(0);
    } else if (newCorrectCount > 0 && !showHints) {
      setCombo((c) => {
        const nextCombo = c + newCorrectCount;
        if (nextCombo >= 2) {
          if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
          setComboDisplay({ show: true, value: nextCombo });
          comboDisplayTimeoutRef.current = setTimeout(() => {
            setComboDisplay((d) => ({ ...d, show: false }));
            comboDisplayTimeoutRef.current = null;
          }, 1800);
        }
        return nextCombo;
      });
      setTotalScore((s) => s + newCorrectCount * 10);
      addActivityToday(newCorrectCount);
      updateDocumentTitle();
    }
  }, [conjugations, userAnswers, quizFeedback, showHints, selectedTense, verbKey, addToMistakeBank]);

  /** Show Hint açıldığında mevcut fiil+zaman için tüm şahısları Hata Bankasına ekle. */
  const toggleShowHints = useCallback(() => {
    setShowHints((h) => {
      const next = !h;
      if (next && verbKey && mode === 'quiz') {
        pronounIds.forEach((pronoun) => addToMistakeBank(verbKey, selectedTense, pronoun));
      }
      return next;
    });
  }, [verbKey, mode, selectedTense, addToMistakeBank]);

  const resetQuiz = useCallback(() => {
    setUserAnswers(getInitialUserAnswers(selectedLanguage));
    setQuizFeedback({ je: null, tu: null, il: null, nous: null, vous: null, ils: null } as Record<string, 'correct' | 'wrong' | 'typo' | null>);
    setQuizPasséHint({ je: null, tu: null, il: null, nous: null, vous: null, ils: null });
    resetSmartHintsAll();
    setShowHints(false);
    setShowCongrats(false);
    setCurrentFocusIndex(0);
    requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
  }, [selectedLanguage, resetSmartHintsAll]);

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

  // Klavye kısayolları: Alt+L Learning, Alt+Q Quiz, Escape menü kapat / modal kapat / quiz temizle / review'dan çık
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
        if (verbKey) requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, verbKey, resetQuiz, showActivityModal, tenseDetailModalOpen]);

  const conjugationsForDisplay = conjugations;

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
    if (quizHintMode[pronoun] === 'reveal') return;
    if ((quizAttempts[pronoun] ?? 0) === 0) {
      setQuizAttempts((prev) => ({ ...prev, [pronoun]: 1 }));
    }
    setQuizHintMode((prev) => ({ ...prev, [pronoun]: prev[pronoun] ?? 'rule' }));
    setTotalScore((s) => s - 2);
    markHintUsed(verbKey, selectedTense, pronoun);
    setMistakeBank(getMistakes());
  }, [verbKey, selectedTense, quizAttempts, quizHintMode]);

  const handleQuizInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!conjugationsForDisplay) return;
      const pronoun = pronounIds[currentIndex];
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
        setCombo(0);
        if (verbKey) addToMistakeBank(verbKey, selectedTense, pronoun);
        if (selectedLanguage === 'fr' && selectedTense === 'passe-compose' && verbKey) {
          const hint = checkPasséComposéLogic(userRaw, correct, pronoun as import('../data/verbs').Pronoun, verbKey);
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: hint }));
        } else {
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
        }
        if (verbKey) {
          applySmartHintAfterWrong(pronoun, correct, verbKey, selectedTense, {
            onRevealAdvance: () => {
              const nextEmpty = pronounIds.findIndex(
                (_, i) => i > currentIndex && userAnswers[pronounIds[i]].trim() === ''
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
      clearSmartHint(pronoun);
      if (!showHints) {
        setCombo((c) => {
          const nextCombo = c + 1;
          if (nextCombo >= 2) {
            if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
            setComboDisplay({ show: true, value: nextCombo });
            comboDisplayTimeoutRef.current = setTimeout(() => {
              setComboDisplay((d) => ({ ...d, show: false }));
              comboDisplayTimeoutRef.current = null;
            }, 1800);
          }
          return nextCombo;
        });
        setTotalScore((s) => s + 10);
        addActivityToday(1);
        updateDocumentTitle();
      }
      speakAuto(correct, { lang: selectedLanguage === 'es' ? 'es-ES' : 'fr-FR' });
      const nextEmptyIndex = pronounIds.findIndex(
        (_, i) => i > currentIndex && userAnswers[pronounIds[i]].trim() === ''
      );
      if (nextEmptyIndex !== -1) {
        requestAnimationFrame(() => quizInputRefs.current[nextEmptyIndex]?.focus());
        return;
      }
      const allFilled = pronounIds.every((p) => userAnswers[p].trim() !== '');
      const allCorrect =
        allFilled &&
        pronounIds.every((p) => checkAnswer(userAnswers[p], conjugationsForDisplay[p]) === 'correct');
      if (allCorrect) setShowCongrats(true);
      else if (currentIndex < pronounIds.length - 1)
        requestAnimationFrame(() => quizInputRefs.current[currentIndex + 1]?.focus());
    },
    [conjugationsForDisplay, userAnswers, showHints, selectedTense, verbKey, addToMistakeBank, selectedLanguage, applySmartHintAfterWrong, clearSmartHint, pronounIds]
  );

  /** Odak modu: tek şahıs kontrolü. Doğruysa sonraki şahısa geç, yanlışsa aynı yerde kal. */
  const handleFocusModeSubmit = useCallback((override?: string) => {
    if (!conjugationsForDisplay || currentFocusIndex >= pronounIds.length) return;
    const pronoun = pronounIds[currentFocusIndex];
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
      setCombo(0);
      if (verbKey) addToMistakeBank(verbKey, selectedTense, pronoun);
      if (selectedLanguage === 'fr' && selectedTense === 'passe-compose' && verbKey) {
        const hint = checkPasséComposéLogic(user, correct, pronoun as import('../data/verbs').Pronoun, verbKey);
        setQuizPasséHint((prev) => ({ ...prev, [pronoun]: hint }));
      } else {
        setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
      }
      if (verbKey) {
        applySmartHintAfterWrong(pronoun, correct, verbKey, selectedTense, {
          onRevealAdvance: () => {
            setCurrentFocusIndex((i) => i + 1);
            requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
          },
        });
      }
      return;
    }
    setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
    clearSmartHint(pronoun);
    if (!showHints) {
      setCombo((c) => {
        const nextCombo = c + 1;
        if (nextCombo >= 2) {
          if (comboDisplayTimeoutRef.current) clearTimeout(comboDisplayTimeoutRef.current);
          setComboDisplay({ show: true, value: nextCombo });
          comboDisplayTimeoutRef.current = setTimeout(() => {
            setComboDisplay((d) => ({ ...d, show: false }));
            comboDisplayTimeoutRef.current = null;
          }, 1800);
        }
        return nextCombo;
      });
      setTotalScore((s) => s + 10);
      addActivityToday(1);
      updateDocumentTitle();
    }
    speakAuto(correct, { lang: selectedLanguage === 'es' ? 'es-ES' : 'fr-FR' });
    setCurrentFocusIndex((i) => i + 1);
    requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
  }, [conjugationsForDisplay, userAnswers, currentFocusIndex, showHints, selectedTense, verbKey, addToMistakeBank, selectedLanguage, applySmartHintAfterWrong, clearSmartHint, pronounIds]);

  const SITE_URL = 'https://diloloji.com';
  const isEzber = location.pathname === '/ezber-makinesi';
  const seoTitle = isEzber ? 'Ezber Makinesi | Diloloji' : 'Diloloji Fiil Laboratuvarı: Fransızca ve İspanyolca Fiil Çekimleri';
  const seoDescription = isEzber
    ? 'Fransızca ve İspanyolca fiil çekimlerini ezberleyin. Alıştırma, zamana karşı ve kıyaslama modları ile pratik yapın.'
    : 'Fransızca fiil çekimleri ve İspanyolca fiil çekimleri. Tüm zamanlar, mastar, ulaç ve örnek cümlelerle interaktif fiil laboratuvarı.';
  const seoUrl = `${SITE_URL}${location.pathname}`;

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 print:bg-white">
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
          {/* Sol sütun: Kontrol paneli — mobilde toggle ile aç/kapa, desktop'ta her zaman görünür */}
          <aside data-print-hide className="flex flex-col gap-4 md:col-span-4 order-1 print:hidden md:sticky md:top-6 md:self-start transition-opacity duration-300">
            {/* Mobilde: Fiil Seç toggle; desktop'ta gizli (panel aşağıda her zaman gösterilir) */}
            <button
              type="button"
              className="md:hidden list-none cursor-pointer rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between w-full"
              onClick={() => setLeftPanelOpen((o) => !o)}
              aria-expanded={leftPanelOpen}
            >
              ⚙ Fiil Seç
              <span className={`inline-block transition-transform duration-200 ${leftPanelOpen ? 'rotate-180' : ''}`} aria-hidden>▼</span>
            </button>
            {/* Panel içeriği: mobilde sadece leftPanelOpen iken, desktop'ta (md:) her zaman görünür */}
            <div className={leftPanelOpen ? 'flex flex-col gap-4' : 'hidden md:flex md:flex-col md:gap-4'}>
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
                  onFocus={() => setAutocompleteClosed(false)}
                  placeholder={selectedLanguage === 'es' ? 'Örn: hablar, ser...' : 'Örn: être, aller...'}
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors duration-300"
                  title="Rastgele fiil seç"
                  aria-label="Rastgele fiil seç"
                >
                  <span className="text-lg leading-none" aria-hidden>🎲</span>
                </button>
              </div>
              {/* Sanal aksan klavyesi — diline göre özel karakterler */}
              <div className="flex flex-wrap items-center gap-0.5 mt-1.5">
                {(selectedLanguage === 'fr' ? ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'œ'] : ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡']).map((char) => (
                  <button
                    key={char}
                    type="button"
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

              {/* Favori fiil havuzu */}
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
                            <span className="text-[10px] opacity-70 group-hover:opacity-100 transition-opacity" aria-hidden>⭐</span>
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
              <p className="text-xs font-medium text-slate-500 dark:text-slate-500 select-none">
                Seviyelere Göre Keşfet
              </p>
              {/* Seviye butonları */}
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

              {/* Fiil havuzu — seçili seviyede chip'ler */}
              {selectedCEFRLevel && (
                <motion.div
                  key={`${selectedLanguage}-${selectedCEFRLevel}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex flex-wrap gap-1.5 overflow-hidden"
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

            {selectedLanguage === 'es' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-500 select-none">
                    ZAMANA GÖRE DÜZENSİZ FİİLLER
                  </p>
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300/80 dark:border-slate-600 text-[10px] font-bold text-slate-500 dark:text-slate-400 cursor-help"
                    title="Bu zamanda kök değişimi veya istisnai çekim içeren fiiller"
                    aria-label="Bu zamanda kök değişimi veya istisnai çekim içeren fiiller"
                  >
                    ℹ
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={irregularTenseFilter}
                    onChange={(e) => {
                      setIrregularTenseFilter(e.target.value);
                      setShowAllIrregulars(false);
                    }}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 px-3 pr-8 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                    aria-label="Düzensiz fiiller için zaman seç"
                  >
                    {IRREGULAR_TENSE_OPTIONS_ES.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
                </div>

                {irregularVerbsForSelectedTense.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/40 px-3 py-3 text-xs text-slate-500 dark:text-slate-500 italic text-center">
                    Bu zamanda kayıtlı düzensiz fiil bulunamadı
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {visibleIrregularVerbs.map((verb) => (
                        <button
                          key={`irr-${irregularTenseFilter}-${verb}`}
                          type="button"
                          onClick={() => {
                            setSelectedTense(irregularTenseFilter);
                            setVerbInput(verb);
                            setError('');
                            setAutocompleteClosed(true);
                            loadVerb(verb);
                          }}
                          className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 active:scale-95"
                        >
                          {verb}
                        </button>
                      ))}
                    </div>
                    {!showAllIrregulars && irregularVerbsForSelectedTense.length > 12 && (
                      <button
                        type="button"
                        onClick={() => setShowAllIrregulars(true)}
                        className="self-start text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                      >
                        + {irregularVerbsForSelectedTense.length - 12} tane daha göster
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Zaman seçimi — custom dropdown (glassmorphism, kategoriler, check ikonu, animasyon) */}
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
            {/* Rastgele Fiillerle Pratik Yap */}
            <label className="flex items-center gap-2 mt-3 cursor-pointer group" title="Rastgele Fiillerle Pratik Yap">
              <span className="relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-500">
                <input
                  type="checkbox"
                  checked={randomVerbMode}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setRandomVerbMode(on);
                    if (on) pickRandomVerb();
                  }}
                  className="sr-only"
                  aria-label="Rastgele Fiillerle Pratik Yap"
                />
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-200 shadow ring-0 transition duration-200 mt-0.5 ml-0.5 ${
                    randomVerbMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </span>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
                Rastgele Fiillerle Pratik Yap
              </span>
            </label>
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
                          requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
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
                      requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
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

        {/* Tebrik mesajı */}
        {showCongrats && verbKey && mode === 'quiz' && (
          <div
            className="mb-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-400/30 bg-emerald-50/80 dark:bg-emerald-500/15 p-6 text-center shadow-sm transition-colors duration-300"
            role="alert"
          >
            <p className="text-emerald-800 dark:text-emerald-200 font-semibold text-lg">Tebrikler!</p>
            <p className="text-emerald-700 dark:text-emerald-300/90 mt-1 text-sm">Tüm çekimler doğru.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {randomVerbMode && (
                <button
                  type="button"
                  onClick={pickNextRandomVerb}
                  className="rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 hover:bg-indigo-700 dark:hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors duration-300"
                >
                  Sonraki Rastgele Fiil ✨
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCongrats(false)}
                className="rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 hover:bg-emerald-700 dark:hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors duration-300"
              >
                Kapat
              </button>
            </div>
          </div>
        )}

        {/* Boş durum + Öğrenme/Alıştırma — tek kart; Basit modda üst boşluk minimum */}
        {mode !== 'review' && mode !== 'starred' && (
          <section className={`rounded-2xl bg-white dark:bg-slate-800/80 shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700/50 overflow-visible backdrop-blur-md transition-all duration-300 min-h-[400px] print:shadow-none print:border print:border-slate-200 ${viewMode === 'simple' ? 'mb-4 mt-0 pt-2' : 'mb-4 mt-6 md:mt-0'}`}>
            {/* Kart başlığı sekmeleri — her zaman görünür (Basit ve Detaylı) */}
            <div className="flex justify-start md:justify-center overflow-x-auto overflow-y-hidden scrollbar-hide print:hidden pt-3 pb-2 sm:pt-4 sm:pb-3 px-1 -mx-1">
              <div className="flex items-center gap-1 p-1 bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-full w-max min-w-0 flex-nowrap shadow-inner" role="tablist" aria-label="Mod">
              <button
                type="button"
                onClick={() => setMode('learning')}
                className={`px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer shrink-0 ${
                  mode === 'learning'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
                title="Alt+L"
              >
                {t('ogrenme')}
              </button>
              <button
                type="button"
                onClick={() => setMode('quiz')}
                className={`px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer shrink-0 ${
                  mode === 'quiz'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
                title="Alt+Q"
              >
                {t('alistirma')}
              </button>
              <button
                type="button"
                onClick={() => setMode('time-attack')}
                className={`px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer shrink-0 ${
                  mode === 'time-attack'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
                title={t('zamana_karsi')}
              >
                {t('zamana_karsi')}
              </button>
              <button
                type="button"
                onClick={() => setMode('compare')}
                className={`px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ease-in-out cursor-pointer shrink-0 ${
                  mode === 'compare'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-transparent text-slate-400 hover:text-slate-200'
                }`}
                title={t('kiyaslama')}
              >
                {t('kiyaslama')}
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
                        ⏱ Zamana Karşı
                      </h2>
                      <p className="mt-3 text-slate-600 dark:text-slate-300">
                        Zorluğunu seç ve fiil çekimlerinde kendini test et.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {(['easy', 'medium', 'hard'] as TimeAttackDifficulty[]).map((diff) => {
                        const cfg = DIFFICULTY_CONFIG[diff];
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
                                x{cfg.multiplier} PUAN
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
                      3 can · Süre dolunca doğru cevap gösterilir · Combo ile puanın katlanır 🔥
                    </p>
                  </div>
                ) : timeAttackGameOver ? (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl p-8 max-w-md mx-auto text-center">
                    {(() => {
                      const cfg = DIFFICULTY_CONFIG[timeAttackDifficulty];
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
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Oyun Bitti!</h2>
                    {timeAttackIsNewRecord && (
                      <p className="text-amber-600 dark:text-amber-400 font-bold text-lg animate-pulse mb-4">🏆 Yeni Rekor!</p>
                    )}
                    <dl className="space-y-3 text-left max-w-xs mx-auto">
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Bu oturumun skoru</dt>
                        <dd className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{timeAttackScore}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Kişisel rekor ({DIFFICULTY_CONFIG[timeAttackDifficulty].label})</dt>
                        <dd className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{timeAttackHighScore}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">En yüksek kombon</dt>
                        <dd className="font-bold text-orange-500 dark:text-orange-400">x{timeAttackMaxCombo}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Doğru bilinen fiil sayısı</dt>
                        <dd className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{timeAttackCorrectCount}</dd>
                      </div>
                    </dl>
                    {timeAttackLastScores.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 text-left">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Son 5 skor ({DIFFICULTY_CONFIG[timeAttackDifficulty].label})</p>
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
                    <div className="mt-8 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={resetToDifficultyMenu}
                        className="py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                      >
                        Zorluk Değiştir
                      </button>
                      <button
                        type="button"
                        onClick={() => startTimeAttack(timeAttackDifficulty)}
                        className="py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-400 dark:hover:to-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all duration-300"
                      >
                        Tekrar Oyna
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Zorluk rozeti */}
                    {(() => {
                      const cfg = DIFFICULTY_CONFIG[timeAttackDifficulty];
                      const badgeMap = {
                        emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
                        amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
                        rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40',
                      }[cfg.colorToken];
                      return (
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeMap}`}>
                            <span aria-hidden>{cfg.emoji}</span>
                            {cfg.label} · x{cfg.multiplier} PUAN
                          </span>
                          <button
                            type="button"
                            onClick={resetToDifficultyMenu}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline underline-offset-2"
                          >
                            Zorluk değiştir
                          </button>
                        </div>
                      );
                    })()}
                    {/* HUD: Süre | Skor & Kombo | Canlar */}
                    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                      <div className={`flex items-center gap-2 font-mono text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100 ${timeAttackTimeLeft <= 3 ? 'animate-pulse text-red-600 dark:text-red-400' : ''}`}>
                        <span aria-hidden>⏱</span>
                        {timeAttackTimeLeft}s
                      </div>
                      <div className="flex items-center gap-3">
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
                          <div className="flex flex-col sm:flex-row gap-2">
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
                              className={`flex-1 h-12 rounded-xl border bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-4 py-3 text-base placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors duration-200 disabled:opacity-80 ${
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
                              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-3 transition-colors duration-300"
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

            {!verbKey && mode !== 'time-attack' && mode !== 'compare' && (
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
              <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between gap-1.5 md:gap-x-3 md:gap-y-2 text-center sm:text-left">
                <div className="flex items-center gap-2 min-w-0 order-1">
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 capitalize text-xl tracking-tight">{verbKey}</h2>
                  {randomVerbMode && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2.5 py-0.5 shrink-0" title="Rastgele mod açık">
                      🎲 Rastgele Mod Aktif
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
                  {isMeaningLoading ? (
                    <div className="h-5 w-24 bg-slate-700/50 dark:bg-slate-600/50 rounded animate-pulse" aria-hidden />
                  ) : (
                    <span className="italic text-slate-600 dark:text-slate-300">{displayMeaning}</span>
                  )}
                </span>
                {/*
                  Sağ cluster — Detaylı-moda-özel ikon grubu (Ezber Modu, Sete
                  Ekle, Yazdır) SOLDA fade ile girer/çıkar, Basit/Detaylı
                  toggle daima EN SAĞDA çakılı kalır. Flex düzeni sayesinde
                  ikonlar gizlendiğinde toggle'ın sağ piksel koordinatı
                  değişmez.
                */}
                <div className="order-3 flex items-center gap-2 shrink-0 print:hidden ml-auto">
                  <AnimatePresence mode="wait" initial={false}>
                    {viewMode === 'detailed' && (
                      <motion.div
                        key="verb-header-toolbar"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="flex items-center gap-2"
                      >
                        <span className="inline-flex items-center text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 px-2.5 py-1 rounded-lg shadow-sm">
                          {tenseLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveRecallMode((on) => !on)}
                          className={`cursor-pointer inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-95 ${
                            activeRecallMode
                              ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                              : 'border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-indigo-500/20 hover:border-indigo-400 dark:hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200'
                          }`}
                          title={activeRecallMode ? 'Ezber modunu kapat' : 'Ezber modu: çekimleri gizle, üzerine gelince aç'}
                          aria-pressed={activeRecallMode}
                          aria-label={activeRecallMode ? 'Ezber modu açık' : 'Ezber modu kapalı'}
                        >
                          <EyeIcon open={!activeRecallMode} className="w-4 h-4" />
                          <span>Ezber Modu</span>
                        </button>
                        <div className="relative shrink-0" ref={addToSetRef}>
                          <button
                            type="button"
                            onClick={() => setAddToSetOpen((o) => !o)}
                            className="p-2 w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            title="Sete Ekle"
                            aria-label="Sete Ekle"
                            aria-expanded={addToSetOpen}
                          >
                            <span aria-hidden>➕</span>
                          </button>
                          {addToSetOpen && (
                            <div className="absolute right-0 top-full mt-1.5 min-w-[12rem] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl py-2 z-50 max-h-64 overflow-y-auto">
                              {(() => {
                                const decks: FlashcardDeck[] = typeof window !== 'undefined' ? getFlashcardDecks() : [];
                                const mockDecks = decks.length === 0
                                  ? [
                                      { id: 'mock-1', title: 'Seyahat Kelimeleri', cards: [] },
                                      { id: 'mock-2', title: 'Zor Fiiller', cards: [] },
                                    ] as { id: string; title: string; cards: unknown[] }[]
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
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="p-2 w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          title="Yazdır"
                          aria-label="Yazdır"
                        >
                          <span aria-hidden>🖨️</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {/* Görünüm modu: Basit | Detaylı — daima en sağda, konumu sabit */}
                  <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800/60 p-0.5" role="tablist" aria-label="Görünüm modu">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewMode === 'simple'}
                      onClick={() => setViewMode('simple')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                        viewMode === 'simple'
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      Basit
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewMode === 'detailed'}
                      onClick={() => setViewMode('detailed')}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                        viewMode === 'detailed'
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      Detaylı
                    </button>
                  </div>
                </div>
              </div>
              {/*
                Rozetler — her iki modda da tutarlı dikey ritim (pt-2 mt-2).
                Detaylı-moda-özel rozetler (Mastar, Ulaç, Auxiliaire) yumuşak
                fade ile girer/çıkar; Geçmiş Ortaç ve Kurallı/Düzensiz rozeti
                daima görünür.
              */}
              {(() => {
                const meta = getVerbMetadata(verbKey, selectedLanguage, !isIrregularVerb(verbKey, selectedLanguage));
                return (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-slate-200/80 dark:border-slate-600/80 pt-2 mt-2">
                    <AnimatePresence initial={false}>
                      {viewMode === 'detailed' && (
                        <motion.span
                          key="verb-meta-infinitive"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="inline-flex items-center overflow-hidden"
                        >
                          <span className="inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-default select-none whitespace-nowrap">
                            Mastar: <span className="ml-0.5 font-semibold text-slate-800 dark:text-slate-100">{meta.infinitive}</span>
                          </span>
                        </motion.span>
                      )}
                      {viewMode === 'detailed' && (
                        <motion.span
                          key="verb-meta-gerund"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2, delay: 0.03 }}
                          className="inline-flex items-center overflow-hidden"
                        >
                          <span className="inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-default select-none whitespace-nowrap">
                            Ulaç: <span className="ml-0.5 font-semibold text-slate-800 dark:text-slate-100">{meta.gerund}</span>
                          </span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className="inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-default select-none">
                      Geçmiş Ortaç: <span className="ml-0.5 font-semibold text-slate-800 dark:text-slate-100">{meta.pastParticiple}</span>
                    </span>
                    <span className={`inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs font-semibold cursor-default select-none ${meta.isRegular ? 'bg-emerald-500/10 dark:bg-slate-800/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 dark:bg-slate-800/30 text-amber-800 dark:text-amber-400'}`}>
                      {meta.isRegular ? 'Kurallı' : 'Düzensiz'}
                    </span>
                    <AnimatePresence initial={false}>
                      {viewMode === 'detailed' && (
                        <motion.span
                          key="verb-meta-auxiliary"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2, delay: 0.06 }}
                          className="inline-flex items-center overflow-hidden"
                        >
                          <span className="inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-default select-none whitespace-nowrap">
                            Auxiliaire: {meta.auxiliary}
                          </span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 cursor-default">Alternatif formlar:</span>
                      <button
                        type="button"
                        onClick={() => setIsReflexive((v) => !v)}
                        className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-95 ${isReflexive ? 'bg-indigo-600 border-indigo-500 text-white dark:bg-indigo-500 dark:border-indigo-400' : 'bg-slate-100 dark:bg-slate-700/80 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-indigo-500/20 hover:border-indigo-400 dark:hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200'}`}
                        aria-pressed={isReflexive}
                        aria-label={isReflexive ? 'Dönüşlü açık' : 'Dönüşlü kapalı'}
                        title={selectedLanguage === 'fr' ? 'Örn: se laver' : 'Örn: lavarse'}
                      >
                        Dönüşlü (Reflexive)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNegative((v) => !v)}
                        className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-95 ${isNegative ? 'bg-indigo-600 border-indigo-500 text-white dark:bg-indigo-500 dark:border-indigo-400' : 'bg-slate-100 dark:bg-slate-700/80 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-indigo-500/20 hover:border-indigo-400 dark:hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200'}`}
                        aria-pressed={isNegative}
                        aria-label={isNegative ? 'Olumsuz açık' : 'Olumsuz kapalı'}
                        title={selectedLanguage === 'fr' ? 'ne … pas' : 'no …'}
                      >
                        Olumsuz (Negative)
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                          const t = tensesForLang.find((x) => x.id === tenseId);
                          if (!t) return null;
                          const map = getSafeConjugationMap(verbKey, t.id, selectedLanguage);
                          if (!map || Object.keys(map).length === 0) return null;
                          return (
                            <motion.div
                              key={t.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.03 }}
                              className="rounded-xl bg-slate-800/40 dark:bg-slate-800/60 border border-slate-700/50 dark:border-slate-600/50 overflow-hidden backdrop-blur-sm transition-all duration-200 hover:border-slate-600 dark:hover:border-indigo-500/30"
                            >
                              <div className="px-4 py-2.5 border-b border-slate-700/50 dark:border-slate-600/50 bg-slate-700/30 dark:bg-slate-700/40">
                                <h4 className="text-sm font-bold text-slate-200 dark:text-slate-100">{t.label}</h4>
                              </div>
                              <ul className="divide-y divide-slate-700/50 dark:divide-slate-600/50">
                                {pronounsForLang.map(({ id, label }) => {
                                  const rawVal = map[id] ?? '';
                                  const missing = isConjugationValueMissing(rawVal) || rawVal === '—';
                                  const displayVal = missing ? '' : formatConjugationForDisplay(rawVal, id, selectedLanguage, isReflexive, isNegative);
                                  const fullPhrase = missing ? '' : `${label} ${rawVal}`.trim();
                                  const rowKey = `${t.id}-${id}`;
                                  const justCopied = copiedRowKey === rowKey;
                                  return (
                                  <li key={id} className="group flex items-center justify-between gap-3 px-4 py-2 text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 w-16">{label}</span>
                                    <div className="flex items-center gap-3 text-right min-w-0">
                                      {missing ? (
                                        <span className="text-amber-600 dark:text-amber-400 italic text-sm">{VERI_MEVCUT_DEGIL}</span>
                                      ) : (
                                        <span className="text-slate-200 dark:text-slate-100 truncate">
                                          <ConjugationWithStemSuffix text={displayVal} tenseId={t.id} lang={selectedLanguage} />
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

            {staticExample?.es && staticExample?.tr && (
              <motion.div
                key={`static-example-${verbKey}-${selectedTense}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="mx-4 sm:mx-0 mt-4 rounded-xl border border-emerald-500/20 dark:border-emerald-400/20 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm" aria-hidden>📌</span>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                    Varsayılan Örnek
                  </h4>
                </div>
                <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 italic">
                  {(() => {
                    const sentence = staticExample.es ?? '';
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

            {/* AI Örnek Cümleler — manuel buton ile Groq'tan 2 cümle */}
            {verbKey && conjugations && !showAllTenses && (
              <motion.div
                key={`ai-examples-${verbKey}-${selectedTense}-${selectedLanguage}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="mx-4 sm:mx-0 mt-4 rounded-xl border border-indigo-500/20 dark:border-indigo-400/20 bg-white/5 dark:bg-white/[0.04] backdrop-blur-sm p-4 transition-all duration-300 ease-in-out"
              >
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-500/10 dark:border-indigo-400/10">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-sm" aria-hidden>💡</span>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    AI Örnek Cümleler
                  </h4>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-500 ml-auto">
                    {tensesForLang.find((x) => x.id === selectedTense)?.label ?? selectedTense}
                  </span>
                  {aiExamples.length > 0 && !aiExamplesLoading && (
                    <button
                      type="button"
                      onClick={generateAISentences}
                      className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      title="Yeni cümleler üret"
                      aria-label="Yenile"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <path d="M21 4v5h-5" />
                      </svg>
                    </button>
                  )}
                </div>
                {aiExamples.length === 0 && !aiExamplesLoading && (
                  <button
                    type="button"
                    onClick={generateAISentences}
                    className="group w-full flex items-center justify-center gap-2 rounded-lg border border-indigo-500/30 dark:border-indigo-400/30 bg-indigo-500/[0.03] dark:bg-indigo-500/[0.06] px-4 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/15 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <span className="text-base transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" aria-hidden>✨</span>
                    <span>AI Analizi Başlat</span>
                  </button>
                )}
                {aiExamplesLoading && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-300">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 animate-spin">
                        <path d="M21 12a9 9 0 1 1-6.2-8.6" />
                      </svg>
                      <span>Cümleler yazılıyor…</span>
                    </div>
                    {[1, 2].map((i) => (
                      <div key={i} className="flex flex-col gap-2 animate-pulse">
                        <div className="h-4 bg-slate-200/30 dark:bg-slate-700/40 rounded w-3/4" />
                        <div className="h-3 bg-slate-200/20 dark:bg-slate-700/25 rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                )}
                {aiExamples.length > 0 && !aiExamplesLoading && (
                  <ul className="space-y-3">
                    {aiExamples.map((ex, i) => (
                      <motion.li
                        key={`${ex.sentence}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.1 }}
                        className="group flex items-start gap-3"
                      >
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm sm:text-base italic text-slate-800 dark:text-indigo-100 flex items-center gap-2 flex-wrap">
                            {ex.sentence}
                            <PronunciationButton
                              word={ex.sentence}
                              lang={selectedLanguage === 'fr' ? 'fr-FR' : 'es-ES'}
                              size="sm"
                            />
                          </p>
                          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-indigo-300/80">
                            {ex.translation}
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                )}
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

            {/* Tüm Zamanları Göster / Daralt — her iki durumda da görünür; açıkken sticky float */}
            {verbKey && conjugations && (
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
            <>
            <div className="border-b border-slate-100/80 dark:border-white/5 px-5 sm:px-6 py-4">
              <div className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 text-center sm:text-left">
                <div className="flex items-center gap-2 min-w-0 order-1">
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 capitalize text-xl tracking-tight">{verbKey}</h2>
                  {randomVerbMode && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2.5 py-0.5 shrink-0" title="Rastgele mod açık">
                      🎲 Rastgele Mod Aktif
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
                </div>
                <span className="text-slate-500 dark:text-slate-400 italic text-lg flex-1 min-w-0 order-2 flex justify-center items-center gap-2">
                  {isMeaningLoading ? (
                    <div className="h-5 w-24 bg-slate-700/50 dark:bg-slate-600/50 rounded animate-pulse" aria-hidden />
                  ) : (
                    <span className="italic text-slate-600 dark:text-slate-300">{displayMeaning}</span>
                  )}
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
                  {selectedLanguage === 'es' && (
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
                </div>
              </div>
              {/*
                İlerleme: X / 6 çekim + ince progress bar (h-1).
                Görünüm modu butonları (Liste/Odak) yukarıya, tense
                dropdown'un yanına ikon olarak taşındı — burada artık
                tekrar eden büyük pill yok.
              */}
              {(() => {
                const total = pronounIds.length;
                const progressCount =
                  quizLayout === 'focus'
                    ? Math.min(currentFocusIndex, total)
                    : pronounIds.filter((p) => quizFeedback[p] !== null).length;
                const progressPct = total ? (progressCount / total) * 100 : 0;
                return (
                  <div className="mt-4 pt-3 border-t border-slate-100/80 dark:border-white/5">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {progressCount} / {total} çekim
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-slate-200/70 dark:bg-white/5 overflow-hidden" role="progressbar" aria-valuenow={progressCount} aria-valuemin={0} aria-valuemax={total}>
                      <div className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Liste modu: tüm çekimler kontrol edildi ama hepsi doğru değil — özet + Tekrar Çalış */}
            {quizLayout === 'list' && conjugationsForDisplay && (() => {
              const allAnswered = pronounIds.every((p) => quizFeedback[p] !== null);
              const allCorrect = pronounIds.every((p) => quizFeedback[p] === 'correct');
              const correctCount = pronounIds.filter((p) => quizFeedback[p] === 'correct').length;
              const wrongCount = pronounIds.filter((p) => quizFeedback[p] === 'wrong').length;
              const typoCount = pronounIds.filter((p) => quizFeedback[p] === 'typo').length;
              const toRedo = pronounIds.filter((p) => quizFeedback[p] === 'wrong' || quizFeedback[p] === 'typo');
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
                          const firstIdx = pronounIds.indexOf(toRedo[0]);
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

            {/* Odak modu: tüm şahıslar tamamlandı */}
            {quizLayout === 'focus' && currentFocusIndex >= pronounIds.length && (
              <div className="p-6 sm:p-8 text-center rounded-xl mx-4 mb-4 bg-gradient-to-br from-emerald-50 to-teal-50/80 dark:from-emerald-500/15 dark:to-teal-500/10 border border-emerald-200/80 dark:border-emerald-400/30" role="alert">
                <p className="text-emerald-800 dark:text-emerald-200 font-bold text-xl">🎉 Tebrikler! Tüm çekimleri tamamladın</p>
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { resetQuiz(); setCurrentFocusIndex(0); requestAnimationFrame(() => quizInputRefs.current[0]?.focus()); }}
                    className="rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white font-semibold px-5 py-2.5 hover:bg-emerald-700 dark:hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors duration-300"
                  >
                    Tekrar Çöz
                  </button>
                  <button
                    type="button"
                    onClick={() => setExerciseMode('list')}
                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 transition-colors duration-300"
                  >
                    Liste Modunda Gör
                  </button>
                </div>
              </div>
            )}

            {/* Odak modu: tek büyük input */}
            {quizLayout === 'focus' && currentFocusIndex < pronounIds.length && (() => {
              const pronoun = pronounIds[currentFocusIndex];
              const label = pronounsForLang.find((p) => p.id === pronoun)?.label ?? pronoun;
              const feedback = quizFeedback[pronoun];
              const correctValue = conjugationsForDisplay[pronoun];
              const hintMode = quizHintMode[pronoun];
              const isRevealing = hintMode === 'reveal';
              const showAsCorrect = feedback === 'correct' || isRevealing;
              return (
                <div className="p-5 sm:p-6 mb-6">
                  <p className="text-center text-slate-600 dark:text-slate-300 font-bold text-2xl uppercase tracking-wide mb-4">{label}</p>
                  <div className={`max-w-md mx-auto relative rounded-2xl ${feedback === 'wrong' && !isRevealing ? 'animate-shake' : ''} ${quizEmptyShake === pronoun ? 'animate-shake ring-2 ring-red-500 dark:ring-red-400 ring-inset' : ''}`}>
                    <input
                      ref={(el) => { quizInputRefs.current[0] = el; }}
                      type="text"
                      value={userAnswers[pronoun]}
                      onChange={(e) => setAnswer(pronoun, e.target.value)}
                      onFocus={() => { activeQuizInputIndexRef.current = currentFocusIndex; }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleFocusModeSubmit(); }}
                      readOnly={isRevealing}
                      placeholder="Cevabınız..."
                      className={`w-full h-12 rounded-2xl border px-5 py-4 text-base sm:text-2xl text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-inner ${
                        showAsCorrect
                          ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-500/20 text-slate-800 dark:text-slate-100 focus:ring-emerald-500/30 dark:focus:ring-emerald-400/30'
                          : feedback === 'wrong'
                            ? 'border-red-500 dark:border-red-400/60 bg-red-50/80 dark:bg-red-500/15 text-slate-800 dark:text-slate-100 focus:ring-red-500/20 dark:focus:ring-red-400/30'
                            : feedback === 'typo'
                              ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50/80 dark:bg-amber-500/15 text-slate-800 dark:text-slate-100 focus:ring-amber-500/30 dark:focus:ring-amber-400/30'
                              : 'bg-slate-100/90 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white focus:border-indigo-500'
                      }`}
                      aria-label={`${label} çekimi`}
                    />
                    {showAsCorrect && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 pointer-events-none" aria-hidden>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    {!showAsCorrect && feedback !== 'wrong' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {verbKey && (hintMode === null || hintMode === 'rule') && (
                          <button
                            type="button"
                            onClick={() => requestHint(pronoun)}
                            tabIndex={-1}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-full text-slate-500 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-500/15 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors"
                            title="İpucu al (-2 puan)"
                            aria-label="İpucu iste"
                          >
                            <span className="text-base font-bold leading-none">?</span>
                          </button>
                        )}
                        {selectedLanguage === 'es' && (
                          <button
                            type="button"
                            onClick={() => setTenseCardOverlay({ kind: 'detail', tenseId: selectedTense })}
                            tabIndex={-1}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-full text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-500/15 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors"
                            title="Zaman kartını aç"
                            aria-label="Zaman kartını aç"
                          >
                            <BookOpen className="w-4 h-4" strokeWidth={2} aria-hidden />
                          </button>
                        )}
                        <MicButton
                          size={30}
                          lang={selectedLanguage === 'es' ? 'es-ES' : 'fr-FR'}
                          onResult={(res) => {
                            const match = correctValue
                              ? res.alternatives.find((a) => checkAnswer(a, correctValue) !== 'wrong')
                              : null;
                            const picked = match ?? res.transcript;
                            setAnswer(pronoun, picked);
                            handleFocusModeSubmit(picked);
                          }}
                        />
                      </div>
                    )}
                    {feedback === 'wrong' && !isRevealing && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 dark:text-red-400 pointer-events-none" aria-hidden>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    )}
                    {feedback === 'typo' && (
                      <p className="absolute left-0 right-0 -bottom-6 text-center text-sm text-amber-700 dark:text-amber-300 font-medium">
                        Neredeyse! Doğrusu: <strong>{correctValue}</strong>
                      </p>
                    )}
                  </div>
                  {showHints && (
                    <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
                      Doğru: <span className="font-medium text-slate-700 dark:text-slate-200">{correctValue}</span>
                    </p>
                  )}
                  {!showHints && hintMode && verbKey && (
                    <div className="mt-4 max-w-md mx-auto">
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
              );
            })()}

            {/*
              Liste görünümü: tek sütun; grid 120px 1fr 32px 32px (md+), mobilde etiket üstte.
              İpuçları input sarmalayıcıda absolute (layout kayması yok).
            */}
            {quizLayout === 'list' && (
            <div className="px-5 sm:px-6 py-5">
              <div className="flex flex-col gap-2">
                {pronounsForLang.map(({ id, label }, index) => {
                  const feedback = quizFeedback[id];
                  const correctValue = conjugationsForDisplay[id];
                  const hintMode = quizHintMode[id];
                  const isRevealing = hintMode === 'reveal';
                  const showAsCorrect = feedback === 'correct' || isRevealing;
                  const showHintActions = !showAsCorrect && feedback !== 'wrong' && !!verbKey;
                  const needHintUnderInput =
                    (!showHints && feedback === 'typo') ||
                    showHints ||
                    (!!hintMode && !!verbKey && !showHints);
                  return (
                    <div key={id} className="quiz-align-row">
                      <span className="quiz-p-label">{label}</span>
                      <div
                        className={`quiz-p-input-wrap ${needHintUnderInput ? 'pb-6' : ''} ${
                          feedback === 'wrong' && !isRevealing ? 'animate-shake' : ''
                        } ${
                          quizEmptyShake === id
                            ? 'animate-shake ring-2 ring-red-500 dark:ring-red-400 ring-inset rounded-lg'
                            : ''
                        }`}
                      >
                        <input
                          ref={(el) => {
                            quizInputRefs.current[index] = el;
                          }}
                          type="text"
                          value={userAnswers[id]}
                          onChange={(e) => setAnswer(id, e.target.value)}
                          onFocus={() => {
                            activeQuizInputIndexRef.current = index;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuizInputKeyDown(e, index);
                          }}
                          readOnly={isRevealing}
                          placeholder="…"
                          tabIndex={index + 1}
                          className={`w-full min-w-0 h-10 rounded-lg border pl-3 text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all duration-200 ${
                            !showAsCorrect && feedback === 'wrong' ? 'pr-8' : 'pr-3'
                          } ${
                            showAsCorrect
                              ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/70 dark:bg-emerald-500/15 text-slate-800 dark:text-slate-100 focus:border-emerald-500'
                              : feedback === 'wrong'
                                ? 'border-red-500 dark:border-red-400/60 bg-red-50/70 dark:bg-red-500/10 text-slate-800 dark:text-slate-100 focus:border-red-500'
                                : feedback === 'typo'
                                  ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50/70 dark:bg-amber-500/10 text-slate-800 dark:text-slate-100 focus:border-amber-500'
                                  : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-white/10 text-slate-800 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-400 hover:border-slate-300 dark:hover:border-white/20'
                          }`}
                          aria-label={`${label} çekimi`}
                        />
                        {!showAsCorrect && feedback === 'wrong' && (
                          <span
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-500 dark:text-red-400 pointer-events-none"
                            aria-hidden
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )}
                        {needHintUnderInput && (
                          <div className="absolute top-full left-0 right-0 z-20 mt-0.5">
                            <div className="pointer-events-auto space-y-1">
                              {!showHints && feedback === 'typo' && (
                                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                  Neredeyse! Doğrusu: <strong>{correctValue}</strong>
                                </p>
                              )}
                              {showHints && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Doğru:{' '}
                                  <span className="font-medium text-slate-700 dark:text-slate-200">{correctValue}</span>
                                </p>
                              )}
                              {!showHints && hintMode && verbKey && (
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
                                  absoluteUnderInput
                                  compact
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="quiz-p-hint">
                        {showHintActions && (
                          <>
                            {hintMode === null && (
                              <button
                                type="button"
                                onClick={() => requestHint(id)}
                                tabIndex={-1}
                                className="w-6 h-6 shrink-0 inline-flex items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-500/15 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors"
                                title="İpucu al (-2 puan)"
                                aria-label={`${label} için ipucu iste`}
                              >
                                <span className="text-xs font-bold leading-none">?</span>
                              </button>
                            )}
                            {selectedLanguage === 'es' && (
                              <button
                                type="button"
                                onClick={() => setTenseCardOverlay({ kind: 'detail', tenseId: selectedTense })}
                                tabIndex={-1}
                                className="w-6 h-6 shrink-0 inline-flex items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-100/70 dark:hover:bg-indigo-500/15 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors"
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
                            size={22}
                            lang={selectedLanguage === 'es' ? 'es-ES' : 'fr-FR'}
                            disabled={isRevealing}
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

            {/*
              Alıştırma alt çubuğu — aksan klavyesi + aksiyon butonları
              aynı blok içinde gruplandı. Aksan tuşları (gap-1.5) aksiyon
              butonlarının hemen üstünde tek satır halinde oturuyor;
              space-y-4 ile aralarında dengeli, nefes alan boşluk bırakılır.
            */}
            <div className="px-5 sm:px-6 py-5 border-t border-slate-100/80 dark:border-white/5 space-y-4">
              <div className="flex justify-center w-full">
                <AccentKeyboard
                  compact
                  lang={selectedLanguage}
                  onInsert={(char) => {
                    insertAccentChar(char);
                    requestAnimationFrame(() => {
                      const idx = activeQuizInputIndexRef.current;
                      quizInputRefs.current[idx]?.focus();
                    });
                  }}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => (quizLayout === 'focus' ? handleFocusModeSubmit() : checkQuiz())}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-indigo-500 dark:to-blue-500 text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:shadow-md dark:shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-all duration-300"
                >
                  Kontrol Et
                </button>
                <button
                  type="button"
                  onClick={toggleShowHints}
                  className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-sm font-medium px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 transition-colors duration-300"
                >
                  {showHints ? 'İpucu Gizle' : 'İpucu Göster'}
                </button>
                <button
                  type="button"
                  onClick={resetQuiz}
                  className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 transition-colors duration-300"
                >
                  Sıfırla
                </button>
              </div>
            </div>
          </>
            )}

          </section>
        )}
          </motion.div>
        </div>
      </main>
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
