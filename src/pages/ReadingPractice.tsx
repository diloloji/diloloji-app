/**
 * ReadingPractice — CEFR seviyelerine göre okuma pratiği modülü.
 * Dil seçimi, seviye filtresi, Apple Books temizliğinde okuyucu,
 * kelime-tıklama ile yan panel kelime analizi (Groq) ve metin sonunda
 * çoktan seçmeli quiz içerir.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Lightbulb, ListChecks, Shuffle, Volume2, X, XCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  LEVEL_META,
  READING_LANG_META,
  READING_LEVELS,
  getReadings,
  type Reading,
  type ReadingLang,
  type ReadingLevel,
} from '../data/readings';
import { analyzeWord, type WordAnalysisResult } from '../services/dictionaryApi';

/* ───────────────────── Okuyucu yardımcıları ───────────────────── */

interface TextToken {
  key: string;
  value: string;
  isWord: boolean;
}

/**
 * Düz metni kelime + boşluk/noktalama token'larına böler.
 * Kelime token'ları tıklanabilir hale getirilecek.
 */
function tokenizeText(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  // Unicode harf/rakam dizileri (aksanlı karakterler dahil) + apostrof/tire ile zincirlenen
  const regex = /([\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*)|([^\p{L}\p{M}]+)/gu;
  let idx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const [full, wordPart] = match;
    tokens.push({
      key: `${idx}-${match.index}`,
      value: full,
      isWord: Boolean(wordPart),
    });
    idx += 1;
  }
  return tokens;
}

/** Kelimeyi temizle: kenar noktalama silinir, küçültülür. */
function normalizeWord(w: string): string {
  return w
    .trim()
    .replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '')
    .toLowerCase();
}

/** Cümleyi bul: tıklanan token'ın içinde olduğu cümle (. ! ? sınırları). */
function findSentenceContaining(text: string, clickIndex: number): string {
  const before = text.slice(0, clickIndex);
  const sentStart = Math.max(
    before.lastIndexOf('. '),
    before.lastIndexOf('! '),
    before.lastIndexOf('? '),
    before.lastIndexOf('\n'),
    -1
  );
  const after = text.slice(clickIndex);
  const relEnd = after.search(/[.!?\n]/);
  const absEnd = relEnd === -1 ? text.length : clickIndex + relEnd + 1;
  return text.slice(sentStart === -1 ? 0 : sentStart + 1, absEnd).trim();
}

/* ───────────────────── Arka plan ───────────────────── */

function ReadingBackground() {
  return (
    <>
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0a0e17] via-[#0d1117] via-40% to-[#151d2e] to-[#1e293b] transition-colors duration-500 dark:from-[#0a0e17] dark:via-[#0d1117] dark:via-[#151d2e] dark:to-[#1e293b] opacity-0 dark:opacity-100"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200/80 dark:opacity-0 transition-opacity duration-500 opacity-100"
        aria-hidden
      />
      <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden />
      <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" aria-hidden />
    </>
  );
}

/* ───────────────────── Ana bileşen ───────────────────── */

export default function ReadingPractice() {
  const [lang, setLang] = useState<ReadingLang>('fr');
  const [level, setLevel] = useState<ReadingLevel>('A1');
  const [activeReading, setActiveReading] = useState<Reading | null>(null);

  const readings = useMemo(() => getReadings(lang, level), [lang, level]);

  const selectRandomReading = useCallback(() => {
    if (readings.length === 0) {
      setActiveReading(null);
      return;
    }
    const r = readings[Math.floor(Math.random() * readings.length)];
    setActiveReading(r);
  }, [readings]);

  // Dil/seviye değişince okumayı kapat
  useEffect(() => {
    setActiveReading(null);
  }, [lang, level]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Helmet>
        <title>Okuma Pratiği | Diloloji</title>
        <meta
          name="description"
          content="CEFR seviyelerine göre özelleşmiş okuma metinleri, kelime analizi ve mini quizler ile dilini geliştir."
        />
      </Helmet>
      <ReadingBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24">
          {!activeReading ? (
            <LibraryView
              lang={lang}
              level={level}
              readings={readings}
              onLangChange={setLang}
              onLevelChange={setLevel}
              onSelect={setActiveReading}
              onRandom={selectRandomReading}
            />
          ) : (
            <ReaderView
              reading={activeReading}
              onBack={() => setActiveReading(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* ───────────────────── Kütüphane görünümü ───────────────────── */

interface LibraryViewProps {
  lang: ReadingLang;
  level: ReadingLevel;
  readings: Reading[];
  onLangChange: (l: ReadingLang) => void;
  onLevelChange: (l: ReadingLevel) => void;
  onSelect: (r: Reading) => void;
  onRandom: () => void;
}

function LibraryView({
  lang,
  level,
  readings,
  onLangChange,
  onLevelChange,
  onSelect,
  onRandom,
}: LibraryViewProps) {
  return (
    <>
      <header className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Okuma Pratiği
        </div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 sm:text-4xl">
          Seviyene uygun metinlerle{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            daha iyi oku
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 dark:text-slate-400">
          Bir dil ve CEFR seviyesi seç, metindeki her kelimeye tıklayarak anlamını keşfet, sonunda kendini test et.
        </p>
      </header>

      {/* Dil seçici */}
      <div
        className="mx-auto mb-5 flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md"
        role="group"
        aria-label="Dil seçimi"
      >
        {(Object.keys(READING_LANG_META) as ReadingLang[]).map((l) => {
          const meta = READING_LANG_META[l];
          const isActive = lang === l;
          return (
            <button
              key={l}
              type="button"
              onClick={() => onLangChange(l)}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <span className="text-base" aria-hidden>
                {meta.flag}
              </span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Seviye seçici */}
      <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Okuma Seviyeni Seç
          </h2>
          <span className="text-xs text-slate-500">{readings.length} metin</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {READING_LEVELS.map((lvl) => {
            const meta = LEVEL_META[lvl];
            const isActive = level === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => onLevelChange(lvl)}
                aria-pressed={isActive}
                className={`group relative flex flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-all duration-200 ${
                  isActive
                    ? `${meta.badgeClass} shadow-md shadow-indigo-500/10 scale-[1.02]`
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-100'
                }`}
              >
                <span className="text-base font-black">{meta.label}</span>
                <span className="mt-1 hidden text-[10px] leading-tight opacity-80 sm:block">
                  {meta.description.split('·')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">{LEVEL_META[level].description}</p>
      </section>

      {/* Metin listesi */}
      {readings.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-md">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-500" aria-hidden />
          <p className="text-slate-400">
            Bu seviye için henüz metin eklenmedi. Başka bir seviye dene.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={onRandom}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-400/30 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-4 py-3 text-sm font-semibold text-indigo-200 backdrop-blur-md transition-all hover:border-indigo-400/60 hover:from-indigo-500/20 hover:to-violet-500/20"
          >
            <Shuffle className="h-4 w-4 transition-transform group-hover:rotate-12" aria-hidden />
            Rastgele bir metin seç
          </button>
          {readings.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r)}
              className="group block w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-indigo-500/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-bold ${LEVEL_META[r.level].badgeClass}`}
                    >
                      {r.level}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3" aria-hidden />
                      {r.estimatedMinutes} dk
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <ListChecks className="h-3 w-3" aria-hidden />
                      {r.questions.length} soru
                    </span>
                  </div>
                  <h3 className="truncate text-lg font-bold text-slate-100 group-hover:text-white">
                    {r.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{r.text.slice(0, 180)}…</p>
                </div>
                <div className="mt-1 shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors group-hover:border-indigo-400/50 group-hover:text-indigo-300">
                  <BookOpen className="h-5 w-5" aria-hidden />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ───────────────────── Okuyucu + Quiz ───────────────────── */

interface ReaderViewProps {
  reading: Reading;
  onBack: () => void;
}

function ReaderView({ reading, onBack }: ReaderViewProps) {
  const [activeWord, setActiveWord] = useState<{ word: string; context: string } | null>(null);
  const [wordAnalysis, setWordAnalysis] = useState<WordAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [quizOpen, setQuizOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const quizRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(() => tokenizeText(reading.text), [reading.text]);
  const groqLang = READING_LANG_META[reading.lang].groqName;

  /** Kelimeye tıklama: drawer aç, Groq ile analiz al */
  const handleWordClick = useCallback(
    async (rawWord: string, contextSentence: string) => {
      const cleaned = normalizeWord(rawWord);
      if (!cleaned) return;
      setActiveWord({ word: cleaned, context: contextSentence });
      setWordAnalysis(null);
      setAnalysisError(null);
      setAnalysisLoading(true);
      try {
        const result = await analyzeWord(cleaned, groqLang, contextSentence);
        if (!result) {
          setAnalysisError('Analiz alınamadı. API anahtarı tanımlı değil olabilir.');
        } else {
          setWordAnalysis(result);
        }
      } catch {
        setAnalysisError('Bir hata oluştu. Tekrar dene.');
      } finally {
        setAnalysisLoading(false);
      }
    },
    [groqLang]
  );

  /** Kelime telaffuzu (Web Speech API) */
  const speakWord = useCallback(
    (w: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const utter = new SpeechSynthesisUtterance(w);
      const localeMap: Record<ReadingLang, string> = { fr: 'fr-FR', es: 'es-ES', en: 'en-US' };
      utter.lang = localeMap[reading.lang];
      utter.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    },
    [reading.lang]
  );

  /** Quiz'i görünür yap + smooth scroll */
  const openQuiz = useCallback(() => {
    setQuizOpen(true);
    requestAnimationFrame(() => {
      quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const resetQuiz = useCallback(() => {
    setAnswers({});
    setLocked({});
  }, []);

  const selectAnswer = useCallback((qid: string, idx: number) => {
    setAnswers((prev) => (prev[qid] != null ? prev : { ...prev, [qid]: idx }));
    setLocked((prev) => ({ ...prev, [qid]: true }));
  }, []);

  // Token'ları render ederken her kelime için o kelimenin hangi cümlede olduğunu hesapla
  const sentenceByCharIndex = useMemo(() => {
    const map = new Map<number, string>();
    let cursor = 0;
    tokens.forEach((tok) => {
      if (tok.isWord) {
        map.set(cursor, findSentenceContaining(reading.text, cursor));
      }
      cursor += tok.value.length;
    });
    return map;
  }, [tokens, reading.text]);

  const totalCorrect = reading.questions.filter(
    (q) => answers[q.id] != null && answers[q.id] === q.correctIndex
  ).length;
  const allAnswered = reading.questions.every((q) => answers[q.id] != null);

  return (
    <>
      {/* Başlık şeridi */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md transition-all hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          Kütüphane
        </button>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${LEVEL_META[reading.level].badgeClass}`}
        >
          {reading.level}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" aria-hidden />
          {reading.estimatedMinutes} dk
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          <span aria-hidden>{READING_LANG_META[reading.lang].flag}</span>
          {READING_LANG_META[reading.lang].label}
        </span>
      </div>

      {/* Okuma kartı */}
      <article className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] p-6 backdrop-blur-xl sm:p-10 shadow-2xl shadow-black/20">
        <h2 className="mb-6 text-2xl font-black leading-tight text-slate-100 sm:text-3xl">
          {reading.title}
        </h2>
        <div
          className="reading-body select-text text-[1.05rem] leading-[1.95] text-slate-200 sm:text-[1.125rem]"
          style={{
            fontFamily:
              '"Iowan Old Style","Charter","Georgia","Palatino","Palatino Linotype","New York",serif',
          }}
        >
          {(() => {
            let cursor = 0;
            return tokens.map((tok) => {
              const charIndex = cursor;
              cursor += tok.value.length;
              if (!tok.isWord) return <span key={tok.key}>{tok.value}</span>;
              const cleaned = normalizeWord(tok.value);
              const isActive = activeWord?.word === cleaned;
              return (
                <span
                  key={tok.key}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    handleWordClick(tok.value, sentenceByCharIndex.get(charIndex) ?? reading.text)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleWordClick(tok.value, sentenceByCharIndex.get(charIndex) ?? reading.text);
                    }
                  }}
                  className={`relative cursor-pointer rounded-sm px-[1px] transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
                    isActive
                      ? 'bg-indigo-500/30 text-white'
                      : 'hover:bg-indigo-500/15 hover:text-white'
                  }`}
                >
                  {tok.value}
                </span>
              );
            });
          })()}
        </div>

        {/* Quiz CTA */}
        <div className="mt-10 flex flex-col items-center border-t border-white/10 pt-8">
          <p className="mb-3 text-sm text-slate-400">Metni okuduktan sonra kendini test et.</p>
          <button
            type="button"
            onClick={openQuiz}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40"
          >
            <ListChecks className="h-4 w-4" aria-hidden />
            Kendini Test Et
            <span className="text-xs opacity-70">· {reading.questions.length} soru</span>
          </button>
        </div>
      </article>

      {/* Quiz */}
      <AnimatePresence>
        {quizOpen && (
          <motion.section
            ref={quizRef}
            key="quiz"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8"
            aria-label="Okuma anlama quizi"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100">
                <Lightbulb className="h-5 w-5 text-amber-300" aria-hidden />
                Kendini Test Et
              </h3>
              {allAnswered && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-200">
                  Skor: {totalCorrect} / {reading.questions.length}
                </span>
              )}
            </div>
            <ol className="space-y-5">
              {reading.questions.map((q, qIdx) => {
                const picked = answers[q.id];
                const isLocked = !!locked[q.id];
                return (
                  <li key={q.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-100 sm:text-base">
                      <span className="mr-2 text-indigo-300">{qIdx + 1}.</span>
                      {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => {
                        const isPicked = picked === oIdx;
                        const isCorrect = oIdx === q.correctIndex;
                        let style =
                          'border-white/10 bg-white/5 text-slate-200 hover:border-indigo-400/40 hover:bg-white/[0.07]';
                        if (isLocked) {
                          if (isCorrect) {
                            style =
                              'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
                          } else if (isPicked) {
                            style = 'border-rose-400/40 bg-rose-500/10 text-rose-200';
                          } else {
                            style = 'border-white/5 bg-white/[0.02] text-slate-400';
                          }
                        }
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => !isLocked && selectAnswer(q.id, oIdx)}
                            disabled={isLocked}
                            className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${style} ${
                              !isLocked ? 'cursor-pointer' : 'cursor-default'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                                  isLocked && isCorrect
                                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                                    : isLocked && isPicked
                                    ? 'border-rose-400/60 bg-rose-500/20 text-rose-200'
                                    : 'border-white/20 bg-white/5 text-slate-300'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span>{opt}</span>
                            </span>
                            {isLocked && isCorrect && (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                            )}
                            {isLocked && isPicked && !isCorrect && (
                              <XCircle className="h-4 w-4 shrink-0 text-rose-300" aria-hidden />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {isLocked && q.explanation && (
                      <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                        {q.explanation}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            {allAnswered && (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <p className="text-sm font-semibold text-slate-100">
                  {totalCorrect === reading.questions.length
                    ? '🎉 Mükemmel! Tüm soruları doğru yanıtladın.'
                    : totalCorrect >= reading.questions.length / 2
                    ? 'İyi iş! Bir metin daha okumayı dene.'
                    : 'Sorun değil, metni tekrar okuyup kelimeleri inceleyebilirsin.'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetQuiz}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/20 hover:text-white"
                  >
                    Quiz'i tekrarla
                  </button>
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-400"
                  >
                    Başka metin
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Kelime Analizi Yan Paneli */}
      <AnimatePresence>
        {activeWord && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setActiveWord(null)}
              aria-hidden
            />
            <motion.aside
              key="drawer"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label={`${activeWord.word} kelime analizi`}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl"
            >
              <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Kelime Analizi
                  </p>
                  <h4 className="mt-0.5 truncate text-2xl font-black text-white">
                    {activeWord.word}
                  </h4>
                  {wordAnalysis?.type && (
                    <span className="mt-2 inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                      {wordAnalysis.type}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => speakWord(activeWord.word)}
                    title="Telaffuzu dinle"
                    aria-label="Telaffuzu dinle"
                    className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWord(null)}
                    title="Kapat"
                    aria-label="Paneli kapat"
                    className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {analysisLoading && (
                  <div className="space-y-3">
                    <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
                    <p className="pt-2 text-xs text-slate-500">Analiz ediliyor…</p>
                  </div>
                )}

                {!analysisLoading && analysisError && (
                  <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                    {analysisError}
                  </div>
                )}

                {!analysisLoading && !analysisError && wordAnalysis && (
                  <>
                    {wordAnalysis.base && wordAnalysis.base.toLowerCase() !== activeWord.word.toLowerCase() && (
                      <section>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Kök / Mastar
                        </p>
                        <p className="mt-1 text-base text-slate-100">{wordAnalysis.base}</p>
                      </section>
                    )}

                    <section>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Türkçe Anlamı
                      </p>
                      <p className="mt-1 text-base font-medium text-indigo-200">
                        {wordAnalysis.translation}
                      </p>
                    </section>

                    {wordAnalysis.example && (
                      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Örnek
                        </p>
                        <p className="mt-1 text-sm italic text-slate-100">
                          “{wordAnalysis.example}”
                        </p>
                        {wordAnalysis.exampleTranslation && (
                          <p className="mt-1 text-xs text-slate-400">
                            {wordAnalysis.exampleTranslation}
                          </p>
                        )}
                      </section>
                    )}

                    {/* Fiil ise Fiil Laboratuvarı kısayolu */}
                    {wordAnalysis.type?.toLowerCase() === 'verb' && (
                      <a
                        href={`/fiil-laboratuvari?verb=${encodeURIComponent(
                          wordAnalysis.base || activeWord.word
                        )}&lang=${reading.lang === 'en' ? 'fr' : reading.lang}`}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-200 transition-colors hover:border-indigo-400/60 hover:bg-indigo-500/20"
                      >
                        ⚗ Fiil Laboratuvarı'nda Aç →
                      </a>
                    )}

                    {activeWord.context && (
                      <section>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Bağlam
                        </p>
                        <p className="mt-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm italic text-slate-300">
                          {activeWord.context}
                        </p>
                      </section>
                    )}
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
