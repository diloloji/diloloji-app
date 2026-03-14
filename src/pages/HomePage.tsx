import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, useInView } from 'framer-motion';
import { Cpu, Brain, Activity } from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import FloatingBackgroundElements from '../components/FloatingBackgroundElements';
import { useRef, useState, useCallback, useEffect } from 'react';

const SITE_URL = 'https://diloloji.com';
const PARALLAX_INTENSITY = 14;

function BackgroundWithPattern({ mouseX = 0, mouseY = 0 }: { mouseX?: number; mouseY?: number }) {
  const tx = typeof window !== 'undefined' ? (mouseX / window.innerWidth - 0.5) * PARALLAX_INTENSITY : 0;
  const ty = typeof window !== 'undefined' ? (mouseY / window.innerHeight - 0.5) * PARALLAX_INTENSITY : 0;
  return (
    <>
      {/* Deep navy → purple gradient (dark landing) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#0f172a] via-40% to-[#1e1b4b] to-[#312e81] transition-colors duration-500 dark:from-[#0b1220] dark:via-[#0f172a] dark:via-40% dark:to-[#1e1b4b] dark:to-[#312e81] min-[2560px]:from-[#0a0f1a] min-[2560px]:via-[#0f172a] min-[2560px]:to-[#251a4a]"
        aria-hidden
      />
      {/* Light mode: softer gradient (covers dark gradient when not dark) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-200/80 dark:opacity-0 transition-opacity duration-500 opacity-100"
        aria-hidden
      />
      {/* Grid — mouse paralaks */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none select-none transition-transform duration-200 ease-out"
        style={{ transform: `translate(${tx}px, ${ty}px)` }}
        aria-hidden
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="landing-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#landing-grid)" className="text-white dark:text-white" />
        </svg>
      </div>
      <FloatingBackgroundElements />
    </>
  );
}

function TestTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M18 4h12v12l10 10c2 2 2 6 0 8s-6 2-8 0L18 24V4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 24l-8 8c-2 2-2 6 0 8s6 2 8 0l8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M24 8c-4 0-8 2-10 6-2 4-2 10 0 14 1 2 0 4-2 5-2 1-3 3-2 5 1 4 5 6 10 6s9-2 10-6c1-2 0-4-2-5-2-1-3-3-2-5 2-4 2-10 0-14-2-4-6-6-10-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 20c-1 2-2 4-2 6 0 4 3 8 8 8s8-4 8-8c0-2-1-4-2-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 28v8M20 34h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 36c2 2 4 4 8 4s6-2 8-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Dilini seç',
    description: 'Fransızca veya İspanyolca ile başla. Fiil Laboratuvarı veya Ezber Makinesi’ni aç.',
  },
  {
    step: '02',
    title: 'Çekimleri keşfet',
    description: 'Fiil gir, tüm zamanları gör. Mastar, ulaç ve örnek cümlelerle pratik yap.',
  },
  {
    step: '03',
    title: 'Ezberle ve pekiştir',
    description: 'Quiz, zamana karşı ve kıyaslama modları ile kalıcı öğren.',
  },
];

const STATS = [
  { value: 10000, suffix: '+', label: 'Kelime Çekimi', icon: '📐' },
  { value: 500, suffix: '+', label: 'Aktif Kullanıcı', icon: '👥' },
  { value: 12, suffix: '', label: 'Dil Desteği', icon: '🌐' },
];

const SUPPORTED_LANGUAGES = [
  { name: 'Fransızca', flag: '🇫🇷', code: 'fr' },
  { name: 'İspanyolca', flag: '🇪🇸', code: 'es' },
  { name: 'Almanca', flag: '🇩🇪', code: 'de' },
  { name: 'İtalyanca', flag: '🇮🇹', code: 'it' },
];

const FEATURES = [
  {
    title: 'Algoritmik Öğrenme',
    description: 'Ezber yerine dilin kurallarını ve formüllerini keşfedin. Kalıpları görün, kalıcı öğrenin.',
    icon: Cpu,
  },
  {
    title: 'Hafıza Sarayı Tekniği',
    description: 'Zaman çizelgeleri ve yapısal tekrarla bilgiyi uzun süreli belleğe taşıyın.',
    icon: Brain,
  },
  {
    title: 'Gerçek Zamanlı Çekim Analizi',
    description: 'Fiil girin, anında tüm zamanları ve kişileri görün. Anlam ve telaffuz desteği.',
    icon: Activity,
  },
];

function StatRow({ stat, inView }: { stat: (typeof STATS)[number]; inView: boolean }) {
  const count = useCountUp(stat.value, inView, 1800);
  const display = stat.value >= 1000 ? count.toLocaleString('tr-TR') : String(count);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
      <span className="text-3xl sm:text-4xl" aria-hidden>{stat.icon}</span>
      <div>
        <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {display}{stat.suffix}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{stat.label}</p>
      </div>
    </div>
  );
}

function FeatureCard({
  feature: f,
  index,
  isAlgo,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
  isAlgo: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group rounded-2xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md p-6 lg:p-8 text-center relative overflow-hidden"
    >
      {isAlgo && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-400"
          aria-hidden
        >
          <div className="flex items-baseline gap-1 font-mono text-base sm:text-lg">
            <span className="text-orange-500 dark:text-orange-400 font-bold drop-shadow-sm origin-left scale-95 group-hover:scale-100 transition-transform duration-500">
              parl
            </span>
            <span className="text-slate-300 dark:text-slate-600 text-lg self-center" style={{ width: 2 }}>|</span>
            <span className="text-indigo-500 dark:text-indigo-400 font-bold drop-shadow-sm origin-right scale-95 group-hover:scale-100 transition-transform duration-500">
              er
            </span>
          </div>
        </div>
      )}
      <div className="relative z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-4">
          <f.icon className="w-6 h-6" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{f.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
      </div>
    </motion.div>
  );
}

/** Count-up: 0 → target when in view, easeOutExpo */
function useCountUp(target: number, inView: boolean, durationMs = 1800) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) {
      setDisplay(0);
      startRef.current = null;
      return;
    }
    startRef.current = performance.now();
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now: number) => {
      const start = startRef.current ?? now;
      const elapsed = now - start;
      const t = Math.min(elapsed / durationMs, 1);
      setDisplay(Math.round(easeOutExpo(t) * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [inView, target, durationMs]);

  return display;
}

export default function HomePage() {
  const { isDark, toggleTheme, mounted } = useThemeContext();
  const { t, i18n } = useTranslation();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [uiLangDropdownOpen, setUiLangDropdownOpen] = useState(false);
  const uiLangDropdownRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

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

  return (
    <div
      className="min-h-screen relative bg-slate-100 dark:bg-transparent transition-colors duration-300"
      onMouseMove={handleMouseMove}
    >
      <Helmet>
        <title>Diloloji — Dilin Matematiği</title>
        <meta name="description" content="Diloloji — Fransızca ve İspanyolca fiil çekimleri, ezber alıştırmaları ve sözlük. Dilin matematiğini çözün." />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:title" content="Diloloji — The Mathematics of Language" />
        <meta property="og:description" content="Verb Laboratory & Memorization Machine. Conjugate, practice, and master French and Spanish." />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:type" content="website" />
      </Helmet>
      <BackgroundWithPattern mouseX={mouse.x} mouseY={mouse.y} />

      <header className="relative z-20 w-full flex justify-between items-center py-4 px-4 sm:px-6 lg:px-8 bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/5 sticky top-0 transition-colors duration-300">
        <Link
          to="/"
          className="min-w-0 flex items-center gap-3 shrink-0 transition-all duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-xl"
          aria-label="Ana sayfa"
        >
          <img src="/logo.svg" alt="Diloloji" className="h-9 sm:h-10 w-auto shrink-0" />
          <span className="text-slate-500 dark:text-slate-400 text-sm italic hidden sm:inline shrink-0">
            Dilin matematiğini çöz.
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/sozluk"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {t('sozluk')}
          </Link>
          <div className="relative shrink-0" ref={uiLangDropdownRef}>
            <button
              type="button"
              onClick={() => setUiLangDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-slate-200/80 dark:border-white/10"
              title={t('arayuz_dili')}
              aria-label={t('dil_secin')}
              aria-expanded={uiLangDropdownOpen}
              aria-haspopup="listbox"
            >
              <span aria-hidden>🌐</span>
              <span className="uppercase tabular-nums">{['tr', 'en', 'fr', 'es'].includes((i18n.language || 'tr').slice(0, 2)) ? (i18n.language || 'tr').slice(0, 2).toUpperCase() : 'TR'}</span>
            </button>
            {uiLangDropdownOpen && (
              <div
                role="listbox"
                aria-label={t('dil_secin')}
                className="absolute right-0 top-full mt-1.5 w-max min-w-[120px] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl py-1 z-50"
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
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                      i18n.language === lng
                        ? 'bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                    }`}
                  >
                    {t(lng === 'tr' ? 'lang_turkce' : lng === 'en' ? 'lang_english' : lng === 'fr' ? 'lang_francais' : 'lang_espanol')}
                  </button>
                ))}
              </div>
            )}
          </div>
          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              title={isDark ? 'Açık mod' : 'Karanlık mod'}
              aria-label={isDark ? 'Açık moda geç' : 'Karanlık moda geç'}
            >
              <span className="text-base leading-none" aria-hidden>{isDark ? '☀️' : '🌙'}</span>
            </button>
          )}
        </nav>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 sm:mb-16"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            Diloloji&apos;ye Hoş Geldin
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-700 dark:text-slate-100 max-w-2xl mx-auto"
          >
            Dilin matematiğini çözmeye başla.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-4 text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto"
          >
            Fransızca ve İspanyolca fiil çekimleri, ezber ve sözlük — tek platformda.
          </motion.p>
        </motion.section>

        {/* Trust Bar — Desteklenen Diller (Hero'nun hemen altı) */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-16 lg:mb-20"
        >
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-5">
            Desteklenen Diller
          </p>
          <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-14">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = lang.code === 'fr' || lang.code === 'es';
                return (
                  <div
                    key={lang.code}
                    className={`flex items-center gap-3 text-slate-700 dark:text-slate-200 ${!isActive ? 'opacity-40 grayscale cursor-default hover:opacity-50 transition-opacity pointer-events-none' : ''}`}
                  >
                    <span className="text-2xl sm:text-3xl" aria-hidden>{lang.flag}</span>
                    <span className="text-sm font-medium sm:text-base">{lang.name}</span>
                    {!isActive && (
                      <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-medium px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">
                        {t('coming_soon')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Two main cards — glassmorphism, hover scale, glow */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto mb-24 lg:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="h-full relative"
          >
            <Link
              to="/fiil-laboratuvari"
              className="group block h-full rounded-3xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md p-8 lg:p-10 transition-all duration-300 hover:scale-105 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 hover:bg-white/70 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-[#0f172a] shadow-xl shadow-slate-200/40 dark:shadow-emerald-500/10 dark:shadow-[0_0_40px_rgba(34,197,94,0.15)] relative overflow-hidden"
            >
              <span className="absolute -inset-px rounded-3xl bg-gradient-to-br from-emerald-500/25 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-all duration-300 pointer-events-none" aria-hidden />
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-all duration-300" style={{ boxShadow: '0 0 40px rgba(34, 197, 94, 0.2)' }}>
                  <TestTubeIcon className="w-8 h-8 lg:w-10 lg:h-10" />
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Fiil Laboratuvarı
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm lg:text-base">
                  Çekimleri keşfet, tüm zamanları gör, alıştır.
                </p>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="h-full relative"
          >
            <Link
              to="/ezber-makinesi"
              className="group block h-full rounded-3xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md p-8 lg:p-10 transition-all duration-300 hover:scale-105 hover:border-pink-500/40 dark:hover:border-pink-500/30 hover:bg-white/70 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-[#0f172a] shadow-xl shadow-slate-200/40 dark:shadow-pink-500/10 dark:shadow-[0_0_40px_rgba(236,72,153,0.15)] relative overflow-hidden"
            >
              <span className="absolute -inset-px rounded-3xl bg-gradient-to-br from-pink-500/25 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-all duration-300 pointer-events-none" aria-hidden />
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-pink-500/15 dark:bg-pink-500/20 flex items-center justify-center mb-6 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-all duration-300" style={{ boxShadow: '0 0 40px rgba(236, 72, 153, 0.2)' }}>
                  <BrainIcon className="w-8 h-8 lg:w-10 lg:h-10" />
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Ezber Makinesi
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm lg:text-base">
                  Quiz, zamana karşı ve kıyaslama ile pekiştir.
                </p>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Feature Grid — Neden Diloloji? */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-24 lg:mb-32"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-12 lg:mb-16">
            Neden Diloloji?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} isAlgo={f.title === 'Algoritmik Öğrenme'} />
            ))}
          </div>
        </motion.section>

        {/* How it works / Nasıl Çalışır */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="pt-12 lg:pt-16 border-t border-white/10 dark:border-white/10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-12 lg:mb-16">
            {t('how_it_works')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md p-6 lg:p-8 text-center"
              >
                <span className="text-3xl font-bold text-slate-300 dark:text-white/20 mb-4 block">{item.step}</span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-6 w-4 h-px bg-white/20" aria-hidden />
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Stats bar — count-up when in view */}
        <motion.section
          ref={statsRef}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-20 lg:mt-28 pb-16 lg:pb-24"
        >
          <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md px-6 py-8 sm:px-10 sm:py-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 text-center">
              {STATS.map((stat) => (
                <StatRow key={stat.label} stat={stat} inView={statsInView} />
              ))}
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mt-24 pt-12 pb-8 border-t border-white/10 dark:border-white/10"
        >
          <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="Diloloji" className="h-8 w-auto" />
                <span className="text-slate-500 dark:text-slate-400 text-sm italic">Dilin matematiğini çöz.</span>
              </div>
              <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <Link to="/anasayfa" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Ana Sayfa
                </Link>
                <Link to="/fiil-laboratuvari" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Fiil Laboratuvarı
                </Link>
                <Link to="/ezber-makinesi" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Ezber Makinesi
                </Link>
                <Link to="/sozluk" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Sözlük
                </Link>
              </nav>
              <div className="flex items-center gap-4">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" aria-label="Twitter">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" aria-label="GitHub">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" aria-label="LinkedIn">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10 dark:border-white/10 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Hakkımızda</span>
                <p className="mt-1 max-w-md">Diloloji, dilin mantığını formüllerle öğreten bir platformdur. Ezber yerine kuralları keşfedin.</p>
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">İletişim</span>
                <p className="mt-1">destek@diloloji.com</p>
              </div>
            </div>
            <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} Diloloji. Tüm hakları saklıdır.
            </p>
          </div>
        </motion.footer>
      </main>
    </div>
  );
}
