/**
 * İnteraktif Ders Ekranı — Focus Mode: tam ekran, ilerleme çubuğu, cam efektli teori, quiz, sticky tamamla butonu.
 */

import { useCallback, useState, useEffect } from 'react';
import { X, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useXp } from '../contexts/XpContext';
import { isLessonComplete, saveLessonComplete } from '../utils/learningProgress';
import type { UnitContent, LessonExample, QuizQuestion } from '../data/learningPathUnits';

export type LessonViewLang = 'fr' | 'es' | 'en' | 'de';

const TTS_LANG: Record<LessonViewLang, string> = {
  fr: 'fr-FR',
  es: 'es-ES',
  en: 'en-GB',
  de: 'de-DE',
};

function speakExample(text: string, lang: LessonViewLang) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = TTS_LANG[lang];
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

function ExampleOriginalWithVerbBold({ text, verbBold }: { text: string; verbBold?: string }) {
  if (!verbBold || !text.includes(verbBold)) {
    return <span className="text-xl font-medium text-slate-100">{text}</span>;
  }
  const i = text.indexOf(verbBold);
  return (
    <span className="text-xl font-medium text-slate-100">
      {text.slice(0, i)}
      <strong className="text-indigo-400">{verbBold}</strong>
      {text.slice(i + verbBold.length)}
    </span>
  );
}

type LessonViewProps = {
  unit: UnitContent;
  lessonIndex: number;
  lang: LessonViewLang;
  onClose: () => void;
  onComplete: () => void;
  onPrevLesson?: () => void;
  onNextLesson?: () => void;
};

type Phase = 'content' | 'quiz' | 'result';

export default function LessonView({ unit, lessonIndex, lang, onClose, onComplete, onPrevLesson, onNextLesson }: LessonViewProps) {
  const { addXP } = useXp();
  const lesson = unit.lessons[lessonIndex];
  const totalLessons = unit.lessons.length;
  const progressPercent = totalLessons > 0 ? ((lessonIndex + 1) / totalLessons) * 100 : 0;

  const [phase, setPhase] = useState<Phase>('content');
  const [contentStepIndex, setContentStepIndex] = useState(0);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizShowExplanation, setQuizShowExplanation] = useState(false);

  const contentSteps = 1 + (lesson?.examples?.length ?? 0);
  const isLastContentStep = contentSteps <= 1 || contentStepIndex >= contentSteps - 1;

  useEffect(() => {
    setContentStepIndex(0);
  }, [lessonIndex, unit.id]);

  const quiz = lesson?.quiz;
  const hasQuiz = quiz && quiz.length > 0;
  const currentQuizQuestion = quiz?.[quizQuestionIndex];
  const totalQuiz = quiz?.length ?? 0;
  const correctCount = totalQuiz > 0
    ? quiz!.filter((q, i) => q.correctAnswer === quizAnswers[i]).length
    : 0;
  const quizPassed = totalQuiz > 0 && correctCount / totalQuiz >= 0.5;
  const perfectQuiz = totalQuiz > 0 && correctCount === totalQuiz;

  const finishWithXP = useCallback(
    (xp: number, celebrate?: boolean) => {
      const firstComplete = !isLessonComplete(unit.id, lessonIndex);
      if (firstComplete && xp > 0) addXP(xp);
      saveLessonComplete(unit.id, lessonIndex, firstComplete ? xp : 0);
      if (celebrate) {
        const duration = 2200;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({
            particleCount: 4,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#10b981', '#f59e0b', '#6366f1', '#ec4899'],
          });
          confetti({
            particleCount: 4,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#10b981', '#f59e0b', '#6366f1', '#ec4899'],
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      }
      onComplete();
    },
    [addXP, onComplete, unit.id, lessonIndex]
  );

  const handleQuizAnswer = useCallback(
    (answer: string) => {
      if (!currentQuizQuestion || quizShowExplanation) return;
      setQuizAnswers((prev) => ({ ...prev, [quizQuestionIndex]: answer }));
      setQuizShowExplanation(true);
    },
    [currentQuizQuestion, quizQuestionIndex, quizShowExplanation]
  );

  const handleQuizContinue = useCallback(() => {
    setQuizShowExplanation(false);
    if (quizQuestionIndex + 1 >= totalQuiz) setPhase('result');
    else setQuizQuestionIndex((i) => i + 1);
  }, [quizQuestionIndex, totalQuiz]);

  const earnedQuizXp = correctCount * 5;
  const xpToAward = unit.xpRewardOnComplete != null ? unit.xpRewardOnComplete : earnedQuizXp;

  const handleResultConfirm = useCallback(() => {
    if (!quizPassed) return;
    finishWithXP(xpToAward, perfectQuiz);
  }, [quizPassed, perfectQuiz, finishWithXP, xpToAward]);

  const handleRetryQuiz = useCallback(() => {
    setPhase('quiz');
    setQuizQuestionIndex(0);
    setQuizAnswers({});
    setQuizShowExplanation(false);
  }, []);

  if (!lesson) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#05080f]"
      role="dialog"
      aria-modal="true"
      aria-label="İnteraktif ders"
    >
      {/* Üst bar: X (Kapat) + ortada ince parlayan ilerleme çubuğu */}
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-white/10 bg-[#05080f]/95 backdrop-blur-sm px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
        <div className="flex-1 flex flex-col gap-2 min-w-0 max-w-md mx-auto">
          <p className="text-xs font-medium text-slate-500 truncate text-center">
            Ders {lessonIndex + 1} / {totalLessons}
            {phase === 'content' && contentSteps > 1 && ` · Adım ${contentStepIndex + 1} / ${contentSteps}`}
          </p>
          <div className="h-[6px] rounded-full bg-white/15 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(99,102,241,0.5)]"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={lessonIndex + 1}
              aria-valuemin={1}
              aria-valuemax={totalLessons}
            />
          </div>
        </div>
      </header>

      {/* İçerik / Quiz / Sonuç */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          key={phase}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mx-auto px-6 py-12 pb-32"
        >
          {phase === 'content' && (
            <>
              <h1 className="text-2xl font-bold text-slate-100 mb-8">{lesson.lessonTitle}</h1>
              {contentStepIndex === 0 ? (
                <>
                  <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6 mb-8">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Formül / Kural</p>
                    <pre className="text-sm text-slate-200 font-sans leading-relaxed whitespace-pre-wrap mb-4">
                      {lesson.grammarBlock}
                    </pre>
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{lesson.content}</p>
                  </div>
                  {lesson.conjugation && lesson.conjugation.length > 0 && (
                    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-8">
                      <div className="px-5 py-3 border-b border-white/10">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Çekim tablosu</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[280px] border-collapse text-sm">
                          <thead>
                            <tr className="bg-white/5 text-left">
                              <th className="px-4 py-2.5 text-xs font-semibold text-slate-400">Özne</th>
                              <th className="px-4 py-2.5 text-xs font-semibold text-slate-400">Fiil</th>
                              <th className="px-4 py-2.5 text-xs font-semibold text-slate-400">Telaffuz</th>
                              <th className="px-4 py-2.5 text-xs font-semibold text-slate-400">Anlam</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-200">
                            {lesson.conjugation.map((row, i) => (
                              <tr key={i} className="border-t border-white/5 even:bg-white/5">
                                <td className="px-4 py-2.5 font-medium">{row.subject}</td>
                                <td className="px-4 py-2.5 text-indigo-300 font-mono">{row.verb}</td>
                                <td className="px-4 py-2.5 text-slate-400 italic text-xs">{row.phonetic ?? '—'}</td>
                                <td className="px-4 py-2.5 text-slate-400">{row.meaning}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {(!lesson.examples || lesson.examples.length === 0) && (
                    <p className="text-slate-500 text-sm">İçeriği okudunuz. Devam etmek için alttaki butona tıklayın.</p>
                  )}
                </>
              ) : (
                lesson.examples && lesson.examples[contentStepIndex - 1] && (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                      Örnek {contentStepIndex} / {lesson.examples.length}
                    </p>
                    <ExampleRow
                      example={lesson.examples[contentStepIndex - 1]}
                      onSpeak={() => speakExample(lesson.examples![contentStepIndex - 1].original, lang)}
                    />
                  </div>
                )
              )}
            </>
          )}

          {phase === 'quiz' && currentQuizQuestion && (
            <QuizStep
              question={currentQuizQuestion}
              questionIndex={quizQuestionIndex}
              totalQuestions={totalQuiz}
              selectedAnswer={quizAnswers[quizQuestionIndex]}
              showExplanation={quizShowExplanation}
              onSelect={handleQuizAnswer}
            />
          )}

          {phase === 'result' && totalQuiz > 0 && (
            <div className="text-center py-8">
              <h2 className="text-xl font-bold text-slate-100 mb-2">Ünite özeti</h2>
              <p className="text-slate-300 mb-2">
                {correctCount} doğru · {totalQuiz - correctCount} yanlış
              </p>
              {quizPassed && (
                <p className="text-emerald-400 font-semibold mb-4">
                  +{xpToAward} XP
                  {unit.xpRewardOnComplete == null ? ' (her doğru +5)' : ' (ünite tamamlama)'}
                </p>
              )}
              {quizPassed ? (
                <p className="text-slate-400 text-sm mb-4">
                  {perfectQuiz ? 'Tüm sorular doğru — harika!' : 'Geçtiniz. Öğrenme Yolu’nda sonraki ünite açıldı.'}
                </p>
              ) : (
                <p className="text-amber-400 font-medium mb-4">Bu sefer olmadı. Tekrar deneyin (%50 ve üzeri gerekli).</p>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Sticky alt buton(lar) */}
      <div className="sticky bottom-0 left-0 right-0 z-10 p-4 bg-[#05080f]/95 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-2xl mx-auto w-full">
          {phase === 'content' && (
            <div className="flex gap-3 items-center">
              {lessonIndex > 0 && onPrevLesson && contentStepIndex === 0 ? (
                <button
                  type="button"
                  onClick={onPrevLesson}
                  className="shrink-0 py-3 px-4 rounded-xl font-medium text-slate-300 hover:text-slate-100 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#05080f]"
                >
                  ← Önceki Ders
                </button>
              ) : contentStepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setContentStepIndex((i) => i - 1)}
                  className="shrink-0 py-3 px-4 rounded-xl font-medium text-slate-300 hover:text-slate-100 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#05080f]"
                >
                  ← Önceki
                </button>
              ) : (
                <span />
              )}
              <motion.button
                type="button"
                onClick={() => {
                  if (!isLastContentStep) {
                    setContentStepIndex((i) => i + 1);
                    return;
                  }
                  if (hasQuiz) {
                    setPhase('quiz');
                    setQuizQuestionIndex(0);
                    setQuizAnswers({});
                    setQuizShowExplanation(false);
                  } else if (onNextLesson && lessonIndex < totalLessons - 1) {
                    onNextLesson();
                  } else {
                    finishWithXP(50, true);
                  }
                }}
                className="flex-1 py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:via-purple-400 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#05080f] transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:brightness-110"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {!isLastContentStep
                  ? 'Devam →'
                  : hasQuiz
                    ? 'Devam Et'
                    : lessonIndex < totalLessons - 1
                      ? 'Sonraki Ders →'
                      : 'Üniteyi Tamamla (+50 XP)'}
              </motion.button>
            </div>
          )}
          {phase === 'quiz' && quizShowExplanation && (
            <motion.button
              type="button"
              onClick={handleQuizContinue}
              className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#05080f] transition-all"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Devam
            </motion.button>
          )}
          {phase === 'result' && (
            <div className="flex flex-col gap-2">
              {quizPassed && (
                <motion.button
                  type="button"
                  onClick={handleResultConfirm}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:via-purple-400 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#05080f] transition-all duration-300 shadow-lg shadow-purple-500/30"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {`Bitir (+${xpToAward} XP)`}
                </motion.button>
              )}
              {!quizPassed && (
                <motion.button
                  type="button"
                  onClick={handleRetryQuiz}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-amber-600 hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#05080f] transition-all"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Tekrar Dene
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizStep({
  question,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  showExplanation,
  onSelect,
}: {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer?: string;
  showExplanation: boolean;
  onSelect: (answer: string) => void;
}) {
  const options = (question.options && question.options.length > 0) ? question.options : (question.type === 'true_false' ? ['Doğru', 'Yanlış'] : []);
  const correct = selectedAnswer === question.correctAnswer;
  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">
        Soru {questionIndex + 1} / {totalQuestions}
      </p>
      <h2 className="text-lg font-bold text-slate-100 mb-6">{question.question}</h2>
      <div className="space-y-3">
        {options.map((opt) => {
          const isSelected = selectedAnswer === opt;
          const isCorrectOption = opt === question.correctAnswer;
          const showWrong = showExplanation && isSelected && !correct;
          const showRight = showExplanation && isCorrectOption;
          return (
            <button
              key={opt}
              type="button"
              disabled={showExplanation}
              onClick={() => onSelect(opt)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#05080f] ${
                showWrong
                  ? 'border-red-500 bg-red-500/20 text-red-200'
                  : showRight
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                    : isSelected
                      ? 'border-indigo-500 bg-indigo-500/20 text-slate-100'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {showExplanation && (
        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-slate-400">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

function ExampleRow({
  example,
  onSpeak,
}: {
  example: LessonExample;
  onSpeak: () => void;
}) {
  return (
    <li className="flex flex-col gap-1 border-b border-white/5 pb-5 last:border-0 last:pb-0">
      <div className="flex items-center gap-3 flex-wrap">
        <ExampleOriginalWithVerbBold text={example.original} verbBold={example.verbBold} />
        <button
          type="button"
          onClick={onSpeak}
          className="shrink-0 p-2 rounded-full text-slate-400 hover:text-indigo-400 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          aria-label="Sesli oku"
        >
          <Volume2 className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
      {example.phonetic && (
        <p className="text-sm italic text-slate-500">{example.phonetic}</p>
      )}
      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
        {example.turkish}
      </p>
    </li>
  );
}
