/**
 * Cümle Laboratuvarı — Karmaşık cümleleri formül gibi öğelerine ayırır.
 * Groq ile sözdizimi analizi, renkli bloklar, hover detay.
 * Kelime bloklarından Ezber Makinesi'ne "Desteye Ekle" (Plus → Check + Toast).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { FlaskConical, Sparkles, Plus, Check, Mic } from 'lucide-react';
import Navbar from '../components/Navbar';
import { analyzeSentence, analyzeShadowing, type SentenceAnalysisItem, type ShadowingResult } from '../services/dictionaryApi';
import { addWordToLocalDeck } from '../utils/deckManager';

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    SpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

/** Tarayıcı SpeechRecognition API'si */
function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SpeechRecognitionAPI || null;
}

function getRecognitionLang(lang: LangId): string {
  switch (lang) {
    case 'Fransızca':
      return 'fr-FR';
    case 'İspanyolca':
      return 'es-ES';
    case 'İngilizce':
      return 'en-GB';
    default:
      return 'en-GB';
  }
}

type LangId = 'Fransızca' | 'İspanyolca' | 'İngilizce';

const LANGUAGES: { id: LangId; label: string; flag: string }[] = [
  { id: 'Fransızca', label: 'Fransızca', flag: '🇫🇷' },
  { id: 'İspanyolca', label: 'İspanyolca', flag: '🇪🇸' },
  { id: 'İngilizce', label: 'İngilizce', flag: '🇬🇧' },
];

/** Dil bazlı örnek cümleler — zorlu gramer yapıları */
const EXAMPLE_SENTENCES: Record<LangId, string[]> = {
  Fransızca: [
    "Si j'avais su, je serais venu.",
    "Il faut que tu viennes demain.",
    "Nous aurions aimé rester plus longtemps.",
  ],
  İspanyolca: [
    'Si tuviera dinero, viajaría por todo el mundo.',
    'Ojalá que llueva mañana.',
    'Es posible que haya llegado ya.',
  ],
  İngilizce: [
    'If I had known, I would have come.',
    'It is essential that he be there.',
    'She suggested that we leave early.',
  ],
};

/** Günün manşetleri — mock; ileride haber API / RSS bağlanacak */
type NewsLangId = keyof typeof DAILY_NEWS;
const DAILY_NEWS = {
  Fransızca: {
    source: 'Le Monde',
    sourceShort: 'LM',
    flag: '🇫🇷',
    headlines: [
      "La réforme des retraites suscite de vives réactions à travers le pays.",
      "Les négociations climatiques se poursuivent à l'approche du sommet.",
      "Le gouvernement annonce de nouvelles mesures pour l'emploi des jeunes.",
      "Une étude révèle l'impact des écrans sur le sommeil des adolescents.",
    ],
  },
  İspanyolca: {
    source: 'El País',
    sourceShort: 'EP',
    flag: '🇪🇸',
    headlines: [
      'El presidente anuncia un plan de inversión para la transición energética.',
      'Los expertos advierten sobre el aumento de la desigualdad en la región.',
      'La justicia europea falla a favor de la protección de datos personales.',
      'Miles de personas se manifiestan en favor de la educación pública.',
    ],
  },
  İngilizce: {
    source: 'BBC',
    sourceShort: 'BBC',
    flag: '🇬🇧',
    headlines: [
      'Scientists discover new evidence of climate change in the Arctic region.',
      'The government has announced a major overhaul of the health system.',
      'International leaders are meeting to discuss security and trade agreements.',
      'Researchers say the new treatment could transform cancer care for patients.',
    ],
  },
} as const;

function getBlockClasses(type: string | undefined): string {
  const t = (type || '').toLowerCase();
  if (t.includes('verb')) return 'bg-rose-500/20 text-rose-200 border-rose-500/50';
  if (t.includes('noun')) return 'bg-blue-500/20 text-blue-200 border-blue-500/50';
  if (t.includes('adjective')) return 'bg-amber-500/20 text-amber-200 border-amber-500/50';
  if (t.includes('pronoun')) return 'bg-purple-500/20 text-purple-200 border-purple-500/50';
  return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
}

function WordBlock({
  item,
  language,
  onAddToDeck,
  isAdded,
}: {
  item: SentenceAnalysisItem;
  language: LangId;
  onAddToDeck: () => void;
  isAdded: boolean;
}) {
  const [showPopover, setShowPopover] = useState(false);
  const classes = getBlockClasses(item.type);

  const handleAddClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isAdded) return;
      const translation = item.translation || item.base || item.word;
      addWordToLocalDeck(item.word, translation, language);
      onAddToDeck();
    },
    [isAdded, item.word, item.translation, item.base, language, onAddToDeck]
  );

  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-lg border pl-3 pr-8 py-1.5 text-sm font-medium transition-all hover:scale-105 ${classes}`}
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      {item.word}
      {/* Ezber Makinesine Ekle — minimalist + ikonu; tıklanınca Check */}
      <span className="absolute right-1 top-1/2 -translate-y-1/2" title={isAdded ? 'Ezber Makinesi\'ne eklendi' : 'Ezber Makinesine Ekle'}>
        <motion.button
          type="button"
          onClick={handleAddClick}
          disabled={isAdded}
          className={`flex items-center justify-center w-6 h-6 rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] ${
            isAdded
              ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 cursor-default'
              : 'border-white/20 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 hover:border-white/30'
          }`}
          aria-label={isAdded ? 'Ezber Makinesi\'ne eklendi' : 'Ezber Makinesine Ekle'}
          initial={false}
          animate={isAdded ? { scale: 1, rotate: 0 } : { scale: 1, rotate: 0 }}
          whileTap={!isAdded ? { scale: 0.9 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <AnimatePresence mode="wait">
            {isAdded ? (
              <motion.span
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              </motion.span>
            ) : (
              <motion.span
                key="plus"
                initial={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </span>
      {showPopover && (item.base || item.grammarDetails || item.translation) && (
        <div
          className="absolute left-1/2 top-full z-50 mt-2 min-w-[200px] max-w-[280px] -translate-x-1/2 rounded-xl border border-white/20 bg-slate-800/95 p-3 shadow-xl backdrop-blur-sm"
          role="tooltip"
        >
          <div className="space-y-1.5 text-left text-xs">
            {item.base && (
              <p>
                <span className="text-slate-500">Kök/Mastar:</span>{' '}
                <span className="text-slate-200">{item.base}</span>
              </p>
            )}
            {item.grammarDetails && (
              <p>
                <span className="text-slate-500">Dilbilgisi:</span>{' '}
                <span className="text-slate-200">{item.grammarDetails}</span>
              </p>
            )}
            {item.translation && (
              <p>
                <span className="text-slate-500">Çeviri:</span>{' '}
                <span className="text-amber-200">{item.translation}</span>
              </p>
            )}
            {item.type && (
              <p>
                <span className="text-slate-500">Tür:</span>{' '}
                <span className="text-slate-400">{item.type}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

export default function SyntaxLab() {
  const location = useLocation();
  const [sentence, setSentence] = useState('');
  const [language, setLanguage] = useState<LangId>('Fransızca');
  const [items, setItems] = useState<SentenceAnalysisItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [shadowingResult, setShadowingResult] = useState<ShadowingResult | null>(null);
  const [shadowingLoading, setShadowingLoading] = useState(false);
  const [_recognizedTranscript, setRecognizedTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptAccumRef = useRef('');

  const exampleChips = EXAMPLE_SENTENCES[language];

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  /** YouTube Lab vb. sayfalardan gönderilen cümle: textarea doldurulur ve analiz tetiklenir */
  useEffect(() => {
    const state = location.state as { prefillSentence?: string; prefillLanguage?: LangId } | null;
    const prefill = state?.prefillSentence;
    if (typeof prefill !== 'string' || !prefill.trim()) return;
    setSentence(prefill.trim());
    if (state?.prefillLanguage && LANGUAGES.some((l) => l.id === state.prefillLanguage)) {
      setLanguage(state.prefillLanguage);
    }
    setError(null);
    setLoading(true);
    setAddedKeys(new Set());
    setShadowingResult(null);
    analyzeSentence(prefill.trim(), state?.prefillLanguage ?? language).then((result) => {
      setItems(result);
      setLoading(false);
      if (result.length === 0) setError('Analiz sonucu alınamadı.');
    }).catch(() => {
      setLoading(false);
      setError('Bir hata oluştu.');
    });
  }, [location.state]);

  const handleAddToDeck = useCallback((key: string) => {
    setAddedKeys((prev) => new Set(prev).add(key));
    setToastMessage("Kelime Ezber Makinesi'ne gönderildi!");
  }, []);

  const startStopShadowing = useCallback(async () => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      setError('Tarayıcınız ses tanıma desteklemiyor. Chrome veya Edge kullanın.');
      return;
    }
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }
    if (!sentence.trim() || items.length === 0) return;
    setShadowingResult(null);
    setRecognizedTranscript('');
    transcriptAccumRef.current = '';
    const rec = new SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = getRecognitionLang(language);
    rec.onresult = (event: SpeechRecognitionResultEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          transcriptAccumRef.current += transcript;
          setRecognizedTranscript(transcriptAccumRef.current);
        }
      }
    };
    rec.onend = async () => {
      setIsRecording(false);
      recognitionRef.current = null;
      const transcript = transcriptAccumRef.current.trim();
      if (transcript) {
        setShadowingLoading(true);
        try {
          const result = await analyzeShadowing(sentence.trim(), transcript, language, items.map((i) => i.word));
          setShadowingResult(result ?? null);
          if (!result) setError('Telaffuz analizi alınamadı.');
        } finally {
          setShadowingLoading(false);
        }
      }
    };
    rec.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    try {
      rec.start();
      recognitionRef.current = rec;
      setIsRecording(true);
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsRecording(false);
    }
  }, [isRecording, sentence, items, language]);

  const handleAnalyze = async () => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setAddedKeys(new Set());
    setShadowingResult(null);
    setRecognizedTranscript('');
    try {
      const result = await analyzeSentence(trimmed, language);
      setItems(result);
      if (result.length === 0) setError('Analiz sonucu alınamadı. Cümleyi kontrol edip tekrar deneyin.');
    } catch {
      setError('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  /** Manşet kartına tıklanınca cümleyi yaz ve hemen analiz et */
  const handleHeadlineClick = useCallback(async (headlineText: string, headlineLang: LangId) => {
    setLanguage(headlineLang);
    setSentence(headlineText);
    setError(null);
    setAddedKeys(new Set());
    setShadowingResult(null);
    setRecognizedTranscript('');
    setLoading(true);
    try {
      const result = await analyzeSentence(headlineText, headlineLang);
      setItems(result);
      if (result.length === 0) setError('Analiz sonucu alınamadı.');
    } catch {
      setError('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <Helmet>
        <title>İspanyolca ve Fransızca Cümle Analizi | Diloloji Cümle Laboratuvarı</title>
        <meta name="description" content="Yapay zeka ile İspanyolca cümle analizi, Fransızca cümle analizi ve İngilizce gramer analizi. Sözdizimi, kelime türü ve çeviri. Ücretsiz gramer aracı." />
      </Helmet>
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 pb-16">
        <header className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2 flex items-center justify-center gap-2">
            <FlaskConical className="w-8 h-8 text-amber-400" strokeWidth={2} aria-hidden />
            Cümle Laboratuvarı
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Uzun cümleleri formüllere ayırın, dilin iskeletini görün
          </p>
        </header>

        <div className="space-y-5">
          {/* Dil seçici — Segmented Control */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Dil
            </label>
            <div
              role="tablist"
              aria-label="Analiz dili seçin"
              className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10"
            >
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setLanguage(lang.id)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] ${
                      isSelected
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-transparent text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-base leading-none" aria-hidden>{lang.flag}</span>
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Günün Manşetleri — CANLI badge + yatay kaydırılabilir kartlar */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500 animate-pulse"
                aria-label="Canlı içerik"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                CANLI
              </span>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Dünyadan Manşetler
              </label>
            </div>
            <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4 pb-2">
              <div className="flex gap-3 min-w-max">
                {(Object.keys(DAILY_NEWS) as NewsLangId[]).map((langId) => {
                  const news = DAILY_NEWS[langId];
                  return news.headlines.map((headline, idx) => (
                    <button
                      key={`${langId}-${idx}`}
                      type="button"
                      onClick={() => handleHeadlineClick(headline, langId)}
                      disabled={loading}
                      className="flex-shrink-0 w-[280px] sm:w-[300px] text-left rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/10 hover:border-indigo-400/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-all group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-slate-400 group-hover:text-indigo-300 text-xs font-bold" aria-hidden>
                          {news.sourceShort}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                          {news.source}
                        </span>
                        <span className="text-sm leading-none" aria-hidden>{news.flag}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-200 leading-snug line-clamp-3 group-hover:text-slate-100">
                        {headline}
                      </p>
                    </button>
                  ));
                })}
              </div>
            </div>
          </div>

          {/* Metin kutusu — premium input alanı */}
          <div>
            <label htmlFor="syntax-input" className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Cümle
            </label>
            <textarea
              id="syntax-input"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="Analiz etmek istediğiniz cümleyi yazın..."
              rows={6}
              className="w-full rounded-xl bg-[#0a0e17]/50 backdrop-blur-sm border border-white/10 px-4 py-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent resize-y min-h-[160px] text-base leading-relaxed transition-shadow duration-200"
            />
          </div>

          {/* Hemen Dene — örnek çipler */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Nasıl çalışır? Şunları test et:
            </p>
            <div className="flex flex-wrap gap-2">
              {exampleChips.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setSentence(example)}
                  className="rounded-full px-3.5 py-1.5 text-sm text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-slate-100 hover:border-indigo-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Sihirli Analiz butonu */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || !sentence.trim()}
            className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {loading ? (
              'Analiz ediliyor...'
            ) : (
              <>
                <Sparkles className="w-5 h-5 shrink-0" strokeWidth={2} aria-hidden />
                Analiz Et
              </>
            )}
          </button>

          {error && (
            <p className="text-rose-400 text-sm text-center" role="alert">
              {error}
            </p>
          )}
        </div>

        {items.length > 0 && (
          <section className="mt-10" aria-label="Analiz sonucu">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Cümlenin iskeleti
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((item, i) => (
                <WordBlock
                  key={`${item.word}-${i}`}
                  item={item}
                  language={language}
                  onAddToDeck={() => handleAddToDeck(`${i}-${item.word}`)}
                  isAdded={addedKeys.has(`${i}-${item.word}`)}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Fiil: kırmızı · İsim: mavi · Sıfat: sarı · Zamir: mor · Diğer: gri — Detay için üzerine gelin. (+) ile Ezber Makinesi'ne ekleyin.
            </p>

            {/* AI Shadowing — telaffuz kontrolü */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                AI Shadowing
              </p>
              <p className="text-slate-400 text-sm mb-4">
                Cümleyi sesli okuyun, mikrofonla kaydedin. Telaffuzunuz AI ile analiz edilir.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <motion.button
                  type="button"
                  onClick={startStopShadowing}
                  disabled={shadowingLoading}
                  className="relative flex items-center justify-center w-12 h-12 rounded-full border border-white/20 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white hover:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={isRecording ? 'Kaydı durdur' : 'Telaffuzu kaydet'}
                >
                  {/* Kayıt sırasında neon pulse halka */}
                  {isRecording && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-indigo-400/60"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      aria-hidden
                    />
                  )}
                  <Mic className="relative z-10 w-6 h-6" strokeWidth={2} />
                </motion.button>
                <span className="text-sm text-slate-500">
                  {isRecording ? 'Kaydediliyor… Durdurmak için tekrar tıklayın.' : shadowingLoading ? 'Analiz ediliyor…' : 'Mikrofona tıklayıp cümleyi okuyun'}
                </span>
              </div>

              {/* Sonuç: kelimeler yeşil/kırmızı alt çizgi + skor ve tavsiye */}
              <AnimatePresence>
                {shadowingResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
                  >
                    <div className="flex flex-wrap gap-x-2 gap-y-1 mb-4">
                      {items.map((item, i) => {
                        const correct = shadowingResult.wordCorrect[i] !== false;
                        return (
                          <span
                            key={`${i}-${item.word}`}
                            className={`inline-block border-b-2 ${
                              correct ? 'border-emerald-500/80 text-emerald-200' : 'border-red-500/80 text-red-200'
                            }`}
                          >
                            {item.word}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="font-medium text-slate-300">
                        Doğallık Skoru: <span className="text-indigo-300 tabular-nums">%{shadowingResult.score}</span>
                      </span>
                      <p className="text-slate-400 italic flex-1 min-w-0">
                        {shadowingResult.advice}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* SEO: Yapay zeka ile gramer analizi — footer öncesi, metin odaklı, ana odağı bozmaz */}
        <section className="mt-20 sm:mt-24 pt-12 border-t border-white/5" aria-label="Hakkında">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-slate-300 mb-4">
              Yapay Zeka ile Gramer Analizinin Matematiği
            </h2>
            <div className="text-gray-400 leading-relaxed space-y-4 text-sm sm:text-base">
              <p>
                <strong className="text-slate-400">İspanyolca cümle analizi</strong> ve <strong className="text-slate-400">Fransızca cümle analizi</strong> artık tek tıkla: Cümle Laboratuvarı, yapay zeka destekli bir gramer analiz aracıdır. Yazdığınız cümleyi anında kelime kelime ve öbek öbek ayırır; her birimin dilbilgisi türünü (fiil, isim, sıfat, zamir, edat vb.), kök veya mastar halini ve Türkçe çevirisini gösterir. Böylece karmaşık <strong className="text-slate-400">Fransızca</strong> veya <strong className="text-slate-400">İspanyolca</strong> cümlelerin yapısını, tıpkı bir formülü parçalara ayırır gibi net biçimde görürsünüz.
              </p>
              <p>
                Araç şu anda <strong className="text-slate-400">Fransızca</strong>, <strong className="text-slate-400">İspanyolca</strong> ve <strong className="text-slate-400">İngilizce</strong> dillerini destekler. Subjonctif, conditionnel, subjuntivo gibi ileri düzey yapılar da dahil olmak üzere; cümle içindeki fiil çekimleri, zamirler ve bağlaçlar otomatik tespit edilir. Bu sayede hem <strong className="text-slate-400">gramer analizi</strong> hem de <strong className="text-slate-400">sözdizimi analizi</strong> tek ekranda bir arada sunulur. Öğrendiğiniz kelimeleri doğrudan Ezber Makinesi destesine ekleyerek kelime dağarcığınızı da güçlendirebilirsiniz.
              </p>
              <p>
                Diloloji Cümle Laboratuvarı, uzun ve karmaşık cümleleri dilin iskeletine indirgeyerek <strong className="text-slate-400">cümle analizi</strong> yapmanızı kolaylaştırır. İster sınav hazırlığı ister günlük okuma pratiği için kullanın; yapay zeka ile gramer analizinin matematiği artık parmaklarınızın ucunda.
              </p>
            </div>
          </div>
        </section>

        {/* Toast: Ezber Makinesi'ne gönderildi — glassmorphism, koyu tema */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] rounded-xl border border-white/10 bg-slate-800/90 backdrop-blur-xl px-5 py-3 shadow-xl text-slate-100 text-sm font-medium"
              role="status"
              aria-live="polite"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
