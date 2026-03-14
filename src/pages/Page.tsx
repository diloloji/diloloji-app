import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useThemeContext } from '../contexts/ThemeContext';
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
import { getVerbExample } from '../data/verbExamples';
import { getTenseExplanation } from '../data/tenseExplanations';
import { getVerbMetadata } from '../data/verbMetadata';
import { translateWord } from '../services/dictionaryApi';
import { getMistakes, getDueMistakes, addMistake, updateMistakeReview, type MistakeEntry } from '../utils/mistakeBank';
import { getStarredVerbs, toggleStarredVerb, isStarredVerb } from '../utils/starredVerbs';
import { getActivityHistory, getLastNDays, addActivityToday } from '../utils/activityHistory';
import { getFlashcardDecks, addCardToDeck, type FlashcardDeck } from '../utils/flashcardDecks';
import { useXp } from '../contexts/XpContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { BookA } from 'lucide-react';
import EzberMakinesi from '../components/EzberMakinesi';
import AuthModal from '../components/AuthModal';
import AccentKeyboard from '../components/AccentKeyboard';
import { sanitizeForDisplay } from '../utils/sanitize';

type Mode = 'learning' | 'quiz' | 'review' | 'starred' | 'time-attack' | 'compare';
type AppMode = 'conjugation' | 'ezber';

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

/** Zamana Karşı: rastgele fiil + zamir + zaman (dil bazlı). */
function getRandomTimeAttackQuestion(lang: AppLanguage): { verbKey: string; pronoun: string; tense: string } | null {
  const tenses = getTenses(lang);
  const pronouns = getPronouns(lang);
  const pronounIds = pronouns.map((p) => p.id);
  for (let i = 0; i < 15; i++) {
    const verb = getRandomVerbForLang(lang);
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
    .trim();
}

/** Zamirli doğru cevaptan sadece fiil kısmını çıkarır (elision dahil: j'aime → aime). */
function stripPronounPrefix(normalizedCorrect: string): string {
  return normalizedCorrect
    .replace(
      /^(j'|je |tu |il\/elle |il |elle |nous |vous |ils\/elles |ils |elles )/i,
      ''
    )
    .trim();
}

/**
 * Esnek doğrulama: Kullanıcı cevabı (boşlukları silinmiş, küçük harf) şunlardan
 * HERHANGİ BİRİNE uyuyorsa DOĞRU kabul edilir:
 * - Sadece çekimlenmiş fiil (örn. 'finit', 'suis', 'allé')
 * - Zamir ile birlikte (örn. 'il finit', 'j'aime', 'il/elle finit')
 */
function checkOne(user: string, correct: string): boolean {
  const a = normalizeAnswer(user);
  if (a === '') return false;
  const fullNorm = normalizeAnswer(correct);
  const verbOnly = stripPronounPrefix(fullNorm);
  return a === verbOnly || a === fullNorm;
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
  const { t, i18n } = useTranslation();

  const [verbInput, setVerbInput] = useState('');
  const [verbKey, setVerbKey] = useState<string | null>(null);
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
  const [selectedTense, setSelectedTense] = useState<string>(() => getTenses('fr')[0].id);
  const [mode, setMode] = useState<Mode>('learning');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(() => getInitialUserAnswers('fr'));
  const [quizFeedback, setQuizFeedback] = useState<Record<string, 'correct' | 'wrong' | null>>(() =>
    Object.fromEntries(getPronouns('fr').map((p) => [p.id, null as 'correct' | 'wrong' | null]))
  );
  /** Passé Composé için özel ipuçları (Fransızca); İspanyolca için boş kullanılabilir */
  const [quizPasséHint, setQuizPasséHint] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(getPronouns('fr').map((p) => [p.id, null as string | null]))
  );
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
  const [isReflexive, setIsReflexive] = useState(false);
  const [isNegative, setIsNegative] = useState(false);
  const [copiedRowKey, setCopiedRowKey] = useState<string | null>(null);

  /** Quiz görünümü: 'list' = Liste, 'focus' = Odak modu (tek şahıs) */
  const [quizLayout, setQuizLayout] = useState<'list' | 'focus'>('list');
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [uiLangDropdownOpen, setUiLangDropdownOpen] = useState(false);
  const uiLangDropdownRef = useRef<HTMLDivElement>(null);
  const [addToSetOpen, setAddToSetOpen] = useState(false);
  const addToSetRef = useRef<HTMLDivElement>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  /** Üyelik sistemi: şimdilik mock — true yaparak giriş yapmış kullanıcıyı simüle edebilirsin */
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  /** Zamana Karşı (Arcade): süre, soru, skor, combo, can, oyun bitti */
  const [timeAttackTimeLeft, setTimeAttackTimeLeft] = useState(60);
  const [timeAttackQuestion, setTimeAttackQuestion] = useState<{ verbKey: string; pronoun: string; tense: string } | null>(null);
  const [timeAttackInput, setTimeAttackInput] = useState('');
  const [timeAttackScore, setTimeAttackScore] = useState(0);
  const [timeAttackCombo, setTimeAttackCombo] = useState(1);
  const [timeAttackLives, setTimeAttackLives] = useState(3);
  const [timeAttackCorrectCount, setTimeAttackCorrectCount] = useState(0);
  const [timeAttackMaxCombo, setTimeAttackMaxCombo] = useState(1);
  const [timeAttackGameOver, setTimeAttackGameOver] = useState(false);
  const [timeAttackFeedback, setTimeAttackFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timeAttackPointsFlash, setTimeAttackPointsFlash] = useState<number | null>(null);
  const [timeAttackShake, setTimeAttackShake] = useState(false);
  const timeAttackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeAttackXpAwardedRef = useRef(false);

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

  /** Zaman/Kip custom dropdown: açık/kapalı + tıklama dışı kapatma */
  const [tenseDropdownOpen, setTenseDropdownOpen] = useState(false);
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

  /** UI dil dropdown: dış tıklamada kapat */
  useEffect(() => {
    if (!uiLangDropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (uiLangDropdownRef.current && !uiLangDropdownRef.current.contains(e.target as Node)) {
        setUiLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [uiLangDropdownOpen]);

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

  const handleAddVerbToSet = useCallback(
    (deckId: string, _deckTitle: string, verbKey: string, lang: AppLanguage) => {
      const back = getTranslationOrPlaceholder(verbKey, lang);
      const ok = addCardToDeck(deckId, { front: verbKey, back });
      setToastMessage(ok ? 'Fiil set\'e eklendi.' : 'Eklenemedi.');
      setAddToSetOpen(false);
    },
    []
  );

  /** Kıyaslama sekmesi: iki zaman seçici */
  const [compareTense1, setCompareTense1] = useState<string>(() => getTenses('fr')[0].id);
  const [compareTense2, setCompareTense2] = useState<string>(() => getTenses('fr')[1].id);
  const [compareDropdown1Open, setCompareDropdown1Open] = useState(false);
  const [compareDropdown2Open, setCompareDropdown2Open] = useState(false);
  const compareDropdown1Ref = useRef<HTMLDivElement>(null);
  const compareDropdown2Ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h1 = (e: MouseEvent) => {
      if (compareDropdown1Ref.current && !compareDropdown1Ref.current.contains(e.target as Node)) setCompareDropdown1Open(false);
    };
    const h2 = (e: MouseEvent) => {
      if (compareDropdown2Ref.current && !compareDropdown2Ref.current.contains(e.target as Node)) setCompareDropdown2Open(false);
    };
    if (compareDropdown1Open) document.addEventListener('mousedown', h1);
    if (compareDropdown2Open) document.addEventListener('mousedown', h2);
    return () => {
      document.removeEventListener('mousedown', h1);
      document.removeEventListener('mousedown', h2);
    };
  }, [compareDropdown1Open, compareDropdown2Open]);

  /** Tema: global context, mounted sonrası butonu göster (hydration uyumu) */
  const { isDark, toggleTheme, mounted: themeMounted } = useThemeContext();

  /** Dil değişince: tam sıfırlama — fiil, arama metni, anlam, hata temizlenir; "Laboratuvar Hazır!" boş ekranına dönülür */
  useEffect(() => {
    const tenses = tensesForLang;
    setSelectedTense(tenses[0].id);
    setCompareTense1(tenses[0]?.id ?? '');
    setCompareTense2(tenses[1]?.id ?? tenses[0]?.id ?? '');
    setVerbInput('');
    setVerbKey(null);
    setConjugations(null);
    setError('');
    setReverseLookupInfo(null);
    setTranslation(null);
    setDynamicMeaning(null);
    setIsMeaningLoading(false);
    setUserAnswers(getInitialUserAnswers(selectedLanguage));
    setQuizFeedback(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as 'correct' | 'wrong' | null])));
    setQuizPasséHint(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as string | null])));
    requestAnimationFrame(() => verbInputRef.current?.focus());
  }, [selectedLanguage]);

  /** Review (Tekrar) modu: gösterilen soru ve kullanıcı cevabı */
  const [reviewEntry, setReviewEntry] = useState<MistakeEntry | null>(null);
  const [reviewAnswer, setReviewAnswer] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewCorrect, setReviewCorrect] = useState(false);
  const reviewHadWrongRef = useRef(false);

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

  /** Otomatik tamamlama: Lefff fiil listesi (bir kez yükle). */
  const verbList = useMemo(() => getVerbListForLang(selectedLanguage), [selectedLanguage]);

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
    try {
      const result = getConjugationsForLang(toLoad, selectedTense, effectiveLang);
      if (result && result.ok) {
        const conj = result.conjugations;
        if (conj && typeof conj === 'object' && Object.keys(conj).length > 0) {
          const verified = verifyConjugationMap(conj, selectedTense, effectiveLang);
          if (overrideVerb) setVerbInput(sanitizeForDisplay(overrideVerb));
          setVerbKey(result.infinitive);
          setConjugations(verified);
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
  }, [verbInput, selectedTense, selectedLanguage]);

  loadVerbRef.current = loadVerb;

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
        setError('');
        setUserAnswers(getInitialUserAnswers(selectedLanguage));
        setQuizFeedback({ je: null, tu: null, il: null, nous: null, vous: null, ils: null });
        setQuizPasséHint({ je: null, tu: null, il: null, nous: null, vous: null, ils: null });
        setShowHints(false);
        setShowCongrats(false);
        setCurrentFocusIndex(0);
        requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
        return;
      }
    }
    setError('Yeni rastgele fiil seçilemedi. Lütfen tekrar deneyin.');
  }, [selectedTense, selectedLanguage, verbKey]);

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

  /** Güncel fiil ref'i (çeviri fallback'te stale response'ı önlemek için) */
  useEffect(() => {
    verbKeyRef.current = verbKey;
  }, [verbKey]);

  /** Fiil veya dil değişince dictionaryApi ile Türkçe anlamı çek */
  useEffect(() => {
    if (!verbKey) {
      setTranslation(null);
      setDynamicMeaning(null);
      setIsMeaningLoading(false);
      return;
    }
    const dir = selectedLanguage === 'fr' ? 'fr-tr' as const : 'es-tr' as const;
    setIsMeaningLoading(true);
    setDynamicMeaning(null);
    setTranslation(null);
    let cancelled = false;
    translateWord(verbKey, dir)
      .then((res) => {
        if (cancelled || verbKeyRef.current !== verbKey) return;
        if (res?.target) {
          const text = res.target.charAt(0).toUpperCase() + res.target.slice(1).toLowerCase();
          setDynamicMeaning(text);
          setTranslation(text);
        }
      })
      .catch(() => {
        if (!cancelled && verbKeyRef.current === verbKey) {
          setDynamicMeaning(null);
          setTranslation(null);
        }
      })
      .finally(() => {
        if (!cancelled && verbKeyRef.current === verbKey) setIsMeaningLoading(false);
      });
    return () => { cancelled = true; };
  }, [verbKey, selectedLanguage]);

  // Yeni fiil yüklendiğinde quiz cevaplarını ve ipucunu sıfırla (doğru cevaplar kütüphaneden gelen conjugations ile güncellenir)
  useEffect(() => {
    setUserAnswers(getInitialUserAnswers(selectedLanguage));
    setQuizFeedback(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as 'correct' | 'wrong' | null])));
    setQuizPasséHint(Object.fromEntries(pronounsForLang.map((p) => [p.id, null as string | null])));
    setShowHints(false);
    setShowCongrats(false);
    setCombo(0);
    setCurrentFocusIndex(0);
  }, [verbKey, selectedLanguage, pronounsForLang]);

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

  // Zamana Karşı: moda girince süre ve soru başlat; saniye sayacı
  useEffect(() => {
    if (mode !== 'time-attack') {
      if (timeAttackTimerRef.current) {
        clearInterval(timeAttackTimerRef.current);
        timeAttackTimerRef.current = null;
      }
      return;
    }
    setTimeAttackGameOver(false);
    setTimeAttackTimeLeft(60);
    setTimeAttackScore(0);
    setTimeAttackCombo(1);
    setTimeAttackLives(3);
    setTimeAttackCorrectCount(0);
    setTimeAttackMaxCombo(1);
    setTimeAttackInput('');
    setTimeAttackFeedback(null);
    setTimeAttackPointsFlash(null);
    setTimeAttackShake(false);
    setTimeAttackQuestion(getRandomTimeAttackQuestion(selectedLanguage));
    timeAttackTimerRef.current = setInterval(() => {
      setTimeAttackTimeLeft((t) => {
        if (t <= 1) {
          if (timeAttackTimerRef.current) {
            clearInterval(timeAttackTimerRef.current);
            timeAttackTimerRef.current = null;
          }
          setTimeAttackGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timeAttackTimerRef.current) {
        clearInterval(timeAttackTimerRef.current);
        timeAttackTimerRef.current = null;
      }
    };
  }, [mode]);

  const restartTimeAttack = useCallback(() => {
    if (timeAttackTimerRef.current) {
      clearInterval(timeAttackTimerRef.current);
      timeAttackTimerRef.current = null;
    }
    setTimeAttackGameOver(false);
    setTimeAttackTimeLeft(60);
    setTimeAttackScore(0);
    setTimeAttackCombo(1);
    setTimeAttackLives(3);
    setTimeAttackCorrectCount(0);
    setTimeAttackMaxCombo(1);
    setTimeAttackPointsFlash(null);
    setTimeAttackShake(false);
    setTimeAttackQuestion(getRandomTimeAttackQuestion(selectedLanguage));
    setTimeAttackInput('');
    setTimeAttackFeedback(null);
    timeAttackTimerRef.current = setInterval(() => {
      setTimeAttackTimeLeft((t) => {
        if (t <= 1) {
          if (timeAttackTimerRef.current) {
            clearInterval(timeAttackTimerRef.current);
            timeAttackTimerRef.current = null;
          }
          setTimeAttackGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  const submitTimeAttackAnswer = useCallback(() => {
    const q = timeAttackQuestion;
    if (!q || timeAttackGameOver || !timeAttackInput.trim()) return;
    const conjugations = getConjugationForTenseForLang(q.verbKey, q.tense, selectedLanguage);
    const correct = conjugations[q.pronoun] ?? '';
    const isCorrect = checkOne(timeAttackInput.trim(), correct);
    setTimeAttackFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      const points = 10 * timeAttackCombo;
      setTimeAttackScore((s) => s + points);
      setTimeAttackCombo((c) => c + 1);
      setTimeAttackCorrectCount((n) => n + 1);
      setTimeAttackMaxCombo((m) => Math.max(m, timeAttackCombo + 1));
      setTimeAttackPointsFlash(points);
      setTimeout(() => setTimeAttackPointsFlash(null), 600);
      setTimeAttackTimeLeft((t) => t + 2);
      addActivityToday(1);
    } else {
      setTimeAttackLives((l) => {
        const next = l - 1;
        if (next <= 0 && timeAttackTimerRef.current) {
          clearInterval(timeAttackTimerRef.current);
          timeAttackTimerRef.current = null;
          setTimeAttackGameOver(true);
        }
        return Math.max(0, next);
      });
      setTimeAttackCombo(1);
      setTimeAttackShake(true);
      setTimeout(() => setTimeAttackShake(false), 400);
    }
    setTimeAttackInput('');
    setTimeAttackQuestion(getRandomTimeAttackQuestion(selectedLanguage));
    setTimeout(() => setTimeAttackFeedback(null), 800);
  }, [timeAttackQuestion, timeAttackGameOver, timeAttackInput, timeAttackCombo]);

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
    const next: Record<string, 'correct' | 'wrong' | null> = {};
    const nextHints: Record<string, string | null> = Object.fromEntries(pronounIds.map((p) => [p, null]));
    pronounIds.forEach((pronoun) => {
      const user = userAnswers[pronoun];
      const correct = conjugations[pronoun];
      const isCorrect = user.trim() === '' ? null : checkOne(user, correct);
      next[pronoun] = isCorrect === null ? null : isCorrect ? 'correct' : 'wrong';
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
    setQuizFeedback({ je: null, tu: null, il: null, nous: null, vous: null, ils: null });
    setQuizPasséHint({ je: null, tu: null, il: null, nous: null, vous: null, ils: null });
    setShowHints(false);
    setShowCongrats(false);
    setCurrentFocusIndex(0);
    requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
  }, []);

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
      if (e.key === 'Escape' && isMobileMenuOpen) {
        e.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }
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
  }, [mode, verbKey, resetQuiz, showActivityModal, tenseDetailModalOpen, isMobileMenuOpen]);

  const conjugationsForDisplay = conjugations;

  /** Tekrar zamanı gelmiş (nextReviewDate <= bugün) kayıt sayısı — rozette bu gösterilir. */
  const dueCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return mistakeBank.filter((e) => e.nextReviewDate <= today).length;
  }, [mistakeBank]);

  /** Quiz inputları: Enter ile kontrol. Doğruysa sonraki boş inputa focus; yanlışsa aynı inputta kal. */
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
      const isCorrect = checkOne(userRaw, correct);
      setQuizFeedback((prev) => ({ ...prev, [pronoun]: isCorrect ? 'correct' : 'wrong' }));
      if (!isCorrect) {
        setCombo(0);
        if (verbKey) addToMistakeBank(verbKey, selectedTense, pronoun);
        if (selectedLanguage === 'fr' && selectedTense === 'passe-compose' && verbKey) {
          const hint = checkPasséComposéLogic(userRaw, correct, pronoun as import('../data/verbs').Pronoun, verbKey);
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: hint }));
        } else {
          setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
        }
        return;
      }
      setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
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
      }
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
        pronounIds.every((p) => checkOne(userAnswers[p], conjugationsForDisplay[p]));
      if (allCorrect) setShowCongrats(true);
      else if (currentIndex < pronounIds.length - 1)
        requestAnimationFrame(() => quizInputRefs.current[currentIndex + 1]?.focus());
    },
    [conjugationsForDisplay, userAnswers, showHints, selectedTense, verbKey, addToMistakeBank]
  );

  /** Odak modu: tek şahıs kontrolü. Doğruysa sonraki şahısa geç, yanlışsa aynı yerde kal. */
  const handleFocusModeSubmit = useCallback(() => {
    if (!conjugationsForDisplay || currentFocusIndex >= pronounIds.length) return;
    const pronoun = pronounIds[currentFocusIndex];
    const userRaw = userAnswers[pronoun];
    const user = userRaw.trim();
    if (!user) {
      setQuizEmptyShake(pronoun);
      setTimeout(() => setQuizEmptyShake(null), 500);
      return;
    }
    const correct = conjugationsForDisplay[pronoun];
    const isCorrect = checkOne(userRaw, correct);
    setQuizFeedback((prev) => ({ ...prev, [pronoun]: isCorrect ? 'correct' : 'wrong' }));
    if (!isCorrect) {
      setCombo(0);
      if (verbKey) addToMistakeBank(verbKey, selectedTense, pronoun);
      if (selectedLanguage === 'fr' && selectedTense === 'passe-compose' && verbKey) {
        const hint = checkPasséComposéLogic(user, correct, pronoun as import('../data/verbs').Pronoun, verbKey);
        setQuizPasséHint((prev) => ({ ...prev, [pronoun]: hint }));
      } else {
        setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
      }
      return;
    }
    setQuizPasséHint((prev) => ({ ...prev, [pronoun]: null }));
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
    }
    setCurrentFocusIndex((i) => i + 1);
    requestAnimationFrame(() => quizInputRefs.current[0]?.focus());
  }, [conjugationsForDisplay, userAnswers, currentFocusIndex, showHints, selectedTense, verbKey, addToMistakeBank]);

  const SITE_URL = 'https://diloloji.com';
  const isEzber = location.pathname === '/ezber-makinesi';
  const seoTitle = isEzber ? 'Ezber Makinesi | Diloloji' : 'Fiil Laboratuvarı | Diloloji';
  const seoDescription = isEzber
    ? 'Fransızca ve İspanyolca fiil çekimlerini ezberleyin. Alıştırma, zamana karşı ve kıyaslama modları ile pratik yapın.'
    : 'Fransızca ve İspanyolca fiil çekimlerini öğrenin. Tüm zamanlar, mastar, ulaç ve örnek cümlelerle fiil laboratuvarı.';
  const seoUrl = `${SITE_URL}${location.pathname}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 print:bg-white">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={seoUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={seoUrl} />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* Üst menü (Navbar) — glassmorphism, minimalist, premium */}
      <header data-print-hide className="w-full flex justify-between items-center py-3 px-4 sm:px-5 bg-transparent dark:bg-transparent backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/50 sticky top-0 z-50 transition-all duration-300 print:hidden">
        {/* Sol: Logo + slogan — dikey hizalı, slogan küçük ve hafif */}
        <div className="min-w-0 flex items-center gap-2 sm:gap-3 flex-1">
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 shrink-0 transition-all duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-lg"
            aria-label="Ana sayfa"
          >
            <img src="/logo.svg" alt="Diloloji" className="h-8 sm:h-10 w-auto shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:hidden shrink-0">
              Diloloji
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs italic hidden md:inline shrink-0 opacity-60">
              Dilin matematiğini çöz.
            </span>
          </Link>
          {/* Menü: yatay liste, hover arka plan, aktif indigo + nokta */}
          <nav className="ml-4 md:ml-6 hidden md:flex items-center gap-0.5" role="tablist" aria-label="Uygulama modu">
            <Link
              to="/fiil-laboratuvari"
              role="tab"
              aria-selected={appMode === 'conjugation'}
              className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                appMode === 'conjugation'
                  ? 'text-indigo-500 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40'
              }`}
            >
              {t('fiil_laboratuvari')}
              {appMode === 'conjugation' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400" aria-hidden />}
            </Link>
            <Link
              to="/ezber-makinesi"
              role="tab"
              aria-selected={appMode === 'ezber'}
              className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                appMode === 'ezber'
                  ? 'text-indigo-500 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40'
              }`}
            >
              {t('ezber_makinesi')}
              {appMode === 'ezber' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400" aria-hidden />}
            </Link>
            <Link
              to="/sozluk"
              role="tab"
              aria-selected={location.pathname === '/sozluk'}
              className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-1 dark:focus:ring-offset-slate-900 flex items-center gap-1.5 ${
                location.pathname === '/sozluk'
                  ? 'text-indigo-500 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40'
              }`}
            >
              <BookA className="w-4 h-4" strokeWidth={2} aria-hidden />
              {t('sozluk')}
              {location.pathname === '/sozluk' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400" aria-hidden />}
            </Link>
            <Link
              to="/ogrenme"
              role="tab"
              aria-selected={location.pathname === '/ogrenme'}
              className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                location.pathname === '/ogrenme'
                  ? 'text-indigo-500 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40'
              }`}
            >
              {t('ogrenme')}
              {location.pathname === '/ogrenme' && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400" aria-hidden />}
            </Link>
          </nav>
        </div>

        {/* Sağ: İkonlar (kompakt, yumuşak gri → hover rengi) + Giriş Yap (gradyan) */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowActivityModal(true)}
              className="flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 tabular-nums hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded px-1.5 py-1"
              title="Aktivite haritası"
              aria-label="Puan ve aktivite haritası"
            >
              <span aria-live="polite">{totalScore}</span>
              <span className="opacity-60" aria-hidden>•</span>
              <span aria-live="polite">{combo}</span>
            </button>
            <button
              type="button"
              onClick={openReviewMode}
              className="flex items-center gap-1 rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-800/40 dark:hover:bg-slate-700/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
              title="Zorlandıklarım"
              aria-label="Zorlandıklarım"
            >
              <span className="text-base leading-none w-5 h-5 inline-flex items-center justify-center" aria-hidden>🧠</span>
              <span className="tabular-nums text-xs font-medium ml-0.5" aria-live="polite">{dueCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('starred')}
              className="flex items-center gap-1 rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-slate-800/40 dark:hover:bg-slate-700/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
              title="Yıldızlı Fiillerim"
              aria-label="Yıldızlı Fiillerim"
            >
              <span className="text-base leading-none w-5 h-5 inline-flex items-center justify-center" aria-hidden>⭐</span>
              <span className="tabular-nums text-xs font-medium ml-0.5">{starredVerbs.length}</span>
            </button>
          </div>
          {!themeMounted ? (
            <div className="rounded-lg h-9 w-9 shrink-0 flex items-center justify-center bg-slate-800/30" aria-hidden />
          ) : (
            <button
              type="button"
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-800/40 dark:hover:bg-slate-700/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
              title={isDark ? 'Açık mod' : 'Karanlık mod'}
              aria-label={isDark ? 'Açık moda geç' : 'Karanlık moda geç'}
            >
              <span className="text-base w-5 h-5 inline-flex items-center justify-center leading-none" aria-hidden>{isDark ? '☀️' : '🌙'}</span>
            </button>
          )}
          <div className="relative shrink-0 flex items-center" ref={uiLangDropdownRef}>
            <button
              type="button"
              onClick={() => setUiLangDropdownOpen((o) => !o)}
              className="h-9 flex items-center justify-center gap-1 rounded-lg px-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-800/40 dark:hover:bg-slate-700/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
              title={t('arayuz_dili')}
              aria-label={t('dil_secin')}
              aria-expanded={uiLangDropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="text-base w-5 h-5 inline-flex items-center justify-center leading-none" aria-hidden>🌐</span>
              <span className="text-xs font-medium uppercase tabular-nums">{['tr', 'en', 'fr', 'es'].includes((i18n.language || 'tr').slice(0, 2)) ? (i18n.language || 'tr').slice(0, 2).toUpperCase() : 'TR'}</span>
            </button>
            {uiLangDropdownOpen && (
              <div
                role="listbox"
                aria-label={t('dil_secin')}
                className="absolute right-0 top-full mt-1.5 w-max min-w-[120px] rounded-xl border border-slate-200 dark:border-slate-600 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-xl py-1 z-50"
              >
                {(['tr', 'en', 'fr', 'es'] as const).map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    role="option"
                    aria-selected={i18n.language === lng}
                    onClick={() => {
                      i18n.changeLanguage(lng);
                      setUiLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                      i18n.language === lng
                        ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                    }`}
                  >
                    {t(lng === 'tr' ? 'lang_turkce' : lng === 'en' ? 'lang_english' : lng === 'fr' ? 'lang_francais' : 'lang_espanol')}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isLoggedIn ? (
            <div className="flex items-center gap-2 shrink-0 ml-1 h-9">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/80 text-white text-sm font-bold shadow-md" aria-hidden>K</div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums hidden sm:inline">Lvl {level}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium px-4 py-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 shrink-0"
              aria-label={t('giris_yap')}
            >
              {t('giris_yap')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((o) => !o)}
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-800/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          >
            <span className="text-lg leading-none" aria-hidden>☰</span>
          </button>
        </div>
      </header>

      {/* Mobil hamburger menü paneli */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-[52px] z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md md:hidden animate-menu-in"
          role="dialog"
          aria-modal="true"
          aria-label="Navigasyon menüsü"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <nav className="flex flex-col p-4 pt-6 gap-1 max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <Link
              to="/fiil-laboratuvari"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full py-3 px-4 rounded-xl text-left text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                appMode === 'conjugation'
                  ? 'bg-indigo-500/20 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-200 border border-indigo-400/30'
                  : 'bg-slate-800/60 dark:bg-slate-800/80 text-slate-200 dark:text-slate-100 hover:bg-slate-700/60 dark:hover:bg-slate-700/80 border border-slate-600/50'
              }`}
            >
              {t('fiil_laboratuvari')}
            </Link>
            <Link
              to="/ezber-makinesi"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full py-3 px-4 rounded-xl text-left text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                appMode === 'ezber'
                  ? 'bg-indigo-500/20 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-200 border border-indigo-400/30'
                  : 'bg-slate-800/60 dark:bg-slate-800/80 text-slate-200 dark:text-slate-100 hover:bg-slate-700/60 dark:hover:bg-slate-700/80 border border-slate-600/50'
              }`}
            >
              {t('ezber_makinesi')}
            </Link>
            <Link
              to="/sozluk"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full py-3 px-4 rounded-xl text-left text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex items-center gap-2 ${
                location.pathname === '/sozluk'
                  ? 'bg-indigo-500/20 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-200 border border-indigo-400/30'
                  : 'bg-slate-800/60 dark:bg-slate-800/80 text-slate-200 dark:text-slate-100 hover:bg-slate-700/60 dark:hover:bg-slate-700/80 border border-slate-600/50'
              }`}
            >
              <BookA className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden />
              {t('sozluk')}
            </Link>
            <Link
              to="/ogrenme"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`w-full py-3 px-4 rounded-xl text-left text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                location.pathname === '/ogrenme'
                  ? 'bg-indigo-500/20 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-200 border border-indigo-400/30'
                  : 'bg-slate-800/60 dark:bg-slate-800/80 text-slate-200 dark:text-slate-100 hover:bg-slate-700/60 dark:hover:bg-slate-700/80 border border-slate-600/50'
              }`}
            >
              {t('ogrenme')}
            </Link>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => { setIsMobileMenuOpen(false); setShowAuthModal(true); }}
                className="w-full py-3 px-4 rounded-xl text-left text-base font-medium bg-slate-800/60 dark:bg-slate-800/80 text-indigo-300 dark:text-indigo-300 border border-slate-600/50 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/20 hover:border-indigo-400/30 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {t('giris_yap')}
              </button>
            )}
            {/* Hedef dil (fiil çekimi) — FR/ES */}
            <div className="my-4 pt-6 border-t border-slate-700/80 flex justify-center items-center">
              <div
                className="flex items-center bg-slate-800 p-1 rounded-full border border-slate-600"
                role="group"
                aria-label={t('dil_secin')}
              >
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('fr')}
                  title="Fransızca"
                  aria-pressed={selectedLanguage === 'fr'}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    selectedLanguage === 'fr'
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'bg-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span aria-hidden>🇫🇷</span>
                  <span>FR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('es')}
                  title="İspanyolca"
                  aria-pressed={selectedLanguage === 'es'}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    selectedLanguage === 'es'
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'bg-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span aria-hidden>🇪🇸</span>
                  <span>ES</span>
                </button>
              </div>
            </div>
            {/* Arayüz dili (i18n) — TR/EN/FR/ES */}
            <div className="my-4 pt-4 border-t border-slate-700/80">
              <p className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">{t('arayuz_dili')}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {(['tr', 'en', 'fr', 'es'] as const).map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    onClick={() => {
                      i18n.changeLanguage(lng);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      i18n.language === lng
                        ? 'bg-indigo-500/30 dark:bg-indigo-500/40 text-indigo-200 dark:text-indigo-100 border border-indigo-400/50'
                        : 'bg-slate-800/60 dark:bg-slate-800/80 text-slate-300 dark:text-slate-300 hover:bg-slate-700/80 border border-slate-600/50'
                    }`}
                  >
                    {t(lng === 'tr' ? 'lang_turkce' : lng === 'en' ? 'lang_english' : lng === 'fr' ? 'lang_francais' : 'lang_espanol')}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}

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
      <main className="max-w-7xl w-full mx-auto px-4 md:px-8 py-4 pb-24 md:pb-20">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Sol sütun: Kontrol paneli (mobilde en üstte) — 4 kolon */}
          <aside data-print-hide className="flex flex-col gap-4 lg:col-span-4 order-1 print:hidden lg:sticky lg:top-6 lg:self-start">
            {/* Entegre dil seçici — arama alanının hemen üzerinde, segmented control */}
            <section className="relative z-10 shrink-0 w-full">
              <div
                className="grid grid-cols-2 gap-2 w-full p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600"
                role="tablist"
                aria-label="Dil seçin"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedLanguage === 'fr'}
                  onClick={() => {
                    setSelectedLanguage('fr');
                    setVerbKey(null);
                    setConjugations(null);
                    setVerbInput('');
                    setError('');
                    if (verbKey) loadVerb(verbKey);
                  }}
                  title="Fransızca"
                  className={`flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-1 dark:focus:ring-offset-slate-800 ${
                    selectedLanguage === 'fr'
                      ? 'bg-indigo-500 text-white shadow-[0_0_14px_rgba(99,102,241,0.45)] dark:shadow-[0_0_18px_rgba(129,140,248,0.4)] border border-indigo-400/50'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 border border-transparent opacity-70 hover:opacity-90'
                  }`}
                >
                  <span aria-hidden>🇫🇷</span>
                  Fransızca
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedLanguage === 'es'}
                  onClick={() => {
                    setSelectedLanguage('es');
                    setVerbKey(null);
                    setConjugations(null);
                    setVerbInput('');
                    setError('');
                    if (verbKey) loadVerb(verbKey);
                  }}
                  title="İspanyolca"
                  className={`flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-1 dark:focus:ring-offset-slate-800 ${
                    selectedLanguage === 'es'
                      ? 'bg-indigo-500 text-white shadow-[0_0_14px_rgba(99,102,241,0.45)] dark:shadow-[0_0_18px_rgba(129,140,248,0.4)] border border-indigo-400/50'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 border border-transparent opacity-70 hover:opacity-90'
                  }`}
                >
                  <span aria-hidden>🇪🇸</span>
                  İspanyolca
                </button>
              </div>
            </section>
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
            {/* Zaman açıklaması kartı — sol panelde + Detaylı İncele */}
            {getTenseExplanation(selectedLanguage, selectedTense) && (
              <div className="rounded-xl bg-blue-900/20 dark:bg-blue-900/30 border border-blue-500/30 dark:border-blue-400/40 p-4 flex flex-col gap-0 backdrop-blur-sm transition-all duration-200">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0" aria-hidden>ℹ️</span>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {getTenseExplanation(selectedLanguage, selectedTense)?.shortDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTenseDetailModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-200 hover:bg-blue-600/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  aria-label="Zaman açıklaması detayı"
                >
                  Detaylı İncele ➔
                </button>
              </div>
            )}
            {/* Tüm Zamanları Göster — sadece fiil sonucu varken göster */}
            {verbKey && conjugations && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAllTenses((v) => !v)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    showAllTenses
                      ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  aria-pressed={showAllTenses}
                  aria-label={showAllTenses ? t('tekli_gorunume_don') : t('tum_zamanlari_goster')}
                >
                  {t('tum_zamanlari_goster')}
                </button>
              </div>
            )}
          </aside>

          {/* Sağ sütun: Sekmeler + ana çalışma alanı — 8 kolon (dil değişiminde fade) */}
          <motion.div
            key={selectedLanguage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-4 lg:col-span-8 order-2 print:col-span-12 print:bg-white print:text-black min-w-0"
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
                    {reviewSubmitted && !reviewCorrect && (
                      <p className="mt-3 text-sm text-red-300">
                        Doğru cevap: <strong className="text-slate-200">{correctValue}</strong>
                      </p>
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

        {/* Boş durum + Öğrenme/Alıştırma — tek kart, üstte sekmeler */}
        {mode !== 'review' && mode !== 'starred' && (
          <section className="rounded-2xl bg-white dark:bg-slate-800/80 shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700/50 overflow-visible mb-4 mt-6 md:mt-0 backdrop-blur-md transition-colors duration-300 min-h-[400px] print:shadow-none print:border print:border-slate-200">
            {/* Kart başlığı sekmeleri — mobilde yatay kaydırılabilir, masaüstünde ortalanmış */}
            <div className="flex justify-start md:justify-center overflow-x-auto overflow-y-hidden scrollbar-hide print:hidden pt-4 pb-3 px-1 -mx-1">
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

            {/* Zamana Karşı (Arcade): HUD + oyun alanı veya sonuç kartı */}
            {mode === 'time-attack' && (
              <div className={`p-6 sm:p-8 relative ${timeAttackShake ? 'animate-time-attack-shake' : ''}`}>
                {timeAttackGameOver ? (
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-600/80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl p-8 max-w-md mx-auto text-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Oyun Bitti!</h2>
                    <dl className="space-y-3 text-left max-w-xs mx-auto">
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Toplam Skorun</dt>
                        <dd className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{timeAttackScore}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">En Yüksek Kombon</dt>
                        <dd className="font-bold text-orange-500 dark:text-orange-400">x{timeAttackMaxCombo}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500 dark:text-slate-400">Doğru Bilinen Fiil Sayısı</dt>
                        <dd className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{timeAttackCorrectCount}</dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      onClick={restartTimeAttack}
                      className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 dark:from-violet-500 dark:to-indigo-500 dark:hover:from-violet-400 dark:hover:to-indigo-400 text-white font-bold text-lg shadow-lg shadow-indigo-500/25 transition-all duration-300"
                    >
                      Tekrar Oyna
                    </button>
                  </div>
                ) : (
                  <>
                    {/* HUD: Süre | Skor & Kombo | Canlar */}
                    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                      <div className={`flex items-center gap-2 font-mono text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100 ${timeAttackTimeLeft <= 15 ? 'animate-pulse text-red-600 dark:text-red-400' : ''}`}>
                        <span aria-hidden>⏱</span>
                        {Math.floor(timeAttackTimeLeft / 60)}:{(timeAttackTimeLeft % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          SKOR: <span className="text-indigo-600 dark:text-indigo-400 tabular-nums">{timeAttackScore}</span>
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">|</span>
                        <span className={`text-sm font-bold ${timeAttackCombo > 3 ? 'text-orange-500 dark:text-orange-400 scale-110' : 'text-slate-600 dark:text-slate-300'}`}>
                          x{timeAttackCombo} COMBO 🔥
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5" aria-label={`${timeAttackLives} can`}>
                        {[1, 2, 3].map((i) => (
                          <span key={i} className="text-xl" aria-hidden>
                            {i <= timeAttackLives ? '❤️' : '🖤'}
                          </span>
                        ))}
                      </div>
                    </div>
                    {timeAttackPointsFlash !== null && (
                      <p className="text-center text-2xl font-bold text-green-500 dark:text-green-400 animate-pulse mb-2">
                        +{timeAttackPointsFlash}
                      </p>
                    )}
                    {timeAttackQuestion && (
                      <>
                        <p className="text-slate-600 dark:text-slate-300 text-center mb-1">
                          <span className="font-semibold capitalize text-slate-800 dark:text-slate-100">{timeAttackQuestion.verbKey}</span>
                          {' — '}
                          <span>{pronounsForLang.find((p) => p.id === timeAttackQuestion.pronoun)?.label}</span>
                          {' — '}
                          <span>{tensesForLang.find((t) => t.id === timeAttackQuestion.tense)?.label}</span>
                        </p>
                        <div className="flex flex-col gap-2 mt-4 max-w-md mx-auto">
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
                              className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-4 py-3 text-base placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                              autoComplete="off"
                              autoFocus
                            />
                            <button
                            type="button"
                              onClick={submitTimeAttackAnswer}
                              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium px-5 py-3 transition-colors duration-300"
                            >
                              Kontrol
                            </button>
                          </div>
                          <AccentKeyboard
                            lang={selectedLanguage}
                            onInsert={(char) => {
                              setTimeAttackInput((prev) => prev + char);
                              requestAnimationFrame(() => timeAttackInputRef.current?.focus());
                            }}
                          />
                        </div>
                        {timeAttackFeedback === 'correct' && (
                          <p className="text-center mt-3 text-green-600 dark:text-green-400 font-medium">+2 saniye</p>
                        )}
                        {timeAttackFeedback === 'wrong' && (
                          <p className="text-center mt-3 text-red-600 dark:text-red-400 font-medium">Can -1 · Kombo sıfırlandı</p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Kıyaslama: iki zaman seçici + yan yana çekim tablosu */}
            {mode === 'compare' && (
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4 mb-8">
                  <div className="w-full sm:w-48 flex-shrink-0 flex flex-col relative" ref={compareDropdown1Ref}>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">1. Zamanı Seçin</label>
                    <button
                      type="button"
                      onClick={() => { setCompareDropdown1Open((o) => !o); setCompareDropdown2Open(false); }}
                      className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-left text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors duration-300 flex items-center justify-between gap-2"
                      aria-expanded={compareDropdown1Open}
                      aria-haspopup="listbox"
                    >
                      <span className="truncate">{tensesForLang.find((t) => t.id === compareTense1)?.label ?? '—'}</span>
                      <svg className="w-5 h-5 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200" style={{ transform: compareDropdown1Open ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      role="listbox"
                      className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-200 ease-out max-h-[min(18rem,60vh)] overflow-y-auto ${
                        compareDropdown1Open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[0.98] pointer-events-none'
                      }`}
                    >
                      <div className="py-2">
                        {tenseGroupsForLang.map((group) => (
                          <div key={group.mood} className="px-3 pb-1 pt-2 first:pt-0">
                            <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 px-3 py-1 select-none">{group.label}</p>
                            <div className="space-y-0.5 mt-0.5">
                              {group.tenseIds.map((id) => {
                                const t = tensesForLang.find((x) => x.id === id);
                                if (!t) return null;
                                const isSelected = compareTense1 === t.id;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => { setCompareTense1(t.id); setCompareDropdown1Open(false); }}
                                    className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-800 dark:text-slate-100 hover:bg-indigo-500/20 transition-colors duration-200"
                                  >
                                    <span>{t.label}</span>
                                    {isSelected && (
                                      <svg className="w-5 h-5 shrink-0 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="flex items-center justify-center shrink-0 w-12 h-12 rounded-full bg-white/10 dark:bg-slate-700/50 border border-slate-200/50 dark:border-slate-600/50 text-slate-500 dark:text-slate-400 font-bold text-sm" aria-hidden>
                    VS
                  </div>
                  <div className="w-full sm:w-48 flex-shrink-0 flex flex-col relative" ref={compareDropdown2Ref}>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">2. Zamanı Seçin</label>
                    <button
                      type="button"
                      onClick={() => { setCompareDropdown2Open((o) => !o); setCompareDropdown1Open(false); }}
                      className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-left text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors duration-300 flex items-center justify-between gap-2"
                      aria-expanded={compareDropdown2Open}
                      aria-haspopup="listbox"
                    >
                      <span className="truncate">{tensesForLang.find((t) => t.id === compareTense2)?.label ?? '—'}</span>
                      <svg className="w-5 h-5 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200" style={{ transform: compareDropdown2Open ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      role="listbox"
                      className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-200 ease-out max-h-[min(18rem,60vh)] overflow-y-auto ${
                        compareDropdown2Open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[0.98] pointer-events-none'
                      }`}
                    >
                      <div className="py-2">
                        {tenseGroupsForLang.map((group) => (
                          <div key={group.mood} className="px-3 pb-1 pt-2 first:pt-0">
                            <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 px-3 py-1 select-none">{group.label}</p>
                            <div className="space-y-0.5 mt-0.5">
                              {group.tenseIds.map((id) => {
                                const t = tensesForLang.find((x) => x.id === id);
                                if (!t) return null;
                                const isSelected = compareTense2 === t.id;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => { setCompareTense2(t.id); setCompareDropdown2Open(false); }}
                                    className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-800 dark:text-slate-100 hover:bg-fuchsia-500/20 transition-colors duration-200"
                                  >
                                    <span>{t.label}</span>
                                    {isSelected && (
                                      <svg className="w-5 h-5 shrink-0 text-fuchsia-500 dark:text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                </div>
                {!verbKey ? (
                  <div className="text-center py-8 rounded-2xl bg-white/5 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-600/30">
                    <p className="text-slate-600 dark:text-slate-300 font-medium">Karşılaştırmak için önce bir fiil girin</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">Yukarıdaki arama alanına fiil yazıp &quot;Göster&quot;e tıklayın.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-white/5 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-600/30 p-6">
                      <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-4">
                        {tensesForLang.find((t) => t.id === compareTense1)?.label ?? '—'}
                      </h3>
                      <ul className="space-y-3">
                        {pronounsForLang.map(({ id, label }) => (
                          <li key={id} className="flex items-center justify-between gap-4">
                            <span className="text-slate-600 dark:text-slate-300 font-semibold min-w-[5.5rem]">{label}</span>
                            <span className="text-slate-900 dark:text-slate-100 text-right">
                              <ConjugationWithStemSuffix
                                text={getSafeConjugationMap(verbKey, compareTense1, selectedLanguage)[id] ?? '—'}
                                tenseId={compareTense1}
                                lang={selectedLanguage}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-white/5 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-600/30 md:border-l md:border-l-slate-300/70 dark:md:border-l-slate-600/70 p-6">
                      <h3 className="text-lg font-bold text-fuchsia-600 dark:text-fuchsia-400 mb-4">
                        {tensesForLang.find((t) => t.id === compareTense2)?.label ?? '—'}
                      </h3>
                      <ul className="space-y-3">
                        {pronounsForLang.map(({ id, label }) => (
                          <li key={id} className="flex items-center justify-between gap-4">
                            <span className="text-slate-600 dark:text-slate-300 font-semibold min-w-[5.5rem]">{label}</span>
                            <span className="text-slate-900 dark:text-slate-100 text-right">
                              <ConjugationWithStemSuffix
                                text={getSafeConjugationMap(verbKey, compareTense2, selectedLanguage)[id] ?? '—'}
                                tenseId={compareTense2}
                                lang={selectedLanguage}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

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

        {verbKey && mode === 'learning' && conjugationsForDisplay && (
          <div className="print-area">
            {/* Yazdırma çalışma yaprağı — sadece @media print ile görünür */}
            <div className="hidden print:block print:bg-white print:text-black pb-8">
              {/* Başlık: Sol Diloloji + logo, Sağ Fiil Çalışma Yaprağı + tarih */}
              <div className="print:flex print:justify-between print:items-start print:border-b print:border-slate-300 print:pb-4 print:mb-6">
                <div className="print:flex print:items-center print:gap-2">
                  <img src="/logo.svg" alt="Diloloji" className="print:h-8 print:w-auto" />
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
            <div className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 px-5 sm:px-6 py-2 sm:py-3">
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
                </div>
                <span className="text-slate-500 dark:text-slate-400 italic text-lg flex-1 min-w-0 order-2 flex justify-center items-center gap-2">
                  {isMeaningLoading ? (
                    <div className="h-5 w-24 bg-slate-700/50 dark:bg-slate-600/50 rounded animate-pulse" aria-hidden />
                  ) : dynamicMeaning ? (
                    <span className="italic text-slate-600 dark:text-slate-300">{dynamicMeaning}</span>
                  ) : (
                    getTranslationOrPlaceholder(verbKey, selectedLanguage)
                  )}
                </span>
                <div className="order-3 flex items-center gap-2 shrink-0 print:hidden">
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
                </div>
              </div>
              {/* Form ve kök rozetleri + Kurallı/Düzensiz + Yardımcı fiil + Alternatif formlar — kompakt tek blok */}
              {(() => {
                const meta = getVerbMetadata(verbKey, selectedLanguage, !isIrregularVerb(verbKey, selectedLanguage));
                return (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-2 mt-2 border-t border-slate-200/80 dark:border-slate-600/80">
                    <span className="inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-default select-none">
                      Mastar: <span className="ml-0.5 font-semibold text-slate-800 dark:text-slate-100">{meta.infinitive}</span>
                    </span>
                    <span className="inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-default select-none">
                      Ulaç: <span className="ml-0.5 font-semibold text-slate-800 dark:text-slate-100">{meta.gerund}</span>
                    </span>
                    <span className="inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-default select-none">
                      Geçmiş Ortaç: <span className="ml-0.5 font-semibold text-slate-800 dark:text-slate-100">{meta.pastParticiple}</span>
                    </span>
                    <span className={`inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs font-semibold cursor-default select-none ${meta.isRegular ? 'bg-emerald-500/10 dark:bg-slate-800/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 dark:bg-slate-800/30 text-amber-800 dark:text-amber-400'}`}>
                      {meta.isRegular ? 'Kurallı' : 'Düzensiz'}
                    </span>
                    <span className="inline-flex items-center rounded-lg bg-slate-100/90 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-default select-none">
                      Auxiliaire: {meta.auxiliary}
                    </span>
                  </div>
                );
              })()}
              {/* Alternatif formlar: Dönüşlü / Olumsuz — rozet satırının hemen altında, sıkışık */}
              <div className="flex flex-wrap items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-200/80 dark:border-slate-600/80 print:hidden">
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
            </div>
            {showAllTenses ? (
              /* Tüm zamanlar — kip (mood) gruplarına göre başlık + kartlar */
              <div className="mt-4 space-y-10">
                {tenseGroupsForLang.map((group) => {
                  const moodTitle = selectedLanguage === 'fr'
                    ? (group.mood === 'indicatif' ? 'INDICATIF (Haber)' : group.mood === 'subjonctif' ? 'SUBJONCTIF (Dilek-Şart)' : group.mood === 'conditionnel' ? 'CONDITIONNEL (Koşul)' : group.mood === 'imperatif' ? 'IMPÉRATIF (Emir)' : group.label)
                    : (group.mood === 'indicativo' ? 'INDICATIVO (Haber)' : group.mood === 'subjonctif' ? 'SUBJUNTIVO (Dilek-Şart)' : group.mood === 'imperativo' ? 'IMPERATIVO (Emir)' : group.mood === 'condicional' ? 'CONDICIONAL (Koşul)' : group.label);
                  return (
                    <section key={group.mood}>
                      <h3 className="text-xl font-bold tracking-widest text-slate-400 dark:text-slate-500 text-center my-8">
                        {moodTitle}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
              </div>
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
                        className={`group flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-2.5 sm:py-3 ${activeRecallMode ? 'cursor-default' : ''} ${homophoneInfo ? 'border-l-2 border-l-amber-400/50 dark:border-l-amber-500/40 pl-4 sm:pl-5' : ''}`}
                        title={homophoneInfo ? `Bu ${homophoneInfo.count} çekimin yazılışı farklı olsa da okunuşu aynıdır: [${homophoneInfo.key}]` : undefined}
                      >
                        <span className="text-slate-600 dark:text-slate-300 font-semibold min-w-[5.5rem] shrink-0">{label}</span>
                        <div className="flex items-center gap-3 sm:gap-4 text-right min-w-0">
                          <span
                            className={`inline-block min-w-0 truncate transition-all duration-300 ${activeRecallMode ? 'blur-md group-hover:blur-none' : ''}`}
                          >
                            <ConjugationWithStemSuffix
                              text={displayText}
                              tenseId={selectedTense}
                              lang={selectedLanguage}
                            />
                          </span>
                          <span className="inline-flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 print:opacity-0 print:!hidden">
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
                            <button
                              type="button"
                              onClick={() => speakConjugation(fullPhrase, selectedLanguage)}
                              className="p-1.5 rounded-full bg-slate-800/40 text-slate-400 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors duration-200"
                              title={selectedLanguage === 'es' ? 'Dinle (İspanyolca)' : 'Dinle (Fransızca)'}
                              aria-label={`${fullPhrase} dinle`}
                            >
                              <SpeakerIcon className="w-4 h-4" />
                            </button>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>

            {/* Örnek cümle kartı — çekim tablosunun hemen altı, 'Bu fiili biliyorsan' kutusunun üstü */}
            {(() => {
              const example = getVerbExample(selectedLanguage, verbKey);
              if (!example) return null;
              return (
                <div className="mx-4 sm:mx-0 mt-4 rounded-xl bg-indigo-900/20 dark:bg-indigo-900/30 border border-indigo-500/30 dark:border-indigo-400/40 p-4 flex items-start gap-3 backdrop-blur-sm transition-all duration-200">
                  <span className="text-xl shrink-0" aria-hidden>💡</span>
                  <div className="min-w-0">
                    <p className="text-lg italic text-slate-800 dark:text-indigo-100">
                      {example.sentence}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-indigo-300/90">
                      {example.translation}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Fiil Aileleri: aynı çekim matematiğine sahip fiiller */}
            {verbFamily.length > 0 && (
              <section className="mx-4 sm:mx-0 mt-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-800/40 backdrop-blur-sm px-4 py-4">
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
              </section>
            )}
            </>
            )}
            </div>
          </div>
        )}

            {/* Quiz modu: başlık (3'lü ortalı) + Liste/Odak toggle altında sağa hizalı */}
            {verbKey && mode === 'quiz' && conjugationsForDisplay && (
            <>
            <div className="border-b border-slate-100 dark:border-slate-700/50 px-5 sm:px-6 py-4">
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
                </div>
                <span className="text-slate-500 dark:text-slate-400 italic text-lg flex-1 min-w-0 order-2 flex justify-center items-center gap-2">
                  {isMeaningLoading ? (
                    <div className="h-5 w-24 bg-slate-700/50 dark:bg-slate-600/50 rounded animate-pulse" aria-hidden />
                  ) : dynamicMeaning ? (
                    <span className="italic text-slate-600 dark:text-slate-300">{dynamicMeaning}</span>
                  ) : (
                    getTranslationOrPlaceholder(verbKey, selectedLanguage)
                  )}
                </span>
                <span className="inline-flex items-center text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 px-2.5 py-1 rounded-lg shadow-sm order-3 shrink-0">
                  {tenseLabel}
                </span>
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-300 dark:border-slate-700 rounded-full p-1" role="group" aria-label="Alıştırma görünümü">
                  <button type="button" onClick={() => setQuizLayout('list')} className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${quizLayout === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`} aria-pressed={quizLayout === 'list'}>
                    <span aria-hidden>📄</span><span>Liste</span>
                  </button>
                  <button type="button" onClick={() => { setQuizLayout('focus'); setCurrentFocusIndex(0); }} className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${quizLayout === 'focus' ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`} aria-pressed={quizLayout === 'focus'}>
                    <span aria-hidden>🎯</span><span>Odak</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Odak modu: tüm şahıslar tamamlandı */}
            {quizLayout === 'focus' && currentFocusIndex >= pronounIds.length && (
              <div className="p-6 sm:p-8 text-center rounded-xl mx-4 mb-4 bg-gradient-to-br from-emerald-50 to-teal-50/80 dark:from-emerald-500/15 dark:to-teal-500/10 border border-emerald-200/80 dark:border-emerald-400/30" role="alert">
                <p className="text-emerald-800 dark:text-emerald-200 font-bold text-xl">🎉 Mükemmel! Tüm çekimleri tamamladın.</p>
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => { resetQuiz(); setCurrentFocusIndex(0); requestAnimationFrame(() => quizInputRefs.current[0]?.focus()); }}
                    className="rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white font-semibold px-5 py-2.5 hover:bg-emerald-700 dark:hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors duration-300"
                  >
                    Tekrar Oyna
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVerbKey(null); setVerbInput(''); setCurrentFocusIndex(0); verbInputRef.current?.focus(); }}
                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 transition-colors duration-300"
                  >
                    Yeni Fiil
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
              return (
                <div className="p-5 sm:p-6 mb-6">
                  <p className="text-center text-slate-600 dark:text-slate-300 font-bold text-2xl uppercase tracking-wide mb-4">{label}</p>
                  <div className={`max-w-md mx-auto relative rounded-2xl ${feedback === 'wrong' ? 'animate-shake' : ''} ${quizEmptyShake === pronoun ? 'animate-shake ring-2 ring-red-500 dark:ring-red-400 ring-inset' : ''}`}>
                    <input
                      ref={(el) => { quizInputRefs.current[0] = el; }}
                      type="text"
                      value={userAnswers[pronoun]}
                      onChange={(e) => setAnswer(pronoun, e.target.value)}
                      onFocus={() => { activeQuizInputIndexRef.current = currentFocusIndex; }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleFocusModeSubmit(); }}
                      placeholder="Cevabınız..."
                      className={`w-full h-12 rounded-2xl border px-5 py-4 text-base sm:text-2xl text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-inner ${
                        feedback === 'correct'
                          ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-500/20 text-slate-800 dark:text-slate-100 focus:ring-emerald-500/30 dark:focus:ring-emerald-400/30'
                          : feedback === 'wrong'
                            ? 'border-red-500 dark:border-red-400/60 bg-red-50/80 dark:bg-red-500/15 text-slate-800 dark:text-slate-100 focus:ring-red-500/20 dark:focus:ring-red-400/30'
                            : 'bg-slate-100/90 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white focus:border-indigo-500'
                      }`}
                      aria-label={`${label} çekimi`}
                    />
                    {feedback === 'correct' && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 pointer-events-none" aria-hidden>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    {feedback === 'wrong' && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 dark:text-red-400 pointer-events-none" aria-hidden>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {showHints && (
                    <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
                      Doğru: <span className="font-medium text-slate-700 dark:text-slate-200">{correctValue}</span>
                    </p>
                  )}
                  {!showHints && feedback === 'wrong' && (
                    <p className="mt-3 text-center text-sm">
                      {quizPasséHint[pronoun] ? (
                        <span className="text-amber-700 dark:text-amber-300 font-medium">{quizPasséHint[pronoun]}</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-300">Doğru cevap: <strong>{correctValue}</strong></span>
                      )}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Liste görünümü: 6 şahıs */}
            {quizLayout === 'list' && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/50 px-5 sm:px-6 py-4 mb-6">
              {pronounsForLang.map(({ id, label }, index) => {
                const feedback = quizFeedback[id];
                const correctValue = conjugationsForDisplay[id];
                return (
                  <li key={id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                      <span className="min-w-[120px] shrink-0 font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                      <div className={`flex-1 min-w-0 relative flex items-center rounded-xl shadow-inner ${feedback === 'wrong' ? 'animate-shake' : ''} ${quizEmptyShake === id ? 'animate-shake ring-2 ring-red-500 dark:ring-red-400 ring-inset' : ''}`}>
                        <input
                          ref={(el) => {
                            quizInputRefs.current[index] = el;
                          }}
                          type="text"
                          value={userAnswers[id]}
                          onChange={(e) => setAnswer(id, e.target.value)}
                          onFocus={() => { activeQuizInputIndexRef.current = index; }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuizInputKeyDown(e, index);
                          }}
                          placeholder="Cevabınız..."
                          className={`w-full h-12 rounded-xl border px-4 py-3 pr-20 text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner ${
                            feedback === 'correct'
                              ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-500/20 text-slate-800 dark:text-slate-100 focus:ring-emerald-500/30 dark:focus:ring-emerald-400/30'
                              : feedback === 'wrong'
                                ? 'border-red-500 dark:border-red-400/60 bg-red-50/80 dark:bg-red-500/15 text-slate-800 dark:text-slate-100 focus:ring-red-500/20 dark:focus:ring-red-400/30'
                                : 'bg-slate-100/90 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white focus:border-indigo-500'
                          }`}
                          aria-label={`${label} çekimi`}
                        />
                        {feedback === 'correct' && (
                          <span className="absolute right-3 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => speakConjugation(correctValue, selectedLanguage)}
                              className="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors duration-300"
                              title={selectedLanguage === 'es' ? 'Dinle (İspanyolca)' : 'Dinle (Fransızca)'}
                              aria-label={`${correctValue} dinle`}
                            >
                              <SpeakerIcon className="w-5 h-5" />
                            </button>
                            <span className="text-emerald-600 dark:text-emerald-400 pointer-events-none" aria-hidden>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          </span>
                        )}
                        {feedback === 'wrong' && (
                          <span className="absolute right-3 text-red-500 dark:text-red-400 pointer-events-none" aria-hidden>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                    {showHints && (
                      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 pl-0 sm:pl-[7.5rem]">
                        Doğru: <span className="font-medium text-slate-700 dark:text-slate-200">{correctValue}</span>
                      </p>
                    )}
                    {!showHints && feedback === 'wrong' && (
                      <p className="mt-1.5 text-sm pl-0 sm:pl-[7.5rem]">
                        {quizPasséHint[id] ? (
                          <span className="text-amber-700 dark:text-amber-300 font-medium">
                            {quizPasséHint[id]}
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-300">
                            Doğru cevap: <strong>{correctValue}</strong>
                          </span>
                        )}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            )}

            {/* Sanal aksan klavyesi — input hemen altında, tıklayınca odak korunur (useEffect) */}
            <div className="flex flex-wrap justify-center w-full px-5 sm:px-6 pt-2 pb-4 border-t border-slate-100 dark:border-slate-700/50">
              <AccentKeyboard
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
            {/* Aksiyon butonları — en altta, sağa hizalı */}
            <div className="px-5 sm:px-6 pb-6 pt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 dark:border-slate-700/50">
              <button
                type="button"
                onClick={quizLayout === 'focus' ? handleFocusModeSubmit : checkQuiz}
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
