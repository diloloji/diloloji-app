/**
 * İnteraktif Ders Ekranı — Tam ekran odak modu, TTS örnekler, ilerleme çubuğu, tamamla + konfeti.
 */

import { useCallback } from 'react';
import { X, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useXp } from '../contexts/XpContext';
import type { UnitContent, LessonItem, LessonExample } from '../data/learningPathUnits';

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
      className="fixed inset-0 z-50 flex flex-col bg-[#0a0e17]"
      role="dialog"
      aria-modal="true"
      aria-label="İnteraktif ders"
    >
      {/* Üst bar: Çıkış + İlerleme çubuğu */}
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-white/10 bg-[#0a0e17]/95 backdrop-blur-sm px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          aria-label="Çıkış"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <p className="text-xs font-medium text-slate-500 truncate">
            Ders {lessonIndex + 1} / {totalLessons}
          </p>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={lessonIndex + 1}
              aria-valuemin={1}
              aria-valuemax={totalLessons}
            />
          </div>
        </div>
      </header>

      {/* İçerik alanı — ortada, max-w-2xl */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28">
        <div className="max-w-2xl mx-auto w-full space-y-8">
          <h1 className="text-xl font-bold text-slate-100">
            {lesson.lessonTitle}
          </h1>

          {/* Teori / Formül kutusu — kod editörü hissi */}
          <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Formül / Kural
              </span>
            </div>
            <pre className="p-4 text-sm text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
              {lesson.grammarBlock}
            </pre>
          </div>

          {/* Açıklama metni */}
          <p className="text-slate-300 text-sm leading-relaxed">
            {lesson.content}
          </p>

          {/* Çekim tablosu (varsa) */}
          {lesson.conjugation && lesson.conjugation.length > 0 && (
            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
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

          {/* Örnek cümleler — kartlar + TTS */}
          {lesson.examples && lesson.examples.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Örnek cümleler
              </p>
              <ul className="space-y-3">
                {lesson.examples.map((ex, i) => (
                  <ExampleCard
                    key={i}
                    example={ex}
                    lang={lang}
                    onSpeak={() => speakExample(ex.original, lang)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Sticky alt: Dersi Tamamla butonu */}
      <div className="sticky bottom-0 left-0 right-0 z-10 p-4 bg-[#0a0e17]/90 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-2xl mx-auto w-full">
          <button
            type="button"
            onClick={handleComplete}
            className="w-full py-4 px-6 rounded-2xl font-bold text-slate-900 bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500 hover:from-emerald-300 hover:via-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] transition-all duration-200 shadow-lg shadow-amber-500/25"
          >
            Dersi Tamamla (+50 XP)
          </button>
        </div>
      </div>
    </div>
  );
}

function ExampleCard({
  example,
  lang,
  onSpeak,
}: {
  example: LessonExample;
  lang: LessonViewLang;
  onSpeak: () => void;
}) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-100">{example.original}</span>
          <button
            type="button"
            onClick={onSpeak}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            aria-label="Sesli oku"
          >
            <Volume2 className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
        {example.phonetic && (
          <p className="text-xs italic text-slate-500 mt-0.5">{example.phonetic}</p>
        )}
        <p className="text-sm text-slate-500 mt-1.5">{example.turkish}</p>
      </div>
    </li>
  );
}
