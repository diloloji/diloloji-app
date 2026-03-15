/**
 * İnteraktif Ders Ekranı — Focus Mode: tam ekran, ilerleme çubuğu, cam efektli teori, sticky tamamla butonu.
 */

import { useCallback } from 'react';
import { X, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useXp } from '../contexts/XpContext';
import type { UnitContent, LessonExample } from '../data/learningPathUnits';

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

type LessonViewProps = {
  unit: UnitContent;
  lessonIndex: number;
  lang: LessonViewLang;
  onClose: () => void;
  onComplete: () => void;
};

export default function LessonView({ unit, lessonIndex, lang, onClose, onComplete }: LessonViewProps) {
  const { addXP } = useXp();
  const lesson = unit.lessons[lessonIndex];
  const totalLessons = unit.lessons.length;
  const progressPercent = totalLessons > 0 ? ((lessonIndex + 1) / totalLessons) * 100 : 0;

  const handleComplete = useCallback(() => {
    addXP(50);
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
    onComplete();
  }, [addXP, onComplete]);

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
          </p>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden shadow-inner">
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

      {/* İçerik — aşağıdan yukarı süzülme animasyonu */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mx-auto px-6 py-12 pb-32"
        >
          <h1 className="text-2xl font-bold text-slate-100 mb-8">
            {lesson.lessonTitle}
          </h1>

          {/* Teori kutusu — cam efektli, gramer açıklaması */}
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6 mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Formül / Kural
            </p>
            <pre className="text-sm text-slate-200 font-mono leading-relaxed whitespace-pre-wrap mb-4">
              {lesson.grammarBlock}
            </pre>
            <p className="text-slate-300 text-sm leading-relaxed">
              {lesson.content}
            </p>
          </div>

          {/* Çekim tablosu (varsa) */}
          {lesson.conjugation && lesson.conjugation.length > 0 && (
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-8">
              <div className="px-5 py-3 border-b border-white/10">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Çekim tablosu
                </span>
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

          {/* Örnek cümleler — büyük font, ses ikonu yanında, Türkçe alt satırda soluk italik */}
          {lesson.examples && lesson.examples.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
                Örnek cümleler
              </p>
              <ul className="space-y-5">
                {lesson.examples.map((ex, i) => (
                  <ExampleRow
                    key={i}
                    example={ex}
                    onSpeak={() => speakExample(ex.original, lang)}
                  />
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </div>

      {/* Sticky alt: Dersi Tamamla — Indigo/Purple gradient, parlayan */}
      <div className="sticky bottom-0 left-0 right-0 z-10 p-4 bg-[#05080f]/95 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-2xl mx-auto w-full">
          <motion.button
            type="button"
            onClick={handleComplete}
            className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:via-purple-400 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#05080f] transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:brightness-110"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Dersi Tamamla (+50 XP)
          </motion.button>
        </div>
      </div>
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
        <span className="text-xl font-medium text-slate-100">{example.original}</span>
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
