import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, useInView } from 'framer-motion';
import { Cpu, Brain, Activity, BookA, FlaskConical, GraduationCap, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FloatingBackgroundElements from '../components/FloatingBackgroundElements';
import Navbar from '../components/Navbar';
import { useRef, useState, useCallback, useEffect } from 'react';

const SITE_URL = 'https://diloloji.com';
const PARALLAX_INTENSITY = 14;

function BackgroundWithPattern({ mouseX = 0, mouseY = 0 }: { mouseX?: number; mouseY?: number }) {
  const tx = typeof window !== 'undefined' ? (mouseX / window.innerWidth - 0.5) * PARALLAX_INTENSITY : 0;
  const ty = typeof window !== 'undefined' ? (mouseY / window.innerHeight - 0.5) * PARALLAX_INTENSITY : 0;
  return (
    <>
      {/* Deeper night blue / black (dark landing) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0f1623] via-35% to-[#151d2e] to-[#1e293b] transition-colors duration-500 dark:from-[#0a0f1a] dark:via-[#0f1623] dark:via-40% dark:to-[#151d2e] dark:to-[#1e293b]"
        aria-hidden
      />
      {/* Subtle geometric accent line */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" aria-hidden>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(99,102,241)" />
              <stop offset="100%" stopColor="rgb(129,140,248)" />
            </linearGradient>
          </defs>
          <path d="M 0 40 Q 25% 20, 50% 40 T 100% 40" fill="none" stroke="url(#line-grad)" strokeWidth="0.5" />
          <path d="M 0 60 Q 50% 80, 100% 60" fill="none" stroke="url(#line-grad)" strokeWidth="0.5" />
        </svg>
      </div>
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
      className="group glass-panel-strong p-6 lg:p-8 text-center relative overflow-hidden"
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
  const { t } = useTranslation();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

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

      <Navbar />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28">
        {/* Hero — minimalist, prestigious */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-16 mb-16 lg:mb-24"
        >
          <div className="flex-1 text-center lg:text-left">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
              Dilin Matematiğini Keşfedin.
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              Yapay zeka ile kelimelerin ve fiillerin kalbine inin, dilleri analitik bir yaklaşımla çözün.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-3"
            >
              <Link
                to="/sozluk"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-night-950"
              >
                <Search className="w-5 h-5" strokeWidth={2} />
                Sözlükten Ara
              </Link>
              <Link
                to="/fiil-laboratuvari"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold border border-slate-300 dark:border-white/20 bg-white/50 dark:bg-white/5 backdrop-blur-sm text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-night-950"
              >
                Şimdi Başla
              </Link>
            </motion.div>
          </div>
          {/* Hero visual — abstract language/math flow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1 max-w-lg mx-auto lg:max-w-none flex items-center justify-center"
            aria-hidden
          >
            <svg viewBox="0 0 400 280" className="w-full h-auto text-indigo-500/20 dark:text-indigo-400/25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="hero-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgb(99,102,241)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="rgb(129,140,248)" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {/* Flowing nodes + lines (words → verbs → result) */}
              <path d="M 40 80 Q 120 40, 200 80 T 360 80" stroke="url(#hero-grad)" strokeWidth="1.5" fill="none" strokeDasharray="4 4" className="animate-[float-symbol_8s_ease-in-out_infinite]" />
              <path d="M 60 140 Q 180 100, 300 140 T 340 180" stroke="url(#hero-grad)" strokeWidth="1" fill="none" opacity="0.7" />
              <circle cx="80" cy="80" r="6" fill="currentColor" opacity="0.5" />
              <circle cx="200" cy="80" r="8" fill="currentColor" opacity="0.6" />
              <circle cx="320" cy="80" r="6" fill="currentColor" opacity="0.5" />
              <circle cx="140" cy="140" r="5" fill="currentColor" opacity="0.4" />
              <circle cx="260" cy="140" r="5" fill="currentColor" opacity="0.4" />
              <text x="200" y="220" className="fill-slate-400 dark:fill-slate-500 text-sm font-mono" textAnchor="middle">parler → je parle → formül</text>
            </svg>
          </motion.div>
        </motion.section>

        {/* Özellik kartları — Sözlük, Fiil Lab, Ezber, Öğrenme (grid) */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="mb-24 lg:mb-32"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { to: '/sozluk', title: 'Sözlük', desc: 'Yapay zeka destekli kelime analizi, örnek cümleler ve sesli okuma.', icon: BookA, iconClass: 'bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400', cardClass: 'hover:border-indigo-500/30' },
              { to: '/fiil-laboratuvari', title: 'Fiil Laboratuvarı', desc: 'Tüm zamanlarda çekimler, örnekler ve alıştırmalar.', icon: FlaskConical, iconClass: 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400', cardClass: 'hover:border-emerald-500/30' },
              { to: '/ezber-makinesi', title: 'Ezber Makinesi', desc: 'Quiz, zamana karşı ve kıyaslama ile kalıcı öğrenme.', icon: Brain, iconClass: 'bg-pink-500/15 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400', cardClass: 'hover:border-pink-500/30' },
              { to: '/ogrenme', title: 'Öğrenme Yolu', desc: 'A1’den C1’e adım adım müfredat ve ünite dersleri.', icon: GraduationCap, iconClass: 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400', cardClass: 'hover:border-amber-500/30' },
            ].map((item, i) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link
                  to={item.to}
                  className={`group block h-full rounded-xl border border-slate-200/60 dark:border-white/10 backdrop-blur-sm bg-white/50 dark:bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-glass dark:hover:shadow-glass-dark ${item.cardClass} focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-night-950`}
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${item.iconClass} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Desteklenen Diller — compact */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-20"
        >
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
            Desteklenen Diller
          </p>
          <div className="glass-panel px-6 py-4">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 sm:gap-x-14">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = lang.code === 'fr' || lang.code === 'es';
                return (
                  <div
                    key={lang.code}
                    className={`flex items-center gap-2 text-slate-700 dark:text-slate-200 ${!isActive ? 'opacity-40 grayscale cursor-default pointer-events-none' : ''}`}
                  >
                    <span className="text-2xl" aria-hidden>{lang.flag}</span>
                    <span className="text-sm font-medium">{lang.name}</span>
                    {!isActive && (
                      <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {t('coming_soon')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Feature Grid — Neden Diloloji? */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-24 lg:mb-32"
        >
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-12 lg:mb-16">
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
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-12 lg:mb-16">
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
                className="relative glass-panel-strong p-6 lg:p-8 text-center"
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
          <div className="glass-panel-strong px-6 py-8 sm:px-10 sm:py-10">
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
          <div className="glass-panel-strong p-8 sm:p-10">
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
