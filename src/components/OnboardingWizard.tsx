/**
 * Yeni kullanıcılar için çok adımlı onboarding sihirbazı.
 * Dil, seviye, günlük hedef, amaç — cevaplar localStorage'a kaydedilir.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles, X } from 'lucide-react';
import {
  useOnboarding,
  type OnboardingLanguage,
  type OnboardingLevel,
  type OnboardingDailyGoal,
  type OnboardingPurpose,
} from '../contexts/OnboardingContext';

const LANGUAGES: { value: OnboardingLanguage; label: string; flag: string }[] = [
  { value: 'Fransızca', label: 'Fransızca', flag: '🇫🇷' },
  { value: 'İspanyolca', label: 'İspanyolca', flag: '🇪🇸' },
  { value: 'İngilizce', label: 'İngilizce', flag: '🇬🇧' },
];

const LEVELS: { value: OnboardingLevel; label: string }[] = [
  { value: 'A1', label: 'A1 — Başlangıç' },
  { value: 'A2', label: 'A2 — Temel' },
  { value: 'B1', label: 'B1 — Orta alt' },
  { value: 'B2', label: 'B2 — Orta üst' },
  { value: 'C1', label: 'C1 — İleri' },
  { value: 'C2', label: 'C2 — Usta' },
];

const DAILY_GOALS: { value: OnboardingDailyGoal; label: string }[] = [
  { value: 5, label: '5 dakika' },
  { value: 10, label: '10 dakika' },
  { value: 20, label: '20 dakika' },
];

const PURPOSES: { value: OnboardingPurpose; label: string }[] = [
  { value: 'Seyahat', label: 'Seyahat' },
  { value: 'İş', label: 'İş' },
  { value: 'Sınav', label: 'Sınav (DELF, DELE, vb.)' },
  { value: 'Genel', label: 'Genel merak' },
];

const STEPS = [
  { id: 1, title: 'Hangi dili öğrenmek istiyorsun?', key: 'language' as const },
  { id: 2, title: 'Seviyeni seç', key: 'level' as const },
  { id: 3, title: 'Günlük hedefin', key: 'dailyGoal' as const },
  { id: 4, title: 'Amacın', key: 'purpose' as const },
];

export default function OnboardingWizard() {
  const { completeOnboarding, skipOnboarding } = useOnboarding();
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState<OnboardingLanguage>('Fransızca');
  const [level, setLevel] = useState<OnboardingLevel>('A1');
  const [dailyGoal, setDailyGoal] = useState<OnboardingDailyGoal>(10);
  const [purpose, setPurpose] = useState<OnboardingPurpose>('Genel');

  const handleNext = () => {
    if (step < 4) setStep((s) => s + 1);
    else completeOnboarding({ language, level, dailyGoalMinutes: dailyGoal, purpose });
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleFinish = () => {
    completeOnboarding({ language, level, dailyGoalMinutes: dailyGoal, purpose });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f1623] shadow-2xl overflow-hidden"
        >
          {/* Üst: başlık + kapat */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" strokeWidth={2} aria-hidden />
              <h2 id="onboarding-title" className="text-lg font-semibold text-white">
                Hoş geldin, seni tanıyalım
              </h2>
            </div>
            <button
              type="button"
              onClick={skipOnboarding}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              aria-label="Atla"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Adım göstergesi */}
          <div className="flex gap-1 px-6 py-3">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s.id <= step ? 'bg-indigo-500' : 'bg-white/10'
                }`}
                aria-hidden
              />
            ))}
          </div>

          {/* İçerik */}
          <div className="px-6 py-6 min-h-[280px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <p className="text-slate-300 text-sm">{STEPS[0].title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {LANGUAGES.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLanguage(opt.value)}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                          language === opt.value
                            ? 'border-indigo-500 bg-indigo-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-2xl" aria-hidden>{opt.flag}</span>
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <p className="text-slate-300 text-sm">{STEPS[1].title}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LEVELS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setLevel(opt.value)}
                        className={`rounded-xl border-2 px-3 py-3 text-left text-sm transition-all ${
                          level === opt.value
                            ? 'border-indigo-500 bg-indigo-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <p className="text-slate-300 text-sm">{STEPS[2].title}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {DAILY_GOALS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDailyGoal(opt.value)}
                        className={`rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all ${
                          dailyGoal === opt.value
                            ? 'border-indigo-500 bg-indigo-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <p className="text-slate-300 text-sm">{STEPS[3].title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PURPOSES.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPurpose(opt.value)}
                        className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ${
                          purpose === opt.value
                            ? 'border-indigo-500 bg-indigo-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Alt: Geri / İleri */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
              Geri
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 rounded-lg px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0f1623]"
              >
                İleri
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-1 rounded-lg px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0f1623]"
              >
                Başla
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
